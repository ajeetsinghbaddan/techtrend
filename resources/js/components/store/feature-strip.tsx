import type { FeatureItem, FeatureSettings } from '@/types/features';
import { Link } from '@inertiajs/react';

const columns: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
};

function FeatureContent({ item }: { item: FeatureItem }) {
    return (
        <>
            <h3 className="text-base font-semibold text-[#1f2230] sm:text-lg">{item.title}</h3>
            {item.text && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 sm:text-[15px]">{item.text}</p>
            )}
        </>
    );
}

function Feature({ item }: { item: FeatureItem }) {
    const className = 'block h-full bg-white px-6 py-7 text-center sm:py-9';

    if (!item.href) {
        return <div className={className}><FeatureContent item={item} /></div>;
    }

    const linkClass = `${className} transition-colors hover:bg-slate-50 focus-visible:relative focus-visible:outline-2 focus-visible:outline-[#5b4f9a]`;

    return item.href.startsWith('https://') ? (
        <a href={item.href} className={linkClass} rel="noopener noreferrer">
            <FeatureContent item={item} />
        </a>
    ) : (
        <Link href={item.href} className={linkClass}>
            <FeatureContent item={item} />
        </Link>
    );
}

export default function FeatureStrip({ features }: { features: FeatureSettings }) {
    if (features.items.length === 0) return null;

    return (
        <section aria-label="Shopping information" className="mx-auto max-w-[1500px] px-4 pt-8 sm:px-6 sm:pt-10 lg:px-10">
            <ul
                className={`grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 ${columns[features.items.length] ?? ''}`}
            >
                {features.items.map((item, i) => (
                    <li key={i}>
                        <Feature item={item} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
