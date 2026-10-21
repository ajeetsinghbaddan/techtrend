import type { MarqueeSettings } from '@/types/marquee';
import type { CSSProperties } from 'react';

export default function MarqueeBar({ marquee }: { marquee: MarqueeSettings }) {
    if (!marquee.enabled || marquee.items.length === 0) return null;

    const style = {
        '--marquee-name': marquee.direction === 'right' ? 'marquee-right' : 'marquee-left',
        '--marquee-duration': `${marquee.speed}s`,
    } as CSSProperties;

    return (
        <section aria-label="Store highlights" className="marquee mt-10 overflow-hidden bg-[#1f2230] py-3 sm:mt-14 sm:py-4">
            <div className="marquee-track" style={style}>
                {[0, 1].map((copy) => (
                    <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
                        {marquee.items.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-center gap-8 px-8 font-mono text-xs tracking-[0.18em] whitespace-nowrap text-white/90 uppercase sm:gap-12 sm:px-12 sm:text-sm"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                ))}
            </div>
        </section>
    );
}
