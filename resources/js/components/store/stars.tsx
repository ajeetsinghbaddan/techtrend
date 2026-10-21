import { Star } from 'lucide-react';

export default function Stars({ rating, className = 'size-4' }: { rating: number; className?: string }) {
    return (
        <span className="flex gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`${className} ${n <= Math.round(rating) ? 'fill-[#5b4f9a] text-[#5b4f9a]' : 'text-slate-300'}`} />
            ))}
        </span>
    );
}
