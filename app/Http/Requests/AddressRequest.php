<?php

namespace App\Http\Requests;

use App\Models\Address;
use App\Rules\Postcode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'country' => strtoupper((string) $this->input('country')),
            'postcode' => trim((string) $this->input('postcode')),
        ]);
    }

    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:40'],
            'first_name' => ['required', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'line1' => ['required', 'string', 'max:120'],
            'line2' => ['nullable', 'string', 'max:120'],
            'postcode' => ['required', 'string', 'max:20', new Postcode($this->input('country'))],
            'city' => ['required', 'string', 'max:80'],
            'country' => ['required', Rule::in(array_keys(config('shop.regions')))],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9 +()\-]{6,30}$/'],
            'default_shipping' => ['sometimes', 'boolean'],
            'default_billing' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'label' => __('label'),
            'first_name' => __('first name'),
            'last_name' => __('last name'),
            'line1' => __('street and number'),
            'line2' => __('apartment or suite'),
            'postcode' => __('postcode'),
            'city' => __('city'),
            'country' => __('country'),
            'phone' => __('phone'),
        ];
    }

    /** Only the address columns, never the default flags. */
    public function addressData(): array
    {
        return $this->safe()->only(Address::FIELDS);
    }
}
