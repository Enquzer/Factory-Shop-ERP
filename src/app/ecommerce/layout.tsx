import { CustomerAuthProvider } from "@/contexts/customer-auth-context";

export default function EcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      <div className="theme-ecommerce min-h-screen">
        {children}
      </div>
    </CustomerAuthProvider>
  );
}