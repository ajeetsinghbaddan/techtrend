<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCookieBannerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    public function rules(): array
    {
        $label = ['required', 'string', 'max:30'];
        $description = ['required', 'string', 'max:200'];

        return [
            'enabled' => ['required', 'boolean'],
            'position' => ['required', Rule::in(['bottom', 'bottom-left'])],
            'text' => ['required', 'string', 'max:400'],
            'accept_label' => $label,
            'reject_label' => $label,
            'customize_label' => $label,
            'save_label' => $label,
            'policy_label' => ['nullable', 'string', 'max:40'],
            'policy_href' => ['nullable', 'string', 'max:255', 'regex:/^(\/(?!\/)|https:\/\/)/'],
            'essential_label' => ['required', 'string', 'max:40'],
            'essential_description' => $description,

            'categories.analytics.enabled' => ['required', 'boolean'],
            'categories.analytics.label' => ['required', 'string', 'max:40'],
            'categories.analytics.description' => $description,
            'categories.marketing.enabled' => ['required', 'boolean'],
            'categories.marketing.label' => ['required', 'string', 'max:40'],
            'categories.marketing.description' => $description,

            'ga_measurement_id' => ['nullable', 'string', 'regex:/^G-[A-Z0-9]{4,20}$/'],
            'plausible_domain' => ['nullable', 'string', 'max:100', 'regex:/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i'],

            'ask_again' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'ga_measurement_id.regex' => 'A Google Analytics 4 ID looks like G-ABC123XYZ.',
            'plausible_domain.regex' => 'Enter just the domain, like techtrend.eu.',
        ];
    }
}
