<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Review;
use App\Models\WishlistItem;
use App\Support\OrderPresenter;
use App\Support\Storefront;
use Illuminate\Http\Request;

class OverviewController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        return Storefront::render('account/index', [
            'account' => [
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->hasVerifiedEmail(),
                'two_factor' => $user->two_factor_confirmed_at !== null,
            ],
            'recentOrders' => Order::forCustomer($user)
                ->with('items')
                ->latest('id')
                ->take(3)
                ->get()
                ->map(fn (Order $order) => OrderPresenter::summary($order)),
            'defaultAddress' => $user->addresses()->where('is_default_shipping', true)->first()?->present(),
            'counts' => [
                'orders' => Order::forCustomer($user)->count(),
                'addresses' => $user->addresses()->count(),
                'wishlist' => WishlistItem::where('user_id', $user->id)->count(),
                'reviews' => Review::where('user_id', $user->id)->count(),
            ],
        ]);
    }
}
