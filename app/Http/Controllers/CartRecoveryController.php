<?php

namespace App\Http\Controllers;

use App\Models\CartRecovery;
use App\Support\CartManager;
use App\Support\CartReminders;
use App\Support\Storefront;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartRecoveryController extends Controller
{
    private const RESTORE_DAYS = 14;

    public function __construct(private readonly CartReminders $reminders)
    {
    }

    /** Checkout: a guest typed their email and chose whether they want a reminder. */
    public function capture(Request $request, CartManager $carts)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'consent' => ['required', 'boolean'],
        ]);

        // Logged-in customers are handled by their account setting instead.
        if (! $request->user() && ($cart = $carts->current())) {
            $this->reminders->captureGuest(
                $cart,
                $data['email'],
                $request->boolean('consent'),
                $request->attributes->get('region', config('shop.default_region')),
            );
        }

        return response()->noContent();
    }

    /** The email's button. Shows a page that restores the bag, so link scanners can't. */
    public function showRestore(string $token)
    {
        $recovery = $this->find($token);

        if (! $recovery || $recovery->created_at->lt(now()->subDays(self::RESTORE_DAYS))) {
            return redirect('/bag')->with('cart_notice', __('That link has expired, but you can keep shopping here.'));
        }

        return Storefront::render('shop/restore-bag', ['token' => $token]);
    }

    public function restore(string $token, CartManager $carts)
    {
        $recovery = $this->find($token);

        if ($recovery && $recovery->created_at->gte(now()->subDays(self::RESTORE_DAYS))) {
            $this->reminders->restore($recovery, $carts);
        }

        return redirect('/bag')->with('cart_notice', __('Welcome back! Your bag is ready.'));
    }

    public function showUnsubscribe(string $token)
    {
        $recovery = $this->find($token);
        abort_unless($recovery, 404);

        return Storefront::render('shop/unsubscribe-reminders', [
            'token' => $token,
            'email' => $this->mask($recovery->email),
            'done' => $recovery->status === 'unsubscribed',
        ]);
    }

    public function unsubscribe(string $token)
    {
        $recovery = $this->find($token);
        abort_unless($recovery, 404);

        $this->reminders->optOut($recovery->email);

        return back();
    }

    /** One-click unsubscribe from the mail app's own button (no page, no session). */
    public function oneClick(string $token)
    {
        if ($recovery = $this->find($token)) {
            $this->reminders->optOut($recovery->email);
        }

        return response()->noContent();
    }

    private function find(string $token): ?CartRecovery
    {
        return CartRecovery::where('token', $token)->first();
    }

    /** "alex.morgan@example.com" → "a•••@example.com" */
    private function mask(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return Str::substr($name, 0, 1).'•••@'.$domain;
    }
}
