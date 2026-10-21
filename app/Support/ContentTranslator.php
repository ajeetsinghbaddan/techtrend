<?php

namespace App\Support;

use App\Jobs\TranslateContent;
use App\Models\ContentTranslation;
use Illuminate\Support\Facades\Cache;

class ContentTranslator
{
    public const SKIP_KEYS = [
        'id', 'slug', 'href', 'link_href', 'primary_href', 'secondary_href', 'collection_slug',
        'image_path', 'image_url', 'logo_path', 'logo_url', 'colour_hex', 'box_position',
        'source', 'direction', 'notify_email', 'currency',
        'position', 'placement', 'policy_href', 'ga_measurement_id', 'plausible_domain',
    ];

    /** [locale => [hash => translation]] loaded this request */
    private array $loaded = [];

    /** [locale => [translation => true]] to recognise text that is already translated */
    private array $reverse = [];

    public static function translatable(mixed $key, mixed $value): bool
    {
        return is_string($value)
            && trim($value) !== ''
            && ! in_array($key, self::SKIP_KEYS, true)
            && ! str_starts_with($value, '/')
            && ! str_starts_with($value, 'http');
    }

    public static function forget(string $locale): void
    {
        Cache::forget("ct.map.{$locale}");
    }

    public function get(?string $text, ?string $locale = null, bool $queueMissing = false, bool $html = false): ?string
    {
        $locale ??= app()->getLocale();

        if ($text === null || trim($text) === '' || $locale === 'en') {
            return $text;
        }

        $map = $this->map($locale);
        $hash = sha1($text);

        if (isset($map[$hash])) {
            return $map[$hash];
        }

        if ($queueMissing && ! $this->isAlreadyTranslated($text, $locale)) {
            $this->queue($text, $html);
        }

        return $text;
    }

    public function deep(array $data): array
    {
        array_walk_recursive($data, function (&$value, $key) {
            if (self::translatable($key, $value)) {
                $value = $this->get($value);
            }
        });

        return $data;
    }

    private function map(string $locale): array
    {
        return $this->loaded[$locale] ??= Cache::rememberForever(
            "ct.map.{$locale}",
            fn () => ContentTranslation::where('locale', $locale)->pluck('text', 'source_hash')->all(),
        );
    }

    /** True if $text is itself a translation (so we don't translate French as if it were English). */
    private function isAlreadyTranslated(string $text, string $locale): bool
    {
        $this->reverse[$locale] ??= array_fill_keys($this->map($locale), true);

        return isset($this->reverse[$locale][$text]);
    }

    /** Queue once per day per text, however many pages show it. */
    private function queue(string $text, bool $html): void
    {
        if (Cache::add('ct.queued.'.sha1($text), true, now()->addDay())) {
            TranslateContent::dispatch($text, $html);
        }
    }
}
