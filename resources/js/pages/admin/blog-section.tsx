import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlogSettings } from '@/types/blog';
import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

type Form = { enabled: boolean; title: string; subtitle: string; count: number };

export default function BlogSectionPage({ blog }: { blog: BlogSettings }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<Form>({
        enabled: blog.enabled,
        title: blog.title,
        subtitle: blog.subtitle ?? '',
        count: blog.count,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/blog-section', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Blog section" />

            <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">
                    The blog strip on the homepage. It shows your most recent published posts.
                </p>

                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.enabled}
                        onChange={(e) => setData('enabled', e.target.checked)} />
                    Show this section
                </label>

                <div className="space-y-1">
                    <Label htmlFor="title">Heading</Label>
                    <Input id="title" value={data.title} placeholder="From the workshop"
                        onChange={(e) => setData('title', e.target.value)} />
                    <p className="text-sm text-red-600">{errors.title}</p>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="subtitle">Subheading</Label>
                    <Input id="subtitle" value={data.subtitle}
                        placeholder="Build logs, layout guides and the occasional teardown."
                        onChange={(e) => setData('subtitle', e.target.value)} />
                    <p className="text-sm text-red-600">{errors.subtitle}</p>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="count">Posts to show</Label>
                    <Input id="count" type="number" min={2} max={8} className="w-28" value={data.count}
                        onChange={(e) => setData('count', Number(e.target.value))} />
                    <p className="text-xs text-muted-foreground">4 or 8 fill the rows evenly.</p>
                    <p className="text-sm text-red-600">{errors.count}</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

BlogSectionPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Blog', href: '/admin/posts' },
        { title: 'Blog section', href: '/admin/blog-section' },
    ],
};
