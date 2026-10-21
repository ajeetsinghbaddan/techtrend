<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\OrderShipped;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Payments\PaymentManager;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Throwable;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['sometimes', 'string', 'max:80'],
            'status' => ['sometimes', 'string', Rule::in(Order::STATUSES)],
        ]);

        $orders = Order::query()
            ->withCount('items')
            ->when($filters['q'] ?? null, function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';

                $q->where(fn ($w) => $w->where('number', 'like', $like)->orWhere('email', 'like', $like));
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest('placed_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Order $o) => [
                'number' => $o->number,
                'email' => $o->email,
                'status' => $o->status,
                'items_count' => $o->items_count,
                'total' => $o->money('total')->toArray($o->locale),
                'region' => $o->region,
                'placed_at' => $o->placed_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/orders/index', [
            'orders' => $orders,
            'filters' => $filters,
            'statuses' => Order::STATUSES,
            'counts' => Order::selectRaw('status, COUNT(*) as total')
                ->groupBy('status')->pluck('total', 'status'),
            'revenue' => $this->revenue(),
        ]);
    }

    public function show(Order $order)
    {
        $order->load('items', 'user:id,name,email');

        return Inertia::render('admin/orders/show', [
            'order' => [
                ...$order->only(['number', 'email', 'status', 'currency', 'region', 'locale', 'language',
                    'shipping_method', 'payment_method', 'tracking_number', 'tracking_url',
                    'shipping_address', 'billing_address', 'notes', 'admin_notes', 'tax_rate']),
                // The language this customer's emails are sent in.
                'email_language' => $order->preferredLocale(),
                'placed_at' => $order->placed_at?->toIso8601String(),
                'shipped_at' => $order->shipped_at?->toIso8601String(),
                'totals' => $order->totals(),
                'customer' => $order->user?->only('name', 'email'),
                'items' => $order->items->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->product_name,
                    'variant_label' => $i->variant_label,
                    'sku' => $i->sku,
                    'image_url' => $i->image_url,
                    'quantity' => $i->quantity,
                    'unit_price' => Money::of($i->unit_price_minor, $order->currency)->toArray($order->locale),
                    'line_total' => Money::of($i->line_total_minor, $order->currency)->toArray($order->locale),
                ]),
            ],
            'statuses' => Order::STATUSES,
            'payments' => $order->payments()->latest('id')->get()->map(fn ($p) => [
                'uuid' => $p->uuid,
                'gateway' => $p->gateway,
                'status' => $p->status,
                'amount' => Money::of((int) $p->amount_minor, $p->currency)->toArray($order->locale)['formatted'],
                'reference' => $p->reference,
                'transaction_id' => $p->transaction_id,
                'failure_reason' => $p->failure_reason,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(),
            ]),
            'paidAt' => $order->paid_at?->toIso8601String(),
        ]);
    }

    public function update(Request $request, Order $order)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'tracking_number' => ['nullable', 'string', 'max:60'],
            'tracking_url' => ['nullable', 'string', 'max:255', 'regex:/^https:\/\//'],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
            'notify' => ['boolean'],
        ]);

        $wasShipped = $order->status === 'shipped';
        $wasCancelled = in_array($order->status, ['cancelled', 'refunded'], true);
        $nowCancelled = in_array($data['status'], ['cancelled', 'refunded'], true);

        DB::transaction(function () use ($order, $data, $wasCancelled, $nowCancelled) {
            // Put stock back when an order is cancelled, take it again if un-cancelled.
            if (! $wasCancelled && $nowCancelled) {
                $this->restock($order, 1);
            } elseif ($wasCancelled && ! $nowCancelled) {
                $this->restock($order, -1);
            }

            // "notify" is an instruction for this request, not something stored on the order.
            $order->fill([
                ...Arr::except($data, 'notify'),
                'shipped_at' => $data['status'] === 'shipped' ? ($order->shipped_at ?? now()) : $order->shipped_at,
                'cancelled_at' => $nowCancelled ? ($order->cancelled_at ?? now()) : null,
            ]);
            $order->save();
        });

        if ($request->boolean('notify') && ! $wasShipped && $data['status'] === 'shipped') {
            $this->sendShippedEmail($order);
        }

        return back();
    }

    public function markPaid(Order $order, PaymentManager $payments)
    {
        abort_unless($order->payment_method === 'cod' && ! $order->paid_at, 404);

        $payments->markCashPaid($order);

        return back()->with('admin_notice', "Order {$order->number} marked as paid.");
    }

    /* ---------- helpers ---------- */

    /**
     * Tell the customer their order is on its way, in their own language.
     * The order is the recipient, so Laravel uses Order::preferredLocale(),
     * not the admin's language, while writing the email.
     */
    private function sendShippedEmail(Order $order): void
    {
        try {
            Mail::to($order)->send(new OrderShipped($order));
        } catch (Throwable $e) {
            // The status is already saved; a mail problem must not show the admin an error page.
            report($e);
        }
    }

    private function restock(Order $order, int $sign): void
    {
        foreach ($order->items as $item) {
            if (! $item->product_variant_id) {
                continue;
            }

            ProductVariant::whereKey($item->product_variant_id)
                ->lockForUpdate()
                ->increment('stock', $sign * $item->quantity);
        }
    }

    private function revenue(): array
    {
        $paid = Order::whereIn('status', ['paid', 'shipped', 'delivered']);

        return [
            'orders_30d' => (clone $paid)->where('placed_at', '>=', now()->subDays(30))->count(),
            'pending' => Order::where('status', 'pending')->count(),
        ];
    }
}
