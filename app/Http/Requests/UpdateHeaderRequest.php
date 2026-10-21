<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHeaderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    protected function prepareForValidation(): void
    {
        $nav = collect($this->input('nav', []))
            ->map(fn ($item) => [...$item, 'children' => $item['children'] ?? []])
            ->all();

        $this->merge([
            'announcements' => $this->input('announcements', []),
            'nav' => $nav,
        ]);
    }

    public function rules(): array
    {
        $safeUrl = ['required', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/'];
        $label = ['required', 'string', 'max:40'];

        return [
            'brand_name' => $label,
            'search_placeholder' => ['required', 'string', 'max:60'],

            'logo' => [
                'nullable',
                'image',
                'mimes:png,jpg,jpeg,webp',
                'max:1024',
                'dimensions:max_width=2000,max_height=2000',
            ],
            'remove_logo' => ['boolean'],

            'announcements' => ['present', 'array', 'max:5'],
            'announcements.*' => ['required', 'string', 'max:80'],

            'nav' => ['present', 'array', 'max:8'],
            'nav.*.label' => $label,
            'nav.*.href' => $safeUrl,
            'nav.*.children' => ['present', 'array', 'max:12'],
            'nav.*.children.*.label' => $label,
            'nav.*.children.*.href' => $safeUrl,
        ];
    }
}
