"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, Package, ShoppingCart, User, ClipboardList, FileText, Bell, Factory } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';

const factoryLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: ClipboardList },
  { href: '/shops', label: 'Shops', icon: Building2 },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Only show navigation for factory users
  if (user?.role !== 'factory') {
    return null;
  }

  // Fetch notifications for the factory user
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?userType=factory');
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
  }, []);

  return (
    <SidebarMenu>
      {factoryLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
            tooltip={link.label}
            className="justify-start"
          >
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              <span>
                {link.label}
              </span>
              {link.href === '/orders' && unreadCount > 0 && (
                <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      {/* Add a separate notification item */}
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/notifications'}
          tooltip="Notifications"
          className="justify-start"
        >
          <Link href="/orders">
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