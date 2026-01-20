import React from 'react';
import { UsersProvider } from './provider';

interface UsersLayoutProps {
  children: React.ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
  return (
    <UsersProvider>
      {children}
    </UsersProvider>
  );
}