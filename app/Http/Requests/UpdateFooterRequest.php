<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFooterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    protected function prepareForValidation(): void
    {
        $columns = collect($this->input('columns', []))
            ->map(fn ($column) => [...$column, 'links' => $column['links'] ?? []])
            ->all();

        $this->merge([
            'columns' => $columns,
            'badges' => $this->input('badges', []),
        ]);
    }

    public function rules(): array
    {
        return [
            'description' => ['nullable', 'string', 'max:300'],

            'columns' => ['present', 'array', 'max:4'],
            'columns.*.title' => ['required', 'string', 'max:30'],
            'columns.*.links' => ['present', 'array', 'max:10'],
            'columns.*.links.*.label' => ['required', 'string', 'max:40'],
            'columns.*.links.*.href' => ['required', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/|mailto:)/'],

            'copyright' => ['nullable', 'string', 'max:120'],
            'badges' => ['present', 'array', 'max:8'],
            'badges.*' => ['required', 'string', 'max:24'],
        ];
    }
}
