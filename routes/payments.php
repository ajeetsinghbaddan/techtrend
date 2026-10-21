<?php

use App\Http\Controllers\PaymentWebhookController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartRecoveryController;

Route::post('webhooks/payments/{gateway}', [PaymentWebhookController::class, 'handle'])
    ->whereIn('gateway', ['stripe', 'razorpay'])
    ->name('webhooks.payments');

Route::post('payments/paytm/callback', [PaymentWebhookController::class, 'paytmCallback'])
    ->name('payments.paytm.callback');

Route::post('email/unsubscribe/cart/{token}', [CartRecoveryController::class, 'oneClick'])
    ->where('token', '[A-Za-z0-9]{48}')->name('cart-reminders.one-click');
