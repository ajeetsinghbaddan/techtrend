<?php

namespace App\Payments;

use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Support\ExchangeRates;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class PaymentManager
{
    /** How long an online order waits for payment before it's cancelled and restocked. */
    public const UNPAID_MINUTES = 60;

    public function __construct(private readonly ExchangeRates $rates)
    {
    }

    /** @return Collection<int, PaymentGateway> methods a shopper can choose right now */
    public function available(string $region, string $currency, int $totalMinor): Collection
    {
        $baseTotal = $currency === $this->rates->base()
            ? $totalMinor
            : (int) round($totalMinor / ($this->rates->rate($currency) ?: 1));

        return PaymentGateway::where('enabled', true)
            ->orderBy('position')
            ->get()
            ->filter(fn (PaymentGateway $g) => $g->isConfigured() && $g->supports($region, $currency, $baseTotal))
            ->values();
    }

    /** The same, in the shape checkout shows. */
    public function options(string $region, string $currency, int $totalMinor): Collection
    {
        return $this->available($region, $currency, $totalMinor)
            ->map(fn (PaymentGateway $g) => ['key' => $g->key, 'label' => $g->name, 'description' => $g->description])
            ->values();
    }

    /** Record a new attempt to pay for this order. */
    public function begin(Order $order, string $gatewayKey): Payment
    {
        return $order->payments()->create([
            'gateway' => $gatewayKey,
            'status' => 'pending',
            'amount_minor' => (int) $order->total_minor,
            'currency' => $order->currency,
        ]);
    }

    /** Start the attempt at the provider and send the shopper where they need to go. */
    public function respond(Payment $payment): Response
    {
        $order = $payment->order;

        try {
            $action = $this->gateway($payment->gateway)->driver()->start($payment, $order);
        } catch (Throwable $e) {
            report($e);
            $payment->update(['status' => 'failed', 'failure_reason' => Str::limit('Could not start: '.$e->getMessage(), 180)]);

            return redirect()->route('payments.show', $order->number)
                ->with('payment_notice', __('We could not reach the payment provider. Please try again, or choose another method.'));
        }

        return match ($action->type) {
            'redirect' => Inertia::location($action->url),
            'client' => redirect()->route('payments.show', $order->number)->with('payment_action', $action->data),
            default => redirect()->route('checkout.confirmation', $order->number),
        };
    }

    /** Ask the provider about this payment and record the answer. Safe to call any number of times. */
    public function refresh(Payment $payment, array $input = []): Payment
    {
        if ($payment->isFinal() || $payment->gateway === 'cod' || ! $payment->reference) {
            return $payment;
        }

        // Outside the transaction: we don't hold a database lock while waiting on the internet.
        $check = $this->gateway($payment->gateway)->driver()->check($payment, $input);

        return DB::transaction(function () use ($payment, $check) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->isFinal()) {
                return $payment; // another request got here first
            }

            if ($check->status === PaymentCheck::PAID) {
                $this->recordPaid($payment, $check);
            } elseif ($check->status === PaymentCheck::FAILED) {
                $payment->update([
                    'status' => 'failed',
                    'failure_reason' => Str::limit((string) $check->reason, 180),
                    'payload' => $check->raw ?: null,
                ]);
            }

            return $payment->fresh();
        });
    }

    /** Cash collected: the admin confirms it by hand. */
    public function markCashPaid(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $payment = $order->payments()->where('gateway', 'cod')->latest('id')->lockForUpdate()->first()
                ?? $this->begin($order, 'cod');

            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            $order->forceFill(['paid_at' => now()])->save();
        });
    }

    /** Cancel an online order whose payment never arrived, and put its stock back. */
    public function cancelUnpaid(Order $order): bool
    {
        return DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->with('items')->firstOrFail();

            if ($order->status !== 'pending' || $order->paid_at || $order->payments()->whereIn('status', ['paid', 'review'])->exists()) {
                return false;
            }

            $order->update(['status' => 'cancelled']);
            $order->payments()->where('status', 'pending')->update(['status' => 'cancelled']);

            foreach ($order->items as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::whereKey($item->product_variant_id)->increment('stock', $item->quantity);
                }
            }

            return true;
        });
    }

    /** Confirmation to the customer in their language; the shop's copy in the admin's language. */
    public function sendOrderEmails(Order $order): void
    {
        try {
            // The Order is the recipient, so Laravel uses Order::preferredLocale().
            Mail::to($order)->send(new OrderPlaced($order));

            $notify = Setting::newsletter()['notify_email'] ?? config('mail.from.address');

            if ($notify) {
                Mail::to($notify)
                    ->locale(config('app.locale'))
                    ->send(new OrderPlaced($order, forShop: true));
            }
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function recordPaid(Payment $payment, PaymentCheck $check): void
    {
        $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();
        $details = ['transaction_id' => $check->transactionId, 'payload' => $check->raw ?: null, 'paid_at' => now()];

        $amountMatches = $check->amountMinor === (int) $payment->amount_minor
            && $check->currency === $payment->currency;

        if (! $amountMatches || $order->status === 'cancelled' || $order->paid_at) {
            $reason = match (true) {
                ! $amountMatches => "Amount mismatch: received {$check->amountMinor} {$check->currency}",
                $order->paid_at !== null => 'The order was already paid',
                default => 'Paid after the order was cancelled',
            };

            $payment->update([...$details, 'status' => 'review', 'failure_reason' => $reason]);
            report(new RuntimeException("Payment {$payment->uuid} needs review: {$reason}"));

            return;
        }

        $payment->update([...$details, 'status' => 'paid']);
        $order->forceFill(['status' => 'paid', 'paid_at' => now()])->save();

        // Only once the transaction has saved, so an email is never sent for a payment that rolled back.
        DB::afterCommit(fn () => $this->sendOrderEmails($order));
    }

    private function gateway(string $key): PaymentGateway
    {
        return PaymentGateway::where('key', $key)->firstOrFail();
    }
}
