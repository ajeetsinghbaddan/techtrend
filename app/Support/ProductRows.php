<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class ProductRows
{
    public const SOURCES = ['manual', 'collection', 'random', 'newest', 'top_rated', 'on_sale'];

    public const PLACEMENTS = ['before_explore', 'after_explore'];

    public const MAX_PRODUCTS = 12;

    public static function forHomepage(string $region): array
    {
        $presenter = ProductPresenter::forRegion($region);
        $tr = app(ContentTranslator::class);
        $rows = Setting::get('product_rows', config('shop.product_rows'))['rows'] ?? [];

        return collect($rows)
            ->filter(fn (array $row) => $row['enabled'] ?? true)
            ->map(function (array $row) use ($presenter, $tr) {
                return [
                    'id' => $row['id'],
                    'title' => $tr->get($row['title']),
                    'subtitle' => $tr->get($row['subtitle'] ?? null),
                    'link_label' => $tr->get($row['link_label'] ?? null),
                    'link_href' => $row['link_href'] ?? null,
                    'placement' => in_array($row['placement'] ?? null, self::PLACEMENTS, true)
                        ? $row['placement']
                        : 'after_explore',
                    'products' => self::products($row)
                        ->map(fn (Product $p) => $presenter->card($p))
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $row) => count($row['products']) > 0)
            ->values()
            ->all();
    }

    private static function products(array $row): EloquentCollection
    {
        $limit = max(1, min((int) ($row['limit'] ?? 8), self::MAX_PRODUCTS));
        $query = Product::active()->with(ProductPresenter::eagerLoad());

        // Hand-picked: exactly these products, in the order chosen in the admin panel.
        if (($row['source'] ?? null) === 'manual') {
            $ids = array_slice(array_map('intval', $row['product_ids'] ?? []), 0, self::MAX_PRODUCTS);

            if ($ids === []) {
                return new EloquentCollection();
            }

            $order = array_flip($ids);

            return $query->whereKey($ids)->get()
                ->sortBy(fn (Product $p) => $order[$p->id])
                ->values();
        }

        $base = config('shop.base_currency');

        return (match ($row['source'] ?? 'newest') {
            'collection' => $query->whereHas('collections',
                fn ($q) => $q->where('slug', $row['collection_slug'] ?? ''))->orderBy('position'),

            'random' => $query->inRandomOrder(),

            'top_rated' => $query->orderByDesc('rating')->orderByDesc('reviews_count'),

            'on_sale' => $query->whereHas('prices', fn ($q) => $q
                ->where('currency', $base)
                ->whereNotNull('compare_at_minor')
                ->whereColumn('compare_at_minor', '>', 'amount_minor'))
                ->latest('created_at'),

            default => $query->latest('created_at'),
        })->take($limit)->get();
    }
}
