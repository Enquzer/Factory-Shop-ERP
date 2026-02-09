"use client";

import { CustomerAuthProvider } from '@/contexts/customer-auth-context';

export default function TrackOrderLayout({
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
