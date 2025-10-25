import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
       <div className="flex-shrink-0" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
         <Image 
           src="/logo.png" 
           alt="Carement Logo" 
           width={180} 
           height={40} 
           priority
           style={{
             maxWidth: '100%',
             height: 'auto'
           }}
           onError={(e) => {
             const target = e.target as HTMLImageElement;
             target.src = '/placeholder-product.png';
           }}
           loading="eager"
         />
       </div>
    </div>
  );
}