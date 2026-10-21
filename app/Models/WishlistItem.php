<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WishlistItem extends Model
{
    use Prunable;

    protected $fillable = ['user_id', 'guest_token', 'product_id', 'added_price_minor'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Guest wishlists nobody has touched for 90 days are deleted by `model:prune`. */
    public function prunable(): Builder
    {
        return static::whereNull('user_id')->where('updated_at', '<', now()->subDays(90));
    }
}
