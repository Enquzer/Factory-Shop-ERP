
import { NextResponse, NextRequest } from 'next/server';
import { getOrderConsumptionHistory } from '@/lib/bom';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getOrderConsumptionHistory();
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching consumption history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
