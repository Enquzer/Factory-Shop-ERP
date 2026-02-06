
import { NextRequest, NextResponse } from 'next/server';
import { createTrainingModule, getTrainingSessions } from '@/lib/hr';

// This endpoint handles creating new modules.
// GET /api/hr/training/modules matches the existing `rows` of training modules, typically fetched via /api/hr/training?type=modules
// But for separation, let's allow POST here.

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    await createTrainingModule(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating module:', error);
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
  }
}
