<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentAction;
use App\Payments\PaymentCheck;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use paytm\paytmchecksum\PaytmChecksum;
use RuntimeException;

class PaytmGateway extends BaseGateway
{
    public static function fields(): array
    {
        return [
            'merchant_id' => ['label' => 'Merchant ID (MID)', 'secret' => false],
            'merchant_key' => ['label' => 'Merchant key', 'secret' => true],
            'website_name' => ['label' => 'Website name', 'secret' => false, 'required' => false,
                'help' => 'Leave empty to use WEBSTAGING in test mode and DEFAULT in live mode.'],
        ];
    }

    public static function currencies(): ?array
    {
        return ['INR'];
    }

    public function start(Payment $payment, Order $order): PaymentAction
    {
        // A fresh Paytm order id for every attempt, so a retry never clashes with a failed one.
        $paytmOrderId = $order->number.'-'.Str::upper(Str::random(4));

        $token = $this->initiate($paytmOrderId, $payment->amount_minor, $order->user_id ? 'USER_'.$order->user_id : 'GUEST_'.$payment->id, $order->email);

        $payment->update(['reference' => $paytmOrderId]);

        return PaymentAction::client([
            'provider' => 'paytm',
            'script' => $this->host().'/merchantpgpui/checkoutjs/merchants/'.$this->mid().'.js',
            'order_id' => $paytmOrderId,
            'token' => $token,
            'amount' => $this->decimal($payment->amount_minor),
            'verify_url' => route('payments.verify', $payment),
        ]);
    }

    public function check(Payment $payment, array $input = []): PaymentCheck
    {
        $body = $this->call('/v3/order/status', ['mid' => $this->mid(), 'orderId' => $payment->reference]);
        $status = $body['resultInfo']['resultStatus'] ?? null;

        return match ($status) {
            'TXN_SUCCESS' => PaymentCheck::paid((string) $body['txnId'], $this->toMinor($body['txnAmount']), 'INR', ['mode' => $body['paymentMode'] ?? null]),
            'TXN_FAILURE' => PaymentCheck::failed($body['resultInfo']['resultMsg'] ?? 'Paytm: failed'),
            default => PaymentCheck::pending(),
        };
    }

    public function test(): string
    {
        $this->initiate('TEST-'.Str::upper(Str::random(10)), 100, 'ADMIN_TEST', null);

        return 'connected (a ₹1 test transaction was started, not charged).';
    }

    private function initiate(string $paytmOrderId, int $amountMinor, string $customerId, ?string $email): string
    {
        $body = $this->call("/theia/api/v1/initiateTransaction?mid={$this->mid()}&orderId={$paytmOrderId}", [
            'requestType' => 'Payment',
            'mid' => $this->mid(),
            'websiteName' => $this->gateway->credential('website_name') ?: ($this->gateway->isLive() ? 'DEFAULT' : 'WEBSTAGING'),
            'orderId' => $paytmOrderId,
            'callbackUrl' => route('payments.paytm.callback'),
            'txnAmount' => ['value' => $this->decimal($amountMinor), 'currency' => 'INR'],
            'userInfo' => array_filter(['custId' => $customerId, 'email' => $email]),
        ]);

        if (($body['resultInfo']['resultStatus'] ?? null) !== 'S' || empty($body['txnToken'])) {
            throw new RuntimeException('Paytm: '.($body['resultInfo']['resultMsg'] ?? 'could not start the transaction'));
        }

        return $body['txnToken'];
    }

    /** Sign the body with the merchant key and post it. Returns the response's "body". */
    private function call(string $path, array $body): array
    {
        $json = json_encode($body, JSON_UNESCAPED_SLASHES);
        $signature = PaytmChecksum::generateSignature($json, (string) $this->gateway->credential('merchant_key'));

        // Sent as a raw string: the signature covers this exact text, so it must not be re-encoded.
        $payload = '{"body":'.$json.',"head":{"signature":'.json_encode($signature).'}}';

        return Http::withBody($payload, 'application/json')
            ->acceptJson()
            ->timeout(20)
            ->post($this->host().$path)
            ->throw()
            ->json('body') ?? [];
    }

    private function host(): string
    {
        return $this->gateway->isLive() ? 'https://secure.paytmpayments.com' : 'https://securestage.paytmpayments.com';
    }

    private function mid(): string
    {
        return (string) $this->gateway->credential('merchant_id');
    }
}
