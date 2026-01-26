"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, User, LineChart, Archive, Bell, CreditCard, BarChart3, Tag } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useOrder } from '@/hooks/use-order';
import { Badge } from './ui/badge';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getShopByUsername } from '@/lib/shops-sqlite';

const links = [
  { href: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shop/products', label: 'Products', icon: Package },
  { href: '/shop/orders', label: 'My Orders', icon: ShoppingCart },
  { href: '/shop/inventory', label: 'Inventory', icon: Archive },
  { href: '/shop/analytics', label: 'Analytics', icon: LineChart },
  { href: '/shop/profile', label: 'My Profile', icon: User },
];

const posLinks = [
  { href: '/shop/pos', label: 'POS Terminal', icon: CreditCard },
  { href: '/shop/pos/dashboard', label: 'POS Dashboard', icon: BarChart3 },
  { href: '/shop/pos/products', label: 'POS Products', icon: Tag },
];

export function ShopNav() {
  const pathname = usePathname();
  const { items } = useOrder();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [shopId, setShopId] = useState<string | null>(null);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop') return;

    const fetchShopId = async () => {
      try {
        // Use the API endpoint instead of calling the database function directly
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop) {
            setShopId(shop.id);
          }
        }
      } catch (error) {
        console.error("Error fetching shop:", error);
      }
    };

    fetchShopId();
  }, [user?.username]); // Use user.username instead of the entire user object

  // Fetch notifications for the shop user
  useEffect(() => {
    if (!shopId) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userType=shop&shopId=${shopId}`);
        if (response.ok) {
          const notifications = await response.json();
          const unread = notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Fetch notifications immediately
    fetchNotifications();

    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(fetchNotifications, 30000);

    // Cleanup subscription on component unmount
    return () => clearInterval(intervalId);
  }, [shopId]);

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
              <span>
                {link.label}
              </span>
              {link.href === '/shop/orders' && unreadCount > 0 && (
                <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      
      {/* POS Section */}
      <SidebarMenuItem className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Point of Sale
      </SidebarMenuItem>
      {posLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(link.href)}
            tooltip={link.label}
            className="justify-start"
          >
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              <span>
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
              <span>
                Create Order
              </span>
              {items.length > 0 && <Badge className="ml-auto">{items.length}</Badge>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      {/* Add a separate notification item */}
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/shop/notifications'}
          tooltip="Notifications"
          className="justify-start"
        >
          <Link href="/shop/orders">
            <Bell className="h-4 w-4" />
            <span>
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}