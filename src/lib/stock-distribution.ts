import { Product, ProductVariant } from './products';
import { ShopInventoryItem } from './shop-inventory-sqlite';

/**
 * Process product variant data for size/color distribution charts
 * @param variants Product variants to process
 * @returns Chart data structure for visualization
 */
export function processStockDistributionData(variants: ProductVariant[] | ShopInventoryItem[]) {
  // Extract unique sizes and colors
  const sizes = Array.from(new Set(variants.map(v => v.size))).sort();
  const colors = Array.from(new Set(variants.map(v => v.color))).sort();
  
  // Create data structure for the chart
  const chartData: {
    size: string;
    total: number;
    [key: string]: string | number;
  }[] = [];
  
  // Create a map for quick lookup of variant quantities
  const variantMap = new Map<string, number>();
  variants.forEach(variant => {
    const key = `${variant.size}-${variant.color}`;
    variantMap.set(key, variant.stock);
  });
  
  // Build chart data
  sizes.forEach(size => {
    const dataPoint: { size: string; total: number; [key: string]: string | number } = {
      size,
      total: 0
    };
    
    let sizeTotal = 0;
    
    colors.forEach(color => {
      const key = `${size}-${color}`;
      const quantity = variantMap.get(key) || 0;
      dataPoint[color] = quantity;
      sizeTotal += quantity;
    });
    
    dataPoint.total = sizeTotal;
    chartData.push(dataPoint);
  });
  
  return {
    sizes,
    colors,
    data: chartData
  };
}

/**
 * Generate color scheme based on color names
 * @param colors Array of color names
 * @returns Array of hex color values
 */
export function generateColorScheme(colors: string[]): string[] {
  // Predefined color mappings for common colors
  const colorMap: Record<string, string> = {
    'Red': '#ef4444',
    'Blue': '#3b82f6',
    'Green': '#22c55e',
    'Yellow': '#eab308',
    'Purple': '#a855f7',
    'Pink': '#ec4899',
    'Orange': '#f97316',
    'Black': '#000000',
    'White': '#ffffff',
    'Gray': '#6b7280',
    'Brown': '#a16207',
    'Navy': '#1e3a8a',
    'Maroon': '#991b1b',
    'Olive': '#65a30d',
    'Teal': '#0d9488',
    'Cyan': '#06b6d4',
    'Lime': '#84cc16',
    'Indigo': '#4f46e5',
    'Violet': '#7c3aed',
    'Fuchsia': '#d946ef',
    'Rose': '#f43f5e',
    'Sky': '#0ea5e9',
    'Emerald': '#10b981',
    'Amber': '#f59e0b',
    'Default': '#64748b'
  };
  
  return colors.map(color => {
    // Check if we have a predefined color for this name
    if (colorMap[color]) {
      return colorMap[color];
    }
    
    // Generate a hash-based color for unknown colors
    let hash = 0;
    for (let i = 0; i < color.length; i++) {
      hash = color.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  });
}

/**
 * Process factory stock distribution data
 * @param product Product with variants
 * @returns Chart data for factory view
 */
export function processFactoryStockDistribution(product: Product) {
  return processStockDistributionData(product.variants);
}

/**
 * Process shop stock distribution data
 * @param inventoryItems Shop inventory items
 * @param productCode Product code to filter by
 * @returns Chart data for shop view
 */
export function processShopStockDistribution(inventoryItems: ShopInventoryItem[], productCode: string) {
  // Filter inventory items for the specific product
  const productItems = inventoryItems.filter(item => 
    item.name.startsWith(productCode) || item.name === productCode
  );
  
  return processStockDistributionData(productItems);
}