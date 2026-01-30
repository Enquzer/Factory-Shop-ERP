import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// POST /api/designer/material-requests - Designer requests materials from Store
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only designers can request materials from store
    if (user.role !== 'designer') {
      return NextResponse.json({ 
        error: `Unauthorized: Designer access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const { materialName, quantity, reason, projectId } = await request.json();
    
    if (!materialName || !quantity) {
      return NextResponse.json({ error: 'Material name and quantity are required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Ensure material_requests table exists
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS material_requests (
          id TEXT PRIMARY KEY,
          requesterId TEXT NOT NULL,
          materialName TEXT NOT NULL,
          quantity REAL NOT NULL,
          reason TEXT,
          projectId TEXT,
          status TEXT DEFAULT 'Pending',
          requestedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          fulfilledDate DATETIME,
          purchaseRequestId TEXT,
          FOREIGN KEY (requesterId) REFERENCES users(id),
          FOREIGN KEY (purchaseRequestId) REFERENCES purchase_requests(id)
        )
      `);
      
      // Add indexes
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_material_requests_requester 
        ON material_requests(requesterId)
      `);
      
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_material_requests_status 
        ON material_requests(status)
      `);
    } catch (tableError) {
      console.log('Table already exists or error creating table:', tableError);
    }
    
    // Create a material request for the store
    const requestId = `DMR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await db.run(`
      INSERT INTO material_requests 
      (id, requesterId, materialName, quantity, reason, projectId, status, requestedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      requestId,
      user.id.toString(),
      materialName,
      quantity,
      reason || 'Requested by designer',
      projectId || null,
      'Pending'
    ]);
    
    // Create notification for Store users
    await createNotification({
      userType: 'store',
      title: 'New Designer Material Request',
      description: `Designer ${user.username} has requested ${quantity} units of ${materialName}`,
      href: '/store/material-requests'
    });
    
    console.log(`Designer material request created by ${user.username}: ${materialName} x${quantity}`);
    
    return NextResponse.json({ 
      success: true, 
      requestId,
      message: 'Material request sent to Store department successfully'
    });
    
  } catch (error: any) {
    console.error('Error creating designer material request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create material request' }, { status: 500 });
  }
}

// GET /api/designer/material-requests - Get designer's material requests
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'designer') {
      return NextResponse.json({ 
        error: `Unauthorized: Designer access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const db = await getDB();
    
    // Get material requests made by this designer
    const requests = await db.all(`
      SELECT 
        mr.*,
        u.username as requesterName
      FROM material_requests mr
      JOIN users u ON mr.requesterId = u.id
      WHERE mr.requesterId = ?
      ORDER BY mr.requestedDate DESC
    `, [user.id.toString()]);
    
    const formattedRequests = requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      fulfilledDate: r.fulfilledDate ? new Date(r.fulfilledDate) : null
    }));
    
    return NextResponse.json(formattedRequests);
    
  } catch (error: any) {
    console.error('Error fetching designer material requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch material requests' }, { status: 500 });
  }
}