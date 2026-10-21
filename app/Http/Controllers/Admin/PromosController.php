<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePromosRequest;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PromosController extends Controller
{
    private const GROUPS = [
        'promos' => ['title' => 'Promo cards', 'min' => 2, 'max' => 3],
        'explore' => ['title' => 'Explore cards', 'min' => 2, 'max' => 4],
    ];

    public function edit(string $group)
    {
        abort_unless(isset(self::GROUPS[$group]), 404);

        return Inertia::render('admin/promos', [
            'group' => $group,
            'meta' => self::GROUPS[$group],
            'promos' => Setting::cards($group),
        ]);
    }

    public function update(UpdatePromosRequest $request, string $group)
    {
        abort_unless(isset(self::GROUPS[$group]), 404);

        $disk = Storage::disk('public');
        $saved = collect(Setting::get($group, config("shop.$group"))['cards'] ?? [])->keyBy('id');
        $cards = [];

        foreach ($request->validated('cards') as $i => $input) {
            $old = $saved->get($input['id'] ?? '');
            $path = $old['image_path'] ?? null;
            $file = $request->file("cards.$i.image");

            if ($file || $request->boolean("cards.$i.remove_image")) {
                if ($path) {
                    $disk->delete($path);
                }
                $path = null;
            }

            if ($file) {
                $path = $file->store($group, 'public');
            }

            $cards[] = [
                'id' => $old['id'] ?? (string) Str::uuid(),
                ...Arr::only($input, ['title', 'text', 'label', 'href', 'box_position']),
                'image_path' => $path,
            ];
        }

        $keptIds = collect($cards)->pluck('id');
        $saved->reject(fn ($card) => $keptIds->contains($card['id']))
            ->each(fn ($card) => empty($card['image_path']) ?: $disk->delete($card['image_path']));

        Setting::put($group, ['cards' => $cards]);

        return back();
    }
}
