<?php

namespace App\Support\Seo;

use App\Models\Post;
use App\Models\Product;
use App\Models\Review;
use App\Support\Money;
use Illuminate\Support\Str;

class Schema
{
    /** A stable identifier, so nodes on different pages refer to the same thing. */
    public static function id(string $fragment): string
    {
        return url('/').'#'.$fragment;
    }

    public static function organization(): array
    {
        $settings = app(SeoSettings::class);
        $org = $settings->get('organization');

        $address = filled($org['street'] ?? null) ? array_filter([
            '@type' => 'PostalAddress',
            'streetAddress' => $org['street'],
            'addressLocality' => $org['city'] ?? null,
            'postalCode' => $org['postcode'] ?? null,
            'addressCountry' => $org['country'] ?? null,
        ]) : null;

        return array_filter([
            '@type' => 'OnlineStore',
            '@id' => self::id('organization'),
            'name' => $settings->siteName(),
            'legalName' => $org['legal_name'] ?? null,
            'url' => url('/'),
            'logo' => $settings->logo(),
            'email' => $org['email'] ?? null,
            'telephone' => $org['phone'] ?? null,
            'address' => $address,
            'sameAs' => array_values(array_filter($org['same_as'] ?? [])) ?: null,
            'hasMerchantReturnPolicy' => self::returnPolicy(),
        ]);
    }

    public static function returnPolicy(): array
    {
        $returns = app(SeoSettings::class)->get('returns');

        return [
            '@type' => 'MerchantReturnPolicy',
            'applicableCountry' => array_keys(config('shop.regions')),
            'returnPolicyCategory' => 'https://schema.org/MerchantReturnFiniteReturnWindow',
            'merchantReturnDays' => (int) ($returns['days'] ?? 30),
            'returnMethod' => 'https://schema.org/ReturnByMail',
            'returnFees' => ! empty($returns['free'])
                ? 'https://schema.org/FreeReturn'
                : 'https://schema.org/ReturnFeesCustomerResponsibility',
        ];
    }

    public static function website(): array
    {
        return [
            '@type' => 'WebSite',
            '@id' => self::id('website'),
            'url' => url('/'),
            'name' => app(SeoSettings::class)->siteName(),
            'inLanguage' => app()->getLocale(),
            'publisher' => ['@id' => self::id('organization')],
        ];
    }

    /** @param  array<int, array{0: ?string, 1: ?string}>  $trail  [name, url] pairs, in order */
    public static function breadcrumbs(array $trail): ?array
    {
        $items = array_values(array_filter($trail, fn ($step) => filled($step[0] ?? null) && filled($step[1] ?? null)));

        if (count($items) < 2) {
            return null;
        }

        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(fn ($step, $i) => [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $step[0],
                'item' => $step[1],
            ], $items, array_keys($items)),
        ];
    }

    public static function product(Product $product, ?Money $price, string $currency, string $region, string $url): array
    {
        $sku = $product->variants->first()?->sku;

        $offer = $price ? array_filter([
            '@type' => 'Offer',
            'url' => $url,
            'price' => self::decimal($price->minor),
            'priceCurrency' => $currency,
            'availability' => $product->isInStock() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'itemCondition' => 'https://schema.org/NewCondition',
            'seller' => ['@id' => self::id('organization')],
            'shippingDetails' => self::shipping($region, $currency, $price->minor),
        ]) : null;

        // Only real, approved reviews that are visible on the page.
        $reviews = $product->reviews()->approved()->with('user:id,name')
            ->orderByDesc('helpful_count')->latest()->take(3)->get();

        return array_filter([
            '@type' => 'Product',
            '@id' => $url.'#product',
            'name' => $product->tr('name'),
            'description' => Str::limit(Str::squish(strip_tags((string) $product->tr('description'))), 5000, '') ?: null,
            'image' => $product->images->map(fn ($image) => SeoSettings::absolute($image->url))->filter()->take(8)->values()->all() ?: null,
            'sku' => $sku,
            'mpn' => $sku,
            'brand' => ['@type' => 'Brand', 'name' => app(SeoSettings::class)->siteName()],
            'offers' => $offer,
            'aggregateRating' => $product->reviews_count > 0 && $product->rating ? [
                '@type' => 'AggregateRating',
                'ratingValue' => (float) $product->rating,
                'reviewCount' => (int) $product->reviews_count,
                'bestRating' => 5,
                'worstRating' => 1,
            ] : null,
            'review' => $reviews->isNotEmpty() ? $reviews->map(fn (Review $review) => array_filter([
                '@type' => 'Review',
                'author' => ['@type' => 'Person', 'name' => $review->authorName()],
                'datePublished' => $review->created_at?->toDateString(),
                'name' => $review->title,
                'reviewBody' => Str::limit($review->body, 500),
                'reviewRating' => ['@type' => 'Rating', 'ratingValue' => $review->rating, 'bestRating' => 5, 'worstRating' => 1],
            ]))->all() : null,
        ]);
    }

    /** Shipping for this product to the visitor's region, from your standard shipping rules. */
    public static function shipping(string $region, string $currency, int $priceMinor): ?array
    {
        $method = config('shop.shipping.methods.standard');
        $cost = $method['cost'][$currency] ?? null;

        if ($cost === null) {
            return null;
        }

        $freeOver = $method['free_over'][$currency] ?? null;
        $rate = $freeOver !== null && $priceMinor >= $freeOver ? 0 : $cost;

        $days = fn (?array $range) => $range ? [
            '@type' => 'QuantitativeValue', 'minValue' => $range[0], 'maxValue' => $range[1], 'unitCode' => 'DAY',
        ] : null;

        return array_filter([
            '@type' => 'OfferShippingDetails',
            'shippingRate' => ['@type' => 'MonetaryAmount', 'value' => self::decimal($rate), 'currency' => $currency],
            'shippingDestination' => ['@type' => 'DefinedRegion', 'addressCountry' => $region],
            'deliveryTime' => isset($method['transit_days']) ? array_filter([
                '@type' => 'ShippingDeliveryTime',
                'handlingTime' => $days($method['handling_days'] ?? [0, 1]),
                'transitTime' => $days($method['transit_days']),
            ]) : null,
        ]);
    }

    public static function article(Post $post, string $url, ?string $image): array
    {
        return array_filter([
            '@type' => 'BlogPosting',
            '@id' => $url.'#article',
            'headline' => Str::limit($post->tr('title'), 110, ''),
            'description' => Str::limit(Str::squish(strip_tags((string) ($post->tr('excerpt') ?? ''))), 300, '') ?: null,
            'image' => $image ? [$image] : null,
            'datePublished' => $post->published_at?->toIso8601String(),
            'dateModified' => ($post->updated_at ?? $post->published_at)?->toIso8601String(),
            'inLanguage' => app()->getLocale(),
            'mainEntityOfPage' => $url,
            'author' => ['@id' => self::id('organization')],
            'publisher' => ['@id' => self::id('organization')],
        ]);
    }

    private static function decimal(int $minor): string
    {
        return number_format($minor / 100, 2, '.', '');
    }
}
