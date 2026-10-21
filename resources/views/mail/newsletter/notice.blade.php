<x-mail::message>
# New confirmed subscriber

<x-mail::table>
| | |
|:--|:--|
| Email | {{ $subscriber->email }} |
| Language | {{ strtoupper($subscriber->locale ?? '—') }} |
| Region | {{ $subscriber->region ?? '—' }} |
| Confirmed | {{ $subscriber->confirmed_at?->format('d M Y, H:i') }} |
</x-mail::table>

<x-mail::button :url="url('/admin/newsletter')">
View all subscribers
</x-mail::button>
</x-mail::message>
