import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type Organization = {
    legal_name: string | null; email: string | null; phone: string | null;
    street: string | null; city: string | null; postcode: string | null; country: string | null;
    same_as: string[];
};

type Props = {
    settings: {
        site_name: string | null;
        default_description: string;
        default_image_url: string | null;
        twitter_handle: string | null;
        indexing: boolean;
        google_verification: string | null;
        bing_verification: string | null;
        organization: Organization;
        returns: { days: number; free: boolean };
    };
    regions: { code: string; label: string }[];
    health: {
        production: boolean; indexable: boolean; google_verification: boolean; analytics: boolean;
        logo: boolean; default_image: boolean;
        products_without_description: number; products_without_images: number; images_without_alt: number;
    };
    links: { sitemap: string; robots: string; home: string };
};

type FormData = {
    site_name: string;
    default_description: string;
    twitter_handle: string;
    indexing: boolean;
    google_verification: string;
    bing_verification: string;
    organization: Omit<Organization, 'same_as'> & { same_as: string[] };
    same_as_text: string;
    returns: { days: number; free: boolean };
    default_image: File | null;
    remove_default_image: boolean;
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="space-y-4 rounded-lg border p-5">
            <div>
                <h2 className="font-semibold">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
    return (
        <li className="flex items-start gap-2 text-sm">
            {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />}
            <span>{children}</span>
        </li>
    );
}

