<?php

namespace App\Console\Commands;

use App\Support\Translation\MyMemory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SyncTranslations extends Command
{
    protected $signature = 'translations:sync {--locale=* : Only these locales}';

    protected $description = 'Find t() and __() strings and machine-translate the missing ones';

    public function handle(MyMemory $translator): int
    {
        $keys = $this->collectKeys();
        $locales = $this->option('locale')
            ?: array_values(array_diff(array_keys(config('shop.locales')), ['en']));

        $this->info(count($keys).' strings found in the code.');

        if ($keys === []) {
            $this->warn('Nothing to translate. Wrap interface text in t(\'...\') first.');

            return self::SUCCESS;
        }

        File::ensureDirectoryExists(lang_path());

        foreach ($locales as $locale) {
            $path = lang_path("{$locale}.json");
            $existing = is_file($path) ? (json_decode(file_get_contents($path), true) ?? []) : [];
            $missing = array_values(array_diff($keys, array_keys($existing)));

            $this->newLine();
            $this->line("<info>{$locale}</info>: ".count($missing).' to translate');

            $failed = [];

            if ($missing) {
                $this->withProgressBar($missing, function (string $key) use ($translator, $locale, &$existing, &$failed) {
                    $translated = $translator->text($key, $locale);

                    if ($translated === null) {
                        $failed[] = $key;
                    } else {
                        $existing[$key] = $translated;
                    }
                });
                $this->newLine();
            }

            ksort($existing);
            file_put_contents($path, json_encode($existing,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n");

            foreach ($failed as $key) {
                $this->warn("  left in English: {$key}");
            }
        }

        $this->newLine();
        $this->info('Done. Commit the lang/*.json files.');

        return self::SUCCESS;
    }

    private function collectKeys(): array
    {
        $jsPattern = '/\bt\(\s*([\'"])((?:\\\\.|(?!\1).)+?)\1/';
        $phpPattern = '/\b__\(\s*([\'"])((?:\\\\.|(?!\1).)+?)\1/';

        $sources = [
            [resource_path('js'), ['ts', 'tsx'], $jsPattern],
            [app_path(), ['php'], $phpPattern],
            [resource_path('views'), ['php'], $phpPattern],
        ];

        $keys = [];

        foreach ($sources as [$dir, $extensions, $pattern]) {
            if (! is_dir($dir)) {
                continue;
            }

            foreach (File::allFiles($dir) as $file) {
                if (! in_array($file->getExtension(), $extensions, true)) {
                    continue;
                }

                preg_match_all($pattern, $file->getContents(), $matches);

                foreach ($matches[2] as $match) {
                    $keys[] = stripcslashes($match);
                }
            }
        }

        return array_values(array_unique($keys));
    }
}
