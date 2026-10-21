<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'colour_name', 'colour_hex', 'option_name',
        'sku', 'stock', 'price_adjustment_minor', 'position', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function label(): string
    {
        return trim(collect([$this->colour_name, $this->option_name])->filter()->implode(' · '));
    }

    public function isInStock(): bool
    {
        return $this->is_active && $this->stock > 0;
    }

    public function adjustment(string $currency): int
    {
        return app(\App\Support\ExchangeRates::class)->convert($this->price_adjustment_minor, $currency) ?? 0;
    }
}
