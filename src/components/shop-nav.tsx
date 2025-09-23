
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, User, LineChart } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useOrder } from '@/hooks/use-order';
import { Badge } from './ui/badge';

const links = [
  { href: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shop/products', label: 'Products', icon: Package },
  { href: '/shop/orders', label: 'My Orders', icon: ShoppingCart },
  { href: '/shop/analytics', label: 'Analytics', icon: LineChart },
  { href: '/shop/profile', label: 'My Profile', icon: User },
];

export function ShopNav() {
  const pathname = usePathname();
  const { items } = useOrder();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(link.href) && !(link.href === '/shop/orders' && pathname.includes('create'))}
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
      <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === '/shop/orders/create'}
            tooltip="Create Order"
            className="justify-start"
          >
            <Link href="/shop/orders/create">
              <ShoppingCart className="h-4 w-4" />
              <span className={cn("group-data-[collapsible=icon]:hidden")}>
                Create Order
              </span>
              {items.length > 0 && <Badge className="ml-auto">{items.length}</Badge>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
    </SidebarMenu>
  );
}