export default function SeoAdmin({ settings, health, links }: Props) {
    const notice = usePage<{ flash?: { admin_notice?: string } }>().props.flash?.admin_notice;
    const org = settings.organization;

    const form = useForm<FormData>({
        site_name: settings.site_name ?? '',
        default_description: settings.default_description ?? '',
        twitter_handle: settings.twitter_handle ?? '',
        indexing: settings.indexing,
        google_verification: settings.google_verification ?? '',
        bing_verification: settings.bing_verification ?? '',
        organization: {
            legal_name: org.legal_name ?? '', email: org.email ?? '', phone: org.phone ?? '',
            street: org.street ?? '', city: org.city ?? '', postcode: org.postcode ?? '', country: org.country ?? '',
            same_as: org.same_as ?? [],
        },
        same_as_text: (org.same_as ?? []).join('\n'),
        returns: settings.returns,
        default_image: null,
        remove_default_image: false,
    });

    const setOrg = (key: keyof Organization, value: string) =>
        form.setData('organization', { ...form.data.organization, [key]: value });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            organization: {
                ...data.organization,
                same_as: data.same_as_text.split('\n').map((line) => line.trim()).filter(Boolean),
            },
        }));
        form.post('/admin/seo', { preserveScroll: true, forceFormData: true, onSuccess: () => form.setData('default_image', null) });
    };

    const err = form.errors as Record<string, string>;
    const field = (label: string, input: ReactNode, error?: string, hint?: string) => (
        <label className="block space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            {input}
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            {error && <span className="block text-xs text-red-600">{error}</span>}
        </label>
    );

    return (
        <>
            <Head title="SEO" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold">SEO</h1>
                    <p className="text-sm text-muted-foreground">How the shop appears in Google, Bing and when links are shared.</p>
                </div>

                {notice && <p role="status" className="rounded-md bg-slate-100 px-4 py-2 text-sm">{notice}</p>}

                <Section title="Health check">
                    <ul className="space-y-2">
                        <Check ok={health.indexable}>
                            {health.indexable
                                ? 'Search engines can index the shop.'
                                : health.production ? 'Indexing is switched off below.' : 'Not indexed: this is not the production site (APP_ENV is not "production").'}
                        </Check>
                        <Check ok={health.google_verification}>Google Search Console verification code</Check>
                        <Check ok={health.analytics}>Google Analytics ID (set in Cookie banner settings)</Check>
                        <Check ok={health.logo}>Logo (set in Header settings), used in Google's business info</Check>
                        <Check ok={health.default_image}>Default share image for links without their own image</Check>
                        <Check ok={health.products_without_description === 0}>
                            {health.products_without_description} product(s) without a meta description or subtitle
                        </Check>
                        <Check ok={health.products_without_images === 0}>{health.products_without_images} product(s) without images</Check>
                        <Check ok={health.images_without_alt === 0}>{health.images_without_alt} product image(s) without alt text</Check>
                    </ul>
                    <div className="flex flex-wrap gap-3 border-t pt-4 text-sm">
                        {[
                            ['Sitemap', links.sitemap],
                            ['robots.txt', links.robots],
                            ['Rich Results Test', `https://search.google.com/test/rich-results?url=${encodeURIComponent(links.home)}`],
                            ['PageSpeed Insights', `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(links.home)}`],
                        ].map(([label, href]) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline">
                                {label} <ExternalLink className="size-3.5" />
                            </a>
                        ))}
                    </div>
                </Section>

                <form onSubmit={submit} className="space-y-6">
                    <Section title="Search engines">
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-0.5" checked={form.data.indexing}
                                onChange={(e) => form.setData('indexing', e.target.checked)} />
                            <span>
                                <span className="font-medium">Allow search engines to index the shop</span>
                                <span className="block text-muted-foreground">Turn off only while preparing for launch. Staging and local sites are never indexed.</span>
                            </span>
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('Google Search Console code', <Input value={form.data.google_verification}
                                onChange={(e) => form.setData('google_verification', e.target.value.trim())} />,
                                err.google_verification, 'Only the content value of the HTML tag.')}
                            {field('Bing Webmaster code', <Input value={form.data.bing_verification}
                                onChange={(e) => form.setData('bing_verification', e.target.value.trim())} />, err.bing_verification)}
                        </div>
                    </Section>

                    <Section title="Site" description="Used when a page has no title, description or image of its own.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('Site name', <Input value={form.data.site_name} placeholder="Tech Trend"
                                onChange={(e) => form.setData('site_name', e.target.value)} />, err.site_name)}
                            {field('X (Twitter) handle', <Input value={form.data.twitter_handle} placeholder="@techtrend"
                                onChange={(e) => form.setData('twitter_handle', e.target.value)} />, err.twitter_handle)}
                        </div>
                        {field('Default description', <textarea rows={3} value={form.data.default_description}
                            onChange={(e) => form.setData('default_description', e.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm" />, err.default_description,
                            `${form.data.default_description.length}/160 characters shown in search results`)}
                        <div className="flex flex-wrap items-end gap-4">
                            {settings.default_image_url && !form.data.remove_default_image && (
                                <img src={settings.default_image_url} alt="" className="h-20 rounded border object-cover" />
                            )}
                            {field('Default share image', <input type="file" accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => form.setData('default_image', e.target.files?.[0] ?? null)} className="text-sm" />,
                                err.default_image, 'Ideally 1200 × 630 pixels.')}
                            {settings.default_image_url && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={form.data.remove_default_image}
                                        onChange={(e) => form.setData('remove_default_image', e.target.checked)} />
                                    Remove
                                </label>
                            )}
                        </div>
                    </Section>

                    <Section title="Business" description="Shown to Google as your store's details.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('Legal name', <Input value={form.data.organization.legal_name ?? ''} onChange={(e) => setOrg('legal_name', e.target.value)} />)}
                            {field('Email', <Input type="email" value={form.data.organization.email ?? ''} onChange={(e) => setOrg('email', e.target.value)} />, err['organization.email'])}
                            {field('Phone', <Input value={form.data.organization.phone ?? ''} onChange={(e) => setOrg('phone', e.target.value)} />)}
                            {field('Street', <Input value={form.data.organization.street ?? ''} onChange={(e) => setOrg('street', e.target.value)} />)}
                            {field('City', <Input value={form.data.organization.city ?? ''} onChange={(e) => setOrg('city', e.target.value)} />)}
                            <div className="grid grid-cols-2 gap-3">
                                {field('Postcode', <Input value={form.data.organization.postcode ?? ''} onChange={(e) => setOrg('postcode', e.target.value)} />)}
                                {field('Country', <Input maxLength={2} placeholder="DE" value={form.data.organization.country ?? ''}
                                    onChange={(e) => setOrg('country', e.target.value.toUpperCase())} />, err['organization.country'])}
                            </div>
                        </div>
                        {field('Social profiles', <textarea rows={3} value={form.data.same_as_text}
                            placeholder={'https://www.instagram.com/techtrend\nhttps://www.linkedin.com/company/techtrend'}
                            onChange={(e) => form.setData('same_as_text', e.target.value)}
                            className="w-full rounded-md border px-3 py-2 font-mono text-xs" />,
                            Object.entries(err).find(([k]) => k.startsWith('organization.same_as'))?.[1],
                            'One link per line. Helps Google connect your profiles to the shop.')}
                    </Section>

                    <Section title="Returns" description="Shown to Google as your store-wide return policy.">
                        <div className="flex flex-wrap items-end gap-6">
                            {field('Return window (days)', <Input type="number" min={14} max={365} className="w-28"
                                value={form.data.returns.days}
                                onChange={(e) => form.setData('returns', { ...form.data.returns, days: Number(e.target.value) })} />,
                                err['returns.days'], 'At least 14 days in the EU.')}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.data.returns.free}
                                    onChange={(e) => form.setData('returns', { ...form.data.returns, free: e.target.checked })} />
                                Free returns
                            </label>
                        </div>
                    </Section>

                    <Button type="submit" disabled={form.processing}>Save SEO settings</Button>
                </form>
            </div>
        </>
    );
}

SeoAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'SEO', href: '/admin/seo' },
    ],
};
