<?php

namespace App\Http\Controllers;

use App\Mail\ConfirmSubscription;
use App\Mail\NewSubscriberNotice;
use App\Models\Setting;
use App\Models\Subscriber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Support\Storefront;

class NewsletterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'website' => ['prohibited'],
        ]);

        $email = Str::lower(trim($data['email']));
        $subscriber = Subscriber::firstOrNew(['email' => $email]);

        // Already subscribed: respond exactly as for a new address
        if ($subscriber->isActive()) {
            return back();
        }

        $subscriber->fill([
            'locale' => app()->getLocale(),
            'region' => $request->attributes->get('region'),
            'ip_address' => $request->ip(),
            'confirmed_at' => null,
            'unsubscribed_at' => null,
        ]);
        $subscriber->token ??= Str::random(48);
        $subscriber->save();

        Mail::to($subscriber->email)->send(new ConfirmSubscription($subscriber));

        return back();
    }

    public function showConfirm(Request $request, string $token)
    {
        $subscriber = Subscriber::where('token', $token)->firstOrFail();

        return Storefront::render('newsletter/action', [
            'mode' => 'confirm',
            'done' => $subscriber->isActive(),
            'actionUrl' => $request->fullUrl(),
        ]);
    }

    public function confirm(string $token)
    {
        $subscriber = Subscriber::where('token', $token)->firstOrFail();

        if (! $subscriber->isActive()) {
            $subscriber->update(['confirmed_at' => now(), 'unsubscribed_at' => null]);

            $notify = Setting::newsletter()['notify_email'] ?? null;
            if ($notify) {
                Mail::to($notify)->send(new NewSubscriberNotice($subscriber));
            }
        }

        return back();
    }

    public function showUnsubscribe(Request $request, string $token)
    {
        $subscriber = Subscriber::where('token', $token)->firstOrFail();

        return Storefront::render('newsletter/action', [
            'mode' => 'unsubscribe',
            'done' => $subscriber->status() === 'unsubscribed',
            'actionUrl' => $request->fullUrl(),
        ]);
    }

    public function unsubscribe(string $token)
    {
        Subscriber::where('token', $token)->firstOrFail()
            ->update(['unsubscribed_at' => now()]);

        return back();
    }
}
