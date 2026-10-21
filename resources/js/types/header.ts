export interface HeaderLink {
    label: string;
    href: string;
}

export interface NavItem extends HeaderLink {
    children: HeaderLink[];
}

export interface HeaderSettings {
    brand_name: string;
    search_placeholder: string;
    logo_url: string | null;
    announcements: string[];
    nav: NavItem[];
}

export interface Region {
    label: string;
    currency: string;
    tax: string;
}

export interface FooterColumn {
    title: string;
    links: HeaderLink[];
}

export interface FooterSettings {
    description: string | null;
    columns: FooterColumn[];
    copyright: string | null;
    badges: string[];
}
