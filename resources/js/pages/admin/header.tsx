import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HeaderSettings, NavItem } from '@/types/header';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';

type HeaderForm = {
    brand_name: string;
    search_placeholder: string;
    announcements: string[];
    nav: NavItem[];
    logo: File | null;
    remove_logo: boolean;
};

export default function HeaderSettingsPage({ header }: { header: HeaderSettings }) {
    const { data, setData, post, transform, processing, errors, recentlySuccessful, reset } =
        useForm<HeaderForm>({
            brand_name: header.brand_name,
            search_placeholder: header.search_placeholder,
            announcements: header.announcements,
            nav: header.nav,
            logo: null,
            remove_logo: false,
        });
    const err = errors as Record<string, string>;

    // Temporary preview URL for a newly chosen file
    const preview = useMemo(
        () => (data.logo ? URL.createObjectURL(data.logo) : null),
        [data.logo],
    );
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const shownLogo = preview ?? (data.remove_logo ? null : header.logo_url);

    const updateNav = (index: number, patch: Partial<NavItem>) =>
        setData('nav', data.nav.map((item, i) => (i === index ? { ...item, ...patch } : item)));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({ ...d, _method: 'put' }));
        post('/admin/header', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => reset('logo', 'remove_logo'),
        });
    };

    return (
        <>
            <Head title="Edit header" />

            <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-8 p-6">
                {/* Logo */}
                <section className="space-y-3">
                    <h2 className="font-semibold">Logo</h2>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-48 items-center justify-center rounded-lg border bg-[#f6f7fb] p-2">
                            {shownLogo ? (
                                <img src={shownLogo} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span className="size-6 rounded-md bg-[#5b4f9a]" aria-hidden />
                                    <span className="font-semibold text-slate-900">{data.brand_name || 'Brand'}</span>
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => {
                                    setData('logo', e.target.files?.[0] ?? null);
                                    setData('remove_logo', false);
                                }}
                            />
                            {header.logo_url && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.remove_logo}
                                        onChange={(e) => {
                                            setData('remove_logo', e.target.checked);
                                            if (e.target.checked) setData('logo', null);
                                        }}
                                    />
                                    Remove logo and use the default
                                </label>
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        PNG, JPG or WebP, up to 1 MB. A transparent PNG about 64px tall works best.
                    </p>
                    <p className="text-sm text-red-600">{err.logo}</p>
                </section>

                {/* Brand + search */}
                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label htmlFor="brand">Brand name</Label>
                        <Input id="brand" value={data.brand_name}
                            onChange={(e) => setData('brand_name', e.target.value)} />
                        <p className="text-sm text-red-600">{err.brand_name}</p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="search">Search placeholder</Label>
                        <Input id="search" value={data.search_placeholder}
                            onChange={(e) => setData('search_placeholder', e.target.value)} />
                        <p className="text-sm text-red-600">{err.search_placeholder}</p>
                    </div>
                </section>

                {/* Announcements */}
                <section className="space-y-3">
                    <h2 className="font-semibold">Announcement bar</h2>
                    {data.announcements.map((text, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex gap-2">
                                <Input value={text} onChange={(e) =>
                                    setData('announcements', data.announcements.map((t, j) => (j === i ? e.target.value : t)))} />
                                <Button type="button" variant="outline" size="icon" aria-label="Remove announcement"
                                    onClick={() => setData('announcements', data.announcements.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-red-600">{err[`announcements.${i}`]}</p>
                        </div>
                    ))}
                    <Button type="button" variant="outline" disabled={data.announcements.length >= 5}
                        onClick={() => setData('announcements', [...data.announcements, ''])}>
                        <Plus className="size-4" /> Add announcement
                    </Button>
                </section>

                {/* Navigation */}
                <section className="space-y-4">
                    <h2 className="font-semibold">Navigation</h2>
                    {data.nav.map((item, i) => (
                        <div key={i} className="space-y-3 rounded-lg border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input placeholder="Label" value={item.label}
                                    onChange={(e) => updateNav(i, { label: e.target.value })} />
                                <Input placeholder="/keyboards" value={item.href}
                                    onChange={(e) => updateNav(i, { href: e.target.value })} />
                                <Button type="button" variant="outline" size="icon" aria-label="Remove menu item"
                                    onClick={() => setData('nav', data.nav.filter((_, j) => j !== i))}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-red-600">{err[`nav.${i}.label`] ?? err[`nav.${i}.href`]}</p>

                            <div className="space-y-2 border-l pl-4">
                                {item.children.map((child, c) => (
                                    <div key={c} className="space-y-1">
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input placeholder="Sub-item label" value={child.label}
                                                onChange={(e) => updateNav(i, {
                                                    children: item.children.map((x, k) => (k === c ? { ...x, label: e.target.value } : x)),
                                                })} />
                                            <Input placeholder="/keyboards/75" value={child.href}
                                                onChange={(e) => updateNav(i, {
                                                    children: item.children.map((x, k) => (k === c ? { ...x, href: e.target.value } : x)),
                                                })} />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Remove sub-item"
                                                onClick={() => updateNav(i, { children: item.children.filter((_, k) => k !== c) })}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-red-600">
                                            {err[`nav.${i}.children.${c}.label`] ?? err[`nav.${i}.children.${c}.href`]}
                                        </p>
                                    </div>
                                ))}
                                <Button type="button" variant="ghost" size="sm"
                                    onClick={() => updateNav(i, { children: [...item.children, { label: '', href: '' }] })}>
                                    <Plus className="size-4" /> Add dropdown item
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" disabled={data.nav.length >= 8}
                        onClick={() => setData('nav', [...data.nav, { label: '', href: '', children: [] }])}>
                        <Plus className="size-4" /> Add menu item
                    </Button>
                </section>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={processing}>Save header</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

HeaderSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'General', href: '/admin/header' },
        { title: 'Header', href: '/admin/header' },
    ],
};
