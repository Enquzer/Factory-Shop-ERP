import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/purchase-requests/my-requests - Get purchase requests made by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only store and planning users can access their own requests
    if (user.role !== 'store' && user.role !== 'planning') {
      return NextResponse.json({ 
        error: `Unauthorized: Store or Planning access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const db = await getDb();
    
    // Get purchase requests made by this specific user
    const requests = await db.all(`
      SELECT 
        pr.*,
        rm.name as materialName,
        rm.unitOfMeasure,
        rm.costPerUnit,
        rm.supplier
      FROM purchase_requests pr
      LEFT JOIN raw_materials rm ON pr.materialId = rm.id
      WHERE pr.requesterId = ?
      ORDER BY pr.requestedDate DESC
    `, [user.id.toString()]);
    
    const formattedRequests = requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      approvedDate: r.approvedDate ? new Date(r.approvedDate) : undefined,
      orderedDate: r.orderedDate ? new Date(r.orderedDate) : undefined,
      receivedDate: r.receivedDate ? new Date(r.receivedDate) : undefined
    }));
    
    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching user purchase requests:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase requests' }, { status: 500 });
  }
}