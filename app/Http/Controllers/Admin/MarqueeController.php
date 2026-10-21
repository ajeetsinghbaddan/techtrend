<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMarqueeRequest;
use App\Models\Setting;
use Inertia\Inertia;

class MarqueeController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/marquee', [
            'marquee' => Setting::marquee(),
        ]);
    }

    public function update(UpdateMarqueeRequest $request)
    {
        Setting::put('marquee', [
            'enabled' => $request->boolean('enabled'),
            'speed' => (int) $request->validated('speed'),
            'direction' => $request->validated('direction'),
            'items' => array_values($request->validated('items')),
        ]);

        return back();
    }
}
