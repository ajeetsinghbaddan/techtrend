<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use App\Models\WishlistItem;
use App\Support\ExchangeRates;
use App\Support\Money;
use App\Support\OrderPresenter;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

class CustomerController extends Controller
{
    private const SEGMENTS = ['all', 'buyers', 'repeat', 'no_orders', 'unverified', 'blocked'];
    private const SORTS = ['newest', 'oldest', 'name', 'orders', 'last_order', 'last_login'];

    /** Orders that don't count towards what a customer has spent. */
    private const NOT_SPENT = ['cancelled', 'refunded'];

    public function __construct(private readonly ExchangeRates $rates)
    {
    }

    public function index(Request $request)
    {
        $filters = $this->filters($request);

        $customers = $this->filtered($filters)
            ->withCount('orders')
            ->withMax('orders as last_order_at', 'placed_at')
            ->with(['addresses' => fn ($q) => $q->where('is_default_shipping', true)])
            ->tap(fn (Builder $q) => $this->sort($q, $filters['sort']))
            ->paginate(25)
            ->withQueryString();

        $spent = $this->spentFor($customers->pluck('id')->all());

        $customers->through(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'verified' => $u->email_verified_at !== null,
            'blocked' => $u->blocked_at !== null,
            'country' => $u->addresses->first()?->country ?? $u->preferred_region,
            'joined_at' => $u->created_at?->toIso8601String(),
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'orders_count' => $u->orders_count,
            'last_order_at' => $u->last_order_at ? Date::parse($u->last_order_at)->toIso8601String() : null,
            'spent' => $spent[$u->id] ?? null,
        ]);

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'filters' => $filters,
            'stats' => $this->stats(),
            'baseCurrency' => $this->rates->base(),
        ]);
    }

    public function show(User $customer)
    {
        $this->guard($customer);

        $orders = Order::forCustomer($customer)->with('items')->latest('id')->get();
        $counted = $orders->whereNotIn('status', self::NOT_SPENT);
        $spentMinor = $counted->sum(fn (Order $o) => $this->toBase((int) $o->total_minor, $o->currency));

        return Inertia::render('admin/customers/show', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'verified' => $customer->email_verified_at !== null,
                'blocked_at' => $customer->blocked_at?->toIso8601String(),
                'joined_at' => $customer->created_at?->toIso8601String(),
                'last_login_at' => $customer->last_login_at?->toIso8601String(),
                'preferred_locale' => $customer->preferred_locale,
                'preferred_region' => $customer->preferred_region,
                'admin_notes' => $customer->admin_notes,
                // Only whether it's on: the secret and recovery codes never leave the server.
                'two_factor' => $customer->two_factor_confirmed_at !== null,
            ],
            'stats' => [
                'orders' => $orders->count(),
                'spent' => $this->format($spentMinor),
                'average' => $counted->isNotEmpty() ? $this->format((int) round($spentMinor / $counted->count())) : null,
                'first_order_at' => $orders->last()?->placed_at?->toIso8601String(),
                'last_order_at' => $orders->first()?->placed_at?->toIso8601String(),
                'reviews' => Review::where('user_id', $customer->id)->count(),
                'wishlist' => WishlistItem::where('user_id', $customer->id)->count(),
            ],
            'orders' => $orders->take(25)->map(fn (Order $o) => [
                ...OrderPresenter::summary($o),
                'is_guest' => $o->user_id === null,
            ])->values(),
            'addresses' => $customer->addresses()
                ->orderByDesc('is_default_shipping')->orderByDesc('is_default_billing')->get()
                ->map(fn (Address $a) => $a->present()),
            'reviews' => Review::where('user_id', $customer->id)
                ->with('product:id,name,slug')->latest()->take(10)->get()
                ->map(fn (Review $r) => [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'title' => $r->title,
                    'status' => $r->status,
                    'product' => $r->product?->only('name', 'slug'),
                    'created_at' => $r->created_at?->toIso8601String(),
                ]),
            'wishlist' => WishlistItem::where('user_id', $customer->id)
                ->with('product:id,name,slug')->latest()->take(12)->get()
                ->filter(fn (WishlistItem $i) => $i->product)
                ->map(fn (WishlistItem $i) => $i->product->only('id', 'name', 'slug'))
                ->values(),
            'baseCurrency' => $this->rates->base(),
        ]);
    }

    public function updateNotes(Request $request, User $customer)
    {
        $this->guard($customer);

        $data = $request->validate(['admin_notes' => ['nullable', 'string', 'max:5000']]);
        $customer->forceFill($data)->save();

        return back()->with('admin_notice', 'Notes saved.');
    }

    public function toggleBlock(User $customer)
    {
        $this->guard($customer);

        $blocking = $customer->blocked_at === null;
        $customer->forceFill(['blocked_at' => $blocking ? now() : null])->save();

        return back()->with('admin_notice', $blocking
            ? 'Account suspended. The customer has been logged out.'
            : 'Account reactivated.');
    }

    public function sendPasswordReset(User $customer)
    {
        $this->guard($customer);

        $status = Password::sendResetLink(['email' => $customer->email]);

        return back()->with('admin_notice', $status === Password::RESET_LINK_SENT
            ? "Password reset link sent to {$customer->email}."
            : __($status));
    }

    public function resendVerification(User $customer)
    {
        $this->guard($customer);

        if ($customer->hasVerifiedEmail()) {
            return back()->with('admin_notice', 'This email address is already confirmed.');
        }

        if ($customer instanceof MustVerifyEmail) {
            $customer->sendEmailVerificationNotification();
        }

        return back()->with('admin_notice', "Confirmation link sent to {$customer->email}.");
    }

    /** For a customer who lost both their phone and their recovery codes (check it's really them first). */
    public function resetTwoFactor(User $customer)
    {
        $this->guard($customer);

        if ($customer->two_factor_secret === null) {
            return back()->with('admin_notice', 'Two-factor authentication is already off for this customer.');
        }

        $customer->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return back()->with('admin_notice', "Two-factor authentication turned off for {$customer->email}. They can set it up again from their account.");
    }

    public function export(Request $request)
    {
        $filters = $this->filters($request);
        $query = $this->filtered($filters)
            ->withCount('orders')
            ->withMax('orders as last_order_at', 'placed_at');

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Email', 'Phone', 'Email confirmed', 'Suspended', 'Joined', 'Last login', 'Orders', 'Last order', 'Region']);

            $query->chunkById(500, function ($users) use ($out) {
                foreach ($users as $u) {
                    fputcsv($out, array_map([$this, 'csvSafe'], [
                        $u->name,
                        $u->email,
                        $u->phone,
                        $u->email_verified_at ? 'yes' : 'no',
                        $u->blocked_at ? 'yes' : 'no',
                        $u->created_at?->toDateString(),
                        $u->last_login_at?->toDateString(),
                        $u->orders_count,
                        $u->last_order_at ? Date::parse($u->last_order_at)->toDateString() : '',
                        $u->preferred_region,
                    ]));
                }
            });

            fclose($out);
        }, 'customers-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /* ---------- helpers ---------- */

    /** Admin accounts are managed from the terminal, never from this page. */
    private function guard(User $customer): void
    {
        abort_if($customer->isSuperAdmin(), 404);
    }

    private function filters(Request $request): array
    {
        $data = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:80'],
            'segment' => ['sometimes', 'in:'.implode(',', self::SEGMENTS)],
            'sort' => ['sometimes', 'in:'.implode(',', self::SORTS)],
        ]);

        return [
            'q' => $data['q'] ?? '',
            'segment' => $data['segment'] ?? 'all',
            'sort' => $data['sort'] ?? 'newest',
        ];
    }

    private function filtered(array $filters): Builder
    {
        $query = User::query()->where('is_super_admin', false);

        if ($filters['q'] !== '') {
            $like = '%'.addcslashes($filters['q'], '%_\\').'%';
            $query->where(fn (Builder $w) => $w
                ->where('name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('phone', 'like', $like));
        }

        match ($filters['segment']) {
            'buyers' => $query->has('orders'),
            'repeat' => $query->has('orders', '>=', 2),
            'no_orders' => $query->doesntHave('orders'),
            'unverified' => $query->whereNull('email_verified_at'),
            'blocked' => $query->whereNotNull('blocked_at'),
            default => $query,
        };

        return $query;
    }

    private function sort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->oldest('id'),
            'name' => $query->orderBy('name'),
            'orders' => $query->orderByDesc('orders_count')->latest('id'),
            'last_order' => $query->orderByDesc('last_order_at')->latest('id'),
            'last_login' => $query->orderByDesc('last_login_at')->latest('id'),
            default => $query->latest('id'),
        };
    }

    private function stats(): array
    {
        $customers = fn () => User::where('is_super_admin', false);

        return [
            'total' => $customers()->count(),
            'new_30' => $customers()->where('created_at', '>=', now()->subDays(30))->count(),
            'buyers' => $customers()->has('orders')->count(),
            'repeat' => $customers()->has('orders', '>=', 2)->count(),
            'unverified' => $customers()->whereNull('email_verified_at')->count(),
            'blocked' => $customers()->whereNotNull('blocked_at')->count(),
            'guest_only' => Order::whereNull('user_id')
                ->whereNotIn('email', User::select('email'))
                ->distinct()->count('email'),
            'signups' => $this->signups($customers()),
        ];
    }

    /** New customers per week for the last 12 weeks, oldest first. */
    private function signups(Builder $customers): array
    {
        $start = now()->startOfWeek()->subWeeks(11);
        $dates = $customers->where('created_at', '>=', $start)->pluck('created_at');

        return collect(range(0, 11))->map(function (int $i) use ($start, $dates) {
            $from = $start->copy()->addWeeks($i);
            $to = $from->copy()->addWeek();

            return [
                'week' => $from->toDateString(),
                'count' => $dates->filter(fn ($d) => $d >= $from && $d < $to)->count(),
            ];
        })->all();
    }

    /** Total spent per customer on this page, converted to the base currency. */
    private function spentFor(array $ids): array
    {
        if (! $ids) {
            return [];
        }

        $totals = [];

        Order::whereIn('user_id', $ids)
            ->whereNotIn('status', self::NOT_SPENT)
            ->groupBy('user_id', 'currency')
            ->selectRaw('user_id, currency, SUM(total_minor) as total')
            ->get()
            ->each(function ($row) use (&$totals) {
                $totals[$row->user_id] = ($totals[$row->user_id] ?? 0) + $this->toBase((int) $row->total, $row->currency);
            });

        return array_map(fn (int $minor) => $this->format($minor), $totals);
    }

    private function toBase(int $minor, string $currency): int
    {
        if ($currency === $this->rates->base()) {
            return $minor;
        }

        return (int) round($minor / ($this->rates->rate($currency) ?: 1));
    }

    private function format(int $minor): string
    {
        return Money::of($minor, $this->rates->base())->toArray('en_US')['formatted'];
    }

    /** Stop spreadsheet apps treating a value as a formula (CSV injection). */
    private function csvSafe(mixed $value): string
    {
        $value = (string) ($value ?? '');

        return $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }
}
