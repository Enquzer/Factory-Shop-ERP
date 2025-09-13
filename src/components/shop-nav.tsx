"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const links = [
  { href: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shop/products', label: 'Products', icon: Package },
  { href: '/shop/orders', label: 'My Orders', icon: ShoppingCart },
];

export function ShopNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
            tooltip={link.label}
            className="justify-start"
          >
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              <span className={cn(
                "group-data-[collapsible=icon]:hidden",
              )}>
                {link.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
