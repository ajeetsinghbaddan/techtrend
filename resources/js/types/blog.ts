export interface PostCard {
    title: string;
    slug: string;
    excerpt?: string | null;
    read_minutes: number;
    image_url: string | null;
    published_at: string | null;
    category: { name: string; slug: string } | null;
}

export interface PostDetail extends PostCard {
    body: string | null;
    meta_title: string | null;
    meta_description: string | null;
}

export interface BlogSettings {
    enabled: boolean;
    title: string;
    subtitle: string | null;
    count: number;
}

export interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
}
