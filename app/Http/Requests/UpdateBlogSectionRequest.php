<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBlogSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'title' => ['required', 'string', 'max:60'],
            'subtitle' => ['nullable', 'string', 'max:140'],
            'count' => ['required', 'integer', 'min:2', 'max:8'],
        ];
    }
}
