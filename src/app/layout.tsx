import type { Metadata } from 'next';
import './erp-globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

import { SystemSettingsProvider } from '@/contexts/system-settings-context';

export const metadata: Metadata = {
  title: 'Carement Central',
  description: 'Factory and Shop Management Tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Removed Google Fonts due to network issues */}
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