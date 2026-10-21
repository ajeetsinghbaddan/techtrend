import { useT } from '@/lib/i18n';
import { ORDER_LABELS, STATUS_STYLES } from '@/lib/orders';

export default function StatusBadge({ status }: { status: string }) {
    const t = useT();

    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}>
            {t(ORDER_LABELS[status] ?? status)}
        </span>
    );
}
