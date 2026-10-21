<?php

namespace App\Http\Requests;

use App\Payments\PaymentManager;
use App\Rules\Postcode;
use App\Support\CartManager;
use App\Support\CheckoutCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlaceOrderRequest extends FormRequest
{
    public function rules(): array
    {
        $region = $this->attributes->get('region', config('shop.default_region'));
        $countries = array_keys(config('shop.regions'));

        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],

            'shipping_address.first_name' => ['required', 'string', 'max:60'],
            'shipping_address.last_name' => ['required', 'string', 'max:60'],
            'shipping_address.line1' => ['required', 'string', 'max:120'],
            'shipping_address.line2' => ['nullable', 'string', 'max:120'],
            'shipping_address.postcode' => ['required', 'string', 'max:16',
                new Postcode($this->input('shipping_address.country'))],
            'shipping_address.city' => ['required', 'string', 'max:80'],
            'shipping_address.country' => ['required', 'string', 'size:2', Rule::in($countries)],
            'shipping_address.phone' => ['nullable', 'string', 'max:30'],

            'billing_same' => ['required', 'boolean'],
            'billing_address' => ['exclude_if:billing_same,true', 'required', 'array'],
            'billing_address.first_name' => ['exclude_if:billing_same,true', 'required', 'string', 'max:60'],
            'billing_address.last_name' => ['exclude_if:billing_same,true', 'required', 'string', 'max:60'],
            'billing_address.line1' => ['exclude_if:billing_same,true', 'required', 'string', 'max:120'],
            'billing_address.line2' => ['exclude_if:billing_same,true', 'nullable', 'string', 'max:120'],
            'billing_address.postcode' => ['exclude_if:billing_same,true', 'required', 'string', 'max:16',
                new Postcode($this->input('billing_address.country'))],
            'billing_address.city' => ['exclude_if:billing_same,true', 'required', 'string', 'max:80'],
            'billing_address.country' => ['exclude_if:billing_same,true', 'required', 'string', 'size:2'],

            'shipping_method' => ['required', 'string', Rule::in(array_keys(config('shop.shipping.methods')))],
            'payment_method' => ['required', 'string', Rule::in($this->availablePaymentMethods($region))],

            'notes' => ['nullable', 'string', 'max:500'],
            'terms' => ['accepted'],
            'save_address' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'terms.accepted' => __('Please accept the terms to place your order.'),
            'shipping_address.country.in' => __('We do not ship to that country yet.'),
            'payment_method.in' => __('Please choose one of the payment methods shown.'),
        ];
    }

    /** Human-readable field names for error messages. */
    public function attributes(): array
    {
        $address = [
            'first_name' => __('first name'),
            'last_name' => __('last name'),
            'line1' => __('street and number'),
            'line2' => __('apartment or suite'),
            'postcode' => __('postcode'),
            'city' => __('city'),
            'country' => __('country'),
            'phone' => __('phone'),
        ];

        $attributes = [
            'email' => __('email'),
            'shipping_method' => __('delivery method'),
            'payment_method' => __('payment method'),
            'notes' => __('order notes'),
            'terms' => __('terms'),
        ];

        foreach (['shipping_address', 'billing_address'] as $prefix) {
            foreach ($address as $field => $label) {
                $attributes["{$prefix}.{$field}"] = $label;
            }
        }

        return $attributes;
    }

    /** The methods checkout offered, for this region, currency and order total. */
    private function availablePaymentMethods(string $region): array
    {
        $calculator = CheckoutCalculator::forRegion($region);
        $subtotal = app(CartManager::class)->summary()['subtotal']['minor'];
        $totals = $calculator->totals($subtotal, (string) $this->input('shipping_method', 'standard'));

        return app(PaymentManager::class)
            ->options($region, $calculator->currency(), $totals['total_minor'])
            ->pluck('key')
            ->all();
    }
}
