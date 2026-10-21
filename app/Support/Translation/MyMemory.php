<?php

namespace App\Support\Translation;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class MyMemory
{
    /** MyMemory rejects requests over 500 bytes; keep a margin. */
    private const MAX_BYTES = 480;

    private const EXHAUSTED_KEY = 'mymemory.exhausted';

    /** Plain text (interface strings, names, specs). Null = couldn't translate safely. */
    public function text(string $text, string $target): ?string
    {
        [$prepared, $map] = $this->protect($text);
        $translated = $this->long($prepared, $target);

        return $translated === null ? null : $this->restore($translated, $map);
    }

    /** HTML (descriptions, blog bodies): translate the text between tags, keep the tags. */
    public function html(string $html, string $target): ?string
    {
        $parts = preg_split('/(<[^>]*>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);

        foreach ($parts as $i => $part) {
            if ($part === '' || str_starts_with($part, '<')) {
                continue;
            }

            // Keep surrounding whitespace, translate only the words.
            if (! preg_match('/^(\s*)(.*?)(\s*)$/su', $part, $m) || $m[2] === '') {
                continue;
            }

            $plain = html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $translated = $this->long($plain, $target);

            if ($translated === null) {
                return null;
            }

            $parts[$i] = $m[1].htmlspecialchars($translated, ENT_NOQUOTES, 'UTF-8').$m[3];
        }

        return implode('', $parts);
    }

    /** Split long text into sentence groups under the byte limit. */
    private function long(string $text, string $target): ?string
    {
        if (strlen($text) <= self::MAX_BYTES) {
            return $this->segment($text, $target);
        }

        $chunks = [];
        $current = '';

        foreach (preg_split('/(?<=[.!?])\s+/u', $text) as $sentence) {
            if (strlen($sentence) > self::MAX_BYTES) {
                return null; // one enormous sentence: leave the text in English
            }

            if ($current !== '' && strlen($current.' '.$sentence) > self::MAX_BYTES) {
                $chunks[] = $current;
                $current = $sentence;
            } else {
                $current = $current === '' ? $sentence : $current.' '.$sentence;
            }
        }

        if ($current !== '') {
            $chunks[] = $current;
        }

        $out = [];

        foreach ($chunks as $chunk) {
            $translated = $this->segment($chunk, $target);

            if ($translated === null) {
                return null;
            }

            $out[] = $translated;
        }

        return implode(' ', $out);
    }

    /** One request, cached forever per sentence and language (successes only). */
    private function segment(string $text, string $target): ?string
    {
        if (trim($text) === '') {
            return $text;
        }

        $target = strtolower($target);
        $key = "mymemory.{$target}.".sha1($text);

        if (($cached = Cache::get($key)) !== null) {
            return $cached;
        }

        if (Cache::has(self::EXHAUSTED_KEY)) {
            return null;
        }

        $translated = $this->request($text, $target);

        if ($translated !== null) {
            Cache::forever($key, $translated);
        }

        return $translated;
    }

    private function request(string $text, string $target): ?string
    {
        usleep(200_000); // pace requests: about 5 per second at most

        try {
            $response = Http::timeout(20)->retry(2, 1000, throw: false)
                ->get('https://api.mymemory.translated.net/get', array_filter([
                    'q' => $text,
                    'langpair' => "en|{$target}",
                    'de' => config('services.mymemory.email'),
                ]));
        } catch (Throwable $e) {
            Log::warning('MyMemory unreachable', ['error' => $e->getMessage()]);

            return null;
        }

        $translated = (string) $response->json('responseData.translatedText', '');

        // When the daily quota is used up, MyMemory returns a warning *as* the translation.
        if (str_contains(strtoupper($translated), 'MYMEMORY WARNING') || $response->status() === 429) {
            Cache::put(self::EXHAUSTED_KEY, true, now()->addHour());
            Log::warning('MyMemory daily quota reached; pausing for an hour.');

            return null;
        }

        if ($response->failed() || (int) $response->json('responseStatus') !== 200 || $translated === '') {
            return null;
        }

        return html_entity_decode($translated, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /** Swap ":count"-style placeholders for tokens MyMemory won't translate. */
    private function protect(string $text): array
    {
        $map = [];

        $prepared = preg_replace_callback('/:([a-z_]+)/i', function ($m) use (&$map) {
            $token = '{'.count($map).'}';
            $map[$token] = $m[0];

            return $token;
        }, $text);

        return [$prepared, $map];
    }

    /** Put placeholders back; if MyMemory lost one, reject the whole translation. */
    private function restore(string $text, array $map): ?string
    {
        foreach ($map as $token => $placeholder) {
            if (! str_contains($text, $token)) {
                return null;
            }

            $text = str_replace($token, $placeholder, $text);
        }

        return $text;
    }
}
