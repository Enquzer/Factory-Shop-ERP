"use client";

import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "@/components/logo";
import { ShoppingCart, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EcommerceHeaderProps {
  className?: string;
}

export function EcommerceHeader({ className }: EcommerceHeaderProps) {
  const { user, logout } = useCustomerAuth();
  const { itemCount } = useCart();

  return (
    <header className={`bg-gradient-to-r from-green-900 to-green-800 shadow-lg sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Logo className="h-12" />
            <nav className="hidden md:flex space-x-6 text-sm">
              <Link href="/public-website" className="text-white hover:text-green-200 transition-colors">
                Landing Page
              </Link>
              <Link href="/ecommerce" className="text-white hover:text-green-200 transition-colors font-medium">
                Home
              </Link>
              <Link href="/ecommerce/products" className="text-white hover:text-green-200 transition-colors">
                Products
              </Link>
              {user && (
                <Link href="/ecommerce/orders" className="text-white hover:text-green-200 transition-colors">
                  My Orders
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/ecommerce/cart" className="relative p-2">
              <ShoppingCart className="h-6 w-6 text-orange-500 hover:text-orange-600 transition-colors" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                  {itemCount}
                </span>
              )}
            </Link>
            
            <div className="flex items-center space-x-3 text-sm">
              {user ? (
                <>
                  <span className="text-white font-medium hidden sm:inline">
                    Hello, {user.firstName || user.username}
                  </span>
                  <Link href="/ecommerce/profile">
                    <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                      <UserIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={logout}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-none transition-all active:scale-95 shadow-sm shadow-orange-900/20"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              ) : (
                <Link href="/ecommerce/login">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white border-none">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
