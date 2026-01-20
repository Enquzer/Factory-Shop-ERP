"use client";

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { ShopHeader } from '@/components/shop-header';
import { Logo } from '@/components/logo';
import { ShopNav } from '@/components/shop-nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingBar } from '@/components/loading-bar';
import { OrderProvider } from '@/hooks/use-order';
import { BulkSelectionProvider } from '@/contexts/bulk-selection-context';

export function ShopAppProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoading, isLoggingIn } = useAuth();
    const router = useRouter();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        // If user is not authenticated and not loading, redirect to shop login
        if (!isLoading && !user) {
            setRedirecting(true);
            router.push('/shop/login');
        }
        // If user is authenticated but not a shop user, redirect to appropriate dashboard
        else if (!isLoading && user && user.role !== 'shop') {
            setRedirecting(true);
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    // Show loading state while checking auth
    if (isLoading || isLoggingIn || redirecting) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingBar isLoading={true} message={isLoading ? "Checking authentication..." : "Redirecting..."} />
                <div className="ml-4">Loading...</div>
            </div>
        );
    }

    // If user is not authenticated, redirect to login
    if (!user) {
        return null;
    }

    // If user is not a shop user, redirect to factory dashboard
    if (user.role !== 'shop') {
        return null;
    }

    return (
        <OrderProvider>
            <BulkSelectionProvider>
                <SidebarProvider>
                    <TooltipProvider>
                        <Sidebar>
                            <SidebarHeader className="border-b border-sidebar-border p-3">
                                <Logo />
                            </SidebarHeader>
                            <SidebarContent className="p-2">
                                <ShopNav />
                            </SidebarContent>
                        </Sidebar>
                        <SidebarInset>
                            <div className="flex flex-col h-full">
                                <ShopHeader />
                                <main className="p-4 lg:p-6 flex-1 overflow-auto">
                                    {children}
                                </main>
                            </div>
                        </SidebarInset>
                        <AiChatWidget />
                    </TooltipProvider>
                </SidebarProvider>
            </BulkSelectionProvider>
        </OrderProvider>
    );
}