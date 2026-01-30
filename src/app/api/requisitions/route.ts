
import { NextResponse, NextRequest } from 'next/server';
import { getMaterialRequisitionsForOrder } from '@/lib/bom';
import { getDb } from '@/lib/db';
import { authenticateRequest, UserRole } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }
    
    // Check if user has allowed roles for viewing requisitions
    const allowedRoles: UserRole[] = ['store', 'factory', 'planning', 'marketing', 'cutting', 'sewing'];
    if (!user.hasRole(allowedRoles)) {
      return NextResponse.json({ 
        error: `Unauthorized: Access required for one of: ${allowedRoles.join(', ')}. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    const db = await getDb();
    
    let query = `
      SELECT r.*, rm.name as materialName, rm.unitOfMeasure, rm.currentBalance, mo.orderNumber, mo.productName,
             pr.status as purchaseStatus, pr.id as purchaseId, pr.quantity as purchaseQuantity
      FROM material_requisitions r
      JOIN raw_materials rm ON r.materialId = rm.id
      JOIN marketing_orders mo ON r.orderId = mo.id
      LEFT JOIN purchase_requests pr ON r.id = pr.requisitionId
    `;
    const params: any[] = [];

    if (orderId) {
      query += ` WHERE r.orderId = ?`;
      params.push(orderId);
    } else if (status) {
      query += ` WHERE r.status = ?`;
      params.push(status);
    } else {
      // Default to pending for store
      query += ` WHERE r.status != 'Completed'`;
    }

    query += ` ORDER BY r.requestedDate DESC`;

    const requisitions = await db.all(query, params);
    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
