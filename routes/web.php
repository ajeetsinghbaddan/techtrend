<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\CookieConsentController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PreferenceController;
use App\Models\Collection;
use App\Models\Post;
use App\Models\Setting;
use App\Support\ContentTranslator;
use App\Support\ProductRows;
use App\Support\Storefront;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Support\Seo\Schema;
use App\Support\Seo\Seo;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\Admin\DashboardController;

Route::get('/', function (Request $request) {
    $region = $request->attributes->get('region', config('shop.default_region'));
    $tr = app(ContentTranslator::class);
    $strip = Setting::collectionsStrip();

    return Storefront::render('welcome', [
        'hero' => $tr->deep(Setting::hero()),
        'features' => $tr->deep(Setting::features()),
        'promos' => $tr->deep(Setting::cards('promos')),
        'marquee' => $tr->deep(Setting::marquee()),
        'explore' => $tr->deep(Setting::cards('explore')),
        'cta' => $tr->deep(Setting::cta()),
        'blog' => $tr->deep(Setting::blog()),
        'posts' => Post::published()
            ->with('category:id,name,slug')
            ->latest('published_at')
            ->take(Setting::blog()['count'] ?? 4)
            ->get()
            ->map(fn ($p) => [
                'title' => $p->tr('title'),
                'slug' => $p->slug,
                'read_minutes' => $p->read_minutes,
                'image_url' => $p->image_url,
                'published_at' => $p->published_at?->toIso8601String(),
                'category' => $p->category?->only('name', 'slug'),
            ]),
        'newsletter' => $tr->deep(Arr::except(Setting::newsletter(), ['notify_email'])),
        'collectionsStrip' => $tr->deep($strip),
        'collections' => Collection::active()->orderBy('position')
            ->take($strip['limit'] ?? 7)->get()
            ->map(fn (Collection $c) => [
                'name' => $c->tr('name'),
                'slug' => $c->slug,
                'image_url' => $c->image_url,
            ]),
        'productRows' => ProductRows::forHomepage($region),
    ], Seo::make()
        ->canonical(url('/'))
        ->schema(Schema::organization(), Schema::website()));
})->name('home');

// Where everyone lands after logging in or registering: admins in the
// admin panel, customers in their account. The name stays "dashboard"
// because the starter kit's login and registration redirect to it.
Route::get('dashboard', DashboardController::class)
    ->middleware(['auth', 'admin_2fa'])
    ->name('dashboard');

Route::post('preferences', [PreferenceController::class, 'update'])
    ->middleware('throttle:30,1')
    ->name('preferences.update');

Route::post('newsletter', [NewsletterController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('newsletter.store');

Route::middleware('signed')->group(function () {
    Route::get('newsletter/confirm/{token}', [NewsletterController::class, 'showConfirm'])->name('newsletter.confirm');
    Route::post('newsletter/confirm/{token}', [NewsletterController::class, 'confirm']);
    Route::get('newsletter/unsubscribe/{token}', [NewsletterController::class, 'showUnsubscribe'])->name('newsletter.unsubscribe');
    Route::post('newsletter/unsubscribe/{token}', [NewsletterController::class, 'unsubscribe']);
});

Route::post('contact-messages', [ContactController::class, 'store'])
    ->middleware('throttle:5,10')
    ->name('contact.store');

Route::post('cookie-consent', [CookieConsentController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('cookie-consent.store');

Route::get('robots.txt', [SitemapController::class, 'robots']);
Route::get('sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('sitemaps/{type}.xml', [SitemapController::class, 'show'])
    ->whereIn('type', SitemapController::TYPES)->name('sitemap.show');

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
require __DIR__.'/blog.php';
require __DIR__.'/shop.php';
require __DIR__.'/account.php';

// Must stay last: any address no other route matched is looked up as a page.
Route::fallback([PageController::class, 'show']);
