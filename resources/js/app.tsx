import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            // Storefront pages: they wrap themselves in StoreLayout.
            case name === 'welcome':
            case name.startsWith('blog/'):
            case name.startsWith('shop/'):
            case name.startsWith('pages/'):
            case name.startsWith('newsletter/'):
            case name.startsWith('account/'):
            case name === 'auth/login':
            case name === 'auth/register':
            case name === 'auth/two-factor-challenge':
                return null;

            // The other auth pages (forgot/reset password, verify email, two-factor).
            case name.startsWith('auth/'):
                return AuthLayout;

            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];

            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#7c6fd0',
        delay: 150,
        showSpinner: false,
    },
});

// This will set light / dark mode on load...
initializeTheme();
