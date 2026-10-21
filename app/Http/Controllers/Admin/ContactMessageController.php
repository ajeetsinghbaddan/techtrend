<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Inertia\Inertia;

class ContactMessageController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/messages/index', [
            'messages' => ContactMessage::query()
                ->orderByRaw('read_at IS NULL DESC')
                ->latest()
                ->paginate(25)
                ->through(fn (ContactMessage $m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'email' => $m->email,
                    'subject' => $m->subject,
                    'preview' => \Illuminate\Support\Str::limit($m->message, 90),
                    'is_read' => $m->read_at !== null,
                    'created_at' => $m->created_at->toIso8601String(),
                ]),
            'unread' => ContactMessage::whereNull('read_at')->count(),
        ]);
    }

    public function show(ContactMessage $message)
    {
        $message->read_at ??= now();
        $message->save();

        return Inertia::render('admin/messages/show', [
            'message' => [
                ...$message->only(['id', 'name', 'email', 'subject', 'message', 'order_number', 'locale']),
                'created_at' => $message->created_at->toIso8601String(),
            ],
        ]);
    }

    public function destroy(ContactMessage $message)
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);

        $message->delete();

        return redirect()->route('admin.messages.index');
    }
}
