<?php

use App\Http\Controllers\Admin\FeaturesController;
use App\Http\Controllers\Admin\HeaderController;
use App\Http\Controllers\Admin\HeroController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\PromosController;
use App\Http\Controllers\Admin\MarqueeController;
use App\Http\Controllers\Admin\CtaController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\BlogSectionController;
use App\Http\Controllers\Admin\NewsletterController as AdminNewsletterController;
use App\Http\Controllers\Admin\FooterController;
use App\Http\Controllers\Admin\CollectionController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Admin\PageController as AdminPageController;
use App\Http\Controllers\Admin\CookieBannerController;
use App\Http\Controllers\Admin\ProductRowsController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\WishlistController as AdminWishlistController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\SearchInsightsController;
use App\Http\Controllers\Admin\PaymentGatewayController;
use App\Http\Controllers\Admin\AbandonedCartController;
use App\Http\Controllers\Admin\SeoController;

Route::middleware(['auth', 'verified', 'super_admin', 'admin_2fa'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::redirect('/', '/dashboard')->name('dashboard');
        Route::get('header', [HeaderController::class, 'edit'])->name('header.edit');
        Route::put('header', [HeaderController::class, 'update'])->name('header.update');

        Route::get('hero', [HeroController::class, 'edit'])->name('hero.edit');
        Route::put('hero', [HeroController::class, 'update'])->name('hero.update');

        Route::get('features', [FeaturesController::class, 'edit'])->name('features.edit');
        Route::put('features', [FeaturesController::class, 'update'])->name('features.update');

        Route::get('cards/{group}', [PromosController::class, 'edit'])->name('cards.edit');
        Route::put('cards/{group}', [PromosController::class, 'update'])->name('cards.update');

        Route::get('marquee', [MarqueeController::class, 'edit'])->name('marquee.edit');
        Route::put('marquee', [MarqueeController::class, 'update'])->name('marquee.update');

        Route::get('cta', [CtaController::class, 'edit'])->name('cta.edit');
        Route::put('cta', [CtaController::class, 'update'])->name('cta.update');

        Route::resource('posts', PostController::class)->except('show');

        Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

        Route::get('blog-section', [BlogSectionController::class, 'edit'])->name('blog-section.edit');
        Route::put('blog-section', [BlogSectionController::class, 'update'])->name('blog-section.update');

        Route::get('newsletter', [AdminNewsletterController::class, 'index'])->name('newsletter.index');
        Route::put('newsletter/settings', [AdminNewsletterController::class, 'updateSettings'])->name('newsletter.settings');
        Route::get('newsletter/export', [AdminNewsletterController::class, 'export'])->name('newsletter.export');
        Route::delete('newsletter/{subscriber}', [AdminNewsletterController::class, 'destroy'])->name('newsletter.destroy');

        Route::get('footer', [FooterController::class, 'edit'])->name('footer.edit');
        Route::put('footer', [FooterController::class, 'update'])->name('footer.update');

        Route::post('collections/reorder', [CollectionController::class, 'reorder'])->name('collections.reorder');
        Route::resource('collections', CollectionController::class)->except('show');

        Route::get('products/lookup', [ProductRowsController::class, 'lookup'])->name('products.lookup');
        Route::post('products/{product}/images', [ProductController::class, 'addImages'])->name('products.images.add');
        Route::put('products/{product}/images/{image}', [ProductController::class, 'updateImage'])->name('products.images.update');
        Route::delete('products/{product}/images/{image}', [ProductController::class, 'deleteImage'])->name('products.images.delete');
        Route::post('products/{product}/images/reorder', [ProductController::class, 'reorderImages'])->name('products.images.reorder');

        Route::resource('products', ProductController::class)->except('show');

        Route::get('product-rows', [ProductRowsController::class, 'edit'])->name('product-rows.edit');
        Route::put('product-rows', [ProductRowsController::class, 'update'])->name('product-rows.update');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::put('orders/{order}', [OrderController::class, 'update'])->name('orders.update');

        Route::post('pages/images', [AdminPageController::class, 'uploadImage'])->name('pages.images');
        Route::resource('pages', AdminPageController::class)->except('show');

        Route::get('messages', [ContactMessageController::class, 'index'])->name('messages.index');
        Route::get('messages/{message}', [ContactMessageController::class, 'show'])->name('messages.show');
        Route::delete('messages/{message}', [ContactMessageController::class, 'destroy'])->name('messages.destroy');

        Route::get('cookie-banner', [CookieBannerController::class, 'edit'])->name('cookie-banner.edit');
        Route::put('cookie-banner', [CookieBannerController::class, 'update'])->name('cookie-banner.update');

        Route::get('reviews', [AdminReviewController::class, 'index'])->name('reviews.index');
        Route::post('reviews/bulk', [AdminReviewController::class, 'bulk'])->name('reviews.bulk');
        Route::patch('reviews/{review}', [AdminReviewController::class, 'update'])->name('reviews.update');
        Route::delete('reviews/{review}', [AdminReviewController::class, 'destroy'])->name('reviews.destroy');

        Route::get('wishlists', [AdminWishlistController::class, 'index'])->name('wishlists.index');

        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::get('customers/export', [CustomerController::class, 'export'])->middleware('throttle:10,1')->name('customers.export');
        Route::get('customers/{customer}', [CustomerController::class, 'show'])->whereNumber('customer')->name('customers.show');
        Route::patch('customers/{customer}/notes', [CustomerController::class, 'updateNotes'])->whereNumber('customer')->name('customers.notes');
        Route::post('customers/{customer}/block', [CustomerController::class, 'toggleBlock'])->whereNumber('customer')->name('customers.block');
        Route::post('customers/{customer}/verification', [CustomerController::class, 'resendVerification'])->whereNumber('customer')->name('customers.verification');
        Route::post('customers/{customer}/password-reset', [CustomerController::class, 'sendPasswordReset'])
            ->whereNumber('customer')->middleware('throttle:6,1')->name('customers.password-reset');

        Route::get('search-insights', [SearchInsightsController::class, 'index'])->name('search-insights.index');
        Route::delete('search-insights/{id}', [SearchInsightsController::class, 'destroy'])->whereNumber('id')->name('search-insights.destroy');

        Route::get('payments', [PaymentGatewayController::class, 'index'])->name('payments.index');
        Route::put('payments/{gateway}', [PaymentGatewayController::class, 'update'])->name('payments.update');
        Route::delete('payments/{gateway}/credentials', [PaymentGatewayController::class, 'clearCredentials'])->name('payments.credentials.clear');
        Route::post('payments/{gateway}/test', [PaymentGatewayController::class, 'test'])->middleware('throttle:10,1')->name('payments.test');
        Route::post('orders/{order}/mark-paid', [OrderController::class, 'markPaid'])->name('orders.mark-paid');

        Route::post('customers/{customer}/two-factor/reset', [CustomerController::class, 'resetTwoFactor'])
            ->whereNumber('customer')->name('customers.two-factor.reset');

        Route::get('abandoned-carts', [AbandonedCartController::class, 'index'])->name('abandoned-carts.index');
        Route::put('abandoned-carts/settings', [AbandonedCartController::class, 'updateSettings'])->name('abandoned-carts.settings');

        Route::get('seo', [SeoController::class, 'edit'])->name('seo.edit');
        Route::post('seo', [SeoController::class, 'update'])->name('seo.update');

        Route::post('dashboard/refresh', [\App\Http\Controllers\Admin\DashboardController::class, 'refresh'])
            ->name('dashboard.refresh');
    });
