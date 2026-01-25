
import { NextResponse, NextRequest } from 'next/server';
import { getStyleSpecifications, saveStyleSpecification, deleteStyleSpecification } from '@/lib/styles-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const specs = await getStyleSpecifications(params.id);
    return NextResponse.json(specs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch specifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const spec = await saveStyleSpecification(params.id, data);
    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error saving specification:', error);
    return NextResponse.json({ error: 'Failed to save specification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await authenticateRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await deleteStyleSpecification(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
