import * as React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
       <div className="flex-shrink-0">
         <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="hsl(var(--primary))"/>
            <path d="M16 8V16M16 16V24M16 16H24M16 16H8" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 9C20.3431 9 19 10.3431 19 12C19 13.6569 20.3431 15 22 15" stroke="hsl(var(--accent))" strokeWidth="2"/>
            <path d="M10 23C11.6569 23 13 21.6569 13 20C13 18.3431 11.6569 17 10 17" stroke="hsl(var(--accent))" strokeWidth="2"/>
         </svg>
       </div>
       <span className="text-xl font-bold tracking-tight">
         Carement Central
       </span>
    </div>
  );
}
