import { useLocale, useT } from '@/lib/i18n';
import type { BlogSettings, PostCard } from '@/types/blog';
import { Link } from '@inertiajs/react';

export function PostCardView({ post }: { post: PostCard }) {
    const t = useT();
    const locale = useLocale();

    const date = post.published_at
        ? new Date(post.published_at).toLocaleDateString(locale, {
              day: '2-digit', month: 'short', year: 'numeric',
          })
        : null;

    return (
        <article>
            <Link href={`/blog/${post.slug}`} className="group block">
                <div className="overflow-hidden rounded-2xl bg-slate-200">
                    {post.image_url ? (
                        <img src={post.image_url} alt="" loading="lazy"
                            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                    )}
                </div>

                {post.category && (
                    <p className="mt-4 font-mono text-xs tracking-[0.15em] text-[#5b4f9a] uppercase">
                        {post.category.name}
                    </p>
                )}

                <h3 className="mt-2 text-lg leading-snug font-semibold text-[#1f2230] group-hover:underline sm:text-xl">
                    {post.title}
                </h3>

                <p className="mt-3 font-mono text-xs text-slate-500 sm:text-sm">
                    {date && <time dateTime={post.published_at!}>{date}</time>}
                    {date && ' · '}
                    {t(':count min', { count: post.read_minutes })}
                </p>
            </Link>
        </article>
    );
}

export default function BlogStrip({ blog, posts }: { blog: BlogSettings; posts: PostCard[] }) {
    const t = useT();

    if (!blog.enabled || posts.length === 0) return null;

    return (
        <section className="mx-auto max-w-[1500px] px-4 pt-12 pb-4 sm:px-6 sm:pt-16 lg:px-10">
            <div className="text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-[#1f2230] sm:text-4xl">{blog.title}</h2>
                {blog.subtitle && <p className="mt-3 text-slate-500 sm:text-lg">{blog.subtitle}</p>}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {posts.map((post) => (
                    <PostCardView key={post.slug} post={post} />
                ))}
            </div>

            <div className="mt-10 text-center">
                <Link href="/blog" className="inline-flex h-11 items-center rounded-full border border-slate-300 px-6 text-sm hover:bg-white">
                    {t('All articles')}
                </Link>
            </div>
        </section>
    );
}
