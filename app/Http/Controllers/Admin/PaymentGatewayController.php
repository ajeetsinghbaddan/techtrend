<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use App\Payments\ReceivesWebhooks;
use App\Support\ExchangeRates;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Throwable;

class PaymentGatewayController extends Controller
{
    public function index(ExchangeRates $rates)
    {
        return Inertia::render('admin/payments', [
            'gateways' => PaymentGateway::orderBy('position')->get()->map(fn (PaymentGateway $g) => [
                'key' => $g->key,
                'name' => $g->name,
                'description' => $g->description,
                'enabled' => $g->enabled,
                'mode' => $g->mode,
                'position' => $g->position,
                'regions' => $g->regions ?? [],
                'currencies' => $g->currencies ?? [],
                'settings' => $g->settings ?? (object) [],
                'configured' => $g->isConfigured(),
                'default_currencies' => $g->driverClass()::currencies(),
                'webhook_url' => is_subclass_of($g->driverClass(), ReceivesWebhooks::class)
                    ? route('webhooks.payments', $g->key)
                    : null,
                // Secrets are never sent to the browser: only whether one is saved.
                'fields' => collect($g->driverClass()::fields())->map(fn (array $field, string $key) => [
                    'key' => $key,
                    'label' => $field['label'],
                    'help' => $field['help'] ?? null,
                    'secret' => $field['secret'] ?? false,
                    'required' => $field['required'] ?? true,
                    'has_value' => filled($g->credential($key)),
                    'value' => ($field['secret'] ?? false) ? null : $g->credential($key),
                ])->values(),
            ]),
            'regions' => collect(config('shop.regions'))
                ->map(fn (array $r, string $code) => ['code' => $code, 'label' => $r['label'], 'currency' => $r['currency']])
                ->values(),
            'baseCurrency' => $rates->base(),
        ]);
    }

    public function update(Request $request, PaymentGateway $gateway)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:200'],
            'enabled' => ['required', 'boolean'],
            'mode' => ['required', Rule::in(['test', 'live'])],
            'position' => ['required', 'integer', 'between:0,99'],
            'regions' => ['array'],
            'regions.*' => [Rule::in(array_keys(config('shop.regions')))],
            'currencies' => ['array'],
            'currencies.*' => ['string', 'size:3', 'alpha'],
            'settings.max_total' => ['nullable', 'numeric', 'min:0'],
            'settings.instructions' => ['nullable', 'string', 'max:300'],
            'credentials' => ['array'],
            'credentials.*' => ['nullable', 'string', 'max:500'],
        ]);

        // Merge keys: a blank field means "keep what's saved".
        $credentials = $gateway->credentials ?? [];

        foreach (array_keys($gateway->driverClass()::fields()) as $key) {
            $value = trim((string) ($data['credentials'][$key] ?? ''));

            if ($value !== '') {
                $credentials[$key] = $value;
            }
        }

        $gateway->fill([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'enabled' => $data['enabled'],
            'mode' => $data['mode'],
            'position' => $data['position'],
            'regions' => $data['regions'] ?: null,
            'currencies' => array_map('strtoupper', $data['currencies'] ?? []) ?: null,
            'settings' => array_filter($data['settings'] ?? [], fn ($v) => $v !== null && $v !== ''),
        ]);
        $gateway->credentials = $credentials;

        if ($gateway->enabled && ! $gateway->isConfigured()) {
            return back()->withErrors(["{$gateway->key}.enabled" => 'Add the required keys before switching this method on.']);
        }

        $gateway->save();

        return back()->with('admin_notice', "{$gateway->name} saved.");
    }

    /** Remove all saved keys for a method (and switch it off). */
    public function clearCredentials(PaymentGateway $gateway)
    {
        $gateway->credentials = null;
        $gateway->enabled = $gateway->key === 'cod' ? $gateway->enabled : false;
        $gateway->save();

        return back()->with('admin_notice', "Keys for {$gateway->name} removed.");
    }

    public function test(PaymentGateway $gateway)
    {
        if (! $gateway->isConfigured()) {
            return back()->with('admin_notice', "{$gateway->name}: add the keys first.");
        }

        try {
            return back()->with('admin_notice', "{$gateway->name} ({$gateway->mode} mode): ".$gateway->driver()->test());
        } catch (Throwable $e) {
            return back()->with('admin_notice', "{$gateway->name}: connection failed. ".Str::limit($e->getMessage(), 200));
        }
    }
}
