import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth, authenticateRequest } from '@/lib/auth-middleware';
import { getCuttingRecordsFromDB, createCuttingRecordFromDB, getCuttingOrderSummaryFromDB } from '@/lib/cutting';
import { getMarketingOrderByIdFromDB } from '@/lib/marketing-orders';

// GET /api/cutting - Get all cutting records
async function handleGet(req: NextRequest, user: any) {
  try {
    console.log('handleGet called for user:', user.username);
    const records = await getCuttingRecordsFromDB();
    console.log('Fetched cutting records count:', records.length);
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in handleGet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cutting records' },
      { status: 500 }
    );
  }
}

// POST /api/cutting - Create new cutting record
async function handlePost(req: NextRequest, user: any) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details
    const order = await getMarketingOrderByIdFromDB(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order has available quantity for cutting
    const cuttingSummary = await getCuttingOrderSummaryFromDB(orderId);
    if (cuttingSummary.balanceQuantity <= 0) {
      return NextResponse.json(
        { error: `Order ${order.orderNumber} has no remaining quantity to cut. Already cut: ${cuttingSummary.totalCutQuantity}/${cuttingSummary.totalOrderQuantity}` },
        { status: 400 }
      );
    }

    // Create cutting record with order items
    const recordId = await createCuttingRecordFromDB(
      orderId,
      order.orderNumber,
      order.productCode,
      order.productName,
      order.imageUrl,
      order.items,
      user.username
    );

    return NextResponse.json({ 
      id: recordId, 
      success: true,
      orderSummary: cuttingSummary
    });
  } catch (error) {
    console.error('Error creating cutting record:', error);
    return NextResponse.json(
      { error: 'Failed to create cutting record' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  console.log('GET /api/cutting started');
  const user = await authenticateRequest(req);
  console.log('User authenticated for /api/cutting:', user ? user.username : 'NULL');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow factory, cutting, planning roles
  if (!user.hasRole(['factory', 'cutting', 'planning', 'sewing', 'quality_inspection'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return handleGet(req, user);
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only factory and cutting roles can create cutting records
  if (!user.hasRole(['factory', 'cutting'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return handlePost(req, user);
}
