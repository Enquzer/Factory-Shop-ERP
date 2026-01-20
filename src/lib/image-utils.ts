/**
 * Generate a standardized image file name based on product code and variant information
 * @param productCode The product code
 * @param variant Optional variant information (color and size)
 * @param isMainImage Whether this is the main product image
 * @returns A formatted image file name
 */
export function generateImageFileName(
  productCode: string, 
  variant?: { color: string; size: string }, 
  isMainImage: boolean = false
): string {
  const baseName = productCode.toUpperCase();
  
  if (isMainImage) {
    return `${baseName}_main.png`;
  }
  
  if (variant) {
    return `${baseName}_${variant.color}_${variant.size}.png`;
  }
  
  // Generic image name if no specific type
  return `${baseName}.png`;
}

/**
 * Save image from URL to local storage
 * @param imageUrl URL of the image to save
 * @param fileName Name to save the file as
 * @returns Path to the saved image
 */
export async function saveImageFromUrl(imageUrl: string, fileName: string): Promise<string> {
  try {
    // In a real implementation, you would download and save the image to your storage
    // For now, we'll just return the original URL since we're using external image URLs
    // In a production environment, you would want to download and store the image locally
    return imageUrl;
  } catch (error) {
    console.error('Error saving image from URL:', error);
    throw error;
  }
}

/**
 * Validate image URL format
 * @param url The URL to validate
 * @returns Whether the URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol) && /\.(jpg|jpeg|png|gif|webp)$/i.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}