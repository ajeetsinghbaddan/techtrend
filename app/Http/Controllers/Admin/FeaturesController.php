<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFeaturesRequest;
use App\Models\Setting;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class FeaturesController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/features', [
            'features' => Setting::features(),
        ]);
    }

    public function update(UpdateFeaturesRequest $request)
    {
        $items = collect($request->validated('items'))
            ->map(fn (array $item) => [
                'title' => $item['title'],
                'text' => $item['text'] ?? null,
                'href' => $item['href'] ?? null,
            ])
            ->values()
            ->all();

        Setting::put('features', ['items' => $items]);

        return back();
    }
}
