"use client"

import { useResponsive } from '@/contexts/responsive-context'
import { ReactNode } from 'react'

interface ResponsiveProps {
  children: ReactNode
  showOn?: 'mobile' | 'tablet' | 'desktop' | 'large-desktop' | 'tablet-or-mobile' | 'desktop-or-large'
  hideOn?: 'mobile' | 'tablet' | 'desktop' | 'large-desktop' | 'tablet-or-mobile' | 'desktop-or-large'
}

export function Responsive({ children, showOn, hideOn }: ResponsiveProps) {
  const { 
    isMobile, 
    isTablet, 
    isDesktop, 
    isLargeDesktop, 
    isTabletOrMobile, 
    isDesktopOrLarge 
  } = useResponsive()

  // Determine if component should be shown based on device type
  const shouldShow = () => {
    if (showOn) {
      switch (showOn) {
        case 'mobile': return isMobile
        case 'tablet': return isTablet
        case 'desktop': return isDesktop
        case 'large-desktop': return isLargeDesktop
        case 'tablet-or-mobile': return isTabletOrMobile
        case 'desktop-or-large': return isDesktopOrLarge
        default: return true
      }
    }
    
    if (hideOn) {
      switch (hideOn) {
        case 'mobile': return !isMobile
        case 'tablet': return !isTablet
        case 'desktop': return !isDesktop
        case 'large-desktop': return !isLargeDesktop
        case 'tablet-or-mobile': return !isTabletOrMobile
        case 'desktop-or-large': return !isDesktopOrLarge
        default: return true
      }
    }
    
    return true
  }

  return shouldShow() ? <>{children}</> : null
}

// Convenience components
export function MobileOnly({ children }: { children: ReactNode }) {
  return <Responsive showOn="mobile">{children}</Responsive>
}

export function TabletOnly({ children }: { children: ReactNode }) {
  return <Responsive showOn="tablet">{children}</Responsive>
}

export function DesktopOnly({ children }: { children: ReactNode }) {
  return <Responsive showOn="desktop">{children}</Responsive>
}

export function LargeDesktopOnly({ children }: { children: ReactNode }) {
  return <Responsive showOn="large-desktop">{children}</Responsive>
}

export function TabletOrMobile({ children }: { children: ReactNode }) {
  return <Responsive showOn="tablet-or-mobile">{children}</Responsive>
}

export function DesktopOrLarge({ children }: { children: ReactNode }) {
  return <Responsive showOn="desktop-or-large">{children}</Responsive>
}

export function HideOnMobile({ children }: { children: ReactNode }) {
  return <Responsive hideOn="mobile">{children}</Responsive>
}

export function HideOnTablet({ children }: { children: ReactNode }) {
  return <Responsive hideOn="tablet">{children}</Responsive>
}

export function HideOnDesktop({ children }: { children: ReactNode }) {
  return <Responsive hideOn="desktop">{children}</Responsive>
}

export function HideOnLargeDesktop({ children }: { children: ReactNode }) {
  return <Responsive hideOn="large-desktop">{children}</Responsive>
}

export function HideOnTabletOrMobile({ children }: { children: ReactNode }) {
  return <Responsive hideOn="tablet-or-mobile">{children}</Responsive>
}

export function HideOnDesktopOrLarge({ children }: { children: ReactNode }) {
  return <Responsive hideOn="desktop-or-large">{children}</Responsive>
}