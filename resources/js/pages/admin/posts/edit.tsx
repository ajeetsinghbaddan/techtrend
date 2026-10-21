import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';

type PostData = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string | null;
    category_id: number | null;
    read_minutes: number;
    meta_title: string | null;
    meta_description: string | null;
    image_url: string | null;
    published_at: string | null;
};

type PostForm = {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    category_id: string;
    read_minutes: number;
    meta_title: string;
    meta_description: string;
    published_at: string;
    image: File | null;
    remove_image: boolean;
};

export default function PostEditor({ post, categories }: {
    post: PostData | null;
    categories: { id: number; name: string }[];
}) {
    const isNew = post === null;

    const { data, setData, post: submitPost, transform, processing, errors, recentlySuccessful } =
        useForm<PostForm>({
            title: post?.title ?? '',
            slug: post?.slug ?? '',
            excerpt: post?.excerpt ?? '',
            body: post?.body ?? '',
            category_id: post?.category_id ? String(post.category_id) : '',
            read_minutes: post?.read_minutes ?? 5,
            meta_title: post?.meta_title ?? '',
            meta_description: post?.meta_description ?? '',
            published_at: post?.published_at ?? '',
            image: null,
            remove_image: false,
        });

    const err = errors as Record<string, string>;

    const preview = useMemo(() => (data.image ? URL.createObjectURL(data.image) : null), [data.image]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    const shownImage = preview ?? (data.remove_image ? null : post?.image_url ?? null);

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (!isNew) {
            transform((d) => ({ ...d, _method: 'put' }));
        }

        submitPost(isNew ? '/admin/posts' : `/admin/posts/${post!.slug}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const publishNow = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setData('published_at', now.toISOString().slice(0, 16));
    };

    return (
        <>
            <Head title={isNew ? 'New post' : `Edit: ${post!.title}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* Main column */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={data.title}
                                placeholder="What a gasket mount actually changes"
                                onChange={(e) => setData('title', e.target.value)} />
                            <p className="text-sm text-red-600">{err.title}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="slug">URL slug</Label>
                            <Input id="slug" value={data.slug} placeholder="Leave empty to build it from the title"
                                onChange={(e) => setData('slug', e.target.value)} />
                            <p className="text-xs text-muted-foreground">
                                /blog/{data.slug || 'generated-from-title'}
                            </p>
                            <p className="text-sm text-red-600">{err.slug}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="excerpt">Excerpt</Label>
                            <textarea id="excerpt" rows={3} value={data.excerpt}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                onChange={(e) => setData('excerpt', e.target.value)} />
                            <p className="text-xs text-muted-foreground">{data.excerpt.length}/300</p>
                            <p className="text-sm text-red-600">{err.excerpt}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="body">Body (HTML)</Label>
                            <textarea id="body" rows={18} value={data.body}
                                className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                                placeholder="<p>Your article...</p>"
                                onChange={(e) => setData('body', e.target.value)} />
                            <p className="text-xs text-muted-foreground">
                                Basic HTML is allowed and is cleaned on save. Unsafe tags are removed.
                            </p>
                            <p className="text-sm text-red-600">{err.body}</p>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4">
                        <div className="space-y-2 rounded-lg border p-4">
                            <Label htmlFor="published_at">Publish date</Label>
                            <Input id="published_at" type="datetime-local" value={data.published_at}
                                onChange={(e) => setData('published_at', e.target.value)} />
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={publishNow}>Now</Button>
                                <Button type="button" variant="ghost" size="sm"
                                    onClick={() => setData('published_at', '')}>Make draft</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Empty means draft. A future date schedules it.
                            </p>
                            <p className="text-sm text-red-600">{err.published_at}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="category_id">Category</Label>
                            <select id="category_id" className="h-9 w-full rounded-md border px-3 text-sm"
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}>
                                <option value="">No category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <p className="text-sm text-red-600">{err.category_id}</p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="read_minutes">Read time (minutes)</Label>
                            <Input id="read_minutes" type="number" min={1} max={120} value={data.read_minutes}
                                onChange={(e) => setData('read_minutes', Number(e.target.value))} />
                            <p className="text-sm text-red-600">{err.read_minutes}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Cover image</Label>
                            {shownImage ? (
                                <img src={shownImage} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                            ) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230] text-xs text-white/80">
                                    No image
                                </div>
                            )}
                            <Input type="file" accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => setData('image', e.target.files?.[0] ?? null)} />
                            {post?.image_url && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.remove_image}
                                        onChange={(e) => setData('remove_image', e.target.checked)} />
                                    Remove image
                                </label>
                            )}
                            <p className="text-sm text-red-600">{err.image}</p>
                        </div>

                        <details className="rounded-lg border p-4">
                            <summary className="cursor-pointer text-sm font-medium">SEO</summary>
                            <div className="mt-3 space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="meta_title">Meta title</Label>
                                    <Input id="meta_title" value={data.meta_title}
                                        onChange={(e) => setData('meta_title', e.target.value)} />
                                    <p className="text-xs text-muted-foreground">{data.meta_title.length}/70</p>
                                    <p className="text-sm text-red-600">{err.meta_title}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="meta_description">Meta description</Label>
                                    <textarea id="meta_description" rows={3} value={data.meta_description}
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        onChange={(e) => setData('meta_description', e.target.value)} />
                                    <p className="text-xs text-muted-foreground">{data.meta_description.length}/160</p>
                                    <p className="text-sm text-red-600">{err.meta_description}</p>
                                </div>
                            </div>
                        </details>
                    </aside>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                    <Button type="submit" disabled={processing}>
                        {isNew ? 'Create post' : 'Save changes'}
                    </Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                    {!isNew && data.published_at && (
                        <a href={`/blog/${post!.slug}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-[#5b4f9a] underline">
                            View on site
                        </a>
                    )}
                </div>
            </form>
        </>
    );
}

PostEditor.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Blog', href: '/admin/posts' },
        { title: 'Edit post', href: '/admin/posts' },
    ],
};
