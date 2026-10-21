<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'collection_ids' => $this->input('collection_ids', []),
            'specs' => $this->input('specs', []),
            'compliance' => $this->input('compliance', []),
            'variants' => $this->input('variants', []),
            'prices' => $this->input('prices', []),
        ]);
    }

    public function rules(): array
    {
        $id = $this->route('product')?->id;
        $currencies = ['USD', 'EUR', 'GBP', 'SEK', 'PLN'];

        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('products', 'slug')->ignore($id)],
            'subtitle' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:50000'],
            'is_active' => ['required', 'boolean'],

            'run_label' => ['nullable', 'string', 'max:30'],
            'units_total' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'reviews_count' => ['required', 'integer', 'min:0', 'max:1000000'],

            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:160'],

            'collection_ids' => ['present', 'array', 'max:20'],
            'collection_ids.*' => ['integer', Rule::exists('collections', 'id')],

            'specs' => ['present', 'array', 'max:20'],
            'specs.*.label' => ['required', 'string', 'max:40'],
            'specs.*.value' => ['required', 'string', 'max:160'],

            'compliance' => ['present', 'array', 'max:10'],
            'compliance.*.label' => ['required', 'string', 'max:40'],
            'compliance.*.value' => ['required', 'string', 'max:400'],

            'variants' => ['present', 'array', 'min:1', 'max:60'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.colour_name' => ['nullable', 'string', 'max:40'],
            'variants.*.colour_hex' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'variants.*.option_name' => ['nullable', 'string', 'max:40'],
            'variants.*.sku' => ['required', 'string', 'max:60', 'regex:/^[A-Za-z0-9._-]+$/', 'distinct'],
            'variants.*.stock' => ['required', 'integer', 'min:-99999', 'max:999999'],
            'variants.*.price_adjustment_minor' => ['required', 'integer', 'min:-10000000', 'max:10000000'],
            'variants.*.is_active' => ['required', 'boolean'],

            'prices' => ['present', 'array'],
            'prices.*.currency' => ['required', 'string', Rule::in($currencies), 'distinct'],
            'prices.*.amount_minor' => ['required', 'integer', 'min:0', 'max:100000000'],
            'prices.*.compare_at_minor' => ['nullable', 'integer', 'min:0', 'max:100000000',
                'gt:prices.*.amount_minor'],
        ];
    }

    public function messages(): array
    {
        return [
            'variants.*.sku.distinct' => 'Each variant needs its own SKU.',
            'prices.*.compare_at_minor.gt' => 'The compare-at price must be higher than the price.',
            'variants.min' => 'A product needs at least one variant.',
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $base = config('shop.base_currency');
                $row = collect($this->input('prices', []))->firstWhere('currency', $base);

                if (! $row || (int) ($row['amount_minor'] ?? 0) <= 0) {
                    $validator->errors()->add('prices', "A {$base} price is required. Other currencies convert from it.");
                }
            },
        ];
    }
}
