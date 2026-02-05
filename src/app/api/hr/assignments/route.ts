
import { NextRequest, NextResponse } from 'next/server';
import { assignOperator, getAssignmentsForOrder } from '@/lib/hr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId parameter is required' }, { status: 400 });
    }
    
    const assignments = await getAssignmentsForOrder(orderId);
    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error in GET /api/hr/assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json(); // Array or single object? Let's handle single for now.
    const id = await assignOperator(data);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error in POST /api/hr/assignments:', error);
    return NextResponse.json({ error: 'Failed to assign operator' }, { status: 500 });
  }
}
