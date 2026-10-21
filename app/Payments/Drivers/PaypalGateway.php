<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentAction;
use App\Payments\PaymentCheck;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class PaypalGateway extends BaseGateway
{
    public static function fields(): array
    {
        return [
            'client_id' => ['label' => 'Client ID', 'secret' => false],
            'client_secret' => ['label' => 'Secret', 'secret' => true],
        ];
    }

    public static function currencies(): ?array
    {
        return ['USD', 'EUR', 'GBP', 'SEK', 'PLN', 'CAD', 'AUD', 'CHF', 'DKK', 'NOK', 'CZK'];
    }

    public function start(Payment $payment, Order $order): PaymentAction
    {
        $response = $this->http()
            ->withHeaders(['PayPal-Request-Id' => $payment->uuid])
            ->post('/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => $order->number,
                    'custom_id' => $payment->uuid,
                    'invoice_id' => $payment->uuid,
                    'amount' => ['currency_code' => $payment->currency, 'value' => $this->decimal($payment->amount_minor)],
                ]],
                'payment_source' => ['paypal' => ['experience_context' => [
                    'brand_name' => config('app.name'),
                    'user_action' => 'PAY_NOW',
                    'shipping_preference' => 'NO_SHIPPING',
                    'return_url' => route('payments.return', $payment),
                    'cancel_url' => route('payments.cancel', $payment),
                ]]],
            ])
            ->throw()
            ->json();

        $payment->update(['reference' => $response['id']]);

        $links = collect($response['links'] ?? []);
        $link = $links->firstWhere('rel', 'payer-action') ?? $links->firstWhere('rel', 'approve');

        if (! $link) {
            throw new RuntimeException('PayPal did not return an approval link.');
        }

        return PaymentAction::redirect($link['href']);
    }

    public function check(Payment $payment, array $input = []): PaymentCheck
    {
        $order = $this->http()->get("/v2/checkout/orders/{$payment->reference}")->throw()->json();

        // The customer approved on PayPal's page: now take the money.
        if (($order['status'] ?? null) === 'APPROVED') {
            $order = $this->http()
                ->withHeaders(['PayPal-Request-Id' => $payment->uuid.'-capture'])
                ->withBody('{}', 'application/json')
                ->post("/v2/checkout/orders/{$payment->reference}/capture")
                ->throw()
                ->json();
        }

        $capture = $order['purchase_units'][0]['payments']['captures'][0] ?? null;

        if (($order['status'] ?? null) === 'COMPLETED' && ($capture['status'] ?? null) === 'COMPLETED') {
            return PaymentCheck::paid($capture['id'], $this->toMinor($capture['amount']['value']), $capture['amount']['currency_code'], ['order' => $order['id']]);
        }

        if (($order['status'] ?? null) === 'VOIDED' || ($capture['status'] ?? null) === 'DECLINED') {
            return PaymentCheck::failed('PayPal: '.($capture['status'] ?? $order['status']));
        }

        return PaymentCheck::pending();
    }

    public function test(): string
    {
        $this->token();

        return 'connected.';
    }

    private function base(): string
    {
        return $this->gateway->isLive() ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    }

    private function token(): string
    {
        $key = 'paypal.token.'.$this->gateway->mode.'.'.sha1((string) $this->gateway->credential('client_id'));

        return Cache::remember($key, now()->addMinutes(50), fn () => Http::asForm()
            ->withBasicAuth((string) $this->gateway->credential('client_id'), (string) $this->gateway->credential('client_secret'))
            ->post($this->base().'/v1/oauth2/token', ['grant_type' => 'client_credentials'])
            ->throw()
            ->json('access_token'));
    }

    private function http(): PendingRequest
    {
        return Http::withToken($this->token())->acceptJson()->baseUrl($this->base())->timeout(20);
    }
}
