# Pad Number Implementation Summary

## Overview
This implementation adds sequential pad numbers for raw material issues to production and finished goods distribution to shops, with auto-increment and manual update capabilities using alphanumeric format.

## Features Implemented

### 1. Database Schema Changes
- Added `padNumber`, `padSequence`, `padPrefix`, and `padFormat` columns to:
  - `material_requisitions` table (for raw material issues)
  - `orders` table (for finished goods distribution)
- Created `pad_number_sequences` table for tracking current sequences

### 2. Core Logic
- **Pad Number Generator Service** (`src/lib/pad-number-generator.ts`):
  - Auto-generates sequential pad numbers
  - Supports manual pad number updates
  - Manages separate sequences for material requisitions and shop orders
  - Handles alphanumeric formatting with configurable prefixes

### 3. Configuration Management
- **Pad Number Configuration** (`src/lib/pad-number-config.ts`):
  - Configurable prefixes: "RM" for materials, "FG" for finished goods
  - Format patterns: "PREFIX-SEQUENCE" and "PREFIX-SHOPID-SEQUENCE"
  - Minimum sequence length with leading zeros
  - Validation and parsing utilities

### 4. API Endpoints
- **Pad Number Management API** (`src/app/api/pad-numbers/route.ts`):
  - `GET /api/pad-numbers` - Get current sequences
  - `POST /api/pad-numbers/generate` - Generate next pad number
  - `PUT /api/pad-numbers/{id}` - Manual pad number update
  - `PATCH /api/pad-numbers/reset` - Reset sequence (admin only)

### 5. UI Components
- **Pad Number Display Component** (`src/components/pad-number-display.tsx`):
  - Reusable component for displaying pad numbers
  - Copy to clipboard functionality
  - Edit mode for authorized users
  - Format validation and user-friendly display

### 6. Integration Points
- **Material Requisitions** (`src/lib/bom.ts`):
  - Auto-generates pad numbers when materials are issued
  - Stores pad numbers in requisition records
  - Updates `issueMaterial` function to include pad number generation

- **Order Dispatch** (`src/app/api/orders/[id]/dispatch/route.ts`):
  - Auto-generates pad numbers when orders are dispatched
  - Stores pad numbers in order records with shop-specific sequences
  - Integrated with existing dispatch workflow

### 7. UI Updates
- **Store Issue Page** (`src/app/(app)/store/issue/page.tsx`):
  - Added Pad Number column to requisitions table
  - Inline editing capabilities for store users
  - Real-time display of generated pad numbers

- **Order Dispatch Page** (`src/app/(app)/store/orders/[id]/page.tsx`):
  - Added pad number display in order details sidebar
  - Editable pad number field for authorized users
  - Integration with existing order information display

## How It Works

### Material Requisitions (Raw Materials to Production)
1. When a material requisition is created, no pad number is assigned initially
2. When materials are issued from store to production:
   - Pad number is automatically generated (e.g., "RM-00001")
   - Sequence is incremented and stored
   - Pad number is saved with the requisition record
3. Users can manually edit pad numbers if needed

### Finished Goods Distribution (Factory to Shops)
1. When an order is created, no pad number is assigned initially
2. When order is dispatched from factory to shop:
   - Pad number is automatically generated with shop code (e.g., "FG-SHO-001")
   - Separate sequence maintained for each shop
   - Pad number is saved with the order record
3. Users can manually edit pad numbers if needed

## Security & Authorization
- Only authorized users can generate pad numbers:
  - Store, factory, and admin roles for generation
  - Only store and admin roles for manual updates
  - Admin-only access for sequence reset
- Shop users can only access their own shop's sequences

## Testing
- Unit tests verify pad number generation logic
- Integration tests confirm workflow integration
- API endpoint examples provided for manual testing

## Usage Examples

### Generate Material Requisition Pad Number
```typescript
const padResult = await padNumberGenerator.generateNext('material');
// Returns: { number: "RM-00001", sequence: 1 }
```

### Generate Finished Goods Pad Number for Shop
```typescript
const padResult = await padNumberGenerator.generateNext('finished', 'SHP-001');
// Returns: { number: "FG-SHO-001", sequence: 1 }
```

### API Requests
```bash
# Get current sequences
GET /api/pad-numbers?type=material

# Generate new pad number
POST /api/pad-numbers/generate
{
  "type": "finished",
  "shopId": "SHP-001"
}

# Manual update
PUT /api/pad-numbers/REQ-123
{
  "type": "material",
  "newNumber": "RM-00123",
  "recordId": "REQ-123"
}
```

## Configuration
Default configurations:
- **Materials**: Prefix "RM", format "PREFIX-SEQUENCE", 5-digit minimum
- **Finished Goods**: Prefix "FG", format "PREFIX-SHOPID-SEQUENCE", 4-digit minimum

These can be customized in `src/lib/pad-number-config.ts`.