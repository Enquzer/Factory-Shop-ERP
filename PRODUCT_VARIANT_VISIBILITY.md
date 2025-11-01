# Product Variant Visibility Control Feature

## Overview

This feature allows factories to control whether each shop can view detailed size/color breakdowns of products or only see the total combined quantity per product, while maintaining accurate backend stock and dispatch logic.

## Key Components

### 1. Visibility Toggle (Show Details)

- **Field Name**: `showVariantDetails`
- **Type**: Boolean (True / False)
- **Level**: Per shop (set during registration or edit)
- **Default**: True (shops see full details)

**Function**:
- When ON (True): Shop sees each variant (Color + Size) separately
- When OFF (False): Shop sees only the aggregated total per product

### 2. AI Auto Distribution Logic (for Orders)

When `showVariantDetails = False`:
- Shop places total quantity for a product (e.g., CK-001 = 50 pcs)
- AI system auto-distributes ordered quantity across available variants proportionally to current stock ratio or historical sales

### 3. Factory Dispatch Logic

- Factory still sees full variant breakdown internally
- System keeps detailed stock and order distribution
- Dispatch documents will show: Product → Color → Size → Quantity
- Even if shop saw only the total, dispatch will still use the AI distribution result

### 4. Shop Registration & Permissions

New fields added to Shop table:

| Field | Type | Description |
|-------|------|-------------|
| `showVariantDetails` | Boolean | Enables/disables detailed variant view |
| `maxVisibleVariants` | Integer (default 1000) | Caps total visible variants per shop to prevent UI overload |
| `aiDistributionMode` | Enum(proportional, equal, manual_override) | Defines how AI allocates when variants are hidden |

## Example System Behavior Flow

### Step 1: Factory uploads products & variants
→ 1000 variants (CK, CL, etc.)

### Step 2: Factory sets Shop A to `showVariantDetails = False`
→ Shop A sees only CK-001 total (200 pcs)

### Step 3: Shop A orders 60 pcs of CK-001
→ AI distributes automatically based on real-time stock ratios

### Step 4: Factory dispatches according to variant-level detail
→ Red/M 30, Blue/L 30

## Technical Implementation

### Database Changes

Added new fields to the `shops` table:
- `show_variant_details` (INTEGER, default 1)
- `max_visible_variants` (INTEGER, default 1000)
- `ai_distribution_mode` (TEXT, default 'proportional')

### API Endpoints

1. **GET /api/products/view**
   - Returns products according to shop's visibility settings
   - Aggregates variants when `showVariantDetails` is false

2. **Enhanced GET /api/products**
   - Modified to support shop visibility settings when `shopId` parameter is provided

### AI Distribution Logic

Located in `src/lib/ai-distribution.ts`:
- Proportional distribution based on current stock ratios
- Equal distribution across all variants
- Manual override option (placeholder for future implementation)

### UI Components

1. **RegisterShopDialog** - Added visibility control fields
2. **EditShopDialog** - Added visibility control fields
3. **ShopProductView** - New component that displays products according to shop settings

## Benefits

✅ Reduces confusion for shops
✅ Keeps full data fidelity at factory side
✅ Allows scalable UI for up to 1000 variants
✅ Enables AI-driven smart allocation
✅ Supports role-based product visibility

## Example API Schema

### POST /shop/settings
```json
{
  "shop_id": "SHP-001",
  "show_variant_details": false,
  "max_visible_variants": 1000,
  "ai_distribution_mode": "proportional"
}
```

### GET /products/view
```json
{
  "shop_id": "SHP-001",
  "show_variant_details": false
}
```

### Response (Shop View OFF):
```json
{
  "products": [
    { "product_code": "CK-001", "total_available": 200 }
  ]
}
```

### Response (Shop View ON):
```json
{
  "products": [
    { "product_code": "CK-001", "color": "Red", "size": "M", "available": 100 },
    { "product_code": "CK-001", "color": "Blue", "size": "L", "available": 100 }
  ]
}
```