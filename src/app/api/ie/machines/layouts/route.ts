import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getLayouts,
  createLayout,
  updateLayout
} from '@/lib/ie-machines';

// GET /api/ie/machines/layouts - Get all layouts
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || undefined;
    
    const layouts = await getLayouts(orderId);
    return NextResponse.json({ data: layouts });
  } catch (error) {
    console.error('Error fetching layouts:', error);
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/machines/layouts - Create new layout
export const POST = withRoleAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { layoutName, orderId, productCode, section, machinePositions } = body;
    
    // Validate required fields
    if (!layoutName || !section) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newLayoutId = await createLayout({
      layoutName,
      orderId: orderId || '',
      productCode: productCode || '',
      section,
      machinePositions: machinePositions || [],
      createdBy: user.username
    });
    
    return NextResponse.json({ id: newLayoutId, message: 'Layout created successfully' });
  } catch (error) {
    console.error('Error creating layout:', error);
    return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
  }
}, 'ie_admin');