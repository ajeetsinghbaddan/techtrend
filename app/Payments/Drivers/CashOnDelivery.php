<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentAction;
use App\Payments\PaymentCheck;

class CashOnDelivery extends BaseGateway
{
    public static function fields(): array
    {
        return [];
    }

    public static function currencies(): ?array
    {
        return null;
    }

    public function start(Payment $payment, Order $order): PaymentAction
    {
        return PaymentAction::none();
    }

    /** Only a person can confirm cash was collected: see "Mark as paid" on the admin order page. */
    public function check(Payment $payment, array $input = []): PaymentCheck
    {
        return PaymentCheck::pending();
    }

    public function test(): string
    {
        return 'nothing to connect to.';
    }
}
