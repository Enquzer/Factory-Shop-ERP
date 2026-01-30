"use client";

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export function PublicWebsiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center space-x-2">
          <Logo />
          <span className="font-bold">Carement Fashion</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="sm" className="flex items-center gap-2" asChild>
            <Link href="/ecommerce">
              <span>Shop Now</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2" asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}