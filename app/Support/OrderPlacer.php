<?php

namespace App\Support;

use App\Models\Cart;
use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class OrderPlacer
{
    public function __construct(
        private readonly CartReminders $reminders,
        private readonly ExchangeRates $rates,
    ) {
    }

    public function place(Cart $cart, array $data, CheckoutCalculator $calculator, ?int $userId): Order
    {
        return DB::transaction(function () use ($cart, $data, $calculator, $userId) {
            $cart->loadLines();

            if ($cart->items->isEmpty()) {
                throw new RuntimeException(__('Your bag is empty.'));
            }

            $currency = $calculator->currency();
            $lines = [];
            $subtotal = 0;

            foreach ($cart->items as $item) {
                // Lock the variant row so two orders can't take the same last unit.
                $variant = ProductVariant::where('id', $item->product_variant_id)
                    ->lockForUpdate()
                    ->with('product.images')
                    ->first();

                $product = $variant?->product;

                if (! $variant || ! $product || ! $variant->is_active || ! $product->is_active) {
                    throw new RuntimeException(__('An item in your bag is no longer available.'));
                }

                if ($variant->stock < $item->quantity) {
                    throw new RuntimeException(
                        __('Only :count left of :name. Please update your bag.', ['count' => $variant->stock, 'name' => $product->tr('name')])
                    );
                }

                $base = $product->money($currency);

                if (! $base) {
                    throw new RuntimeException(__('An item in your bag has no price for this region.'));
                }

                // The option's price difference is stored in the base currency,
                // so it's converted, exactly as the product page shows it.
                $unit = Money::of($base->minor + $variant->adjustment($currency), $currency);
                $lineTotal = $unit->times($item->quantity);
                $subtotal += $lineTotal->minor;

                $lines[] = [
                    'product_variant_id' => $variant->id,
                    'product_name' => $product->name,
                    'variant_label' => $variant->label(),
                    'sku' => $variant->sku,
                    'image_url' => $product->images->first()?->url,
                    'quantity' => $item->quantity,
                    'unit_price_minor' => $unit->minor,
                    'line_total_minor' => $lineTotal->minor,
                ];

                $variant->decrement('stock', $item->quantity);
            }

            $totals = $calculator->totals($subtotal, $data['shipping_method']);

            $order = Order::create([
                'number' => Order::generateNumber(),
                'user_id' => $userId,
                'status' => 'pending',
                'email' => $data['email'],
                'currency' => $currency,
                'region' => $data['region'],
                'locale' => $calculator->locale(),
                'subtotal_minor' => $totals['subtotal_minor'],
                'shipping_minor' => $totals['shipping_minor'],
                'tax_minor' => $totals['tax_minor'],
                'total_minor' => $totals['total_minor'],
                'tax_rate' => $totals['tax_rate'],
                'tax_inclusive' => $totals['tax_inclusive'],
                'shipping_method' => $totals['shipping_key'],
                'payment_method' => $data['payment_method'],
                'shipping_address' => $data['shipping_address'],
                'billing_address' => $data['billing_address'] ?? null,
                'notes' => $data['notes'] ?? null,
                'placed_at' => now(),
                'language' => app()->getLocale(),
                'exchange_rate' => $this->rates->rate($currency),
            ]);

            $order->items()->createMany($lines);

            // Credit any bag reminder that brought this order back. Must run before
            // the cart is deleted, while its id still links to the reminder record.
            $this->reminders->markConverted($cart, $order);

            $cart->items()->delete();
            $cart->delete();

            return $order;
        });
    }
}
