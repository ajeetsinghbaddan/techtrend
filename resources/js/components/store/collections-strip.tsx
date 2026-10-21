import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

type CollectionCard = { name: string; slug: string; image_url: string | null };

type Settings = {
    enabled: boolean;
    title: string;
    subtitle: string | null;
    link_label: string | null;
};

export default function CollectionsStrip({ settings, collections }: {
    settings: Settings;
    collections: CollectionCard[];
}) {
    if (!settings.enabled || collections.length === 0) return null;

    return (
        <section className="mx-auto max-w-[1500px] px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
            <div className="text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-[#1f2230] sm:text-4xl">
                    {settings.title}
                </h2>
                {settings.subtitle && <p className="mt-3 text-slate-500">{settings.subtitle}</p>}
            </div>

            <ul className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 sm:gap-8 lg:justify-center lg:overflow-visible">
                {collections.map((collection) => (
                    <li key={collection.slug} className="shrink-0 snap-start">
                        <Link href={`/collections/${collection.slug}`} className="group block text-center">
                            <div className="mx-auto size-24 overflow-hidden rounded-full bg-slate-200 sm:size-28 lg:size-32">
                                {collection.image_url ? (
                                    <img src={collection.image_url} alt="" loading="lazy"
                                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="size-full bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                )}
                            </div>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm text-slate-700 group-hover:text-slate-950 sm:text-base">
                                {collection.name}
                                <ArrowUpRight className="size-3.5 text-slate-400" aria-hidden />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            {settings.link_label && (
                <div className="mt-6 text-center">
                    <Link href="/collections"
                        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-6 text-sm hover:bg-slate-50">
                        {settings.link_label}
                        <ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                </div>
            )}
        </section>
    );
}
