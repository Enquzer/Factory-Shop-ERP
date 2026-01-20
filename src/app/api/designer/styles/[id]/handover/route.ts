
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updateStyle, getStyleById } from '@/lib/styles-sqlite';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const style = await getStyleById(id);
    
    if (!style) {
        return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    // Update status
    const success = await updateStyle(id, { status: 'Factory Handover' });
    
    if (success) {
        // Create Notification for Factory
        await createNotification({
            userType: 'factory',
            title: 'New Style Handover',
            description: `Designer has submitted style ${style.number} - ${style.name} for approval.`,
            href: `/designer/${id}` 
            // Factory user might need a different view, but accessing the designer page to approve is fine if permissions allow.
            // Currently getting /designer/[id] page fetches data. We assume factory role can view it.
        });

        return NextResponse.json({ success: true, message: "Handover successful" });
    } else {
        return NextResponse.json({ error: 'Failed to update style' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in handover:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
