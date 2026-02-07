import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getResourcePlans, createResourcePlan } from '@/lib/ie-resource-planning';

// GET /api/ie/resource-planning - Get all resource plans
export const GET = withRoleAuth(async (request, user) => {
  try {
    const plans = await getResourcePlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error in GET /api/ie/resource-planning:', error);
    return NextResponse.json({ error: 'Failed to fetch resource plans' }, { status: 500 });
  }
}, 'ie_admin');

// POST /api/ie/resource-planning - Create a new resource plan
export const POST = withRoleAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { plan, allocations } = body;
    
    if (!plan || !plan.planName || !plan.startDate || !plan.endDate) {
      return NextResponse.json({ error: 'Missing required plan details' }, { status: 400 });
    }
    
    const result = await createResourcePlan(
      { ...plan, createdBy: user.username },
      allocations || []
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/ie/resource-planning:', error);
    return NextResponse.json({ error: 'Failed to create resource plan' }, { status: 500 });
  }
}, 'ie_admin');
