
import { NextResponse, NextRequest } from 'next/server';
import { issueMaterial } from '@/lib/bom';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'store' && user.role !== 'factory')) {
      return NextResponse.json({ error: 'Unauthorized: Store access required' }, { status: 403 });
    }

    const { requisitionId, quantity } = await request.json();
    if (!requisitionId || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await issueMaterial(requisitionId, quantity);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error issuing material:', error);
    return NextResponse.json({ error: error.message || 'Failed to issue material' }, { status: 500 });
  }
}
