import OrderPayments from '@/components/admin/order-payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/pages/admin/orders/index';
import type { MoneyValue } from '@/types/catalog-public';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { FormEvent } from 'react';

type Item = {
    id: number;
    name: string;
    variant_label: string | null;
    sku: string;
    image_url: string | null;
    quantity: number;
    unit_price: MoneyValue;
    line_total: MoneyValue;
};

type Address = {
    first_name: string; last_name: string; line1: string; line2: string | null;
    postcode: string; city: string; country: string; phone?: string | null;
};

type Order = {
    number: string;
    email: string;
    status: string;
    region: string;
    shipping_method: string;
    payment_method: string;
    tracking_number: string | null;
    tracking_url: string | null;
    shipping_address: Address;
    billing_address: Address | null;
    notes: string | null;
    admin_notes: string | null;
    tax_rate: number;
    placed_at: string | null;
    shipped_at: string | null;
    totals: { subtotal: MoneyValue; shipping: MoneyValue; tax: MoneyValue; total: MoneyValue };
    customer: { name: string; email: string } | null;
    items: Item[];
};

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

type Props = {
    order: Order;
    statuses: string[];
    payments: PaymentRow[];
    paidAt: string | null;
};

const PAYMENT_NAMES: Record<string, string> = {
    stripe: 'Card (Stripe)',
    paypal: 'PayPal',
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    cod: 'Cash on delivery',
};

function AddressBlock({ title, address }: { title: string; address: Address }) {
    return (
        <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{title}</h3>
            <address className="mt-2 text-sm not-italic leading-relaxed">
                {address.first_name} {address.last_name}<br />
                {address.line1}<br />
                {address.line2 && <>{address.line2}<br /></>}
                {address.postcode} {address.city}<br />
                {address.country}
                {address.phone && <><br />{address.phone}</>}
            </address>
        </div>
    );
}

