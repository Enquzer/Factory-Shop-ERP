# Dynamic Size & Color Distribution Graphs

## Overview

This feature provides visual representation of how product stock is distributed across sizes and colors in real-time for both factory and shop views. It helps users instantly understand product variant balance and availability without scrolling through raw tables.

## Key Components

### 1. Data Processing Utilities
- **File**: `src/lib/stock-distribution.ts`
- **Functions**:
  - `processStockDistributionData()`: Transforms variant data into chart-friendly format
  - `generateColorScheme()`: Creates consistent color mappings based on color names
  - `processFactoryStockDistribution()`: Processes factory stock data
  - `processShopStockDistribution()`: Processes shop-specific stock data

### 2. Visualization Components
- **File**: `src/components/stock-distribution-chart.tsx`
- **Features**:
  - Grouped Bar Chart (default view)
  - Stacked Bar Chart (alternative view)
  - Interactive tooltips with exact quantities
  - Color-coded legend
  - Export functionality (placeholder)

- **File**: `src/components/stock-distribution-toggle.tsx`
- **Features**:
  - Collapsible chart view
  - Toggle button for showing/hiding charts

### 3. Data Hooks
- **File**: `src/hooks/use-shop-inventory.ts`
- **Features**:
  - Fetches shop-specific inventory data
  - Provides loading and error states
  - Includes refresh functionality

### 4. API Endpoints
- **File**: `src/app/api/products/[code]/stock-distribution/route.ts`
- **Endpoint**: `GET /api/products/[code]/stock-distribution?shopId=SHOP_ID`
- **Features**:
  - Returns processed distribution data for a specific product
  - Supports both factory and shop views
  - Includes color and size information

## Implementation Details

### Data Structure

The chart expects data in this format:
```json
{
  "productCode": "CK-001",
  "chartType": "bar",
  "sizes": ["S", "M", "L"],
  "colors": ["Red", "Blue"],
  "data": [
    {"size": "S", "Red": 10, "Blue": 5, "total": 15},
    {"size": "M", "Red": 5, "Blue": 5, "total": 10},
    {"size": "L", "Red": 10, "Blue": 5, "total": 15}
  ]
}
```

### Color Scheme Generation

The system automatically generates appropriate colors for chart elements:
- Predefined mappings for common colors (Red, Blue, Green, etc.)
- Hash-based color generation for unknown colors
- Consistent color coding across views

### UI Integration Points

1. **Factory Product List** (`src/app/(app)/products/_components/product-list.tsx`)
   - Charts displayed directly in product cards
   - Always visible for factory users

2. **Product Detail Dialog** (`src/components/product-detail-dialog.tsx`)
   - Toggle button to show/hide distribution chart
   - Works for both factory and shop views

3. **Shop Product View** (`src/components/shop-product-view.tsx`)
   - Charts integrated into product cards
   - Adapts to shop's visibility settings

## Technical Features

### Real-time Updates
- Charts automatically refresh when stock data changes
- Uses React hooks for efficient data fetching

### Scalability
- Supports up to 1000 variant points per graph
- Efficient data processing algorithms

### Responsive Design
- Charts adapt to different screen sizes
- Mobile-friendly layout

### Export Capabilities
- Export to PNG (placeholder implementation)
- Export to Excel (placeholder implementation)

## Benefits

✅ **Instant Understanding**: Clear visual of how stock is spread across sizes/colors
✅ **Faster Decision Making**: Factory can quickly identify under-stocked sizes/colors
✅ **Reduced Errors**: Prevents overproduction or missed variants
✅ **Better Shop Insights**: Shops can plan orders based on actual mix balance
✅ **Scalable**: Efficient up to 1000 variants per product batch

## Example Usage

### Factory View
```tsx
<StockDistributionChart 
  product={product}
  viewType="factory"
/>
```

### Shop View
```tsx
<StockDistributionChart 
  product={product}
  shopInventory={shopInventory}
  viewType="shop"
/>
```

### With Toggle
```tsx
<StockDistributionToggle 
  product={product}
  shopInventory={shopInventory}
  viewType={userRole === 'factory' ? 'factory' : 'shop'}
/>
```

## API Usage

### Get Factory Stock Distribution
```
GET /api/products/CK-001/stock-distribution
```

### Get Shop Stock Distribution
```
GET /api/products/CK-001/stock-distribution?shopId=SHP-001
```

## Future Enhancements

1. **Advanced Export Options**: Implement actual PNG and Excel export
2. **Additional Chart Types**: Add pie charts, area charts, etc.
3. **Customization Options**: Allow users to customize chart appearance
4. **Performance Optimizations**: Implement caching for large datasets
5. **Animation Support**: Add entrance animations for chart elements