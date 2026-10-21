<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHeroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $safeUrl = ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/'];

        return [
            'autoplay' => ['required', 'boolean'],
            'delay' => ['required', 'integer', 'min:2000', 'max:15000'],

            'slides' => ['required', 'array', 'min:1', 'max:6'],
            'slides.*.id' => ['nullable', 'string', 'max:64'],
            'slides.*.eyebrow' => ['nullable', 'string', 'max:60'],
            'slides.*.title' => ['required', 'string', 'max:80'],
            'slides.*.text' => ['nullable', 'string', 'max:220'],

            'slides.*.primary_label' => ['nullable', 'string', 'max:30', 'required_with:slides.*.primary_href'],
            'slides.*.primary_href' => [...$safeUrl, 'required_with:slides.*.primary_label'],
            'slides.*.secondary_label' => ['nullable', 'string', 'max:30', 'required_with:slides.*.secondary_href'],
            'slides.*.secondary_href' => [...$safeUrl, 'required_with:slides.*.secondary_label'],

            'slides.*.image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
            'slides.*.remove_image' => ['boolean'],
        ];
    }
}
