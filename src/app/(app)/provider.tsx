"use client"

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import { Nav } from '@/components/nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingBar } from '@/components/loading-bar';
import { ResponsiveProvider } from '@/contexts/responsive-context';

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoading, isLoggingIn } = useAuth();
    const router = useRouter();
    const [checkedAuth, setCheckedAuth] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        // Handle authentication redirects
        if (!isLoading && !isLoggingIn && !redirecting) {
            if (!user) {
                // Check if we're on a shop route or factory route
                const isShopRoute = window.location.pathname.startsWith('/shop');
                setRedirecting(true);
                if (isShopRoute) {
                    router.push('/shop/login');
                } else {
                    router.push('/factory/login');
                }
            } else {
                // If user is authenticated but on the wrong route, redirect them
                const isShopRoute = window.location.pathname.startsWith('/shop');
                if (user.role === 'shop' && !isShopRoute) {
                    setRedirecting(true);
                    router.push('/shop/dashboard');
                } else if (user.role === 'factory' && isShopRoute) {
                    setRedirecting(true);
                    router.push('/dashboard');
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

    return (
        <TooltipProvider>
            <ResponsiveProvider>
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
            </ResponsiveProvider>
        </TooltipProvider>
    )
}