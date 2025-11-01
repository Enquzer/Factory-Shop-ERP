# Product Variant Visibility Control (Shop Order Simplification)

## Overview

This feature enhances the existing Product Variant Visibility Control by implementing a simplified order placement mechanism for shops when the "Show Product Details" toggle is OFF. Shops can order products in bulk quantities without seeing individual variants, and the system automatically distributes the order using AI algorithms.

## Key Components

### 1. Simplified Order Dialog
- **File**: `src/components/simplified-order-dialog.tsx`
- **Purpose**: Provides a streamlined interface for shops to place bulk orders
- **Features**:
  - Quantity input in multiples of 6
  - Automatic AI distribution of variants
  - Real-time order total calculation
  - Shop-specific distribution mode support

### 2. Enhanced Shop Product View
- **File**: `src/components/shop-product-view.tsx`
- **Purpose**: Displays products according to shop visibility settings
- **Features**:
  - Shows simplified order dialog when variant details are hidden
  - Maintains existing functionality for detailed view

### 3. Updated Order Hook
- **File**: `src/hooks/use-order.tsx`
- **Purpose**: Manages order state and operations
- **Features**:
  - New `addSimplifiedOrder` function to handle AI-distributed orders
  - Validation of factory stock before adding items
  - Proper quantity aggregation for existing items

### 4. AI Distribution Integration
- **File**: `src/lib/ai-distribution.ts`
- **Purpose**: Distributes order quantities across variants
- **Features**:
  - Proportional distribution based on current stock ratios
  - Equal distribution across all variants
  - Support for different distribution modes per shop

## Implementation Details

### Order Placement Flow

1. **Shop with Show Product Details = ON**:
   - Sees individual variants
   - Can select specific size/color combinations
   - Uses existing order placement flow

2. **Shop with Show Product Details = OFF**:
   - Sees only total product quantity
   - Clicks "Add to Order" button
   - Simplified Order Dialog appears
   - Enters quantity in multiples of 6
   - System automatically distributes using AI
   - Order is added to cart with distributed variants

### AI Distribution Logic

The system supports three distribution modes configured per shop:

1. **Proportional**: Distributes based on current stock ratios
2. **Equal**: Distributes evenly across all variants
3. **Manual Override**: Currently defaults to proportional (placeholder for future implementation)

### Data Validation

- Orders must be in multiples of 6
- System validates factory stock before allowing orders
- Prevents orders that exceed available factory stock
- Properly aggregates quantities for existing items in cart

## Technical Features

### Component Integration
- Simplified Order Dialog integrates with existing order context
- Shop Product View conditionally displays appropriate interface
- Order Hook handles both detailed and simplified order flows

### API Usage
- Fetches shop details to determine distribution mode
- Retrieves full product information for variant distribution
- Uses existing factory stock API for validation

### Error Handling
- Comprehensive error handling for network requests
- User-friendly error messages for stock issues
- Graceful fallbacks for missing data

## Benefits

✅ **Streamlined Ordering**: Shops can quickly place bulk orders without variant selection
✅ **AI-Powered Distribution**: Automatic intelligent distribution based on shop preferences
✅ **Stock Validation**: Ensures orders don't exceed factory availability
✅ **Flexible Configuration**: Supports different distribution modes per shop
✅ **Backward Compatibility**: Maintains existing functionality for detailed view

## Example Usage

### Shop with Hidden Variants Orders 24 Units
1. Shop views product with total available quantity: 200 units
2. Clicks "Add to Order"
3. Simplified Order Dialog appears
4. Enters quantity: 24 (multiple of 6)
5. System distributes: 12 Red-M + 12 Blue-L (proportional)
6. Order added to cart with distributed variants

### Shop with Visible Variants Orders Selectively
1. Shop views product with individual variants
2. Selects specific variants and quantities
3. Uses existing order placement flow
4. No AI distribution applied

## API Endpoints Used

### Get Shop Details
```
GET /api/shops?id={shopId}
```

### Get Product Details
```
GET /api/products
```

### Get Factory Stock
```
GET /api/factory-stock?variantId={variantId}
```

## Testing

Created test script `test-simplified-order.js` that validates:
- Proportional distribution accuracy
- Equal distribution accuracy
- Various order quantities
- Multiple variant scenarios

## Future Enhancements

1. **Enhanced Manual Override**: Implement true manual distribution specification
2. **Order History**: Show previous distribution patterns to shops
3. **Advanced Constraints**: Add business rules for minimum/maximum per variant
4. **Performance Optimization**: Implement caching for frequently accessed data
5. **Analytics Dashboard**: Provide insights on distribution patterns