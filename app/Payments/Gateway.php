<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\Payment;

interface Gateway
{
    /** Keys the admin fills in: key => ['label' => …, 'secret' => bool, 'required' => bool, 'help' => …]. */
    public static function fields(): array;

    /** Currencies the provider accepts, or null for any. */
    public static function currencies(): ?array;

    /** Create the payment at the provider and say where the customer goes next. */
    public function start(Payment $payment, Order $order): PaymentAction;

    /** Ask the provider what really happened. Browser data may be passed in, but is never trusted alone. */
    public function check(Payment $payment, array $input = []): PaymentCheck;

    /** Prove the keys work, for the admin's "Test connection" button. */
    public function test(): string;
}
