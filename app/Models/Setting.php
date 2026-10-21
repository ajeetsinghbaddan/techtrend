<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use App\Jobs\TranslateContent;
use App\Support\ContentTranslator;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    public static function get(string $key, array $default = []): array
    {
        return Cache::rememberForever(
            "setting.{$key}",
            fn () => static::firstWhere('key', $key)?->value ?? $default
        );
    }

    public static function put(string $key, array $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("setting.{$key}");

        // Queue a translation for every piece of text in this settings group.
        array_walk_recursive($value, function ($leaf, $field) {
            if (ContentTranslator::translatable($field, $leaf)) {
                TranslateContent::dispatch($leaf);
            }
        });
    }

    public static function header(): array
    {
        $header = static::get('header', config('shop.header'));

        $header['logo_url'] = ! empty($header['logo_path'])
            ? Storage::disk('public')->url($header['logo_path'])
            : null;

        return $header;
    }

    public static function hero(): array
    {
        $hero = static::get('hero', config('shop.hero'));

        $hero['slides'] = collect($hero['slides'] ?? [])
            ->map(fn (array $slide) => [
                ...$slide,
                'image_url' => ! empty($slide['image_path'])
                    ? Storage::disk('public')->url($slide['image_path'])
                    : null,
            ])
            ->values()
            ->all();

        return $hero;
    }

    public static function features(): array
    {
        return static::get('features', config('shop.features'));
    }

    public static function cards(string $key): array
    {
        $group = static::get($key, config("shop.$key"));

        $group['cards'] = collect($group['cards'] ?? [])
            ->map(fn (array $card) => [
                ...$card,
                'image_url' => ! empty($card['image_path'])
                    ? Storage::disk('public')->url($card['image_path'])
                    : null,
            ])
            ->values()
            ->all();

        return $group;
    }

    public static function marquee(): array
    {
        return static::get('marquee', config('shop.marquee'));
    }

    public static function cta(): array
    {
        return static::get('cta', config('shop.cta'));
    }

    public static function blog(): array
    {
        return static::get('blog', config('shop.blog'));
    }

    public static function newsletter(): array
    {
        return static::get('newsletter', config('shop.newsletter'));
    }

    public static function footer(): array
    {
        return static::get('footer', config('shop.footer'));
    }

    public static function collectionsStrip(): array
    {
        return static::get('collections_strip', config('shop.collections_strip'));
    }

    public static function cookieBanner(): array
    {
        return static::get('cookie_banner', config('shop.cookie_banner'));
    }
}
