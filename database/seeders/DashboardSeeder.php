<?php

namespace Database\Seeders;

use App\Http\Controllers\Admin\DashboardController;
use App\Models\ProductVariant;
use App\Support\CheckoutCalculator;
use App\Support\ExchangeRates;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DashboardSeeder extends Seeder
{
    private const DAYS = 365;
    private const ORDER_PREFIX = 'DEMO-';
    private const EMAIL_PREFIX = 'demo.';
    private const BATCH = 400;

    /** How often each region appears; regions not listed get 1. */
    private const REGION_WEIGHTS = ['IN' => 6, 'DE' => 4, 'US' => 3, 'GB' => 2, 'FR' => 2, 'NL' => 2];

    private const PAYMENTS = [
        'IN' => ['razorpay' => 45, 'cod' => 35, 'paytm' => 20],
        'default' => ['stripe' => 70, 'paypal' => 30],
    ];

    private const LANGUAGES = ['DE' => 'de', 'FR' => 'fr', 'NL' => 'nl', 'SE' => 'sv', 'PL' => 'pl'];

    private const CITIES = [
        'IN' => [['Mumbai', '400001'], ['New Delhi', '110001'], ['Bengaluru', '560001'], ['Pune', '411001'], ['Kolkata', '700001']],
        'DE' => [['Berlin', '10115'], ['Hamburg', '20095'], ['München', '80331'], ['Köln', '50667']],
        'US' => [['New York', '10001'], ['Austin', '73301'], ['Seattle', '98101'], ['Chicago', '60601']],
        'GB' => [['London', 'EC1A 1BB'], ['Manchester', 'M1 1AE']],
        'FR' => [['Paris', '75001'], ['Lyon', '69001']],
        'NL' => [['Amsterdam', '1012'], ['Rotterdam', '3011']],
        'SE' => [['Stockholm', '111 22'], ['Göteborg', '411 03']],
        'PL' => [['Warszawa', '00-001'], ['Kraków', '30-001']],
    ];

    private const FIRST_NAMES = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Lukas', 'Mia', 'Emma', 'Noah', 'Lucas', 'Chloé',
        'Sanne', 'Daan', 'Elsa', 'Oskar', 'Zofia', 'Jakub', 'Olivia', 'Liam', 'Isha', 'Kabir', 'Sofia', 'Leon'];

    private const LAST_NAMES = ['Sharma', 'Iyer', 'Patel', 'Müller', 'Schmidt', 'Martin', 'Bernard', 'de Vries', 'Jansen',
        'Andersson', 'Nowak', 'Kowalski', 'Smith', 'Johnson', 'Brown', 'Gupta', 'Reddy', 'Weber', 'Dubois'];

    private ExchangeRates $rates;
    private Collection $variants;
    private array $orderColumns;
    private array $itemColumns;
    private array $regionWeights = [];
    private array $priceCache = [];
    private string $tz;

    public function run(ExchangeRates $rates): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: demo orders are never seeded in production.');

            return;
        }

        mt_srand(2026); // same "random" data on every run

        $this->rates = $rates;
        $this->tz = config('shop.admin_timezone', config('app.timezone'));
        $this->orderColumns = array_flip(Schema::getColumnListing('orders'));
        $this->itemColumns = array_flip(Schema::getColumnListing('order_items'));

        $this->variants = ProductVariant::query()
            ->with(['product.prices', 'product.images'])
            ->where('is_active', true)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->get();

        if ($this->variants->isEmpty()) {
            $this->command->warn('No active products found. Run the product seeder first.');

            return;
        }

        foreach (array_keys(config('shop.regions')) as $region) {
            $this->regionWeights[$region] = self::REGION_WEIGHTS[$region] ?? 1;
        }

        $this->cleanUp();

        $customers = $this->customers();
        $orders = $this->orders($customers);
        $recovered = $this->recoveries($orders);
        $subscribers = $this->subscribers();
        $wishlist = $this->wishlists($customers);

        foreach (array_keys(DashboardController::PERIODS) as $period) {
            Cache::forget("admin.dashboard.{$period}");
        }

        $this->command->table(['What', 'Created'], [
            ['Customers', $customers->count()],
            ['Orders (12 months)', $orders->count()],
            ['Order lines', $orders->sum('lines')],
            ['Recovered by bag reminders', $recovered],
            ['Newsletter sign-ups', $subscribers],
            ['Wishlist saves', $wishlist],
        ]);
        $this->command->info('Open the admin dashboard and try each period.');
    }

    /* ---------- customers ---------- */

    private function customers(): Collection
    {
        $columns = array_flip(Schema::getColumnListing('users'));
        $password = Hash::make('password');
        $now = CarbonImmutable::now($this->tz);
        $rows = [];

        for ($i = 1; $i <= 160; $i++) {
            // More sign-ups recently: a growing shop.
            $daysAgo = (int) round(self::DAYS * (1 - sqrt(mt_rand() / mt_getrandmax())));
            $joined = $now->subDays($daysAgo)->setTime(mt_rand(8, 23), mt_rand(0, 59));
            $region = $this->pickWeighted($this->regionWeights);
            $first = self::FIRST_NAMES[array_rand(self::FIRST_NAMES)];
            $last = self::LAST_NAMES[array_rand(self::LAST_NAMES)];

            $rows[] = array_intersect_key([
                'name' => "{$first} {$last}",
                'email' => self::EMAIL_PREFIX.Str::slug("{$first}.{$last}", '.').".{$i}@example.test",
                'password' => $password,
                'email_verified_at' => $joined->utc(),
                'preferred_region' => $region,
                'last_login_at' => $now->subDays(mt_rand(0, $daysAgo))->utc(),
                'created_at' => $joined->utc(),
                'updated_at' => $joined->utc(),
            ], $columns);
        }

        foreach (array_chunk($rows, self::BATCH) as $chunk) {
            DB::table('users')->insert($chunk);
        }

        return DB::table('users')
            ->where('email', 'like', self::EMAIL_PREFIX.'%@example.test')
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'created_at']);
    }

    /* ---------- orders ---------- */

    private function orders(Collection $customers): Collection
    {
        $now = CarbonImmutable::now($this->tz);
        $orders = [];
        $items = [];
        $created = collect();
        $counter = 0;

        for ($daysAgo = self::DAYS - 1; $daysAgo >= 0; $daysAgo--) {
            $day = $now->subDays($daysAgo)->startOfDay();

            for ($n = $this->ordersOn($day, $daysAgo); $n > 0; $n--) {
                $placed = $day->setTime($this->pickWeighted([9 => 2, 11 => 3, 13 => 4, 15 => 3, 17 => 4, 19 => 6, 21 => 6, 22 => 3]), mt_rand(0, 59), mt_rand(0, 59));

                if ($placed->gt($now)) {
                    $placed = $now->subMinutes(mt_rand(5, 120)); // today's orders: earlier today
                }

                [$order, $lines] = $this->order(++$counter, $placed, $daysAgo, $customers);
                $orders[] = $order;
                $items[$order['number']] = $lines;

                if (count($orders) >= self::BATCH) {
                    $created = $created->merge($this->insertOrders($orders, $items));
                    $orders = $items = [];
                }
            }
        }

        if ($orders) {
            $created = $created->merge($this->insertOrders($orders, $items));
        }

        return $created;
    }

    /** How many orders a day gets: growth over the year, weekends, festivals and noise. */
    private function ordersOn(CarbonImmutable $day, int $daysAgo): int
    {
        $trend = 3 + 9 * (1 - $daysAgo / self::DAYS);
        $weekday = match ($day->dayOfWeekIso) { 6, 7 => 1.3, 1 => 0.85, default => 1.0 };
        $noise = 0.7 + (mt_rand() / mt_getrandmax()) * 0.6;

        return max(0, (int) round($trend * $weekday * $this->season($day) * $noise));
    }

    private function season(CarbonImmutable $day): float
    {
        $diwali = ['2025-10-20', '2026-11-08', '2027-10-29'];

        foreach ($diwali as $date) {
            $daysBefore = CarbonImmutable::parse($date, $this->tz)->diffInDays($day, false);
            if ($daysBefore >= -10 && $daysBefore <= 1) {
                return 2.0;
            }
        }

        // Black Friday to Cyber Monday: the fourth Friday of November, plus three days.
        $blackFriday = CarbonImmutable::create($day->year, 11, 1, 0, 0, 0, $this->tz)->nthOfMonth(4, CarbonImmutable::FRIDAY);
        if ($day->betweenIncluded($blackFriday, $blackFriday->addDays(3))) {
            return 2.4;
        }

        return match (true) {
            $day->month === 12 && $day->day >= 10 && $day->day <= 24 => 1.6,
            $day->month === 1 && $day->day <= 20 => 0.75,
            default => 1.0,
        };
    }

    private function order(int $i, CarbonImmutable $placed, int $daysAgo, Collection $customers): array
    {
        $region = $this->pickWeighted($this->regionWeights);
        $calculator = CheckoutCalculator::forRegion($region);
        $currency = $calculator->currency();
        $payment = $this->pickWeighted(self::PAYMENTS[$region] ?? self::PAYMENTS['default']);
        $shippingMethod = mt_rand(1, 100) <= 85 ? 'standard' : 'express';

        // About half the orders come from signed-up customers who'd joined by then.
        $customer = null;
        if (mt_rand(1, 100) <= 55) {
            $eligible = $customers->filter(fn ($c) => CarbonImmutable::parse($c->created_at)->lte($placed));
            $customer = $eligible->isNotEmpty() ? $eligible->random() : null;
        }

        $name = $customer?->name ?? self::FIRST_NAMES[array_rand(self::FIRST_NAMES)].' '.self::LAST_NAMES[array_rand(self::LAST_NAMES)];
        [$first, $last] = array_pad(explode(' ', $name, 2), 2, '');
        $email = $customer?->email ?? self::EMAIL_PREFIX.'guest.'.Str::slug($name, '.').".{$i}@example.test";

        // 1–3 different products, 1–2 of each.
        $lines = [];
        $subtotal = 0;
        foreach ($this->variants->random(min($this->pickWeighted([1 => 60, 2 => 30, 3 => 10]), $this->variants->count())) as $variant) {
            $unit = $this->unitPrice($variant, $currency);
            if ($unit === null) {
                continue;
            }

            $quantity = mt_rand(1, 100) <= 80 ? 1 : 2;
            $subtotal += $unit * $quantity;
            $lines[] = array_intersect_key([
                'product_variant_id' => $variant->id,
                'product_name' => $variant->product->name,
                'variant_label' => $variant->label(),
                'sku' => $variant->sku,
                'image_url' => $variant->product->images->first()?->url,
                'quantity' => $quantity,
                'unit_price_minor' => $unit,
                'line_total_minor' => $unit * $quantity,
                'created_at' => $placed->utc(),
                'updated_at' => $placed->utc(),
            ], $this->itemColumns);
        }

        if (! $lines) {
            $variant = $this->variants->first();
            $unit = $this->unitPrice($variant, $currency) ?? 1000;
            $subtotal = $unit;
            $lines[] = array_intersect_key([
                'product_variant_id' => $variant->id, 'product_name' => $variant->product->name,
                'variant_label' => $variant->label(), 'sku' => $variant->sku, 'quantity' => 1,
                'unit_price_minor' => $unit, 'line_total_minor' => $unit,
                'created_at' => $placed->utc(), 'updated_at' => $placed->utc(),
            ], $this->itemColumns);
        }

        $totals = $calculator->totals($subtotal, $shippingMethod);
        [$status, $paidAt] = $this->status($daysAgo, $payment, $placed);
        [$city, $postcode] = (self::CITIES[$region] ?? self::CITIES['US'])[array_rand(self::CITIES[$region] ?? self::CITIES['US'])];

        $address = [
            'first_name' => $first, 'last_name' => $last,
            'line1' => mt_rand(1, 220).' Demo Street', 'line2' => null,
            'postcode' => $postcode, 'city' => $city, 'country' => $region, 'phone' => null,
        ];

        $rate = (float) ($this->rates->rate($currency) ?: 1);

        $order = array_intersect_key([
            'number' => self::ORDER_PREFIX.str_pad((string) $i, 6, '0', STR_PAD_LEFT),
            'user_id' => $customer?->id,
            'status' => $status,
            'email' => $email,
            'currency' => $currency,
            'region' => $region,
            'locale' => $calculator->locale(),
            'language' => self::LANGUAGES[$region] ?? 'en',
            'subtotal_minor' => $totals['subtotal_minor'],
            'shipping_minor' => $totals['shipping_minor'],
            'tax_minor' => $totals['tax_minor'],
            'total_minor' => $totals['total_minor'],
            'tax_rate' => $totals['tax_rate'],
            'tax_inclusive' => $totals['tax_inclusive'],
            'shipping_method' => $totals['shipping_key'],
            'payment_method' => $payment,
            'shipping_address' => json_encode($address),
            'billing_address' => null,
            'notes' => null,
            'exchange_rate' => round($rate * (0.98 + (mt_rand() / mt_getrandmax()) * 0.04), 6),
            'placed_at' => $placed->utc(),
            'paid_at' => $paidAt?->utc(),
            'created_at' => $placed->utc(),
            'updated_at' => ($paidAt ?? $placed)->utc(),
        ], $this->orderColumns);

        return [$order, $lines];
    }

    /** A status that fits the order's age and how it was paid. Returns [status, paid at]. */
    private function status(int $ageDays, string $payment, CarbonImmutable $placed): array
    {
        $roll = mt_rand(1, 100);

        if ($payment === 'cod') {
            $delivered = $placed->addDays(mt_rand(3, 6));

            return match (true) {
                $ageDays >= 14 => $roll <= 8 ? ['cancelled', null] : ['delivered', $delivered],
                $ageDays >= 4 => $roll <= 35 ? ['delivered', $delivered] : ($roll <= 85 ? ['shipped', null] : ['pending', null]),
                default => $roll <= 70 ? ['pending', null] : ['shipped', null],
            };
        }

        $paid = $placed->addMinutes(mt_rand(2, 20));

        // A few online orders never got paid: still pending today, expired before that.
        if ($roll <= 3) {
            return [$ageDays < 1 ? 'pending' : 'cancelled', null];
        }

        return match (true) {
            $ageDays >= 14 => $roll <= 9 ? ['cancelled', null] : ($roll <= 13 ? ['refunded', $paid] : ['delivered', $paid]),
            $ageDays >= 4 => $roll <= 40 ? ['delivered', $paid] : ($roll <= 85 ? ['shipped', $paid] : ['paid', $paid]),
            $ageDays >= 1 => $roll <= 55 ? ['shipped', $paid] : ['paid', $paid],
            default => ['paid', $paid],
        };
    }

    private function unitPrice(ProductVariant $variant, string $currency): ?int
    {
        $key = "{$variant->id}:{$currency}";

        if (! array_key_exists($key, $this->priceCache)) {
            $price = $variant->product->money($currency);
            $this->priceCache[$key] = $price ? $price->minor + $variant->adjustment($currency) : null;
        }

        return $this->priceCache[$key];
    }

    /** Insert a batch of orders, then their lines with the new order ids. */
    private function insertOrders(array $orders, array $items): Collection
    {
        DB::table('orders')->insert($orders);

        $ids = DB::table('orders')->whereIn('number', array_column($orders, 'number'))->pluck('id', 'number');

        $lines = [];
        foreach ($items as $number => $orderLines) {
            foreach ($orderLines as $line) {
                $lines[] = ['order_id' => $ids[$number], ...$line];
            }
        }

        foreach (array_chunk($lines, self::BATCH) as $chunk) {
            DB::table('order_items')->insert($chunk);
        }

        return collect($orders)->map(fn ($o) => [
            'id' => $ids[$o['number']],
            'email' => $o['email'],
            'status' => $o['status'],
            'region' => $o['region'],
            'currency' => $o['currency'],
            'total_minor' => $o['total_minor'],
            'placed_at' => $o['placed_at'],
            'lines' => count($items[$o['number']]),
        ]);
    }

    /* ---------- growth ---------- */

    /** About 4% of completed orders came back through a bag reminder. */
    private function recoveries(Collection $orders): int
    {
        if (! Schema::hasTable('cart_recoveries')) {
            return 0;
        }

        $rows = $orders
            ->filter(fn ($o) => in_array($o['status'], ['paid', 'shipped', 'delivered'], true) && mt_rand(1, 100) <= 4)
            ->map(function ($o) {
                $placed = CarbonImmutable::parse($o['placed_at']);
                $reminded = $placed->subHours(mt_rand(2, 40));

                return [
                    'cart_id' => null,
                    'email' => $o['email'],
                    'region' => $o['region'],
                    'language' => self::LANGUAGES[$o['region']] ?? 'en',
                    'token' => Str::random(48),
                    'consent' => true,
                    'status' => 'converted',
                    'reminders_sent' => mt_rand(1, 2),
                    'last_reminder_at' => $reminded,
                    'clicked_at' => $reminded->addMinutes(mt_rand(5, 300)),
                    'value_minor' => $o['total_minor'],
                    'currency' => $o['currency'],
                    'order_id' => $o['id'],
                    'order_total_minor' => $o['total_minor'],
                    'created_at' => $reminded->subHours(mt_rand(1, 24)),
                    'updated_at' => $placed,
                ];
            })
            ->values();

        foreach ($rows->chunk(self::BATCH) as $chunk) {
            DB::table('cart_recoveries')->insert($chunk->all());
        }

        return $rows->count();
    }

    private function subscribers(): int
    {
        if (! Schema::hasTable('subscribers')) {
            return 0;
        }

        $columns = array_flip(Schema::getColumnListing('subscribers'));
        $now = CarbonImmutable::now();
        $rows = [];

        for ($i = 1; $i <= 300; $i++) {
            $at = $now->subDays((int) round(self::DAYS * (1 - sqrt(mt_rand() / mt_getrandmax()))))->subMinutes(mt_rand(0, 1439));
            $rows[] = array_intersect_key([
                'email' => self::EMAIL_PREFIX."reader.{$i}@example.test",
                'locale' => array_rand(config('shop.locales')),
                'token' => Str::random(40),
                'confirmed_at' => $at->addMinutes(mt_rand(1, 120)),
                'created_at' => $at,
                'updated_at' => $at,
            ], $columns);
        }

        try {
            foreach (array_chunk($rows, self::BATCH) as $chunk) {
                DB::table('subscribers')->insert($chunk);
            }
        } catch (QueryException $e) {
            $this->command->warn('Newsletter sign-ups skipped: '.Str::limit($e->getMessage(), 120));

            return 0;
        }

        return count($rows);
    }

    private function wishlists(Collection $customers): int
    {
        $columns = array_flip(Schema::getColumnListing('wishlist_items'));
        $products = $this->variants->pluck('product')->unique('id')->values();
        $rows = [];

        foreach ($customers->random(min(90, $customers->count())) as $customer) {
            $joined = CarbonImmutable::parse($customer->created_at);

            foreach ($products->random(min(mt_rand(1, 4), $products->count())) as $product) {
                $at = $joined->addDays(mt_rand(0, max(0, (int) $joined->diffInDays(now()))));
                $rows[] = array_intersect_key([
                    'user_id' => $customer->id,
                    'product_id' => $product->id,
                    'added_price_minor' => $product->money($this->rates->base())?->minor,
                    'created_at' => $at,
                    'updated_at' => $at,
                ], $columns);
            }
        }

        try {
            foreach (array_chunk($rows, self::BATCH) as $chunk) {
                DB::table('wishlist_items')->insert($chunk);
            }
        } catch (QueryException $e) {
            $this->command->warn('Wishlist saves skipped: '.Str::limit($e->getMessage(), 120));

            return 0;
        }

        return count($rows);
    }

    /* ---------- helpers ---------- */

    private function cleanUp(): void
    {
        $orderIds = DB::table('orders')->where('number', 'like', self::ORDER_PREFIX.'%')->pluck('id');

        foreach ($orderIds->chunk(1000) as $chunk) {
            if (Schema::hasTable('cart_recoveries')) {
                DB::table('cart_recoveries')->whereIn('order_id', $chunk)->delete();
            }
            DB::table('order_items')->whereIn('order_id', $chunk)->delete();
            DB::table('orders')->whereIn('id', $chunk)->delete();
        }

        $userIds = DB::table('users')->where('email', 'like', self::EMAIL_PREFIX.'%@example.test')->pluck('id');
        DB::table('wishlist_items')->whereIn('user_id', $userIds)->delete();
        DB::table('users')->whereIn('id', $userIds)->delete();

        if (Schema::hasTable('subscribers')) {
            DB::table('subscribers')->where('email', 'like', self::EMAIL_PREFIX.'%@example.test')->delete();
        }
    }

    /** Pick a key at random, where each value is its relative weight. */
    private function pickWeighted(array $weights): int|string
    {
        $roll = mt_rand(1, array_sum($weights));

        foreach ($weights as $value => $weight) {
            if (($roll -= $weight) <= 0) {
                return $value;
            }
        }

        return array_key_first($weights);
    }
}
