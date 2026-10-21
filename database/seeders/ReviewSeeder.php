<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ReviewSeeder extends Seeder
{
    private const NAMES = [
        'Lena Hoffmann', 'Jonas Becker', 'Marie Dubois', 'Lucas Martin', 'Sanne de Vries',
        'Daan Jansen', 'Elin Lindqvist', 'Oskar Nilsson', 'Zofia Nowak', 'Jakub Kowalski',
        'Emma Wilson', 'Oliver Brown', 'Sofia Rossi', 'Mateo García', 'Hannah Schmidt',
        'Felix Wagner', 'Chloé Bernard', 'Hugo Petit', 'Noor Visser', 'Liam Murphy',
        'Aisha Khan', 'Ravi Mehta', 'Mia Fischer', 'Leon Weber', 'Ingrid Berg',
        'Maja Andersson', 'Tomasz Wiśniewski', 'Anna Zielińska', 'Grace Taylor', 'Noah Davies',
    ];

    /** English reviews by star rating. ":product" is replaced with the product name. */
    private const REVIEWS = [
        5 => [
            ['Exactly what I hoped for', "I've been using the :product every day for a few weeks now and it still feels great. Build quality is excellent and nothing rattles or creaks."],
            ['Worth every cent', "Took me a while to decide, but I'm glad I went for it. Setup took five minutes and it's been flawless since."],
            ['Best purchase this year', 'Solid, well made and clearly designed by people who care about details. Delivery was quick and the packaging was lovely too.'],
            ['Love it', 'Looks even better in person than in the photos. Feels premium and works perfectly with both my Mac and my Windows laptop.'],
            ['Fantastic quality', 'The finish is beautiful and it feels reassuringly solid. I have already ordered a second one for the office.'],
            ['Highly recommend', 'Arrived two days after ordering, well packed. Everything works as described and the small details are really well thought through.'],
        ],
        4 => [
            ['Very good, one small gripe', "Really happy with the :product overall. I only wish the cable were a bit longer, but that's easy to fix."],
            ['Great, but pricey', "Excellent quality and it does everything I need. It's on the expensive side, which is the only reason it's not five stars."],
            ['Solid choice', "Does exactly what it says. It took me a couple of days to get used to it, but now I wouldn't go back."],
            ['Nice build, slow delivery', 'The product itself is great. Shipping took a few days longer than estimated, but support kept me updated.'],
            ['Happy with it', 'Good materials and it works reliably. The instructions could be clearer, but I figured it out quickly.'],
        ],
        3 => [
            ['Good, not great', "It's fine for the price. Nothing wrong with it, but it didn't wow me the way I expected."],
            ['Mixed feelings', 'Build quality is good, but the colour is darker than in the photos. Works well otherwise.'],
            ['Does the job', "Works as expected. A bit louder than I hoped, so I mostly use it when I'm working alone."],
            ['Okay overall', "Some parts feel premium, others a bit cheap. Decent, but I'd compare alternatives first."],
        ],
        2 => [
            ['Not for me', "Looks great, but it just didn't suit the way I work. Returning it was easy, at least."],
            ['Expected more', 'For this price I expected better finishing. One edge was slightly rough when it arrived.'],
            ['Disappointing', 'It works, but the :product felt flimsier than I expected after reading the description.'],
        ],
        1 => [
            ['Arrived damaged', 'The box was crushed and the product had a scratch on top. Customer service did offer a replacement.'],
            ['Stopped working', 'Worked fine for two weeks, then stopped responding completely. Waiting on a replacement now.'],
            ['Not as described', "Some of the features listed didn't work with my setup. Very frustrating."],
        ],
    ];

    /** A few reviews in other languages, to show the language tag on the product page. */
    private const FOREIGN = [
        'de' => [
            [5, 'Absolut empfehlenswert', 'Top Verarbeitung und sehr schnelle Lieferung. Ich benutze es jeden Tag und bin rundum zufrieden.'],
            [4, 'Sehr gut', 'Fühlt sich hochwertig an und funktioniert einwandfrei. Nur der Preis ist etwas hoch.'],
            [5, 'Genau richtig', 'Die Einrichtung hat zwei Minuten gedauert und alles hat auf Anhieb funktioniert.'],
            [3, 'Ganz okay', 'Gute Qualität, aber für meinen Geschmack etwas zu laut.'],
        ],
        'fr' => [
            [5, 'Excellent produit', "Finition superbe et livraison rapide. Je l'utilise tous les jours et je ne regrette pas mon achat."],
            [4, 'Très bien', 'Bonne qualité et facile à installer. Un peu cher, mais ça vaut le coup.'],
            [3, 'Correct', 'Il fait le travail, mais la couleur est un peu différente des photos.'],
        ],
    ];

    private const REPLIES = [
        'positive' => [
            "Thank you so much for the kind words! We're glad it has become part of your daily setup.",
            'Thanks for taking the time to write this, we really appreciate it.',
        ],
        'negative' => [
            "We're sorry to hear this. Our support team has emailed you to put it right.",
            "Thanks for the honest feedback. We've passed it on to our product team.",
        ],
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Skipped: demo reviews are never seeded in production.');

            return;
        }

        $customers = $this->customers();

        // Start clean, so the seeder can be run again without duplicates.
        Review::whereIn('user_id', $customers->pluck('id'))->delete();

        $products = Product::where('is_active', true)->get();

        // Turn off model events while seeding: otherwise every single review would
        // recalculate its product's rating and re-index it in search.
        Review::withoutEvents(function () use ($products, $customers) {
            foreach ($products as $product) {
                $this->seedProduct($product, $customers);
            }
        });

        // Now recalculate each product once.
        $products->each(fn (Product $product) => $product->refreshRating());

        $this->command->info(sprintf('Seeded %d reviews across %d products.',
            Review::whereIn('user_id', $customers->pluck('id'))->count(), $products->count()));
    }

    /** @return Collection<int, User> */
    private function customers(): Collection
    {
        return collect(self::NAMES)->map(function (string $name, int $i) {
            $email = 'reviewer'.($i + 1).'@example.test';

            $user = User::where('email', $email)->first() ?? new User();

            $user->forceFill([
                'name' => $name,
                'email' => $email,
                'password' => $user->exists ? $user->password : Hash::make(Str::random(40)),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            return $user;
        });
    }

    private function seedProduct(Product $product, Collection $customers): void
    {
        $authors = $customers->shuffle()->take(random_int(3, 14));

        foreach ($authors as $author) {
            [$rating, $title, $body, $locale] = $this->content($product->name);

            $created = Carbon::now()->subDays(random_int(1, 180))->subMinutes(random_int(0, 1439));
            $status = $this->pick(['approved' => 85, 'pending' => 10, 'rejected' => 5]);
            $reply = $status === 'approved' && $locale === 'en' ? $this->reply($rating) : null;

            $voters = $status === 'approved'
                ? $customers->where('id', '!=', $author->id)->shuffle()->take($this->pick([0 => 35, 1 => 25, 2 => 15, 3 => 10, 5 => 8, 8 => 7]))
                : collect();

            $review = new Review();
            $review->forceFill([
                'product_id' => $product->id,
                'user_id' => $author->id,
                'rating' => $rating,
                'title' => random_int(1, 100) <= 80 ? $title : null,
                'body' => $body,
                'status' => $status,
                'is_verified' => random_int(1, 100) <= 65,
                'locale' => $locale,
                'helpful_count' => $voters->count(),
                'admin_reply' => $reply,
                'replied_at' => $reply ? $created->copy()->addDays(random_int(1, 3)) : null,
                'approved_at' => $status === 'approved' ? $created->copy()->addHours(random_int(2, 30)) : null,
                'created_at' => $created,
                'updated_at' => $created,
            ])->save();

            if ($voters->isNotEmpty()) {
                DB::table('review_votes')->insert($voters->map(fn (User $voter) => [
                    'review_id' => $review->id,
                    'user_id' => $voter->id,
                    'created_at' => $created->copy()->addDays(random_int(1, 30)),
                ])->all());
            }
        }
    }

    /** @return array{int, string, string, string} */
    private function content(string $productName): array
    {
        // About 1 in 10 reviews is written in German or French.
        if (random_int(1, 100) <= 10) {
            $locale = Arr::random(array_keys(self::FOREIGN));
            [$rating, $title, $body] = Arr::random(self::FOREIGN[$locale]);

            return [$rating, $title, $body, $locale];
        }

        $rating = $this->pick([5 => 45, 4 => 30, 3 => 12, 2 => 7, 1 => 6]);
        [$title, $body] = Arr::random(self::REVIEWS[$rating]);

        return [$rating, $title, str_replace(':product', $productName, $body), 'en'];
    }

    private function reply(int $rating): ?string
    {
        // The shop replies to most critical reviews, and some happy ones.
        $chance = $rating <= 3 ? 60 : 15;

        if (random_int(1, 100) > $chance) {
            return null;
        }

        return Arr::random(self::REPLIES[$rating <= 3 ? 'negative' : 'positive']);
    }

    /** Pick a key at random, where each value is its relative weight. */
    private function pick(array $weights): int|string
    {
        $roll = random_int(1, array_sum($weights));

        foreach ($weights as $value => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return $value;
            }
        }

        return array_key_first($weights);
    }
}
