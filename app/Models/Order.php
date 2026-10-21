<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\Translation\HasLocalePreference;

class Order extends Model implements HasLocalePreference
{
    public const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

    protected $fillable = [
        'number', 'user_id', 'status', 'email', 'currency', 'region', 'locale',
        'subtotal_minor', 'shipping_minor', 'tax_minor', 'total_minor',
        'tax_rate', 'tax_inclusive', 'shipping_method', 'payment_method',
        'tracking_number', 'tracking_url', 'shipping_address', 'billing_address',
        'notes', 'admin_notes', 'placed_at', 'shipped_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_address' => 'array',
            'billing_address' => 'array',
            'tax_inclusive' => 'boolean',
            'tax_rate' => 'float',
            'placed_at' => 'datetime',
            'shipped_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'number';
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function generateNumber(): string
    {
        do {
            $number = 'TT-'.now()->format('ym').'-'.Str::upper(Str::random(5));
        } while (static::where('number', $number)->exists());

        return $number;
    }

    public function money(string $field): Money
    {
        return Money::of((int) $this->{$field.'_minor'}, $this->currency);
    }

    public function totals(): array
    {
        return [
            'subtotal' => $this->money('subtotal')->toArray($this->locale),
            'shipping' => $this->money('shipping')->toArray($this->locale),
            'tax' => $this->money('tax')->toArray($this->locale),
            'total' => $this->money('total')->toArray($this->locale),
        ];
    }

    /** Orders a customer may see: their own, plus guest orders placed with their verified email. */
    public function scopeForCustomer(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user) {
            $q->where('user_id', $user->id);

            if ($user->hasVerifiedEmail()) {
                $q->orWhere(fn (Builder $guest) => $guest->whereNull('user_id')->where('email', $user->email));
            }
        });
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** The language this order's emails are written in. */
    public function preferredLocale(): string
    {
        $supported = array_keys(config('shop.locales'));
        $language = $this->language ?: $this->user?->preferredLocale();

        return $language && in_array($language, $supported, true) ? $language : config('app.locale');
    }
}
