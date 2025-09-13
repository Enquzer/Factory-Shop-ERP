import { ShopHeader } from '@/components/shop-header';
import { Logo } from '@/components/logo';
import { ShopNav } from '@/components/shop-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

export default function ShopAppLayout({ children }: { children: React.ReactNode }) {
  return (
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
    </SidebarProvider>
  );
}
