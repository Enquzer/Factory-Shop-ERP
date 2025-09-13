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
import { Bell, ShoppingCart } from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { Badge } from './ui/badge';


// Mock notifications for the shop user
const shopNotifications = [
  { id: 1, title: "Order #ORD-005 Dispatched", description: "Your order is on its way.", href: "/shop/orders" },
  { id: 2, title: "Order #ORD-006 Confirmed", description: "The factory has confirmed your order.", href: "/shop/orders" },
  { id: 3, title: "New Product Available", description: "Check out the new Unisex Denim Jacket.", href: "/shop/products" },
];

export function ShopHeader() {
  const { items } = useOrder();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
      <SidebarTrigger className="md:hidden" />
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
              {shopNotifications.length > 0 && (
                <Badge className="absolute top-1 right-1 h-5 w-5 justify-center p-0">{shopNotifications.length}</Badge>
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
              {shopNotifications.length > 0 ? (
                shopNotifications.map(notification => (
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
          <DropdownMenuItem asChild>
            <Link href="/shop/login">Logout</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
