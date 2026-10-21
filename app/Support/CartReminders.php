<?php

namespace App\Support;

use App\Mail\AbandonedCart;
use App\Models\Cart;
use App\Models\CartRecovery;
use App\Models\EmailOptOut;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CartReminders
{
    public const TOPIC = 'cart_reminders';

    /** How long a bag counts as "recently left"; older ones expire. */
    private const ACTIVE_DAYS = 7;

    private const MIN_GAP_HOURS = 12;

    private const TIMEZONES = [
        'IN' => 'Asia/Kolkata', 'DE' => 'Europe/Berlin', 'FR' => 'Europe/Paris', 'NL' => 'Europe/Amsterdam',
        'BE' => 'Europe/Brussels', 'SE' => 'Europe/Stockholm', 'PL' => 'Europe/Warsaw', 'GB' => 'Europe/London',
        'US' => 'America/New_York',
    ];

    /** Config defaults, overridden by what the admin saved. */
    public function settings(): array
    {
        $saved = Setting::get('cart_reminders');

        return array_replace(config('shop.cart_reminders'), is_array($saved) ? $saved : []);
    }

    /* ---------- recording who a bag belongs to ---------- */

    /** A guest typed their email at checkout, and chose whether they want a reminder. */
    public function captureGuest(Cart $cart, string $email, bool $consent, string $region): void
    {
        $email = Str::lower(trim($email));
        $recovery = $cart->recoveries()->whereIn('status', ['active', 'clicked'])->latest('id')->first();

        if (! $consent) {
            // Changed their mind: keep nothing that would lead to an email.
            $recovery?->update(['consent' => false]);

            return;
        }

        $values = ['email' => $email, 'consent' => true, 'language' => app()->getLocale(), 'region' => $region];

        $recovery
            ? $recovery->update([...$values, 'status' => 'active'])
            : $cart->recoveries()->create($values);
    }

    /** Logged-in customers' bags: create a record for any that don't have one. */
    public function ensureCustomerRecords(): void
    {
        Cart::query()
            ->whereNotNull('user_id')
            ->whereHas('items', fn ($q) => $q->where('updated_at', '>=', now()->subDays(self::ACTIVE_DAYS)))
            ->whereDoesntHave('recoveries', fn ($q) => $q->whereIn('status', ['active', 'clicked']))
            ->with('user')
            ->chunkById(200, function ($carts) {
                foreach ($carts as $cart) {
                    if (! $cart->user?->cart_reminders) {
                        continue;
                    }

                    $cart->recoveries()->create([
                        'user_id' => $cart->user->id,
                        'email' => Str::lower($cart->user->email),
                        'consent' => true,
                        'language' => $cart->user->preferredLocale(),
                        'region' => $cart->user->preferred_region ?? config('shop.default_region'),
                    ]);
                }
            });
    }

    /* ---------- sending ---------- */

    /** Send every reminder that's due now. Returns how many were sent. */
    public function sendDue(): int
    {
        $settings = $this->settings();

        if (! $settings['enabled']) {
            return 0;
        }

        $delays = array_values($settings['delays']);
        $sent = 0;

        CartRecovery::query()
            ->where('status', 'active')
            ->where('consent', true)
            ->where('reminders_sent', '<', count($delays))
            ->whereHas('cart.items')
            ->with(['user', 'cart' => fn ($q) => $q->withMax('items', 'updated_at')->with('items')])
            ->chunkById(100, function ($recoveries) use ($settings, $delays, &$sent) {
                foreach ($recoveries as $recovery) {
                    if ($this->sendIfDue($recovery, $delays, $settings['quiet_hours'])) {
                        $sent++;
                    }
                }
            });

        return $sent;
    }

    /** Mark bags nobody has touched for a week as expired. */
    public function expireOld(): int
    {
        return CartRecovery::query()
            ->whereIn('status', ['active', 'clicked'])
            ->where(fn ($q) => $q
                ->whereDoesntHave('cart')
                ->orWhereHas('cart', fn ($c) => $c
                    ->where('updated_at', '<', now()->subDays(self::ACTIVE_DAYS))
                    ->whereDoesntHave('items', fn ($i) => $i->where('updated_at', '>=', now()->subDays(self::ACTIVE_DAYS)))))
            ->update(['status' => 'expired']);
    }

    private function sendIfDue(CartRecovery $recovery, array $delays, bool $quietHours): bool
    {
        $step = $recovery->reminders_sent;
        $lastActivity = $this->lastActivity($recovery->cart);

        // Not yet: the clock restarts whenever the bag is touched.
        if (now()->lt($lastActivity->copy()->addMinutes($delays[$step]))) {
            return false;
        }

        if ($recovery->last_reminder_at && $recovery->last_reminder_at->gt(now()->subHours(self::MIN_GAP_HOURS))) {
            return false;
        }

        // Stop for good: they opted out, or they bought anyway.
        if (EmailOptOut::has($recovery->email, self::TOPIC) || ($recovery->user && ! $recovery->user->cart_reminders)) {
            $recovery->update(['status' => 'unsubscribed']);

            return false;
        }

        if (Order::where('email', $recovery->email)->where('placed_at', '>=', $lastActivity)->exists()) {
            $recovery->update(['status' => 'purchased']);

            return false;
        }

        if ($quietHours && ! $this->isDaytime($recovery->region)) {
            return false; // try again on a later run
        }

        $value = $this->availableValue($recovery);

        if ($value === null) {
            return false; // everything sold out or unavailable: nothing worth emailing about
        }

        // Claim this step in one atomic update, so no reminder can ever be sent twice.
        $claimed = CartRecovery::whereKey($recovery->id)
            ->where('reminders_sent', $step)
            ->update([
                'reminders_sent' => $step + 1,
                'last_reminder_at' => now(),
                'value_minor' => $value['minor'],
                'currency' => $value['currency'],
            ]);

        if ($claimed !== 1) {
            return false;
        }

        Mail::to($recovery)->send(new AbandonedCart($recovery->fresh(), $step + 1));

        return true;
    }

    /** The later of the bag's own timestamp and its newest item. */
    private function lastActivity(Cart $cart): CarbonInterface
    {
        $itemsAt = $cart->items_max_updated_at ? Date::parse($cart->items_max_updated_at) : null;

        return $itemsAt && $itemsAt->gt($cart->updated_at) ? $itemsAt : $cart->updated_at;
    }

    private function isDaytime(?string $region): bool
    {
        $hour = now(self::TIMEZONES[$region] ?? config('app.timezone'))->hour;

        return $hour >= 8 && $hour < 21;
    }

    /** What's still buyable in the bag, at today's prices, in the shopper's currency. */
    private function availableValue(CartRecovery $recovery): ?array
    {
        $currency = CheckoutCalculator::forRegion($recovery->region ?? config('shop.default_region'))->currency();
        $lines = self::availableLines($recovery->cart, $currency);

        if ($lines->isEmpty()) {
            return null;
        }

        return ['minor' => $lines->sum('line_minor'), 'currency' => $currency];
    }

    /**
     * Each bag line that can still be bought, with its current price.
     *
     * @return Collection<int, array{variant: ProductVariant, quantity: int, unit_minor: int, line_minor: int}>
     */
    public static function availableLines(?Cart $cart, string $currency): Collection
    {
        if (! $cart) {
            return collect();
        }

        $variants = ProductVariant::with(['product.images', 'product.prices'])
            ->whereKey($cart->items->pluck('product_variant_id'))
            ->get()
            ->keyBy('id');

        return $cart->items->map(function ($item) use ($variants, $currency) {
            $variant = $variants->get($item->product_variant_id);
            $product = $variant?->product;
            $price = $product?->money($currency);

            if (! $variant || ! $product || ! $variant->is_active || ! $product->is_active || $variant->stock < 1 || ! $price) {
                return null;
            }

            $unit = $price->minor + $variant->adjustment($currency);
            $quantity = min((int) $item->quantity, (int) $variant->stock);

            return ['variant' => $variant, 'quantity' => $quantity, 'unit_minor' => $unit, 'line_minor' => $unit * $quantity];
        })->filter()->values();
    }

    /* ---------- coming back, buying, unsubscribing ---------- */

    /** The shopper clicked "Return to my bag": put those items in their current bag. */
    public function restore(CartRecovery $recovery, CartManager $carts): void
    {
        $into = $carts->currentOrCreate();
        $from = $recovery->cart;

        if ($from && $from->id !== $into->id) {
            DB::transaction(function () use ($from, $into) {
                foreach ($from->items()->lockForUpdate()->get() as $item) {
                    $existing = $into->items()->where('product_variant_id', $item->product_variant_id)->first();

                    if ($existing) {
                        $existing->update(['quantity' => max($existing->quantity, $item->quantity)]);
                        $item->delete();
                    } else {
                        $item->forceFill(['cart_id' => $into->id])->save();
                    }
                }
            });
        }

        $recovery->forceFill([
            'cart_id' => $into->id,
            'status' => 'clicked',
            'clicked_at' => $recovery->clicked_at ?? now(),
        ])->save();
    }

    /** Called when an order is placed: credit the reminder that brought it back. */
    public function markConverted(Cart $cart, Order $order): void
    {
        CartRecovery::query()
            ->whereIn('status', ['active', 'clicked'])
            ->where(fn ($q) => $q
                ->where('cart_id', $cart->id)
                ->orWhere(fn ($e) => $e
                    ->where('email', Str::lower($order->email))
                    ->where('reminders_sent', '>', 0)
                    ->where('last_reminder_at', '>=', now()->subDays(self::ACTIVE_DAYS))))
            ->update([
                'status' => 'converted',
                'order_id' => $order->id,
                'order_total_minor' => $order->total_minor,
                'currency' => $order->currency,
                'updated_at' => now(),
            ]);
    }

    public function optOut(string $email): void
    {
        $email = Str::lower($email);

        EmailOptOut::firstOrCreate(['email' => $email, 'topic' => self::TOPIC]);
        CartRecovery::where('email', $email)->whereIn('status', ['active', 'clicked'])->update(['status' => 'unsubscribed']);
        User::where('email', $email)->update(['cart_reminders' => false]);
    }
}
