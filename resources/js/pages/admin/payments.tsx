import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Copy, Plug, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Field = {
    key: string;
    label: string;
    help: string | null;
    secret: boolean;
    required: boolean;
    has_value: boolean;
    value: string | null;
};

type Gateway = {
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    mode: 'test' | 'live';
    position: number;
    regions: string[];
    currencies: string[];
    settings: { max_total?: string | number; instructions?: string };
    configured: boolean;
    default_currencies: string[] | null;
    webhook_url: string | null;
    fields: Field[];
};

type Region = { code: string; label: string; currency: string };

type FormData = {
    name: string;
    description: string;
    enabled: boolean;
    mode: 'test' | 'live';
    position: number;
    regions: string[];
    currencies: string;
    settings: { max_total: string; instructions: string };
    credentials: Record<string, string>;
};

function GatewayCard({ gateway, regions, baseCurrency }: { gateway: Gateway; regions: Region[]; baseCurrency: string }) {
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [copied, setCopied] = useState(false);
    const isCod = gateway.key === 'cod';

    const blankCredentials = () =>
        Object.fromEntries(gateway.fields.map((f) => [f.key, f.secret ? '' : (f.value ?? '')]));

    const form = useForm<FormData>({
        name: gateway.name,
        description: gateway.description ?? '',
        enabled: gateway.enabled,
        mode: gateway.mode,
        position: gateway.position,
        regions: gateway.regions,
        currencies: gateway.currencies.join(', '),
        settings: {
            max_total: String(gateway.settings.max_total ?? ''),
            instructions: gateway.settings.instructions ?? '',
        },
        credentials: blankCredentials(),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            currencies: data.currencies.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
        }));
        form.put(`/admin/payments/${gateway.key}`, {
            preserveScroll: true,
            onSuccess: () => form.setData('credentials', blankCredentials()),
        });
    };

    const toggleRegion = (code: string) =>
        form.setData('regions', form.data.regions.includes(code)
            ? form.data.regions.filter((r) => r !== code)
            : [...form.data.regions, code]);

    const copyWebhook = async () => {
        if (!gateway.webhook_url) return;
        await navigator.clipboard.writeText(gateway.webhook_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const status = !gateway.enabled
        ? { text: 'Off', style: 'bg-slate-100 text-slate-600' }
        : !gateway.configured
            ? { text: 'Keys missing', style: 'bg-red-100 text-red-800' }
            : gateway.mode === 'live' || isCod
                ? { text: 'Live', style: 'bg-green-100 text-green-800' }
                : { text: 'Test mode', style: 'bg-amber-100 text-amber-800' };

    return (
        <form onSubmit={submit} className="space-y-5 rounded-lg border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{gateway.name}</h2>
                    <span className="font-mono text-xs text-muted-foreground">{gateway.key}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${status.style}`}>{status.text}</span>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.checked)} />
                    Offer at checkout
                </label>
            </div>
            {errors[`${gateway.key}.enabled`] && <p className="text-sm text-red-600">{errors[`${gateway.key}.enabled`]}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                    <span className="font-medium">Name at checkout</span>
                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {!isCod && (
                        <label className="space-y-1 text-sm">
                            <span className="font-medium">Mode</span>
                            <select value={form.data.mode} onChange={(e) => form.setData('mode', e.target.value as 'test' | 'live')}
                                className="h-9 w-full rounded-md border px-2">
                                <option value="test">Test</option>
                                <option value="live">Live</option>
                            </select>
                        </label>
                    )}
                    <label className="space-y-1 text-sm">
                        <span className="font-medium">Order</span>
                        <Input type="number" min={0} max={99} value={form.data.position}
                            onChange={(e) => form.setData('position', Number(e.target.value))} />
                    </label>
                </div>
                <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-medium">Description at checkout</span>
                    <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                </label>
            </div>

            <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Regions <span className="font-normal text-muted-foreground">(none ticked = all)</span></legend>
                <div className="flex flex-wrap gap-2">
                    {regions.map((r) => (
                        <label key={r.code}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                                form.data.regions.includes(r.code) ? 'border-violet-400 bg-violet-50' : ''
                            }`}>
                            <input type="checkbox" className="sr-only" checked={form.data.regions.includes(r.code)} onChange={() => toggleRegion(r.code)} />
                            {r.label} <span className="font-mono text-xs text-muted-foreground">{r.currency}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {!isCod && (
                <label className="block space-y-1 text-sm">
                    <span className="font-medium">Currencies</span>
                    <Input value={form.data.currencies} onChange={(e) => form.setData('currencies', e.target.value)}
                        placeholder={gateway.default_currencies ? gateway.default_currencies.join(', ') : 'Any'} />
                    <span className="block text-xs text-muted-foreground">
                        Leave empty for the default: {gateway.default_currencies ? gateway.default_currencies.join(', ') : 'any currency'}.
                        Only add a currency your provider account has enabled.
                    </span>
                </label>
            )}

            {isCod && (
                <label className="block space-y-1 text-sm">
                    <span className="font-medium">Maximum order value ({baseCurrency})</span>
                    <Input type="number" min={0} step="0.01" value={form.data.settings.max_total}
                        onChange={(e) => form.setData('settings', { ...form.data.settings, max_total: e.target.value })}
                        placeholder="No limit" className="max-w-48" />
                    <span className="block text-xs text-muted-foreground">Cash on delivery is hidden for bigger orders, which limits the risk of refused parcels.</span>
                </label>
            )}

            {gateway.fields.length > 0 && (
                <fieldset className="space-y-3 rounded-md bg-slate-50 p-4">
                    <legend className="sr-only">Keys</legend>
                    {gateway.fields.map((f) => (
                        <label key={f.key} className="block space-y-1 text-sm">
                            <span className="font-medium">
                                {f.label}
                                {!f.required && <span className="font-normal text-muted-foreground"> (optional)</span>}
                                {f.secret && f.has_value && <span className="ml-2 text-xs font-normal text-green-700">saved</span>}
                            </span>
                            <Input type={f.secret ? 'password' : 'text'} autoComplete="off"
                                value={form.data.credentials[f.key] ?? ''}
                                placeholder={f.secret && f.has_value ? '•••••••• (leave empty to keep)' : ''}
                                onChange={(e) => form.setData('credentials', { ...form.data.credentials, [f.key]: e.target.value })} />
                            {f.help && <span className="block text-xs text-muted-foreground">{f.help}</span>}
                            {form.errors[`credentials.${f.key}` as keyof FormData] && (
                                <span className="block text-xs text-red-600">{form.errors[`credentials.${f.key}` as keyof FormData]}</span>
                            )}
                        </label>
                    ))}
                </fieldset>
            )}

            {gateway.webhook_url && (
                <div className="space-y-1 text-sm">
                    <span className="font-medium">Webhook address</span>
                    <div className="flex gap-2">
                        <code className="flex-1 truncate rounded-md border bg-white px-3 py-2 text-xs">{gateway.webhook_url}</code>
                        <Button type="button" variant="outline" size="sm" onClick={copyWebhook}>
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        </Button>
                    </div>
                    <span className="block text-xs text-muted-foreground">
                        Add this in your {gateway.name} dashboard, then paste its signing secret above.
                    </span>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={form.processing}>Save</Button>
                {!isCod && (
                    <Button type="button" variant="outline" disabled={!gateway.configured}
                        onClick={() => router.post(`/admin/payments/${gateway.key}/test`, {}, { preserveScroll: true })}>
                        <Plug className="size-4" /> Test connection
                    </Button>
                )}
                {gateway.fields.some((f) => f.has_value) && (
                    <Button type="button" variant="ghost"
                        onClick={() => confirm(`Remove all saved keys for ${gateway.name}? It will be switched off.`)
                            && router.delete(`/admin/payments/${gateway.key}/credentials`, { preserveScroll: true })}>
                        <Trash2 className="size-4" /> Remove keys
                    </Button>
                )}
            </div>
        </form>
    );
}

export default function PaymentsAdmin({ gateways, regions, baseCurrency }: {
    gateways: Gateway[];
    regions: Region[];
    baseCurrency: string;
}) {
    const notice = usePage<{ flash?: { admin_notice?: string } }>().props.flash?.admin_notice;

    return (
        <>
            <Head title="Payments" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold">Payments</h1>
                    <p className="text-sm text-muted-foreground">
                        Customers only see methods that are switched on, have their keys, and suit their region, currency and order total.
                        Keys are stored encrypted and never shown again.
                    </p>
                </div>

                {notice && <p role="status" className="rounded-md bg-slate-100 px-4 py-2 text-sm">{notice}</p>}

                {gateways.map((g) => <GatewayCard key={g.key} gateway={g} regions={regions} baseCurrency={baseCurrency} />)}
            </div>
        </>
    );
}

PaymentsAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Sales', href: '/admin/orders' },
        { title: 'Payments', href: '/admin/payments' },
    ],
};
