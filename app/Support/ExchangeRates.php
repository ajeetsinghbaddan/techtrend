<?php

namespace App\Support;

use App\Models\ExchangeRate;
use Illuminate\Support\Facades\Cache;

class ExchangeRates
{
    private array $memo = [];

    public function base(): string
    {
        return config('shop.base_currency');
    }

    public function rate(string $currency): float
    {
        $currency = strtoupper($currency);

        if ($currency === $this->base()) {
            return 1.0;
        }

        return $this->memo[$currency] ??= Cache::remember(
            "fx.{$this->base()}.{$currency}",
            now()->addHours(6),
            fn () => (float) (ExchangeRate::where('base', $this->base())
                ->where('currency', $currency)->value('rate')
                ?? config("shop.fx.fallback.{$currency}", 0)),
        );
    }

    /** Convert an amount in base-currency minor units. Null if no rate is known. */
    public function convert(int $minor, string $to): ?int
    {
        $rate = $this->rate($to);

        return $rate > 0 ? (int) round($minor * $rate) : null;
    }
}
