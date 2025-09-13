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
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { Badge } from './ui/badge';

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
          <DropdownMenuItem>My Profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/shop/login">Logout</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
