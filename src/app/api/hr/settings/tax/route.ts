
import { NextRequest, NextResponse } from 'next/server';
import { HRSettings, updateTaxBracket } from '@/lib/hr';

export async function GET() {
  try {
    const brackets = await HRSettings.getTaxBrackets();
    return NextResponse.json(brackets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    await updateTaxBracket(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
