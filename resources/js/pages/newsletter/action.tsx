import StoreLayout from '@/layouts/store-layout';
import { Head, useForm } from '@inertiajs/react';

type Props = { mode: 'confirm' | 'unsubscribe'; done: boolean; actionUrl: string };

const copy = {
    confirm: {
        title: 'Confirm your subscription',
        text: 'One click and you will get an email when each new run opens.',
        button: 'Yes, subscribe me',
        done: "You're subscribed. We'll email you when the next run opens.",
    },
    unsubscribe: {
        title: 'Unsubscribe',
        text: 'You will stop receiving drop alerts. You can sign up again at any time.',
        button: 'Unsubscribe',
        done: "You've been unsubscribed. Sorry to see you go.",
    },
};

export default function NewsletterAction({ mode, done, actionUrl }: Props) {
    const { post, processing } = useForm({});
    const text = copy[mode];

    return (
        <StoreLayout>
            <Head title={text.title} />

            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>

                {done ? (
                    <p role="status" className="mt-6 rounded-2xl bg-[#f0eefa] px-5 py-4 text-[#3f3775]">{text.done}</p>
                ) : (
                    <>
                        <p className="mt-4 text-slate-600">{text.text}</p>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => post(actionUrl, { preserveScroll: true })}
                            className="mt-8 h-12 rounded-full bg-[#1f2230] px-8 font-medium text-white hover:bg-black disabled:opacity-60"
                        >
                            {text.button}
                        </button>
                    </>
                )}
            </div>
        </StoreLayout>
    );
}
