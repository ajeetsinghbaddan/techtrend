import { useT } from '@/lib/i18n';
import { useWishlist } from '@/lib/wishlist';
import { router } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState, type MouseEvent } from 'react';

type Props = {
    slug: string;
    name: string;
    variant?: 'icon' | 'full';
    className?: string;
};

export default function WishlistButton({ slug, name, variant = 'icon', className = '' }: Props) {
    const t = useT();
    const { has } = useWishlist();
    const [optimistic, setOptimistic] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);

    // Show the new state straight away; fall back to the server's answer when it arrives.
    const saved = optimistic ?? has(slug);

    const toggle = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;

        setOptimistic(!saved);
        setBusy(true);

        router.post(`/wishlist/${slug}`, {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['wishlist'],
            onFinish: () => {
                setBusy(false);
                setOptimistic(null);
            },
        });
    };

    const label = saved
        ? t('Remove :name from your wishlist', { name })
        : t('Save :name to your wishlist', { name });

    const heart = (
        <Heart aria-hidden className={`size-5 transition-colors ${saved ? 'fill-[#5b4f9a] text-[#5b4f9a]' : 'text-slate-700'}`} />
    );

    if (variant === 'full') {
        return (
            <button type="button" onClick={toggle} aria-pressed={saved} aria-label={label}
                className={`flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 hover:border-slate-400 ${className}`}>
                {heart}
                <span>{saved ? t('Saved') : t('Save')}</span>
            </button>
        );
    }

    return (
        <button type="button" onClick={toggle} aria-pressed={saved} aria-label={label}
            className={`flex size-10 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur hover:scale-105 ${className}`}>
            {heart}
        </button>
    );
}
