# Complete Order Workflow Implementation

This document describes the implementation of the complete order workflow for the Factory-Shop ERP system.

## Workflow Overview

1. **Order Creation**: Shops send full order information to the factory
2. **Order Processing**: Factory receives notification, can verify/cancel/edit with alternatives
3. **Order Confirmation**: Factory sends confirmation back to shop
4. **Payment Processing**: Shop confirms and attaches payment slip image
5. **Inventory Update**: When payment is confirmed, factory stock is reduced and shop inventory is increased
6. **Dispatch**: Factory sends dispatch information (account details, transport info, license plate, contact person)
7. **Delivery Confirmation**: Shop confirms receipt and verifies against order sheet
8. **Order Closure**: Shop closes order or provides feedback on issues

## Implementation Details

### 1. Enhanced Order Data Structure

Extended the Order type to include additional fields:
- `paymentSlipUrl`: URL to the payment slip image
- `dispatchInfo`: Object containing dispatch details:
  - `accountId`: Receiving account ID (from shop address)
  - `transportLicensePlate`: Transport vehicle license plate (manually entered)
  - `contactPerson`: Contact person for delivery (from shop registration)
  - `dispatchDate`: Date of dispatch (auto-generated, editable)
  - `driverName`: Name of the driver (optional)
- `deliveryDate`: Date when the order was delivered
- `isClosed`: Boolean indicating if the order is closed
- `feedback`: Feedback from the shop about the delivery

### 2. New API Endpoints

Created dedicated API endpoints for each workflow step:

#### Payment Confirmation
- **Endpoint**: `PUT /api/orders/[id]/payment`
- **Function**: Allows shops to confirm payment by uploading a payment slip image
- **Notification**: Factory receives notification when payment is confirmed

#### Inventory Update
- **Endpoint**: `PUT /api/orders/[id]/status` (when status is 'Paid')
- **Function**: Reduces factory stock and increases shop inventory by ordered quantities
- **Notification**: Both shop and factory receive notifications when inventory is updated

#### Dispatch Information
- **Endpoint**: `PUT /api/orders/[id]/dispatch`
- **Function**: Allows factory to add dispatch information when an order is shipped
- **Notification**: Both shop and factory receive notifications when order is dispatched

#### Delivery Confirmation
- **Endpoint**: `PUT /api/orders/[id]/delivery`
- **Function**: Allows shops to confirm delivery, provide feedback, and optionally close the order
- **Notification**: Factory receives notification when delivery is confirmed or feedback is provided

### 3. Database Schema Updates

Added new columns to the orders table:
- `paymentSlipUrl` (TEXT)
- `dispatchInfo` (TEXT)
- `deliveryDate` (TEXT)
- `isClosed` (INTEGER)
- `feedback` (TEXT)

### 4. UI Enhancements

#### Factory Orders Page
- Added dispatch form modal with auto-populated fields:
  - Account ID (from shop address)
  - Contact Person (from shop registration)
  - Dispatch Date (auto-generated to current date)
  - Transport License Plate (manually entered)
  - Driver Name (optional)
- Enhanced order detail dialog to display all workflow information
- Added new actions based on order status

#### Shop Orders Page
- Added payment confirmation form modal with image upload capability
- Added delivery confirmation form modal with feedback and closure options
- Enhanced order detail dialog to display all workflow information
- Added context-sensitive actions based on order status

### 5. Notification System

Enhanced notifications to reflect each step of the workflow:
- Payment confirmation notifications to factory
- Inventory update notifications to both shop and factory
- Dispatch notifications to both shop and factory
- Delivery confirmation notifications to factory
- Feedback notifications to factory

### 6. Order Tracking Features

Implemented comprehensive order tracking capabilities:

#### Visual Status Flow
- Created visual representation of order progress through the workflow
- Shows completed steps, current status, and upcoming steps
- Available in both detailed view and compact indicators

#### Order Tracking Dashboard
- Dedicated tracking page showing all orders grouped by status
- Visual cards for each status category
- Clickable order cards for detailed inspection

#### Status Indicators
- Compact progress indicators for use in table views
- Color-coded dots showing workflow progress
- Consistent across both factory and shop interfaces

## Usage Instructions

### For Factory Users
1. View incoming orders in the "Orders" section
2. For new orders, choose "Confirm Order" to move to "Awaiting Payment" status
3. When an order is paid, you'll receive a notification
4. Confirm the payment by marking the order as "Paid" to trigger inventory updates:
   - Factory stock is automatically reduced by ordered quantities
   - Shop inventory is automatically increased by ordered quantities
   - Both parties receive notifications about the inventory update
