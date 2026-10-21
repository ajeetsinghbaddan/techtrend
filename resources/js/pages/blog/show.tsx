import { PostCardView } from '@/components/store/blog-strip';
import StoreLayout from '@/layouts/store-layout';
import { useLocale, useT } from '@/lib/i18n';
import type { PostCard, PostDetail } from '@/types/blog';
import { Head, Link } from '@inertiajs/react';

export default function BlogShow({ post, related }: { post: PostDetail; related: PostCard[] }) {
    const t = useT();
    const locale = useLocale();

    const date = post.published_at
        ? new Date(post.published_at).toLocaleDateString(locale, {
              day: '2-digit', month: 'long', year: 'numeric',
          })
        : null;

    return (
        <StoreLayout>
            <Head>
                <title>{post.meta_title ?? post.title}</title>
                {post.meta_description && <meta name="description" content={post.meta_description} />}
                <meta property="og:title" content={post.meta_title ?? post.title} />
                <meta property="og:type" content="article" />
                {post.image_url && <meta property="og:image" content={post.image_url} />}
            </Head>

            <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
                <nav aria-label={t('Breadcrumb')} className="font-mono text-xs tracking-[0.15em] uppercase">
                    <Link href="/blog" className="text-slate-500 hover:text-slate-900">{t('Blog')}</Link>
                    {post.category && (
                        <>
                            <span className="text-slate-400"> / </span>
                            <Link href={`/blog/category/${post.category.slug}`} className="text-[#5b4f9a]">
                                {post.category.name}
                            </Link>
                        </>
                    )}
                </nav>

                <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">{post.title}</h1>

                <p className="mt-4 font-mono text-sm text-slate-500">
                    {date && <time dateTime={post.published_at!}>{date}</time>}
                    {date && ' · '}
                    {t(':count min read', { count: post.read_minutes })}
                </p>

                {post.image_url && (
                    <img src={post.image_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
                )}

                {post.excerpt && <p className="mt-8 text-lg leading-relaxed text-slate-600">{post.excerpt}</p>}

                {post.body && (
                    <div
                        className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-a:text-[#5b4f9a]"
                        dangerouslySetInnerHTML={{ __html: post.body }}
                    />
                )}
            </article>

            {related.length > 0 && (
                <section className="mx-auto max-w-[1500px] border-t border-slate-200 px-4 py-12 sm:px-6 lg:px-10">
                    <h2 className="text-2xl font-semibold">{t('Keep reading')}</h2>
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((p) => <PostCardView key={p.slug} post={p} />)}
                    </div>
                </section>
            )}
        </StoreLayout>
    );
}
