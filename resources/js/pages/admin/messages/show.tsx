import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';

type Message = {
    id: number; name: string; email: string; subject: string | null; message: string;
    order_number: string | null; locale: string | null; created_at: string;
};

export default function MessageShow({ message }: { message: Message }) {
    const remove = () => {
        if (confirm('Delete this message permanently?')) {
            router.delete(`/admin/messages/${message.id}`);
        }
    };

    const reply = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? 'Your message'}`)}`;

    return (
        <>
            <Head title={`Message from ${message.name}`} />

            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <Link href="/admin/messages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> All messages
                </Link>

                <div className="rounded-lg border p-5">
                    <h1 className="text-lg font-semibold">{message.subject || 'No subject'}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {message.name} · {message.email} · {new Date(message.created_at).toLocaleString()}
                        {message.locale && ` · ${message.locale.toUpperCase()}`}
                    </p>
                    {message.order_number && (
                        <p className="mt-2 text-sm">
                            Order: <Link href={`/admin/orders/${message.order_number}`} className="font-mono text-[#5b4f9a] underline">{message.order_number}</Link>
                        </p>
                    )}
                    <p className="mt-5 text-sm leading-relaxed whitespace-pre-line">{message.message}</p>
                </div>

                <div className="flex gap-2">
                    <Button asChild><a href={reply}><Mail className="size-4" /> Reply by email</a></Button>
                    <Button type="button" variant="outline" onClick={remove}><Trash2 className="size-4" /> Delete</Button>
                </div>
            </div>
        </>
    );
}

MessageShow.layout = {
    breadcrumbs: [
        { title: 'Admin', href: '/admin' },
        { title: 'Content', href: '/admin/pages' },
        { title: 'Message', href: '/admin/messages' },
    ],
};
