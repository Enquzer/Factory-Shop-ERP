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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop' || !user.username) {
      setIsInitialLoad(false);
      return;
    }

    // Validate username format
    if (typeof user.username !== 'string' || user.username.trim().length === 0) {
      console.error('Invalid username:', user.username);
      setIsInitialLoad(false);
      return;
    }

    // Add a small delay to ensure auth context is fully initialized
    const timer = setTimeout(() => {
      const fetchShopId = async () => {
        try {
          // Encode the username to handle special characters
          const encodedUsername = encodeURIComponent(user.username);
          
          // Use the API endpoint instead of calling the database function directly
          const response = await fetch(`/api/shops/${encodedUsername}`);
          
          if (response.ok) {
            const shop = await response.json();
            if (shop && shop.id) {
              setShopId(shop.id);
            }
          } else {
            const errorText = await response.text();
            console.error(`Failed to fetch shop '${user.username}' (status ${response.status}):`, errorText);
            
            // Retry once after a short delay if it's a server error
            if (response.status >= 500) {
              console.log('Retrying shop fetch in 1 second...');
              setTimeout(async () => {
                try {
                  const retryResponse = await fetch(`/api/shops/${encodedUsername}`);
                  if (retryResponse.ok) {
                    const retryShop = await retryResponse.json();
                    if (retryShop && retryShop.id) {
                      setShopId(retryShop.id);
                      console.log('Shop fetch retry successful');
                    }
                  } else {
                    console.error('Retry also failed with status:', retryResponse.status);
                  }
                } catch (retryError) {
                  console.error("Retry failed:", retryError);
                }
              }, 1000);
            }
          }
        } catch (error) {
          console.error(`Error fetching shop '${user.username}':`, error);
        } finally {
          setIsInitialLoad(false);
        }
      };

      fetchShopId();
    }, 150); // Increased to 150ms delay

    return () => clearTimeout(timer);
  }, [user?.username, user?.role]); // Add user.role dependency

  // Fetch notifications for the shop user
  useEffect(() => {
    // Don't fetch during initial load or if we don't have a valid shopId
    if (isInitialLoad || !shopId || shopId === 'null' || shopId === 'undefined') return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const fetchNotifications = async () => {
      // Double-check all conditions
      if (!isMounted || isInitialLoad || !shopId || shopId === 'null' || shopId === 'undefined') return;
      
      try {
        const response = await fetch(`/api/notifications?userType=shop&shopId=${shopId}`);
        if (!isMounted) return;
        
        if (response.ok) {
          const notifications = await response.json();
          if (isMounted && Array.isArray(notifications)) {
            const unread = notifications.filter((n: any) => !n.isRead).length;
            setUnreadCount(unread);
          }
        } else {
          console.warn(`Notification API returned status ${response.status}`);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    // Fetch notifications immediately
    const timeoutId = setTimeout(fetchNotifications, 100); // Small delay to ensure component is mounted

    // Set up polling interval (every 30 seconds)
    intervalId = setInterval(fetchNotifications, 30000);

    // Cleanup subscription on component unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [shopId, isInitialLoad]);

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
              {link.href === '/shop/orders' && unreadCount > 0 && !isInitialLoad && (
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
            {unreadCount > 0 && !isInitialLoad && (
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