<?php

namespace App\Models;

use App\Models\Concerns\HasMachineTranslations;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Page extends Model
{
    use HasMachineTranslations;

    public const TEMPLATES = ['default', 'contact'];

    /** Addresses already used by other parts of the site. A page can never take these. */
    public const RESERVED_SLUGS = [
        'admin', 'api', 'bag', 'blog', 'build', 'checkout', 'collections', 'confirm-password',
        'contact-messages', 'dashboard', 'email', 'forgot-password', 'login', 'logout',
        'newsletter', 'preferences', 'products', 'register', 'reset-password', 'search',
        'settings', 'sitemap', 'storage', 'two-factor-challenge', 'up', 'user', 'verify-email',
    ];

    protected $fillable = [
        'title', 'slug', 'template', 'content', 'meta_title', 'meta_description',
        'og_image_path', 'is_published', 'noindex', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'noindex' => 'boolean',
        ];
    }

    protected function machineTranslated(): array
    {
        return ['title' => false, 'content' => true, 'meta_title' => false, 'meta_description' => false];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function getOgImageUrlAttribute(): ?string
    {
        return $this->og_image_path ? Storage::disk('public')->url($this->og_image_path) : null;
    }

    /** Plain-text summary of some HTML, for meta descriptions. */
    public static function summarise(?string $html, int $length = 160): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $html)) ?? '');

        return Str::limit($text, $length);
    }
}
