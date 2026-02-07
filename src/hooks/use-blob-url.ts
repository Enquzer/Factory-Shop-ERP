import { useState, useEffect, useCallback } from 'react';

interface BlobUrlState {
  url: string | null;
  createUrl: (blob: Blob) => void;
  revokeUrl: () => void;
}

/**
 * Custom hook to manage a single blob URL with automatic cleanup
 */
export function useBlobUrl(initialUrl: string | null = null): BlobUrlState {
  const [url, setUrl] = useState<string | null>(initialUrl);

  // Revoke the current URL when the component unmounts or when URL changes
  useEffect(() => {
    return () => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
    };
  }, [url]);

  // Function to create a new blob URL, revoking the old one if it exists
  const createUrl = useCallback((blob: Blob) => {
    // Revoke the previous URL if it exists and is a blob URL
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke previous blob URL:', error);
      }
    }

    const newUrl = URL.createObjectURL(blob);
    setUrl(newUrl);
  }, [url]);

  // Function to manually revoke the current URL
  const revokeUrl = useCallback(() => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
        setUrl(null);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    }
  }, [url]);

  return {
    url,
    createUrl,
    revokeUrl
  };
}

/**
 * Custom hook to manage an array of blob URLs with automatic cleanup
 */
export function useBlobUrls(initialUrls: string[] = []): [string[], (blobs: Blob[]) => void, () => void] {
  const [urls, setUrls] = useState<string[]>(initialUrls);

  // Revoke all URLs when the component unmounts or when URLs change
  useEffect(() => {
    return () => {
      urls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.warn('Failed to revoke blob URL:', error);
          }
        }
      });
    };
  }, [urls]);

  // Function to create new blob URLs, revoking the old ones
  const createUrls = useCallback((blobs: Blob[]) => {
    // Revoke all previous URLs
    urls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke previous blob URL:', error);
        }
      }
    });

    const newUrls = blobs.map(blob => URL.createObjectURL(blob));
    setUrls(newUrls);
  }, [urls]);

  // Function to manually revoke all URLs
  const revokeUrls = useCallback(() => {
    urls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
    });
    setUrls([]);
  }, [urls]);

  return [urls, createUrls, revokeUrls];
}