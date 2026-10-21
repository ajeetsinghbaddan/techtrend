import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

type Category = { id: number; name: string; slug: string; posts_count: number };

export default function CategoriesPage({ categories }: { categories: Category[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/categories', {
            preserveScroll: true,
            onSuccess: () => reset('name'),
        });
    };

    const remove = (category: Category) => {
        const message = category.posts_count > 0
            ? `Delete "${category.name}"? Its ${category.posts_count} post(s) will stay but lose their category.`
            : `Delete "${category.name}"?`;

        if (confirm(message)) {
            router.delete(`/admin/categories/${category.slug}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Blog categories" />

            <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
                <form onSubmit={submit} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="name">New category</Label>
                        <Input id="name" value={data.name} placeholder="Build log"
                            onChange={(e) => setData('name', e.target.value)} />
                        <p className="text-sm text-red-600">{errors.name}</p>
                    </div>
                    <Button type="submit" disabled={processing || !data.name.trim()}>
                        <Plus className="size-4" /> Add
                    </Button>
                </form>

                {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories yet.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {categories.map((category) => (
                            <li key={category.id} className="flex items-center justify-between gap-4 p-4">
                                <div>
                                    <p className="font-medium">{category.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        /{category.slug} · {category.posts_count} post{category.posts_count === 1 ? '' : 's'}
                                    </p>
                                </div>
                                <Button type="button" variant="ghost" size="icon"
                                    aria-label={`Delete ${category.name}`}
                                    onClick={() => remove(category)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

CategoriesPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Blog', href: '/admin/posts' },
        { title: 'Categories', href: '/admin/categories' },
    ],
};
