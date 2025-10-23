"use client";

import { ShopHeader } from '@/components/shop-header';
import { Logo } from '@/components/logo';
import { ShopNav } from '@/components/shop-nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingBar } from '@/components/loading-bar';
import { OrderProvider } from '@/hooks/use-order';

export function ShopAppProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoading, isLoggingIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If user is not authenticated and not loading, redirect to shop login
        if (!isLoading && !user) {
            router.push('/shop/login');
        }
        // If user is authenticated but not a shop user, redirect to appropriate dashboard
        else if (!isLoading && user && user.role !== 'shop') {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    // Show loading state while checking auth
    if (isLoading || isLoggingIn) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingBar isLoading={true} message={isLoading ? "Checking authentication..." : "Logging in..."} />
                <div className="ml-4">Loading...</div>
            </div>
        );
    }

    // If user is not authenticated, redirect to login
    if (!user) {
        router.push('/shop/login');
        return null;
    }

    // If user is not a shop user, redirect to factory dashboard
    if (user.role !== 'shop') {
        router.push('/dashboard');
        return null;
    }

    return (
        <OrderProvider>
            <SidebarProvider>
                <TooltipProvider>
                    <div className="flex flex-col min-h-screen">
                        <div className="fixed top-0 left-0 right-0 z-50">
                            <ShopHeader />
                        </div>
                        <div className="flex flex-1 overflow-hidden pt-14">
                            <div className="hidden md:block w-64 border-r border-gray-200 bg-white flex flex-col fixed top-14 left-0 h-[calc(100vh-3.5rem)]">
                                <div className="p-4">
                                    <Logo />
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <ShopNav />
                                </div>
                            </div>
                            <main className="flex-1 overflow-y-auto p-4 lg:p-6 ml-0 md:ml-64 mt-14">
                                {children}
                            </main>
                        </div>
                        <AiChatWidget />
                    </div>
                </TooltipProvider>
            </SidebarProvider>
        </OrderProvider>
    );
}