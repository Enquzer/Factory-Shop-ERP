import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Carement Fashion - Official Website',
  description: 'Official website of Carement Fashion - Premium fashion solutions in Ethiopia',
};

export default function PublicWebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <div className="theme-ecommerce min-h-screen font-sans">
      {children}
    </div>
    </>
  );
}