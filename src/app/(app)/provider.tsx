"use client"

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import { Nav } from '@/components/nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingBar } from '@/components/loading-bar';
import { ResponsiveProvider } from '@/contexts/responsive-context';
import { BulkSelectionProvider } from '@/contexts/bulk-selection-context';

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
                const pathname = window.location.pathname;
                const isShopRoute = pathname.startsWith('/shop');
                const isStoreRoute = pathname.startsWith('/store');
                const isFinanceRoute = pathname.startsWith('/finance');
                
                setRedirecting(true);
                // Redirect all unauthenticated users to main login page
                router.push('/');
            } else {
                // If user is authenticated but on the wrong route, redirect them
                const pathname = window.location.pathname;
                const isShopRoute = pathname.startsWith('/shop');
                const isStoreRoute = pathname.startsWith('/store');
                const isFinanceRoute = pathname.startsWith('/finance');

                console.log('AppProvider Redirect Check:', { role: user.role, pathname, isShopRoute, isStoreRoute, isFinanceRoute });

                if (user.role === 'shop' && !isShopRoute) {
                    console.log('Redirecting Shop user to Dashboard');
                    setRedirecting(true);
                    router.push('/shop/dashboard');
                } else if (user.role === 'factory' && (isShopRoute || isStoreRoute || isFinanceRoute)) {
                    console.log('Redirecting Factory user to Dashboard');
                    setRedirecting(true);
                    router.push('/dashboard');
                } else if (user.role === 'store' && !isStoreRoute) {
                    console.log('Redirecting Store user to Dashboard');
                    setRedirecting(true);
                    router.push('/store/dashboard');
                } else if (user.role === 'finance' && !isFinanceRoute) {
                    console.log('Redirecting Finance user to Reports');
                    setRedirecting(true);
                    router.push('/finance/reports');
                } else if (user.role === 'packing' && !pathname.startsWith('/packing')) {
                    setRedirecting(true);
                    router.push('/packing');
                } else if (['planning', 'sample_maker', 'cutting', 'sewing', 'finishing', 'quality_inspection'].includes(user.role) && !pathname.startsWith('/production-dashboard')) {
                    setRedirecting(true);
                    router.push('/production-dashboard');
                } else if (user.role === 'designer' && !pathname.startsWith('/designer') && !pathname.startsWith('/sample-management') && !pathname.startsWith('/marketing-orders') && !pathname.startsWith('/products') && !pathname.startsWith('/profile')) {
                    setRedirecting(true);
                    router.push('/designer');
                } else if (user.role === 'hr' && !pathname.startsWith('/hr') && !pathname.startsWith('/profile')) {
                    console.log('Redirecting HR user to /hr');
                    setRedirecting(true);
                    router.push('/hr');
                } else if (user.role === 'ecommerce' && !pathname.startsWith('/ecommerce-manager') && !pathname.startsWith('/profile')) {
                    console.log('Redirecting eCommerce user to /ecommerce-manager');
                    setRedirecting(true);
                    router.push('/ecommerce-manager');
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
    )
}