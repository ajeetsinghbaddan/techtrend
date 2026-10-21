<?php

use App\Http\Controllers\ShopController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\CartRecoveryController;

Route::get('collections', [ShopController::class, 'collections'])->name('collections.index');
Route::get('collections/{collection}', [ShopController::class, 'listing'])->name('collections.show');
Route::get('products', [ShopController::class, 'listing'])->name('products.index');
Route::get('products/{product}', [ShopController::class, 'product'])->name('products.show');

Route::get('bag', [CartController::class, 'show'])->name('cart.show');
Route::post('bag', [CartController::class, 'store'])->middleware('throttle:60,1')->name('cart.store');
Route::patch('bag/{item}', [CartController::class, 'update'])->name('cart.update');
Route::delete('bag/{item}', [CartController::class, 'destroy'])->name('cart.destroy');

Route::get('checkout', [CheckoutController::class, 'show'])->name('checkout.show');
Route::post('checkout/quote', [CheckoutController::class, 'quote'])->name('checkout.quote');
Route::post('checkout', [CheckoutController::class, 'store'])
    ->middleware('throttle:10,1')->name('checkout.store');
Route::get('checkout/{order}/confirmation', [CheckoutController::class, 'confirmation'])
    ->name('checkout.confirmation');
Route::get('search', [SearchController::class, 'index'])
    ->middleware('throttle:60,1')->name('search');
Route::get('search/suggest', [SearchController::class, 'suggest'])
    ->middleware('throttle:120,1')->name('search.suggest');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('products/{product}/review', [ReviewController::class, 'write'])->name('reviews.write');
    Route::post('products/{product}/reviews', [ReviewController::class, 'store'])
        ->middleware('throttle:10,60')->name('reviews.store');
    Route::delete('products/{product}/reviews', [ReviewController::class, 'destroy'])->name('reviews.destroy');
    Route::post('reviews/{review}/helpful', [ReviewController::class, 'vote'])
        ->middleware('throttle:60,1')->name('reviews.vote');
});

Route::get('wishlist', [WishlistController::class, 'index'])->name('wishlist');
Route::post('wishlist/{product}', [WishlistController::class, 'toggle'])
    ->middleware('throttle:60,1')->name('wishlist.toggle');

Route::get('checkout/{order}/pay', [PaymentController::class, 'show'])->name('payments.show');
Route::post('checkout/{order}/pay', [PaymentController::class, 'start'])->middleware('throttle:10,1')->name('payments.start');
Route::get('payments/{payment}/return', [PaymentController::class, 'return'])->name('payments.return');
Route::get('payments/{payment}/cancel', [PaymentController::class, 'cancel'])->name('payments.cancel');
Route::post('payments/{payment}/verify', [PaymentController::class, 'verify'])->middleware('throttle:20,1')->name('payments.verify');

Route::post('checkout/email', [CartRecoveryController::class, 'capture'])
    ->middleware('throttle:20,1')->name('checkout.email');

Route::get('bag/restore/{token}', [CartRecoveryController::class, 'showRestore'])
    ->where('token', '[A-Za-z0-9]{48}')->name('cart.restore');
Route::post('bag/restore/{token}', [CartRecoveryController::class, 'restore'])
    ->where('token', '[A-Za-z0-9]{48}')->middleware('throttle:20,1');

Route::get('bag/reminders/unsubscribe/{token}', [CartRecoveryController::class, 'showUnsubscribe'])
    ->where('token', '[A-Za-z0-9]{48}')->name('cart-reminders.unsubscribe');
Route::post('bag/reminders/unsubscribe/{token}', [CartRecoveryController::class, 'unsubscribe'])
    ->where('token', '[A-Za-z0-9]{48}');
