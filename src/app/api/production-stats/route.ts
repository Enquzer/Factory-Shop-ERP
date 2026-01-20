import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get today's output per department
    const outputToday = await db.all(`
      SELECT processStage as stage, SUM(quantity) as count
      FROM daily_production_status
      WHERE date = ?
      GROUP BY processStage
    `, today);

    // Get WIP per department (Total quantity where status is the department stage)
    const wipPerStage = await db.all(`
      SELECT status as stage, SUM(quantity) as count
      FROM marketing_orders
      WHERE isCompleted = 0
      GROUP BY status
    `);

    // Get total produced for each active order
    const totalProduced = await db.all(`
      SELECT orderId, SUM(quantity) as total
      FROM daily_production_status
      GROUP BY orderId
    `);

    return NextResponse.json({
      outputToday,
      wipPerStage,
      totalProduced
    });

  } catch (error: any) {
    console.error('Error fetching production stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
