<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use App\Support\CartManager;
use App\Support\ContentTranslator;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Support\WishlistManager;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'isSuperAdmin' => (bool) $request->user()?->isSuperAdmin(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'header' => fn () => app(ContentTranslator::class)->deep(Setting::header()),
            'footer' => fn () => app(ContentTranslator::class)->deep(Setting::footer()),
            'locale' => fn () => app()->getLocale(),
            'region' => fn () => $request->attributes->get('region', config('shop.default_region')),
            'locales' => fn () => config('shop.locales'),
            'regions' => fn () => config('shop.regions'),
            'cartCount' => fn () => app(CartManager::class)->summary()['count'],
            'flash' => fn () => [
                'cart_notice' => $request->session()->get('cart_notice'),
                'quote' => $request->session()->get('quote'),
                'review_notice' => $request->session()->get('review_notice'),
            ],
            'translations' => fn () => $this->translations(app()->getLocale()),
            'cookieBanner' => fn () => app(ContentTranslator::class)->deep(Setting::cookieBanner()),
            'wishlist' => fn () => app(WishlistManager::class)->slugs($request),
            'admin_notice' => $request->session()->get('admin_notice'),
            'payment_notice' => $request->session()->get('payment_notice'),
            'payment_action' => $request->session()->get('payment_action'),
        ];
    }

    private function translations(string $locale): array
    {
        $path = lang_path("{$locale}.json");

        return is_file($path) ? (json_decode(file_get_contents($path), true) ?? []) : [];
    }
}
