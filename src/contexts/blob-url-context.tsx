'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface BlobUrlContextType {
  createBlobUrl: (blob: Blob) => string;
  revokeBlobUrl: (url: string) => void;
  revokeAll: () => void;
}

const BlobUrlContext = createContext<BlobUrlContextType | undefined>(undefined);

export function BlobUrlProvider({ children }: { children: React.ReactNode }) {
  const [urls, setUrls] = useState<string[]>([]);

  const createBlobUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    setUrls(prev => [...prev, url]);
    return url;
  };

  const revokeBlobUrl = (url: string) => {
    try {
      URL.revokeObjectURL(url);
      setUrls(prev => prev.filter(u => u !== url));
    } catch (error) {
      console.warn('Failed to revoke blob URL:', error);
    }
  };

  const revokeAll = () => {
    urls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    });
    setUrls([]);
  };

  // Revoke all URLs when the provider unmounts
  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, []);

  return (
    <BlobUrlContext.Provider value={{ createBlobUrl, revokeBlobUrl, revokeAll }}>
      {children}
    </BlobUrlContext.Provider>
  );
}

export function useBlobUrl() {
  const context = useContext(BlobUrlContext);
  if (context === undefined) {
    throw new Error('useBlobUrl must be used within a BlobUrlProvider');
  }
  return context;
}