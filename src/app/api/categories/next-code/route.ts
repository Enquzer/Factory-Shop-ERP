
import { NextResponse } from 'next/server';
import { getNextSequentialCode } from '@/lib/categories-sqlite';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mainCode = searchParams.get('mainCode');
  const productCode = searchParams.get('productCode');
  
  if (!mainCode || !productCode) {
    return NextResponse.json({ error: 'mainCode and productCode are required' }, { status: 400 });
  }
  
  const code = await getNextSequentialCode(mainCode, productCode);
  return NextResponse.json({ code });
}
