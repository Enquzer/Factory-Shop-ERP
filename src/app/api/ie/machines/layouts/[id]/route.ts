import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  updateLayout,
  getLayoutById,
  deleteLayout
} from '@/lib/ie-machines';

// GET /api/ie/machines/layouts/[id] - Get layout by ID
export const GET = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const layoutId = parseInt(id);
    
    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }
    
    const layout = await getLayoutById(layoutId);
    
    if (!layout) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }
    
    return NextResponse.json(layout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user', 'planning', 'factory', 'finishing', 'packing', 'store', 'ecommerce', 'marketing']);

// PUT /api/ie/machines/layouts/[id] - Update layout
export const PUT = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const layoutId = parseInt(id);
    
    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const success = await updateLayout(layoutId, body);
    
    if (success) {
      return NextResponse.json({ message: 'Layout updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating layout:', error);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
  }
}, 'ie_admin');

// DELETE /api/ie/machines/layouts/[id] - Delete layout
export const DELETE = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const layoutId = parseInt(id);
    
    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }
    
    const success = await deleteLayout(layoutId);
    
    if (success) {
      return NextResponse.json({ message: 'Layout deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting layout:', error);
    return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
  }
}, 'ie_admin');