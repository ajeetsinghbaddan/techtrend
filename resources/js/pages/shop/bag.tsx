import StoreLayout from '@/layouts/store-layout';
import { useT } from '@/lib/i18n';
import type { MoneyValue } from '@/types/catalog-public';
import { Head, Link, router } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';

type Line = {
    id: number;
    name: string;
    slug: string;
    variant_label: string;
    image_url: string | null;
    quantity: number;
    max: number;
    unit_price: MoneyValue;
    line_total: MoneyValue;
};

type Cart = {
    lines: Line[];
    count: number;
    subtotal: MoneyValue;
    tax_note: string | null;
};

export default function Bag({ cart }: { cart: Cart }) {
    const t = useT();

    const setQuantity = (line: Line, quantity: number) =>
        router.patch(`/bag/${line.id}`, { quantity }, { preserveScroll: true });

    const remove = (line: Line) =>
        router.delete(`/bag/${line.id}`, { preserveScroll: true });

    return (
        <StoreLayout>
            <Head title={t('Your bag')} />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('Your bag')}</h1>

                {cart.lines.length === 0 ? (
                    <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-12 text-center">
                        <p className="text-slate-600">{t('Your bag is empty.')}</p>
                        <Link href="/products"
                            className="mt-6 inline-flex h-12 items-center rounded-full bg-[#1f2230] px-7 text-white hover:bg-black">
                            {t('Start shopping')}
                        </Link>
                    </div>
                ) : (
                    <div className="mt-10 gap-10 lg:flex lg:items-start">
                        <ul className="min-w-0 flex-1 divide-y divide-slate-200 border-y border-slate-200">
                            {cart.lines.map((line) => (
                                <li key={line.id} className="flex gap-4 py-6">
                                    <Link href={`/products/${line.slug}`} className="shrink-0">
                                        {line.image_url ? (
                                            <img src={line.image_url} alt="" className="size-24 rounded-xl object-cover sm:size-28" />
                                        ) : (
                                            <div className="size-24 rounded-xl bg-gradient-to-br from-[#5b4f9a] to-[#1f2230] sm:size-28" aria-hidden />
                                        )}
                                    </Link>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
                                                    {line.name}
                                                </Link>
                                                {line.variant_label && (
                                                    <p className="mt-1 font-mono text-xs text-slate-500">{line.variant_label}</p>
                                                )}
                                            </div>
                                            <p className="font-mono text-slate-900">{line.line_total.formatted}</p>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-4">
                                            <div className="flex h-10 items-center rounded-full border border-slate-200 bg-white">
                                                <button type="button" aria-label={t('Decrease quantity')}
                                                    onClick={() => setQuantity(line, line.quantity - 1)}
                                                    className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100">
                                                    <Minus className="size-3.5" />
                                                </button>
                                                <span className="w-8 text-center font-mono text-sm" aria-live="polite">
                                                    {line.quantity}
                                                </span>
                                                <button type="button" aria-label={t('Increase quantity')}
                                                    disabled={line.quantity >= line.max}
                                                    onClick={() => setQuantity(line, line.quantity + 1)}
                                                    className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-30">
                                                    <Plus className="size-3.5" />
                                                </button>
                                            </div>

                                            <span className="font-mono text-xs text-slate-400">
                                                {t(':price each', { price: line.unit_price.formatted })}
                                            </span>

                                            <button type="button" onClick={() => remove(line)}
                                                className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600">
                                                <Trash2 className="size-4" aria-hidden />
                                                {t('Remove')}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <aside className="mt-10 w-full shrink-0 lg:mt-0 lg:w-96">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                                <h2 className="font-mono text-xs tracking-[0.15em] text-slate-500 uppercase">
                                    {t('Order summary')}
                                </h2>

                                <dl className="mt-5 space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-slate-600">{t('Subtotal')}</dt>
                                        <dd className="font-mono">{cart.subtotal.formatted}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-600">{t('Shipping')}</dt>
                                        <dd className="text-slate-500">{t('Calculated at checkout')}</dd>
                                    </div>
                                </dl>

                                {cart.tax_note && <p className="mt-4 text-xs text-slate-500">{cart.tax_note}</p>}

                                <Link href="/checkout"
                                    className="mt-6 flex h-14 items-center justify-center rounded-full bg-[#1f2230] font-medium text-white hover:bg-black">
                                    {t('Checkout')}
                                </Link>

                                <Link href="/products" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-900">
                                    ← {t('Keep shopping')}
                                </Link>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </StoreLayout>
    );
}
