<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\Rule;

class PreferenceController extends Controller
{
    /** Which account column each cookie is remembered in. */
    private const ACCOUNT_COLUMNS = [
        'locale' => 'preferred_locale',
        'region' => 'preferred_region',
    ];

    public function update(Request $request)
    {
        $data = $request->validate([
            'locale' => ['sometimes', Rule::in(array_keys(config('shop.locales')))],
            'region' => ['sometimes', Rule::in(array_keys(config('shop.regions')))],
        ]);

        foreach ($data as $name => $value) {
            Cookie::queue($name, $value, 60 * 24 * 365);
        }

        // Logged-in customers: remember the choice on the account too,
        // so it follows them to other devices and is restored at login.
        if ($user = $request->user()) {
            $changes = [];

            foreach ($data as $name => $value) {
                $changes[self::ACCOUNT_COLUMNS[$name]] = $value;
            }

            if ($changes) {
                $user->forceFill($changes)->save();
            }
        }

        return back();
    }
}
