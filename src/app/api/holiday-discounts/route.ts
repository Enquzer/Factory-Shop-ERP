import { NextRequest } from 'next/server';
import { 
  createHolidayDiscount as createHolidayDiscountDB,
  getHolidayDiscounts as getHolidayDiscountsDB,
  getHolidayDiscountById as getHolidayDiscountByIdDB,
  updateHolidayDiscount as updateHolidayDiscountDB,
  deleteHolidayDiscount as deleteHolidayDiscountDB,
  applyHolidayDiscountToProducts as applyHolidayDiscountToProductsDB,
  removeHolidayDiscountFromProducts
} from '@/lib/holiday-discounts-sqlite';
import { HolidayDiscount, CreateHolidayDiscountInput, UpdateHolidayDiscountInput, ApplyHolidayDiscountInput } from '@/lib/holiday-discounts';

// GET /api/holiday-discounts - Get all holiday discounts
export async function GET(request: NextRequest) {
  try {
    const discounts = await getHolidayDiscountsDB();
    return new Response(JSON.stringify(discounts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching holiday discounts:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch holiday discounts' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST /api/holiday-discounts - Create a new holiday discount
export async function POST(request: NextRequest) {
  try {
    const data: CreateHolidayDiscountInput = await request.json();
    
    // Validate required fields
    if (!data.name || !data.startDate || !data.endDate || data.discountPercentage === undefined) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: name, startDate, endDate, or discountPercentage' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate discount percentage
    if (data.discountPercentage < 0 || data.discountPercentage > 100) {
      return new Response(
        JSON.stringify({ success: false, message: 'Discount percentage must be between 0 and 100' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid date format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ success: false, message: 'End date must be after start date' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const discount = await createHolidayDiscountDB(data);
    
    if (!discount) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create holiday discount' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Holiday discount created successfully', data: discount }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating holiday discount:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to create holiday discount' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/holiday-discounts - Update a holiday discount
export async function PUT(request: NextRequest) {
  try {
    const data: UpdateHolidayDiscountInput = await request.json();
    
    // Validate required fields
    if (!data.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required field: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate discount percentage if provided
    if (data.discountPercentage !== undefined && (data.discountPercentage < 0 || data.discountPercentage > 100)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Discount percentage must be between 0 and 100' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate dates if provided
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid date format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (startDate > endDate) {
        return new Response(
          JSON.stringify({ success: false, message: 'End date must be after start date' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const discount = await updateHolidayDiscountDB(data);
    
    if (!discount) {
      return new Response(
        JSON.stringify({ success: false, message: 'Holiday discount not found or failed to update' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Holiday discount updated successfully', data: discount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating holiday discount:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to update holiday discount' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/holiday-discounts/[id] - Delete a holiday discount (handled by dynamic route)