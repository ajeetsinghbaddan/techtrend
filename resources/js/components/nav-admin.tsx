import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, FileText, House, Mail, Newspaper, Package, Settings2, ShoppingCart, type LucideIcon } from 'lucide-react';

type AdminLink = { title: string; href: string };
type AdminSection = { title: string; icon: LucideIcon; items: AdminLink[] };

const sections: AdminSection[] = [
    {
        title: 'Homepage',
        icon: House,
        items: [
            { title: 'Homepage hero', href: '/admin/hero' },
            { title: 'Feature strip', href: '/admin/features' },
            { title: 'Carousels', href: '/admin/product-rows' },
            { title: 'Promo cards', href: '/admin/cards/promos' },
            { title: 'Marquee bar', href: '/admin/marquee' },
            { title: 'Explore cards', href: '/admin/cards/explore' },
            { title: 'CTA panel', href: '/admin/cta' },
        ],
    },
    {
        title: 'Content',
        icon: FileText,
        items: [
            { title: 'Pages', href: '/admin/pages' },
            { title: 'Messages', href: '/admin/messages' },
        ],
    },
    {
        title: 'Catalog',
        icon: Package,
        items: [
            { title: 'Collections', href: '/admin/collections' },
            { title: 'Products', href: '/admin/products' },
            { title: 'Reviews', href: '/admin/reviews' },
        ],
    },
    {
        title: 'Sales',
        icon: ShoppingCart,
        items: [
            { title: 'Orders', href: '/admin/orders' },
            { title: 'Customers', href: '/admin/customers' },
        ],
    },
    {
        title: 'Blog',
        icon: Newspaper,
        items: [
            { title: 'Posts', href: '/admin/posts' },
            { title: 'Categories', href: '/admin/categories' },
            { title: 'Blog section', href: '/admin/blog-section' },
        ],
    },
    {
        title: 'Marketing',
        icon: Mail,
        items: [
            { title: 'Newsletter', href: '/admin/newsletter' },
            { title: 'Wishlists', href: '/admin/wishlists' },
            { title: 'Abandoned bags', href: '/admin/abandoned-carts' },
            { title: 'Search insights', href: '/admin/search-insights' },
        ],
    },
    {
        title: 'General',
        icon: Settings2,
        items: [
            { title: 'Header', href: '/admin/header' },
            { title: 'Cookie banner', href: '/admin/cookie-banner' },
            { title: 'Payments', href: '/admin/payments' },
            { title: 'SEO', href: '/admin/seo' },
            { title: 'Footer', href: '/admin/footer' },
        ],
    },
];

function useIsActive() {
    const { url } = usePage();
    return (href: string) =>
        url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);
}

export function NavAdmin() {
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
                {sections.map((section) => (
                    <AdminSectionMenu key={section.title} section={section} />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function AdminSectionMenu({ section }: { section: AdminSection }) {
    const isActive = useIsActive();
    const open = section.items.some((item) => isActive(item.href));
    const Icon = section.icon;

    return (
        <Collapsible asChild defaultOpen={open} className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={section.title}>
                        <Icon />
                        <span>{section.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {section.items.map((item) => (
                            <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={isActive(item.href)}>
                                    <Link href={item.href} prefetch>
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
