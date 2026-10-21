import PromoCardView from '@/components/store/promo-card';
import type { PromoSettings } from '@/types/promos';

const gridCols: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
};

export default function PromoGrid({ promos, layout = 'bento', label = 'Featured' }: {
    promos: PromoSettings;
    layout?: 'bento' | 'columns';
    label?: string;
}) {
    const cards = promos.cards;
    if (cards.length === 0) return null;

    const bento = layout === 'bento' && cards.length === 3;

    return (
        <section aria-label={label} className="mx-auto max-w-[1500px] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-10">
            <div
                className={`grid gap-4 sm:gap-5 ${
                    bento
                        ? 'lg:grid-cols-2 lg:grid-rows-2'
                        : `sm:grid-cols-2 ${gridCols[Math.min(cards.length, 4)] ?? 'lg:grid-cols-3'}`
                }`}
            >
                {cards.map((card, i) => (
                    <PromoCardView
                        key={card.id}
                        card={card}
                        className={
                            bento && i === 0
                                ? 'aspect-[4/3] lg:row-span-2 lg:aspect-auto lg:h-full'
                                : bento
                                  ? 'aspect-[16/9] lg:aspect-[2/1]'
                                  : 'aspect-[4/3] sm:aspect-[3/4] lg:aspect-[4/5]'
                        }
                    />
                ))}
            </div>
        </section>
    );
}
