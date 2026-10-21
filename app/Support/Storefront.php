<?php

namespace App\Support;

use App\Support\Seo\Seo;
use Inertia\Inertia;
use Inertia\Response;

class Storefront
{
    /** Inertia::render for customer-facing pages: every text translated, plus SEO tags. */
    public static function render(string $component, array $props = [], ?Seo $seo = null): Response
    {
        $props = app(StorefrontProps::class)->localize($props);
        $props['seo'] = ($seo ?? Seo::make())->toArray();

        return Inertia::render($component, $props);
    }
}
