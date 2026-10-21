<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmailOptOut extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['email', 'topic'];

    public static function has(string $email, string $topic): bool
    {
        return static::where('email', Str::lower($email))->where('topic', $topic)->exists();
    }
}
