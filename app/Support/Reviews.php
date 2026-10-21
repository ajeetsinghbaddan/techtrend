<?php

namespace App\Support;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class Reviews
{
    public const SORTS = ['helpful', 'newest', 'highest', 'lowest'];

    /** Has this customer received (or paid for) an order containing this product? */
    public function isVerifiedBuyer(?int $userId, Product $product): bool
    {
        if (! $userId) {
            return false;
        }

        return OrderItem::query()
            ->whereIn('product_variant_id', ProductVariant::where('product_id', $product->id)->select('id'))
            ->whereHas('order', fn ($q) => $q
                ->where('user_id', $userId)
                ->whereIn('status', ['paid', 'shipped', 'delivered']))
            ->exists();
    }

    public function summary(Product $product): array
    {
        $counts = $product->reviews()->approved()
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $total = (int) $counts->sum();
        $sum = $counts->map(fn ($count, $rating) => $count * $rating)->sum();

        return [
            'average' => $total > 0 ? round($sum / $total, 1) : null,
            'total' => $total,
            'distribution' => collect([5, 4, 3, 2, 1])
                ->map(fn (int $stars) => ['stars' => $stars, 'count' => (int) ($counts[$stars] ?? 0)])
                ->all(),
            'with_photos' => $product->reviews()->approved()->has('images')->count(),
        ];
    }

    public function list(Product $product, array $filters, ?int $userId): LengthAwarePaginator
    {
        $query = $product->reviews()->approved()
            ->with(['user:id,name', 'images'])
            ->when($filters['stars'] ?? null, fn ($q, $stars) => $q->where('rating', $stars))
            ->when($filters['photos'] ?? false, fn ($q) => $q->has('images'))
            ->when($userId, fn ($q) => $q->withExists(['voters as voted' => fn ($v) => $v->where('users.id', $userId)]));

        match ($filters['sort'] ?? 'helpful') {
            'newest' => $query->latest(),
            'highest' => $query->orderByDesc('rating')->latest(),
            'lowest' => $query->orderBy('rating')->latest(),
            default => $query->orderByDesc('is_verified')->orderByDesc('helpful_count')->latest(),
        };

        return $query->paginate(6, ['*'], 'reviews_page')
            ->withQueryString()
            ->through(fn (Review $review) => $this->present($review));
    }

    public function present(Review $review): array
    {
        return [
            'id' => $review->id,
            'author' => $review->authorName(),
            'rating' => $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            'is_verified' => $review->is_verified,
            'helpful_count' => $review->helpful_count,
            'voted' => (bool) ($review->voted ?? false),
            'locale' => $review->locale,
            'status' => $review->status,
            'created_at' => $review->created_at?->toIso8601String(),
            'images' => $review->images->map(fn ($image) => ['id' => $image->id, 'url' => $image->url])->values(),
            'reply' => $review->admin_reply
                ? ['body' => $review->admin_reply, 'at' => $review->replied_at?->toIso8601String()]
                : null,
        ];
    }
}
