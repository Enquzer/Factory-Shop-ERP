# Order Tracking Implementation

This document describes the implementation of the order tracking feature for the Factory-Shop ERP system.

## Features Implemented

### 1. Visual Order Status Flow
- Created a visual representation of the order workflow progress
- Shows current status and completed steps in a linear flow
- Available in both detailed view (OrderDetailDialog) and compact view (table indicators)

### 2. Order Tracking Page
- Dedicated page at `/orders/tracking` showing all orders grouped by status
- Visual cards for each status category
- Clickable order cards that open detailed view

### 3. Status Indicators
- Compact progress indicators for use in table views
- Color-coded dots showing completed, current, and upcoming steps
- Consistent across both factory and shop interfaces

### 4. Enhanced Order Detail View
- Integrated status flow visualization in the order detail dialog
- Shows current status with descriptive labels
- Displays additional workflow information (payment, dispatch, delivery)

## Component Structure

```
src/
├── app/
│   ├── (app)/
│   │   └── orders/
│   │       ├── page.tsx                 # Main orders page with link to tracking
│   │       ├── tracking/
│   │       │   └── page.tsx            # Dedicated tracking page
│   │       └── _components/
│   │           ├── order-status-flow.tsx      # Detailed status flow component
│   │           ├── order-status-indicator.tsx # Compact status indicator
│   │           ├── order-tracking.tsx         # Order tracking dashboard
│   │           └── orders-client.tsx         # Main orders table component
│   └── shop/
│       └── (app)/
│           └── orders/
│               └── page.tsx              # Shop orders page with status indicators
├── components/
│   ├── order-detail-dialog.tsx          # Enhanced order detail dialog
│   └── order-status-flow.tsx           # Shared status flow component
└── ORDER_TRACKING.md
```

## Usage

### For Factory Users
1. Navigate to "Orders" to see all orders in table format with progress indicators
2. Click "View Order Tracking" to see all orders grouped by status
3. Click any order to see detailed status flow and workflow information

### For Shop Users
1. Navigate to "My Orders" to see your orders with progress indicators
2. Click "View" to see detailed status flow and workflow information

## Technical Implementation

### OrderStatusFlow Component
- Visualizes the complete order workflow as a horizontal flow
- Highlights current status and completed steps
- Shows descriptive labels for each status

### OrderStatusIndicator Component
- Compact version for use in table views
- Simple dot-and-line representation of progress
- Maintains consistency with full status flow

### OrderTracking Component
- Dashboard view showing all orders grouped by status
- Provides quick overview of order pipeline
- Clickable cards for detailed inspection

## API Integration
The order tracking features use the existing API endpoints:
- `GET /api/orders` - Fetch all orders with enhanced status information
- All existing order update endpoints continue to work as before

## Styling
- Uses Tailwind CSS for consistent styling
- Responsive design works on all screen sizes
- Follows existing UI component patterns

## Future Enhancements
- Add filtering and sorting options to the tracking page
- Implement real-time updates using WebSocket connections
- Add export functionality for order status reports
- Include timeline view for order history