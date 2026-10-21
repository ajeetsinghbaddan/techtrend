<?php

namespace App\Models\Concerns;

use App\Jobs\TranslateContent;
use App\Support\ContentTranslator;

trait HasMachineTranslations
{
    /** Return [field => isHtml] */
    abstract protected function machineTranslated(): array;

    public static function bootHasMachineTranslations(): void
    {
        static::saved(function (self $model) {
            $changed = collect($model->machineTranslated())
                ->filter(fn ($html, $field) => $model->wasRecentlyCreated || $model->wasChanged($field));

            $model->queueTranslations($changed->all());
        });
    }

    public function queueTranslations(?array $fields = null): void
    {
        foreach ($fields ?? $this->machineTranslated() as $field => $html) {
            $value = $this->getAttribute($field);

            if (is_array($value)) {
                array_walk_recursive($value, function ($leaf, $key) {
                    if (ContentTranslator::translatable($key, $leaf)) {
                        TranslateContent::dispatch($leaf);
                    }
                });
            } elseif (ContentTranslator::translatable($field, $value)) {
                TranslateContent::dispatch($value, $html);
            }
        }
    }

    public function tr(string $field): mixed
    {
        $value = $this->getAttribute($field);
        $translator = app(ContentTranslator::class);

        return is_array($value) ? $translator->deep($value) : $translator->get($value);
    }
}
