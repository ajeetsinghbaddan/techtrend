<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\User;
use App\Models\WishlistItem;
use App\Support\CheckoutCalculator;
use App\Support\ExchangeRates;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\CarbonInterface;

class CustomerSeeder extends Seeder
{
    private const PASSWORD = 'password';

    /** Street, postcode, city per country; postcodes match the Postcode rule. */
    private const PLACES = [
        'DE' => [['Torstraße 112', '10119', 'Berlin'], ['Schanzenstraße 41', '20357', 'Hamburg'], ['Sendlinger Straße 7', '80331', 'München']],
        'FR' => [['18 Rue Oberkampf', '75011', 'Paris'], ['4 Rue de la République', '69002', 'Lyon'], ['9 Cours Julien', '13006', 'Marseille']],
        'NL' => [['Haarlemmerstraat 75', '1013 EK', 'Amsterdam'], ['Witte de Withstraat 20', '3012 BP', 'Rotterdam'], ['Oudegracht 140', '3511 AX', 'Utrecht']],
        'BE' => [['Rue Neuve 30', '1000', 'Bruxelles'], ['Meir 50', '2000', 'Antwerpen'], ['Veldstraat 12', '9000', 'Gent']],
        'SE' => [['Götgatan 22', '118 46', 'Stockholm'], ['Linnégatan 5', '413 04', 'Göteborg'], ['Södergatan 3', '211 34', 'Malmö']],
        'PL' => [['ul. Marszałkowska 84', '00-514', 'Warszawa'], ['ul. Floriańska 15', '31-019', 'Kraków'], ['ul. Piotrkowska 60', '90-105', 'Łódź']],
        'GB' => [['14 Exmouth Market', 'EC1R 4QE', 'London'], ['22 Bold Street', 'L1 4DS', 'Liverpool'], ['8 Thomas Street', 'M4 1EU', 'Manchester']],
        'US' => [['120 Bedford Avenue', '11249', 'Brooklyn'], ['455 Valencia Street', '94103', 'San Francisco'], ['210 South Street', '02111', 'Boston']],
    ];

    private const PHONES = [
        'DE' => '+49 30 5550 1234', 'FR' => '+33 1 55 50 12 34', 'NL' => '+31 20 555 0123', 'BE' => '+32 2 555 01 23',
        'SE' => '+46 8 555 012 34', 'PL' => '+48 22 555 01 23', 'GB' => '+44 20 5550 1234', 'US' => '+1 212 555 0123',
    ];

    /** @var Collection<int, Product> */
    private Collection $products;

    private string $baseCurrency;

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: test customers are never seeded in production.');

