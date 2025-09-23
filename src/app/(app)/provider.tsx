"use client"

import { SidebarProvider } from "@/components/ui/sidebar";

export function AppProvider({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            {children}
        </SidebarProvider>
    )
}
