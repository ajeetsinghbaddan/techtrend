import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CookieBannerSettings } from '@/types/cookies';
import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

type Form = Omit<CookieBannerSettings, 'version' | 'ga_measurement_id' | 'plausible_domain' | 'policy_label' | 'policy_href'> & {
    policy_label: string;
    policy_href: string;
    ga_measurement_id: string;
    plausible_domain: string;
    ask_again: boolean;
};

type Stats = { total: number; analytics_rate: number | null; marketing_rate: number | null };

export default function CookieBannerPage({ banner, stats }: { banner: CookieBannerSettings; stats: Stats }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<Form>({
        enabled: banner.enabled,
        position: banner.position,
        text: banner.text,
        accept_label: banner.accept_label,
        reject_label: banner.reject_label,
        customize_label: banner.customize_label,
        save_label: banner.save_label,
        policy_label: banner.policy_label ?? '',
        policy_href: banner.policy_href ?? '',
        essential_label: banner.essential_label,
        essential_description: banner.essential_description,
        categories: banner.categories,
        ga_measurement_id: banner.ga_measurement_id ?? '',
        plausible_domain: banner.plausible_domain ?? '',
        ask_again: false,
    });
    const err = errors as Record<string, string>;

    const setCategory = (key: 'analytics' | 'marketing', patch: Partial<Form['categories']['analytics']>) =>
        setData('categories', { ...data.categories, [key]: { ...data.categories[key], ...patch } });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put('/admin/cookie-banner', { preserveScroll: true, onSuccess: () => setData('ask_again', false) });
    };

    const textField = (key: 'accept_label' | 'reject_label' | 'customize_label' | 'save_label' | 'policy_label', label: string) => (
        <div className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} />
            <p className="text-sm text-red-600">{err[key]}</p>
        </div>
    );

    return (
        <>
            <Head title="Cookie banner" />

            <form onSubmit={submit} className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold">Cookie banner</h1>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.enabled} onChange={(e) => setData('enabled', e.target.checked)} />
                        Show the banner
                    </label>
                </div>

                {!data.enabled && (data.ga_measurement_id || data.plausible_domain) && (
                    <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        With the banner off, visitors can't consent, so analytics will not load for anyone.
                    </p>
                )}

                {stats.total > 0 && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border p-4"><p className="font-mono text-2xl">{stats.total}</p><p className="text-xs text-muted-foreground">choices in 30 days</p></div>
                        <div className="rounded-lg border p-4"><p className="font-mono text-2xl">{stats.analytics_rate}%</p><p className="text-xs text-muted-foreground">allowed analytics</p></div>
                        <div className="rounded-lg border p-4"><p className="font-mono text-2xl">{stats.marketing_rate}%</p><p className="text-xs text-muted-foreground">allowed marketing</p></div>
                    </div>
                )}

                {/* Preview */}
                <div className="rounded-lg bg-slate-100 p-4">
                    <p className="mb-2 text-xs text-muted-foreground">Preview</p>
                    <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-slate-700">
                            {data.text}{' '}{data.policy_label && <span className="underline">{data.policy_label}</span>}
                        </p>
                        <div className="flex shrink-0 gap-2">
                            <span className="flex h-10 items-center rounded-full border px-4 text-sm">{data.reject_label}</span>
                            <span className="flex h-10 items-center rounded-full bg-[#1f2230] px-4 text-sm text-white">{data.accept_label}</span>
                        </div>
                    </div>
                </div>

                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="font-semibold">Wording</h2>

                    <div className="space-y-1">
                        <Label htmlFor="text">Message</Label>
                        <textarea id="text" rows={3} value={data.text} onChange={(e) => setData('text', e.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm" />
                        <p className="text-xs text-muted-foreground">{data.text.length}/400</p>
                        <p className="text-sm text-red-600">{err.text}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {textField('accept_label', 'Accept button')}
                        {textField('reject_label', 'Reject button')}
                        {textField('customize_label', 'Settings link')}
                        {textField('save_label', 'Save choices button')}
                        {textField('policy_label', 'Policy link text')}
                        <div className="space-y-1">
                            <Label htmlFor="policy_href">Policy link</Label>
                            <Input id="policy_href" value={data.policy_href} placeholder="/cookies"
                                onChange={(e) => setData('policy_href', e.target.value)} />
                            <p className="text-sm text-red-600">{err.policy_href}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="position">Position</Label>
                        <select id="position" value={data.position}
                            onChange={(e) => setData('position', e.target.value as Form['position'])}
                            className="h-9 rounded-md border px-3 text-sm">
                            <option value="bottom">Bottom, centred</option>
                            <option value="bottom-left">Bottom left, compact</option>
                        </select>
                    </div>
                </section>

                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="font-semibold">Categories</h2>

                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                        <div className="space-y-1">
                            <Label htmlFor="essential_label">Essential (always on)</Label>
                            <Input id="essential_label" value={data.essential_label}
                                onChange={(e) => setData('essential_label', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="essential_description">Description</Label>
                            <Input id="essential_description" value={data.essential_description}
                                onChange={(e) => setData('essential_description', e.target.value)} />
                            <p className="text-sm text-red-600">{err.essential_description}</p>
                        </div>
                    </div>

                    {(['analytics', 'marketing'] as const).map((key) => (
                        <div key={key} className="space-y-3 border-t pt-4">
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input type="checkbox" checked={data.categories[key].enabled}
                                    onChange={(e) => setCategory(key, { enabled: e.target.checked })} />
                                Offer the "{key}" category
                            </label>
                            {data.categories[key].enabled && (
                                <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                                    <Input value={data.categories[key].label} aria-label={`${key} label`}
                                        onChange={(e) => setCategory(key, { label: e.target.value })} />
                                    <Input value={data.categories[key].description} aria-label={`${key} description`}
                                        onChange={(e) => setCategory(key, { description: e.target.value })} />
                                </div>
                            )}
                            <p className="text-sm text-red-600">
                                {err[`categories.${key}.label`] ?? err[`categories.${key}.description`]}
                            </p>
                        </div>
                    ))}
                </section>

                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="font-semibold">Analytics tools</h2>
                    <p className="text-sm text-muted-foreground">
                        These only load after a visitor allows analytics. Leave empty if you don't use them.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="ga">Google Analytics 4 ID</Label>
                            <Input id="ga" value={data.ga_measurement_id} placeholder="G-ABC123XYZ" className="font-mono"
                                onChange={(e) => setData('ga_measurement_id', e.target.value.toUpperCase().trim())} />
                            <p className="text-sm text-red-600">{err.ga_measurement_id}</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="plausible">Plausible domain</Label>
                            <Input id="plausible" value={data.plausible_domain} placeholder="techtrend.eu" className="font-mono"
                                onChange={(e) => setData('plausible_domain', e.target.value.toLowerCase().trim())} />
                            <p className="text-sm text-red-600">{err.plausible_domain}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={data.ask_again}
                            onChange={(e) => setData('ask_again', e.target.checked)} />
                        <span>
                            <span className="font-medium">Ask everyone again when I save</span>
                            <span className="block text-amber-900/80">
                                Use this when you add a new tool or category. Visitors' earlier answers stop counting, and the banner reappears for all of them.
                            </span>
                        </span>
                    </label>
                </section>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={processing}>Save</Button>
                    {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                </div>
            </form>
        </>
    );
}

CookieBannerPage.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'General', href: '/admin/header' },
        { title: 'Cookie banner', href: '/admin/cookie-banner' },
    ],
};
