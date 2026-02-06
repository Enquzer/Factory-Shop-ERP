
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.all('SELECT * FROM job_center_settings ORDER BY jobCenter');
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching incentive settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { jobCenter, multiplier } = await req.json();
    if (!jobCenter || multiplier === undefined) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = await getDb();
    await db.run(
      `INSERT INTO job_center_settings (jobCenter, multiplier) VALUES (?, ?)
       ON CONFLICT(jobCenter) DO UPDATE SET multiplier = excluded.multiplier`,
      [jobCenter, multiplier]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating incentive settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
