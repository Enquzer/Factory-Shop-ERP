
import { NextRequest, NextResponse } from 'next/server';
import { HRSettings, updateHRSettings } from '@/lib/hr';

export async function GET() {
  try {
    const settings = await HRSettings.getGlobalSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      await updateHRSettings(key, String(value));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
