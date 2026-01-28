import { ReactNode } from 'react';
import { StoreProvider } from './provider';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  );
}