
"use client";

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import { OrderProvider } from "@/hooks/use-order";
import { ShopHeader } from '@/components/shop-header';
import { Logo } from '@/components/logo';
import { ShopNav } from '@/components/shop-nav';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { TooltipProvider } from "@/components/ui/tooltip";


export function ShopAppProvider({ children }: { children: React.ReactNode }) {
    return (
        <OrderProvider>
            <TooltipProvider>
                <SidebarProvider>
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
                </SidebarProvider>
            </TooltipProvider>
        </OrderProvider>
    )
}
