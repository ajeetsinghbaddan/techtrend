<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\OrderItem;
use App\Support\ContentTranslator;
use App\Support\Money;
use App\Support\OrderLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPlaced extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order, public bool $forShop = false)
    {
        // Wait for the database transaction to finish before the queue picks this up.
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        $total = $this->order->money('total')->toArray($this->order->locale)['formatted'];

        return new Envelope(
            subject: $this->forShop
                ? "New order {$this->order->number}: {$total}"
                : __('Your order :number is confirmed', ['number' => $this->order->number]),
        );
    }

    public function content(): Content
    {
        $order = $this->order->loadMissing('items');
        $translator = app(ContentTranslator::class);
        $money = fn (int $minor) => Money::of($minor, $order->currency)->toArray($order->locale)['formatted'];

        // Product names were saved in English; show them in the reader's language.
        // A "|" would break the Markdown table, so it's escaped.
        $cell = fn (?string $text) => str_replace('|', '\|', (string) $text);

        return new Content(
            markdown: 'mail.orders.placed',
            with: [
                'order' => $order,
                'forShop' => $this->forShop,
                'firstName' => $order->shipping_address['first_name'] ?? '',
                'lines' => $order->items->map(fn (OrderItem $item) => [
                    'name' => $cell($translator->get($item->product_name)),
                    'variant' => $item->variant_label ? $cell($translator->get($item->variant_label)) : null,
                    'quantity' => $item->quantity,
                    'total' => $money((int) $item->line_total_minor),
                ]),
                'totals' => $order->totals(),
                'shippingName' => OrderLabels::for($order->shipping_method),
                'paymentName' => OrderLabels::for($order->payment_method),
                'isCod' => $order->payment_method === 'cod',
                'isPaid' => $order->paid_at !== null,
                'placedOn' => ($order->placed_at ?? $order->created_at)?->translatedFormat('j F Y'),
                'accountUrl' => $order->user_id ? route('account.orders.show', $order->number) : null,
                'adminUrl' => route('admin.orders.show', $order->number),
            ],
        );
    }
}
