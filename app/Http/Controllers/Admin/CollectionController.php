<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCollectionRequest;
use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CollectionController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/collections/index', [
            'collections' => Collection::withCount('products')
                ->orderBy('position')
                ->get()
                ->map(fn (Collection $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'tagline' => $c->tagline,
                    'is_active' => $c->is_active,
                    'products_count' => $c->products_count,
                    'image_url' => $c->image_url,
                ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/collections/edit', ['collection' => null]);
    }

    public function edit(Collection $collection)
    {
        return Inertia::render('admin/collections/edit', [
            'collection' => [
                ...$collection->only(['id', 'name', 'slug', 'tagline', 'description',
                    'is_active', 'meta_title', 'meta_description']),
                'image_url' => $collection->image_url,
            ],
        ]);
    }

    public function store(StoreCollectionRequest $request)
    {
        $collection = new Collection(['position' => (Collection::max('position') ?? 0) + 1]);
        $this->save($collection, $request);

        return redirect()->route('admin.collections.edit', $collection);
    }

    public function update(StoreCollectionRequest $request, Collection $collection)
    {
        $this->save($collection, $request);

        return back();
    }

    public function destroy(Collection $collection)
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);

        if ($collection->image_path) {
            Storage::disk('public')->delete($collection->image_path);
        }

        $collection->delete();

        return redirect()->route('admin.collections.index');
    }

    public function reorder(Request $request)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['required', 'integer', 'exists:collections,id'],
        ]);

        foreach ($data['ids'] as $position => $id) {
            Collection::whereKey($id)->update(['position' => $position]);
        }

        return back();
    }

    private function save(Collection $collection, StoreCollectionRequest $request): void
    {
        $data = $request->safe()->except(['image', 'remove_image']);
        $data['slug'] = $data['slug'] ?: $this->uniqueSlug($data['name'], $collection->id);

        if ($request->boolean('remove_image') || $request->hasFile('image')) {
            if ($collection->image_path) {
                Storage::disk('public')->delete($collection->image_path);
            }
            $data['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('collections', 'public');
        }

        $collection->fill($data)->save();
    }

    private function uniqueSlug(string $name, ?int $ignoreId): string
    {
        $base = Str::slug($name) ?: 'collection';
        $slug = $base;
        $n = 2;

        while (Collection::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}
