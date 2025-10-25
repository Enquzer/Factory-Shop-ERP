# Factory and Shop Stock Display Implementation

## Overview

This implementation ensures that shop users can see both factory stock levels and their shop-specific inventory levels, providing better visibility into product availability.

## Features Implemented

1. **Product Database View**: When shops browse products, they see factory stock levels
2. **Shop Inventory View**: When shops view their inventory, they see both factory and shop-specific stock levels
3. **Order Creation View**: During order creation, shops see both stock levels for each product
4. **Product Detail View**: Enhanced dialog showing both stock levels with clear visual distinction

## Technical Implementation

### 1. API Endpoint
Created a new API endpoint `/api/factory-stock` to fetch factory stock levels for specific product variants:
- Accepts `variantId` as a query parameter
- Returns the factory stock level for that variant
- Handles error cases appropriately

### 2. Product Detail Dialog
Updated `src/components/product-detail-dialog.tsx` to show:
- For factory users: Only factory stock levels
- For shop users: Both factory stock and shop-specific stock levels
- Clear visual distinction using icons (Factory and Store)
- Enhanced UI with better organization of stock information

### 3. Shop Inventory Page
Updated `src/app/shop/(app)/inventory/_components/inventory-client.tsx` to show:
- Both factory and shop stock levels for each inventory item
- Asynchronous fetching of factory stock data
- Clear visual indicators with color-coded icons
- Proper error handling for stock data fetching

### 4. Order Creation Page
Updated `src/app/shop/(app)/orders/create/page.tsx` to show:
- Both stock levels during order creation
- Real-time shop stock calculation (considering items already in cart)
- Factory stock fetching for each product in the order
- Enhanced table layout with dedicated stock column

## Visual Design

### Icons Used
- **Factory Icon** (-blue-500): Represents factory stock levels
- **Store Icon** (green-500): Represents shop-specific stock levels

### Badge Variants
- **Outline**: Neutral information (factory stock)
- **Secondary**: In-stock items (shop stock)
- **Destructive**: Out of stock or low stock items (shop stock)

## Data Flow

1. **Product Browsing**: 
   - Shop users view products with factory stock levels displayed
   - Product variants show factory stock directly from product data

2. **Inventory Management**:
   - Shop inventory page fetches factory stock for each item
   - Displays both stock levels side-by-side
   - Handles loading and error states gracefully

3. **Order Creation**:
   - Fetches factory stock for items in the cart
   - Shows real-time shop stock (adjusted for items already in cart)
   - Prevents ordering beyond available shop stock

## Benefits

1. **Transparency**: Shops can clearly see both factory availability and their own inventory
2. **Better Decision Making**: Shops can make informed decisions about ordering
3. **Reduced Confusion**: Clear distinction between different stock levels
4. **Improved UX**: Visual indicators and organized information display
5. **Real-time Data**: Accurate stock information from the database

## Future Enhancements

1. **Caching**: Implement caching for factory stock data to reduce API calls
2. **Bulk Fetching**: Optimize API calls to fetch multiple stock levels in a single request
3. **Stock Alerts**: Add notifications when factory stock is low but shop stock is depleted
4. **Reordering Suggestions**: Provide suggestions based on stock levels and sales history