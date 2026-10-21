<?php

namespace App\Payments;

/** What to do after starting a payment. */
final readonly class PaymentAction
{
    private function __construct(
        public string $type,
        public ?string $url = null,
        public array $data = [],
    ) {
    }

    /** Send the customer to the provider's own page. */
    public static function redirect(string $url): self
    {
        return new self('redirect', $url);
    }

    /** Open the provider's window on our pay page, with this data. */
    public static function client(array $data): self
    {
        return new self('client', null, $data);
    }

    /** Nothing to do online (cash on delivery). */
    public static function none(): self
    {
        return new self('none');
    }
}
