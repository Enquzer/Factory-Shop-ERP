import { NextRequest, NextResponse } from 'next/server';
import { productCodeExists } from '@/lib/products-sqlite';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Product code is required' }, { status: 400 });
  }

  try {
    const exists = await productCodeExists(code);
    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking product code availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
