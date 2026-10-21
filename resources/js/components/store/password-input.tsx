import { useT } from '@/lib/i18n';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

type Props = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: 'current-password' | 'new-password';
    invalid?: boolean;
    describedBy?: string;
    minLength?: number;
};

/** A password input with a show/hide button. */
export default function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy, minLength }: Props) {
    const t = useT();
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                minLength={minLength}
                required
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                className={`h-12 w-full rounded-xl border bg-white pr-12 pl-4 outline-none focus:ring-2 focus:ring-[#5b4f9a]/20 ${
                    invalid ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#5b4f9a]'
                }`}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t('Hide password') : t('Show password')}
                aria-pressed={visible}
                className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
        </div>
    );
}
