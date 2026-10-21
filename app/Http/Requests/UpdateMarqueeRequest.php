<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMarqueeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'speed' => ['required', 'integer', 'min:10', 'max:120'],
            'direction' => ['required', Rule::in(['left', 'right'])],
            'items' => ['present', 'array', 'max:20'],
            'items.*' => ['required', 'string', 'max:70'],
        ];
    }
}
