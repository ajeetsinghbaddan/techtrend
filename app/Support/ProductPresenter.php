<?php

namespace App\Support;

use App\Models\Product;

class ProductPresenter
{
    public function __construct(
        private readonly string $currency,
        private readonly string $locale,
    ) {
    }

    public static function forRegion(string $region): self
    {
        $config = config("shop.regions.{$region}") ?? config('shop.regions.'.config('shop.default_region'));

        return new self($config['currency'], $config['locale']);
    }

    public function card(Product $product): array
    {
        $price = $product->money($this->currency);
        $compare = $product->compareAtMoney($this->currency);

        return [
            'name' => $product->tr('name'),
            'slug' => $product->slug,
            'image_url' => $product->images->first()?->url,
            'image_alt' => $product->images->first()?->alt ?? '',
            'price' => $price?->toArray($this->locale),
            'compare_at' => $compare?->toArray($this->locale),
            'percent_off' => $price && $compare ? $price->percentOff($compare) : null,
            'rating' => $product->rating,
            'reviews_count' => $product->reviews_count,
            'badge' => $product->badge(),
            'in_stock' => $product->isInStock(),
            'swatches' => $product->variants
                ->where('is_active', true)
                ->whereNotNull('colour_hex')
                ->unique('colour_hex')
                ->take(5)
                ->map(fn ($v) => ['name' => $v->colour_name, 'hex' => $v->colour_hex])
                ->values(),
        ];
    }

    public static function eagerLoad(): array
    {
        return [
            'images' => fn ($q) => $q->orderBy('position')->limit(1),
            'variants' => fn ($q) => $q->where('is_active', true),
            'prices',
        ];
    }
}
