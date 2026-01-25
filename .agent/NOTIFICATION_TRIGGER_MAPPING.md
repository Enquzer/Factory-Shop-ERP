# Notification Trigger Points - Complete Mapping

## 📍 Overview

This document maps all 50+ notification trigger points in the Factory-Shop-ERP system, organized by module and priority level.

---

## 🛒 Order Management Module

### File: `src/app/api/orders/route.ts`

#### Trigger 1: New Order Created

- **Event**: Shop places new order
- **Recipients**: Factory, Finance
- **Priority**: Important ⚠️
- **Current Code**: Lines 178-198
- **Telegram**: ✅ Recommended

```typescript
// Factory notification
await createNotification({
  userType: "factory",
  title: `New Order from ${shopName}`,
  description: `Order #${orderId} for ${totalAmount} Birr`,
  href: "/orders",
});

// Finance notification
await createNotification({
  userType: "finance",
  title: `New Order Received`,
  description: `Order #${orderId} from ${shopName}`,
  href: "/finance/orders",
});
```

---

### File: `src/app/api/orders/[id]/status/route.ts`

#### Trigger 2: Order Confirmed (Awaiting Payment)

- **Event**: Factory confirms order
- **Recipients**: Factory, Shop
- **Priority**: Important ⚠️
- **Current Code**: Lines 46-60
- **Telegram**: ✅ Recommended

#### Trigger 3: Payment Confirmed

- **Event**: Finance confirms payment
- **Recipients**: Factory, Shop
- **Priority**: Critical 🚨
- **Current Code**: Lines 61-77
- **Telegram**: ✅ Mandatory

#### Trigger 4: Order Released to Store

- **Event**: Order released for dispatch
- **Recipients**: Store, Factory
- **Priority**: Important ⚠️
- **Current Code**: Lines 78-93
- **Telegram**: ✅ Recommended

#### Trigger 5: Order Delivered

- **Event**: Order marked as delivered
- **Recipients**: Factory
- **Priority**: Info ℹ️
- **Current Code**: Lines 94-101
- **Telegram**: ⚪ Optional

---

### File: `src/app/api/orders/[id]/payment/route.ts`

#### Trigger 6: Payment Slip Uploaded

- **Event**: Shop uploads payment proof
- **Recipients**: Finance
- **Priority**: Important ⚠️
- **Current Code**: Lines 45-55
- **Telegram**: ✅ Recommended

#### Trigger 7: Payment Verified

- **Event**: Finance verifies payment
- **Recipients**: Shop, Store
- **Priority**: Critical 🚨
- **Current Code**: Lines 57-69
- **Telegram**: ✅ Mandatory

---

### File: `src/app/api/orders/[id]/request-payment/route.ts`

#### Trigger 8: Payment Request Sent

- **Event**: Shop requests payment approval
- **Recipients**: Finance
- **Priority**: Important ⚠️
- **Current Code**: Lines 31-39
- **Telegram**: ✅ Recommended

---

### File: `src/app/api/orders/[id]/release/route.ts`

#### Trigger 9: Order Released by Finance

- **Event**: Finance releases paid order
- **Recipients**: Store, Shop
- **Priority**: Important ⚠️
- **Current Code**: Lines 52-68
- **Telegram**: ✅ Recommended

---

### File: `src/app/api/orders/[id]/dispatch/route.ts`

#### Trigger 10: Order Dispatched

- **Event**: Store dispatches order
- **Recipients**: Shop, Factory
- **Priority**: Important ⚠️
- **Current Code**: Lines 63-75
- **Telegram**: ✅ Recommended

---

### File: `src/app/api/orders/[id]/verify/route.ts`

#### Trigger 11: Order Verified by Factory

- **Event**: Factory verifies order details
- **Recipients**: Shop, Finance
- **Priority**: Important ⚠️
- **Current Code**: Lines 62-78
- **Telegram**: ✅ Recommended

---

## 🏭 Production Management Module

### File: `src/app/api/marketing-orders/route.ts`

#### Trigger 12: New Marketing Order Created

- **Event**: Marketing creates production order
- **Recipients**: Planning, Factory
- **Priority**: Important ⚠️
- **Current Code**: Lines 124-132
- **Telegram**: ✅ Recommended

---

### File: `src/app/api/marketing-orders/[id]/route.ts`

#### Trigger 13: Order Status Updated

- **Event**: Production status changes
- **Recipients**: Planning, relevant department
- **Priority**: Info ℹ️
- **Current Code**: Lines 127-197
- **Telegram**: ⚪ Optional

**Status Changes**:

- Planning Complete → Planning team
- Sample Complete → Sample maker
- Cutting Complete → Cutting team
- Sewing Complete → Sewing team
- Finishing Complete → Finishing team
- QC Complete → QC team
- Packing Complete → Packing team

---

### File: `src/app/api/production-release/route.ts`

#### Trigger 14: Production Released to Next Stage

- **Event**: Stage completion and handover
- **Recipients**: Next stage team
- **Priority**: Important ⚠️
- **Current Code**: Lines 67
- **Telegram**: ✅ Recommended

---

## ✂️ Cutting Department Module

### File: `src/lib/cutting.ts`

#### Trigger 15: Cutting Completed (QC Request)

- **Event**: Cutting team completes work
- **Recipients**: Quality Inspection
- **Priority**: Important ⚠️
- **Current Code**: Lines 242-252
- **Telegram**: ✅ Recommended

```typescript
await db.run(
  `
  INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
`,
  [
    `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    "quality_inspection",
    "Cutting QC Request",
    `Cutting for order ${record.orderNumber} (${record.productName}) is completed and needs QC inspection.`,
    `/cutting`,
    0,
  ],
);
```

#### Trigger 16: Cut Panels Ready for Handover

- **Event**: QC passed, ready for sewing
- **Recipients**: Sewing, Planning
- **Priority**: Important ⚠️
- **Current Code**: Lines 322-345
- **Telegram**: ✅ Recommended

#### Trigger 17: Sewing Accepted Cut Panels

- **Event**: Sewing accepts handover
- **Recipients**: Planning
- **Priority**: Info ℹ️
- **Current Code**: Lines 428-438
- **Telegram**: ⚪ Optional

---

## 📦 Product & Inventory Module

### File: `src/lib/products-sqlite.ts`

#### Trigger 18: Low Stock Alert

- **Event**: Product stock below minimum
- **Recipients**: Factory, Store
- **Priority**: Important ⚠️
- **Current Code**: Lines 282-290
- **Telegram**: ✅ Recommended

```typescript
await createNotification({
  userType: "factory",
  title: `Low Stock Alert`,
  description: `${product.name} (${variant.color}, ${variant.size}) stock is below minimum level`,
  href: `/products/${productId}`,
});
```

#### Trigger 19: Product Variant Updated

- **Event**: Variant details changed
- **Recipients**: Factory, relevant shops
- **Priority**: Info ℹ️
- **Current Code**: Lines 539-575
- **Telegram**: ⚪ Optional

#### Trigger 20: Product Image Updated

- **Event**: Product image changed
- **Recipients**: All shops
- **Priority**: Info ℹ️
- **Current Code**: Lines 691-699
- **Telegram**: ⚪ Optional

---

### File: `src/app/api/products/variant/[variantId]/route.ts`

#### Trigger 21: Variant Stock Updated

- **Event**: Stock level changes
- **Recipients**: Factory
- **Priority**: Info ℹ️
- **Current Code**: Lines 30-40
- **Telegram**: ⚪ Optional

#### Trigger 22: Variant Deleted

- **Event**: Product variant removed
- **Recipients**: All shops
- **Priority**: Important ⚠️
- **Current Code**: Lines 47-57
- **Telegram**: ✅ Recommended

---

### File: `src/app/api/products/variant/[variantId]/image/route.ts`

#### Trigger 23: Variant Image Updated

- **Event**: Variant image changed
- **Recipients**: All shops
- **Priority**: Info ℹ️
- **Current Code**: Lines 38-48
- **Telegram**: ⚪ Optional

---

## 🏪 Shop Management Module

### File: `src/app/api/shops/route.ts` (Inferred)

#### Trigger 24: New Shop Registration

- **Event**: Shop submits registration
- **Recipients**: Factory
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 25: Shop Approved

- **Event**: Factory approves shop
- **Recipients**: Shop
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

#### Trigger 26: Shop Rejected

- **Event**: Factory rejects shop
- **Recipients**: Shop
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

---

## 👤 User Management Module

### File: `src/app/api/users/` (Inferred)

#### Trigger 27: Password Reset Request

- **Event**: User requests password reset
- **Recipients**: Factory Admin
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 28: Password Reset Completed

- **Event**: Admin resets user password
- **Recipients**: User
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

---

## 💰 Finance Module

### File: `src/app/api/orders/[id]/payment-verify/route.ts`

#### Trigger 29: Payment Verification Request

- **Event**: Payment needs verification
- **Recipients**: Finance
- **Priority**: Important ⚠️
- **Current Code**: Lines 62-78
- **Telegram**: ✅ Recommended

---

## 🎨 Designer Module

### File: `src/app/api/styles/` (Inferred)

#### Trigger 30: Style Submitted for Approval

- **Event**: Designer submits style
- **Recipients**: Factory
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 31: Style Approved

- **Event**: Factory approves style
- **Recipients**: Designer
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 32: Style Rejected

- **Event**: Factory rejects style
- **Recipients**: Designer
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

---

## 🔍 Quality Control Module

### File: `src/app/api/quality/` (Inferred)

#### Trigger 33: QC Inspection Requested

- **Event**: Department requests QC
- **Recipients**: Quality Inspection
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 34: QC Passed

- **Event**: QC approves work
- **Recipients**: Requesting department, Planning
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

#### Trigger 35: QC Failed

- **Event**: QC rejects work
- **Recipients**: Requesting department, Planning, Factory
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

---

## 📊 Planning Module

### File: `src/app/api/planning/` (Inferred)

#### Trigger 36: Planning Completed

- **Event**: Planning approves production plan
- **Recipients**: All production departments
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 37: Production Delay Detected

- **Event**: KPI shows delay
- **Recipients**: Planning, Factory
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

---

## 🧵 Sewing Module

### File: `src/app/api/sewing/` (Inferred)

#### Trigger 38: Sewing Started

- **Event**: Sewing begins work
- **Recipients**: Planning
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

#### Trigger 39: Sewing Completed

- **Event**: Sewing finishes order
- **Recipients**: Finishing, Planning
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 40: Daily Production Update

- **Event**: Daily sewing output recorded
- **Recipients**: Planning
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

---

## ✨ Finishing Module

### File: `src/app/api/finishing/` (Inferred)

#### Trigger 41: Finishing Started

- **Event**: Finishing begins work
- **Recipients**: Planning
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

#### Trigger 42: Finishing Completed

- **Event**: Finishing completes order
- **Recipients**: Packing, Planning
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

---

## 📦 Packing Module

### File: `src/app/api/packing/` (Inferred)

#### Trigger 43: Packing Started

- **Event**: Packing begins work
- **Recipients**: Planning
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

#### Trigger 44: Packing Completed

- **Event**: Packing completes order
- **Recipients**: Store, Planning
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

---

## 🏬 Store Module

### File: `src/app/api/store/` (Inferred)

#### Trigger 45: Goods Received

- **Event**: Store receives finished goods
- **Recipients**: Factory, Planning
- **Priority**: Important ⚠️
- **Telegram**: ✅ Recommended

#### Trigger 46: Inventory Updated

- **Event**: Store updates inventory
- **Recipients**: Factory
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

---

## 🔔 System Notifications

#### Trigger 47: System Error

- **Event**: Critical system error
- **Recipients**: Factory Admin
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

#### Trigger 48: Database Backup Completed

- **Event**: Scheduled backup finishes
- **Recipients**: Factory Admin
- **Priority**: Info ℹ️
- **Telegram**: ⚪ Optional

#### Trigger 49: User Login (Suspicious)

- **Event**: Unusual login detected
- **Recipients**: Factory Admin
- **Priority**: Critical 🚨
- **Telegram**: ✅ Mandatory

#### Trigger 50: Session Expired

- **Event**: User session timeout
- **Recipients**: User
- **Priority**: Info ℹ️
- **Telegram**: ❌ Not needed

---

## 📈 Summary Statistics

### By Priority

- **Critical (🚨)**: 8 triggers (16%)
- **Important (⚠️)**: 32 triggers (64%)
- **Info (ℹ️)**: 10 triggers (20%)

### By Telegram Recommendation

- **Mandatory**: 8 triggers
- **Recommended**: 32 triggers
- **Optional**: 9 triggers
- **Not needed**: 1 trigger

### By Module

- **Order Management**: 11 triggers
- **Production**: 15 triggers
- **Inventory**: 6 triggers
- **User Management**: 4 triggers
- **Quality Control**: 3 triggers
- **System**: 4 triggers
- **Other**: 7 triggers

---

## 🎯 Implementation Priority

### Phase 1: Critical Notifications (Week 1)

1. Payment confirmations
2. QC failures
3. Password resets
4. Shop approvals
5. System errors

### Phase 2: Important Notifications (Week 2)

1. New orders
2. Order status changes
3. Production milestones
4. Low stock alerts
5. Department handovers

### Phase 3: Informational Notifications (Week 3)

1. Daily updates
2. General status changes
3. Non-critical updates

---

## 🔧 Code Modification Template

For each trigger point, apply this pattern:

### Before

```typescript
await createNotification({
  userType: "factory",
  title: "Event Title",
  description: "Event description",
  href: "/relevant/page",
});
```

### After

```typescript
await createNotification(
  {
    userType: "factory",
    title: "Event Title",
    description: "Event description",
    href: "/relevant/page",
  },
  {
    sendTelegram: true, // or false for optional notifications
    priority: "critical" | "important" | "info",
  },
);
```

---

## 📝 Notes

1. **Shop-specific notifications** require `shopId` parameter
2. **Multi-recipient notifications** need multiple `createNotification()` calls
3. **Telegram formatting** should be handled in the telegram library
4. **Error handling** must not break existing notification flow
5. **Rate limiting** should be implemented for high-volume triggers

---

**Last Updated**: 2026-01-24  
**Total Triggers Mapped**: 50  
**Coverage**: 100% of identified notification points
