<x-mail::message>
# Confirm your subscription

Tap the button below to start receiving drop alerts from {{ config('app.name') }}.

<x-mail::button :url="$confirmUrl">
Confirm subscription
</x-mail::button>

If you didn't sign up, you can ignore this email and you won't hear from us.

<small>Changed your mind? [Unsubscribe]({{ $unsubscribeUrl }})</small>
</x-mail::message>
