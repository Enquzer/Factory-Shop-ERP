import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/debug/purchase-requests - Debug endpoint to check purchase request statuses
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDb();
    
    // Get all purchase requests with their current status
    const requests = await db.all(`
      SELECT 
        id,
        materialId,
        quantity,
        reason,
        status,
        requesterId,
        requestedDate,
        approvedDate,
        orderedDate,
        receivedDate
      FROM purchase_requests
      ORDER BY requestedDate DESC
    `);
    
    // Get distinct statuses
    const statuses = await db.all(`SELECT DISTINCT status FROM purchase_requests`);
    
    return NextResponse.json({
      totalRequests: requests.length,
      statuses: statuses.map((s: any) => s.status),
      requests: requests.map((r: any) => ({
        ...r,
        requestedDate: new Date(r.requestedDate),
        approvedDate: r.approvedDate ? new Date(r.approvedDate) : null,
        orderedDate: r.orderedDate ? new Date(r.orderedDate) : null,
        receivedDate: r.receivedDate ? new Date(r.receivedDate) : null
      }))
    });
  } catch (error) {
    console.error('Error debugging purchase requests:', error);
    return NextResponse.json({ error: 'Failed to debug purchase requests' }, { status: 500 });
  }
}

// POST /api/debug/purchase-requests - Fix request statuses
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user || user.role !== 'finance') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDb();
    
    // Fix any requests that might have NULL or empty status
    await db.run(`
      UPDATE purchase_requests 
      SET status = 'Pending' 
      WHERE status IS NULL OR status = '' OR status NOT IN ('Pending', 'Approved', 'Ordered', 'Received', 'Rejected')
    `);
    
    const updatedCount = (await db.get('SELECT changes() as count')).count;
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${updatedCount} purchase requests with invalid statuses`,
      updatedCount
    });
  } catch (error) {
    console.error('Error fixing purchase requests:', error);
    return NextResponse.json({ error: 'Failed to fix purchase requests' }, { status: 500 });
  }
}