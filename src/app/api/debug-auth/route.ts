import { NextResponse, NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

// Debug endpoint to test authentication
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}