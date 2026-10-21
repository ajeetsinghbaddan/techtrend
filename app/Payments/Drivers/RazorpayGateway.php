<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentAction;
use App\Payments\PaymentCheck;
use App\Payments\ReceivesWebhooks;
use Illuminate\Http\Request;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

class RazorpayGateway extends BaseGateway implements ReceivesWebhooks
{
    public static function fields(): array
    {
        return [
            'key_id' => ['label' => 'Key ID', 'secret' => false, 'help' => 'Starts with rzp_test_ or rzp_live_.'],
            'key_secret' => ['label' => 'Key secret', 'secret' => true],
            'webhook_secret' => ['label' => 'Webhook secret', 'secret' => true, 'required' => false, 'help' => 'The secret you set when creating the webhook. Optional, but recommended.'],
        ];
    }

    public static function currencies(): ?array
    {
        return ['INR'];
    }

    public function start(Payment $payment, Order $order): PaymentAction
    {
        $razorpayOrder = $this->api()->order->create([
            'receipt' => $order->number,
            'amount' => $payment->amount_minor,
            'currency' => $payment->currency,
            'notes' => ['payment' => $payment->uuid, 'order' => $order->number],
        ]);

        $payment->update(['reference' => $razorpayOrder->id]);

        return PaymentAction::client([
            'provider' => 'razorpay',
            'key' => $this->gateway->credential('key_id'),
            'order_id' => $razorpayOrder->id,
            'amount' => $payment->amount_minor,
            'currency' => $payment->currency,
            'name' => config('app.name'),
            'description' => __('Order :number', ['number' => $order->number]),
            'prefill' => [
                'name' => $this->customerName($order),
                'email' => $order->email,
                'contact' => $order->shipping_address['phone'] ?? '',
            ],
            'verify_url' => route('payments.verify', $payment),
        ]);
    }

    public function check(Payment $payment, array $input = []): PaymentCheck
    {
        $api = $this->api();

        // The browser's signature is checked, but only as an early warning: the API decides.
        if (isset($input['razorpay_payment_id'], $input['razorpay_signature'])) {
            try {
                $api->utility->verifyPaymentSignature([
                    'razorpay_order_id' => $payment->reference,
                    'razorpay_payment_id' => $input['razorpay_payment_id'],
                    'razorpay_signature' => $input['razorpay_signature'],
                ]);
            } catch (SignatureVerificationError $e) {
                report($e);
            }
        }

        foreach ($api->order->fetch($payment->reference)->payments()->items ?? [] as $item) {
            if ($item->status === 'authorized') {
                $item = $api->payment->fetch($item->id)->capture(['amount' => $item->amount, 'currency' => $item->currency]);
            }

            if ($item->status === 'captured') {
                return PaymentCheck::paid($item->id, (int) $item->amount, $item->currency, ['method' => $item->method ?? null]);
            }
        }

        return PaymentCheck::pending();
    }

    public function webhookReference(Request $request): ?string
    {
        $this->api()->utility->verifyWebhookSignature(
            $request->getContent(),
            (string) $request->header('X-Razorpay-Signature'),
            (string) $this->gateway->credential('webhook_secret'),
        );

        $payload = json_decode($request->getContent(), true);

        return $payload['payload']['payment']['entity']['order_id']
            ?? $payload['payload']['order']['entity']['id']
            ?? null;
    }

    public function test(): string
    {
        $this->api()->order->all(['count' => 1]);

        return 'connected.';
    }

    private function api(): Api
    {
        return new Api((string) $this->gateway->credential('key_id'), (string) $this->gateway->credential('key_secret'));
    }
}
