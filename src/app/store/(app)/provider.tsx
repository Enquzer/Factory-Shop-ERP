'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import { Nav } from '@/components/nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { LoadingBar } from '@/components/loading-bar';
import { ResponsiveProvider } from '@/contexts/responsive-context';
import { BulkSelectionProvider } from '@/contexts/bulk-selection-context';

interface StoreContextType {}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const { user, isLoading, isLoggingIn } = useAuth();

  useEffect(() => {
    // Handle authentication redirects
    if (!isLoading && !isLoggingIn && !redirecting) {
      if (!user) {
        // Check if we're on a shop route or store route
        const isShopRoute = window.location.pathname.startsWith('/shop');
        const isStoreRoute = window.location.pathname.startsWith('/store');
        const isFinanceRoute = window.location.pathname.startsWith('/finance');
        setRedirecting(true);
        // Redirect all unauthenticated users to main login page
        router.push('/');
      } else {
        // If user is authenticated but on the wrong route, redirect them
        const isShopRoute = window.location.pathname.startsWith('/shop');
        const isStoreRoute = window.location.pathname.startsWith('/store');
        const isFinanceRoute = window.location.pathname.startsWith('/finance');
        
        if (user.role === 'shop' && !isShopRoute) {
          setRedirecting(true);
          router.push('/shop/dashboard');
        } else if (user.role === 'store' && !isStoreRoute) {
          setRedirecting(true);
          router.push('/store/dashboard');
        } else if (user.role === 'finance' && !isFinanceRoute) {
          setRedirecting(true);
          router.push('/finance/dashboard');
        } else if (user.role === 'factory' && (isShopRoute || isStoreRoute || isFinanceRoute)) {
          // Factory users can access store and finance routes, so don't redirect
          if (!isStoreRoute && !isFinanceRoute) {
            setRedirecting(true);
            router.push('/dashboard');
          }
        }
      }
      setCheckedAuth(true);
    }
  }, [user, isLoading, isLoggingIn, router, redirecting]);

  // Show loading state while checking auth
  if (isLoading || isLoggingIn || !checkedAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingBar isLoading={true} message={isLoading ? "Checking authentication..." : "Logging in..."} />
        <div className="ml-4">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, don't render the app
  if (!user && checkedAuth) {
    return null;
  }

  // Allow store and factory users to access store pages
  if (user && user.role !== 'store' && user.role !== 'factory') {
    return null;
  }

  return (
    <TooltipProvider>
      <ResponsiveProvider>
        <BulkSelectionProvider>
          <SidebarProvider>
            <Sidebar collapsible="icon">
              <SidebarHeader className="border-b border-sidebar-border p-2">
                <Logo />
              </SidebarHeader>
              <SidebarContent className="p-2">
                <Nav />
              </SidebarContent>
            </Sidebar>
            <SidebarInset>
              <div className="flex flex-col h-full">
                <Header />
                <main className="p-4 lg:p-6 flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </SidebarInset>
            <AiChatWidget />
          </SidebarProvider>
        </BulkSelectionProvider>
      </ResponsiveProvider>
    </TooltipProvider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}