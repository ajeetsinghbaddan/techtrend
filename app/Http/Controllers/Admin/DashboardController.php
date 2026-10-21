<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CartRecovery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\User;
use App\Models\WishlistItem;
use App\Support\ExchangeRates;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /** Period key → number of days (or months for 12m). */
    public const PERIODS = ['7d' => 7, '30d' => 30, '90d' => 90, '12m' => 12];

    private const LOW_STOCK = 5;

    private const CACHE_MINUTES = 5;

    public function __construct(private readonly ExchangeRates $rates)
    {
    }

    public function __invoke(Request $request)
    {
        // Customers land on their own account instead.
        if (! $request->user()->isSuperAdmin()) {
            return redirect()->route('account.overview');
        }

        $period = array_key_exists((string) $request->query('period'), self::PERIODS)
            ? (string) $request->query('period')
            : '30d';

        return Inertia::render('dashboard', [
            'period' => $period,
            'periods' => array_keys(self::PERIODS),
            'baseCurrency' => $this->rates->base(),
            'stats' => fn () => Cache::remember(
                "admin.dashboard.{$period}",
                now()->addMinutes(self::CACHE_MINUTES),
                fn () => $this->stats($period),
            ),
            // Always live: these are the things to act on.
            'attention' => fn () => $this->attention(),
            'recentOrders' => fn () => $this->recentOrders(),
            'lowStock' => fn () => $this->lowStock(),
        ]);
    }

    /** "Refresh": recalculate the sales figures now instead of waiting for the cache. */
    public function refresh()
    {
        foreach (array_keys(self::PERIODS) as $period) {
            Cache::forget("admin.dashboard.{$period}");
        }

        return back();
    }

    /* ---------- sales figures (cached) ---------- */

    private function stats(string $period): array
    {
        $tz = config('shop.admin_timezone', config('app.timezone'));
        $monthly = $period === '12m';
        $now = CarbonImmutable::now($tz);

        $start = $monthly
            ? $now->startOfMonth()->subMonths(self::PERIODS[$period] - 1)
            : $now->startOfDay()->subDays(self::PERIODS[$period] - 1);

        // Compare like with like: the same amount of time, just before this period.
        $elapsed = (int) $start->diffInSeconds($now);
        $previousStart = $monthly ? $start->subMonths(self::PERIODS[$period]) : $start->subDays(self::PERIODS[$period]);
        $previousEnd = $previousStart->addSeconds($elapsed);

        $current = $this->totals($start, $now);
        $previous = $this->totals($previousStart, $previousEnd);

        return [
            'generated_at' => now()->toIso8601String(),
            'range' => ['from' => $start->toDateString(), 'to' => $now->toDateString()],
            'kpis' => [
                $this->kpi('revenue', 'Revenue', $current['revenue'], $previous['revenue'], money: true),
                $this->kpi('orders', 'Orders', $current['orders'], $previous['orders']),
                $this->kpi('aov', 'Average order', $current['aov'], $previous['aov'], money: true),
                $this->kpi('customers', 'New customers', $current['customers'], $previous['customers']),
            ],
            'series' => $this->series($start, $now, $monthly),
            'topProducts' => $this->topProducts($start, $now),
            'regions' => $this->regions($start, $now),
            'growth' => $this->growth($start, $now),
        ];
    }

    /**
     * Orders that count as sales: paid (or further along), and cash-on-delivery
     * orders that are confirmed by being placed. Unpaid online orders don't count.
     */
    private function counted(Builder $query, CarbonImmutable $from, CarbonImmutable $to, string $table = 'orders'): Builder
    {
        return $query
            ->where("{$table}.placed_at", '>=', $from->utc())
            ->where("{$table}.placed_at", '<', $to->utc())
            ->where(fn ($q) => $q
                ->whereIn("{$table}.status", ['paid', 'shipped', 'delivered'])
                ->orWhere(fn ($cod) => $cod->where("{$table}.status", 'pending')->where("{$table}.payment_method", 'cod')));
    }

    private function totals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->counted(Order::query(), $from, $to)
            ->groupBy('currency')
            ->selectRaw('currency, COUNT(*) as orders, SUM(total_minor) as total')
            ->get();

        $revenue = (int) $rows->sum(fn ($r) => $this->toBase((int) $r->total, $r->currency));
        $orders = (int) $rows->sum('orders');

        return [
            'revenue' => $revenue,
            'orders' => $orders,
            'aov' => $orders > 0 ? intdiv($revenue, $orders) : 0,
            'customers' => User::where('is_super_admin', false)
                ->where('created_at', '>=', $from->utc())
                ->where('created_at', '<', $to->utc())
                ->count(),
        ];
    }

    private function kpi(string $key, string $label, int $value, int $previous, bool $money = false): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'formatted' => $money ? $this->format($value) : number_format($value),
            'previous_formatted' => $money ? $this->format($previous) : number_format($previous),
            // No percentage when there's nothing to compare with.
            'change' => $previous > 0 ? round(($value - $previous) / $previous * 100, 1) : null,
        ];
    }

    /** Revenue and orders per day (or month), with empty days included as zero. */
    private function series(CarbonImmutable $start, CarbonImmutable $end, bool $monthly): array
    {
        $dbOffset = CarbonImmutable::now(config('app.timezone'))->format('P');
        $offset = $start->format('P');
        $bucket = $monthly
            ? "DATE_FORMAT(CONVERT_TZ(placed_at, ?, ?), '%Y-%m')"
            : 'DATE(CONVERT_TZ(placed_at, ?, ?))';

        $rows = $this->counted(Order::query(), $start, $end)
            ->selectRaw("{$bucket} as bucket, currency, COUNT(*) as orders, SUM(total_minor) as total", [$dbOffset, $offset])
            ->groupBy('bucket', 'currency')
            ->get();

        $totals = [];
        foreach ($rows as $row) {
            $totals[$row->bucket]['revenue'] = ($totals[$row->bucket]['revenue'] ?? 0) + $this->toBase((int) $row->total, $row->currency);
            $totals[$row->bucket]['orders'] = ($totals[$row->bucket]['orders'] ?? 0) + (int) $row->orders;
        }

        $points = [];
        for ($day = $start; $day->lte($end); $day = $monthly ? $day->addMonth() : $day->addDay()) {
            $key = $day->format($monthly ? 'Y-m' : 'Y-m-d');
            $points[] = [
                'key' => $key,
                'label' => $day->format($monthly ? 'M Y' : 'j M'),
                'revenue' => (int) ($totals[$key]['revenue'] ?? 0),
                'orders' => (int) ($totals[$key]['orders'] ?? 0),
            ];
        }

        return $points;
    }

    private function topProducts(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->counted(OrderItem::query()->join('orders', 'orders.id', '=', 'order_items.order_id'), $from, $to)
            ->groupBy('order_items.product_name', 'orders.currency')
            ->selectRaw('order_items.product_name as name, orders.currency, SUM(order_items.quantity) as units, SUM(order_items.line_total_minor) as total')
            ->get();

        return $rows->groupBy('name')
            ->map(fn ($group, $name) => [
                'name' => $name,
                'units' => (int) $group->sum('units'),
                'revenue' => (int) $group->sum(fn ($r) => $this->toBase((int) $r->total, $r->currency)),
            ])
            ->sortByDesc('revenue')
            ->take(5)
            ->map(fn ($p) => [...$p, 'formatted' => $this->format($p['revenue'])])
            ->values()
            ->all();
    }

    private function regions(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->counted(Order::query(), $from, $to)
            ->groupBy('region', 'currency')
            ->selectRaw('region, currency, COUNT(*) as orders, SUM(total_minor) as total')
            ->get();

        $byRegion = $rows->groupBy('region')->map(fn ($group, $region) => [
            'code' => $region,
            'label' => config("shop.regions.{$region}.label", $region),
            'orders' => (int) $group->sum('orders'),
            'revenue' => (int) $group->sum(fn ($r) => $this->toBase((int) $r->total, $r->currency)),
        ]);

        $total = max(1, $byRegion->sum('revenue'));

        return $byRegion->sortByDesc('revenue')->take(6)
            ->map(fn ($r) => [...$r, 'formatted' => $this->format($r['revenue']), 'share' => round($r['revenue'] / $total * 100)])
            ->values()
            ->all();
    }

    private function growth(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $between = fn ($query, string $column = 'created_at') => $query
            ->where($column, '>=', $from->utc())->where($column, '<', $to->utc());

        $recovered = $between(CartRecovery::where('status', 'converted')->where('reminders_sent', '>', 0), 'updated_at')
            ->get(['order_total_minor', 'currency']);

        return [
            'subscribers' => Schema::hasTable('subscribers') ? $between(DB::table('subscribers'))->count() : 0,
            'wishlist' => $between(WishlistItem::query())->count(),
            'reviews' => $between(Review::query())->count(),
            'recovered_orders' => $recovered->count(),
            'recovered_revenue' => $this->format((int) $recovered->sum(fn ($r) => $this->toBase((int) $r->order_total_minor, $r->currency))),
        ];
    }

    /* ---------- live lists (never cached) ---------- */

    private function attention(): array
    {
        $items = [
            ['key' => 'ship', 'label' => 'Paid orders to ship', 'tone' => 'warning',
                'count' => Order::where('status', 'paid')->count(), 'href' => '/admin/orders?status=paid'],
            ['key' => 'cod', 'label' => 'Cash orders to confirm', 'tone' => 'warning',
                'count' => Order::where('status', 'pending')->where('payment_method', 'cod')->count(), 'href' => '/admin/orders?status=pending'],
            ['key' => 'payments', 'label' => 'Payments needing review', 'tone' => 'danger',
                'count' => Payment::where('status', 'review')->count(), 'href' => '/admin/orders'],
            ['key' => 'reviews', 'label' => 'Reviews to moderate', 'tone' => 'info',
                'count' => Review::where('status', 'pending')->count(), 'href' => '/admin/reviews?status=pending'],
            ['key' => 'sold_out', 'label' => 'Sold-out options', 'tone' => 'danger',
                'count' => $this->activeVariants()->where('stock', '<=', 0)->count(), 'href' => '/admin/products'],
            ['key' => 'low_stock', 'label' => 'Low-stock options', 'tone' => 'warning',
                'count' => $this->activeVariants()->whereBetween('stock', [1, self::LOW_STOCK])->count(), 'href' => '/admin/products'],
        ];

        if (Schema::hasColumn('contact_messages', 'read_at')) {
            $items[] = ['key' => 'messages', 'label' => 'Unread messages', 'tone' => 'info',
                'count' => DB::table('contact_messages')->whereNull('read_at')->count(), 'href' => '/admin/messages'];
        }

        $resultsColumn = collect(['results_count', 'results'])->first(fn ($c) => Schema::hasColumn('search_logs', $c));

        if ($resultsColumn) {
            $items[] = ['key' => 'searches', 'label' => 'Searches with no results (7 days)', 'tone' => 'info',
                'count' => DB::table('search_logs')->where($resultsColumn, 0)
                    ->where('created_at', '>=', now()->subDays(7))->distinct()->count('term'),
                'href' => '/admin/search-insights'];
        }

        return $items;
    }

    private function recentOrders(): array
    {
        return Order::query()
            ->latest('placed_at')
            ->take(8)
            ->get(['number', 'email', 'status', 'payment_method', 'total_minor', 'currency', 'placed_at'])
            ->map(fn (Order $o) => [
                'number' => $o->number,
                'email' => $o->email,
                'status' => $o->status,
                'payment_method' => $o->payment_method,
                'total' => Money::of((int) $o->total_minor, $o->currency)->toArray('en_US')['formatted'],
                'placed_at' => $o->placed_at?->toIso8601String(),
            ])
            ->all();
    }

    private function lowStock(): array
    {
        return $this->activeVariants()
            ->where('stock', '<=', self::LOW_STOCK)
            ->with('product:id,name')
            ->orderBy('stock')
            ->take(6)
            ->get()
            ->map(fn (ProductVariant $v) => [
                'id' => $v->id,
                'product_id' => $v->product_id,
                'name' => $v->product->name,
                'option' => collect([$v->colour_name, $v->option_name])->filter()->join(' / ') ?: null,
                'stock' => max(0, (int) $v->stock),
            ])
            ->all();
    }

    private function activeVariants(): Builder
    {
        return ProductVariant::query()
            ->where('is_active', true)
            ->whereHas('product', fn ($q) => $q->where('is_active', true));
    }

    /* ---------- money ---------- */

    private function toBase(int $minor, ?string $currency): int
    {
        if (! $currency || $currency === $this->rates->base()) {
            return $minor;
        }

        return (int) round($minor / ($this->rates->rate($currency) ?: 1));
    }

    private function format(int $minor): string
    {
        return Money::of($minor, $this->rates->base())->toArray('en_US')['formatted'];
    }
}
