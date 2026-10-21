<?php

namespace App\Support;

use App\Models\Collection;
use App\Models\ContentTranslation;
use App\Models\Product;
use Closure;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;
use Illuminate\Support\Facades\Cache;

class ProductSearch
{
    private const MAX_WORDS = 5;

    /** Clean user input: strip control characters, collapse spaces, cap the length. */
    public function normalize(?string $term): string
    {
        $term = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $term) ?? '';

        return Str::of($term)->squish()->limit(100, '')->value();
    }

    /** Full results page: paginated, with a total count. */
    public function products(string $term, int $perPage = 12): LengthAwarePaginator
    {
        if ($this->usesAlgolia()) {
            try {
                return Product::search($term)
                    ->query($this->eagerLoad())
                    ->paginate($perPage)
                    ->withQueryString();
            } catch (Throwable $e) {
                report($e); // Algolia down or over quota: fall through to the database
            }
        }

        return $this->databaseQuery($term)->paginate($perPage)->withQueryString();
    }

    /** A handful of matches for the dropdown: no page counts, one round trip. */
    public function suggestions(string $term, int $limit = 6): EloquentCollection
    {
        if ($this->usesAlgolia() && config('shop.search.suggest_with_algolia')) {
            try {
                return Product::search($term)->query($this->eagerLoad())->take($limit)->get();
            } catch (Throwable $e) {
                report($e);
            }
        }

        return $this->databaseQuery($term)->limit($limit)->get();
    }

    public function collections(string $term, int $limit = 3): EloquentCollection
    {
        $like = '%'.$this->escapeLike($term).'%';
        $sources = $this->translatedSources($like);

        return Collection::active()
            ->where(fn ($q) => $q->where('name', 'like', $like)
                ->when($sources, fn ($q) => $q->orWhereIn('name', $sources)))
            ->orderBy('position')
            ->limit($limit)
            ->get();
    }

    /** Remember what people search for, and how many results they got. */
    public function log(string $term, int $results): void
    {
        DB::table('search_logs')->upsert(
            [[
                'term' => Str::lower($term),
                'locale' => app()->getLocale(),
                'results' => $results,
                'hits' => 1,
                'last_searched_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]],
            ['term', 'locale'],
            ['results', 'last_searched_at', 'updated_at', 'hits' => DB::raw('hits + 1')],
        );
    }

    /* ---------- internals ---------- */

    private function usesAlgolia(): bool
    {
        return config('scout.driver') === 'algolia';
    }

    /** Only live products, with what a product card needs, loaded in bulk. */
    private function eagerLoad(): Closure
    {
        return fn (Builder $query) => $query->active()->with(ProductPresenter::eagerLoad());
    }

    /** The database search as an unfinished query, so it can be paginated or limited. */
    private function databaseQuery(string $term): Builder
    {
        $words = array_slice(preg_split('/\s+/u', $term, -1, PREG_SPLIT_NO_EMPTY), 0, self::MAX_WORDS);
        $sources = $this->translatedSources('%'.$this->escapeLike($term).'%');
        $startsWith = $this->escapeLike($term).'%';

        $query = Product::query();
        ($this->eagerLoad())($query);

        return $query
            ->where(function (Builder $query) use ($words, $sources) {
                // Every word must appear somewhere…
                $query->where(function (Builder $all) use ($words) {
                    foreach ($words as $word) {
                        $like = '%'.$this->escapeLike($word).'%';

                        $all->where(fn (Builder $any) => $any
                            ->where('name', 'like', $like)
                            ->orWhere('subtitle', 'like', $like)
                            ->orWhereHas('variants', fn ($v) => $v->where('is_active', true)->where(fn ($v) => $v
                                ->where('sku', 'like', $like)
                                ->orWhere('colour_name', 'like', $like)
                                ->orWhere('option_name', 'like', $like)))
                            ->orWhereHas('collections', fn ($c) => $c->where('name', 'like', $like)));
                    }
                });

                // …or the whole term matches a translated product name.
                if ($sources) {
                    $query->orWhereIn('name', $sources);
                }
            })
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$startsWith])
            ->orderByDesc('rating');
    }

    private function databaseSearch(string $term, int $perPage): LengthAwarePaginator
    {
        return $this->databaseQuery($term)
            ->with(ProductPresenter::eagerLoad())
            ->paginate($perPage)
            ->withQueryString();
    }

    /** Ids of every matching product, best match first. Filtering and sorting happen afterwards, in the database. */
    public function ids(string $term, int $limit = 500): array
    {
        if ($term === '') {
            return [];
        }

        if (config('scout.driver') === 'algolia') {
            try {
                return Product::search($term)->take($limit)->keys()
                    ->map(fn ($id) => (int) $id)->all();
            } catch (Throwable $e) {
                report($e); // Algolia down or over quota: fall through to the database
            }
        }

        return $this->databaseQuery($term)->limit($limit)->pluck('id')->all();
    }

    /** Terms other shoppers searched for that found products, most popular first. */
    public function popular(int $limit = 8): array
    {
        $locale = app()->getLocale();

        return Cache::remember("search.popular.{$locale}", now()->addHour(), fn () => DB::table('search_logs')
            ->where('locale', $locale)
            ->where('results', '>', 0)
            ->where('hits', '>=', 3)
            ->whereRaw('CHAR_LENGTH(term) BETWEEN 2 AND 30')
            ->orderByDesc('hits')
            ->limit($limit)
            ->pluck('term')
            ->all());
    }

    /** English originals whose translation (in the current language) matches. */
    private function translatedSources(string $like): array
    {
        if (app()->getLocale() === 'en') {
            return [];
        }

        return ContentTranslation::where('locale', app()->getLocale())
            ->where('text', 'like', $like)
            ->limit(200)
            ->pluck('source')
            ->all();
    }

    /** Make % and _ in user input literal, so they can't act as wildcards. */
    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
