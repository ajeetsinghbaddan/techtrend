<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Support\Seo\SeoSettings;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SitemapController extends Controller
{
    public const TYPES = ['pages', 'collections', 'products', 'posts'];

    public function __construct(private readonly SeoSettings $settings)
    {
    }

    public function robots()
    {
        $lines = $this->settings->indexable()
            ? [
                'User-agent: *',
                'Disallow: /admin',
                'Disallow: /dashboard',
                'Disallow: /settings',
                'Disallow: /account',
                'Disallow: /bag',
                'Disallow: /checkout',
                'Disallow: /payments',
                'Disallow: /wishlist',
                'Disallow: /search',
                'Disallow: /*?*sort=',
                '',
                'Sitemap: '.url('/sitemap.xml'),
            ]
            : ['User-agent: *', 'Disallow: /'];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function index()
    {
        abort_unless($this->settings->indexable(), 404);

        $xml = Cache::remember('sitemap.index', now()->addHour(), function () {
            $out = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
            $out .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

            foreach (self::TYPES as $type) {
                $out .= '<sitemap><loc>'.e(url("/sitemaps/{$type}.xml")).'</loc></sitemap>'."\n";
            }

            return $out.'</sitemapindex>';
        });

        return $this->xml($xml);
    }

    public function show(string $type)
    {
        abort_unless($this->settings->indexable(), 404);

        return $this->xml(Cache::remember("sitemap.{$type}", now()->addHour(), fn () => $this->build($type)));
    }

    private function build(string $type): string
    {
        $out = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $out .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'."\n";

        foreach ($this->entries($type) as $entry) {
            $out .= '<url><loc>'.e($entry['loc']).'</loc>';

            if (! empty($entry['lastmod'])) {
                $out .= '<lastmod>'.$entry['lastmod']->toAtomString().'</lastmod>';
            }

            foreach ($entry['images'] ?? [] as $image) {
                $out .= '<image:image><image:loc>'.e($image).'</image:loc></image:image>';
            }

            $out .= '</url>'."\n";
        }

        return $out.'</urlset>';
    }

    /** @return iterable<array{loc: string, lastmod?: mixed, images?: string[]}> */
    private function entries(string $type): iterable
    {
        if ($type === 'pages') {
            foreach (['/', '/collections', '/products', '/blog'] as $path) {
                yield ['loc' => url($path)];
            }

            $pages = Page::query();

            if (method_exists(Page::class, 'scopePublished')) {
                $pages->published();
            }

            if (Schema::hasColumn('pages', 'noindex')) {
                $pages->where('noindex', false);
            }

            foreach ($pages->lazyById(500) as $page) {
                yield ['loc' => url('/'.$page->slug), 'lastmod' => $page->updated_at];
            }
        }

        if ($type === 'collections') {
            foreach (Collection::active()->lazyById(500) as $collection) {
                yield ['loc' => url('/collections/'.$collection->slug), 'lastmod' => $collection->updated_at];
            }
        }

        if ($type === 'products') {
            $products = Product::active()->with(['images' => fn ($q) => $q->orderBy('position')]);

            foreach ($products->lazyById(200) as $product) {
                yield [
                    'loc' => route('products.show', $product),
                    'lastmod' => $product->updated_at,
                    'images' => $product->images->take(5)
                        ->map(fn ($image) => SeoSettings::absolute($image->url))->filter()->all(),
                ];
            }
        }

        if ($type === 'posts') {
            foreach (Post::published()->lazyById(500) as $post) {
                yield ['loc' => url('/blog/'.$post->slug), 'lastmod' => $post->updated_at ?? $post->published_at];
            }
        }
    }

    private function xml(string $content)
    {
        return response($content, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
