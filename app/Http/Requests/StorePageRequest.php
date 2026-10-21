<?php

namespace App\Http\Requests;

use App\Models\Page;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $id = $this->route('page')?->id;

        return [
            'title' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('pages', 'slug')->ignore($id),
                Rule::notIn(Page::RESERVED_SLUGS)],
            'template' => ['required', Rule::in(Page::TEMPLATES)],
            'content' => ['nullable', 'string', 'max:200000'],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:160'],
            'is_published' => ['required', 'boolean'],
            'noindex' => ['required', 'boolean'],
            'og_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:min_width=600,max_width=4000'],
            'remove_og_image' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.not_in' => 'That address is already used by another part of the site.',
            'og_image.dimensions' => 'Use an image at least 600px wide. 1200 × 630 works best.',
        ];
    }
}
