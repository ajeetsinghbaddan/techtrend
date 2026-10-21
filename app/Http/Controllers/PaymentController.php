<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentManager;
use App\Support\OrderPresenter;
use App\Support\Storefront;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentManager $payments)
    {
    }

    /** "Complete your payment": shown after a failed, cancelled or unfinished attempt. */
    public function show(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);

        if ($order->status !== 'pending' || $order->paid_at || $order->payment_method === 'cod') {
            return redirect()->route('checkout.confirmation', $order->number);
        }

        $order->loadMissing('items');
        $latest = $order->payments()->latest('id')->first();

        return Storefront::render('shop/pay', [
            'order' => [
                ...OrderPresenter::summary($order),
                'payment_method' => $order->payment_method,
            ],
            'methods' => $this->payments->options($order->region, $order->currency, (int) $order->total_minor),
            'lastAttempt' => $latest ? ['uuid' => $latest->uuid, 'gateway' => $latest->gateway, 'status' => $latest->status] : null,
            'expiresAt' => $order->placed_at?->copy()->addMinutes(PaymentManager::UNPAID_MINUTES)->toIso8601String(),
        ]);
    }

    /** Pay (again), with the chosen method. */
    public function start(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);
        abort_unless($order->status === 'pending' && ! $order->paid_at, 404);

        $keys = $this->payments->options($order->region, $order->currency, (int) $order->total_minor)->pluck('key')->all();
        $data = $request->validate(['gateway' => ['required', Rule::in($keys)]]);

        $order->update(['payment_method' => $data['gateway']]);
        $payment = $this->payments->begin($order, $data['gateway']);

        if ($payment->gateway === 'cod') {
            $this->payments->sendOrderEmails($order);

            return redirect()->route('checkout.confirmation', $order->number);
        }

        return $this->payments->respond($payment);
    }

    /** Where Stripe and PayPal send the customer back. */
    public function return(Request $request, Payment $payment)
    {
        $this->authorizeOrder($request, $payment->order);

        return $this->afterCheck($this->safeRefresh($payment));
    }

    /** The customer backed out on the provider's page. */
    public function cancel(Request $request, Payment $payment)
    {
        $this->authorizeOrder($request, $payment->order);

        return redirect()->route('payments.show', $payment->order->number)
            ->with('payment_notice', __('Payment cancelled. You can try again, or choose another method.'));
    }

    /** Razorpay and Paytm report back from the browser; we still ask the provider ourselves. */
    public function verify(Request $request, Payment $payment)
    {
        $this->authorizeOrder($request, $payment->order);

        $input = $request->validate([
            'razorpay_payment_id' => ['sometimes', 'string', 'max:100'],
            'razorpay_signature' => ['sometimes', 'string', 'max:200'],
        ]);

        return $this->afterCheck($this->safeRefresh($payment, $input));
    }

    private function safeRefresh(Payment $payment, array $input = []): Payment
    {
        try {
            return $this->payments->refresh($payment, $input);
        } catch (Throwable $e) {
            report($e);

            return $payment;
        }
    }

    private function afterCheck(Payment $payment)
    {
        $number = $payment->order->number;

        return match ($payment->status) {
            'paid' => redirect()->route('checkout.confirmation', $number),
            'review' => redirect()->route('checkout.confirmation', $number)
                ->with('payment_notice', __('We received your payment and are checking it. We will email you shortly.')),
            'failed' => redirect()->route('payments.show', $number)
                ->with('payment_notice', __('The payment did not go through, and you have not been charged. Please try again, or choose another method.')),
            default => redirect()->route('payments.show', $number)
                ->with('payment_notice', __('We are still waiting for confirmation from the payment provider. If you completed the payment, check again in a moment.')),
        };
    }

    /** Only the buyer: their account, or the browser session that placed the order. */
    private function authorizeOrder(Request $request, Order $order): void
    {
        $isOwner = $request->user() && $order->user_id === $request->user()->id;
        $isRecent = $request->session()->get('recent_order') === $order->number;

        abort_unless($isOwner || $isRecent, 404);
    }
}
