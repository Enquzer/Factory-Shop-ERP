import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getLineBalances, createLineBalance, calculateLineBalance } from '@/lib/ie-line-balancing';

// GET /api/ie/line-balancing - Get all line balances
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || undefined;

    const lineBalances = await getLineBalances(orderId);
    
    return NextResponse.json({ 
      success: true, 
      data: lineBalances 
    });
  } catch (error) {
    console.error('Error fetching line balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch line balances' },
      { status: 500 }
    );
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/line-balancing - Create new line balance
export const POST = withRoleAuth(async (request) => {
  try {
    const body = await request.json();
    const { orderId, productCode, targetOutput, workingHours, autoBalance } = body;

    if (!orderId || !productCode || !targetOutput) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, productCode, targetOutput' },
        { status: 400 }
      );
    }

    let result;
    
    if (autoBalance) {
      // Perform automatic line balancing
      result = await calculateLineBalance(
        orderId,
        productCode,
        targetOutput,
        workingHours || 8
      );
    } else {
      // Create manual line balance
      const lineBalanceId = await createLineBalance({
        orderId,
        productCode,
        lineName: body.lineName,
        section: body.section,
        targetOutput,
        workingHours: workingHours || 8,
        numberOfWorkstations: body.numberOfWorkstations,
        totalSMV: body.totalSMV,
        calculatedCycleTime: body.calculatedCycleTime,
        actualCycleTime: body.actualCycleTime,
        lineEfficiency: body.lineEfficiency || 0,
        bottleneckWorkstationId: body.bottleneckWorkstationId,
        status: body.status || 'planned',
        createdBy: 'system' // This will be set by middleware
      });
      
      result = { lineBalanceId };
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error creating line balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create line balance' },
      { status: 500 }
    );
  }
}, ['ie_admin', 'ie_user']);