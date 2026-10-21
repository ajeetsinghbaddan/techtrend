<?php

namespace App\Support;

use App\Models\Collection;
use App\Models\ProductPrice;
use App\Models\ProductVariant;
use Closure;
use Illuminate\Database\Eloquent\Builder;

class ProductFilters
{
    public const KEYS = ['options', 'colours', 'collections', 'min', 'max', 'in_stock', 'rating'];

    public function __construct(private readonly ExchangeRates $rates)
    {
    }

    /** Validation rules for the filter part of the query string. */
    public static function rules(): array
    {
        return [
            'options' => ['sometimes', 'array', 'max:10'],
            'options.*' => ['string', 'max:40'],
            'colours' => ['sometimes', 'array', 'max:10'],
            'colours.*' => ['string', 'max:40'],
            'collections' => ['sometimes', 'array', 'max:10'],
            'collections.*' => ['string', 'max:80'],
            'min' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'max' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'in_stock' => ['sometimes', 'boolean'],
            'rating' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
        ];
    }

    public function apply(Builder $query, array $filters, string $currency): Builder
    {
        $query
            ->when($filters['options'] ?? null, fn ($q, $options) => $q->whereHas('variants',
                fn ($v) => $v->where('is_active', true)->whereIn('option_name', $options)))
            ->when($filters['colours'] ?? null, fn ($q, $colours) => $q->whereHas('variants',
                fn ($v) => $v->where('is_active', true)->whereIn('colour_name', $colours)))
            ->when($filters['collections'] ?? null, fn ($q, $slugs) => $q->whereHas('collections',
                fn ($c) => $c->whereIn('collections.slug', $slugs)))
            ->when($filters['in_stock'] ?? null, fn ($q) => $q->inStock())
            ->when($filters['rating'] ?? null, fn ($q, $stars) => $q->where('products.rating', '>=', $stars));

        $this->applyPrice($query, $filters, $currency);

        return $query;
    }

    /**
     * @param  array<int, int>  $relevance  product ids, best match first (search only)
     */
    public function sort(Builder $query, string $sort, array $relevance = []): Builder
    {
        // Converting every price by the same rate keeps the order the same,
        // so sorting by the base price is correct for every currency.
        $price = fn () => ProductPrice::select('amount_minor')
            ->whereColumn('product_id', 'products.id')
            ->where('currency', $this->rates->base())
            ->limit(1);

        match ($sort) {
            'relevance' => $relevance
                ? $query->orderByRaw('FIELD(products.id, '.implode(',', array_fill(0, count($relevance), '?')).')', $relevance)
                : $query->orderBy('position'),
            'newest' => $query->latest('products.created_at'),
            'rating' => $query->orderByDesc('products.rating')->orderByDesc('products.reviews_count'),
            'price_asc' => $query->orderBy($price()),
            'price_desc' => $query->orderByDesc($price()),
            default => $query->orderBy('position'),
        };

        return $query;
    }

    /**
     * What can be filtered on, among the products $scope selects.
     *
     * @param  Closure(Builder): mixed  $scope  narrows a products query to the products in view
     */
    public function facets(Closure $scope, string $currency, bool $withCollections = false): array
    {
        $variants = ProductVariant::query()
            ->where('product_variants.is_active', true)
            ->whereHas('product', $scope);

        $range = ProductPrice::query()
            ->where('currency', $this->rates->base())
            ->whereHas('product', $scope)
            ->selectRaw('MIN(amount_minor) as min_minor, MAX(amount_minor) as max_minor')
            ->first();

        $rate = $this->rates->rate($currency) ?: 1;

        $facets = [
            'options' => (clone $variants)->whereNotNull('option_name')
                ->select('option_name')->distinct()->orderBy('option_name')
                ->pluck('option_name'),
            'colours' => (clone $variants)->whereNotNull('colour_name')
                ->select('colour_name', 'colour_hex')->distinct()->orderBy('colour_name')
                ->get()->unique('colour_name')->values(),
            'price_min' => (int) floor(($range->min_minor ?? 0) * $rate / 100),
            'price_max' => (int) ceil(($range->max_minor ?? 0) * $rate / 100),
        ];

        if ($withCollections) {
            $facets['collections'] = Collection::active()
                ->whereHas('products', $scope)
                ->withCount(['products' => $scope])
                ->orderBy('position')
                ->get()
                ->map(fn (Collection $c) => ['slug' => $c->slug, 'name' => $c->tr('name'), 'count' => $c->products_count])
                ->values();
        }

        return $facets;
    }

    private function applyPrice(Builder $query, array $filters, string $currency): void
    {
        if (! isset($filters['min']) && ! isset($filters['max'])) {
            return;
        }

        // The shopper types prices in their currency; the database holds the base currency.
        $rate = $this->rates->rate($currency) ?: 1;

        $query->whereHas('prices', function ($q) use ($filters, $rate) {
            $q->where('currency', $this->rates->base());

            if (isset($filters['min'])) {
                $q->where('amount_minor', '>=', (int) floor($filters['min'] * 100 / $rate));
            }

            if (isset($filters['max'])) {
                $q->where('amount_minor', '<=', (int) ceil($filters['max'] * 100 / $rate));
            }
        });
    }
}
