import type { BoxPosition, PromoCard } from '@/types/promos';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

const boxPlacement: Record<BoxPosition, string> = {
    'top-left': 'items-start justify-start',
    'top-right': 'items-start justify-end',
    'bottom-left': 'items-end justify-start',
    'bottom-right': 'items-end justify-end',
};

export default function PromoCardView({ card, className }: { card: PromoCard; className?: string }) {
    const hasLink = Boolean(card.label && card.href);

    const inner = (
        <>
            {card.image_url ? (
                <img
                    src={card.image_url}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
            )}

            <div className={`relative flex size-full p-4 sm:p-5 ${boxPlacement[card.box_position]}`}>
                <div className="w-full max-w-sm rounded-2xl bg-[#f6f5f1]/95 p-5 backdrop-blur-sm">
                    <h3 className="text-xl font-semibold text-[#1f2230] sm:text-2xl">{card.title}</h3>
                    {card.text && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{card.text}</p>
                    )}
                    {hasLink && (
                        <span className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-[#1f2230] px-5 text-sm font-medium text-white transition-colors group-hover:bg-black">
                            {card.label}
                            <ArrowUpRight className="size-4" aria-hidden />
                        </span>
                    )}
                </div>
            </div>
        </>
    );

    const base = `group relative isolate block overflow-hidden rounded-2xl bg-slate-200 ${className ?? ''} ${
        hasLink ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4f9a]' : ''
    }`;

    if (!hasLink) return <div className={base}>{inner}</div>;

    return card.href!.startsWith('https://') ? (
        <a href={card.href!} className={base} rel="noopener noreferrer">{inner}</a>
    ) : (
        <Link href={card.href!} className={base}>{inner}</Link>
    );
}
