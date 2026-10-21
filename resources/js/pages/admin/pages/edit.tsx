import RichTextEditor from '@/components/admin/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';

type PageData = {
    id: number;
    title: string;
    slug: string;
    template: string;
    content: string | null;
    meta_title: string | null;
    meta_description: string | null;
    is_published: boolean;
    noindex: boolean;
    og_image_url: string | null;
};

type Form = {
    title: string;
    slug: string;
    template: string;
    content: string;
    meta_title: string;
    meta_description: string;
    is_published: boolean;
    noindex: boolean;
    og_image: File | null;
    remove_og_image: boolean;
};

/** Plain-text version of the content, to preview an automatic description. */
function summarise(html: string, length = 160) {
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function Counter({ value, max }: { value: string; max: number }) {
    const over = value.length > max;
    return <span className={`text-xs ${over ? 'text-red-600' : 'text-muted-foreground'}`}>{value.length}/{max}</span>;
}

export default function PageEditor({ page, templates }: { page: PageData | null; templates: string[] }) {
    const isNew = page === null;

    const { data, setData, post, transform, processing, errors, recentlySuccessful } = useForm<Form>({
        title: page?.title ?? '',
        slug: page?.slug ?? '',
        template: page?.template ?? 'default',
        content: page?.content ?? '',
        meta_title: page?.meta_title ?? '',
        meta_description: page?.meta_description ?? '',
        is_published: page?.is_published ?? false,
        noindex: page?.noindex ?? false,
        og_image: null,
        remove_og_image: false,
    });
    const err = errors as Record<string, string>;

    const preview = useMemo(() => (data.og_image ? URL.createObjectURL(data.og_image) : null), [data.og_image]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    const shownImage = preview ?? (data.remove_og_image ? null : page?.og_image_url ?? null);

    // What Google would show, falling back exactly as the server does.
    const serpTitle = data.meta_title || data.title || 'Page title';
    const serpDescription = data.meta_description || summarise(data.content) || 'A short description of this page.';
    const serpUrl = `${window.location.host}/${data.slug || 'page-address'}`;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => (isNew ? d : { ...d, _method: 'put' }));
        post(isNew ? '/admin/pages' : `/admin/pages/${page!.slug}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={isNew ? 'New page' : `Edit: ${page!.title}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-5xl p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                    <h1 className="text-xl font-semibold">{data.title || 'New page'}</h1>
                    <div className="flex items-center gap-3">
                        {!isNew && (
                            <a href={`/${page!.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#5b4f9a] underline">
                                {page!.is_published ? 'View' : 'Preview'}
                            </a>
                        )}
                        <Button type="submit" disabled={processing}>{isNew ? 'Create page' : 'Save changes'}</Button>
                        {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
                    {/* Main column */}
                    <div className="min-w-0 space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={data.title} placeholder="About us"
                                onChange={(e) => setData('title', e.target.value)} />
                            <p className="text-sm text-red-600">{err.title}</p>
                        </div>

                        <div className="space-y-1">
                            <Label>Content</Label>
                            <RichTextEditor value={data.content} uploadUrl="/admin/pages/images"
                                onChange={(html) => setData('content', html)} />
                            <p className="text-sm text-red-600">{err.content}</p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4">
                        <div className="space-y-3 rounded-lg border p-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.is_published}
                                    onChange={(e) => setData('is_published', e.target.checked)} />
                                Published
                            </label>
                            <p className="text-xs text-muted-foreground">Drafts are only visible to you while logged in.</p>

                            <div className="space-y-1">
                                <Label htmlFor="slug">Address</Label>
                                <div className="flex items-center rounded-md border px-2 text-sm">
                                    <span className="text-muted-foreground">/</span>
                                    <input id="slug" value={data.slug} placeholder="from-the-title"
                                        onChange={(e) => setData('slug', e.target.value.toLowerCase())}
                                        className="h-9 w-full bg-transparent px-1 outline-none" />
                                </div>
                                <p className="text-sm text-red-600">{err.slug}</p>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="template">Layout</Label>
                                <select id="template" value={data.template}
                                    onChange={(e) => setData('template', e.target.value)}
                                    className="h-9 w-full rounded-md border px-3 text-sm">
                                    {templates.map((t) => (
                                        <option key={t} value={t}>{t === 'contact' ? 'Content + contact form' : 'Content only'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* SEO */}
                        <div className="space-y-3 rounded-lg border p-4">
                            <h2 className="font-semibold">Search & sharing</h2>

                            <div className="rounded-md bg-slate-50 p-3">
                                <p className="truncate text-xs text-slate-500">{serpUrl}</p>
                                <p className="mt-0.5 truncate text-[15px] text-[#1a0dab]">{serpTitle}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{serpDescription}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <Label htmlFor="meta_title">Search title</Label>
                                    <Counter value={data.meta_title} max={70} />
                                </div>
                                <Input id="meta_title" value={data.meta_title} placeholder={data.title}
                                    onChange={(e) => setData('meta_title', e.target.value)} />
                                <p className="text-sm text-red-600">{err.meta_title}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <Label htmlFor="meta_description">Search description</Label>
                                    <Counter value={data.meta_description} max={160} />
                                </div>
                                <textarea id="meta_description" rows={3} value={data.meta_description}
                                    placeholder="Leave empty to use the start of the content."
                                    onChange={(e) => setData('meta_description', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2 text-sm" />
                                <p className="text-sm text-red-600">{err.meta_description}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Share image</Label>
                                {shownImage ? (
                                    <img src={shownImage} alt="" className="aspect-[1200/630] w-full rounded-md object-cover" />
                                ) : (
                                    <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-md bg-slate-100 text-xs text-muted-foreground">
                                        No image: the logo is used
                                    </div>
                                )}
                                <Input type="file" accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => {
                                        setData('og_image', e.target.files?.[0] ?? null);
                                        setData('remove_og_image', false);
                                    }} />
                                {page?.og_image_url && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={data.remove_og_image}
                                            onChange={(e) => setData('remove_og_image', e.target.checked)} />
                                        Remove image
                                    </label>
                                )}
                                <p className="text-xs text-muted-foreground">Shown when the page is shared. 1200 × 630 px works best.</p>
                                <p className="text-sm text-red-600">{err.og_image}</p>
                            </div>

                            <label className="flex items-start gap-2 text-sm">
                                <input type="checkbox" className="mt-1" checked={data.noindex}
                                    onChange={(e) => setData('noindex', e.target.checked)} />
                                <span>
                                    Hide from search engines
                                    <span className="block text-xs text-muted-foreground">For pages like "Thank you" that shouldn't appear in Google.</span>
                                </span>
                            </label>
                        </div>
                    </aside>
                </div>
            </form>
        </>
    );
}

PageEditor.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Content', href: '/admin/pages' },
        { title: 'Page', href: '/admin/pages' },
    ],
};
