import { NextResponse, NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      roleType: typeof user.role,
      hasStoreRole: user.role === 'store',
      hasFactoryRole: user.role === 'factory'
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
