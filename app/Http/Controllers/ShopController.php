<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Support\ExchangeRates;
use App\Support\Money;
use App\Support\ProductFilters;
use App\Support\ProductPresenter;
use App\Support\Reviews;
use App\Support\Seo\Schema;
use App\Support\Seo\Seo;
use App\Support\Storefront;
use Illuminate\Http\Request;

class ShopController extends Controller
{
    private const SORTS = ['featured', 'newest', 'price_asc', 'price_desc', 'rating'];

    public function __construct(
        private readonly ExchangeRates $rates,
        private readonly ProductFilters $filters,
    ) {
    }

    public function collections()
    {
        $collections = Collection::active()
            ->withCount(['products' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('position')
            ->get();

        return Storefront::render('shop/collections', [
            'collections' => $collections->map(fn (Collection $c) => [
                'name' => $c->tr('name'),
                'slug' => $c->slug,
                'tagline' => $c->tr('tagline'),
                'image_url' => $c->image_url,
                'products_count' => $c->products_count,
            ]),
        ], Seo::make()
            ->title(__('Collections'))
            ->description(__('Browse all :count collections.', ['count' => $collections->count()]))
            ->canonical(url('/collections'))
            ->image($collections->first()?->image_url)
            ->breadcrumbs([
                [__('Home'), url('/')],
                [__('Collections'), url('/collections')],
            ]));
    }

    public function listing(Request $request, ?Collection $collection = null)
    {
        if ($collection && ! $collection->is_active) {
            abort(404);
        }

        $presenter = $this->presenter($request);
        $currency = $this->currency($request);

        $filters = $request->validate([
            ...ProductFilters::rules(),
            'sort' => ['sometimes', 'in:'.implode(',', self::SORTS)],
            'q' => ['sometimes', 'string', 'max:80'],
        ]);

        $query = Product::active()
            ->with(ProductPresenter::eagerLoad())
            ->when($collection, fn ($q) => $q->whereHas('collections',
                fn ($c) => $c->where('collections.id', $collection->id)))
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where('name', 'like', '%'.addcslashes($term, '%_\\').'%'))
            ->when($filters['options'] ?? null, fn ($q, $options) => $q->whereHas('variants',
                fn ($v) => $v->where('is_active', true)->whereIn('option_name', $options)))
            ->when($filters['colours'] ?? null, fn ($q, $colours) => $q->whereHas('variants',
                fn ($v) => $v->where('is_active', true)->whereIn('colour_name', $colours)))
            ->when($filters['in_stock'] ?? null, fn ($q) => $q->inStock());

        $this->filters->apply($query, $filters, $currency);
        $this->filters->sort($query, $filters['sort'] ?? 'featured');

        $products = $query->paginate(12)->withQueryString()
            ->through(fn (Product $p) => $presenter->card($p));

        return Storefront::render('shop/listing', [
            'collection' => $collection ? [
                'name' => $collection->tr('name'),
                'slug' => $collection->slug,
                'tagline' => $collection->tr('tagline'),
                'description' => $collection->tr('description'),
            ] : null,
            'products' => $products,
            'filters' => $filters,
            'facets' => $this->filters->facets(
                fn ($q) => $q->where('products.is_active', true)
                    ->when($collection, fn ($p) => $p->whereHas('collections', fn ($c) => $c->where('collections.id', $collection->id))),
                $currency,
            ),
            'sorts' => self::SORTS,
        ], $this->listingSeo($request, $collection));
    }

    public function product(Request $request, Product $product)
    {
        abort_unless($product->is_active, 404);

        $product->load([
            'variants' => fn ($q) => $q->where('is_active', true)->orderBy('position'),
            'images' => fn ($q) => $q->orderBy('position'),
            'prices',
            'collections:id,name,slug',
        ]);

        $presenter = $this->presenter($request);
        $currency = $this->currency($request);
        $locale = $this->locale($request);

        // Reviews: the service, the current customer, and any review filters in the URL.
        $reviews = app(Reviews::class);
        $userId = $request->user()?->id;

        $reviewFilters = $request->validate([
            'stars' => ['sometimes', 'integer', 'between:1,5'],
            'photos' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'in:'.implode(',', Reviews::SORTS)],
        ]);

        $price = $product->money($currency);
        $compare = $product->compareAtMoney($currency);
        $lowest = $product->lowestPriceIn30Days($currency);

        $related = Product::active()
            ->where('id', '!=', $product->id)
            ->when($product->collections->isNotEmpty(), fn ($q) => $q->whereHas('collections',
                fn ($c) => $c->whereIn('collections.id', $product->collections->pluck('id'))))
            ->with(ProductPresenter::eagerLoad())
            ->inRandomOrder()
            ->take(4)
            ->get()
            ->map(fn (Product $p) => $presenter->card($p));

        return Storefront::render('shop/product', [
            'product' => [
                ...$product->only(['name', 'slug', 'subtitle', 'description', 'specs', 'compliance',
                    'run_label', 'units_total', 'rating', 'reviews_count', 'meta_title', 'meta_description']),
                'name' => $product->tr('name'),
                'subtitle' => $product->tr('subtitle'),
                'description' => $product->tr('description'),
                'specs' => $product->tr('specs'),
                'compliance' => $product->tr('compliance'),
                'units_left' => $product->unitsLeft(),
                'in_stock' => $product->isInStock(),
                'badge' => $product->badge(),
                'price' => $price?->toArray($locale),
                'compare_at' => $compare?->toArray($locale),
                'percent_off' => $price && $compare ? $price->percentOff($compare) : null,
                'lowest_30_days' => $lowest?->toArray($locale),
                'tax_note' => config("shop.regions.{$this->region($request)}.tax"),
                'images' => $product->images->map(fn ($i) => [
                    'url' => $i->url,
                    'alt' => $i->alt ?? '',
                    'colour_name' => $i->colour_name,
                ]),
                'variants' => $product->variants->map(
                    fn (ProductVariant $v) => $this->variantData($v, $price, $compare, $currency, $locale)
                ),
                'collection' => ($c = $product->collections->first())
                    ? ['name' => $c->tr('name'), 'slug' => $c->slug]
                    : null,
            ],
            'related' => $related,

            // Top-level props, next to 'related' — not inside 'product'.
            'reviews' => fn () => $reviews->list($product, $reviewFilters, $userId),
            'reviewSummary' => fn () => $reviews->summary($product),
            'reviewForm' => fn () => $this->reviewForm($product, $request, $reviews),
        ], $this->productSeo($product, $price, $currency, $this->region($request), $reviewFilters !== []));
    }

