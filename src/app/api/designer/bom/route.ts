
import { NextRequest, NextResponse } from 'next/server';
import { addBOMItem } from '@/lib/styles-sqlite';

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const newItem = await addBOMItem(item);
    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error adding BOM items:', error);
    return NextResponse.json({ error: 'Failed to add BOM item' }, { status: 500 });
  }
}
