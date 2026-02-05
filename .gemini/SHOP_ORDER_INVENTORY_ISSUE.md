# Shop Order Inventory Issue - Investigation & Fix

## Problem

Shop orders are not reducing factory inventory when received.

## Root Cause Analysis

### Current Workflow

1. **Dispatch Route** (`/api/orders/[id]/dispatch`):
   - Reduces factory inventory (line 91-95)
   - Adds to shop inventory (lines 97-151)
   - Only works when order status is 'Paid' or 'Released'

2. **Delivery Route** (`/api/orders/[id]/delivery`):
   - Only reduces inventory if order was NOT dispatched (line 67)
   - Skips inventory update if order status is 'Dispatched'

### Possible Issues

1. **Order Status Mismatch**: If order is not in 'Paid' or 'Released' status, dispatch fails
2. **Silent Failures**: Inventory update errors might not be visible to users
3. **Transaction Rollback**: If any item fails validation, entire transaction rolls back
4. **Stock Validation**: If factory stock is insufficient, dispatch is blocked

## Solution

### Immediate Fix

Add better error handling and logging to identify where the process is failing.

### Recommended Workflow

**Option A: Dispatch-First (Current)**

- Factory dispatches order → Inventory reduced immediately
- Shop receives order → No inventory change (already done)
- ✅ Prevents double reduction
- ❌ Requires factory to dispatch before shop can receive

**Option B: Delivery-First (Alternative)**

- Shop receives order → Inventory reduced from factory, added to shop
- Factory marks as dispatched → No inventory change (already done)
- ✅ Shop can receive without waiting for factory dispatch
- ❌ Requires careful status tracking

### Testing Steps

1. Check order status before dispatch:

   ```sql
   SELECT id, status, shopId, shopName FROM orders WHERE id = 'ORDER_ID';
   ```

2. Check factory stock before dispatch:

   ```sql
   SELECT pv.id, pv.color, pv.size, pv.stock, p.name
   FROM product_variants pv
   JOIN products p ON pv.productId = p.id
   WHERE pv.id IN (SELECT variant IDs from order);
   ```

3. Dispatch the order and check for errors in console

4. Verify inventory was reduced:

   ```sql
   SELECT pv.id, pv.color, pv.size, pv.stock
   FROM product_variants pv
   WHERE pv.id IN (SELECT variant IDs from order);
   ```

5. Verify shop inventory was increased:
   ```sql
   SELECT * FROM shop_inventory
   WHERE shopId = 'SHOP_ID'
   AND productVariantId IN (SELECT variant IDs from order);
   ```

## Quick Fix Applied

Added inventory tracking log to help debug the issue.
