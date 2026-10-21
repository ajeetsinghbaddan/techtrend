<?php

namespace App\Support;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReviewImageProcessor
{
    private const MAX_SIDE = 1600;

    /** Re-encode an upload: strips hidden data (like GPS location), fixes rotation, resizes. */
    public function store(UploadedFile $file): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if (! $source instanceof GdImage) {
            throw ValidationException::withMessages(['images' => __('One of the photos could not be read.')]);
        }

        $source = $this->orient($source, $file);

        [$width, $height] = [imagesx($source), imagesy($source)];
        $scale = min(1, self::MAX_SIDE / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $useWebp = function_exists('imagewebp');

        ob_start();
        $useWebp ? imagewebp($canvas, null, 82) : imagejpeg($canvas, null, 85);
        $data = (string) ob_get_clean();

        imagedestroy($source);
        imagedestroy($canvas);

        $path = 'reviews/'.Str::uuid().($useWebp ? '.webp' : '.jpg');
        Storage::disk('public')->put($path, $data);

        return $path;
    }

    /** Phones store rotation as a tag instead of rotating the pixels; apply it before it's stripped. */
    private function orient(GdImage $image, UploadedFile $file): GdImage
    {
        if (! function_exists('exif_read_data') || ! in_array($file->getMimeType(), ['image/jpeg', 'image/jpg'], true)) {
            return $image;
        }

        $orientation = (int) (@exif_read_data($file->getRealPath())['Orientation'] ?? 1);

        $rotated = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => null,
        };

        if ($rotated instanceof GdImage) {
            imagedestroy($image);

            return $rotated;
        }

        return $image;
    }
}
