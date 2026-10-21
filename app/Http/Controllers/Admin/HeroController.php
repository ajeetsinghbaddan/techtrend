<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHeroRequest;
use App\Models\Setting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HeroController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/hero', [
            'hero' => Setting::hero(),
        ]);
    }

    public function update(UpdateHeroRequest $request)
    {
        $disk = Storage::disk('public');

        $saved = collect(Setting::get('hero', config('shop.hero'))['slides'] ?? [])
            ->keyBy('id');

        $slides = [];

        foreach ($request->validated('slides') as $i => $input) {
            $old = $saved->get($input['id'] ?? '');
            $path = $old['image_path'] ?? null;
            $file = $request->file("slides.$i.image");

            if ($file || $request->boolean("slides.$i.remove_image")) {
                if ($path) {
                    $disk->delete($path);
                }
                $path = null;
            }

            if ($file) {
                $path = $file->store('hero', 'public');
            }

            $slides[] = [
                'id' => $old['id'] ?? (string) Str::uuid(),
                ...Arr::only($input, [
                    'eyebrow', 'title', 'text',
                    'primary_label', 'primary_href',
                    'secondary_label', 'secondary_href',
                ]),
                'image_path' => $path,
            ];
        }

        // Delete images belonging to slides the admin removed
        $keptIds = collect($slides)->pluck('id');
        $saved
            ->reject(fn ($slide) => $keptIds->contains($slide['id']))
            ->each(fn ($slide) => empty($slide['image_path']) ?: $disk->delete($slide['image_path']));

        Setting::put('hero', [
            'autoplay' => $request->boolean('autoplay'),
            'delay' => (int) $request->validated('delay'),
            'slides' => $slides,
        ]);

        return back();
    }
}
