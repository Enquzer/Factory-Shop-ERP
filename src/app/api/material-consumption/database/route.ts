
import { NextResponse, NextRequest } from 'next/server';
import { getConsumptionDatabase } from '@/lib/bom';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const database = await getConsumptionDatabase();
    return NextResponse.json(database);
  } catch (error) {
    console.error('Error fetching consumption database:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
