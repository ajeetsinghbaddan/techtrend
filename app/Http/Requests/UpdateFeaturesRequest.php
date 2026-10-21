<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeaturesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:2', 'max:4'],
            'items.*.title' => ['required', 'string', 'max:50'],
            'items.*.text' => ['nullable', 'string', 'max:120'],
            'items.*.href' => ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/'],
        ];
    }
}
