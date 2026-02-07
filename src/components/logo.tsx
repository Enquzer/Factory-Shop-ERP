"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useSystemSettings } from '@/contexts/system-settings-context';

export function Logo({ className }: { className?: string }) {
  const { settings } = useSystemSettings();
  const logoSrc = settings.logo || "/logo.png";

  return (
    <div className={cn("flex items-center justify-center", className)}>
       <div className="flex-shrink-0" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
         <img 
           src={logoSrc} 
           alt={settings.companyName || "Carement Logo"} 
           width={180} 
           height={40} 
           className="w-auto h-auto max-w-full object-contain"
           style={{
             maxHeight: '60px'
           }}
           onError={(e) => {
             const target = e.target as HTMLImageElement;
             target.src = '/logo.png';
           }}
         />
       </div>
    </div>
  );
}