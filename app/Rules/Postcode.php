<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Postcode implements ValidationRule
{
    /** Countries without a pattern here accept any postcode. */
    private const PATTERNS = [
        'DE' => '/^\d{5}$/',
        'FR' => '/^\d{5}$/',
        'NL' => '/^\d{4} ?[A-Z]{2}$/i',
        'BE' => '/^\d{4}$/',
        'SE' => '/^\d{3} ?\d{2}$/',
        'PL' => '/^\d{2}-\d{3}$/',
        'GB' => '/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i',
        'US' => '/^\d{5}(-\d{4})?$/',
        'IN' => '/^\d{6}$/',
    ];

    public function __construct(private readonly ?string $country)
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $pattern = self::PATTERNS[strtoupper((string) $this->country)] ?? null;

        if ($pattern && ! preg_match($pattern, trim((string) $value))) {
            $fail(__('This postcode does not look right for the selected country.'));
        }
    }
}
