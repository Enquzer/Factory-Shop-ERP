"use client"

import React, { createContext, useContext } from 'react'
import { useDevice } from '@/hooks/use-device'

type ResponsiveContextType = ReturnType<typeof useDevice>

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined)

export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const deviceInfo = useDevice()
  
  return (
    <ResponsiveContext.Provider value={deviceInfo}>
      {children}
    </ResponsiveContext.Provider>
  )
}

export function useResponsive() {
  const context = useContext(ResponsiveContext)
  
  // If context is undefined (e.g., during SSR or outside provider), return default values
  if (context === undefined) {
    return {
      deviceType: undefined,
      screenSize: { width: 0, height: 0 },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      isTabletOrMobile: false,
      isDesktopOrLarge: true
    }
  }
  
  return context
}