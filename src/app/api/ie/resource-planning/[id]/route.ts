import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getResourcePlanById, updateResourcePlan, deleteResourcePlan } from '@/lib/ie-resource-planning';

// GET /api/ie/resource-planning/[id] - Get a specific resource plan
export const GET = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const plan = await getResourcePlanById(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error in GET /api/ie/resource-planning/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch resource plan' }, { status: 500 });
  }
}, 'ie_admin');

// PUT /api/ie/resource-planning/[id] - Update a resource plan
export const PUT = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { plan, allocations } = body;
    
    const result = await updateResourcePlan(id, plan || {}, allocations);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in PUT /api/ie/resource-planning/[id]:', error);
    return NextResponse.json({ error: 'Failed to update resource plan' }, { status: 500 });
  }
}, 'ie_admin');

// DELETE /api/ie/resource-planning/[id] - Delete a resource plan
export const DELETE = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const result = await deleteResourcePlan(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/ie/resource-planning/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete resource plan' }, { status: 500 });
  }
}, 'ie_admin');
