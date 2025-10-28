import * as React from "react"

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-desktop' | undefined;

const DEVICE_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1280
}

export function useDevice() {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(undefined)
  const [screenSize, setScreenSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      setScreenSize({
        width,
        height: window.innerHeight,
      })

      if (width <= DEVICE_BREAKPOINTS.mobile) {
        setDeviceType('mobile')
      } else if (width <= DEVICE_BREAKPOINTS.tablet) {
        setDeviceType('tablet')
      } else if (width <= DEVICE_BREAKPOINTS.desktop) {
        setDeviceType('desktop')
      } else {
        setDeviceType('large-desktop')
      }
    }

    // Set initial device type
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  const isDesktop = deviceType === 'desktop' || deviceType === 'large-desktop'
  const isLargeDesktop = deviceType === 'large-desktop'

  return {
    deviceType,
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTabletOrMobile: isMobile || isTablet,
    isDesktopOrLarge: isDesktop || isLargeDesktop
  }
}