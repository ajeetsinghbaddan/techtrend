<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cookie;

class PreferenceCookies
{
    private const MINUTES = 60 * 24 * 365;

    /** Set the language and region cookies from the account's saved preferences. */
    public static function queue(User $user): void
    {
        if ($user->preferred_locale) {
            Cookie::queue('locale', $user->preferred_locale, self::MINUTES);
        }

        if ($user->preferred_region) {
            Cookie::queue('region', $user->preferred_region, self::MINUTES);
        }
    }
}
