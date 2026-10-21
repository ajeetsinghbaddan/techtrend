<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Address extends Model
{
    public const MAX_PER_USER = 10;

    public const FIELDS = ['label', 'first_name', 'last_name', 'line1', 'line2', 'postcode', 'city', 'country', 'phone'];

    protected $fillable = ['label', 'first_name', 'last_name', 'line1', 'line2', 'postcode', 'city', 'country', 'phone'];

    protected function casts(): array
    {
        return [
            'is_default_shipping' => 'boolean',
            'is_default_billing' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // When a default address is deleted, the newest remaining one takes over.
        static::deleted(function (Address $address) {
            foreach (['shipping', 'billing'] as $type) {
                if ($address->{"is_default_{$type}"}) {
                    static::where('user_id', $address->user_id)->latest()->first()?->makeDefault($type);
                }
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Make this the default delivery or billing address, and unset the previous one. */
    public function makeDefault(string $type): void
    {
        $column = $type === 'billing' ? 'is_default_billing' : 'is_default_shipping';

        DB::transaction(function () use ($column) {
            static::where('user_id', $this->user_id)->whereKeyNot($this->getKey())->update([$column => false]);
            $this->forceFill([$column => true])->save();
        });
    }

    /** For the account pages. */
    public function present(): array
    {
        return [
            'id' => $this->id,
            ...$this->only(self::FIELDS),
            'is_default_shipping' => $this->is_default_shipping,
            'is_default_billing' => $this->is_default_billing,
        ];
    }

    /** In the shape the checkout form uses: empty strings rather than nulls. */
    public function toCheckout(): array
    {
        return [
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'line1' => $this->line1,
            'line2' => $this->line2 ?? '',
            'postcode' => $this->postcode,
            'city' => $this->city,
            'country' => $this->country,
            'phone' => $this->phone ?? '',
        ];
    }
}
