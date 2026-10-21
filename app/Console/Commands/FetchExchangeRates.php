<?php

namespace App\Console\Commands;

use App\Models\ExchangeRate;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FetchExchangeRates extends Command
{
    protected $signature = 'rates:fetch';

    protected $description = 'Fetch daily exchange rates from the ECB (via Frankfurter)';

    public function handle(): int
    {
        $base = config('shop.base_currency');
        $targets = collect(config('shop.regions'))
            ->pluck('currency')->unique()
            ->reject(fn ($c) => $c === $base)
            ->values();

        $response = Http::timeout(10)->retry(3, 2000)
            ->get(rtrim(config('shop.fx.url'), '/').'/latest', [
                'from' => $base,
                'to' => $targets->implode(','),
            ]);

        if ($response->failed()) {
            $this->error('Rate fetch failed: HTTP '.$response->status());

            return self::FAILURE;
        }

        $rates = $response->json('rates', []);
        $date = $response->json('date', now()->toDateString());
        $maxChange = (float) config('shop.fx.max_change');

        foreach ($targets as $currency) {
            $rate = $rates[$currency] ?? null;

            if (! is_numeric($rate) || $rate <= 0) {
                $this->warn("No valid rate for {$currency}, keeping the old one.");
                continue;
            }

            $previous = ExchangeRate::where('base', $base)->where('currency', $currency)->value('rate');

            if ($previous && abs($rate - $previous) / $previous > $maxChange) {
                $this->warn("{$currency} moved more than ".($maxChange * 100)."%, skipped. Check it manually.");
                continue;
            }

            ExchangeRate::updateOrCreate(
                ['base' => $base, 'currency' => $currency],
                ['rate' => $rate, 'rate_date' => $date],
            );

            Cache::forget("fx.{$base}.{$currency}");
            $this->line("{$currency}: {$rate}");
        }

        return self::SUCCESS;
    }
}
