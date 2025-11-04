"use client";

import { useEffect } from "react";

export function AnalyticsTracker() {
  useEffect(() => {
    // Function to detect device type
    const getDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) return "mobile";
      if (width < 1024) return "tablet";
      return "desktop";
    };

    // Function to send analytics data
    const sendAnalytics = async (data: any) => {
      try {
        // Get IP address (in a real implementation, you might use a service for this)
        const ipAddress = null; // We'll let the server determine this
        
        const analyticsData = {
          ...data,
          userAgent: navigator.userAgent,
          ipAddress,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          deviceType: getDeviceType(),
          timestamp: new Date().toISOString()
        };

        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analyticsData),
        });
      } catch (error) {
        console.error('Error sending analytics data:', error);
      }
    };

    // Track page view
    const trackPageView = () => {
      sendAnalytics({
        eventType: 'page_view',
        pageUrl: window.location.href,
        referrer: document.referrer
      });
    };

    // Track initial page view
    trackPageView();

    // Track page views on route changes (if using Next.js router)
    let lastUrl = window.location.href;
    const handleRouteChange = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        trackPageView();
      }
    };

    // Set up interval to check for route changes
    const interval = setInterval(handleRouteChange, 1000);

    // Clean up
    return () => {
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
}