export default function OrderShow({ order, statuses, payments = [], paidAt = null }: Props) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        status: order.status,
        tracking_number: order.tracking_number ?? '',
        tracking_url: order.tracking_url ?? '',
        admin_notes: order.admin_notes ?? '',
        notify: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/admin/orders/${order.number}`, { preserveScroll: true });
    };

    const willNotify = data.status === 'shipped' && order.status !== 'shipped';
    const willRestock = ['cancelled', 'refunded'].includes(data.status)
        && !['cancelled', 'refunded'].includes(order.status);

    const isCod = order.payment_method === 'cod';
    const paidOnline = Boolean(paidAt) && !isCod;
    const paidPayment = payments.find((p) => p.status === 'paid');

    return (
        <>
            <Head title={`Order ${order.number}`} />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
                <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> All orders
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="font-mono text-xl font-semibold">{order.number}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {order.placed_at && new Date(order.placed_at).toLocaleString()} · {order.region}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${
                            paidAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                            {paidAt ? 'Paid' : isCod ? 'Cash due on delivery' : 'Awaiting payment'}
                        </span>
                        <StatusBadge status={order.status} />
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-6">
                        {/* Items */}
                        <section className="rounded-lg border">
                            <ul className="divide-y">
                                {order.items.map((item) => (
                                    <li key={item.id} className="flex items-center gap-4 p-4">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt="" className="size-16 rounded-lg object-cover" />
                                        ) : (
                                            <div className="size-16 rounded-lg bg-gradient-to-br from-[#5b4f9a] to-[#1f2230]" aria-hidden />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {item.variant_label && `${item.variant_label} · `}{item.sku}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right font-mono text-sm">
                                            <p>{item.line_total.formatted}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.quantity} × {item.unit_price.formatted}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <dl className="space-y-2 border-t p-4 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Subtotal</dt>
                                    <dd className="font-mono">{order.totals.subtotal.formatted}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Shipping ({order.shipping_method})</dt>
                                    <dd className="font-mono">{order.totals.shipping.formatted}</dd>
                                </div>
                                {order.tax_rate > 0 && (
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Tax ({order.tax_rate}%)</dt>
                                        <dd className="font-mono">{order.totals.tax.formatted}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-2 text-base">
                                    <dt className="font-medium">Total</dt>
                                    <dd className="font-mono">{order.totals.total.formatted}</dd>
                                </div>
                            </dl>
                        </section>

                        {/* Payment attempts, transaction ids, and "mark cash as collected" */}
                        <OrderPayments
                            number={order.number}
                            paymentMethod={order.payment_method}
                            paidAt={paidAt}
                            payments={payments}
                        />

                        {order.notes && (
                            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <h2 className="text-sm font-medium text-amber-900">Note from the customer</h2>
                                <p className="mt-2 text-sm whitespace-pre-line text-amber-900">{order.notes}</p>
                            </section>
                        )}

                        <section className="grid gap-6 rounded-lg border p-4 sm:grid-cols-2">
                            <AddressBlock title="Shipping" address={order.shipping_address} />
                            <AddressBlock title="Billing" address={order.billing_address ?? order.shipping_address} />
                        </section>
                    </div>

                    {/* Fulfilment */}
                    <aside>
                        <form onSubmit={submit} className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-6">
                            <h2 className="font-semibold">Fulfilment</h2>

                            <div className="space-y-1">
                                <Label htmlFor="status">Status</Label>
                                <select id="status" value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="h-9 w-full rounded-md border px-3 text-sm capitalize">
                                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <p className="text-sm text-red-600">{errors.status}</p>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="tracking_number">Tracking number</Label>
                                <Input id="tracking_number" value={data.tracking_number} className="font-mono"
                                    onChange={(e) => setData('tracking_number', e.target.value)} />
                                <p className="text-sm text-red-600">{errors.tracking_number}</p>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="tracking_url">Tracking link</Label>
                                <Input id="tracking_url" value={data.tracking_url} placeholder="https://…"
                                    onChange={(e) => setData('tracking_url', e.target.value)} />
                                <p className="text-sm text-red-600">{errors.tracking_url}</p>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="admin_notes">Internal notes</Label>
                                <textarea id="admin_notes" rows={4} value={data.admin_notes}
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                    onChange={(e) => setData('admin_notes', e.target.value)} />
                                <p className="text-xs text-muted-foreground">Never shown to the customer.</p>
                            </div>

                            {willNotify && (
                                <label className="flex items-start gap-2 text-sm">
                                    <input type="checkbox" checked={data.notify} className="mt-1"
                                        onChange={(e) => setData('notify', e.target.checked)} />
                                    Email the customer that it shipped
                                </label>
                            )}

                            {willRestock && (
                                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    Saving will return {order.items.reduce((n, i) => n + i.quantity, 0)} unit(s) to stock.
                                </p>
                            )}

                            {willRestock && paidOnline && (
                                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                                    This order was paid online
                                    {paidPayment ? ` with ${PAYMENT_NAMES[paidPayment.gateway] ?? paidPayment.gateway}` : ''}.
                                    Changing the status doesn't return the money: refund it in the provider's dashboard
                                    {paidPayment?.transaction_id ? ` (transaction ${paidPayment.transaction_id})` : ''}.
                                </p>
                            )}

                            {data.status === 'shipped' && !paidAt && !isCod && (
                                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    This order hasn't been paid yet. Check the payment section before shipping.
                                </p>
                            )}

                            <div className="flex items-center gap-3 border-t pt-3">
                                <Button type="submit" disabled={processing}>Save</Button>
                                {recentlySuccessful && <span className="text-sm text-muted-foreground">Saved.</span>}
                            </div>

                            <div className="border-t pt-3 text-sm">
                                <p className="text-muted-foreground">Customer</p>
                                <p className="mt-1">{order.customer?.name ?? 'Guest'}</p>
                                <a href={`mailto:${order.email}`} className="break-all text-[#5b4f9a] hover:underline">
                                    {order.email}
                                </a>
                                <p className="mt-3 text-muted-foreground">Payment</p>
                                <p>{PAYMENT_NAMES[order.payment_method] ?? order.payment_method}</p>
                                <p className={`text-xs ${paidAt ? 'text-green-700' : 'text-amber-700'}`}>
                                    {paidAt
                                        ? `Paid ${new Date(paidAt).toLocaleString()}`
                                        : isCod ? 'Collect cash on delivery' : 'Not paid yet'}
                                </p>
                            </div>
                        </form>
                    </aside>
                </div>
            </div>
        </>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Sales', href: '/admin/orders' },
        { title: 'Order', href: '/admin/orders' },
    ],
};
