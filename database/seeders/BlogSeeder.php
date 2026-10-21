<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BlogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect(['Build log', 'Guide', 'Teardown', 'Shipping'])
            ->mapWithKeys(fn (string $name) => [
                $name => Category::firstOrCreate(
                    ['slug' => Str::slug($name)],
                    ['name' => $name],
                ),
            ]);

        $author = User::where('is_super_admin', true)->first() ?? User::first();

        $posts = [
            ['What a gasket mount actually changes', 'Build log', 6, 2],
            ["ISO vs ANSI: picking a layout you'll keep", 'Guide', 9, 9],
            ['Inside run 05, and the two things we fixed', 'Teardown', 7, 17],
            ['How DDP works when you order from abroad', 'Shipping', 4, 24],
            ['Lubing switches without ruining them', 'Guide', 11, 31],
            ['Why our keycaps are PBT and not ABS', 'Build log', 5, 38],
            ['The foam question, tested properly', 'Teardown', 8, 45],
            ['Flashing QMK without the command line', 'Guide', 6, 52],
            ['What a 400-unit production window looks like', 'Build log', 10, 60],
        ];

        foreach ($posts as [$title, $category, $minutes, $daysAgo]) {
            Post::updateOrCreate(
                ['slug' => Str::slug($title)],
                [
                    'title' => $title,
                    'category_id' => $categories[$category]->id,
                    'user_id' => $author?->id,
                    'excerpt' => $this->excerpt($title),
                    'body' => $this->body($title),
                    'read_minutes' => $minutes,
                    'meta_description' => $this->excerpt($title),
                    'published_at' => now()->subDays($daysAgo),
                ],
            );
        }
    }

    private function excerpt(string $title): string
    {
        return "A short summary for \"{$title}\". Replace this with real copy before launch.";
    }

    private function body(string $title): string
    {
        return <<<HTML
        <p>This is placeholder content for <strong>{$title}</strong>. It exists so the blog
        layouts can be checked with realistic text lengths before the real articles are written.</p>

        <h2>Why this matters</h2>
        <p>Short paragraphs read better on a phone. Aim for two or three sentences before a break,
        and use subheadings so the article can be scanned rather than read end to end.</p>

        <ul>
            <li>Lists break up long explanations.</li>
            <li>They also give the eye somewhere to rest.</li>
            <li>Three items is usually enough.</li>
        </ul>

        <h2>What to do next</h2>
        <p>Open this post in the admin panel, replace the body, add a cover image, and set a real
        publish date. Everything else on the page is already wired up.</p>
        HTML;
    }
}
