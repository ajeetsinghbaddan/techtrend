<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = ['token', 'user_id', 'currency', 'region', 'last_active_at'];

    protected function casts(): array
    {
        return ['last_active_at' => 'datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function loadLines(): self
    {
        return $this->load([
            'items' => fn ($q) => $q->orderBy('id'),
            'items.variant.product.prices',
            'items.variant.product.images' => fn ($q) => $q->orderBy('position')->limit(1),
        ]);
    }

    public function recoveries(): HasMany
    {
        return $this->hasMany(CartRecovery::class);
    }
}
