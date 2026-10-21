import { PostCardView } from '@/components/store/blog-strip';
import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import type { Paginated, PostCard } from '@/types/blog';
import { Head, Link, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

type Props = {
    posts: Paginated<PostCard>;
    categories: { name: string; slug: string }[];
    filters: { q?: string };
    category: { name: string; slug: string } | null;
};

export default function BlogIndex({ posts, categories, filters, category }: Props) {
    const t = useT();
    const [q, setQ] = useState(filters.q ?? '');

    const search = (e: FormEvent) => {
        e.preventDefault();
        router.get(category ? `/blog/category/${category.slug}` : '/blog', q ? { q } : {}, {
            preserveState: true,
            replace: true,
        });
    };

    const pill = (active: boolean) =>
        `rounded-full border px-4 py-2 text-sm ${active ? 'border-[#5b4f9a] bg-[#5b4f9a] text-white' : 'border-slate-300 hover:bg-white'}`;

    return (
        <StoreLayout>
            <Head title={category ? `${category.name} — ${t('Blog')}` : t('Blog')} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    {category ? category.name : t('From the workshop')}
                </h1>

                <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <nav aria-label={t('Categories')} className="flex flex-wrap gap-2">
                        <Link href="/blog" className={pill(!category)}>
                            {t('All')}
                        </Link>
                        {categories.map((c) => (
                            <Link key={c.slug} href={`/blog/category/${c.slug}`} className={pill(category?.slug === c.slug)}>
                                {c.name}
                            </Link>
                        ))}
                    </nav>

                    <form onSubmit={search} role="search">
                        <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                            placeholder={t('Search articles')} aria-label={t('Search articles')}
                            className="h-11 w-full rounded-full border border-slate-300 px-5 text-sm lg:w-72" />
                    </form>
                </div>

                {posts.data.length === 0 ? (
                    <p className="mt-16 text-center text-slate-500">{t('No articles found.')}</p>
                ) : (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {posts.data.map((post) => (
                            <PostCardView key={post.slug} post={post} />
                        ))}
                    </div>
                )}

                {posts.last_page > 1 && (
                    <nav aria-label={t('Pagination')} className="mt-12 flex flex-wrap justify-center gap-2">
                        {posts.links.map((link, i) =>
                            link.url ? (
                                <Link key={i} href={link.url} preserveScroll
                                    className={pill(link.active)}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span key={i} className="px-4 py-2 text-sm text-slate-400"
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ),
                        )}
                    </nav>
                )}
            </div>
        </StoreLayout>
    );
}