    /* ---------- SEO ---------- */

    private function listingSeo(Request $request, ?Collection $collection): Seo
    {
        $base = $collection ? url('/collections/'.$collection->slug) : url('/products');
        $name = $collection ? $collection->tr('name') : __('All products');
        $page = max(1, (int) $request->query('page', 1));

        // Filtered, sorted or searched listings are near-copies of the main one.
        $filtered = collect($request->query())->except('page')->isNotEmpty();

        $seo = Seo::make()
            ->title(($collection?->tr('meta_title') ?: $name).($page > 1 ? ' – '.__('Page :page', ['page' => $page]) : ''))
            ->description($collection
                ? ($collection->tr('meta_description') ?: $collection->tr('description') ?: $collection->tr('tagline'))
                : __('Shop all products.'))
            ->canonical($page > 1 ? "{$base}?page={$page}" : $base)
            ->image($collection?->image_url, $name)
            ->breadcrumbs(array_filter([
                [__('Home'), url('/')],
                $collection ? [__('Collections'), url('/collections')] : null,
                [$name, $base],
            ]));

        return $filtered ? $seo->noindex() : $seo;
    }

    private function productSeo(Product $product, ?Money $price, string $currency, string $region, bool $reviewFiltered): Seo
    {
        $url = route('products.show', $product);
        $name = $product->tr('name');
        $image = $product->images->first();
        $collection = $product->collections->first();

        $seo = Seo::make()
            ->title($product->tr('meta_title') ?: $name)
            ->description($product->tr('meta_description') ?: ($product->tr('subtitle') ?: $product->tr('description')))
            ->canonical($url)
            ->image($image?->url, $image?->alt ?: $name)
            ->type('product')
            ->property('product:price:amount', $price ? number_format($price->minor / 100, 2, '.', '') : null)
            ->property('product:price:currency', $price ? $currency : null)
            ->property('product:availability', $product->isInStock() ? 'in stock' : 'out of stock')
            ->schema(Schema::product($product, $price, $currency, $region, $url))
            ->breadcrumbs([
                [__('Home'), url('/')],
                [$collection?->tr('name'), $collection ? url('/collections/'.$collection->slug) : null],
                [$name, $url],
            ]);

        // ?stars=5 or ?sort=newest only reorder the reviews: same product, not a new page.
        return $reviewFiltered ? $seo->noindex() : $seo;
    }

    /* ---------- helpers ---------- */

    private function reviewForm(Product $product, Request $request, Reviews $reviews): array
    {
        $user = $request->user();
        $verified = $reviews->isVerifiedBuyer($user?->id, $product);
        $mine = $user
            ? Review::where('product_id', $product->id)->where('user_id', $user->id)->with('images')->first()
            : null;

        return [
            'logged_in' => (bool) $user,
            'verified' => $verified,
            'can_review' => (bool) $user && (! config('shop.reviews.require_purchase') || $verified),
            'require_purchase' => (bool) config('shop.reviews.require_purchase'),
            'max_images' => (int) config('shop.reviews.max_images', 4),
            'write_url' => route('reviews.write', $product),
            'mine' => $mine ? $reviews->present($mine) : null,
        ];
    }

    private function variantData(ProductVariant $v, ?Money $price, ?Money $compare, string $currency, string $locale): array
    {
        $base = [
            'id' => $v->id,
            'colour_name' => $v->colour_name,
            'colour_hex' => $v->colour_hex,
            'option_name' => $v->option_name,
            'stock' => max(0, $v->stock),
        ];

        if (! $price) {
            return [...$base, 'price' => null, 'compare_at' => null, 'percent_off' => null];
        }

        // The adjustment is stored in the base currency, so convert it first.
        $adjustment = $v->adjustment($currency);

        $unit = Money::of($price->minor + $adjustment, $currency);
        $unitCompare = $compare ? Money::of($compare->minor + $adjustment, $currency) : null;

        return [
            ...$base,
            'price' => $unit->toArray($locale),
            'compare_at' => $unitCompare?->toArray($locale),
            'percent_off' => $unitCompare ? $unit->percentOff($unitCompare) : null,
        ];
    }

    private function region(Request $request): string
    {
        return $request->attributes->get('region', config('shop.default_region'));
    }

    private function currency(Request $request): string
    {
        return config("shop.regions.{$this->region($request)}.currency") ?? config('shop.default_currency');
    }

    private function locale(Request $request): string
    {
        return config("shop.regions.{$this->region($request)}.locale") ?? 'en_US';
    }

    private function presenter(Request $request): ProductPresenter
    {
        return ProductPresenter::forRegion($this->region($request));
    }
}
