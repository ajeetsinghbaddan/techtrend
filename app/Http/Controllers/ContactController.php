<?php

namespace App\Http\Controllers;

use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'subject' => ['nullable', 'string', 'max:150'],
            'order_number' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'website' => ['prohibited'],
        ]);

        $message = ContactMessage::create([
            ...collect($data)->except('website')->all(),
            'locale' => app()->getLocale(),
            'ip_address' => $request->ip(),
        ]);

        $notify = Setting::newsletter()['notify_email'] ?? config('mail.from.address');

        if ($notify) {
            Mail::to($notify)->send(new ContactMessageReceived($message));
        }

        return back();
    }
}
