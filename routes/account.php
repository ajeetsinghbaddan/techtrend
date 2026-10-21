<?php

use App\Http\Controllers\Account\AddressController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\OverviewController;
use App\Http\Controllers\Account\SettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('account')->name('account.')->group(function () {
    Route::get('/', OverviewController::class)->name('overview');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{number}', [OrderController::class, 'show'])->name('orders.show');

    Route::get('addresses', [AddressController::class, 'index'])->name('addresses.index');
    Route::post('addresses', [AddressController::class, 'store'])->name('addresses.store');
    Route::put('addresses/{address}', [AddressController::class, 'update'])->whereNumber('address')->name('addresses.update');
    Route::delete('addresses/{address}', [AddressController::class, 'destroy'])->whereNumber('address')->name('addresses.destroy');
    Route::post('addresses/{address}/default/{type}', [AddressController::class, 'makeDefault'])
        ->whereNumber('address')->whereIn('type', ['shipping', 'billing'])->name('addresses.default');

    Route::get('settings', [SettingsController::class, 'edit'])->name('settings');
    Route::patch('settings', [SettingsController::class, 'update'])->name('settings.update');
    Route::get('settings/export', [SettingsController::class, 'export'])
        ->middleware('throttle:3,60')->name('settings.export');
});
