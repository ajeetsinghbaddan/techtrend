<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHeaderRequest;
use App\Models\Setting;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class HeaderController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/header', [
            'header' => Setting::header(),
        ]);
    }

    public function update(UpdateHeaderRequest $request)
    {
        $data = $request->safe()->except(['logo', 'remove_logo']);

        $current = Setting::get('header', config('shop.header'));
        $data['logo_path'] = $current['logo_path'] ?? null;

        if ($request->boolean('remove_logo') || $request->hasFile('logo')) {
            if ($data['logo_path']) {
                Storage::disk('public')->delete($data['logo_path']);
            }
            $data['logo_path'] = null;
        }

        if ($request->hasFile('logo')) {
            $data['logo_path'] = $request->file('logo')->store('logos', 'public');
        }

        Setting::put('header', $data);

        return back();
    }
}
