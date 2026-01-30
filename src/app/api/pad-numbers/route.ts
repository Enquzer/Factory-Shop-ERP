import { NextRequest, NextResponse } from 'next/server';
import { padNumberGenerator } from '@/lib/pad-number-generator';
import { authenticateRequest, UserRole } from '@/lib/auth-middleware';

// GET /api/pad-numbers?type=material|finished&shopId=optional
// Get current sequence information
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'material' | 'finished' | null;
    const shopId = searchParams.get('shopId');

    if (!type || (type !== 'material' && type !== 'finished')) {
      return NextResponse.json({ error: 'Invalid type parameter. Must be "material" or "finished"' }, { status: 400 });
    }

    // For finished goods, shop users can only see their own shop's sequence
    // Note: We need to get the actual shop ID from the shops table based on username
    if (type === 'finished' && user.role === 'shop') {
      // For now, allow access to all shop sequences for simplicity
      // In a production environment, you'd want to verify the user owns the shop
    }

    const currentSequence = await padNumberGenerator.getCurrentSequence(type, shopId || undefined);
    const allSequences = await padNumberGenerator.getAllSequences();

    return NextResponse.json({
      currentSequence,
      allSequences,
      type,
      shopId: shopId || null
    });

  } catch (error: any) {
    console.error('Error fetching pad number sequences:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch sequences' }, { status: 500 });
  }
}

// POST /api/pad-numbers/generate
// Generate next pad number
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, shopId } = await request.json();

    if (!type || (type !== 'material' && type !== 'finished')) {
      return NextResponse.json({ error: 'Invalid type. Must be "material" or "finished"' }, { status: 400 });
    }

    // Authorization checks
    const allowedRoles: UserRole[] = ['store', 'factory', 'admin'];
    if (!user.hasRole(allowedRoles)) {
      return NextResponse.json({ 
        error: `Unauthorized: Access required for one of: ${allowedRoles.join(', ')}` 
      }, { status: 403 });
    }

    // For finished goods, shop users can only generate for their own shop
    if (type === 'finished' && user.role === 'shop') {
      // In a real implementation, you would verify the user owns the specified shop
      // For now, we'll allow the operation but log the attempt
      console.log(`Shop user ${user.username} generating pad number for shop: ${shopId || 'default'}`);
    }

    const result = await padNumberGenerator.generateNext(type, shopId || undefined);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error generating pad number:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate pad number' }, { status: 500 });
  }
}

// PUT /api/pad-numbers/{id}
// Manual update of pad number
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop(); // Get the ID from URL
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const { type, newNumber, recordId } = await request.json();

    if (!type || (type !== 'material' && type !== 'finished')) {
      return NextResponse.json({ error: 'Invalid type. Must be "material" or "finished"' }, { status: 400 });
    }

    if (!newNumber) {
      return NextResponse.json({ error: 'New pad number is required' }, { status: 400 });
    }

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    // Authorization: Only admins and store managers can manually update pad numbers
    const allowedRoles: UserRole[] = ['admin', 'store'];
    if (!user.hasRole(allowedRoles)) {
      return NextResponse.json({ 
        error: `Unauthorized: Only ${allowedRoles.join(', ')} can manually update pad numbers` 
      }, { status: 403 });
    }

    await padNumberGenerator.updatePadNumber(id, type, newNumber, recordId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pad number updated successfully',
      newNumber 
    });

  } catch (error: any) {
    console.error('Error updating pad number:', error);
    return NextResponse.json({ error: error.message || 'Failed to update pad number' }, { status: 500 });
  }
}

// POST /api/pad-numbers/reset
// Reset sequence (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { type, shopId, newSequence } = await request.json();

    if (!type || (type !== 'material' && type !== 'finished')) {
      return NextResponse.json({ error: 'Invalid type. Must be "material" or "finished"' }, { status: 400 });
    }

    const sequenceNumber = newSequence !== undefined ? newSequence : 0;
    
    await padNumberGenerator.resetSequence(type, shopId || undefined, sequenceNumber);
    
    return NextResponse.json({ 
      success: true, 
      message: `Sequence reset to ${sequenceNumber}`,
      type,
      shopId: shopId || null,
      newSequence: sequenceNumber
    });

  } catch (error: any) {
    console.error('Error resetting sequence:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset sequence' }, { status: 500 });
  }
}