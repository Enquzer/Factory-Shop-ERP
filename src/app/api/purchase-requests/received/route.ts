import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/purchase-requests/received - Get recently received purchase requests for Store registration
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only store users can access received requests for registration
    if (user.role !== 'store') {
      return NextResponse.json({ 
        error: `Unauthorized: Store access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const db = await getDb();
    
    // Get recently received purchase requests (last 30 days) that need stock registration
    // Exclude requests that have already been registered in inventory (status = 'Registered')
    const requests = await db.all(`
      SELECT 
        pr.*,
        rm.name as materialName,
        rm.unitOfMeasure,
        rm.category,
        u.username as requesterUsername
      FROM purchase_requests pr
      LEFT JOIN raw_materials rm ON pr.materialId = rm.id
      LEFT JOIN users u ON pr.requesterId = u.id
      WHERE pr.status = 'Received' 
      AND pr.receivedDate >= datetime('now', '-30 days')
      AND pr.status != 'Registered'
      ORDER BY pr.receivedDate DESC
    `);
    
    const formattedRequests = requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      approvedDate: r.approvedDate ? new Date(r.approvedDate) : undefined,
      orderedDate: r.orderedDate ? new Date(r.orderedDate) : undefined,
      receivedDate: new Date(r.receivedDate)
    }));
    
    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching received purchase requests:', error);
    return NextResponse.json({ error: 'Failed to fetch received requests' }, { status: 500 });
  }
}