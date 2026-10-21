<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\CartRecovery;
use App\Models\EmailOptOut;
use App\Models\Order;
use App\Models\Review;
use App\Models\WishlistItem;
use App\Support\CartReminders;
use App\Support\OrderPresenter;
use App\Support\PreferenceCookies;
use App\Support\Storefront;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user();

        return Storefront::render('account/settings', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'preferred_locale' => $user->preferred_locale,
                'preferred_region' => $user->preferred_region,
                'email_verified' => $user->hasVerifiedEmail(),
                'cart_reminders' => $this->wantsCartReminders($user),
            ],
            'twoFactor' => [
                'enabled' => $user->two_factor_secret !== null,
                'confirmed' => $user->two_factor_confirmed_at !== null,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:254', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9 +()\-]{6,30}$/'],
            'preferred_locale' => ['nullable', Rule::in(array_keys(config('shop.locales')))],
            'preferred_region' => ['nullable', Rule::in(array_keys(config('shop.regions')))],
            'cart_reminders' => ['sometimes', 'boolean'],
        ]);

        $user->forceFill($data);
        $emailChanged = $user->isDirty('email');
        $remindersChanged = $user->isDirty('cart_reminders');

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($remindersChanged) {
            $this->applyCartReminderChoice($user->email, (bool) $user->cart_reminders);
        }

        if ($emailChanged && $user instanceof MustVerifyEmail) {
            $user->sendEmailVerificationNotification();
        }

        PreferenceCookies::queue($user);

        return back()->with('account_notice', $emailChanged
            ? __('Saved. Please check your new email address for a confirmation link.')
            : __('Your details have been saved.'));
    }

    /** Everything stored about this customer, as a downloadable file (GDPR right of access). */
    public function export(Request $request)
    {
        $user = $request->user();

        $data = [
            'exported_at' => now()->toIso8601String(),
            'profile' => $user->only(['name', 'email', 'phone', 'preferred_locale', 'preferred_region', 'created_at']),
            'email_preferences' => [
                'bag_reminders' => $this->wantsCartReminders($user),
            ],
            'addresses' => $user->addresses()->get()->map->only(Address::FIELDS),
            'orders' => Order::forCustomer($user)->with(OrderPresenter::RELATIONS)->latest('id')->get()
                ->map(fn (Order $order) => OrderPresenter::detail($order)),
            'reviews' => Review::where('user_id', $user->id)->with('product:id,name')->get()
                ->map(fn (Review $r) => [
                    'product' => $r->product?->name,
                    'rating' => $r->rating,
                    'title' => $r->title,
                    'body' => $r->body,
                    'status' => $r->status,
                    'written_at' => $r->created_at?->toIso8601String(),
                ]),
            'wishlist' => WishlistItem::where('user_id', $user->id)->with('product:id,name')->get()
                ->map(fn (WishlistItem $item) => [
                    'product' => $item->product?->name,
                    'saved_at' => $item->created_at?->toIso8601String(),
                ]),
            'bag_reminders_sent' => CartRecovery::where('email', Str::lower($user->email))
                ->where('reminders_sent', '>', 0)->latest('id')->get()
                ->map(fn (CartRecovery $r) => [
                    'reminders_sent' => $r->reminders_sent,
                    'last_sent_at' => $r->last_reminder_at?->toIso8601String(),
                    'status' => $r->status,
                ]),
        ];

        $filename = 'my-data-'.now()->format('Y-m-d').'.json';

        return response()->streamDownload(
            fn () => print(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)),
            $filename,
            ['Content-Type' => 'application/json'],
        );
    }

    /* ---------- helpers ---------- */

    /** On only if the account switch is on and the address hasn't unsubscribed from an email link. */
    private function wantsCartReminders($user): bool
    {
        return (bool) $user->cart_reminders && ! EmailOptOut::has($user->email, CartReminders::TOPIC);
    }

    /** Keep the account switch and the email unsubscribe list saying the same thing. */
    private function applyCartReminderChoice(string $email, bool $wanted): void
    {
        $email = Str::lower($email);

        if ($wanted) {
            // Turning it back on also lifts an earlier unsubscribe from an email link.
            EmailOptOut::where('email', $email)->where('topic', CartReminders::TOPIC)->delete();

            return;
        }

        // Turning it off stops any reminder already on its way.
        CartRecovery::where('email', $email)
            ->whereIn('status', ['active', 'clicked'])
            ->update(['status' => 'unsubscribed']);
    }
}
