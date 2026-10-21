<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in([...Review::STATUSES, 'all'])],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'q' => ['sometimes', 'string', 'max:80'],
        ]);

        $status = $filters['status'] ?? 'pending';

        $reviews = Review::query()
            ->with(['product:id,name,slug', 'user:id,name,email', 'images'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($filters['rating'] ?? null, fn ($q, $rating) => $q->where('rating', $rating))
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('body', 'like', '%'.addcslashes($term, '%_\\').'%')
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', '%'.addcslashes($term, '%_\\').'%'))))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'title' => $r->title,
                'body' => $r->body,
                'status' => $r->status,
                'is_verified' => $r->is_verified,
                'helpful_count' => $r->helpful_count,
                'admin_reply' => $r->admin_reply,
                'locale' => $r->locale,
                'created_at' => $r->created_at->toIso8601String(),
                'product' => $r->product?->only('name', 'slug'),
                'author' => ['name' => $r->user?->name, 'email' => $r->user?->email],
                'images' => $r->images->map(fn ($i) => $i->url),
            ]);

        return Inertia::render('admin/reviews/index', [
            'reviews' => $reviews,
            'filters' => [...$filters, 'status' => $status],
            'counts' => Review::selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function update(Request $request, Review $review)
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Review::STATUSES)],
            'admin_reply' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('status', $data) && $data['status'] === 'approved' && $review->status !== 'approved') {
            $review->approved_at = now();
        }

        if (array_key_exists('admin_reply', $data) && $data['admin_reply'] !== $review->admin_reply) {
            $review->replied_at = filled($data['admin_reply']) ? now() : null;
        }

        $review->fill($data)->save();

        return back();
    }

    public function bulk(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['approve', 'reject', 'delete'])],
        ]);

        // Model by model, so the rating recalculation and photo cleanup run for each one.
        Review::whereKey($data['ids'])->get()->each(function (Review $review) use ($data) {
            match ($data['action']) {
                'delete' => $review->delete(),
                'approve' => $review->fill(['status' => 'approved', 'approved_at' => $review->approved_at ?? now()])->save(),
                'reject' => $review->fill(['status' => 'rejected'])->save(),
            };
        });

        return back();
    }

    public function destroy(Review $review)
    {
        $review->delete();

        return back();
    }
}
