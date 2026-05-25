'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, FolderOpen, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard',             label: 'Overview',       icon: LayoutDashboard, exact: true },
  { href: '/dashboard/clients',     label: 'Clients',        icon: Building2,       exact: false },
  { href: '/dashboard/engagements', label: 'Engagements',    icon: FolderOpen,      exact: false },
  { href: '/dashboard/settings',    label: 'Settings',        icon: Settings,       exact: false },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(item => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? ' active' : ''}`}
          >
            <item.icon size={15} className="flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
