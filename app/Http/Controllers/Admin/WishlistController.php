<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WishlistItem;
use App\Support\ExchangeRates;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WishlistController extends Controller
{
    public function index(Request $request, ExchangeRates $rates)
    {
        $filters = $request->validate([
            'q' => ['sometimes', 'string', 'max:80'],
            'sort' => ['sometimes', 'in:most,trending,name'],
            'stock' => ['sometimes', 'in:all,out'],
        ]);

        $since = now()->subDays(30);
        $base = $rates->base();

        $products = Product::query()
            ->whereHas('wishlistItems')
            ->withCount([
                'wishlistItems',
                'wishlistItems as recent_count' => fn ($q) => $q->where('created_at', '>=', $since),
                'wishlistItems as customers_count' => fn ($q) => $q->whereNotNull('user_id'),
            ])
            ->with(['prices', 'variants', 'images' => fn ($q) => $q->orderBy('position')->limit(1)])
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where('name', 'like', '%'.addcslashes($term, '%_\\').'%'))
            ->when(($filters['stock'] ?? 'all') === 'out', fn ($q) => $q->whereDoesntHave('variants',
                fn ($v) => $v->where('is_active', true)->where('stock', '>', 0)))
            ->tap(fn ($q) => match ($filters['sort'] ?? 'most') {
                'trending' => $q->orderByDesc('recent_count')->orderByDesc('wishlist_items_count'),
                'name' => $q->orderBy('name'),
                default => $q->orderByDesc('wishlist_items_count'),
            })
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'is_active' => $p->is_active,
                'in_stock' => $p->isInStock(),
                'image_url' => $p->images->first()?->url,
                'price' => $p->money($base)?->toArray('en_US')['formatted'] ?? null,
                'total' => $p->wishlist_items_count,
                'customers' => $p->customers_count,
                'guests' => $p->wishlist_items_count - $p->customers_count,
                'recent' => $p->recent_count,
            ]);

        return Inertia::render('admin/wishlists', [
            'products' => $products,
            'filters' => [
                'q' => $filters['q'] ?? '',
                'sort' => $filters['sort'] ?? 'most',
                'stock' => $filters['stock'] ?? 'all',
            ],
            'stats' => [
                'items' => WishlistItem::count(),
                'products' => WishlistItem::distinct()->count('product_id'),
                'shoppers' => WishlistItem::whereNotNull('user_id')->distinct()->count('user_id')
                    + WishlistItem::whereNull('user_id')->distinct()->count('guest_token'),
                'recent' => WishlistItem::where('created_at', '>=', $since)->count(),
            ],
        ]);
    }
}
