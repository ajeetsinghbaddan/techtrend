<?php

namespace App\Models;

use App\Models\Concerns\HasMachineTranslations;
use App\Support\ExchangeRates;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use HasMachineTranslations, Searchable;

    protected $fillable = [
        'name', 'slug', 'subtitle', 'description', 'specs', 'compliance',
        'run_label', 'units_total', 'rating', 'reviews_count',
        'is_active', 'position', 'meta_title', 'meta_description',
    ];

    protected function casts(): array
    {
        return [
            'specs' => 'array',
            'compliance' => 'array',
            'is_active' => 'boolean',
            'rating' => 'float',
        ];
    }

    protected function machineTranslated(): array
    {
        return ['name' => false, 'subtitle' => false, 'description' => true, 'specs' => false, 'compliance' => false];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /* ---------- Relationships ---------- */

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    /* ---------- Scopes ---------- */

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInStock(Builder $query): Builder
    {
        return $query->whereHas('variants', fn ($q) => $q->where('is_active', true)->where('stock', '>', 0));
    }

    /* ---------- Search (Scout / Algolia) ---------- */

    /** Only live products go into the search index. */
    public function shouldBeSearchable(): bool
    {
        return (bool) $this->is_active;
    }

    /** Load relations in bulk when running scout:import. */
    protected function makeAllSearchableUsing(Builder $query): Builder
    {
        return $query->with(['collections:id,name', 'variants', 'prices']);
    }

    /** What Algolia stores for each product. Prices are left out on purpose. */
    public function toSearchableArray(): array
    {
        $this->loadMissing(['collections:id,name', 'variants', 'prices']);

        $sources = [$this->name, ...$this->collections->pluck('name')];
        $translated = ContentTranslation::whereIn('source_hash', array_map('sha1', $sources))
            ->get(['source', 'text'])
            ->groupBy('source');

        $allLanguages = fn (string $text) => [$text, ...($translated[$text] ?? collect())->pluck('text')];
        $variants = $this->variants->where('is_active', true);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'names' => array_values(array_unique($allLanguages($this->name))),
            'subtitle' => $this->subtitle,
            'collections' => $this->collections->flatMap(fn ($c) => $allLanguages($c->name))->unique()->values()->all(),
            'colours' => $variants->pluck('colour_name')->filter()->unique()->values()->all(),
            'options' => $variants->pluck('option_name')->filter()->unique()->values()->all(),
            'skus' => $variants->pluck('sku')->values()->all(),
            'specs' => collect($this->specs ?? [])->pluck('value')->filter()->values()->all(),
            'description' => Str::limit(strip_tags((string) $this->description), 500),
            'in_stock' => $this->isInStock(),
            'rating' => (float) $this->rating,
            'reviews_count' => (int) $this->reviews_count,
        ];
    }

    /* ---------- Prices ---------- */

    public function priceFor(string $currency): ?ProductPrice
    {
        return $this->prices->firstWhere('currency', strtoupper($currency));
    }

    public function money(string $currency): ?Money
    {
        $currency = strtoupper($currency);

        // A fixed price for this currency always wins.
        if ($fixed = $this->priceFor($currency)) {
            return Money::of($fixed->amount_minor, $currency);
        }

        $base = $this->priceFor(config('shop.base_currency'));
        $minor = $base ? app(ExchangeRates::class)->convert($base->amount_minor, $currency) : null;

        return $minor === null ? null : Money::of($minor, $currency);
    }

    public function compareAtMoney(string $currency): ?Money
    {
        $currency = strtoupper($currency);

        if ($fixed = $this->priceFor($currency)) {
            return $fixed->compare_at_minor ? Money::of($fixed->compare_at_minor, $currency) : null;
        }

        $base = $this->priceFor(config('shop.base_currency'));
        $minor = $base?->compare_at_minor
            ? app(ExchangeRates::class)->convert($base->compare_at_minor, $currency)
            : null;

        return $minor === null ? null : Money::of($minor, $currency);
    }

    public function lowestPriceIn30Days(string $currency): ?Money
    {
        $minor = $this->hasMany(ProductPriceHistory::class)
            ->where('currency', strtoupper($currency))
            ->where('recorded_at', '>=', now()->subDays(30))
            ->min('amount_minor');

        return $minor ? Money::of((int) $minor, $currency) : null;
    }

    /* ---------- Stock ---------- */

    public function unitsLeft(): int
    {
        return max(0, (int) $this->variants->where('is_active', true)->sum('stock'));
    }

    public function isInStock(): bool
    {
        return $this->unitsLeft() > 0;
    }

    public function badge(): ?string
    {
        if (! $this->isInStock()) {
            return 'sold out';
        }

        if ($this->units_total && $this->unitsLeft() <= $this->units_total * 0.15) {
            return 'low stock';
        }

        if ($this->created_at?->isAfter(now()->subDays(30))) {
            return 'new run';
        }

        return null;
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    /** Recalculate the stored rating and count from approved reviews. */
    public function refreshRating(): void
    {
        $stats = $this->reviews()->approved()
            ->selectRaw('COUNT(*) as total, AVG(rating) as average')
            ->first();

        $total = (int) ($stats->total ?? 0);

        $this->forceFill([
            'reviews_count' => $total,
            'rating' => $total > 0 ? round((float) $stats->average, 1) : null,
        ])->save();
    }
}
