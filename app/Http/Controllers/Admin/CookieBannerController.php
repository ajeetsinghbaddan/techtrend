<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCookieBannerRequest;
use App\Models\ConsentLog;
use App\Models\Setting;
use Inertia\Inertia;

class CookieBannerController extends Controller
{
    public function edit()
    {
        $recent = ConsentLog::where('created_at', '>=', now()->subDays(30));
        $total = (clone $recent)->count();

        return Inertia::render('admin/cookie-banner', [
            'banner' => Setting::cookieBanner(),
            'stats' => [
                'total' => $total,
                'analytics_rate' => $total ? round((clone $recent)->where('analytics', true)->count() / $total * 100) : null,
                'marketing_rate' => $total ? round((clone $recent)->where('marketing', true)->count() / $total * 100) : null,
            ],
        ]);
    }

    public function update(UpdateCookieBannerRequest $request)
    {
        $current = Setting::cookieBanner();
        $data = $request->safe()->except('ask_again');

        $data['version'] = (int) ($current['version'] ?? 1) + ($request->boolean('ask_again') ? 1 : 0);

        Setting::put('cookie_banner', $data);

        return back();
    }
}
