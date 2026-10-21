<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Payment extends Model
{
    /** States that never change again. "cancelled" is not one: a late payment can still arrive. */
    public const FINAL = ['paid', 'failed', 'refunded', 'review'];

    protected $fillable = [
        'order_id', 'gateway', 'status', 'amount_minor', 'currency',
        'reference', 'transaction_id', 'failure_reason', 'payload', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Payment $payment) {
            $payment->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function isFinal(): bool
    {
        return in_array($this->status, self::FINAL, true);
    }
}
