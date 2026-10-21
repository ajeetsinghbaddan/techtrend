<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use App\Models\ProductPrice;
use App\Observers\ProductPriceObserver;
use App\Support\CartManager;
use App\Contracts\MachineTranslator;
use App\Support\Translation\MyMemoryDriver;
use App\Support\WishlistManager;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
        $this->app->singleton(\App\Support\ExchangeRates::class);
        $this->app->singleton(\App\Support\ContentTranslator::class);
        $this->app->singleton(\App\Support\StorefrontProps::class);
        $this->app->singleton(\App\Support\Seo\SeoSettings::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        ProductPrice::observe(ProductPriceObserver::class);
        Event::listen(function (Login $event) {
            app(CartManager::class)->mergeOnLogin($event->user->getAuthIdentifier());

        });

        Event::listen(Login::class, function (Login $event) {
            $user = $event->user;

            // The event only promises "something that can log in"; make sure it's our User model.
            if (! $user instanceof User) {
                return;
            }

            app(WishlistManager::class)->mergeOnLogin(request(), $user);
            \App\Support\PreferenceCookies::queue($user);
            $user->forceFill(['last_login_at' => now()])->saveQuietly();
            $user->forceFill(['last_login_at' => now(), 'language' => app()->getLocale()])->saveQuietly();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