5. For paid orders, add dispatch information:
   - Shop Name is auto-filled from the shop's registered name
   - Contact Person is auto-filled from the shop's registration
   - Dispatch Date is auto-generated to the current date (can be changed)
   - Transport License Plate must be manually entered
   - Driver Name is optional
6. When delivery is confirmed, you'll receive a notification with delivery details
7. If feedback is provided, you'll receive a separate notification
8. Use the "View Order Tracking" button to see all orders grouped by status

### For Shop Users
1. Place orders through the "Create Order" page
2. When order is confirmed, you'll receive a notification
3. Pay for the order and confirm payment by uploading a payment slip image using the "Confirm Payment" action
4. When payment is confirmed, your inventory is automatically updated with the ordered items
5. When order is dispatched, you'll receive a notification with dispatch details
6. When order arrives, confirm delivery using the "Confirm Delivery" action
7. Optionally provide feedback and close the order
8. View order progress using the status indicators in the orders table

## Technical Implementation

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts              # File upload endpoint
│   │   └── orders/
│   │       └── [id]/
│   │           ├── payment/
│   │           │   └── route.ts
│   │           ├── dispatch/
│   │           │   └── route.ts
│   │           ├── delivery/
│   │           │   └── route.ts
│   │           └── status/
│   │               └── route.ts      # Status and inventory update endpoint
│   ├── (app)/
│   │   └── orders/
│   │       ├── page.tsx                 # Main orders page
│   │       ├── tracking/
│   │       │   └── page.tsx            # Order tracking dashboard
│   │       └── _components/
│   │           ├── order-status-flow.tsx      # Detailed status flow
│   │           ├── order-status-indicator.tsx # Compact indicators
│   │           ├── order-tracking.tsx         # Tracking dashboard
│   │           └── orders-client.tsx         # Orders table
│   └── shop/
│       └── (app)/
│           └── orders/
│               └── page.tsx              # Shop orders page
├── components/
│   ├── order-detail-dialog.tsx          # Enhanced order details
│   └── order-status-flow.tsx           # Shared status flow component
├── lib/
│   ├── products-sqlite.ts              # Factory stock management
│   ├── shop-inventory-sqlite.ts        # Shop inventory management
│   └── orders.ts                       # Order data structure
└── ORDER_WORKFLOW.md
```

### Key Components

1. **Order Type Enhancement**: Extended Order type in `src/lib/orders.ts`
2. **Database Schema**: Updated in `src/lib/db.ts`
3. **API Routes**: Created new route files for each workflow step
4. **Frontend Components**: Updated factory and shop order pages with new actions and forms
5. **Order Detail Dialog**: Enhanced to display all workflow information including payment slip images and dispatch details
6. **Order Tracking**: New components for visualizing order progress
7. **Inventory Management**: Integrated factory stock reduction and shop inventory increase

## Inventory Update Workflow

The inventory update workflow is designed to ensure accurate stock management:

1. **When Order is Placed**: No inventory changes occur yet
2. **When Order is Marked as 'Paid'**: 
   - Factory stock is reduced by the ordered quantities
   - Shop inventory is increased by the ordered quantities
   - If items already exist in shop inventory, their stock is updated
   - If items don't exist in shop inventory, they are added
3. **When Order is Dispatched**: No inventory changes occur
4. **When Order is Delivered**: No inventory changes occur (already updated when paid)

This approach ensures that:
- Factory stock is only reduced when payment is confirmed
- Shop inventory is immediately available when payment is confirmed
- No duplicate inventory updates occur during delivery confirmation

## Testing

All new endpoints and UI components have been tested to ensure proper functionality:
- Order status transitions work correctly
- Notifications are sent at appropriate workflow steps
- Database updates occur as expected
- UI forms properly capture and submit data
- Order detail dialog displays all relevant information
- Order tracking features show accurate status information
- Payment slip image upload and display works correctly
- Dispatch information form auto-populates fields correctly
- Dispatch notifications are sent to both factory and shop users
- Inventory updates occur when orders are marked as "Paid"
- Both factory and shop users receive inventory update notifications
- Shop inventory correctly reflects ordered items when payment is confirmed

## Future Enhancements

Potential areas for future development:
- File upload functionality for payment slips
- Integration with shipping tracking services
- Email notifications in addition to in-app notifications
- Order history analytics and reporting
- Automated inventory updates based on order status
- Advanced filtering and sorting options for the tracking dashboard
- Real-time updates using WebSocket connections
- Timeline view for order history