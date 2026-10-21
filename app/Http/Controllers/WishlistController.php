<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\WishlistItem;
use App\Support\ExchangeRates;
use App\Support\ProductPresenter;
use App\Support\Storefront;
use App\Support\WishlistManager;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function __construct(
        private readonly WishlistManager $wishlist,
        private readonly ExchangeRates $rates,
    ) {
    }

    public function index(Request $request)
    {
        $presenter = ProductPresenter::forRegion($request->attributes->get('region', config('shop.default_region')));
        $base = $this->rates->base();

        $items = $this->wishlist->query($request)
            ?->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->with(['product' => fn ($q) => $q->with(ProductPresenter::eagerLoad())])
            ->latest()
            ->get() ?? collect();

        return Storefront::render('shop/wishlist', [
            'items' => $items->map(fn (WishlistItem $item) => [
                ...$presenter->card($item->product),
                'added_at' => $item->created_at?->toIso8601String(),
                'price_drop' => $this->priceDrop($item, $base),
                'available' => $item->product->isInStock(),
                'quick_variant_id' => $this->quickVariant($item->product),
            ])->values(),
            'isGuest' => ! $request->user(),
        ]);
    }

    public function toggle(Request $request, Product $product)
    {
        abort_unless($product->is_active, 404);

        $this->wishlist->toggle($request, $product);

        return back();
    }

    /** Percentage the price has fallen since the product was saved, or null. */
    private function priceDrop(WishlistItem $item, string $base): ?int
    {
        $then = $item->added_price_minor;
        $now = $item->product->money($base)?->minor;

        if (! $then || ! $now || $now >= $then) {
            return null;
        }

        $percent = (int) round((1 - $now / $then) * 100);

        return $percent >= 1 ? $percent : null;
    }

    /** The variant to add straight to the bag, when the product has exactly one and it's in stock. */
    private function quickVariant(Product $product): ?int
    {
        $variants = $product->variants->where('is_active', true);
        $only = $variants->count() === 1 ? $variants->first() : null;

        return $only && $only->stock > 0 ? $only->id : null;
    }
}
