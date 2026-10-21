import ContactForm from '@/components/store/contact-form';
import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import { Head, Link } from '@inertiajs/react';

type Props = {
    page: {
        title: string;
        slug: string;
        template: string;
        content: string | null;
        is_published: boolean;
    };
    meta: { title: string; description: string; canonical: string; image: string | null; robots: string };
};

export default function PageShow({ page, meta }: Props) {
    const t = useT();
    const isContact = page.template === 'contact';

    return (
        <StoreLayout>
            <Head>
                <title>{meta.title}</title>
                <meta head-key="description" name="description" content={meta.description} />
                <meta head-key="robots" name="robots" content={meta.robots} />
                <link head-key="canonical" rel="canonical" href={meta.canonical} />
                <meta head-key="og:title" property="og:title" content={meta.title} />
                <meta head-key="og:description" property="og:description" content={meta.description} />
                <meta head-key="og:url" property="og:url" content={meta.canonical} />
                {meta.image && <meta head-key="og:image" property="og:image" content={meta.image} />}
            </Head>

            {!page.is_published && (
                <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                    {t('Draft preview: only you can see this page.')}
                </p>
            )}

            <div className={`mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-10 ${isContact ? 'max-w-6xl' : 'max-w-3xl'}`}>
                <nav aria-label={t('Breadcrumb')} className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">
                    <Link href="/" className="hover:text-slate-900">{t('Home')}</Link>
                    <span className="text-slate-300"> / </span>
                    <span className="text-slate-900">{page.title}</span>
                </nav>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>

                <div className={isContact ? 'mt-10 grid gap-12 lg:grid-cols-[1fr_440px]' : ''}>
                    {page.content && (
                        <div
                            className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-a:text-[#5b4f9a] prose-img:rounded-xl"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    )}

                    {isContact && <ContactForm />}
                </div>
            </div>
        </StoreLayout>
    );
}
