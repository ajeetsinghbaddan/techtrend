<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdminTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (config('shop.security.admin_two_factor') && $user?->isSuperAdmin() && $user->two_factor_confirmed_at === null) {
            return redirect()->route('two-factor.show')
                ->with('status', 'Set up two-factor authentication to use the admin panel.');
        }

        return $next($request);
    }
}
