<?php

namespace App\Payments;

/** What the provider says about a payment. */
final readonly class PaymentCheck
{
    public const PAID = 'paid';
    public const PENDING = 'pending';
    public const FAILED = 'failed';

    public function __construct(
        public string $status,
        public ?string $transactionId = null,
        public ?int $amountMinor = null,
        public ?string $currency = null,
        public ?string $reason = null,
        public array $raw = [],
    ) {
    }

    public static function paid(string $transactionId, int $amountMinor, string $currency, array $raw = []): self
    {
        return new self(self::PAID, $transactionId, $amountMinor, strtoupper($currency), null, $raw);
    }

    public static function pending(): self
    {
        return new self(self::PENDING);
    }

    public static function failed(?string $reason = null, array $raw = []): self
    {
        return new self(self::FAILED, null, null, null, $reason, $raw);
    }
}
