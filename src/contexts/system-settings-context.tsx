
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SystemSettings {
  companyName: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  buttonHoverColor?: string;
  buttonActiveColor?: string;
  notificationColor?: string;
  ecommercePrimaryColor?: string;
  ecommerceSecondaryColor?: string;
  borderRadius?: string; // e.g., '0.5rem', '0px', '1rem'
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: SystemSettings = {
  companyName: 'Carement Fashion',
  logo: null,
  primaryColor: '#054150', // Default primary
  secondaryColor: '#C68f4f', // Default accent
  buttonHoverColor: '#043542', 
  buttonActiveColor: '#032a35',
  notificationColor: '#ef4444', 
  ecommercePrimaryColor: '#054150',
  ecommerceSecondaryColor: '#C68f4f',
  borderRadius: '0.5rem',
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update CSS variables when settings change
  useEffect(() => {
    const root = document.documentElement;
    if (settings.primaryColor) {
      // rough hex to hsl conversion or simple color manipulation might be needed for tailwind variables
      // but we can also set custom properties
       root.style.setProperty('--primary-color-custom', settings.primaryColor);
       // We might need to override the HSL values if we want Tailwind to pick it up properly
       // For now, let's inject a style tag for specific overrides
    }
    if (settings.secondaryColor) {
        root.style.setProperty('--secondary-color-custom', settings.secondaryColor);
    }
  }, [settings]);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
        <style jsx global>{`
          :root {
            --primary-custom: ${settings.primaryColor};
            --secondary-custom: ${settings.secondaryColor};
            --primary-hover-custom: ${settings.buttonHoverColor || settings.primaryColor};
            --primary-active-custom: ${settings.buttonActiveColor || settings.primaryColor};
            --notification-custom: ${settings.notificationColor || '#ef4444'};
            --ecommerce-primary-custom: ${settings.ecommercePrimaryColor || settings.primaryColor};
            --ecommerce-secondary-custom: ${settings.ecommerceSecondaryColor || settings.secondaryColor};
            --radius-custom: ${settings.borderRadius || '0.5rem'};
          }
          
          /* Element Overrides */
          :root {
             --radius: ${settings.borderRadius || '0.5rem'} !important;
          }

          /* Override Tailwind classes */
          .bg-primary {
            background-color: ${settings.primaryColor} !important;
          }
          .bg-primary:hover {
            background-color: ${settings.buttonHoverColor || settings.primaryColor} !important;
          }
          .bg-primary:active {
            background-color: ${settings.buttonActiveColor || settings.primaryColor} !important;
          }
          
          .text-primary {
            color: ${settings.primaryColor} !important;
          }
          
          .border-primary {
            border-color: ${settings.primaryColor} !important;
          }
          
          .bg-accent {
            background-color: ${settings.secondaryColor} !important;
          }

          /* Notification Badges / Bells */
          .text-notification {
            color: ${settings.notificationColor || '#ef4444'} !important;
          }
          .bg-notification {
            background-color: ${settings.notificationColor || '#ef4444'} !important;
          }
          /* Lucide Icons for notifications often use standard classes, we might need a specific class */
          .notification-icon {
            color: ${settings.notificationColor || '#ef4444'} !important; 
          }

          /* Sidebar specificity */
          .bg-sidebar-primary {
            background-color: ${settings.primaryColor} !important;
          }
          
          /* Ecommerce Theme Overrides -Scoped if possible, or global utility class */
          .theme-ecommerce .bg-primary,
          .bg-ecommerce-primary {
             background-color: ${settings.ecommercePrimaryColor || settings.primaryColor} !important;
          }
          .theme-ecommerce .text-primary,
          .text-ecommerce-primary {
             color: ${settings.ecommercePrimaryColor || settings.primaryColor} !important;
          }
          
          /* Global Rounding */
          .rounded-lg, .rounded-md, .rounded-sm, .rounded {
             border-radius: ${settings.borderRadius || '0.5rem'} !important;
          }
        `}</style>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
