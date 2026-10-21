import type { Address } from '@/types/account';
import type { Region } from '@/types/header';
import { usePage } from '@inertiajs/react';

export default function AddressBlock({ address, className = '' }: { address: Address; className?: string }) {
    const { regions } = usePage<{ regions: Record<string, Region> }>().props;

    return (
        <address className={`text-sm leading-relaxed not-italic text-slate-700 ${className}`}>
            {address.first_name} {address.last_name}<br />
            {address.line1}<br />
            {address.line2 && <>{address.line2}<br /></>}
            {address.postcode} {address.city}<br />
            {regions[address.country]?.label ?? address.country}
            {address.phone && <><br /><span className="text-slate-500">{address.phone}</span></>}
        </address>
    );
}
