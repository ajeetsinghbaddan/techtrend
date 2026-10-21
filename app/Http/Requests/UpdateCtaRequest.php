<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCtaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'eyebrow' => ['nullable', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:80'],
            'text' => ['nullable', 'string', 'max:220'],

            'label' => ['nullable', 'string', 'max:30', 'required_with:href'],
            'href' => ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/', 'required_with:label'],

            'stats' => ['present', 'array', 'max:6'],
            'stats.*.value' => ['required', 'string', 'max:12'],
            'stats.*.label' => ['required', 'string', 'max:40'],
        ];
    }
}
