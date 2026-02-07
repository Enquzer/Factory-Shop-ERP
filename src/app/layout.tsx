import type { Metadata } from 'next';
import './erp-globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

export const metadata: Metadata = {
  title: 'Carement Central',
  description: 'Factory and Shop Management Tool',
};

import { SystemSettingsProvider } from '@/contexts/system-settings-context';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SystemSettingsProvider>
            {children}
          </SystemSettingsProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}