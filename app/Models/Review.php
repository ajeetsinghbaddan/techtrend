<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Review extends Model
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'product_id', 'user_id', 'rating', 'title', 'body', 'status', 'is_verified',
        'locale', 'admin_reply', 'replied_at', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'is_verified' => 'boolean',
            'replied_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Keep the product's rating and review count in step with approved reviews.
        static::saved(function (Review $review) {
            if ($review->wasRecentlyCreated || $review->wasChanged(['status', 'rating'])) {
                $review->product?->refreshRating();
            }
        });

        static::deleting(function (Review $review) {
            foreach ($review->images as $image) {
                Storage::disk('public')->delete($image->path);
            }
        });

        static::deleted(fn (Review $review) => $review->product?->refreshRating());
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ReviewImage::class)->orderBy('position');
    }

    public function voters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'review_votes');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    /** "Shahid M." — first name and last initial, never the full name or email. */
    public function authorName(): string
    {
        $parts = preg_split('/\s+/u', trim((string) $this->user?->name)) ?: [];
        $first = $parts[0] ?? '';
        $last = count($parts) > 1 ? Str::upper(mb_substr(end($parts), 0, 1)).'.' : '';

        return trim($first.' '.$last) ?: __('Customer');
    }
}
