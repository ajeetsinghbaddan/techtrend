<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => DB::table('search_logs')->where('last_searched_at', '<', now()->subYear())->delete())
    ->daily()
    ->name('prune-search-logs');
Schedule::command('rates:fetch')->dailyAt('17:30')->timezone('Europe/Berlin');
Schedule::command('scout:import', ['App\\Models\\Product'])->dailyAt('03:15');
Schedule::command('model:prune')->daily();
Schedule::command('orders:expire-unpaid')->everyTenMinutes();
Schedule::command('carts:send-reminders')->everyFifteenMinutes()->withoutOverlapping();
