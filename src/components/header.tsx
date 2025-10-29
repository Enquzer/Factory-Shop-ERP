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
import { Bell, BookOpen } from 'lucide-react';
import { Badge } from './ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useResponsive } from '@/contexts/responsive-context';
import { HelpCenter } from '@/components/help-center';

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

export function Header() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    // Create a polling function to fetch notifications periodically
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?userType=factory');
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
  }, []);

  const handleMarkAsRead = async () => {
    try {
      // Use the correct endpoint for marking all notifications as read with query parameters
      const response = await fetch('/api/notifications?userType=factory&markAll=true', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Refresh notifications after marking as read
        const response = await fetch('/api/notifications?userType=factory');
        if (response.ok) {
          const updatedNotifications = await response.json();
          setNotifications(updatedNotifications);
          setUnreadCount(0);
        }
      } else {
        console.error("Failed to mark notifications as read:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }

  const handleNotificationClick = async (notificationId: string, href: string) => {
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
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Still navigate even if marking as read fails
      router.push(href);
    }
  }

  const handleLogout = () => {
    logout();
    // The logout function now handles the redirect
  }

  return (
    <header className={`sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-2 ${isMobile ? 'sm:px-4' : 'px-4'} sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4`}>
      <SidebarTrigger />
      <div className="w-full flex-1">
        {/* Future breadcrumbs can go here */}
      </div>

      <HelpCenter />

      <Popover>
        <PopoverTrigger asChild>
           <Button variant="ghost" size={isMobile ? "icon" : "default"} className={`relative rounded-full ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}>
              <Bell className={` ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              {unreadCount > 0 && (
                <Badge className={`absolute top-0 right-0 h-4 w-4 justify-center p-0 text-[8px] ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`}>{unreadCount}</Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className={`w-72 p-0 ${isMobile ? 'w-64' : 'w-80'}`}>
           <div className="flex items-center justify-between p-2 border-b">
              <h3 className="font-semibold text-sm px-2">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="link" size="sm" className="text-xs" onClick={handleMarkAsRead}>Mark all as read</Button>
              )}
           </div>
           <div className="flex flex-col gap-1 max-h-80 overflow-y-auto p-1">
              {notifications.length > 0 ? (
                notifications.map((notification: Notification) => (
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
          <Button variant="ghost" size={isMobile ? "icon" : "default"} className={`rounded-full ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}>
            <Avatar className={` ${isMobile ? 'h-7 w-7' : 'h-9 w-9'}`}>
              <AvatarImage src={user?.profilePictureUrl || undefined} />
              <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'FU'}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.username || 'Factory User'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}