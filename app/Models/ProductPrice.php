<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    protected $fillable = ['product_id', 'currency', 'amount_minor', 'compare_at_minor'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
