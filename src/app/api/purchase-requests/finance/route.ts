import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/purchase-requests/finance - Get all purchase requests for finance review
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'finance') {
      return NextResponse.json({ 
        error: `Unauthorized: Finance access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const db = await getDb();
    
    // Get all purchase requests with detailed information
    const requests = await db.all(`
      SELECT 
        pr.*,
        rm.name as materialName,
        rm.unitOfMeasure,
        rm.costPerUnit,
        rm.supplier,
        u.username as requesterUsername
      FROM purchase_requests pr
      LEFT JOIN raw_materials rm ON pr.materialId = rm.id
      LEFT JOIN users u ON pr.requesterId = u.id
      ORDER BY pr.requestedDate DESC
    `);
    
    const formattedRequests = requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      approvedDate: r.approvedDate ? new Date(r.approvedDate) : undefined,
      orderedDate: r.orderedDate ? new Date(r.orderedDate) : undefined,
      receivedDate: r.receivedDate ? new Date(r.receivedDate) : undefined
    }));
    
    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching purchase requests for finance:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase requests' }, { status: 500 });
  }
}