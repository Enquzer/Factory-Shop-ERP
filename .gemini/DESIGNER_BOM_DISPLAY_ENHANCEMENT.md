# Designer BOM Display Enhancement

## Feature Update

### Problem

When designer BOM items were loaded into the "Modify BOM for Order" dialog, planners could only see dropdown menus. They couldn't see what the designer originally selected for Material Type and Material Name, making it difficult to understand the designer's intent.

### Solution

Modified the BOM table to show designer's original selections prominently while still allowing changes if needed.

## Changes Made

**File**: `src/components/production/bom-modification-dialog.tsx`

### Visual Design

#### For Designer BOM Items:

- **Type Column**: Shows designer's selection as bold text with a small dropdown to change if needed
- **Material Name Column**: Shows designer's selection as bold text with a small dropdown to change if needed
- **Badge**: "Designer's Selection" badge in blue to clearly identify designer items

#### For Planner-Added Items:

- Standard dropdown menus (unchanged behavior)

### Example Display

```
Type Column (Designer Item):
┌─────────────────────────┐
│ Fabric     [▼ Fabric]   │  ← Bold text + small dropdown
└─────────────────────────┘

Material Name Column (Designer Item):
┌──────────────────────────────────────┐
│ Cotton Poplin 100%  [▼ Cotton Pop...]│  ← Bold text + small dropdown
│ 🏷️ Designer's Selection              │  ← Blue badge
└──────────────────────────────────────┘

Type Column (Planner Item):
┌─────────────────────────┐
│ [▼ Select Type...]      │  ← Standard dropdown
└─────────────────────────┘
```

## Benefits

1. **Clear Visibility**: Planners can immediately see what the designer specified
2. **Flexibility**: Small dropdown allows changes if needed (e.g., material substitution)
3. **Traceability**: "Designer's Selection" badge makes it clear which items came from designer
4. **Better Communication**: Reduces confusion between designer intent and planner modifications

## User Experience

### Before:

- Planner sees only dropdowns
- Can't tell what designer originally selected
- Must guess or ask designer about material choices

### After:

- Planner sees designer's selection prominently displayed
- Can understand designer's intent immediately
- Can still change if needed (e.g., material unavailable)
- Clear visual distinction between designer and planner items

## Technical Details

- Uses conditional rendering based on `item.fromDesigner` flag
- Designer items show text + small dropdown (w-20 or w-32)
- Planner items show full-width dropdown (w-full)
- Badge text changed from "Designer BOM" to "Designer's Selection" for clarity
