<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Post;
use App\Support\Seo\Schema;
use App\Support\Seo\Seo;
use App\Support\Seo\SeoSettings;
use App\Support\Storefront;
use Illuminate\Http\Request;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        return Storefront::render('blog/index', [
            'posts' => $this->listQuery($request)
                ->paginate(12)
                ->withQueryString()
                ->through(fn ($post) => $this->cardData($post)),
            'categories' => Category::orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only('q'),
            'category' => null,
        ], $this->listingSeo($request, __('Blog'), __('News, guides and stories from :site.', [
            'site' => app(SeoSettings::class)->siteName(),
        ])));
    }

    public function category(Request $request, Category $category)
    {
        $name = $category->tr('name');

        return Storefront::render('blog/index', [
            'posts' => $this->listQuery($request)
                ->where('category_id', $category->id)
                ->paginate(12)
                ->withQueryString()
                ->through(fn ($post) => $this->cardData($post)),
            'categories' => Category::orderBy('name')->get(['name', 'slug']),
            'filters' => $request->only('q'),
            'category' => ['name' => $name, 'slug' => $category->slug],
        ], $this->listingSeo($request, $name, __('Articles about :topic.', ['topic' => $name]), $name));
    }

    public function show(Post $post)
    {
        abort_unless($post->isPublished(), 404);

        $post->load('category:id,name,slug');

        $url = url('/blog/'.$post->slug);
        $title = $post->tr('title');
        $image = SeoSettings::absolute($post->image_url);

        $seo = Seo::make()
            ->title($post->tr('meta_title') ?: $title)
            ->description($post->tr('meta_description') ?: ($post->tr('excerpt') ?: $post->tr('body')))
            ->canonical($url)
            ->image($image, $title)
            ->type('article')
            ->property('article:published_time', $post->published_at?->toIso8601String())
            ->property('article:modified_time', $post->updated_at?->toIso8601String())
            ->property('article:section', $post->category?->tr('name'))
            ->schema(Schema::article($post, $url, $image))
            ->breadcrumbs([
                [__('Home'), url('/')],
                [__('Blog'), url('/blog')],
                [$post->category?->tr('name'), $post->category ? route('blog.category', $post->category) : null],
                [$title, $url],
            ]);

        return Storefront::render('blog/show', [
            'post' => [
                ...$post->only([
                    'title', 'slug', 'excerpt', 'body', 'read_minutes',
                    'meta_title', 'meta_description',
                ]),
                'title' => $title,
                'excerpt' => $post->tr('excerpt'),
                'body' => $post->tr('body'),
                'image_url' => $post->image_url,
                'published_at' => $post->published_at?->toIso8601String(),
                'category' => $post->category?->only('name', 'slug'),
            ],
            'related' => Post::published()
                ->with('category:id,name,slug')
                ->where('id', '!=', $post->id)
                ->when($post->category_id, fn ($q) => $q->where('category_id', $post->category_id))
                ->latest('published_at')
                ->take(3)
                ->get()
                ->map(fn ($p) => $this->cardData($p)),
        ], $seo);
    }

    /* ---------- helpers ---------- */

    /** SEO for the blog index and category pages. */
    private function listingSeo(Request $request, string $title, string $description, ?string $crumb = null): Seo
    {
        $page = max(1, (int) $request->query('page', 1));
        $base = $request->url();

        $seo = Seo::make()
            ->title($title.($page > 1 ? ' – '.__('Page :page', ['page' => $page]) : ''))
            ->description($description)
            ->canonical($page > 1 ? "{$base}?page={$page}" : $base)
            ->breadcrumbs(array_filter([
                [__('Home'), url('/')],
                [__('Blog'), url('/blog')],
                $crumb ? [$crumb, $base] : null,
            ]));

        // Search results within the blog are not pages of their own.
        return filled($request->query('q')) ? $seo->noindex() : $seo;
    }

    private function listQuery(Request $request)
    {
        return Post::published()
            ->with('category:id,name,slug')
            ->when($request->string('q')->trim()->value(), function ($query, string $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $query->where(fn ($q) => $q
                    ->where('title', 'like', $like)
                    ->orWhere('excerpt', 'like', $like));
            })
            ->latest('published_at');
    }

    private function cardData(Post $post): array
    {
        return [
            'title' => $post->tr('title'),
            'slug' => $post->slug,
            'excerpt' => $post->tr('excerpt'),
            'read_minutes' => $post->read_minutes,
            'image_url' => $post->image_url,
            'published_at' => $post->published_at?->toIso8601String(),
            'category' => $post->category?->only('name', 'slug'),
        ];
    }
}
