<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        $legal = '<p><strong>This is a placeholder, not legal text.</strong> Replace it with wording checked by a lawyer before launch.</p>';

        $pages = [
            ['about', 'About us', 'default', '<p>Tech Trend makes keyboards, keycaps and desk gear in small runs, warehoused in the EU.</p><h2>How we work</h2><p>Replace this with your story.</p>'],
            ['contact', 'Contact', 'contact', '<p>Questions about an order, a layout, or a team purchase? Send us a message and we usually reply within one working day.</p>'],
            ['shipping', 'Shipping & duties', 'default', '<p>Replace this with your delivery times, costs and customs information.</p>'],
            ['returns', 'Returns', 'default', '<p>Replace this with your return process and prepaid label details.</p>'],
            ['terms', 'Terms and conditions', 'default', $legal],
            ['privacy', 'Privacy policy', 'default', $legal],
            ['cookies', 'Cookie policy', 'default', $legal],
            ['withdrawal', 'Right of withdrawal', 'default', $legal],
        ];

        foreach ($pages as [$slug, $title, $template, $content]) {
            Page::firstOrCreate(
                ['slug' => $slug],
                ['title' => $title, 'template' => $template, 'content' => $content, 'is_published' => true],
            );
        }
    }
}
