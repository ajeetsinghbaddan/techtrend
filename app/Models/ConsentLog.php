<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsentLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['consent_id', 'version', 'analytics', 'marketing', 'locale'];

    protected function casts(): array
    {
        return ['analytics' => 'boolean', 'marketing' => 'boolean', 'created_at' => 'datetime'];
    }
}
