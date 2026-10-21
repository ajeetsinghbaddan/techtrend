<?php

namespace App\Support\Seo;

use App\Models\Setting;
use Illuminate\Support\Facades\Storage;

class SeoSettings
{
    public const DEFAULTS = [
        'site_name' => null,
        'default_description' => '',
        'default_image' => null,
        'twitter_handle' => null,
        'indexing' => true,
        'google_verification' => null,
        'bing_verification' => null,
        'organization' => [
            'legal_name' => null,
            'email' => null,
            'phone' => null,
            'street' => null,
            'city' => null,
            'postcode' => null,
            'country' => null,
            'same_as' => [],
        ],
        'returns' => [
            'days' => 30,
            'free' => true,
        ],
    ];

    private ?array $loaded = null;

    public function all(): array
    {
        if ($this->loaded === null) {
            $saved = Setting::get('seo');
            $this->loaded = array_replace_recursive(self::DEFAULTS, is_array($saved) ? $saved : []);
        }

        return $this->loaded;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return data_get($this->all(), $key, $default);
    }

    public function siteName(): string
    {
        return $this->get('site_name') ?: config('app.name');
    }

    /** Only the live site is ever indexed: staging and local copies never are. */
    public function indexable(): bool
    {
        return (bool) $this->get('indexing') && app()->isProduction();
    }

    public function defaultImage(): ?string
    {
        $path = $this->get('default_image');

        return $path ? self::absolute(Storage::disk('public')->url($path)) : null;
    }

    public function logo(): ?string
    {
        return self::absolute(Setting::header()['logo_url'] ?? null);
    }

    public static function absolute(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        return str_starts_with($url, 'http') ? $url : url($url);
    }
}
