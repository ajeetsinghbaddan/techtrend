<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;

class Subscriber extends Model
{
    protected $fillable = [
        'email', 'token', 'locale', 'region', 'ip_address', 'confirmed_at', 'unsubscribed_at',
    ];

    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }

    public function status(): string
    {
        return match (true) {
            $this->unsubscribed_at !== null => 'unsubscribed',
            $this->confirmed_at !== null => 'confirmed',
            default => 'pending',
        };
    }

    public function isActive(): bool
    {
        return $this->status() === 'confirmed';
    }

    public function confirmUrl(): string
    {
        return URL::temporarySignedRoute('newsletter.confirm', now()->addDays(7), ['token' => $this->token]);
    }

    public function unsubscribeUrl(): string
    {
        return URL::signedRoute('newsletter.unsubscribe', ['token' => $this->token]);
    }
}
