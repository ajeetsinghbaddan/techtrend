<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $id = $this->route('collection')?->id;

        return [
            'name' => ['required', 'string', 'max:60'],
            'slug' => ['nullable', 'string', 'max:70', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('collections', 'slug')->ignore($id)],
            'tagline' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:160'],
            'image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'remove_image' => ['boolean'],
        ];
    }
}
