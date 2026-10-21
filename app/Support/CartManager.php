<?php

namespace App\Support;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartManager
{
    public const COOKIE = 'cart_token';
    private const MAX_PER_LINE = 10;
    private const MAX_LINES = 30;

    public function __construct(private readonly Request $request)
    {
    }

    public function current(): ?Cart
    {
        $user = $this->request->user();

        if ($user) {
            return Cart::where('user_id', $user->id)->first();
        }

        $token = $this->request->cookie(self::COOKIE);

        return $token ? Cart::whereNull('user_id')->where('token', $token)->first() : null;
    }

    public function currentOrCreate(): Cart
    {
        $cart = $this->current();

        if ($cart) {
            $cart->forceFill(['last_active_at' => now()])->save();

            return $cart;
        }

        $token = Str::random(48);

        $cart = Cart::create([
            'token' => $token,
            'user_id' => $this->request->user()?->id,
            'currency' => $this->currency(),
            'region' => $this->region(),
            'last_active_at' => now(),
        ]);

        Cookie::queue(self::COOKIE, $token, 60 * 24 * 60);

        return $cart;
    }

    public function add(int $variantId, int $quantity): string
    {
        $variant = ProductVariant::with('product')
            ->where('is_active', true)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->find($variantId);

        if (! $variant) {
            return __('That option is not available.');
        }

        $cart = $this->currentOrCreate();

        return DB::transaction(function () use ($cart, $variant, $quantity) {
            $item = $cart->items()->where('product_variant_id', $variant->id)->lockForUpdate()->first();

            if (! $item && $cart->items()->count() >= self::MAX_LINES) {
                return __('Your bag is full.');
            }

            $wanted = ($item?->quantity ?? 0) + $quantity;
            $allowed = min($wanted, self::MAX_PER_LINE, max(0, $variant->stock));

            if ($allowed <= 0) {
                return __('That option is out of stock.');
            }

            $cart->items()->updateOrCreate(
                ['product_variant_id' => $variant->id],
                ['quantity' => $allowed],
            );

            return $allowed < $wanted
                ? __('Only :count available, so we added what we could.', ['count' => $allowed])
                : '';
        });
    }

    public function updateQuantity(int $itemId, int $quantity): string
    {
        $cart = $this->current();

        if (! $cart) {
            return __('Your bag is empty.');
        }

        $item = $cart->items()->with('variant')->find($itemId);

        if (! $item) {
            return __('That item is no longer in your bag.');
        }

        if ($quantity <= 0) {
            $item->delete();

            return '';
        }

        $allowed = min($quantity, self::MAX_PER_LINE, max(0, $item->variant?->stock ?? 0));

        if ($allowed <= 0) {
            $item->delete();

            return __('That option is out of stock and was removed.');
        }

        $item->update(['quantity' => $allowed]);

        return $allowed < $quantity ? __('Only :count available.', ['count' => $allowed]) : '';
    }

    public function remove(int $itemId): void
    {
        $this->current()?->items()->where('id', $itemId)->delete();
    }

    public function mergeOnLogin(int $userId): void
    {
        $token = $this->request->cookie(self::COOKIE);

        if (! $token) {
            return;
        }

        $guestCart = Cart::whereNull('user_id')->where('token', $token)->with('items')->first();

        if (! $guestCart) {
            return;
        }

        $userCart = Cart::where('user_id', $userId)->first();

        if (! $userCart) {
            $guestCart->update(['user_id' => $userId]);

            return;
        }

        DB::transaction(function () use ($guestCart, $userCart) {
            foreach ($guestCart->items as $item) {
                $existing = $userCart->items()->where('product_variant_id', $item->product_variant_id)->first();

                $quantity = min(
                    ($existing?->quantity ?? 0) + $item->quantity,
                    self::MAX_PER_LINE,
                    max(0, $item->variant?->stock ?? 0),
                );

                if ($quantity > 0) {
                    $userCart->items()->updateOrCreate(
                        ['product_variant_id' => $item->product_variant_id],
                        ['quantity' => $quantity],
                    );
                }
            }

            $guestCart->delete();
        });

        Cookie::queue(Cookie::forget(self::COOKIE));
    }

    /** Build everything the frontend needs, with prices from the database. */
    public function summary(): array
    {
        $cart = $this->current();
        $currency = $this->currency();
        $locale = $this->locale();

        if (! $cart) {
            return $this->emptySummary($currency, $locale);
        }

        $cart->loadLines();
        $subtotal = 0;
        $lines = [];

        foreach ($cart->items as $item) {
            $variant = $item->variant;
            $product = $variant?->product;

            if (! $variant || ! $product || ! $product->is_active || ! $variant->is_active) {
                $item->delete();
                continue;
            }

            $base = $product->money($currency);

            if (! $base) {
                $item->delete();
                continue;
            }

            $unit = Money::of($base->minor + $variant->price_adjustment_minor, $currency);
            $lineTotal = $unit->times($item->quantity);
            $subtotal += $lineTotal->minor;

            $lines[] = [
                'id' => $item->id,
                'name' => $product->tr('name'),
                'slug' => $product->slug,
                'variant_label' => $variant->label(),
                'image_url' => $product->images->first()?->url,
                'quantity' => $item->quantity,
                'max' => min(self::MAX_PER_LINE, max(0, $variant->stock)),
                'unit_price' => $unit->toArray($locale),
                'line_total' => $lineTotal->toArray($locale),
            ];
        }

        return [
            'lines' => $lines,
            'count' => array_sum(array_column($lines, 'quantity')),
            'subtotal' => Money::of($subtotal, $currency)->toArray($locale),
            'currency' => $currency,
            'tax_note' => config("shop.regions.{$this->region()}.tax"),
        ];
    }

    private function emptySummary(string $currency, string $locale): array
    {
        return [
            'lines' => [],
            'count' => 0,
            'subtotal' => Money::of(0, $currency)->toArray($locale),
            'currency' => $currency,
            'tax_note' => config("shop.regions.{$this->region()}.tax"),
        ];
    }

    private function region(): string
    {
        return $this->request->attributes->get('region', config('shop.default_region'));
    }

    private function currency(): string
    {
        return config("shop.regions.{$this->region()}.currency") ?? config('shop.default_currency');
    }

    private function locale(): string
    {
        return config("shop.regions.{$this->region()}.locale") ?? 'en_US';
    }
}
