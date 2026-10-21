<?php

namespace App\Jobs;

use App\Models\ContentTranslation;
use App\Support\ContentTranslator;
use App\Support\Translation\MyMemory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Mews\Purifier\Facades\Purifier;

class TranslateContent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 5;

    /** Retry after 5 min, 30 min, 2 h, 6 h: enough to outlast a used-up daily quota. */
    public array $backoff = [300, 1800, 7200, 21600];

    public function __construct(public string $text, public bool $html = false)
    {
    }

    public function handle(MyMemory $translator): void
    {
        $hash = sha1($this->text);
        $missing = false;

        foreach (array_keys(config('shop.locales')) as $locale) {
            if ($locale === 'en') {
                continue;
            }

            if (ContentTranslation::where('locale', $locale)->where('source_hash', $hash)->exists()) {
                continue;
            }

            $translated = $this->html
                ? $translator->html($this->text, $locale)
                : $translator->text($this->text, $locale);

            if ($translated === null) {
                $missing = true;
                continue;
            }

            // Safe with several workers: if another job saved this row a moment ago,
            // fetch it instead of failing on the unique (locale, source_hash) rule.
            ContentTranslation::createOrFirst(
                ['locale' => $locale, 'source_hash' => $hash],
                [
                    'source' => $this->text,
                    'text' => $this->html ? Purifier::clean($translated) : $translated,
                ],
            );

            ContentTranslator::forget($locale);
        }

        // Some languages failed (usually the daily quota): try again later.
        if ($missing && $this->attempts() < $this->tries) {
            $this->release($this->backoff[$this->attempts() - 1] ?? 21600);
        }
    }
}
