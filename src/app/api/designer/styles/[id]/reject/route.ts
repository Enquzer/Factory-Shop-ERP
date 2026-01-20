
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updateStyle, getStyleById } from '@/lib/styles-sqlite';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser || authUser.role !== 'factory') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const { reason } = await request.json();
    
    const style = await getStyleById(id);
    if (!style) {
        return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    // Update Status back to Development
    // We could append reason to description or strict rejection notes, but for now just notify.
    await updateStyle(id, { status: 'Development' });

    // Notify Designer
    await createNotification({
        userType: 'designer',
        title: 'Style Rejected',
        description: `Style ${style.number} was rejected by factory. Reason: ${reason}`,
        href: `/designer/${id}`
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error rejecting style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
