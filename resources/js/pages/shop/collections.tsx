import StoreLayout from '@/layouts/store-layout';
import { Head, Link } from '@inertiajs/react';

type Row = {
    name: string;
    slug: string;
    tagline: string | null;
    image_url: string | null;
    products_count: number;
};

export default function CollectionsIndex({ collections }: { collections: Row[] }) {
    return (
        <StoreLayout>
            <Head title="Collections" />

            <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Collections</h1>

                <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((c) => (
                        <li key={c.slug}>
                            <Link href={`/collections/${c.slug}`}
                                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
                                <div className="size-20 shrink-0 overflow-hidden rounded-full bg-slate-200">
                                    {c.image_url ? (
                                        <img src={c.image_url} alt="" loading="lazy"
                                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="size-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-[#1f2230] group-hover:underline">{c.name}</h2>
                                    {c.tagline && <p className="mt-1 text-sm text-slate-500">{c.tagline}</p>}
                                    <p className="mt-1 font-mono text-xs text-slate-400">
                                        {c.products_count} product{c.products_count === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </StoreLayout>
    );
}
