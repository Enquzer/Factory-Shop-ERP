import type { Metadata } from 'next';
import './globals.css';
// import { Toaster } from '@/components/ui/toaster';
// import { AnalyticsTracker } from '@/components/analytics-tracker';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        {/* <AnalyticsTracker /> */}
        {/* <Toaster /> */}
      </body>
    </html>
  );
}