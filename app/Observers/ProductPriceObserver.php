<?php

namespace App\Observers;

use App\Models\ProductPrice;
use App\Models\ProductPriceHistory;

class ProductPriceObserver
{
    public function saved(ProductPrice $price): void
    {
        if (! $price->wasRecentlyCreated && ! $price->wasChanged('amount_minor')) {
            return;
        }

        ProductPriceHistory::create([
            'product_id' => $price->product_id,
            'currency' => $price->currency,
            'amount_minor' => $price->amount_minor,
            'recorded_at' => now(),
        ]);
    }
}
