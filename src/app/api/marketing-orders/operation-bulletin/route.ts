import { NextResponse, NextRequest } from 'next/server';
import { getOperationBulletinFromDB, saveOperationBulletinInDB } from '@/lib/marketing-orders';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || undefined;
    const productCode = searchParams.get('productCode') || undefined;

    if (!orderId && !productCode) {
      return NextResponse.json({ error: 'orderId or productCode required' }, { status: 400 });
    }

    const items = await getOperationBulletinFromDB(orderId, productCode);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error in OB GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items, orderId, productCode } = await request.json();

    if (!items || (!orderId && !productCode)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await saveOperationBulletinInDB(items, orderId, productCode);
    if (success) {
      return NextResponse.json({ message: 'Operation bulletin saved' });
    } else {
      return NextResponse.json({ error: 'Failed to save operation bulletin' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in OB POST route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
