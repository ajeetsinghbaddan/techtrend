<?php

namespace App\Support;

use NumberFormatter;

class Money
{
    public function __construct(
        public readonly int $minor,
        public readonly string $currency,
    ) {
    }

    public static function of(int $minor, string $currency): self
    {
        return new self($minor, strtoupper($currency));
    }

    public function plus(int $minor): self
    {
        return new self($this->minor + $minor, $this->currency);
    }

    public function times(int $quantity): self
    {
        return new self($this->minor * $quantity, $this->currency);
    }

    public function isLessThan(self $other): bool
    {
        return $this->minor < $other->minor;
    }

    public function percentOff(self $original): ?int
    {
        if ($original->minor <= 0 || $this->minor >= $original->minor) {
            return null;
        }

        return (int) round(($original->minor - $this->minor) / $original->minor * 100);
    }

    public function format(string $locale = 'en_US'): string
    {
        $formatter = new NumberFormatter($locale, NumberFormatter::CURRENCY);

        return $formatter->formatCurrency($this->minor / 100, $this->currency);
    }

    public function toArray(string $locale = 'en_US'): array
    {
        return [
            'minor' => $this->minor,
            'currency' => $this->currency,
            'formatted' => $this->format($locale),
        ];
    }
}
