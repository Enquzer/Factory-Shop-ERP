import { NextRequest, NextResponse } from 'next/server';
import { updateReturnRequestStatus } from '@/lib/customers-sqlite';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { status, adminNotes } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const success = await updateReturnRequestStatus(id, status, adminNotes);

    if (success) {
      return NextResponse.json({ message: 'Return request updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Return request not found or update failed' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
