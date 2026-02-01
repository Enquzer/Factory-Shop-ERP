import { NextRequest, NextResponse } from 'next/server';
import { getStyleById, updateStyle, deleteStyle } from '@/lib/styles-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const style = await getStyleById(params.id);
  if (!style) {
    return NextResponse.json({ error: 'Style not found' }, { status: 404 });
  }
  return NextResponse.json(style);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const success = await updateStyle(params.id, data);
    if (!success) {
        return NextResponse.json({ error: 'Failed to update style' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const style = await getStyleById(params.id);
    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    const isDesigner = user.role === 'designer';
    const isFactory = user.role === 'factory';
    const isAdmin = user.role === 'admin';

    // Rule: Designer can delete unapproved styles.
    // Rule: Approved styles can only be removed by factory users or admins.
    
    if (isDesigner && style.sampleApproved) {
      return NextResponse.json({ 
        error: 'Approved designs cannot be deleted by designers. Only factory users can remove approved styles.' 
      }, { status: 403 });
    }

    if (!isDesigner && !isFactory && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const success = await deleteStyle(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete style' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
