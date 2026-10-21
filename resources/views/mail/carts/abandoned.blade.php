<x-mail::message>
@if ($step === 1)
# {{ __('You left something behind') }}

{{ __('Your bag is saved, so you can pick up right where you left off.') }}
@elseif ($step === 2)
# {{ __('Your bag is still waiting') }}

{{ __('The items you chose are still in your bag.') }}
@else
# {{ __('Still thinking it over?') }}

{{ __('Your bag is still saved. If you have any questions about these items, just reply to this email.') }}
@endif

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
@foreach ($lines as $line)
<tr>
<td width="72" style="padding: 8px 12px 8px 0; vertical-align: top;">
@if ($line['image'])
<img src="{{ $line['image'] }}" alt="" width="64" height="64" style="border-radius: 8px; object-fit: cover; display: block;">
@endif
</td>
<td style="padding: 8px 0; vertical-align: top;">
<strong>{{ $line['name'] }}</strong>@if ($line['option'])<br><span style="color: #64748b; font-size: 13px;">{{ $line['option'] }}</span>@endif
<br><span style="color: #64748b; font-size: 13px;">{{ __('Qty') }}: {{ $line['quantity'] }}</span>
@if ($line['low_stock'])
<br><span style="color: #b45309; font-size: 13px;">{{ __('Only :count left', ['count' => $line['low_stock']]) }}</span>
@endif
</td>
<td style="padding: 8px 0; vertical-align: top; text-align: right; white-space: nowrap;">{{ $line['total'] }}</td>
</tr>
@endforeach
<tr>
<td></td>
<td style="padding-top: 12px; border-top: 1px solid #e2e8f0;"><strong>{{ __('Subtotal') }}</strong></td>
<td style="padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: right;"><strong>{{ $subtotal }}</strong></td>
</tr>
</table>

@if ($freeShippingGap)
<x-mail::panel>
{{ __('Add :amount more to your bag for free shipping.', ['amount' => $freeShippingGap]) }}
</x-mail::panel>
@endif

<x-mail::button :url="$restoreUrl">
{{ __('Return to my bag') }}
</x-mail::button>

{{ __('Prices and availability are as of when this email was sent.') }}

{{ __('Thanks,') }}<br>
{{ config('app.name') }}

<x-slot:subcopy>
{{ __("You're receiving this because you left items in your bag.") }} [{{ __('Stop bag reminders') }}]({{ $unsubscribeUrl }})
</x-slot:subcopy>
</x-mail::message>
