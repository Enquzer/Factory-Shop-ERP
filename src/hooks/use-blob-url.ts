import { useState, useEffect, useCallback, useRef } from 'react';

interface BlobUrlState {
  url: string | null;
  createUrl: (blob: Blob) => string;
  revokeUrl: () => void;
}

/**
 * Custom hook to manage a single blob URL with automatic cleanup
 */
export function useBlobUrl(initialUrl: string | null = null): BlobUrlState {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const createdUrls = useRef<Set<string>>(new Set());

  // Revoke the current URL when the component unmounts
  useEffect(() => {
    return () => {
      createdUrls.current.forEach(createdUrl => {
        if (createdUrl && createdUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(createdUrl);
          } catch (error) {
            console.warn('Failed to revoke blob URL:', error);
          }
        }
      });
      createdUrls.current.clear();
    };
  }, []);

  // Function to create a new blob URL, revoking the old one if it exists AND was created by this hook
  const createUrl = useCallback((blob: Blob) => {
    // Revoke the previous URL if it exists and was created by this hook
    if (url && url.startsWith('blob:') && createdUrls.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
        createdUrls.current.delete(url);
      } catch (error) {
        console.warn('Failed to revoke previous blob URL:', error);
      }
    }

    const newUrl = URL.createObjectURL(blob);
    createdUrls.current.add(newUrl);
    setUrl(newUrl);
    return newUrl;
  }, [url]);

  // Function to manually revoke the current URL
  const revokeUrl = useCallback(() => {
    if (url && url.startsWith('blob:') && createdUrls.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
        createdUrls.current.delete(url);
        setUrl(null);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    } else if (url) {
        // If we didn't create it, we just clear it from state but don't revoke
        setUrl(null);
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
  const createdUrls = useRef<Set<string>>(new Set());

  // Revoke all URLs when the component unmounts
  useEffect(() => {
    return () => {
      createdUrls.current.forEach(createdUrl => {
        if (createdUrl && createdUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(createdUrl);
          } catch (error) {
            console.warn('Failed to revoke blob URL:', error);
          }
        }
      });
      createdUrls.current.clear();
    };
  }, []);

  // Function to create new blob URLs, revoking the old ones
  const createUrls = useCallback((blobs: Blob[]) => {
    // Revoke all previous URLs that were created by this hook
    urls.forEach(url => {
      if (url && url.startsWith('blob:') && createdUrls.current.has(url)) {
        try {
          URL.revokeObjectURL(url);
          createdUrls.current.delete(url);
        } catch (error) {
          console.warn('Failed to revoke previous blob URL:', error);
        }
      }
    });

    const newUrls = blobs.map(blob => {
        const url = URL.createObjectURL(blob);
        createdUrls.current.add(url);
        return url;
    });
    setUrls(newUrls);
  }, [urls]);

  // Function to manually revoke all URLs
  const revokeUrls = useCallback(() => {
    urls.forEach(url => {
      if (url && url.startsWith('blob:') && createdUrls.current.has(url)) {
        try {
          URL.revokeObjectURL(url);
          createdUrls.current.delete(url);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
    });
    setUrls([]);
  }, [urls]);

  return [urls, createUrls, revokeUrls];
}