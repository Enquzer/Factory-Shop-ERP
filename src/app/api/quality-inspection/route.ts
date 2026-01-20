import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, withRoleAuth } from '@/lib/auth-middleware';
import { saveQualityInspectionInDB, getQualityInspectionsFromDB } from '@/lib/marketing-orders';

// GET /api/quality-inspection?orderId=...
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const inspections = await getQualityInspectionsFromDB(orderId);
    return NextResponse.json(inspections);
  } catch (error: any) {
    console.error('Error fetching quality inspections:', error);
    return NextResponse.json({ error: 'Failed to fetch quality inspections' }, { status: 500 });
  }
}

// POST /api/quality-inspection
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Quality Inspection, Production, or Admin
    const allowedRoles = ['quality_inspection', 'factory', 'planning'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inspectionData = await request.json();
    
    // Validate required fields
    if (!inspectionData.orderId || !inspectionData.date || !inspectionData.stage || !inspectionData.status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attach inspectorId
    inspectionData.inspectorId = user.username;

    const success = await saveQualityInspectionInDB(inspectionData);
    
    if (success) {
      return NextResponse.json({ message: 'Quality inspection saved successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to save quality inspection' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error saving quality inspection:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
