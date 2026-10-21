<?php

namespace App\Support;

use App\Models\Order;
use App\Models\OrderItem;

class OrderPresenter
{
    /** What detail() reads; eager-load these to avoid a query per item. */
    public const RELATIONS = ['items.variant.product:id,slug,is_active', 'payments'];

    /** Everything about one order, for its own page (and the checkout confirmation). */
    public static function detail(Order $order): array
    {
        return [
            'number' => $order->number,
            'email' => $order->email,
            'status' => $order->status,
            'shipping_method' => $order->shipping_method,
            'payment_method' => $order->payment_method,
            'shipping_address' => $order->shipping_address,
            'billing_address' => $order->billing_address,
            'placed_at' => ($order->placed_at ?? $order->created_at)?->toIso8601String(),
            'tax_rate' => $order->tax_rate,
            'tax_inclusive' => $order->tax_inclusive,
            'totals' => $order->totals(),
            'paid_at' => $order->paid_at?->toIso8601String(),
            'items' => $order->items->map(fn (OrderItem $item) => [
                'name' => $item->product_name,
                'variant_label' => $item->variant_label,
                'image_url' => $item->image_url,
                'quantity' => $item->quantity,
                'unit_price' => Money::of($item->unit_price_minor, $order->currency)->toArray($order->locale),
                'line_total' => Money::of($item->line_total_minor, $order->currency)->toArray($order->locale),
                'product_slug' => $item->variant?->product?->is_active ? $item->variant->product->slug : null,
            ])->values()->all(),
        ];
    }

    /** The short version for order lists. Needs only `items` loaded. */
    public static function summary(Order $order): array
    {
        return [
            'number' => $order->number,
            'status' => $order->status,
            'placed_at' => ($order->placed_at ?? $order->created_at)?->toIso8601String(),
            'total' => $order->money('total')->toArray($order->locale),
            'item_count' => (int) $order->items->sum('quantity'),
            'images' => $order->items->pluck('image_url')->filter()->unique()->take(3)->values()->all(),
        ];
    }
}
