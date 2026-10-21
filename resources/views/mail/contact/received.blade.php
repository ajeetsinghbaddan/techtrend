<x-mail::message>
# New message from {{ $contact->name }}

**Email:** {{ $contact->email }}<br>
@if ($contact->order_number)
**Order:** {{ $contact->order_number }}<br>
@endif
**Language:** {{ strtoupper($contact->locale ?? 'en') }}

<x-mail::panel>
{{ $contact->message }}
</x-mail::panel>

<x-mail::button :url="url('/admin/messages/'.$contact->id)">
Open in admin
</x-mail::button>
</x-mail::message>
