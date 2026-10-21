import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';

type PaymentRow = {
    uuid: string;
    gateway: string;
    status: string;
    amount: string;
    reference: string | null;
    transaction_id: string | null;
    failure_reason: string | null;
    paid_at: string | null;
    created_at: string | null;
};

const STYLES: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-600',
    review: 'bg-orange-100 text-orange-900',
    refunded: 'bg-slate-100 text-slate-600',
};

export default function OrderPayments({ number, paymentMethod, paidAt, payments }: {
    number: string;
    paymentMethod: string;
    paidAt: string | null;
    payments: PaymentRow[];
}) {
    return (
        <section className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Payment</h2>
                {paidAt ? (
                    <span className="text-sm text-green-700">Paid {new Date(paidAt).toLocaleString()}</span>
                ) : paymentMethod === 'cod' ? (
                    <Button size="sm" onClick={() => confirm('Confirm the cash was collected?')
                        && router.post(`/admin/orders/${number}/mark-paid`, {}, { preserveScroll: true })}>
                        Mark cash as collected
                    </Button>
                ) : (
                    <span className="text-sm text-amber-700">Not paid yet</span>
                )}
            </div>

            {payments.some((p) => p.status === 'review') && (
                <p className="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-900">
                    A payment needs checking (see below). Usually this means a refund is due from the provider's dashboard.
                </p>
            )}

            {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment attempts.</p>
            ) : (
                <ul className="divide-y text-sm">
                    {payments.map((p) => (
                        <li key={p.uuid} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                            <span className="w-20 font-medium capitalize">{p.gateway}</span>
                            <span className={`rounded px-2 py-0.5 text-xs capitalize ${STYLES[p.status] ?? 'bg-slate-100'}`}>{p.status}</span>
                            <span className="font-mono">{p.amount}</span>
                            {p.transaction_id && <span className="font-mono text-xs text-muted-foreground">Txn {p.transaction_id}</span>}
                            {p.failure_reason && <span className="text-xs text-red-700">{p.failure_reason}</span>}
                            <span className="ml-auto text-xs text-muted-foreground">{p.created_at && new Date(p.created_at).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
