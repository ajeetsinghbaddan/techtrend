import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PriceForm, ProductData, ProductImageData, SpecRow, VariantForm } from '@/types/catalog';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Form = {
    name: string;
    slug: string;
    subtitle: string;
    description: string;
    is_active: boolean;
    run_label: string;
    units_total: number | '';
    rating: number | '';
    reviews_count: number;
    meta_title: string;
    meta_description: string;
    collection_ids: number[];
    specs: SpecRow[];
    compliance: SpecRow[];
    variants: VariantForm[];
    prices: PriceForm[];
};

type Props = {
    product: ProductData | null;
    collections: { id: number; name: string }[];
    currencies: string[];
    baseCurrency: string;
};

const TABS = ['Details', 'Variants', 'Prices', 'Images'] as const;
type Tab = (typeof TABS)[number];

const emptyVariant = (): VariantForm => ({
    id: null, colour_name: '', colour_hex: '', option_name: '',
    sku: '', stock: 0, price_adjustment_minor: 0, is_active: true,
});

/** Turn 18588 (minor units) into "185.88" for display, and back on change. */
const toMajor = (minor: number | null) => (minor === null ? '' : (minor / 100).toFixed(2));
const toMinor = (major: string) => Math.round((Number(major) || 0) * 100);

export default function ProductEditor({ product, collections, currencies, baseCurrency }: Props) {
    const isNew = product === null;
    const [tab, setTab] = useState<Tab>('Details');

    const { data, setData, post, put, processing, errors, recentlySuccessful } = useForm<Form>({
        name: product?.name ?? '',
        slug: product?.slug ?? '',
        subtitle: product?.subtitle ?? '',
        description: product?.description ?? '',
        is_active: product?.is_active ?? false,
        run_label: product?.run_label ?? '',
        units_total: product?.units_total ?? '',
        rating: product?.rating ?? '',
        reviews_count: product?.reviews_count ?? 0,
        meta_title: product?.meta_title ?? '',
        meta_description: product?.meta_description ?? '',
        collection_ids: product?.collection_ids ?? [],
        specs: product?.specs ?? [],
        compliance: product?.compliance ?? [],
        variants: product?.variants?.length ? product.variants : [emptyVariant()],
        prices: currencies.map((currency) => {
            const existing = product?.prices?.find((p) => p.currency === currency);
            return existing ?? { currency, amount_minor: 0, compare_at_minor: null };
        }),
    });

    const err = errors as Record<string, string>;
    const errorsOn = (prefix: string) => Object.keys(err).some((k) => k.startsWith(prefix));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isNew) {
            post('/admin/products', { preserveScroll: true });
        } else {
            put(`/admin/products/${product!.slug}`, { preserveScroll: true });
        }
    };

    const setVariant = (i: number, patch: Partial<VariantForm>) =>
        setData('variants', data.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

    const setPrice = (currency: string, patch: Partial<PriceForm>) =>
        setData('prices', data.prices.map((p) => (p.currency === currency ? { ...p, ...patch } : p)));

    const setRows = (key: 'specs' | 'compliance', i: number, patch: Partial<SpecRow>) =>
        setData(key, data[key].map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const basePrice = data.prices.find((p) => p.currency === baseCurrency)?.amount_minor ?? 0;

    return (
        <>
            <Head title={isNew ? 'New product' : `Edit: ${product!.name}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-5xl p-4 sm:p-6">
                {/* Header bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                    <h1 className="text-xl font-semibold">{data.name || 'New product'}</h1>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)} />
                            Active
                        </label>
                        <Button type="submit" disabled={processing}>
                            {isNew ? 'Create product' : 'Save changes'}
                        </Button>
                        {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                    </div>
                </div>

                {/* Tabs */}
                <div role="tablist" className="mt-4 flex gap-1 border-b">
                    {TABS.map((t) => {
                        const disabled = t === 'Images' && isNew;
                        const prefix = t === 'Variants' ? 'variants' : t === 'Prices' ? 'prices' : '';
                        const hasError = prefix !== '' && errorsOn(prefix);

                        return (
                            <button key={t} type="button" role="tab" aria-selected={tab === t}
                                disabled={disabled} onClick={() => setTab(t)}
                                className={`-mb-px border-b-2 px-4 py-2 text-sm disabled:opacity-40 ${
                                    tab === t ? 'border-[#5b4f9a] font-medium text-[#5b4f9a]' : 'border-transparent text-slate-600'
                                }`}>
                                {t}
                                {hasError && <span className="ml-1.5 text-red-600" aria-label="has errors">•</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="pt-6">
                    {tab === 'Details' && (
                        <DetailsTab data={data} setData={setData} setRows={setRows} err={err} collections={collections} />
                    )}

                    {tab === 'Variants' && (
                        <VariantsTab data={data} setData={setData} setVariant={setVariant} err={err}
                            basePrice={basePrice} baseCurrency={baseCurrency} />
                    )}

                    {tab === 'Prices' && (
                        <PricesTab data={data} setPrice={setPrice} err={err} baseCurrency={baseCurrency} />
                    )}

                    {tab === 'Images' && product && (
                        <ImagesTab product={product} />
                    )}
                </div>
            </form>
        </>
    );
}

/* ---------- Details ---------- */

function DetailsTab({ data, setData, setRows, err, collections }: {
    data: Form;
    setData: (key: keyof Form, value: Form[keyof Form]) => void;
    setRows: (key: 'specs' | 'compliance', i: number, patch: Partial<SpecRow>) => void;
    err: Record<string, string>;
    collections: { id: number; name: string }[];
}) {
    const toggleCollection = (id: number) =>
        setData('collection_ids', data.collection_ids.includes(id)
            ? data.collection_ids.filter((c) => c !== id)
            : [...data.collection_ids, id]);

    const rowSection = (key: 'specs' | 'compliance', title: string, hint: string, max: number) => (
        <section className="space-y-2 rounded-lg border p-4">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{hint}</p>

            {data[key].map((row, i) => (
                <div key={i} className="space-y-1">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input className="sm:w-48" value={row.label} placeholder="Layout" aria-label="Label"
                            onChange={(e) => setRows(key, i, { label: e.target.value })} />
                        <Input value={row.value} placeholder="ISO-DE · 84 keys" aria-label="Value"
                            onChange={(e) => setRows(key, i, { value: e.target.value })} />
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete row"
                            onClick={() => setData(key, data[key].filter((_, j) => j !== i))}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-red-600">{err[`${key}.${i}.label`] ?? err[`${key}.${i}.value`]}</p>
                </div>
            ))}

            <Button type="button" variant="outline" size="sm" disabled={data[key].length >= max}
                onClick={() => setData(key, [...data[key], { label: '', value: '' }])}>
                <Plus className="size-4" /> Add row
            </Button>
        </section>
    );

    return (
        <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} placeholder="Compile 75 — hot-swap 75%"
                            onChange={(e) => setData('name', e.target.value)} />
                        <p className="text-sm text-red-600">{err.name}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="slug">URL slug</Label>
                        <Input id="slug" value={data.slug} placeholder="Leave empty to build from the name"
                            onChange={(e) => setData('slug', e.target.value)} />
                        <p className="text-xs text-muted-foreground">/products/{data.slug || 'generated'}</p>
                        <p className="text-sm text-red-600">{err.slug}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="subtitle">Subtitle</Label>
                        <Input id="subtitle" value={data.subtitle}
                            onChange={(e) => setData('subtitle', e.target.value)} />
                        <p className="text-sm text-red-600">{err.subtitle}</p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description">Description (HTML)</Label>
                        <textarea id="description" rows={8} value={data.description}
                            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                            onChange={(e) => setData('description', e.target.value)} />
                        <p className="text-sm text-red-600">{err.description}</p>
                    </div>
                </div>

                <aside className="space-y-4">
                    <fieldset className="space-y-2 rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Collections</legend>
                        {collections.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.collection_ids.includes(c.id)}
                                    onChange={() => toggleCollection(c.id)} />
                                {c.name}
                            </label>
                        ))}
                        <p className="text-sm text-red-600">{err.collection_ids}</p>
                    </fieldset>

                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="space-y-1">
                            <Label htmlFor="run_label">Run label</Label>
                            <Input id="run_label" value={data.run_label} placeholder="Run 06"
                                onChange={(e) => setData('run_label', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="units_total">Units in run</Label>
                            <Input id="units_total" type="number" min={1} value={data.units_total}
                                onChange={(e) => setData('units_total', e.target.value === '' ? '' : Number(e.target.value))} />
                            <p className="text-xs text-muted-foreground">Used for "118 of 400 left".</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="rating">Rating</Label>
                                <Input id="rating" type="number" step="0.1" min={0} max={5} value={data.rating}
                                    onChange={(e) => setData('rating', e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reviews_count">Reviews</Label>
                                <Input id="reviews_count" type="number" min={0} value={data.reviews_count}
                                    onChange={(e) => setData('reviews_count', Number(e.target.value))} />
                            </div>
                        </div>
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
                                <textarea id="meta_description" rows={3} value={data.meta_description}
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                    onChange={(e) => setData('meta_description', e.target.value)} />
                                <p className="text-xs text-muted-foreground">{data.meta_description.length}/160</p>
                            </div>
                        </div>
                    </details>
                </aside>
            </div>

            {rowSection('specs', 'Specifications', 'The table on the product page.', 20)}
            {rowSection('compliance', 'Product safety & consumer rights', 'Required in the EU for most products.', 10)}
        </div>
    );
}

/* ---------- Variants ---------- */

function VariantsTab({ data, setData, setVariant, err, basePrice, baseCurrency }: {
    data: Form;
    setData: (key: keyof Form, value: Form[keyof Form]) => void;
    setVariant: (i: number, patch: Partial<VariantForm>) => void;
    err: Record<string, string>;
    basePrice: number;
    baseCurrency: string;
}) {
    const [colourText, setColourText] = useState('');
    const [optionText, setOptionText] = useState('');

    const skuBase = (data.slug || data.name || 'sku')
        .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 10);

    const generate = () => {
        const colours = colourText.split('\n').map((l) => l.trim()).filter(Boolean)
            .map((line) => {
                const [name, hex] = line.split('|').map((s) => s.trim());
                return { name, hex: hex ?? '' };
            });
        const options = optionText.split('\n').map((l) => l.trim()).filter(Boolean);

        const colourList = colours.length ? colours : [{ name: '', hex: '' }];
        const optionList = options.length ? options : [''];

        const existing = new Map(data.variants.map((v) => [`${v.colour_name}|${v.option_name}`, v]));
        const built: VariantForm[] = [];

        for (const colour of colourList) {
            for (const option of optionList) {
                const key = `${colour.name}|${option}`;
                const prior = existing.get(key);

                built.push(prior ? { ...prior, colour_hex: colour.hex || prior.colour_hex } : {
                    ...emptyVariant(),
                    colour_name: colour.name,
                    colour_hex: colour.hex,
                    option_name: option,
                    sku: [skuBase,
                        colour.name.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 4),
                        option.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6),
                    ].filter(Boolean).join('-'),
                });
            }
        }

        setData('variants', built);
    };

    return (
        <div className="space-y-5">
            <section className="space-y-3 rounded-lg border border-dashed p-4">
                <h2 className="flex items-center gap-2 font-semibold">
                    <Wand2 className="size-4" /> Generate variants
                </h2>
                <p className="text-xs text-muted-foreground">
                    One per line. Colours take an optional hex after a pipe: <code>Deep Indigo | #5b4f9a</code>.
                    Existing variants with the same colour and option keep their stock and SKU.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label htmlFor="gen-colours">Colours</Label>
                        <textarea id="gen-colours" rows={4} value={colourText}
                            placeholder={'Deep Indigo | #5b4f9a\nGraphite | #3f4350'}
                            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                            onChange={(e) => setColourText(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="gen-options">Options (layout, size…)</Label>
                        <textarea id="gen-options" rows={4} value={optionText}
                            placeholder={'ISO-DE — QWERTZ\nANSI-US'}
                            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                            onChange={(e) => setOptionText(e.target.value)} />
                    </div>
                </div>

                <Button type="button" variant="outline" onClick={generate}>Build the grid</Button>
            </section>

            <p className="text-xs text-muted-foreground">
                "Price +/−" is added to the {baseCurrency} base price from the Prices tab, and converted for
                other currencies. Leave it at 0.00 for options that cost the same.
            </p>

            <p className="text-sm text-red-600">{err.variants}</p>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="px-3 py-3">Colour</th>
                            <th className="px-3 py-3">Hex</th>
                            <th className="px-3 py-3">Option</th>
                            <th className="px-3 py-3">SKU</th>
                            <th className="px-3 py-3">Stock</th>
                            <th className="px-3 py-3">Price +/−</th>
                            <th className="px-3 py-3">Sells for</th>
                            <th className="px-3 py-3">On</th>
                            <th className="px-3 py-3"><span className="sr-only">Delete</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.variants.map((v, i) => (
                            <tr key={i}>
                                <td className="px-3 py-2">
                                    <Input value={v.colour_name} aria-label="Colour name" className="h-9"
                                        onChange={(e) => setVariant(i, { colour_name: e.target.value })} />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 shrink-0 rounded border"
                                            style={{ background: /^#[0-9a-f]{6}$/i.test(v.colour_hex) ? v.colour_hex : 'transparent' }}
                                            aria-hidden />
                                        <Input value={v.colour_hex} placeholder="#5b4f9a" aria-label="Colour hex"
                                            className="h-9 w-28 font-mono"
                                            onChange={(e) => setVariant(i, { colour_hex: e.target.value })} />
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <Input value={v.option_name} aria-label="Option" className="h-9"
                                        onChange={(e) => setVariant(i, { option_name: e.target.value })} />
                                </td>
                                <td className="px-3 py-2">
                                    <Input value={v.sku} aria-label="SKU" className="h-9 font-mono"
                                        onChange={(e) => setVariant(i, { sku: e.target.value })} />
                                    <p className="text-xs text-red-600">{err[`variants.${i}.sku`]}</p>
                                </td>
                                <td className="px-3 py-2">
                                    <Input type="number" value={v.stock} aria-label="Stock" className="h-9 w-20"
                                        onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} />
                                </td>
                                <td className="px-3 py-2">
                                    <Input type="number" step="0.01" aria-label="Price adjustment"
                                        className="h-9 w-24"
                                        value={toMajor(v.price_adjustment_minor)}
                                        onChange={(e) => setVariant(i, { price_adjustment_minor: toMinor(e.target.value) })} />
                                </td>
                                <td className="px-3 py-2 font-mono text-sm text-muted-foreground">
                                    {basePrice > 0 ? `${toMajor(basePrice + v.price_adjustment_minor)} ${baseCurrency}` : '—'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <input type="checkbox" checked={v.is_active} aria-label="Active"
                                        onChange={(e) => setVariant(i, { is_active: e.target.checked })} />
                                </td>
                                <td className="px-3 py-2">
                                    <Button type="button" variant="ghost" size="icon" aria-label="Delete variant"
                                        disabled={data.variants.length === 1}
                                        onClick={() => setData('variants', data.variants.filter((_, j) => j !== i))}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Button type="button" variant="outline" disabled={data.variants.length >= 60}
                onClick={() => setData('variants', [...data.variants, emptyVariant()])}>
                <Plus className="size-4" /> Add variant ({data.variants.length}/60)
            </Button>
        </div>
    );
}

/* ---------- Prices ---------- */

function PricesTab({ data, setPrice, err, baseCurrency }: {
    data: Form;
    setPrice: (currency: string, patch: Partial<PriceForm>) => void;
    err: Record<string, string>;
    baseCurrency: string;
}) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Only the {baseCurrency} price is required. Leave another currency empty and it converts
                automatically at the daily exchange rate. Enter a price to fix it for that currency instead,
                which is recommended for anything you put on sale in EUR.
            </p>

            <p className="text-sm text-red-600">{err.prices}</p>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3">Currency</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Compare at</th>
                            <th className="px-4 py-3">Discount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.prices.map((price, i) => {
                            const isBase = price.currency === baseCurrency;
                            const isAuto = !isBase && price.amount_minor <= 0;

                            const off = !isAuto && price.compare_at_minor && price.compare_at_minor > price.amount_minor
                                ? Math.round((1 - price.amount_minor / price.compare_at_minor) * 100)
                                : null;

                            return (
                                <tr key={price.currency}>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-medium">{price.currency}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {isBase ? 'base · required' : isAuto ? 'auto' : 'fixed'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input type="number" step="0.01" min={0} className="h-9 w-32"
                                            aria-label={`${price.currency} price`}
                                            placeholder={isBase ? '0.00' : 'Auto'}
                                            value={isAuto ? '' : toMajor(price.amount_minor)}
                                            onChange={(e) => setPrice(price.currency, {
                                                amount_minor: e.target.value === '' ? 0 : toMinor(e.target.value),
                                                ...(e.target.value === '' && !isBase ? { compare_at_minor: null } : {}),
                                            })} />
                                        <p className="text-xs text-red-600">{err[`prices.${i}.amount_minor`]}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input type="number" step="0.01" min={0} className="h-9 w-32"
                                            aria-label={`${price.currency} compare-at price`}
                                            placeholder={isAuto ? 'Auto' : 'None'}
                                            disabled={isAuto}
                                            value={isAuto ? '' : toMajor(price.compare_at_minor)}
                                            onChange={(e) => setPrice(price.currency, {
                                                compare_at_minor: e.target.value === '' ? null : toMinor(e.target.value),
                                            })} />
                                        <p className="text-xs text-red-600">{err[`prices.${i}.compare_at_minor`]}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">
                                        {off ? `−${off}%` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------- Images ---------- */

function ImagesTab({ product }: { product: ProductData }) {
    const [uploading, setUploading] = useState(false);

    const upload = (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);

        router.post(`/admin/products/${product.slug}/images`,
            { images: Array.from(files) },
            { forceFormData: true, preserveScroll: true, onFinish: () => setUploading(false) });
    };

    const updateImage = (image: ProductImageData, patch: { alt?: string; colour_name?: string }) =>
        router.put(`/admin/products/${product.slug}/images/${image.id}`,
            { alt: image.alt ?? '', colour_name: image.colour_name ?? '', ...patch },
            { preserveScroll: true });

    const remove = (image: ProductImageData) => {
        if (confirm('Delete this image?')) {
            router.delete(`/admin/products/${product.slug}/images/${image.id}`, { preserveScroll: true });
        }
    };

    const move = (from: number, to: number) => {
        const ids = product.images.map((i) => i.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        router.post(`/admin/products/${product.slug}/images/reorder`, { ids }, { preserveScroll: true });
    };

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-dashed p-4">
                <Label htmlFor="images" className="text-sm font-medium">Upload images</Label>
                <Input id="images" type="file" multiple accept="image/png,image/jpeg,image/webp"
                    disabled={uploading} className="mt-2"
                    onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
                <p className="mt-2 text-xs text-muted-foreground">
                    Up to 12 images, 3 MB each. The first one is used on product cards.
                    Set a colour name to show that image when a shopper picks that colourway.
                </p>
                {uploading && <p className="mt-2 text-sm text-muted-foreground">Uploading…</p>}
            </div>

            {product.images.length === 0 ? (
                <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No images yet.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {product.images.map((image, i) => (
                        <li key={image.id} className="space-y-2 rounded-lg border p-3">
                            <div className="relative">
                                <img src={image.url} alt={image.alt ?? ''} className="aspect-square w-full rounded-md object-cover" />
                                {i === 0 && (
                                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                                        Main
                                    </span>
                                )}
                            </div>

                            <Input defaultValue={image.alt ?? ''} placeholder="Alt text" aria-label="Alt text"
                                className="h-9" onBlur={(e) => updateImage(image, { alt: e.target.value })} />
                            <Input defaultValue={image.colour_name ?? ''} placeholder="Colour (optional)"
                                aria-label="Colour name" className="h-9"
                                onBlur={(e) => updateImage(image, { colour_name: e.target.value })} />

                            <div className="flex justify-between">
                                <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="sm" disabled={i === 0}
                                        onClick={() => move(i, i - 1)}>←</Button>
                                    <Button type="button" variant="ghost" size="sm"
                                        disabled={i === product.images.length - 1}
                                        onClick={() => move(i, i + 1)}>→</Button>
                                </div>
                                <Button type="button" variant="ghost" size="icon" aria-label="Delete image"
                                    onClick={() => remove(image)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

ProductEditor.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Catalog', href: '/admin/collections' },
        { title: 'Product', href: '/admin/products' },
    ],
};
