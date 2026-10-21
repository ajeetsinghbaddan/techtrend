<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFooterRequest;
use App\Models\Setting;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class FooterController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/footer', [
            'footer' => Setting::footer(),
        ]);
    }

    public function update(UpdateFooterRequest $request)
    {
        $data = $request->validated();

        $columns = collect($data['columns'])
            ->map(fn (array $column) => [
                'title' => $column['title'],
                'links' => collect($column['links'])
                    ->map(fn (array $link) => Arr::only($link, ['label', 'href']))
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();

        Setting::put('footer', [
            'description' => $data['description'] ?? null,
            'columns' => $columns,
            'copyright' => $data['copyright'] ?? null,
            'badges' => array_values($data['badges']),
        ]);

        return back();
    }
}
