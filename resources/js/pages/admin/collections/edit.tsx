import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';

type CollectionData = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    is_active: boolean;
    meta_title: string | null;
    meta_description: string | null;
    image_url: string | null;
};

type Form = {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    is_active: boolean;
    meta_title: string;
    meta_description: string;
    image: File | null;
    remove_image: boolean;
};

export default function CollectionEditor({ collection }: { collection: CollectionData | null }) {
    const isNew = collection === null;

    const { data, setData, post, transform, processing, errors, recentlySuccessful } = useForm<Form>({
        name: collection?.name ?? '',
        slug: collection?.slug ?? '',
        tagline: collection?.tagline ?? '',
        description: collection?.description ?? '',
        is_active: collection?.is_active ?? true,
        meta_title: collection?.meta_title ?? '',
        meta_description: collection?.meta_description ?? '',
        image: null,
        remove_image: false,
    });
    const err = errors as Record<string, string>;

    const preview = useMemo(() => (data.image ? URL.createObjectURL(data.image) : null), [data.image]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    const shown = preview ?? (data.remove_image ? null : collection?.image_url ?? null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!isNew) transform((d) => ({ ...d, _method: 'put' }));
        post(isNew ? '/admin/collections' : `/admin/collections/${collection!.slug}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={isNew ? 'New collection' : `Edit: ${collection!.name}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
                <div className="grid gap-6 sm:grid-cols-[1fr_180px]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={data.name} placeholder="Keyboards"
                                onChange={(e) => setData('name', e.target.value)} />
                            <p className="text-sm text-red-600">{err.name}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="slug">URL slug</Label>
                            <Input id="slug" value={data.slug} placeholder="Leave empty to build from the name"
                                onChange={(e) => setData('slug', e.target.value)} />
                            <p className="text-xs text-muted-foreground">/collections/{data.slug || 'generated'}</p>
                            <p className="text-sm text-red-600">{err.slug}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="tagline">Tagline</Label>
                            <Input id="tagline" value={data.tagline}
                                placeholder="Hot-swap boards, layouts included."
                                onChange={(e) => setData('tagline', e.target.value)} />
                            <p className="text-sm text-red-600">{err.tagline}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="description">Description</Label>
                            <textarea id="description" rows={4} value={data.description}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                onChange={(e) => setData('description', e.target.value)} />
                            <p className="text-sm text-red-600">{err.description}</p>
                        </div>
                    </div>

                    <aside className="space-y-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)} />
                            Visible on the site
                        </label>

                        <div className="space-y-2">
                            <Label>Image</Label>
                            {shown ? (
                                <img src={shown} alt="" className="aspect-square w-full rounded-full object-cover" />
                            ) : (
                                <div className="aspect-square w-full rounded-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                            )}
                            <Input type="file" accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => setData('image', e.target.files?.[0] ?? null)} />
                            {collection?.image_url && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.remove_image}
                                        onChange={(e) => setData('remove_image', e.target.checked)} />
                                    Remove image
                                </label>
                            )}
                            <p className="text-xs text-muted-foreground">Shown as a circle. A square image works best.</p>
                            <p className="text-sm text-red-600">{err.image}</p>
                        </div>
                    </aside>
                </div>

                <details className="rounded-lg border p-4">
                    <summary className="cursor-pointer text-sm font-medium">SEO</summary>
                    <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="meta_title">Meta title</Label>
                            <Input id="meta_title" value={data.meta_title}
                                onChange={(e) => setData('meta_title', e.target.value)} />
                            <p className="text-xs text-muted-foreground">{data.meta_title.length}/70</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="meta_description">Meta description</Label>
                            <textarea id="meta_description" rows={2} value={data.meta_description}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                onChange={(e) => setData('meta_description', e.target.value)} />
                            <p className="text-xs text-muted-foreground">{data.meta_description.length}/160</p>
                        </div>
                    </div>
                </details>

                <div className="flex items-center gap-3 border-t pt-4">
                    <Button type="submit" disabled={processing}>
                        {isNew ? 'Create collection' : 'Save changes'}
                    </Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

CollectionEditor.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Catalog', href: '/admin/collections' },
        { title: 'Collection', href: '/admin/collections' },
    ],
};
