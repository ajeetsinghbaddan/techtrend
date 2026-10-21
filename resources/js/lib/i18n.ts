import { usePage } from '@inertiajs/react';
import { createElement, Fragment, type ReactNode } from 'react';

type Replacements = Record<string, string | number>;

export function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
    return text.split(/(:[a-z_]+)/gi).map((piece, i) => {
        const name = piece.startsWith(':') ? piece.slice(1) : null;
        return createElement(Fragment, { key: i }, name && name in parts ? parts[name] : piece);
    });
}

export function useT() {
    const { translations } = usePage<{ translations?: Record<string, string> }>().props;

    return (key: string, replace: Replacements = {}) => {
        let text = translations?.[key] ?? key;

        for (const [name, value] of Object.entries(replace)) {
            text = text.replaceAll(`:${name}`, String(value));
        }

        return text;
    };
}

export function useLocale(): string {
    return usePage<{ locale?: string }>().props.locale ?? 'en';
}
