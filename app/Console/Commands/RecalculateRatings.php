<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class RecalculateRatings extends Command
{
    protected $signature = 'reviews:recalculate';

    protected $description = 'Recalculate every product\'s rating and review count from approved reviews';

    public function handle(): int
    {
        $total = Product::count();
        $bar = $this->output->createProgressBar($total);

        Product::query()->chunkById(100, function ($products) use ($bar) {
            foreach ($products as $product) {
                $product->refreshRating();
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();

        $withReviews = Product::where('reviews_count', '>', 0)->count();
        $this->info("Done. {$withReviews} of {$total} products have approved reviews.");

        return self::SUCCESS;
    }
}
