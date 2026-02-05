
import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrainingModules, 
  getEmployeeTraining, 
  enrollEmployeeTraining, 
  updateTrainingStatus 
} from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || undefined;
  const type = searchParams.get('type') || 'progress'; // modules or progress
  
  try {
    if (type === 'modules') {
      const modules = await getTrainingModules();
      return NextResponse.json(modules);
    } else {
      const progress = await getEmployeeTraining(employeeId);
      return NextResponse.json(progress);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await enrollEmployeeTraining(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    await updateTrainingStatus(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
