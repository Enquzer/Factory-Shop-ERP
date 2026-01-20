
import { NextRequest, NextResponse } from 'next/server';
import { createStyle, getStyles } from '@/lib/styles-sqlite';

export async function GET() {
  const styles = await getStyles();
  return NextResponse.json(styles);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Validate required fields
    if (!data.name || !data.number) {
        return NextResponse.json({ error: 'Name and number are required' }, { status: 400 });
    }
    const style = await createStyle(data);
    return NextResponse.json(style);
  } catch (error) {
    console.error('Error creating style:', error);
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 });
  }
}
