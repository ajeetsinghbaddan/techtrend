<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    //
    protected $fillable = ['base', 'currency', 'rate', 'rate_date'];
}
