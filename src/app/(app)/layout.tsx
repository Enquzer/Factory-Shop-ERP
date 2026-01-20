import { ReactNode } from 'react';
import { Header } from '@/components/header';
import { Nav } from '@/components/nav';
import { AppProvider } from './provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
