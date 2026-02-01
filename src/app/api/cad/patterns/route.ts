import { NextResponse } from 'next/server';
import { savePattern } from '@/lib/cad/versioning';

export async function POST(request: Request) {
  try {
    const pattern = await request.json();
    const patternId = await savePattern(pattern);
    return NextResponse.json({ success: true, id: patternId });
  } catch (error: any) {
    console.error('Error saving pattern:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
