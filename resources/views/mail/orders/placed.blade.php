<x-mail::message>
@if ($forShop)
# New order {{ $order->number }}

{{ $order->email }} · {{ $order->region }} · {{ $paymentName }} · {{ $isPaid ? 'paid' : ($isCod ? 'cash on delivery' : 'awaiting payment') }}
@else
# {{ __('Thank you for your order!') }}

{{ __('Hi :name, we have received your order :number, placed on :date.', ['name' => $firstName, 'number' => $order->number, 'date' => $placedOn]) }}

@if ($isCod)
{{ __('Please have :total ready in cash when your order arrives.', ['total' => $totals['total']['formatted']]) }}
@elseif ($isPaid)
{{ __('Your payment was successful. We will email you again when your order ships.') }}
@endif
@endif

<x-mail::table>
| {{ __('Item') }} | {{ __('Qty') }} | {{ __('Total') }} |
|:--|:--:|--:|
@foreach ($lines as $line)
| {{ $line['name'] }}@if ($line['variant']) ({{ $line['variant'] }})@endif | {{ $line['quantity'] }} | {{ $line['total'] }} |
@endforeach
| {{ __('Subtotal') }} | | {{ $totals['subtotal']['formatted'] }} |
| {{ __('Shipping') }} ({{ $shippingName }}) | | {{ $totals['shipping']['minor'] === 0 ? __('Free') : $totals['shipping']['formatted'] }} |
@if ($order->tax_rate > 0)
| {{ $order->tax_inclusive ? __('of which tax (:rate%)', ['rate' => $order->tax_rate]) : __('Tax (:rate%)', ['rate' => $order->tax_rate]) }} | | {{ $totals['tax']['formatted'] }} |
@endif
| **{{ __('Total') }}** | | **{{ $totals['total']['formatted'] }}** |
</x-mail::table>

**{{ __('Delivering to') }}**<br>
{{ $order->shipping_address['first_name'] ?? '' }} {{ $order->shipping_address['last_name'] ?? '' }}<br>
{{ $order->shipping_address['line1'] ?? '' }}<br>
@if (! empty($order->shipping_address['line2']))
{{ $order->shipping_address['line2'] }}<br>
@endif
{{ $order->shipping_address['postcode'] ?? '' }} {{ $order->shipping_address['city'] ?? '' }}

**{{ __('Payment') }}:** {{ $paymentName }}

@if ($forShop)
<x-mail::button :url="$adminUrl">
Open in admin
</x-mail::button>
@elseif ($accountUrl)
<x-mail::button :url="$accountUrl">
{{ __('View your order') }}
</x-mail::button>
@else
{{ __('Questions about your order? Just reply to this email and mention :number.', ['number' => $order->number]) }}
@endif

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
</x-mail::message>
