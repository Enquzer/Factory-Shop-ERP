
import { NextRequest, NextResponse } from 'next/server';
import { logProductionActivity, getProductionHistory, getOrderBalance } from '@/lib/production-ledger';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const db = await import('@/lib/db').then(mod => mod.getDb());
    
    // Get Order Details (Quantity, ProductCode)
    const order = await db.get('SELECT quantity, productCode FROM marketing_orders WHERE id = ?', orderId);
    
    // Get Component Details
    let components = [];
    if (order) {
        const style = await db.get('SELECT components FROM styles WHERE number = ?', order.productCode);
        if (style && style.components) {
            try {
                components = JSON.parse(style.components);
            } catch (e) {
                console.error("Error parsing components JSON", e);
            }
        }
    }

    const history = await getProductionHistory(orderId);
    const balance = await getOrderBalance(orderId);

    return NextResponse.json({ 
        history, 
        balance, 
        components, 
        orderQuantity: order?.quantity || 0 
    });
  } catch (error) {
    console.error('Error fetching production data:', error);
    return NextResponse.json({ error: 'Failed to fetch production data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { componentName, processType, quantity, notes } = body;

    if (!componentName || !processType || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const entryId = await logProductionActivity({
      orderId: params.id,
      componentName,
      processType,
      quantity: Number(quantity),
      userId: user.username,
      notes
    });

    return NextResponse.json({ success: true, entryId });
  } catch (error: any) {
    console.error('Error logging production activity:', error);
    return NextResponse.json({ error: error.message || 'Failed to log activity' }, { status: 500 });
  }
}
