<?php

namespace App\Http\Requests;

use App\Support\ProductRows;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRowsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['rows' => $this->input('rows', [])]);
    }

    public function rules(): array
    {
        return [
            'rows' => ['present', 'array', 'max:6'],
            'rows.*.id' => ['nullable', 'string', 'max:64'],
            'rows.*.title' => ['required', 'string', 'max:60'],
            'rows.*.subtitle' => ['nullable', 'string', 'max:120'],
            'rows.*.source' => ['required', Rule::in(ProductRows::SOURCES)],
            'rows.*.collection_slug' => ['nullable', 'required_if:rows.*.source,collection', 'string',
                Rule::exists('collections', 'slug')],
            'rows.*.product_ids' => ['nullable', 'required_if:rows.*.source,manual', 'array',
                'max:'.ProductRows::MAX_PRODUCTS],
            'rows.*.product_ids.*' => ['integer', 'distinct', Rule::exists('products', 'id')],
            'rows.*.limit' => ['required', 'integer', 'min:2', 'max:'.ProductRows::MAX_PRODUCTS],
            'rows.*.link_label' => ['nullable', 'string', 'max:30', 'required_with:rows.*.link_href'],
            'rows.*.link_href' => ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/',
                'required_with:rows.*.link_label'],
            'rows.*.placement' => ['required', Rule::in(ProductRows::PLACEMENTS)],
            'rows.*.enabled' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'rows.*.collection_slug.required_if' => 'Choose a collection.',
            'rows.*.product_ids.required_if' => 'Pick at least one product.',
            'rows.*.product_ids.max' => 'A row can hold up to 12 products.',
        ];
    }
}
