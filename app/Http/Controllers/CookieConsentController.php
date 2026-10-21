<?php

namespace App\Http\Controllers;

use App\Models\ConsentLog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CookieConsentController extends Controller
{
    public function store(Request $request): Response
    {
        $data = $request->validate([
            'id' => ['required', 'uuid'],
            'v' => ['required', 'integer', 'min:1', 'max:65000'],
            'analytics' => ['required', 'boolean'],
            'marketing' => ['required', 'boolean'],
        ]);

        ConsentLog::create([
            'consent_id' => $data['id'],
            'version' => $data['v'],
            'analytics' => $data['analytics'],
            'marketing' => $data['marketing'],
            'locale' => app()->getLocale(),
        ]);

        return response()->noContent();
    }
}