            return;
        }

        $this->products = Product::where('is_active', true)
            ->with(['variants' => fn ($q) => $q->where('is_active', true), 'images', 'prices'])
            ->get()
            ->filter(fn (Product $p) => $p->variants->isNotEmpty())
            ->values();

        if ($this->products->isEmpty()) {
            $this->command->warn('No active products with variants. Run the product seeder first.');

            return;
        }

        $this->baseCurrency = app(ExchangeRates::class)->base();

        $this->cleanUp();

        $home = $this->homeRegion();

        // 1. The main test customer: everything filled in.
        $customer = $this->account('customer@example.test', 'Alex Morgan', verified: true);
        $this->addressBook($customer, $home);
        $this->orderHistory($customer, $home);
        $this->guestOrders($customer->email, $customer->name, $home, [200, 150]);
        $this->wishlistFor($customer, 6, priceDrops: 2);

        // 2. Unconfirmed email: their guest order must stay hidden.
        $unverified = $this->account('unverified@example.test', 'Sam Lee', verified: false);
        $this->createOrder($unverified, $unverified->email, $home, $this->randomItems(), 'pending', now()->subHours(3),
            $this->addressFor('Sam', 'Lee', $home));
        $this->guestOrders($unverified->email, $unverified->name, $home, [45]);

        // 3. A brand-new customer with nothing yet.
        $this->account('new@example.test', 'Robin Fischer', verified: true);

        // 4. Data for reviews and the admin.
        $verified = $this->verifiedPurchases();
        $this->shopperWishlists();

        $this->command->info("Created orders behind {$verified} verified-purchase reviews.");
        $this->command->table(['Account', 'Password', 'Use it to test'], [
            ['customer@example.test', self::PASSWORD, 'Full account: addresses, 12 orders, wishlist with price drops'],
            ['unverified@example.test', self::PASSWORD, 'Email not confirmed: guest order hidden until verified'],
            ['new@example.test', self::PASSWORD, 'Empty states: no orders, addresses or wishlist'],
        ]);
    }

    /* ---------- setup ---------- */

    /** Remove everything this seeder made last time, so it can run again cleanly. */
    private function cleanUp(): void
    {
        $seededUsers = User::where('email', 'like', '%@example.test')->select('id');

        Order::where('email', 'like', '%@example.test')->delete();
        WishlistItem::whereIn('user_id', $seededUsers)->delete();
        WishlistItem::where('guest_token', 'like', 'seed%')->delete();
        Address::whereIn('user_id', $seededUsers)->delete();
    }

    private function homeRegion(): string
    {
        $regions = array_keys(config('shop.regions'));

        return in_array('DE', $regions, true) ? 'DE' : config('shop.default_region');
    }

    /** A second region, to show an order in another currency. */
    private function otherRegion(string $except): string
    {
        $candidates = array_values(array_filter(
            array_keys(config('shop.regions')),
            fn (string $code) => $code !== $except && isset(self::PLACES[$code]),
        ));

        return $candidates ? Arr::random($candidates) : $except;
    }

    private function account(string $email, string $name, bool $verified): User
    {
        $user = User::where('email', $email)->first() ?? new User();

        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make(self::PASSWORD),
            'email_verified_at' => $verified ? now() : null,
            'phone' => null,
            'preferred_locale' => null,
            'preferred_region' => null,
        ])->save();

        return $user;
    }

    /* ---------- addresses ---------- */

    private function addressBook(User $user, string $region): void
    {
        [$first, $last] = $this->splitName($user->name);
        $places = self::PLACES[$region] ?? self::PLACES['DE'];

        $entries = [
            ['label' => 'Home', 'place' => $places[0], 'defaults' => ['shipping']],
            ['label' => 'Office', 'place' => $places[1], 'defaults' => []],
            ['label' => 'Parents', 'place' => $places[2], 'defaults' => ['billing']],
        ];

        foreach ($entries as $entry) {
            $address = $user->addresses()->create([
                ...$this->addressFor($first, $last, $region, $entry['place']),
                'label' => $entry['label'],
            ]);

            foreach ($entry['defaults'] as $type) {
                $address->makeDefault($type);
            }
        }
    }

    /** An address in checkout's format, in the given region. */
    private function addressFor(string $first, string $last, string $region, ?array $place = null): array
    {
        $place ??= isset(self::PLACES[$region]) ? Arr::random(self::PLACES[$region]) : ['Main Street 1', '12345', 'Capital City'];

        return [
            'first_name' => $first,
            'last_name' => $last,
            'line1' => $place[0],
            'line2' => '',
            'postcode' => $place[1],
            'city' => $place[2],
            'country' => $region,
            'phone' => self::PHONES[$region] ?? '',
        ];
    }

    /* ---------- orders ---------- */

    private function orderHistory(User $user, string $home): void
    {
        [$first, $last] = $this->splitName($user->name);
        $other = $this->otherRegion($home);
        $homeAddress = $this->addressFor($first, $last, $home, (self::PLACES[$home] ?? self::PLACES['DE'])[0]);

        // Oldest first; covers every status, one order abroad, one with a separate billing address.
        $plan = [
            ['days' => 180, 'status' => 'delivered', 'region' => $home],
            ['days' => 120, 'status' => 'delivered', 'region' => $home],
            ['days' => 100, 'status' => 'delivered', 'region' => $home, 'billing' => true],
            ['days' => 75, 'status' => 'refunded', 'region' => $home],
            ['days' => 60, 'status' => 'delivered', 'region' => $other],
            ['days' => 40, 'status' => 'delivered', 'region' => $home],
            ['days' => 30, 'status' => 'cancelled', 'region' => $home],
            ['days' => 6, 'status' => 'shipped', 'region' => $home],
            ['days' => 2, 'status' => 'paid', 'region' => $home],
            ['days' => 0, 'status' => 'pending', 'region' => $home],
        ];

        foreach ($plan as $step) {
            $shipping = $step['region'] === $home ? $homeAddress : $this->addressFor($first, $last, $step['region']);
            $billing = ! empty($step['billing'])
                ? $this->addressFor($first, $last, $home, (self::PLACES[$home] ?? self::PLACES['DE'])[2])
                : null;

            $this->createOrder($user, $user->email, $step['region'], $this->randomItems(), $step['status'],
                now()->subDays($step['days'])->subMinutes(random_int(30, 600)), $shipping, $billing);
        }
    }

    /** Orders placed without logging in, using this email. */
    private function guestOrders(string $email, string $name, string $region, array $daysAgo): void
    {
        [$first, $last] = $this->splitName($name);

        foreach ($daysAgo as $days) {
            $this->createOrder(null, $email, $region, $this->randomItems(), 'delivered',
                now()->subDays($days), $this->addressFor($first, $last, $region));
        }
    }

    /** 1–3 random products, one variant each, quantity 1–2. */
    private function randomItems(): array
    {
        return $this->products->shuffle()->take(random_int(1, 3))
            ->map(function (Product $product) {
                $variant = $product->variants->random()->setRelation('product', $product);

                return [$variant, random_int(1, 2)];
            })
            ->all();
    }

    /**
     * Build an order the same way checkout does: prices for the region's currency,
     * tax and shipping from CheckoutCalculator, item details copied onto the order.
     *
     * @param  array<int, array{ProductVariant, int}>  $items
     */
    private function createOrder(?User $user, string $email, string $region, array $items, string $status,
        CarbonInterface $placedAt, array $shipping, ?array $billing = null): ?Order
    {
        $calculator = CheckoutCalculator::forRegion($region);
        $currency = $calculator->currency();

        $lines = [];
        $subtotal = 0;

        foreach ($items as [$variant, $quantity]) {
            $product = $variant->product;
            $base = $product->money($currency);

            if (! $base) {
                continue; // no price in this currency
            }

            $unit = $base->minor + $variant->adjustment($currency);
            $lineTotal = $unit * $quantity;
            $subtotal += $lineTotal;

            $lines[] = [
                'product_variant_id' => $variant->id,
                'product_name' => $product->name,
                'variant_label' => $variant->label(),
                'sku' => $variant->sku,
                'image_url' => $product->images->first()?->url,
                'quantity' => $quantity,
                'unit_price_minor' => $unit,
                'line_total_minor' => $lineTotal,
                'created_at' => $placedAt,
                'updated_at' => $placedAt,
            ];
        }

        if (! $lines) {
            return null;
        }

        $shippingKeys = array_column($calculator->shippingMethods($subtotal), 'key');
        $shippingKey = in_array('express', $shippingKeys, true) && random_int(1, 4) === 1 ? 'express' : ($shippingKeys[0] ?? 'standard');
        $totals = $calculator->totals($subtotal, $shippingKey);

        $order = new Order();
        $order->forceFill([
            'number' => $this->orderNumber($placedAt),
            'user_id' => $user?->id,
            'status' => $status,
            'email' => $email,
            'currency' => $currency,
            'region' => $region,
            'locale' => $calculator->locale(),
            'subtotal_minor' => $totals['subtotal_minor'],
            'shipping_minor' => $totals['shipping_minor'],
            'tax_minor' => $totals['tax_minor'],
            'total_minor' => $totals['total_minor'],
            'tax_rate' => $totals['tax_rate'],
            'tax_inclusive' => $totals['tax_inclusive'],
            'shipping_method' => $totals['shipping_key'],
            'payment_method' => Arr::random(config("shop.payment_methods.{$region}", ['card'])),
            'shipping_address' => $shipping,
            'billing_address' => $billing,
            'placed_at' => $placedAt,
            'created_at' => $placedAt,
            'updated_at' => $placedAt,
        ])->save();

        OrderItem::insert(array_map(fn (array $line) => [...$line, 'order_id' => $order->id], $lines));

        return $order;
    }

    /** Like Order::generateNumber(), but dated to when the order was placed. */
    private function orderNumber(CarbonInterface $placedAt): string
    {
        do {
            $number = 'TT-'.$placedAt->format('ym').'-'.Str::upper(Str::random(5));
        } while (Order::where('number', $number)->exists());

        return $number;
    }

    /* ---------- reviews ---------- */

    /** Give every "Verified purchase" review a real delivered order, so the badge is true. */
    private function verifiedPurchases(): int
    {
        $products = $this->products->keyBy('id');
        $regions = array_keys(config('shop.regions'));
        $notBacked = [];
        $created = 0;

        $reviews = Review::where('is_verified', true)
            ->whereHas('user', fn ($q) => $q->where('email', 'like', 'reviewer%@example.test'))
            ->with('user')
            ->get();

        foreach ($reviews as $review) {
            $product = $products->get($review->product_id);

            if (! $product) {
                $notBacked[] = $review->id;
                continue;
            }

            $variant = $product->variants->random()->setRelation('product', $product);
            $region = Arr::random($regions);
            [$first, $last] = $this->splitName($review->user->name);

            $order = $this->createOrder($review->user, $review->user->email, $region, [[$variant, 1]], 'delivered',
                $review->created_at->copy()->subDays(random_int(5, 20)), $this->addressFor($first, $last, $region));

            $order ? $created++ : $notBacked[] = $review->id;
        }

        // A badge with no order behind it would be a lie: remove it.
        if ($notBacked) {
            Review::whereKey($notBacked)->update(['is_verified' => false]);
        }

        return $created;
    }

    /* ---------- wishlists ---------- */

    private function wishlistFor(User $user, int $count, int $priceDrops = 0): void
    {
        foreach ($this->products->shuffle()->take($count)->values() as $i => $product) {
            // Pretend the first few were saved when they cost 15% more, to show "Price dropped".
            $factor = $i < $priceDrops ? 1.15 : 1.0;

            $this->saveToWishlist(['user_id' => $user->id], $product, now()->subDays(random_int(3, 40)), $factor);
        }
    }

    private function shopperWishlists(): void
    {
        foreach (User::where('email', 'like', 'reviewer%@example.test')->get() as $user) {
            foreach ($this->products->shuffle()->take(random_int(0, 5)) as $product) {
                $this->saveToWishlist(['user_id' => $user->id], $product, now()->subDays(random_int(0, 90)));
            }
        }

        for ($i = 0; $i < 20; $i++) {
            $token = 'seed'.Str::random(36);
            // The first guest wishlist is old enough for `model:prune` to delete.
            $savedAt = $i === 0 ? now()->subDays(120) : now()->subDays(random_int(0, 60));

            foreach ($this->products->shuffle()->take(random_int(1, 6)) as $product) {
                $this->saveToWishlist(['user_id' => null, 'guest_token' => $token], $product, $savedAt);
            }
        }
    }

    private function saveToWishlist(array $owner, Product $product, CarbonInterface $savedAt, float $priceFactor = 1.0): void
    {
        $price = $product->money($this->baseCurrency)?->minor;

        $item = new WishlistItem();
        $item->forceFill([
            ...$owner,
            'product_id' => $product->id,
            'added_price_minor' => $price ? (int) round($price * $priceFactor) : null,
            'created_at' => $savedAt,
            'updated_at' => $savedAt,
        ])->save();
    }

    /* ---------- helpers ---------- */

    /** @return array{string, string} */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [$name];
        $first = array_shift($parts) ?? $name;

        return [$first, $parts ? implode(' ', $parts) : $first];
    }
}
