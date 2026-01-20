
import { NextRequest, NextResponse } from 'next/server';
import { saveCanvas } from '@/lib/styles-sqlite';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    await saveCanvas(params.id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving canvas:', error);
    return NextResponse.json({ error: 'Failed to save canvas' }, { status: 500 });
  }
}
