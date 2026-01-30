import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// GET /api/store/material-requests - Get all material requests for store review
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only store users can access material requests
    if (user.role !== 'store') {
      return NextResponse.json({ 
        error: `Unauthorized: Store access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const db = await getDB();
    
    // Get all material requests with requester information
    const requests = await db.all(`
      SELECT 
        mr.*,
        u.username as requesterName,
        u.role as requesterRole
      FROM material_requests mr
      JOIN users u ON mr.requesterId = u.id
      ORDER BY mr.requestedDate DESC
    `);
    
    const formattedRequests = requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      fulfilledDate: r.fulfilledDate ? new Date(r.fulfilledDate) : null
    }));
    
    return NextResponse.json(formattedRequests);
    
  } catch (error: any) {
    console.error('Error fetching material requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch material requests' }, { status: 500 });
  }
}

// POST /api/store/material-requests/process - Process material requests (fulfill or create purchase request)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'store') {
      return NextResponse.json({ 
        error: `Unauthorized: Store access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const { requestId, action, quantityFulfilled, notes, createPurchaseRequest } = await request.json();
    
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Get the current request
    const currentRequest = await db.get(
      'SELECT * FROM material_requests WHERE id = ?', 
      [requestId]
    );
    
    if (!currentRequest) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }
    
    if (action === 'fulfill') {
      // Fulfill the request from existing inventory
      await db.run(`
        UPDATE material_requests 
        SET status = 'Fulfilled', 
            fulfilledDate = datetime('now'),
            quantityFulfilled = ?
        WHERE id = ?
      `, [quantityFulfilled || currentRequest.quantity, requestId]);
      
      // Notify the designer
      await createNotification({
        userType: 'designer',
        title: 'Material Request Fulfilled',
        description: `Your request for ${currentRequest.materialName} has been fulfilled from store inventory.`,
        href: '/designer/material-requests'
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Material request fulfilled successfully' 
      });
      
    } else if (action === 'purchase') {
      // Create a purchase request for this material
      if (createPurchaseRequest) {
        const purchaseId = `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // First, check if the material exists in the raw materials registry
        let materialId = 'NEW';
        let materialExists = false;
        
        try {
          const db = await getDB();
          const existingMaterial = await db.get(
            'SELECT id FROM raw_materials WHERE name = ?', 
            [currentRequest.materialName]
          );
          
          if (existingMaterial) {
            materialId = existingMaterial.id;
            materialExists = true;
          }
        } catch (lookupError) {
          console.log('Error looking up existing material:', lookupError);
        }
        
        await db.run(`
          INSERT INTO purchase_requests 
          (id, materialId, quantity, reason, status, requesterId, requestedDate)
          VALUES (?, ?, ?, ?, 'Pending', ?, datetime('now'))
        `, [
          purchaseId,
          materialId, // Use the found materialId or 'NEW'
          currentRequest.quantity,
          `Requested by Store for Designer: ${currentRequest.reason || 'Material request from designer'}`,
          user.id.toString()
        ]);
        
        // Link the material request to the purchase request
        await db.run(`
          UPDATE material_requests 
          SET status = 'Purchase Requested',
              purchaseRequestId = ?
          WHERE id = ?
        `, [purchaseId, requestId]);
        
        // Notify Finance
        await createNotification({
          userType: 'finance',
          title: 'New Purchase Request',
          description: `Store has requested purchase of ${currentRequest.quantity} units of ${currentRequest.materialName} for designer request.`,
          href: '/finance/purchase-requests'
        });
        
        // Notify Designer
        await createNotification({
          userType: 'designer',
          title: 'Purchase Request Created',
          description: `Your material request for ${currentRequest.materialName} has been forwarded to Finance for purchasing.`,
          href: '/designer/material-requests'
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Purchase request created successfully',
          purchaseId
        });
      }
    }
    
    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error processing material request:', error);
    return NextResponse.json({ error: error.message || 'Failed to process material request' }, { status: 500 });
  }
}