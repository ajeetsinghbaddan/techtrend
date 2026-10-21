<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProductRowsRequest;
use App\Models\Collection;
use App\Models\Product;
use App\Models\Setting;
use App\Support\ProductRows;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductRowsController extends Controller
{
    public function edit()
    {
        $rows = Setting::get('product_rows', config('shop.product_rows'))['rows'] ?? [];
        $pickedIds = collect($rows)->pluck('product_ids')->flatten()->filter()->unique()->values();

        return Inertia::render('admin/product-rows', [
            'rows' => $rows,
            'collections' => Collection::orderBy('name')->get(['name', 'slug']),
            'products' => $this->lookupQuery()->whereKey($pickedIds)->get()
                ->map(fn (Product $p) => $this->lookupData($p))
                ->values(),
            'sources' => ProductRows::SOURCES,
        ]);
    }

    public function update(UpdateProductRowsRequest $request)
    {
        $rows = collect($request->validated('rows'))
            ->map(fn (array $row) => [
                'id' => ($row['id'] ?? null) ?: (string) Str::uuid(),
                'title' => $row['title'],
                'subtitle' => $row['subtitle'] ?? null,
                'source' => $row['source'],
                'collection_slug' => $row['source'] === 'collection' ? $row['collection_slug'] : null,
                'product_ids' => $row['source'] === 'manual'
                    ? array_values(array_map('intval', $row['product_ids'] ?? []))
                    : [],
                'limit' => (int) $row['limit'],
                'link_label' => $row['link_label'] ?? null,
                'link_href' => $row['link_href'] ?? null,
                'placement' => $row['placement'],
                'enabled' => (bool) $row['enabled'],
            ])
            ->values()
            ->all();

        Setting::put('product_rows', ['rows' => $rows]);

        return back();
    }

    /** Product search for the hand-picked product picker. */
    public function lookup(Request $request): JsonResponse
    {
        $term = Str::of((string) $request->query('q', ''))->squish()->limit(80, '')->value();
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        $products = $this->lookupQuery()
            ->when($term !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', $like)
                ->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', $like))))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json($products->map(fn (Product $p) => $this->lookupData($p))->values());
    }

    private function lookupQuery()
    {
        return Product::query()->with(['images' => fn ($q) => $q->orderBy('position')->limit(1)]);
    }

    private function lookupData(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'image_url' => $product->images->first()?->url,
            'is_active' => $product->is_active,
        ];
    }
}
