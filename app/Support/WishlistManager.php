<?php

namespace App\Support;

use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WishlistManager
{
    public const COOKIE = 'wishlist_token';
    public const MAX_ITEMS = 200;
    private const COOKIE_DAYS = 90;

    public function __construct(private readonly ExchangeRates $rates)
    {
    }

    /** Whoever is browsing: their account if logged in, otherwise their guest cookie (or nobody yet). */
    public function query(Request $request): ?Builder
    {
        if ($user = $request->user()) {
            return WishlistItem::where('wishlist_items.user_id', $user->id);
        }

        $token = $this->token($request);

        return $token
            ? WishlistItem::whereNull('wishlist_items.user_id')->where('wishlist_items.guest_token', $token)
            : null;
    }

    /** Slugs of saved products, shared with every page so hearts show the right state. */
    public function slugs(Request $request): array
    {
        return $this->query($request)
            ?->join('products', 'products.id', '=', 'wishlist_items.product_id')
            ->where('products.is_active', true)
            ->latest('wishlist_items.created_at')
            ->limit(self::MAX_ITEMS)
            ->pluck('products.slug')
            ->all() ?? [];
    }

    /** Save or unsave a product. Returns true when it is now saved. */
    public function toggle(Request $request, Product $product): bool
    {
        $existing = $this->query($request)?->where('wishlist_items.product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        $owner = $this->owner($request);

        if (WishlistItem::where($owner)->count() >= self::MAX_ITEMS) {
            throw ValidationException::withMessages(['wishlist' => __('Your wishlist is full.')]);
        }

        WishlistItem::createOrFirst(
            [...$owner, 'product_id' => $product->id],
            ['added_price_minor' => $product->money($this->rates->base())?->minor],
        );

        return true;
    }

    /** After login or registration: move the guest's saved products into the account. */
    public function mergeOnLogin(Request $request, User $user): void
    {
        $token = $this->token($request);

        if (! $token) {
            return;
        }

        DB::transaction(function () use ($token, $user) {
            $alreadySaved = WishlistItem::where('user_id', $user->id)->pluck('product_id');

            $guestItems = WishlistItem::whereNull('user_id')->where('guest_token', $token);

            (clone $guestItems)->whereIn('product_id', $alreadySaved)->delete();
            (clone $guestItems)->update(['user_id' => $user->id, 'guest_token' => null]);
        });

        Cookie::queue(Cookie::forget(self::COOKIE));
    }

    /** The owner columns for a new item, creating a guest cookie on first save. */
    private function owner(Request $request): array
    {
        if ($user = $request->user()) {
            return ['user_id' => $user->id];
        }

        $token = $this->token($request) ?? Str::random(40);

        // Re-sent on every save, so an active guest's cookie keeps renewing.
        Cookie::queue(self::COOKIE, $token, self::COOKIE_DAYS * 24 * 60);

        return ['user_id' => null, 'guest_token' => $token];
    }

    private function token(Request $request): ?string
    {
        $token = $request->cookie(self::COOKIE);

        return is_string($token) && strlen($token) === 40 && ctype_alnum($token) ? $token : null;
    }
}
