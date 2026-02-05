
import { NextResponse } from 'next/server';
import { suggestOperatorForOperation } from '@/lib/hr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation');

  if (!operation) {
    return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
  }

  try {
    const suggestions = await suggestOperatorForOperation(operation);
    return NextResponse.json(suggestions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
