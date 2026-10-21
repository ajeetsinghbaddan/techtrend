<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Subscriber;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NewsletterController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->string('status')->value();
        $search = $request->string('q')->trim()->limit(80, '')->value();

        $subscribers = Subscriber::query()
            ->when($search, fn ($q) => $q->where('email', 'like', '%'.addcslashes($search, '%_\\').'%'))
            ->when($status === 'confirmed', fn ($q) => $q->whereNotNull('confirmed_at')->whereNull('unsubscribed_at'))
            ->when($status === 'pending', fn ($q) => $q->whereNull('confirmed_at')->whereNull('unsubscribed_at'))
            ->when($status === 'unsubscribed', fn ($q) => $q->whereNotNull('unsubscribed_at'))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Subscriber $s) => [
                'id' => $s->id,
                'email' => $s->email,
                'status' => $s->status(),
                'locale' => $s->locale,
                'region' => $s->region,
                'created_at' => $s->created_at->toIso8601String(),
            ]);

        return Inertia::render('admin/newsletter', [
            'settings' => Setting::newsletter(),
            'subscribers' => $subscribers,
            'filters' => ['q' => $search, 'status' => $status],
            'counts' => [
                'confirmed' => Subscriber::whereNotNull('confirmed_at')->whereNull('unsubscribed_at')->count(),
                'pending' => Subscriber::whereNull('confirmed_at')->whereNull('unsubscribed_at')->count(),
                'unsubscribed' => Subscriber::whereNotNull('unsubscribed_at')->count(),
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'title' => ['required', 'string', 'max:60'],
            'text' => ['nullable', 'string', 'max:160'],
            'placeholder' => ['required', 'string', 'max:40'],
            'button' => ['required', 'string', 'max:20'],
            'notify_email' => ['nullable', 'email:rfc', 'max:254'],
        ]);

        Setting::put('newsletter', [...$data, 'enabled' => $request->boolean('enabled')]);

        return back();
    }

    public function export()
    {
        $filename = 'subscribers-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['email', 'status', 'language', 'region', 'signed_up', 'confirmed_at']);

            Subscriber::query()->chunkById(500, function ($rows) use ($out) {
                foreach ($rows as $s) {
                    fputcsv($out, array_map([$this, 'safeCell'], [
                        $s->email,
                        $s->status(),
                        $s->locale,
                        $s->region,
                        $s->created_at?->toDateTimeString(),
                        $s->confirmed_at?->toDateTimeString(),
                    ]));
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function destroy(Subscriber $subscriber)
    {
        $subscriber->delete();

        return back();
    }

    /** Stop spreadsheet apps treating a value as a formula (CSV injection). */
    private function safeCell(?string $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
