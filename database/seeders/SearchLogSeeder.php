<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Support\ProductSearch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SearchLogSeeder extends Seeder
{
    private const TERMS = [
        'en' => [
            // likely to match products
            'keyboard', 'keycaps', 'switches', 'mechanical keyboard', 'brass', 'wrist rest',
            'cable', 'iso', 'linear switches', 'tactile', 'artisan keycap', 'desk mat',
            // common misspellings
            'keybord', 'kecaps', 'swtiches',
            // things the shop doesn't sell (yet)
            'webcam', 'headphones', 'monitor arm', 'gift card', 'laptop stand', 'mouse',
        ],
        'de' => ['tastatur', 'tastenkappen', 'mechanische tastatur', 'handballenauflage', 'kabel', 'qwertz', 'maus', 'gutschein'],
        'fr' => ['clavier', 'touches', 'clavier mécanique', 'repose-poignets', 'azerty', 'souris'],
        'nl' => ['toetsenbord', 'keycaps', 'polssteun', 'muis'],
        'sv' => ['tangentbord', 'tangenter', 'handledsstöd'],
        'pl' => ['klawiatura', 'klawisze', 'podkładka', 'mysz'],
    ];

    /** Old enough for the yearly clean-up to delete. */
    private const STALE = ['floppy disk', 'typewriter ribbon'];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: demo search logs are never seeded in production.');

            return;
        }

        $search = app(ProductSearch::class);
        $locales = array_keys(config('shop.locales'));

        $previousDriver = config('scout.driver');
        $previousLocale = app()->getLocale();

        // Count results with the database search, so seeding uses none of the Algolia quota.
        config(['scout.driver' => 'null']);

        $rows = [];

        try {
            foreach ($this->terms() as $locale => $terms) {
                if (! in_array($locale, $locales, true)) {
                    continue;
                }

                // Translated product names are matched in the current language.
                app()->setLocale($locale);

                foreach ($terms as $term) {
                    $term = $search->normalize(Str::lower($term));

                    if ($term === '') {
                        continue;
                    }

                    $results = count($search->ids($term));
                    $last = now()->subDays(random_int(0, 120))->subMinutes(random_int(0, 1439));

                    $rows["{$locale}|{$term}"] = $this->row($term, $locale, $results, $this->hits($results), $last);
                }
            }
        } finally {
            config(['scout.driver' => $previousDriver]);
            app()->setLocale($previousLocale);
        }

        foreach (self::STALE as $term) {
            $rows["en|{$term}"] = $this->row($term, 'en', 0, random_int(1, 3), now()->subDays(400));
        }

        DB::table('search_logs')->upsert(
            array_values($rows),
            ['term', 'locale'],
            ['results', 'hits', 'last_searched_at', 'created_at', 'updated_at'],
        );

        // Popular searches are cached for an hour; show the new ones straight away.
        foreach ($locales as $locale) {
            Cache::forget("search.popular.{$locale}");
        }

        $found = collect($rows)->where('results', '>', 0)->count();
        $this->command->info(sprintf('Seeded %d search terms: %d found products, %d found nothing.',
            count($rows), $found, count($rows) - $found));
    }

    /** The fixed terms, plus the start of a few real product names. */
    private function terms(): array
    {
        $terms = self::TERMS;

        $productTerms = Product::where('is_active', true)
            ->inRandomOrder()
            ->take(8)
            ->pluck('name')
            ->map(fn (string $name) => Str::of($name)->lower()->words(2, '')->trim()->value())
            ->filter()
            ->all();

        $terms['en'] = array_values(array_unique([...$terms['en'], ...$productTerms]));

        return $terms;
    }

    /** Searches that find things get searched more; a few misses are searched a lot. */
    private function hits(int $results): int
    {
        $roll = random_int(1, 100);

        if ($results > 0) {
            return match (true) {
                $roll <= 15 => random_int(1, 2),
                $roll <= 75 => random_int(3, 30),
                default => random_int(30, 150),
            };
        }

        return $roll <= 70 ? random_int(1, 8) : random_int(9, 40);
    }

    private function row(string $term, string $locale, int $results, int $hits, $lastSearchedAt): array
    {
        return [
            'term' => $term,
            'locale' => $locale,
            'results' => $results,
            'hits' => $hits,
            'last_searched_at' => $lastSearchedAt,
            'created_at' => $lastSearchedAt->copy()->subDays(random_int(0, 200)),
            'updated_at' => $lastSearchedAt,
        ];
    }
}
