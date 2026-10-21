<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use App\Support\ReviewImageProcessor;
use App\Support\Reviews;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    public function __construct(
        private readonly Reviews $reviews,
        private readonly ReviewImageProcessor $images,
    ) {
    }

    /** Behind the auth middleware: logged-out visitors log in first, then land back on the form. */
    public function write(Product $product)
    {
        return redirect()->to(route('products.show', $product).'#write-review');
    }

    public function store(Request $request, Product $product)
    {
        abort_unless($product->is_active, 404);

        $user = $request->user();
        $verified = $this->reviews->isVerifiedBuyer($user->id, $product);

        if (config('shop.reviews.require_purchase') && ! $verified) {
            throw ValidationException::withMessages([
                'review' => __('Only customers who bought this product can review it.'),
            ]);
        }

        $max = (int) config('shop.reviews.max_images', 4);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:20', 'max:3000'],
            'images' => ['nullable', 'array', 'max:'.$max],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:6144', 'dimensions:max_width=6000,max_height=6000'],
            'remove_image_ids' => ['nullable', 'array'],
            'remove_image_ids.*' => ['integer'],
        ]);

        $existing = Review::where('product_id', $product->id)->where('user_id', $user->id)->with('images')->first();
        $removeIds = $data['remove_image_ids'] ?? [];
        $kept = $existing ? $existing->images->whereNotIn('id', $removeIds)->count() : 0;
        $newFiles = $request->file('images', []);

        if ($kept + count($newFiles) > $max) {
            throw ValidationException::withMessages(['images' => __('You can add up to :count photos.', ['count' => $max])]);
        }

        // Process photos before touching the database, so a bad file doesn't leave a half-saved review.
        $newPaths = array_map(fn ($file) => $this->images->store($file), $newFiles);

        $publish = $verified && config('shop.reviews.auto_approve_verified');

        DB::transaction(function () use ($existing, $product, $user, $data, $verified, $publish, $removeIds, $newPaths) {
            $review = $existing ?? new Review(['product_id' => $product->id, 'user_id' => $user->id]);

            $review->fill([
                'rating' => $data['rating'],
                'title' => $data['title'] ?? null,
                'body' => $data['body'],
                'is_verified' => $verified,
                'locale' => app()->getLocale(),
                'status' => $publish ? 'approved' : 'pending',
                'approved_at' => $publish ? now() : null,
            ])->save();

            if ($existing) {
                foreach ($existing->images->whereIn('id', $removeIds) as $image) {
                    Storage::disk('public')->delete($image->path);
                    $image->delete();
                }
            }

            $position = (int) $review->images()->max('position');

            foreach ($newPaths as $path) {
                $review->images()->create(['path' => $path, 'position' => ++$position]);
            }
        });

        return back()->with('review_notice', $publish
            ? __('Thanks! Your review is live.')
            : __('Thanks! Your review will appear once we have checked it.'));
    }

    public function destroy(Request $request, Product $product)
    {
        Review::where('product_id', $product->id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail()
            ->delete();

        return back()->with('review_notice', __('Your review was deleted.'));
    }

    public function vote(Request $request, Review $review)
    {
        abort_unless($review->status === 'approved', 404);
        abort_if($review->user_id === $request->user()->id, 403);

        $userId = $request->user()->id;

        DB::transaction(function () use ($review, $userId) {
            $removed = DB::table('review_votes')->where('review_id', $review->id)->where('user_id', $userId)->delete();

            if ($removed) {
                $review->decrement('helpful_count');

                return;
            }

            $added = DB::table('review_votes')->insertOrIgnore(['review_id' => $review->id, 'user_id' => $userId]);

            if ($added) {
                $review->increment('helpful_count');
            }
        });

        return back();
    }
}
