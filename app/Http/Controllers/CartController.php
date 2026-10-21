<?php

namespace App\Http\Controllers;

use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Support\Storefront;

class CartController extends Controller
{
    public function __construct(private readonly CartManager $cart)
    {
    }

    public function show()
    {
        return Storefront::render('shop/bag', [
            'cart' => $this->cart->summary(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'variant_id' => ['required', 'integer', Rule::exists('product_variants', 'id')],
            'quantity' => ['required', 'integer', 'min:1', 'max:10'],
        ]);

        $notice = $this->cart->add($data['variant_id'], $data['quantity']);

        return back()->with($notice ? ['cart_notice' => $notice] : []);
    }

    public function update(Request $request, int $item)
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:0', 'max:10'],
        ]);

        $notice = $this->cart->updateQuantity($item, $data['quantity']);

        return back()->with($notice ? ['cart_notice' => $notice] : []);
    }

    public function destroy(int $item)
    {
        $this->cart->remove($item);

        return back();
    }
}
