import { CustomerAuthProvider } from "@/contexts/customer-auth-context";
import { CartProvider } from "@/contexts/cart-context";

export default function EcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <div className="theme-ecommerce min-h-screen">
          {children}
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}