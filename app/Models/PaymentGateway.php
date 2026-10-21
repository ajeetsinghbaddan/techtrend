<?php

namespace App\Models;

use App\Payments\Drivers\CashOnDelivery;
use App\Payments\Drivers\PaypalGateway;
use App\Payments\Drivers\PaytmGateway;
use App\Payments\Drivers\RazorpayGateway;
use App\Payments\Drivers\StripeGateway;
use App\Payments\Gateway;
use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    /** Which class talks to each provider. */
    public const DRIVERS = [
        'stripe' => StripeGateway::class,
        'paypal' => PaypalGateway::class,
        'razorpay' => RazorpayGateway::class,
        'paytm' => PaytmGateway::class,
        'cod' => CashOnDelivery::class,
    ];

    protected $fillable = ['name', 'description', 'enabled', 'mode', 'regions', 'currencies', 'settings', 'position'];

    protected $hidden = ['credentials'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'credentials' => 'encrypted:array',
            'regions' => 'array',
            'currencies' => 'array',
            'settings' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'key';
    }

    /** @return class-string<Gateway> */
    public function driverClass(): string
    {
        return self::DRIVERS[$this->key];
    }

    public function driver(): Gateway
    {
        $class = $this->driverClass();

        return new $class($this);
    }

    public function credential(string $key): ?string
    {
        return $this->credentials[$key] ?? null;
    }

    public function isLive(): bool
    {
        return $this->mode === 'live';
    }

    /** Every required key is filled in. */
    public function isConfigured(): bool
    {
        foreach ($this->driverClass()::fields() as $key => $field) {
            if (($field['required'] ?? true) && blank($this->credential($key))) {
                return false;
            }
        }

        return true;
    }

    /** Can this method be offered for this region, currency and order total (in the base currency)? */
    public function supports(string $region, string $currency, int $baseTotalMinor): bool
    {
        if ($this->regions && ! in_array($region, $this->regions, true)) {
            return false;
        }

        $currencies = $this->currencies ?: $this->driverClass()::currencies();

        if ($currencies !== null && ! in_array($currency, $currencies, true)) {
            return false;
        }

        $max = $this->settings['max_total'] ?? null;

        return blank($max) || $baseTotalMinor <= (int) round(((float) $max) * 100);
    }
}
