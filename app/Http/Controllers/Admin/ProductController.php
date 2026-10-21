<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Models\Collection;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    private const CURRENCIES = ['USD', 'EUR', 'GBP', 'SEK', 'PLN'];

    public function index(Request $request)
    {
        $search = $request->string('q')->trim()->value();
        $status = $request->string('status')->value();

        $products = Product::query()
            ->with(['collections:id,name', 'variants:id,product_id,stock,is_active'])
            // Grouped, so the OR stays inside its own brackets: (name LIKE … OR slug LIKE …) AND …
            ->when($search, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$search}%")
                ->orWhere('slug', 'like', "%{$search}%")))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'draft', fn ($q) => $q->where('is_active', false))
            ->orderBy('position')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'is_active' => $p->is_active,
                'stock' => $p->unitsLeft(),
                'variants_count' => $p->variants->count(),
                'collections' => $p->collections->pluck('name'),
            ]);

        return Inertia::render('admin/products/index', [
            'products' => $products,
            'filters' => ['q' => $search, 'status' => $status],
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/products/edit', [
            'product' => null,
            ...$this->editorOptions(),
        ]);
    }

    public function edit(Product $product)
    {
        $product->load(['variants', 'images', 'prices', 'collections:id']);

        return Inertia::render('admin/products/edit', [
            'product' => [
                ...$product->only(['id', 'name', 'slug', 'subtitle', 'description', 'specs',
                    'compliance', 'run_label', 'units_total', 'rating', 'reviews_count',
                    'is_active', 'meta_title', 'meta_description']),
                'collection_ids' => $product->collections->pluck('id'),
                'variants' => $product->variants->map(fn ($v) => $v->only([
                    'id', 'colour_name', 'colour_hex', 'option_name', 'sku',
                    'stock', 'price_adjustment_minor', 'is_active',
                ])),
                'prices' => $product->prices->map(fn ($p) => $p->only(['currency', 'amount_minor', 'compare_at_minor'])),
                'images' => $product->images->map(fn ($i) => [
                    'id' => $i->id,
                    'url' => $i->url,
                    'alt' => $i->alt,
                    'colour_name' => $i->colour_name,
                ]),
            ],
            ...$this->editorOptions(),
        ]);
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $this->save($product, $request);

        return back();
    }

    public function destroy(Product $product)
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);

        foreach ($product->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $product->delete();

        return redirect()->route('admin.products.index');
    }

    public function addImages(Request $request, Product $product)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $request->validate([
            'images' => ['required', 'array', 'max:8'],
            'images.*' => ['image', 'mimes:png,jpg,jpeg,webp', 'max:3072', 'dimensions:max_width=5000,max_height=5000'],
        ]);

        abort_if($product->images()->count() + count($request->file('images')) > 12, 422, 'Maximum 12 images per product.');

        $position = (int) $product->images()->max('position');

        foreach ($request->file('images') as $file) {
            $product->images()->create([
                'path' => $file->store('products', 'public'),
                'position' => ++$position,
            ]);
        }

        return back();
    }

    public function updateImage(Request $request, Product $product, ProductImage $image)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
        abort_unless($image->product_id === $product->id, 404);

        $image->update($request->validate([
            'alt' => ['nullable', 'string', 'max:150'],
            'colour_name' => ['nullable', 'string', 'max:40'],
        ]));

        return back();
    }

    public function deleteImage(Request $request, Product $product, ProductImage $image)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
        abort_unless($image->product_id === $product->id, 404);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }

    public function reorderImages(Request $request, Product $product)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'ids' => ['required', 'array', 'max:12'],
            'ids.*' => ['integer', Rule::exists('product_images', 'id')->where('product_id', $product->id)],
        ]);

        foreach ($data['ids'] as $position => $id) {
            ProductImage::whereKey($id)->where('product_id', $product->id)->update(['position' => $position]);
        }

        return back();
    }

    /** Props the editor needs whether it's creating or editing. */
    private function editorOptions(): array
    {
        return [
            'collections' => Collection::orderBy('name')->get(['id', 'name']),
            'currencies' => self::CURRENCIES,
            'baseCurrency' => config('shop.base_currency'),
        ];
    }

    private function save(Product $product, StoreProductRequest $request): void
    {
        $data = $request->validated();

        DB::transaction(function () use ($product, $data) {
            $product->fill([
                ...Arr::only($data, ['name', 'subtitle', 'description', 'run_label', 'units_total',
                    'rating', 'reviews_count', 'is_active', 'meta_title', 'meta_description']),
                'slug' => $data['slug'] ?: $this->uniqueSlug($data['name'], $product->id),
                'specs' => array_values($data['specs']),
                'compliance' => array_values($data['compliance']),
            ])->save();

            $product->collections()->sync($data['collection_ids']);

            $this->syncVariants($product, $data['variants']);
            $this->syncPrices($product, $data['prices']);
        });

        // Refresh the search index with the final state: variants, collections and prices included.
        $product->is_active ? $product->searchable() : $product->unsearchable();
    }

    private function syncVariants(Product $product, array $variants): void
    {
        $keptIds = [];

        foreach ($variants as $position => $input) {
            $variant = $product->variants()
                ->when($input['id'] ?? null, fn ($q, $id) => $q->whereKey($id))
                ->when(! ($input['id'] ?? null), fn ($q) => $q->whereRaw('1 = 0'))
                ->first() ?? $product->variants()->make();

            $variant->fill([
                ...Arr::only($input, ['colour_name', 'colour_hex', 'option_name', 'sku',
                    'stock', 'price_adjustment_minor', 'is_active']),
                'position' => $position,
            ])->save();

            $keptIds[] = $variant->id;
        }

        $product->variants()->whereNotIn('id', $keptIds)->delete();
    }

    private function syncPrices(Product $product, array $prices): void
    {
        $base = config('shop.base_currency');
        $kept = [];

        foreach ($prices as $input) {
            $currency = $input['currency'];

            if (! in_array($currency, self::CURRENCIES, true)) {
                continue;
            }

            // An empty price for any currency except the base means "convert automatically",
            // so don't store a row for it.
            if ($currency !== $base && (int) ($input['amount_minor'] ?? 0) <= 0) {
                continue;
            }

            $product->prices()->updateOrCreate(
                ['currency' => $currency],
                Arr::only($input, ['amount_minor', 'compare_at_minor']),
            );

            $kept[] = $currency;
        }

        // Removes fixed prices the admin cleared, which turns them back into converted prices.
        $product->prices()->whereNotIn('currency', $kept)->delete();
    }

    private function uniqueSlug(string $name, ?int $ignoreId): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;
        $n = 2;

        while (Product::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }
}
