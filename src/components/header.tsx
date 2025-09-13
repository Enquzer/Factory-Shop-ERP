"use client"
import Link from 'next/link';
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

// Mock notifications for the factory user
const notifications = [
  { id: 1, title: "New Order #ORD-004", description: "From Adama Modern", href: "/orders" },
  { id: 2, title: "Low Stock Warning", description: "Unisex Denim Jacket is running low", href: "/dashboard" },
  { id: 3, title: "Shop Registered", description: "Adama Modern has been approved", href: "/shops" },
  { id: 4, title: "Payment Received", description: "Payment for order #ORD-002 confirmed", href: "/orders" },
];


export function Header() {
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
              {notifications.length > 0 && (
                <Badge className="absolute top-1 right-1 h-5 w-5 justify-center p-0">{notifications.length}</Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
           <div className="flex items-center justify-between p-2">
              <h3 className="font-semibold">Notifications</h3>
              <Button variant="link" size="sm" className="text-xs">Mark all as read</Button>
           </div>
           <div className="flex flex-col gap-1">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    className="block rounded-lg p-2 hover:bg-muted"
                  >
                    <p className="font-semibold text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
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
