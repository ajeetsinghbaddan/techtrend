<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Support\Seo\Schema;
use App\Support\Seo\Seo;
use App\Support\Seo\SeoSettings;
use App\Support\Storefront;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function show(Request $request, SeoSettings $settings)
    {
        $slug = trim($request->path(), '/');

        // Only single, well-formed addresses can be pages.
        abort_unless(preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1, 404);

        $isAdmin = (bool) $request->user()?->isSuperAdmin();

        $page = Page::where('slug', $slug)
            ->when(! $isAdmin, fn ($q) => $q->published())
            ->firstOrFail();

        $title = $page->tr('title');
        $content = $page->tr('content');
        $description = $page->tr('meta_description') ?: Page::summarise($content);
        $url = url($page->slug);

        $seo = Seo::make()
            ->title($page->tr('meta_title') ?: $title)
            ->description($description)
            ->canonical($url)
            // The page's own share image, then the site default, then the logo.
            ->image($page->og_image_url ?: ($settings->defaultImage() ?: $settings->logo()), $title)
            ->schema($this->pageNode($page, $title, $description, $url))
            ->breadcrumbs([[__('Home'), url('/')], [$title, $url]]);

        // Hidden pages and drafts an admin is previewing: not for search engines.
        if ($page->noindex || ! $page->is_published) {
            $seo->noindex(follow: false);
        }

        return Storefront::render('pages/show', [
            'page' => [
                'title' => $title,
                'slug' => $page->slug,
                'template' => $page->template,
                'content' => $content,
                'is_published' => $page->is_published,
                'updated_at' => $page->updated_at?->toIso8601String(),
            ],
        ], $seo);
    }

    /** What kind of page this is, linked to the site and store described on the homepage. */
    private function pageNode(Page $page, string $title, string $description, string $url): array
    {
        $type = match (true) {
            $page->template === 'contact' => 'ContactPage',
            $page->slug === 'about' => 'AboutPage',
            default => 'WebPage',
        };

        return array_filter([
            '@type' => $type,
            '@id' => $url.'#webpage',
            'name' => $title,
            'description' => $description,
            'url' => $url,
            'inLanguage' => app()->getLocale(),
            'dateModified' => $page->updated_at?->toIso8601String(),
            'isPartOf' => ['@id' => Schema::id('website')],
            'about' => in_array($type, ['ContactPage', 'AboutPage'], true) ? ['@id' => Schema::id('organization')] : null,
        ]);
    }
}
