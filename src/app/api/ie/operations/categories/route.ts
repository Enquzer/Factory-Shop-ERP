import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getOperationCategories } from '@/lib/ie';

// GET /api/ie/operations/categories - Get all operation categories
export const GET = withRoleAuth(async (request) => {
  try {
    const categories = await getOperationCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching operation categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);