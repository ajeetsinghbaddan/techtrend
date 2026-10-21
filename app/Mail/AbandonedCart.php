<?php

namespace App\Mail;

use App\Models\CartRecovery;
use App\Support\CartReminders;
use App\Support\CheckoutCalculator;
use App\Support\ContentTranslator;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class AbandonedCart extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public CartRecovery $recovery, public int $step)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: match ($this->step) {
            1 => __('You left something in your bag'),
            2 => __('Your bag is still waiting for you'),
            default => __('Still thinking it over?'),
        });
    }

    /** One-click unsubscribe, shown by Gmail, Yahoo and Apple Mail next to the sender. */
    public function headers(): Headers
    {
        return new Headers(text: [
            'List-Unsubscribe' => '<'.route('cart-reminders.one-click', $this->recovery->token).'>',
            'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
        ]);
    }

    public function content(): Content
    {
        $region = $this->recovery->region ?? config('shop.default_region');
        $calculator = CheckoutCalculator::forRegion($region);
        $currency = $calculator->currency();
        $locale = $calculator->locale();
        $translator = app(ContentTranslator::class);
        $format = fn (int $minor) => Money::of($minor, $currency)->toArray($locale)['formatted'];
        $absolute = fn (?string $url) => $url && ! str_starts_with($url, 'http') ? url($url) : $url;

        $this->recovery->cart?->loadMissing('items');
        $lines = CartReminders::availableLines($this->recovery->cart, $currency);
        $subtotal = (int) $lines->sum('line_minor');

        // Second reminder: how close they are to free shipping, if there's a threshold.
        $standard = collect($calculator->shippingMethods($subtotal))->first();
        $freeShippingGap = $this->step === 2 && $standard && ! $standard['free'] && $standard['free_over']
            ? $format($standard['free_over']['minor'] - $subtotal)
            : null;

        $campaign = "?utm_source=email&utm_medium=cart_reminder&utm_campaign=reminder_{$this->step}";

        return new Content(
            markdown: 'mail.carts.abandoned',
            with: [
                'step' => $this->step,
                'lines' => $lines->map(fn (array $line) => [
                    'name' => $translator->get($line['variant']->product->name),
                    'option' => $line['variant']->label() ? $translator->get($line['variant']->label()) : null,
                    'image' => $absolute($line['variant']->product->images->first()?->url),
                    'quantity' => $line['quantity'],
                    'total' => $format($line['line_minor']),
                    // Third reminder only, and only when it's genuinely true.
                    'low_stock' => $this->step >= 3 && $line['variant']->stock <= 5 ? $line['variant']->stock : null,
                ]),
                'subtotal' => $format($subtotal),
                'freeShippingGap' => $freeShippingGap,
                'restoreUrl' => route('cart.restore', $this->recovery->token).$campaign,
                'unsubscribeUrl' => route('cart-reminders.unsubscribe', $this->recovery->token),
            ],
        );
    }
}
