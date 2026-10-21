<?php

namespace Database\Seeders;

use App\Models\Cart;
use App\Models\CartRecovery;
use App\Models\EmailOptOut;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use App\Support\CartReminders;
use App\Support\CheckoutCalculator;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CartRecoverySeeder extends Seeder
{
    /** @var Collection<int, ProductVariant> */
    private Collection $variants;

    private string $region;

    /** Rows for the summary table printed at the end. */
    private array $summary = [];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: demo bags are never seeded in production.');

            return;
        }

        $this->variants = ProductVariant::query()
            ->with('product.prices')
            ->where('is_active', true)
            ->where('stock', '>', 5)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->inRandomOrder()
            ->take(20)
            ->get();

        if ($this->variants->count() < 3) {
            $this->command->warn('Need at least 3 active, in-stock product variants. Run the product seeder first.');

            return;
        }

        $this->region = array_key_exists('DE', config('shop.regions')) ? 'DE' : config('shop.default_region');

        $this->cleanUp();
        $this->liveBags();
        $this->history();

        $this->command->info('Live bags (run `php artisan carts:send-reminders` to see what happens):');
        $this->command->table(['Shopper', 'Situation', 'What the job will do'], $this->summary);
    }

    /* ---------- live bags: the job acts on these ---------- */

    private function liveBags(): void
    {
        // 1. Left 2 hours ago: the first reminder is due.
        $this->liveBag('bag.first@example.test', idleHours: 2, sent: 0,
            situation: 'Left 2 hours ago, no reminder yet', expect: 'Sends reminder 1');

        // 2. Left 30 hours ago, reminded once yesterday: the second reminder is due.
        $this->liveBag('bag.second@example.test', idleHours: 30, sent: 1, lastReminderHours: 29,
            situation: 'Left 30 hours ago, 1 reminder sent', expect: 'Sends reminder 2 (with free-shipping tip)');

        // 3. A logged-in customer, left 80 hours ago, reminded twice: the last reminder is due.
        $customer = User::where('email', 'customer@example.test')->first();

        if ($customer) {
            $customer->forceFill(['cart_reminders' => true])->save();
            $this->liveBag($customer->email, idleHours: 80, sent: 2, lastReminderHours: 50, user: $customer,
                situation: 'Customer account, left 3+ days ago, 2 sent', expect: 'Sends reminder 3 (the last one)');
        }

        // 4. Left 20 minutes ago: too soon.
        $this->liveBag('bag.notyet@example.test', idleHours: 0.33, sent: 0,
            situation: 'Left 20 minutes ago', expect: 'Nothing yet (due after 1 hour)');

        // 5. Unsubscribed earlier from an email link.
        EmailOptOut::firstOrCreate(['email' => 'bag.optedout@example.test', 'topic' => CartReminders::TOPIC]);
        $this->liveBag('bag.optedout@example.test', idleHours: 3, sent: 0,
            situation: 'Unsubscribed from bag reminders before', expect: 'Marks it "Unsubscribed", sends nothing');

        // 6. Ordered separately after leaving the bag (e.g. on another device).
        $this->liveBag('bag.bought@example.test', idleHours: 5, sent: 0,
            situation: 'Placed an order after leaving the bag', expect: 'Marks it "Bought anyway", sends nothing');
        $this->orderFor('bag.bought@example.test', placedHoursAgo: 1);

        // 7. A guest who typed their email but did NOT tick "remind me": no record at all.
        $this->cart(null, idleHours: 3);
        $this->summary[] = ['(guest, no consent)', 'Left 3 hours ago, never ticked "remind me"', 'Nothing: no consent, no record'];
    }

    private function liveBag(string $email, float $idleHours, int $sent, string $situation, string $expect,
        ?float $lastReminderHours = null, ?User $user = null): void
    {
        $cart = $this->cart($user, $idleHours);

        $this->recovery([
            'cart_id' => $cart->id,
            'user_id' => $user?->id,
            'email' => $email,
            'language' => $user?->preferredLocale() ?? 'en',
            'region' => $user?->preferred_region ?? $this->region,
            'consent' => true,
            'status' => 'active',
            'reminders_sent' => $sent,
            'last_reminder_at' => $lastReminderHours !== null ? $this->ago($lastReminderHours) : null,
            'created_at' => $this->ago($idleHours),
            'updated_at' => $this->ago($lastReminderHours ?? $idleHours),
        ]);

        $this->summary[] = [$email, $situation, $expect];
    }

    /** A bag with 1–3 products, last touched $idleHours ago. */
    /** A bag with 1–3 products, last touched $idleHours ago. */
    private function cart(?User $user, float $idleHours): Cart
    {
        $at = $this->ago($idleHours);
        $region = $user?->preferred_region ?? $this->region;
        $calculator = CheckoutCalculator::forRegion($region);

        // A customer has one bag: reuse it. Guests get a new one.
        $cart = $user ? (Cart::where('user_id', $user->id)->first() ?? new Cart()) : new Cart();

        $attributes = [
            'user_id' => $user?->id,
            'created_at' => $cart->exists ? $cart->created_at : $at,
            'updated_at' => $at,
        ];

        // Fill whichever of these your carts table has, so required columns are never empty.
        $optional = [
            'token' => $cart->token ?? 'seed'.Str::random(36),
            'currency' => $calculator->currency(),
            'region' => $region,
            'locale' => $calculator->locale(),
        ];

        foreach ($optional as $column => $value) {
            if (Schema::hasColumn('carts', $column)) {
                $attributes[$column] = $value;
            }
        }

        $cart->forceFill($attributes)->save();
        $cart->items()->delete();

        foreach ($this->variants->random(random_int(1, 3)) as $variant) {
            $item = [
                'product_variant_id' => $variant->id,
                'quantity' => random_int(1, 2),
                'created_at' => $at,
                'updated_at' => $at,
            ];

            // Some cart tables also store the price at the time it was added.
            if (Schema::hasColumn('cart_items', 'unit_price_minor')) {
                $price = $variant->product->money($calculator->currency());
                $item['unit_price_minor'] = ($price?->minor ?? 0) + $variant->adjustment($calculator->currency());
            }

            $cart->items()->make()->forceFill($item)->save();
        }

        return $cart;
    }

    /** A copy of an existing order, placed by this email, to simulate "bought anyway". */
    private function orderFor(string $email, float $placedHoursAgo): void
    {
        $template = Order::latest('id')->first();

        if (! $template) {
            return; // no orders yet: the job will send a reminder instead
        }

        $copy = $template->replicate();
        $copy->forceFill([
            'number' => 'TT-SEED-'.Str::upper(Str::random(5)),
            'email' => $email,
            'user_id' => null,
            'placed_at' => $this->ago($placedHoursAgo),
            'created_at' => $this->ago($placedHoursAgo),
            'updated_at' => $this->ago($placedHoursAgo),
        ])->save();
    }

    /* ---------- history: fills the admin dashboard ---------- */

    private function history(): void
    {
        $calculator = CheckoutCalculator::forRegion($this->region);
        $orders = Order::where('email', 'like', '%@example.test')
            ->where('number', 'not like', 'TT-SEED-%')
            ->inRandomOrder()
            ->take(15)
            ->get(['id', 'total_minor', 'currency']);

        for ($i = 1; $i <= 30; $i++) {
            $status = $this->pick(['converted' => 30, 'expired' => 30, 'clicked' => 15, 'purchased' => 15, 'unsubscribed' => 10]);
            $lastReminder = now()->subDays(random_int(1, 29))->subMinutes(random_int(0, 1439));
            $sent = match ($status) {
                'converted' => random_int(1, 2),
                'expired' => 3,
                default => random_int(1, 3),
            };

            $order = $status === 'converted' ? $orders->shift() : null;
            $value = random_int(15, 250) * 100;
            $email = "shopper{$i}@example.test";

            if ($status === 'unsubscribed') {
                EmailOptOut::firstOrCreate(['email' => $email, 'topic' => CartReminders::TOPIC]);
            }

            $this->recovery([
                'cart_id' => null, // the bag is long gone; only the record remains
                'email' => $email,
                'language' => Arr::random(array_keys(config('shop.locales'))),
                'region' => $this->region,
                'consent' => true,
                'status' => $status,
                'reminders_sent' => $sent,
                'last_reminder_at' => $lastReminder,
                'clicked_at' => in_array($status, ['clicked', 'converted'], true) && random_int(1, 100) <= 80
                    ? $lastReminder->copy()->addMinutes(random_int(5, 600))
                    : null,
                'value_minor' => $value,
                'currency' => $order?->currency ?? $calculator->currency(),
                'order_id' => $order?->id,
                'order_total_minor' => $status === 'converted' ? ($order?->total_minor ?? $value) : null,
                'created_at' => $lastReminder->copy()->subHours(random_int(1, 48)),
                'updated_at' => $lastReminder,
            ]);
        }
    }

    /* ---------- helpers ---------- */

    private function recovery(array $attributes): CartRecovery
    {
        $recovery = new CartRecovery();
        $recovery->forceFill($attributes)->save();

        return $recovery;
    }

    private function cleanUp(): void
    {
        $seededCarts = CartRecovery::where('email', 'like', '%@example.test')->whereNotNull('cart_id')->pluck('cart_id');

        CartRecovery::where('email', 'like', '%@example.test')->delete();
        EmailOptOut::where('email', 'like', '%@example.test')->where('topic', CartReminders::TOPIC)->delete();
        Order::where('number', 'like', 'TT-SEED-%')->delete();

        // Guest bags this seeder made. The customer's own bag is reused, not deleted.
        $guestCarts = Cart::whereIn('id', $seededCarts)->whereNull('user_id')->pluck('id');

        if (Schema::hasColumn('carts', 'token')) {
            $guestCarts = $guestCarts->merge(Cart::where('token', 'like', 'seed%')->pluck('id'))->unique();
        }

        Cart::whereIn('id', $guestCarts)->get()->each(function (Cart $cart) {
            $cart->items()->delete();
            $cart->delete();
        });
    }

    private function ago(float $hours): CarbonInterface
    {
        return now()->subMinutes((int) round($hours * 60));
    }

    /** Pick a key at random, where each value is its relative weight. */
    private function pick(array $weights): string
    {
        $roll = random_int(1, array_sum($weights));

        foreach ($weights as $value => $weight) {
            if (($roll -= $weight) <= 0) {
                return $value;
            }
        }

        return array_key_first($weights);
    }
}
