# Mock Run Implementation Plan

## Objective

Validate the integration of the inventory database and the entire system workflow, identifying logic loopholes and potential issues with numbers (e.g., negative stock).

## Workflow Steps

### 1. Product Creation & Approval

- **Designer Role**: Create a new style in the `styles` table.
- **Factory Role**: Approve the style to convert it into a `product` and its `product_variants`.
- **Validation**: Check if `products` and `product_variants` are correctly populated.

### 2. Marketing Order Placement

- **Marketing Role**: Place a `marketing_orders` record for the new product with a specific quantity and color/size breakdown in `marketing_order_items`.
- **Validation**: Ensure order status is 'Placed Order' and breakdown matches the total quantity.

### 3. Production Planning

- **Planning Role**: Set start and end dates for cutting, sewing, and packing in `marketing_order_components` (or `marketing_orders` directly if applicable).
- **Validation**: Verify dates are saved correctly.

### 4. Factory Operations (Production)

- **Cutting**:
  - Create a `cutting_records` entry.
  - Update `cutting_items` with cut quantities.
  - Set `marketing_orders.cuttingStatus = 'completed'`.
- **Sewing**:
  - Record output in `daily_production_status`.
  - Update `marketing_orders.sewingStatus = 'completed'`.
- **Packing**:
  - Record output in `daily_production_status`.
  - Update `marketing_orders.packingStatus = 'completed'`.
- **QC Audit**:
  - Record QC results in `marketing_orders.qualityInspectionStatus`.
- **Validation**: Check cumulative daily outputs vs. order quantity.

### 5. Store Handover

- **Store Role**: Receive goods.
- **Inventory Update**: Add the received quantity to the factory inventory (`product_variants.stock`).
- **Validation**: Factory inventory should increase by the exact quantity completed in packing. Check for negative numbers if any logic tries to subtract before adding.

### 6. Shop Order (Mexico Shop)

- **Shop Role**: Place an order for the new product.
- **Workflow**:
  - Confirmation.
  - Payment Slip attachment.
  - Payment Confirmation (Finance).
  - Release Goods.
- **Validation**:
  - Factory inventory should decrease.
  - Shop inventory (`shop_inventory`) should increase by the same amount.
  - Check for negative stock if ordering more than available.

### 7. Final Consistency Check

- Formula: `Initial Stock + Production - Delivered = Current Stock`.
- Verify total quantities across all tables.

## Tools

- `sqlite3` for database verification.
- `ts-node` for running the mock simulation script.
