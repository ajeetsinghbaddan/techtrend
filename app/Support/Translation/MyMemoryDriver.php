<?php

namespace App\Support\Translation;

use App\Contracts\MachineTranslator;
use Illuminate\Support\Facades\Http;

class MyMemoryDriver implements MachineTranslator
{
    private const MAX_BYTES = 500;

    public function translate(array $texts, string $target, bool $html = false): array
    {
        $results = [];

        foreach (array_values($texts) as $text) {
            $results[] = $this->one($text, strtolower($target));
            usleep(200_000); // be polite: at most ~5 requests a second
        }

        return $results;
    }

    private function one(string $text, string $target): ?string
    {
        // MyMemory rejects longer texts; leave them in English (Azure handles these).
        if (strlen($text) > self::MAX_BYTES) {
            return null;
        }

        $response = Http::timeout(20)->retry(2, 1000)
            ->get('https://api.mymemory.translated.net/get', array_filter([
                'q' => $text,
                'langpair' => "en|{$target}",
                'de' => config('services.mymemory.email'),
            ]));

        if ($response->failed() || (int) $response->json('responseStatus') !== 200) {
            return null;
        }

        $translated = (string) $response->json('responseData.translatedText', '');

        // When the daily quota is used up, MyMemory returns a warning *as the translation*.
        if ($translated === '' || str_contains(strtoupper($translated), 'MYMEMORY WARNING')) {
            return null;
        }

        return html_entity_decode($translated, ENT_QUOTES | ENT_HTML5);
    }
}
