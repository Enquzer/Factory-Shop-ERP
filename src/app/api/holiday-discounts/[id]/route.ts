import { NextRequest } from 'next/server';
import { 
  getHolidayDiscountById as getHolidayDiscountByIdDB,
  deleteHolidayDiscount as deleteHolidayDiscountDB
} from '@/lib/holiday-discounts-sqlite';
import { HolidayDiscount } from '@/lib/holiday-discounts';

// GET /api/holiday-discounts/[id] - Get a specific holiday discount
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing holiday discount ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const discount = await getHolidayDiscountByIdDB(id);
    
    if (!discount) {
      return new Response(
        JSON.stringify({ success: false, message: 'Holiday discount not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify(discount), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching holiday discount:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch holiday discount' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/holiday-discounts/[id] - Delete a holiday discount
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing holiday discount ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const success = await deleteHolidayDiscountDB(id);
    
    if (!success) {
      return new Response(
        JSON.stringify({ success: false, message: 'Holiday discount not found or failed to delete' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Holiday discount deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting holiday discount:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to delete holiday discount' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}