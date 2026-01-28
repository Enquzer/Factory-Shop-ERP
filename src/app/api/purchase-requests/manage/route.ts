import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { logAuditEntry } from '@/lib/audit-logger';
import { createNotification } from '@/lib/notifications';

// POST /api/purchase-requests/manage - Manage purchase requests (approve/reject/order/receive)
export async function POST(request: NextRequest) {
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
    
    const { requestId, action, notes, costPerUnit, supplier } = await request.json();
    
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Get the current request
    const currentRequest = await db.get(
      'SELECT * FROM purchase_requests WHERE id = ?', 
      [requestId]
    );
    
    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }
    
    // Validate action based on current status
    const validTransitions: Record<string, string[]> = {
      'Pending': ['Approved', 'Rejected'],
      'Approved': ['Ordered'],
      'Ordered': ['Received'],
      'Received': [],
      'Rejected': []
    };
    
    if (!validTransitions[currentRequest.status]?.includes(action)) {
      return NextResponse.json({ 
        error: `Cannot ${action.toLowerCase()} a request with status '${currentRequest.status}'` 
      }, { status: 400 });
    }
    
    let updateFields = '';
    const updateValues: any[] = [];
    
    // Build update query based on action
    switch (action) {
      case 'Approved':
        updateFields = 'status = ?, approvedDate = ?, costPerUnit = ?, supplier = ?';
        updateValues.push('Approved', new Date().toISOString(), costPerUnit || null, supplier || null);
        break;
        
      case 'Rejected':
        updateFields = 'status = ?, rejectionReason = ?';
        updateValues.push('Rejected', notes || null);
        break;
        
      case 'Ordered':
        updateFields = 'status = ?, orderedDate = ?, costPerUnit = ?, supplier = ?';
        updateValues.push('Ordered', new Date().toISOString(), costPerUnit || null, supplier || null);
        break;
        
      case 'Received':
        updateFields = 'status = ?, receivedDate = ?';
        updateValues.push('Received', new Date().toISOString());
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Add notes if provided
    if (notes) {
      updateFields += ', notes = ?';
      updateValues.push(notes);
    }
    
    updateValues.push(requestId);
    
    // Update the purchase request
    await db.run(
      `UPDATE purchase_requests SET ${updateFields} WHERE id = ?`,
      updateValues
    );
    
    // Log the action
    await logAuditEntry({
      userId: user.id,
      username: user.username,
      action: `purchase_request_${action.toLowerCase()}`,
      resourceType: 'purchase_request',
      resourceId: requestId,
      details: `Purchase request ${action.toLowerCase()}d. Notes: ${notes || 'None'}`
    });
    
    // Get updated request for response
    const updatedRequest = await db.get(
      `SELECT pr.*, rm.name as materialName, u.username as requesterUsername
       FROM purchase_requests pr
       LEFT JOIN raw_materials rm ON pr.materialId = rm.id
       LEFT JOIN users u ON pr.requesterId = u.id
       WHERE pr.id = ?`,
      [requestId]
    );
    
    // Send notifications to relevant teams (Factory, Planning, Store only)
    if (updatedRequest) {
      try {
        // Get requester info
        const requester = await db.get(
          'SELECT username, role FROM users WHERE id = ?', 
          [currentRequest.requesterId]
        );
        
        // Define which user types should receive notifications
        const notificationRecipients: Array<{userType: string, title: string, description: string, href: string}> = [];
        
        // Always notify the requester if they are Factory, Planning, or Store
        if (requester && ['factory', 'planning', 'store'].includes(requester.role)) {
          let requesterTitle = '';
          let requesterDescription = '';
          let requesterHref = '';
          
          switch (action) {
            case 'Approved':
              requesterTitle = 'Purchase Request Approved';
              requesterDescription = `Your purchase request for ${updatedRequest.materialName || 'materials'} has been approved by Finance. Estimated cost: ${(costPerUnit * currentRequest.quantity).toFixed(2)} ETB from ${supplier || 'supplier'}.`;
              requesterHref = requester.role === 'store' ? '/store/issue' : '/';
              break;
              
            case 'Rejected':
              requesterTitle = 'Purchase Request Rejected';
              requesterDescription = `Your purchase request for ${updatedRequest.materialName || 'materials'} has been rejected. Reason: ${notes || 'No reason provided'}.`;
              requesterHref = requester.role === 'store' ? '/store/issue' : '/';
              break;
              
            case 'Ordered':
              requesterTitle = 'Purchase Request Ordered';
              requesterDescription = `Your approved purchase request for ${updatedRequest.materialName || 'materials'} has been sent to supplier ${supplier || 'N/A'}.`;
              requesterHref = requester.role === 'store' ? '/store/issue' : '/';
              break;
              
            case 'Received':
              requesterTitle = 'Purchase Request Fulfilled';
              requesterDescription = `Your purchase request for ${updatedRequest.materialName || 'materials'} has been received and added to inventory.`;
              requesterHref = requester.role === 'store' ? '/store/inventory' : '/';
              break;
          }
          
          if (requesterTitle) {
            notificationRecipients.push({
              userType: requester.role,
              title: requesterTitle,
              description: requesterDescription,
              href: requesterHref
            });
          }
        }
        
        // Always notify Factory team about all purchase request status changes
        let factoryTitle = '';
        let factoryDescription = '';
        
        switch (action) {
          case 'Approved':
            factoryTitle = 'Purchase Request Approved';
            factoryDescription = `Purchase request for ${updatedRequest.materialName || 'materials'} (Qty: ${currentRequest.quantity}) has been approved. Estimated cost: ${(costPerUnit * currentRequest.quantity).toFixed(2)} ETB from ${supplier || 'supplier'}. Requested by: ${requester?.username || 'Unknown'}.`;
            break;
            
          case 'Rejected':
            factoryTitle = 'Purchase Request Rejected';
            factoryDescription = `Purchase request for ${updatedRequest.materialName || 'materials'} (Qty: ${currentRequest.quantity}) has been rejected. Reason: ${notes || 'No reason provided'}. Requested by: ${requester?.username || 'Unknown'}.`;
            break;
            
          case 'Ordered':
            factoryTitle = 'Purchase Request Ordered';
            factoryDescription = `Purchase request for ${updatedRequest.materialName || 'materials'} (Qty: ${currentRequest.quantity}) has been ordered from supplier ${supplier || 'N/A'}. Requested by: ${requester?.username || 'Unknown'}.`;
            break;
            
          case 'Received':
            factoryTitle = 'Purchase Request Fulfilled';
            factoryDescription = `Purchase request for ${updatedRequest.materialName || 'materials'} (Qty: ${currentRequest.quantity}) has been received and added to inventory. Requested by: ${requester?.username || 'Unknown'}.`;
            break;
        }
        
        if (factoryTitle) {
          notificationRecipients.push({
            userType: 'factory',
            title: factoryTitle,
            description: factoryDescription,
            href: '/finance/purchase-requests'
          });
        }
        
        // Special handling for Received status - notify Store team specifically
        if (action === 'Received') {
          // Get all Store users to notify about new incoming materials
          const storeUsers = await db.all(`
            SELECT id, username FROM users WHERE role = 'store'
          `);
          
          for (const storeUser of storeUsers) {
            await createNotification({
              userType: 'store' as any,
              title: 'New Raw Material Incoming',
              description: `Purchase request for ${updatedRequest.materialName || 'materials'} (Qty: ${currentRequest.quantity} ${updatedRequest.unitOfMeasure || 'units'}) has been received. Please register this new stock in the raw material inventory. Supplier: ${supplier || 'N/A'}.`,
              href: '/store/receive' // Direct link to receive goods page
            });
          }
          
          console.log(`Notified ${storeUsers.length} Store users about incoming materials`);
        }
        
        // Send all other notifications
        for (const recipient of notificationRecipients) {
          await createNotification({
            userType: recipient.userType as any,
            title: recipient.title,
            description: recipient.description,
            href: recipient.href
          });
        }
        
        console.log(`Sent ${notificationRecipients.length} purchase request notifications to Factory, Planning, and Store users`);
      } catch (notificationError) {
        console.error('Error sending purchase request notifications:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Purchase request ${action.toLowerCase()}d successfully`,
      request: {
        ...updatedRequest,
        requestedDate: new Date(updatedRequest.requestedDate),
        approvedDate: updatedRequest.approvedDate ? new Date(updatedRequest.approvedDate) : undefined,
        orderedDate: updatedRequest.orderedDate ? new Date(updatedRequest.orderedDate) : undefined,
        receivedDate: updatedRequest.receivedDate ? new Date(updatedRequest.receivedDate) : undefined
      }
    });
    
  } catch (error: any) {
    console.error('Error managing purchase request:', error);
    return NextResponse.json({ error: error.message || 'Failed to manage purchase request' }, { status: 500 });
  }
}