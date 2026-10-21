export interface ReviewItem {
    id: number;
    author: string;
    rating: number;
    title: string | null;
    body: string;
    is_verified: boolean;
    helpful_count: number;
    voted: boolean;
    locale: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string | null;
    images: { id: number; url: string }[];
    reply: { body: string; at: string | null } | null;
}

export interface ReviewSummary {
    average: number | null;
    total: number;
    distribution: { stars: number; count: number }[];
    with_photos: number;
}

export interface ReviewFormInfo {
    logged_in: boolean;
    verified: boolean;
    can_review: boolean;
    require_purchase: boolean;
    max_images: number;
    write_url: string;
    mine: ReviewItem | null;
}
