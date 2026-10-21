<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\OrderPresenter;
use App\Support\Storefront;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::forCustomer($request->user())
            ->with('items')
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Order $order) => OrderPresenter::summary($order));

        return Storefront::render('account/orders/index', ['orders' => $orders]);
    }

    public function show(Request $request, string $number)
    {
        $order = Order::forCustomer($request->user())
            ->where('number', $number)
            ->with(OrderPresenter::RELATIONS)
            ->firstOrFail();

        return Storefront::render('account/orders/show', ['order' => OrderPresenter::detail($order)]);
    }
}
