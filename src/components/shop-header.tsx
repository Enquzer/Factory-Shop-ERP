"use client"

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, ShoppingCart } from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { Badge } from './ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { getShopByUsername } from '@/lib/shops-sqlite';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  userType: 'factory' | 'shop';
  shopId?: string;
  title: string;
  description: string;
  href: string;
  isRead: boolean;
  createdAt: Date;
};

export function ShopHeader() {
  const { items, shopId: orderShopId } = useOrder();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shopId, setShopId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const router = useRouter();

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

  useEffect(() => {
    if (!shopId) return;

    // Create a polling function to fetch notifications periodically
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userType=shop&shopId=${shopId}`);
        if (response.ok) {
          const newNotifications = await response.json();
          setNotifications(newNotifications);
          setUnreadCount(newNotifications.filter((n: Notification) => !n.isRead).length);
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

  const handleMarkAsRead = async () => {
    if (!shopId) return;
    
    try {
      // Use the correct endpoint for marking all notifications as read with query parameters
      const response = await fetch(`/api/notifications?userType=shop&shopId=${shopId}&markAll=true`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Refresh notifications after marking as read
        const response = await fetch(`/api/notifications?userType=shop&shopId=${shopId}`);
        if (response.ok) {
          const updatedNotifications = await response.json();
          setNotifications(updatedNotifications);
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }

  const handleNotificationClick = async (notificationId: string, href: string) => {
    if (!shopId) return;
    
    try {
      // Mark the specific notification as read
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Update the notifications state to reflect the read status
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        
        // Update unread count
        setUnreadCount(prev => prev - 1);
        
        // Navigate to the notification's href
        router.push(href);
      } else {
        // Still navigate even if marking as read fails
        router.push(href);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Still navigate even if marking as read fails
      router.push(href);
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <SidebarTrigger />
      <div className="w-full flex-1">
        {/* Future breadcrumbs can go here */}
      </div>

      {items.length > 0 && (
         <Button variant="ghost" size="icon" asChild>
            <Link href="/shop/orders/create">
              <ShoppingCart className="h-5 w-5" />
              <Badge className="absolute top-1 right-1 h-5 w-5 justify-center p-0">{items.length}</Badge>
              <span className="sr-only">View Order</span>
            </Link>
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
           <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute top-1 right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
           <div className="flex items-center justify-between p-2 border-b">
              <h3 className="font-semibold text-sm px-2">Notifications</h3>
               {unreadCount > 0 && (
                <Button variant="link" size="sm" className="text-xs" onClick={handleMarkAsRead}>Mark all as read</Button>
              )}
           </div>
           <div className="flex flex-col gap-1 max-h-80 overflow-y-auto p-1">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification.href)}
                    className={`block rounded-lg p-2 text-left hover:bg-muted w-full ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                     <div className="flex justify-between items-start">
                      <p className={`font-semibold text-sm ${!notification.isRead ? 'text-primary' : ''}`}>{notification.title}</p>
                       {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5"></div>
                       )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                     <p className="text-xs text-muted-foreground/80 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))
              ) : (
                 <p className="p-4 text-center text-sm text-muted-foreground">No new notifications</p>
              )}
           </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://picsum.photos/seed/shop-user/100/100" data-ai-hint="person portrait"/>
              <AvatarFallback>SU</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Shop User</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/shop/profile">My Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            logout();
            router.push('/'); // Redirect to homepage instead of login page
          }}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}