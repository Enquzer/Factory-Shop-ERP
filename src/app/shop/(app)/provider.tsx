"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { OrderProvider } from "@/hooks/use-order";

export function ShopAppProvider({ children }: { children: React.ReactNode }) {
    return (
        <OrderProvider>
            <SidebarProvider>
                {children}
            </SidebarProvider>
        </OrderProvider>
    )
}
