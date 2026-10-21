<?php

namespace Database\Seeders;

use App\Http\Controllers\SitemapController;
use App\Models\Collection;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeoSeeder extends Seeder
{
    /** Every Nth item is left without SEO text, so the health check has something to show. */
    private const LEAVE_EVERY = 6;

    private array $summary = [];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: demo SEO data (placeholder address, social links) must never go live.');

            return;
        }

        $this->settings();
        $this->productDescriptions();
        $this->imageAltTexts();
        $this->collectionDescriptions();
        $this->postDescriptions();

        foreach (['index', ...SitemapController::TYPES] as $key) {
            Cache::forget("sitemap.{$key}");
        }

        $this->command->table(['What', 'Result'], $this->summary);
        $this->command->info('Open Admin → General → SEO to see the settings and the health check.');
    }

    /* ---------- settings ---------- */

    private function settings(): void
    {
        $saved = Setting::get('seo');
        $saved = is_array($saved) ? $saved : [];
        $site = $saved['site_name'] ?? null ?: config('app.name');

        $demo = [
            'site_name' => $site,
            'default_description' => "Limited-run tech accessories and desk gear, made in small batches. Secure checkout, fast delivery and 30-day free returns at {$site}.",
            'twitter_handle' => '@'.Str::slug($site, ''),
            'indexing' => true,
            'google_verification' => null,
            'bing_verification' => null,
            'organization' => [
                'legal_name' => "{$site} Pvt. Ltd.",
                'email' => 'hello@'.Str::slug($site).'.test',
                'phone' => '+91 11 4000 0000',
                'street' => '12 Demo Street, Connaught Place',
                'city' => 'New Delhi',
                'postcode' => '110001',
                'country' => 'IN',
                'same_as' => [
                    'https://www.instagram.com/'.Str::slug($site, ''),
                    'https://www.linkedin.com/company/'.Str::slug($site),
                    'https://x.com/'.Str::slug($site, ''),
                    'https://www.youtube.com/@'.Str::slug($site, ''),
                ],
            ],
            'returns' => ['days' => 30, 'free' => true],
            'default_image' => $saved['default_image'] ?? null ?: $this->shareImage($site),
        ];

        $merged = $this->fillBlanks($saved, $demo);
        Setting::put('seo', $merged);

        $this->summary[] = ['Settings', 'Empty fields filled; existing values kept'];
        $this->summary[] = ['Default share image', $merged['default_image'] ? 'storage/'.$merged['default_image'] : 'Skipped (GD not installed)'];
    }

    /** Keep whatever is already set; use the demo value only where it's empty. */
    private function fillBlanks(array $current, array $demo): array
    {
        foreach ($demo as $key => $value) {
            $existing = $current[$key] ?? null;

            if (is_array($value) && ! array_is_list($value)) {
                $current[$key] = $this->fillBlanks(is_array($existing) ? $existing : [], $value);
            } elseif (is_bool($value)) {
                $current[$key] = array_key_exists($key, $current) ? (bool) $existing : $value;
            } elseif (blank($existing)) {
                $current[$key] = $value;
            }
        }

        return $current;
    }

    /** A 1200×630 share image in the shop's colours, drawn with PHP's GD extension. */
    private function shareImage(string $site): ?string
    {
        if (! function_exists('imagecreatetruecolor')) {
            return null;
        }

        $width = 1200;
        $height = 630;
        $image = imagecreatetruecolor($width, $height);

        $ink = imagecolorallocate($image, 0x1f, 0x22, 0x30);
        $violet = imagecolorallocate($image, 0x5b, 0x4f, 0x9a);
        $lavender = imagecolorallocate($image, 0xf0, 0xee, 0xfa);
        $white = imagecolorallocate($image, 0xff, 0xff, 0xff);

        imagefill($image, 0, 0, $ink);
        imagefilledellipse($image, 1060, 120, 520, 520, $violet);
        imagefilledellipse($image, 150, 640, 360, 360, $violet);
        imagefilledrectangle($image, 80, 410, 260, 418, $lavender);

        // GD's built-in font is tiny: draw the text small, then scale it up.
        $this->bigText($image, Str::upper($site), 80, 230, 7, $white);
        $this->bigText($image, 'Limited-run tech, made in small batches', 80, 340, 3, $lavender);

        ob_start();
        imagepng($image, null, 9);
        $png = ob_get_clean();
        imagedestroy($image);

        $path = 'seo/default-share.png';
        Storage::disk('public')->put($path, $png);

        return $path;
    }

    private function bigText(\GdImage $canvas, string $text, int $x, int $y, int $scale, int $colour): void
    {
        $font = 5;
        $w = imagefontwidth($font) * strlen($text);
        $h = imagefontheight($font);

        $small = imagecreatetruecolor($w, $h);
        imagesavealpha($small, true);
        $clear = imagecolorallocatealpha($small, 0, 0, 0, 127);
        imagefill($small, 0, 0, $clear);
        imagestring($small, $font, 0, 0, $text, $colour);

        imagecopyresized($canvas, $small, $x, $y, 0, 0, $w * $scale, $h * $scale, $w, $h);
        imagedestroy($small);
    }

    /* ---------- content ---------- */

    private function productDescriptions(): void
    {
        $filled = 0;
        $left = 0;

        Product::query()->orderBy('id')->get()->each(function (Product $product, int $i) use (&$filled, &$left) {
            if (filled($product->meta_description)) {
                return;
            }

            if ($i % self::LEAVE_EVERY === self::LEAVE_EVERY - 1) {
                $left++;

                return;
            }

            $detail = $product->subtitle ?: Str::before(strip_tags((string) $product->description), '.');
            $text = trim("{$product->name}: {$detail}.");

            $product->meta_description = Str::limit($text.' '.__('Secure checkout and 30-day free returns.'), 155);
            $product->save();
            $filled++;
        });

        $this->summary[] = ['Product meta descriptions', "{$filled} written, {$left} left empty on purpose"];
    }

    private function imageAltTexts(): void
    {
        $filled = 0;
        $left = 0;

        ProductImage::query()
            ->where(fn ($q) => $q->whereNull('alt')->orWhere('alt', ''))
            ->with('product:id,name')
            ->orderBy('id')
            ->get()
            ->each(function (ProductImage $image, int $i) use (&$filled, &$left) {
                if (! $image->product || $i % self::LEAVE_EVERY === self::LEAVE_EVERY - 1) {
                    $left++;

                    return;
                }

                $image->alt = $image->colour_name
                    ? "{$image->product->name} in {$image->colour_name}"
                    : $image->product->name;
                $image->save();
                $filled++;
            });

        $this->summary[] = ['Image alt text', "{$filled} written, {$left} left empty on purpose"];
    }

    private function collectionDescriptions(): void
    {
        if (! Schema::hasColumn('collections', 'meta_description')) {
            $this->summary[] = ['Collection descriptions', 'Skipped (no meta_description column)'];

            return;
        }

        $filled = 0;

        Collection::query()->get()->each(function (Collection $collection) use (&$filled) {
            if (filled($collection->meta_description)) {
                return;
            }

            $source = $collection->description ?: $collection->tagline ?: $collection->name;
            $collection->meta_description = Str::limit(Str::squish(strip_tags((string) $source)), 155);
            $collection->save();
            $filled++;
        });

        $this->summary[] = ['Collection descriptions', "{$filled} written"];
    }

    private function postDescriptions(): void
    {
        if (! Schema::hasColumn('posts', 'meta_description')) {
            $this->summary[] = ['Blog post descriptions', 'Skipped (no meta_description column)'];

            return;
        }

        $filled = 0;

        Post::query()->get()->each(function (Post $post) use (&$filled) {
            if (filled($post->meta_description)) {
                return;
            }

            $source = $post->excerpt ?: $post->body;
            $post->meta_description = Str::limit(Str::squish(strip_tags((string) $source)), 155);
            $post->save();
            $filled++;
        });

        $this->summary[] = ['Blog post descriptions', "{$filled} written"];
    }
}
