<?php

namespace App\Payments\Drivers;

use App\Models\Order;
use App\Models\PaymentGateway;
use App\Payments\Gateway;

abstract class BaseGateway implements Gateway
{
    public function __construct(protected readonly PaymentGateway $gateway)
    {
    }

    /** 12345 → "123.45", the format providers expect. */
    protected function decimal(int $minor): string
    {
        return number_format($minor / 100, 2, '.', '');
    }

    /** "123.45" → 12345. */
    protected function toMinor(string|int|float $value): int
    {
        return (int) round(((float) $value) * 100);
    }

    protected function customerName(Order $order): string
    {
        $address = $order->shipping_address ?? [];

        return trim(($address['first_name'] ?? '').' '.($address['last_name'] ?? ''));
    }
}
