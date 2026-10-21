<?php

namespace App\Support;

class CheckoutCalculator
{
    public function __construct(
        private readonly string $region,
        private readonly string $currency,
        private readonly string $locale,
    ) {
    }

    public static function forRegion(string $region): self
    {
        $config = config("shop.regions.{$region}") ?? config('shop.regions.'.config('shop.default_region'));

        return new self($region, $config['currency'], $config['locale']);
    }

    public function shippingMethods(int $subtotalMinor): array
    {
        return collect(config('shop.shipping.methods'))
            ->map(function (array $method, string $key) use ($subtotalMinor) {
                $cost = $method['cost'][$this->currency] ?? null;

                if ($cost === null) {
                    return null;
                }

                $threshold = $method['free_over'][$this->currency] ?? null;
                $free = $threshold !== null && $subtotalMinor >= $threshold;
                $final = $free ? 0 : $cost;

                return [
                    'key' => $key,
                    'label' => $method['label'],
                    'days' => $method['days'],
                    'cost_minor' => $final,
                    'cost' => Money::of($final, $this->currency)->toArray($this->locale),
                    'free' => $free,
                    'free_over' => $threshold !== null && ! $free
                        ? Money::of($threshold, $this->currency)->toArray($this->locale)
                        : null,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    public function paymentMethods(): array
    {
        $labels = [
            'card' => 'Card', 'paypal' => 'PayPal', 'klarna' => 'Klarna',
            'sepa' => 'SEPA direct debit', 'invoice' => 'Pay on invoice',
            'ideal' => 'iDEAL', 'blik' => 'BLIK', 'swish' => 'Swish',
        ];

        return collect(config("shop.payment_methods.{$this->region}", ['card']))
            ->map(fn (string $key) => ['key' => $key, 'label' => $labels[$key] ?? ucfirst($key)])
            ->all();
    }

    public function totals(int $subtotalMinor, string $shippingKey): array
    {
        $shipping = collect($this->shippingMethods($subtotalMinor))->firstWhere('key', $shippingKey)
            ?? collect($this->shippingMethods($subtotalMinor))->first();

        $shippingMinor = $shipping['cost_minor'] ?? 0;

        $tax = config("shop.tax.rates.{$this->region}") ?? ['rate' => 0, 'inclusive' => false, 'label' => 'Tax'];
        $rate = (float) $tax['rate'];
        $inclusive = (bool) $tax['inclusive'];

        $taxable = $subtotalMinor + $shippingMinor;

        if ($rate <= 0) {
            $taxMinor = 0;
            $totalMinor = $taxable;
        } elseif ($inclusive) {
            // Price already contains the tax: work out how much of it is tax.
            $net = (int) round($taxable / (1 + $rate / 100));
            $taxMinor = $taxable - $net;
            $totalMinor = $taxable;
        } else {
            // Tax is added on top.
            $taxMinor = (int) round($taxable * $rate / 100);
            $totalMinor = $taxable + $taxMinor;
        }

        return [
            'shipping_key' => $shipping['key'] ?? null,
            'subtotal_minor' => $subtotalMinor,
            'shipping_minor' => $shippingMinor,
            'tax_minor' => $taxMinor,
            'total_minor' => $totalMinor,
            'tax_rate' => $rate,
            'tax_inclusive' => $inclusive,
            'tax_label' => $tax['label'],
            'display' => [
                'subtotal' => Money::of($subtotalMinor, $this->currency)->toArray($this->locale),
                'shipping' => Money::of($shippingMinor, $this->currency)->toArray($this->locale),
                'tax' => Money::of($taxMinor, $this->currency)->toArray($this->locale),
                'total' => Money::of($totalMinor, $this->currency)->toArray($this->locale),
            ],
        ];
    }

    public function currency(): string
    {
        return $this->currency;
    }

    public function locale(): string
    {
        return $this->locale;
    }
}
