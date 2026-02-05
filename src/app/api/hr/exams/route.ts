
import { NextRequest, NextResponse } from 'next/server';
import { 
  getExams, 
  getEmployeeExams, 
  recordExamResult 
} from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || undefined;
  const type = searchParams.get('type') || 'results'; // exams or results
  
  try {
    if (type === 'exams') {
      const exams = await getExams();
      return NextResponse.json(exams);
    } else {
      const results = await getEmployeeExams(employeeId);
      return NextResponse.json(results);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await recordExamResult(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
