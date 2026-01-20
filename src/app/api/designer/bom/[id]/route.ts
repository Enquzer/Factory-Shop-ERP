
import { NextRequest, NextResponse } from 'next/server';
import { updateBOMItem, deleteBOMItem } from '@/lib/styles-sqlite';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const success = await updateBOMItem(params.id, data);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating BOM item:', error);
    return NextResponse.json({ error: 'Failed to update BOM item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = await deleteBOMItem(params.id);
    return NextResponse.json({ success });
  } catch (error) {
     console.error('Error deleting BOM item:', error);
    return NextResponse.json({ error: 'Failed to delete BOM item' }, { status: 500 });
  }
}
