
import { NextRequest, NextResponse } from 'next/server';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/hr';

export async function GET() {
  try {
    const departments = await getDepartments();
    return NextResponse.json(departments);
  } catch (error: any) {
    console.error('Error in GET /api/hr/departments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch departments',
      details: error.message 
    }, { status: 500 });
  }

}

export async function POST(req: NextRequest) {
  try {
    const { name, managerId } = await req.json();
    const id = await createDepartment(name, managerId);
    return NextResponse.json({ id });
  } catch (error: any) {
    console.error('Error in POST /api/hr/departments:', error);
    return NextResponse.json({ error: 'Failed to create department', details: error.message }, { status: 500 });
  }

}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    await updateDepartment(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in PATCH /api/hr/departments:', error);
    return NextResponse.json({ error: 'Failed to update department', details: error.message }, { status: 500 });
  }

}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await deleteDepartment(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/hr/departments:', error);
    return NextResponse.json({ error: 'Failed to delete department', details: error.message }, { status: 500 });
  }

}
