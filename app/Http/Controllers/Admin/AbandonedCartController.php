<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CartRecovery;
use App\Models\Setting;
use App\Support\CartReminders;
use App\Support\ExchangeRates;
use App\Support\Money;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AbandonedCartController extends Controller
{
    public function index(CartReminders $reminders, ExchangeRates $rates)
    {
        $since = now()->subDays(30);
        $reached = fn () => CartRecovery::where('reminders_sent', '>', 0)->where('last_reminder_at', '>=', $since);

        $base = $rates->base();
        $toBase = fn (int $minor, ?string $currency) => ! $currency || $currency === $base
            ? $minor
            : (int) round($minor / ($rates->rate($currency) ?: 1));

        $revenue = $reached()->where('status', 'converted')->get(['order_total_minor', 'currency'])
            ->sum(fn ($r) => $toBase((int) $r->order_total_minor, $r->currency));

        $reachedCount = $reached()->count();
        $recovered = $reached()->where('status', 'converted')->count();

        $settings = $reminders->settings();

        return Inertia::render('admin/abandoned-carts', [
            'settings' => [
                'enabled' => (bool) $settings['enabled'],
                'quiet_hours' => (bool) $settings['quiet_hours'],
                'delays' => array_map(fn ($minutes) => round($minutes / 60, 1), array_values($settings['delays'])),
            ],
            'stats' => [
                'reached' => $reachedCount,
                'emails' => (int) $reached()->sum('reminders_sent'),
                'clicked' => $reached()->whereNotNull('clicked_at')->count(),
                'recovered' => $recovered,
                'revenue' => Money::of($revenue, $base)->toArray('en_US')['formatted'],
                'rate' => $reachedCount ? round($recovered / $reachedCount * 100, 1) : 0,
            ],
            'recent' => CartRecovery::query()
                ->with('order:id,number')
                ->latest('updated_at')
                ->limit(30)
                ->get()
                ->map(fn (CartRecovery $r) => [
                    'id' => $r->id,
                    'email' => $r->email,
                    'customer' => $r->user_id !== null,
                    'status' => $r->status,
                    'reminders_sent' => $r->reminders_sent,
                    'value' => $r->value_minor !== null && $r->currency
                        ? Money::of((int) $r->value_minor, $r->currency)->toArray('en_US')['formatted'] : null,
                    'order' => $r->order?->number,
                    'clicked' => $r->clicked_at !== null,
                    'updated_at' => $r->updated_at?->toIso8601String(),
                ]),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'quiet_hours' => ['required', 'boolean'],
            'delays' => ['required', 'array', 'size:3'],
            'delays.*' => ['required', 'numeric', 'min:0.5', 'max:336'],
        ]);

        $minutes = array_map(fn ($hours) => (int) round($hours * 60), $data['delays']);

        if ($minutes !== array_values(array_unique($minutes)) || $minutes !== collect($minutes)->sort()->values()->all()) {
            return back()->withErrors(['delays' => 'Each reminder must come later than the one before.']);
        }

        Setting::put('cart_reminders', [
            'enabled' => $request->boolean('enabled'),
            'quiet_hours' => $request->boolean('quiet_hours'),
            'delays' => $minutes,
        ]);

        return back()->with('admin_notice', 'Bag reminder settings saved.');
    }
}
