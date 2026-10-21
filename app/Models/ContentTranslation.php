<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentTranslation extends Model
{
    protected $fillable = ['locale', 'source_hash', 'source', 'text', 'is_manual'];
}
