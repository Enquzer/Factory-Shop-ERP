/**
 * Utility to manage blob URLs and prevent memory leaks
 */

// Store all created blob URLs to allow for proper cleanup
const blobUrlRegistry = new Map<string, string>();

/**
 * Creates a blob URL and registers it for cleanup
 */
export function createBlobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  blobUrlRegistry.set(url, url);
  return url;
}

/**
 * Revokes a specific blob URL and removes it from registry
 */
export function revokeBlobUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
    blobUrlRegistry.delete(url);
  } catch (error) {
    console.warn('Failed to revoke blob URL:', error);
  }
}

/**
 * Revokes all registered blob URLs
 */
export function revokeAllBlobUrls(): void {
  for (const url of blobUrlRegistry.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke blob URL:', error);
    }
  }
  blobUrlRegistry.clear();
}

/**
 * Hook to register blob URL cleanup in React components
 */
export function useBlobUrlCleanup(urls: string[]): void {
  // This would typically be implemented as a React hook
  // For now, this is just a placeholder for the concept
}

/**
 * Function to clean up blob URLs when an array changes (e.g., image previews)
 */
export function cleanupOldBlobUrls(oldUrls: string[], newUrls: string[]): void {
  const urlsToRemove = oldUrls.filter(url => !newUrls.includes(url) && url.startsWith('blob:'));
  urlsToRemove.forEach(revokeBlobUrl);
}