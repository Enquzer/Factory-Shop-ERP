
import { NextRequest, NextResponse } from 'next/server';
import { updateMarketingOrderComponentInDB } from '@/lib/marketing-orders';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(
  req: NextRequest, 
  { params }: { params: { id: string, compId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const componentId = parseInt(params.compId);
    
    if (isNaN(componentId)) {
      return NextResponse.json({ error: 'Invalid component ID' }, { status: 400 });
    }

    const success = await updateMarketingOrderComponentInDB(componentId, data);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating marketing order component:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
