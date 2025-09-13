import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
       <div className="flex-shrink-0">
         <Image src="/logo.png" alt="Carement Logo" width={140} height={32} />
       </div>
    </div>
  );
}
