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