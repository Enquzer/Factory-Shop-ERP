
import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrainingSessions, 
  createTrainingSession, 
  getSessionAttendees, 
  registerSessionAttendee, 
  updateSessionAttendance 
} from '@/lib/hr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Get attendees for a specific session
      const attendees = await getSessionAttendees(parseInt(sessionId));
      return NextResponse.json(attendees);
    } else {
      // Get all sessions
      const sessions = await getTrainingSessions();
      return NextResponse.json(sessions);
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (data.type === 'register_attendee') {
        // Register an employee to a session
        await registerSessionAttendee(data.sessionId, data.employeeId);
        return NextResponse.json({ success: true });

    } else if (data.type === 'mark_attendance') {
        // Mark attendance status
        await updateSessionAttendance(data.id, data.status, data.remarks);
        return NextResponse.json({ success: true });

    } else {
        // Create new session
        const id = await createTrainingSession(data);
        return NextResponse.json({ id });
    }
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
