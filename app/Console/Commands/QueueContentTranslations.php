<?php

namespace App\Console\Commands;

use App\Jobs\TranslateContent;
use App\Models\Collection;
use App\Models\Post;
use App\Models\Product;
use App\Models\Setting;
use App\Support\ContentTranslator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class QueueContentTranslations extends Command
{
    protected $signature = 'translations:content';

    protected $description = 'Queue machine translation for products, collections, posts and homepage settings';

    private const SETTING_KEYS = [
        'header', 'footer', 'hero', 'features', 'promos', 'explore', 'marquee', 'cta',
        'blog', 'newsletter', 'collections_strip', 'product_rows',
    ];

    public function handle(): int
    {
        $settingTexts = 0;

        foreach (self::SETTING_KEYS as $key) {
            $value = Setting::get($key, config("shop.{$key}", []));

            array_walk_recursive($value, function ($leaf, $field) use (&$settingTexts) {
                if (ContentTranslator::translatable($field, $leaf)) {
                    TranslateContent::dispatch($leaf);
                    $settingTexts++;
                }
            });
        }

        $this->line("Settings: {$settingTexts} texts");

        foreach ([Product::class, Collection::class, Post::class, \App\Models\Page::class] as $model) {
            $count = 0;

            $model::query()->each(function ($record) use (&$count) {
                $record->queueTranslations();
                $count++;
            });

            $this->line(class_basename($model).": {$count} records");
        }

        $this->newLine();
        $this->info(DB::table('jobs')->count().' jobs waiting. Keep `php artisan queue:work` running to process them.');

        return self::SUCCESS;
    }
}
