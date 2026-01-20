import { NextRequest } from 'next/server';
import { applyHolidayDiscountToProducts as applyHolidayDiscountToProductsDB } from '@/lib/holiday-discounts-sqlite';
import { ApplyHolidayDiscountInput } from '@/lib/holiday-discounts';

// POST /api/holiday-discounts/apply - Apply holiday discount to products
export async function POST(request: NextRequest) {
  try {
    const data: ApplyHolidayDiscountInput = await request.json();
    
    // Validate required fields
    if (!data.holidayDiscountId || !data.productIds || !Array.isArray(data.productIds)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: holidayDiscountId or productIds' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate product IDs
    if (data.productIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Product IDs array cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    for (const productId of data.productIds) {
      if (typeof productId !== 'string' || !productId.trim()) {
        return new Response(
          JSON.stringify({ success: false, message: 'All product IDs must be non-empty strings' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const success = await applyHolidayDiscountToProductsDB(data);
    
    if (!success) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to apply holiday discount to products' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Holiday discount applied to products successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error applying holiday discount to products:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to apply holiday discount to products' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}