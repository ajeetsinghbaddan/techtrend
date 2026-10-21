<x-mail::message>
# Your order is on its way

Order **{{ $order->number }}** has shipped.

@if ($order->tracking_number)
Tracking number: **{{ $order->tracking_number }}**
@endif

@if ($order->tracking_url)
<x-mail::button :url="$order->tracking_url">
Track your parcel
</x-mail::button>
@endif

Delivering to {{ $order->shipping_address['postcode'] }} {{ $order->shipping_address['city'] }}.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
