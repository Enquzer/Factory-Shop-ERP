
import { NextRequest, NextResponse } from 'next/server';
import { getStyleById, updateStyle } from '@/lib/styles-sqlite';

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
