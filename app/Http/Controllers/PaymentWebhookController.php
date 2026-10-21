<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Payments\PaymentManager;
use App\Payments\ReceivesWebhooks;
use Illuminate\Http\Request;
use Throwable;

class PaymentWebhookController extends Controller
{
    public function __construct(private readonly PaymentManager $payments)
    {
    }

    /** Stripe and Razorpay tell us about payments directly, server to server. */
    public function handle(Request $request, string $gateway)
    {
        $model = PaymentGateway::where('key', $gateway)->where('enabled', true)->firstOrFail();
        $driver = $model->driver();

        abort_unless($driver instanceof ReceivesWebhooks && filled($model->credential('webhook_secret')), 404);

        try {
            $reference = $driver->webhookReference($request);
        } catch (Throwable $e) {
            return response('Invalid signature', 400);
        }

        $payment = $reference
            ? Payment::where('gateway', $gateway)->where('reference', $reference)->first()
            : null;

        if ($payment) {
            $this->payments->refresh($payment);
        }

        return response()->noContent();
    }

    /** Paytm may post the result here if its window redirects instead of reporting in the page. */
    public function paytmCallback(Request $request)
    {
        $payment = Payment::where('gateway', 'paytm')->where('reference', (string) $request->input('ORDERID'))->first();

        if (! $payment) {
            return redirect('/');
        }

        try {
            $payment = $this->payments->refresh($payment);
        } catch (Throwable $e) {
            report($e);
        }

        return redirect()->route($payment->status === 'paid' ? 'checkout.confirmation' : 'payments.show', $payment->order->number);
    }
}
