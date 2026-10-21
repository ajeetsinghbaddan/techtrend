<?php

namespace App\Support;

/** English names for the codes stored on orders, translated with __(). */
class OrderLabels
{
    public const NAMES = [
        'standard' => 'Standard',
        'express' => 'Express',
        'stripe' => 'Card',
        'card' => 'Card',
        'paypal' => 'PayPal',
        'razorpay' => 'Razorpay',
        'paytm' => 'Paytm',
        'cod' => 'Cash on delivery',
        'klarna' => 'Klarna',
        'sepa' => 'SEPA direct debit',
        'invoice' => 'Pay on invoice',
        'ideal' => 'iDEAL',
        'blik' => 'BLIK',
        'swish' => 'Swish',
    ];

    public static function for(?string $code): string
    {
        return __(self::NAMES[$code] ?? (string) $code);
    }
}
