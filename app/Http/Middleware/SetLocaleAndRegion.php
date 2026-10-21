<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleAndRegion
{
    public function handle(Request $request, Closure $next): Response
    {
        // Supported codes come from config/shop.php
        $locales = array_keys(config('shop.locales'));
        $regions = array_keys(config('shop.regions'));

        // Language: valid cookie → browser preference → English
        $cookieLocale = $request->cookie('locale');
        $locale = in_array($cookieLocale, $locales, true)
            ? $cookieLocale
            : ($request->getPreferredLanguage($locales) ?? config('app.locale'));

        app()->setLocale($locale);

        // Region: valid cookie → IP country → default (US)
        $country = $request->cookie('region') ?? $request->header('CF-IPCountry');
        $region = in_array($country, $regions, true)
            ? $country
            : config('shop.default_region');

        $request->attributes->set('region', $region);

        return $next($request);
    }
}
