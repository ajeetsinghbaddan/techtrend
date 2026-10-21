<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Product;
use App\Support\ProductPresenter;
use App\Support\ProductSearch;
use App\Support\Storefront;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Support\ProductFilters;
use Illuminate\Support\Arr;

class SearchController extends Controller
{
    private const SORTS = ['relevance', 'newest', 'price_asc', 'price_desc', 'rating'];

    public function __construct(private readonly ProductSearch $search)
    {
    }

    /** The full results page: /search?q=… with filters. */
    public function index(Request $request, ProductFilters $productFilters)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'in:'.implode(',', self::SORTS)],
            ...ProductFilters::rules(),
        ]);

        $term = $this->search->normalize($data['q'] ?? '');
        $region = $this->region($request);
        $currency = config("shop.regions.{$region}.currency") ?? config('shop.default_currency');
        $filters = Arr::only($data, ProductFilters::KEYS);
        $sort = $data['sort'] ?? 'relevance';

        // Step 1: everything that matches the words, best match first.
        $ids = $this->search->ids($term);

        // Count each search once: first page, before any filters.
        if ($term !== '' && ($data['page'] ?? 1) == 1 && $filters === []) {
            $this->search->log($term, count($ids));
        }

        $products = null;
        $facets = null;

        if ($ids) {
            // Step 2: filter and sort those products in the database.
            $presenter = ProductPresenter::forRegion($region);
            $query = Product::active()->whereIn('products.id', $ids)->with(ProductPresenter::eagerLoad());

            $productFilters->apply($query, $filters, $currency);
            $productFilters->sort($query, $sort, $ids);

            $products = $query->paginate(12)->withQueryString()
                ->through(fn (Product $p) => $presenter->card($p));

            $facets = $productFilters->facets(
                fn ($q) => $q->where('products.is_active', true)->whereIn('products.id', $ids),
                $currency,
                withCollections: true,
            );
        }

        $nothingFound = $ids === [];

        return Storefront::render('shop/search', [
            'query' => $term,
            'products' => $products,
            'matched' => count($ids),
            'filters' => [...$filters, 'sort' => $sort],
            'facets' => $facets,
            'sorts' => self::SORTS,
            'popular' => $nothingFound ? $this->search->popular() : [],
            'collections' => $nothingFound
                ? Collection::active()->orderBy('position')->take(6)->get()
                    ->map(fn (Collection $c) => [
                        'name' => $c->tr('name'),
                        'slug' => $c->slug,
                        'image_url' => $c->image_url,
                    ])
                : [],
        ]);
    }

    /** Suggestions for the header box, as JSON. */
    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $term = $this->search->normalize($data['q'] ?? '');

        if (mb_strlen($term) < 2) {
            return response()->json(['products' => [], 'collections' => []]);
        }

        $region = $this->region($request);
        $locale = app()->getLocale();
        $key = "search.suggest.{$locale}.{$region}.".sha1(Str::lower($term));

        $payload = Cache::remember($key, now()->addMinutes(10), function () use ($term, $region) {
            $presenter = ProductPresenter::forRegion($region);

            return [
                'products' => $this->search->suggestions($term, 6)
                    ->map(function (Product $p) use ($presenter) {
                        $card = $presenter->card($p);

                        return [
                            'name' => $card['name'],
                            'slug' => $card['slug'],
                            'image_url' => $card['image_url'],
                            'price' => $card['price'],
                        ];
                    })->values()->all(),
                'collections' => $this->search->collections($term, 3)
                    ->map(fn (Collection $c) => ['name' => $c->tr('name'), 'slug' => $c->slug])
                    ->values()->all(),
            ];
        });

        return response()->json($payload);
    }

    private function region(Request $request): string
    {
        return $request->attributes->get('region', config('shop.default_region'));
    }
}
