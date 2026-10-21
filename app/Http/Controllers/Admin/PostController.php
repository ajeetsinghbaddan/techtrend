<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\Category;
use App\Models\Post;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Mews\Purifier\Facades\Purifier;

class PostController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/posts/index', [
            'posts' => Post::with('category:id,name')
                ->latest('created_at')
                ->paginate(20)
                ->through(fn ($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'slug' => $p->slug,
                    'category' => $p->category?->name,
                    'published_at' => $p->published_at?->toIso8601String(),
                    'is_published' => $p->isPublished(),
                ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/posts/edit', [
            'post' => null,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(Post $post)
    {
        return Inertia::render('admin/posts/edit', [
            'post' => [
                ...$post->only(['id', 'title', 'slug', 'excerpt', 'body', 'category_id',
                    'read_minutes', 'meta_title', 'meta_description']),
                'image_url' => $post->image_url,
                'published_at' => $post->published_at?->format('Y-m-d\TH:i'),
            ],
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StorePostRequest $request)
    {
        $post = new Post(['user_id' => $request->user()->id]);
        $this->save($post, $request);

        return redirect()->route('admin.posts.edit', $post);
    }

    public function update(StorePostRequest $request, Post $post)
    {
        $this->save($post, $request);

        return back();
    }

    public function destroy(Post $post)
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);

        if ($post->image_path) {
            Storage::disk('public')->delete($post->image_path);
        }

        $post->delete();

        return redirect()->route('admin.posts.index');
    }

    private function save(Post $post, StorePostRequest $request): void
    {
        $data = $request->safe()->except(['image', 'remove_image']);

        $data['slug'] = $data['slug'] ?: $this->uniqueSlug($data['title'], $post->id);
        $data['body'] = $data['body'] ? Purifier::clean($data['body']) : null;

        if ($request->boolean('remove_image') || $request->hasFile('image')) {
            if ($post->image_path) {
                Storage::disk('public')->delete($post->image_path);
            }
            $data['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('posts', 'public');
        }

        $post->fill($data)->save();
    }

    private function uniqueSlug(string $title, ?int $ignoreId): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        $n = 2;

        while (Post::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}
