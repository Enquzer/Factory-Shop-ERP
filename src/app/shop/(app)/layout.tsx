
import { ShopAppProvider } from './provider';

export default function ShopAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopAppProvider>
      {children}
    </ShopAppProvider>
  );
}
