<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePageRequest;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Mews\Purifier\Facades\Purifier;

class PageController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/pages/index', [
            'pages' => Page::orderBy('title')->get()->map(fn (Page $p) => [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'template' => $p->template,
                'is_published' => $p->is_published,
                'noindex' => $p->noindex,
                'updated_at' => $p->updated_at?->toIso8601String(),
            ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/pages/edit', [
            'page' => null,
            'templates' => Page::TEMPLATES,
        ]);
    }

    public function edit(Page $page)
    {
        return Inertia::render('admin/pages/edit', [
            'page' => [
                ...$page->only(['id', 'title', 'slug', 'template', 'content', 'meta_title',
                    'meta_description', 'is_published', 'noindex']),
                'og_image_url' => $page->og_image_url,
            ],
            'templates' => Page::TEMPLATES,
        ]);
    }

    public function store(StorePageRequest $request)
    {
        $page = new Page();
        $this->save($page, $request);

        return redirect()->route('admin.pages.edit', $page);
    }

    public function update(StorePageRequest $request, Page $page)
    {
        $this->save($page, $request);

        return back();
    }

    public function destroy(Page $page)
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);

        if ($page->og_image_path) {
            Storage::disk('public')->delete($page->og_image_path);
        }

        $page->delete();

        return redirect()->route('admin.pages.index');
    }

    /** Images inserted in the editor. Returns the URL for the editor to use. */
    public function uploadImage(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:3072', 'dimensions:max_width=5000,max_height=5000'],
        ]);

        $path = $request->file('image')->store('pages', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    private function save(Page $page, StorePageRequest $request): void
    {
        $data = $request->safe()->except(['og_image', 'remove_og_image']);

        $data['slug'] = $data['slug'] ?: $this->uniqueSlug($data['title'], $page->id);
        $data['content'] = filled($data['content'] ?? null) ? Purifier::clean($data['content']) : null;
        $data['updated_by'] = $request->user()->id;

        if ($request->boolean('remove_og_image') || $request->hasFile('og_image')) {
            if ($page->og_image_path) {
                Storage::disk('public')->delete($page->og_image_path);
            }
            $data['og_image_path'] = null;
        }

        if ($request->hasFile('og_image')) {
            $data['og_image_path'] = $request->file('og_image')->store('pages/og', 'public');
        }

        $page->fill($data)->save();
    }

    private function uniqueSlug(string $title, ?int $ignoreId): string
    {
        $base = Str::slug($title) ?: 'page';

        if (in_array($base, Page::RESERVED_SLUGS, true)) {
            $base .= '-page';
        }

        $slug = $base;
        $n = 2;

        while (Page::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}
