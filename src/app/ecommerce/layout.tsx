import { CustomerAuthProvider } from "@/contexts/customer-auth-context";

export default function EcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      {children}
    </CustomerAuthProvider>
  );
}