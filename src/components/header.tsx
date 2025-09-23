
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
import { Bell } from 'lucide-react';
import { Badge } from './ui/badge';
import { type Notification, getNotifications, markNotificationsAsRead } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';

export function Header() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = getNotifications('factory', null, (newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.isRead).length);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async () => {
    await markNotificationsAsRead('factory', null);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        {/* Future breadcrumbs can go here */}
      </div>

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
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className={`block rounded-lg p-2 hover:bg-muted ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`font-semibold text-sm ${!notification.isRead ? 'text-primary' : ''}`}>{notification.title}</p>
                       {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5"></div>
                       )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </p>
                  </Link>
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
              <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" data-ai-hint="person portrait"/>
              <AvatarFallback>FU</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Factory User</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/login">Logout</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
