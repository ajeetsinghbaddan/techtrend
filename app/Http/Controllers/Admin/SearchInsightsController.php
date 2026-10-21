<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SearchInsightsController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'days' => ['sometimes', Rule::in(['7', '30', '90', '365'])],
            'locale' => ['sometimes', 'nullable', Rule::in(array_keys(config('shop.locales')))],
        ]);

        $days = (int) ($data['days'] ?? 30);
        $locale = $data['locale'] ?? null;

        $logs = fn () => DB::table('search_logs')
            ->where('last_searched_at', '>=', now()->subDays($days))
            ->when($locale, fn ($q) => $q->where('locale', $locale));

        $columns = ['id', 'term', 'locale', 'results', 'hits', 'last_searched_at'];

        return Inertia::render('admin/search-insights', [
            'stats' => [
                'searches' => (int) $logs()->sum('hits'),
                'terms' => $logs()->count(),
                'zero_terms' => $logs()->where('results', 0)->count(),
                'zero_searches' => (int) $logs()->where('results', 0)->sum('hits'),
            ],
            'top' => $logs()->where('results', '>', 0)->orderByDesc('hits')->limit(25)->get($columns),
            'missing' => $logs()->where('results', 0)->orderByDesc('hits')->limit(25)->get($columns),
            'filters' => ['days' => $days, 'locale' => $locale],
            'locales' => config('shop.locales'),
        ]);
    }

    /** Remove one logged term, e.g. if someone searched for something personal. */
    public function destroy(int $id)
    {
        DB::table('search_logs')->where('id', $id)->delete();

        return back();
    }
}
