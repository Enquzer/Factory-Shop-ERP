
"use client"

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import { Nav } from '@/components/nav';
import { AiChatWidget } from '@/components/ai-chat-widget';


export function AppProvider({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader className="border-b border-sidebar-border p-3">
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
    )
}
