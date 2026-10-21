<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCtaRequest;
use App\Models\Setting;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class CtaController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/cta', [
            'cta' => Setting::cta(),
        ]);
    }

    public function update(UpdateCtaRequest $request)
    {
        $data = $request->validated();

        $stats = collect($data['stats'] ?? [])
            ->map(fn (array $stat) => Arr::only($stat, ['value', 'label']))
            ->values()
            ->all();

        Setting::put('cta', [
            ...Arr::only($data, ['eyebrow', 'title', 'text', 'label', 'href']),
            'enabled' => $request->boolean('enabled'),
            'stats' => $stats,
        ]);

        return back();
    }
}
