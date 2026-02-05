
import { NextRequest, NextResponse } from 'next/server';
import { getLeaves, createLeave } from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || undefined;
  
  try {
    const leaves = await getLeaves(month);
    return NextResponse.json(leaves);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createLeave(body);
    return NextResponse.json({ success: true, id: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
