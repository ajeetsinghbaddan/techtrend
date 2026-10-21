<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateBlogSectionRequest;
use App\Models\Setting;
use Inertia\Inertia;

class BlogSectionController extends Controller
{
    public function edit()
    {
        return Inertia::render('admin/blog-section', [
            'blog' => Setting::blog(),
        ]);
    }

    public function update(UpdateBlogSectionRequest $request)
    {
        Setting::put('blog', [
            'enabled' => $request->boolean('enabled'),
            'title' => $request->validated('title'),
            'subtitle' => $request->validated('subtitle'),
            'count' => (int) $request->validated('count'),
        ]);

        return back();
    }
}
