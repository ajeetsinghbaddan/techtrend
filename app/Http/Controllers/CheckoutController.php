<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlaceOrderRequest;
use App\Models\Address;
use App\Models\Order;
use App\Models\User;
use App\Payments\PaymentManager;
use App\Support\CartManager;
use App\Support\CheckoutCalculator;
use App\Support\OrderPlacer;
use App\Support\OrderPresenter;
use App\Support\Storefront;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use RuntimeException;

class CheckoutController extends Controller
{
    public function __construct(private readonly CartManager $cart)
    {
    }

    public function show(Request $request, PaymentManager $payments)
    {
        $summary = $this->cart->summary();

        if ($summary['count'] === 0) {
            return redirect()->route('cart.show');
        }

        $region = $request->attributes->get('region', config('shop.default_region'));
        $calculator = CheckoutCalculator::forRegion($region);
        $subtotal = $summary['subtotal']['minor'];
        $user = $request->user();
        $totals = $calculator->totals($subtotal, 'standard');

        return Storefront::render('shop/checkout', [
            'cart' => $summary,
            'region' => $region,
            // Named "countries" so it doesn't override the shared "regions"
            // prop that the site header needs.
            'countries' => collect(config('shop.regions'))
                ->map(fn ($r, $code) => ['code' => $code, 'label' => $r['label']])
                ->values(),
            'shippingMethods' => $calculator->shippingMethods($subtotal),
            // Only methods that are switched on, set up, and suit this region, currency and total.
            'paymentMethods' => $payments->options($region, $calculator->currency(), $totals['total_minor']),
            'totals' => $totals,
            'user' => $user?->only('name', 'email', 'phone'),
            // The customer's address book, defaults first, ready to drop into the form.
            'savedAddresses' => $user
                ? $user->addresses()
                    ->orderByDesc('is_default_shipping')
                    ->latest()
                    ->get()
                    ->map(fn (Address $a) => [
                        'id' => $a->id,
                        'label' => $a->label,
                        'is_default_shipping' => $a->is_default_shipping,
                        'is_default_billing' => $a->is_default_billing,
                        'address' => $a->toCheckout(),
                    ])
                : [],
        ]);
    }

    public function quote(Request $request)
    {
        $data = $request->validate([
            'shipping_method' => ['required', 'string'],
        ]);

        $region = $request->attributes->get('region', config('shop.default_region'));
        $subtotal = $this->cart->summary()['subtotal']['minor'];

        return back()->with('quote', CheckoutCalculator::forRegion($region)
            ->totals($subtotal, $data['shipping_method']));
    }

    public function store(PlaceOrderRequest $request, OrderPlacer $placer, PaymentManager $payments)
    {
        $cart = $this->cart->current();

        if (! $cart) {
            return redirect()->route('cart.show')->withErrors(['cart' => __('Your bag is empty.')]);
        }

        $region = $request->attributes->get('region', config('shop.default_region'));
        $data = $request->validated();
        $data['region'] = $region;

        if ($request->boolean('billing_same')) {
            $data['billing_address'] = null;
        }

        try {
            $order = $placer->place($cart, $data, CheckoutCalculator::forRegion($region), $request->user()?->id);
        } catch (RuntimeException $e) {
            return back()->withErrors(['cart' => $e->getMessage()]);
        }

        if ($request->user() && $request->boolean('save_address')) {
            $this->saveAddress($request->user(), $data['shipping_address']);
        }

        $request->session()->put('recent_order', $order->number);

        $payment = $payments->begin($order, $order->payment_method);

        // Cash on delivery: the order is complete now.
        if ($payment->gateway === 'cod') {
            $payments->sendOrderEmails($order);

            return redirect()->route('checkout.confirmation', $order->number);
        }

        // Online: off to the provider. The email is sent once payment is confirmed.
        return $payments->respond($payment);
    }

    public function confirmation(Request $request, Order $order)
    {
        // Only the buyer can see this page: their account, or the session that just placed the order.
        $isOwner = $request->user() && $order->user_id === $request->user()->id;
        $isRecent = $request->session()->get('recent_order') === $order->number;

        abort_unless($isOwner || $isRecent, 404);

        $order->load(OrderPresenter::RELATIONS);

        return Storefront::render('shop/confirmation', [
            'order' => OrderPresenter::detail($order),
        ]);
    }

    /* ---------- helpers ---------- */

    /** Save a checkout address to the account, unless it's already there or the book is full. */
    private function saveAddress(User $user, array $address): void
    {
        $fields = Arr::only($address, ['first_name', 'last_name', 'line1', 'line2', 'postcode', 'city', 'country', 'phone']);

        $alreadySaved = $user->addresses()
            ->where(Arr::only($fields, ['first_name', 'last_name', 'line1', 'postcode', 'city', 'country']))
            ->exists();

        if ($alreadySaved || $user->addresses()->count() >= Address::MAX_PER_USER) {
            return;
        }

        $isFirst = ! $user->addresses()->exists();
        $saved = $user->addresses()->create($fields);

        if ($isFirst) {
            $saved->makeDefault('shipping');
            $saved->makeDefault('billing');
        }
    }
}
