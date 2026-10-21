<?php

namespace App\Support\Seo;

use Illuminate\Support\Str;

class Seo
{
    /** Pages that should never appear in search results, by route name. */
    public const NOINDEX_ROUTES = [
        'cart.*', 'checkout.*', 'payments.*', 'account.*', 'wishlist', 'search',
        'cart-reminders.*', 'newsletter.*',
    ];

    private const OG_LOCALES = [
        'en' => 'en_US', 'de' => 'de_DE', 'fr' => 'fr_FR', 'nl' => 'nl_NL', 'sv' => 'sv_SE', 'pl' => 'pl_PL',
    ];

    private ?string $title = null;
    private ?string $description = null;
    private ?string $canonical = null;
    private ?string $image = null;
    private ?string $imageAlt = null;
    private string $type = 'website';
    private bool $index = true;
    private bool $follow = true;
    private array $graph = [];
    private array $properties = [];

    public static function make(): self
    {
        return new self();
    }

    public function title(?string $title): self
    {
        $this->title = filled($title) ? Str::squish(strip_tags($title)) : null;

        return $this;
    }

    public function description(?string $text): self
    {
        $clean = Str::squish(html_entity_decode(strip_tags((string) $text)));
        $this->description = $clean !== '' ? Str::limit($clean, 157) : null;

        return $this;
    }

    public function canonical(?string $url): self
    {
        $this->canonical = $url;

        return $this;
    }

    public function image(?string $url, ?string $alt = null): self
    {
        $this->image = SeoSettings::absolute($url);
        $this->imageAlt = $alt;

        return $this;
    }

    public function type(string $type): self
    {
        $this->type = $type;

        return $this;
    }

    /** Keep this page out of search results; by default links on it are still followed. */
    public function noindex(bool $follow = true): self
    {
        $this->index = false;
        $this->follow = $follow;

        return $this;
    }

    public function schema(?array ...$nodes): self
    {
        foreach ($nodes as $node) {
            if ($node) {
                $this->graph[] = $node;
            }
        }

        return $this;
    }

    public function breadcrumbs(array $trail): self
    {
        return $this->schema(Schema::breadcrumbs($trail));
    }

    /** Extra Open Graph properties, like product:price:amount or article:published_time. */
    public function property(string $name, ?string $content): self
    {
        if (filled($content)) {
            $this->properties[$name] = $content;
        }

        return $this;
    }

    public function toArray(): array
    {
        $settings = app(SeoSettings::class);
        $request = request();
        $site = $settings->siteName();

        $index = $this->index && $settings->indexable() && ! $request->routeIs(self::NOINDEX_ROUTES);
        $canonical = $this->canonical ?? $this->currentUrl();
        $description = $this->description ?? ($settings->get('default_description') ?: null);
        $image = $this->image ?? $settings->defaultImage();

        return [
            'title' => $this->title,
            'full_title' => $this->title ? $this->title.' - '.$site : $site,
            'description' => $description,
            'robots' => match (true) {
                $index && $this->follow => 'index, follow, max-image-preview:large, max-snippet:-1',
                $index => 'index, nofollow',
                $this->follow => 'noindex, follow',
                default => 'noindex, nofollow',
            },
            // A noindexed page shouldn't point search engines anywhere.
            'canonical' => $index ? $canonical : null,
            'og' => array_filter([
                'type' => $this->type,
                'site_name' => $site,
                'title' => $this->title ?? $site,
                'description' => $description,
                'url' => $canonical,
                'image' => $image,
                'image:alt' => $image ? ($this->imageAlt ?? $this->title ?? $site) : null,
                'locale' => self::OG_LOCALES[app()->getLocale()] ?? 'en_US',
            ]),
            'twitter' => array_filter([
                'card' => $image ? 'summary_large_image' : 'summary',
                'site' => $settings->get('twitter_handle'),
            ]),
            'properties' => $this->properties,
            'json_ld' => $this->graph
                ? json_encode(['@context' => 'https://schema.org', '@graph' => $this->graph],
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP)
                : null,
        ];
    }

    /** This page's address without filters or tracking tags; page 2+ keeps its page number. */
    private function currentUrl(): string
    {
        $page = (int) request()->query('page', 1);

        return request()->url().($page > 1 ? '?page='.$page : '');
    }
}
