<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentAction;
use App\Payments\PaymentCheck;
use App\Payments\ReceivesWebhooks;
use Illuminate\Http\Request;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeGateway extends BaseGateway implements ReceivesWebhooks
{
    public static function fields(): array
    {
        return [
            'secret_key' => ['label' => 'Secret key', 'secret' => true, 'help' => 'Starts with sk_test_ or sk_live_.'],
            'webhook_secret' => ['label' => 'Webhook signing secret', 'secret' => true, 'required' => false, 'help' => 'Starts with whsec_. Optional, but recommended.'],
        ];
    }

    public static function currencies(): ?array
    {
        return null;
    }

    public function start(Payment $payment, Order $order): PaymentAction
    {
        $session = $this->client()->checkout->sessions->create([
            'mode' => 'payment',
            'customer_email' => $order->email,
            'client_reference_id' => $payment->uuid,
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower($payment->currency),
                    'unit_amount' => $payment->amount_minor,
                    'product_data' => ['name' => __('Order :number', ['number' => $order->number])],
                ],
            ]],
            'metadata' => ['payment' => $payment->uuid, 'order' => $order->number],
            'success_url' => route('payments.return', $payment).'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('payments.cancel', $payment),
            'expires_at' => now()->addMinutes(60)->getTimestamp(),
        ]);

        $payment->update(['reference' => $session->id]);

        return PaymentAction::redirect($session->url);
    }

    public function check(Payment $payment, array $input = []): PaymentCheck
    {
        $session = $this->client()->checkout->sessions->retrieve($payment->reference);

        if ($session->payment_status === 'paid') {
            return PaymentCheck::paid((string) $session->payment_intent, (int) $session->amount_total, $session->currency, ['session' => $session->id]);
        }

        return $session->status === 'expired' ? PaymentCheck::failed('Checkout expired') : PaymentCheck::pending();
    }

    public function webhookReference(Request $request): ?string
    {
        $event = Webhook::constructEvent(
            $request->getContent(),
            (string) $request->header('Stripe-Signature'),
            (string) $this->gateway->credential('webhook_secret'),
        );

        $relevant = ['checkout.session.completed', 'checkout.session.async_payment_succeeded',
            'checkout.session.async_payment_failed', 'checkout.session.expired'];

        return in_array($event->type, $relevant, true) ? $event->data->object->id : null;
    }

    public function test(): string
    {
        $this->client()->balance->retrieve();

        return 'connected.';
    }

    private function client(): StripeClient
    {
        return new StripeClient((string) $this->gateway->credential('secret_key'));
    }
}
