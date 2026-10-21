<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;

class StorefrontProps
{
    /** Keys whose values are never translated. */
    private const SKIP_KEYS = [
        // identifiers and codes
        'id', 'slug', 'sku', 'key', 'code', 'number', 'status', 'mode', 'sort', 'source', 'query', 'q', 'meta', 'template',
        'tax_label', 'tax_note', 'reviews', 'reviewSummary', 'reviewForm', 'account', 'profile', 'addresses', 'defaultAddress', 'savedAddresses',
        'currency', 'locale', 'region', 'colour_hex', 'hex', 'box_position', 'direction',
        // money: the formatted price must stay exactly as calculated
        'formatted', 'minor',
        // links and files
        'href', 'url', 'path', 'actionUrl', 'tracking_number',
        // customer data: never sent to a translation service
        'email', 'shipping_address', 'billing_address', 'user', 'customer', 'notes',
        // values the page sends back to the server, which must match the database
        'facets', 'filters', 'sorts', 'links', 'shipping_method', 'payment_method',
    ];

    private const SKIP_SUFFIXES = ['_url', '_path', '_href', '_at', '_id', '_slug', '_key', '_minor'];

    public function __construct(private readonly ContentTranslator $translator)
    {
    }

    public function localize(array $props): array
    {
        if (app()->getLocale() === 'en') {
            return $props;
        }

        return $this->walk($this->normalize($props));
    }

    /** Turn collections, paginators and models into plain arrays so every string can be reached. */
    private function normalize(mixed $value): mixed
    {
        if ($value instanceof Arrayable) {
            return $this->normalize($value->toArray());
        }

        if ($value instanceof JsonSerializable) {
            return $this->normalize($value->jsonSerialize());
        }

        if (is_array($value)) {
            return array_map(fn ($item) => $this->normalize($item), $value);
        }

        return $value;
    }

    private function walk(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && $this->skipKey($key)) {
                continue;
            }

            if (is_array($value)) {
                $data[$key] = $this->walk($value);
            } elseif (is_string($value) && $this->looksLikeText($value)) {
                $data[$key] = $this->translator->get($value, null, true, $this->isHtml($value));
            }
        }

        return $data;
    }

    private function skipKey(string $key): bool
    {
        if (in_array($key, self::SKIP_KEYS, true)) {
            return true;
        }

        foreach (self::SKIP_SUFFIXES as $suffix) {
            if (str_ends_with($key, $suffix)) {
                return true;
            }
        }

        return false;
    }

    private function looksLikeText(string $value): bool
    {
        $value = trim($value);

        return $value !== ''
            && strlen($value) <= 20000
            && preg_match('/\p{L}.*\p{L}/su', $value) === 1           // at least two letters
            && ! str_contains($value, '@')                            // emails
            && ! str_starts_with($value, '/')                         // paths
            && ! str_starts_with($value, 'http')                      // links
            && ! preg_match('/^[A-Z0-9][A-Z0-9._\-]*$/', $value)      // SKUs, codes: ISO-DE, USD
            && ! preg_match('/^\d{4}-\d{2}-\d{2}/', $value);          // dates
    }

    private function isHtml(string $value): bool
    {
        return preg_match('/<[a-z][^>]*>/i', $value) === 1;
    }
}
