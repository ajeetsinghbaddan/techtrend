<?php

namespace App\Models;

use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CartRecovery extends Model implements HasLocalePreference
{
    use Prunable;

    protected $fillable = ['cart_id', 'user_id', 'email', 'language', 'region', 'consent', 'status'];

    protected function casts(): array
    {
        return [
            'consent' => 'boolean',
            'last_reminder_at' => 'datetime',
            'clicked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CartRecovery $recovery) {
            $recovery->token ??= Str::random(48);
        });
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Reminder emails are written in the language the shopper was browsing in. */
    public function preferredLocale(): string
    {
        $language = $this->language ?: $this->user?->preferredLocale();

        return in_array($language, array_keys(config('shop.locales')), true) ? $language : config('app.locale');
    }

    /** Old records are deleted by `model:prune`, which already runs daily. */
    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(180));
    }
}
