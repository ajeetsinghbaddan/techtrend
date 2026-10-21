<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePromosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $group = $this->route('group');
        $max = $group === 'explore' ? 4 : 3;
        return [
            'cards' => ['required', 'array', 'min:2', "max:$max"],
            'cards.*.id' => ['nullable', 'string', 'max:64'],
            'cards.*.title' => ['required', 'string', 'max:50'],
            'cards.*.text' => ['nullable', 'string', 'max:140'],

            'cards.*.label' => ['nullable', 'string', 'max:30', 'required_with:cards.*.href'],
            'cards.*.href' => ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/', 'required_with:cards.*.label'],

            'cards.*.box_position' => ['required', Rule::in(['top-left', 'top-right', 'bottom-left', 'bottom-right'])],

            'cards.*.image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
            'cards.*.remove_image' => ['boolean'],
        ];
    }
}
