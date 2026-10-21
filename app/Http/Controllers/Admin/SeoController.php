<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Setting;
use App\Support\Seo\SeoSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SeoController extends Controller
{
    public function edit(SeoSettings $settings)
    {
        $banner = Setting::cookieBanner();

        return Inertia::render('admin/seo', [
            'settings' => [...$settings->all(), 'default_image_url' => $settings->defaultImage()],
            'regions' => collect(config('shop.regions'))->map(fn ($r, $code) => ['code' => $code, 'label' => $r['label']])->values(),
            'health' => [
                'production' => app()->isProduction(),
                'indexable' => $settings->indexable(),
                'google_verification' => filled($settings->get('google_verification')),
                'analytics' => filled($banner['ga_measurement_id'] ?? null),
                'logo' => $settings->logo() !== null,
                'default_image' => $settings->defaultImage() !== null,
                'products_without_description' => Product::active()
                    ->where(fn ($q) => $q->whereNull('meta_description')->orWhere('meta_description', ''))
                    ->where(fn ($q) => $q->whereNull('subtitle')->orWhere('subtitle', ''))
                    ->count(),
                'products_without_images' => Product::active()->doesntHave('images')->count(),
                'images_without_alt' => ProductImage::where(fn ($q) => $q->whereNull('alt')->orWhere('alt', ''))->count(),
            ],
            'links' => [
                'sitemap' => url('/sitemap.xml'),
                'robots' => url('/robots.txt'),
                'home' => url('/'),
            ],
        ]);
    }

    public function update(Request $request, SeoSettings $settings)
    {
        $data = $request->validate([
            'site_name' => ['nullable', 'string', 'max:60'],
            'default_description' => ['nullable', 'string', 'max:300'],
            'twitter_handle' => ['nullable', 'string', 'max:30', 'regex:/^@?[A-Za-z0-9_]+$/'],
            'indexing' => ['required', 'boolean'],
            'google_verification' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'bing_verification' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'organization.legal_name' => ['nullable', 'string', 'max:120'],
            'organization.email' => ['nullable', 'email:rfc', 'max:254'],
            'organization.phone' => ['nullable', 'string', 'max:30'],
            'organization.street' => ['nullable', 'string', 'max:120'],
            'organization.city' => ['nullable', 'string', 'max:80'],
            'organization.postcode' => ['nullable', 'string', 'max:20'],
            'organization.country' => ['nullable', 'string', 'size:2'],
            'organization.same_as' => ['array', 'max:10'],
            'organization.same_as.*' => ['url', 'max:255'],
            'returns.days' => ['required', 'integer', 'min:14', 'max:365'],
            'returns.free' => ['required', 'boolean'],
            'default_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096', 'dimensions:min_width=600,min_height=315'],
            'remove_default_image' => ['sometimes', 'boolean'],
        ]);

        $current = $settings->all();
        $image = $current['default_image'];

        if ($request->boolean('remove_default_image') && $image) {
            Storage::disk('public')->delete($image);
            $image = null;
        }

        if ($request->hasFile('default_image')) {
            if ($image) {
                Storage::disk('public')->delete($image);
            }
            $image = $request->file('default_image')->store('seo', 'public');
        }

        Setting::put('seo', [
            'site_name' => $data['site_name'] ?? null,
            'default_description' => $data['default_description'] ?? '',
            'twitter_handle' => filled($data['twitter_handle'] ?? null) ? '@'.ltrim($data['twitter_handle'], '@') : null,
            'indexing' => $request->boolean('indexing'),
            'google_verification' => $data['google_verification'] ?? null,
            'bing_verification' => $data['bing_verification'] ?? null,
            'organization' => [
                ...$data['organization'] ?? [],
                'country' => isset($data['organization']['country']) ? strtoupper($data['organization']['country']) : null,
                'same_as' => array_values(array_filter($data['organization']['same_as'] ?? [])),
            ],
            'returns' => ['days' => (int) $data['returns']['days'], 'free' => $request->boolean('returns.free')],
            'default_image' => $image,
        ]);

        // Settings shape the sitemaps and robots.txt: rebuild them on the next request.
        foreach (['index', ...\App\Http\Controllers\SitemapController::TYPES] as $key) {
            Cache::forget("sitemap.{$key}");
        }

        return back()->with('admin_notice', 'SEO settings saved.');
    }
}
