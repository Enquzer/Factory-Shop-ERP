
import { NextRequest, NextResponse } from 'next/server';
import { calculateMonthlyIncentives } from '@/lib/hr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required (YYYY-MM)' }, { status: 400 });
    }
    
    const results = await calculateMonthlyIncentives(month);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in GET /api/hr/incentives:', error);
    return NextResponse.json({ error: 'Failed to calculate incentives' }, { status: 500 });
  }
}
