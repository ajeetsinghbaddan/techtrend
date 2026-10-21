<?php

namespace Database\Seeders;

use App\Models\Collection;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $collections = collect([
            ['Keyboards', 'Hot-swap boards, layouts included.'],
            ['Keycaps', 'Cap sets that fit our boards.'],
            ['Switches', 'Linear, tactile and silent.'],
            ['Desk mats', 'Stitched edges, four sizes.'],
            ['Apparel', 'Things to wear at the desk.'],
            ['Cables', 'Coiled, magnetic, or plain.'],
            ['Stickers', 'Small things, cheap.'],
        ])->mapWithKeys(function (array $row, int $i) {
            [$name, $tagline] = $row;

            return [$name => Collection::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'tagline' => $tagline, 'position' => $i, 'is_active' => true],
            )];
        });

        $products = [
            ['Compile 75 — hot-swap 75%', 'Keyboards', 18588, 21538, 4.8, 312, 'Run 06', 400,
                ['Deep Indigo' => '#5b4f9a', 'Graphite' => '#3f4350', 'Bone' => '#e8e3d3'],
                ['ISO-DE — QWERTZ', 'ISO-UK', 'ANSI-US', 'ISO-Nordic']],
            ['Tactile cap set — Deep Indigo', 'Keycaps', 6786, 7769, 4.9, 184, null, null,
                ['Deep Indigo' => '#5b4f9a', 'Graphite' => '#3f4350', 'Bone' => '#e8e3d3'], []],
            ['Works On My Machine tee', 'Apparel', 3344, 3836, 4.7, 96, null, null,
                ['Ink' => '#1f2230', 'Bone' => '#e8e3d3', 'Moss' => '#4a5842'],
                ['S', 'M', 'L', 'XL']],
            ['Grid desk mat XL', 'Desk mats', 4426, 5114, 4.8, 141, null, null,
                ['Navy' => '#242a44', 'Slate' => '#5b6472', 'Bone' => '#e8e3d3'], []],
            ['Terminal hoodie — Ink', 'Apparel', 7769, 8756, 4.9, 73, null, null,
                ['Ink' => '#1f2230', 'Graphite' => '#3f4350', 'Bone' => '#e8e3d3'],
                ['S', 'M', 'L', 'XL']],
            ['Cable Colony magnetic set', 'Cables', 1869, 2360, 4.6, 212, null, null,
                ['Indigo' => '#5b4f9a', 'Graphite' => '#3f4350', 'Bone' => '#e8e3d3'], []],
            ['Sticker pack vol. 3', 'Stickers', 1180, null, 4.9, 408, null, null, [], []],
            ['Escape cap — machined brass', 'Keycaps', 2360, 2852, 4.8, 57, 'Run 02', 150,
                ['Brass' => '#b08d57', 'Graphite' => '#3f4350'], []],
            ['Null Pointer mug — 350 ml', 'Desk mats', 2164, null, 4.7, 129, null, null, [], []],
            ['Linear switch pack — 70', 'Switches', 3540, 4130, 4.7, 98, null, null,
                ['Linear' => '#c94f4f', 'Tactile' => '#7a6bbd', 'Silent' => '#4a5842'], []],
        ];

        foreach ($products as $i => [$name, $collection, $price, $compareAt, $rating, $reviews, $run, $units, $colours, $options]) {
            $product = Product::updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'subtitle' => null,
                    'description' => '<p>Placeholder copy. Replace this in the admin panel before launch.</p>',
                    'specs' => $this->specs($collection),
                    'compliance' => $this->compliance(),
                    'run_label' => $run,
                    'units_total' => $units,
                    'rating' => $rating,
                    'reviews_count' => $reviews,
                    'is_active' => true,
                    'position' => $i,
                ],
            );

            $product->collections()->sync([$collections[$collection]->id => ['position' => $i]]);

            $this->variants($product, $colours, $options);

            foreach (['USD' => 1.0, 'EUR' => 1.0, 'GBP' => 0.85, 'SEK' => 10.9, 'PLN' => 4.3] as $currency => $rate) {
                $product->prices()->updateOrCreate(
                    ['currency' => $currency],
                    [
                        'amount_minor' => (int) round($price * $rate),
                        'compare_at_minor' => $compareAt ? (int) round($compareAt * $rate) : null,
                    ],
                );
            }
        }
    }

    private function variants(Product $product, array $colours, array $options): void
    {
        $colours = $colours ?: ['Default' => null];
        $options = $options ?: [null];
        $position = 0;

        foreach ($colours as $colourName => $hex) {
            foreach ($options as $option) {
                $sku = Str::upper(Str::substr(Str::slug($product->name), 0, 8))
                    .'-'.Str::upper(Str::substr(Str::slug((string) $colourName), 0, 4))
                    .($option ? '-'.Str::upper(Str::substr(Str::slug($option), 0, 6)) : '');

                $product->variants()->updateOrCreate(
                    ['sku' => $sku],
                    [
                        'colour_name' => $colourName === 'Default' ? null : $colourName,
                        'colour_hex' => $hex,
                        'option_name' => $option,
                        'stock' => random_int(0, 60),
                        'position' => $position++,
                        'is_active' => true,
                    ],
                );
            }
        }
    }

    private function specs(string $collection): array
    {
        return match ($collection) {
            'Keyboards' => [
                ['label' => 'Layout', 'value' => 'ISO-DE · 84 keys'],
                ['label' => 'Switches', 'value' => 'Linear — hot-swap, 5-pin'],
                ['label' => 'Case', 'value' => 'CNC aluminium, gasket mount'],
                ['label' => 'Firmware', 'value' => 'QMK / VIA, open source'],
                ['label' => 'Connection', 'value' => 'USB-C · BT 5.1'],
            ],
            'Keycaps' => [
                ['label' => 'Material', 'value' => 'PBT, dye-sublimated'],
                ['label' => 'Profile', 'value' => 'Cherry'],
                ['label' => 'Compatibility', 'value' => 'MX stem'],
            ],
            'Apparel' => [
                ['label' => 'Material', 'value' => '100% combed cotton'],
                ['label' => 'Weight', 'value' => '220 gsm'],
                ['label' => 'Fit', 'value' => 'Regular'],
            ],
            default => [
                ['label' => 'Material', 'value' => 'See description'],
                ['label' => 'Warranty', 'value' => '2 years'],
            ],
        };
    }

    private function compliance(): array
    {
        return [
            ['label' => 'Manufacturer', 'value' => 'Tech Trend BV, Rotterdam, NL · safety@techtrend.example'],
            ['label' => 'Warnings', 'value' => 'Contains small parts. Not suitable for children under 3.'],
            ['label' => 'Legal guarantee', 'value' => '2 years from delivery under consumer law.'],
        ];
    }
}
