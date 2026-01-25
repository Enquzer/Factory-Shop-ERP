
import { NextResponse } from 'next/server';
import { getRawMaterials, createRawMaterial, updateRawMaterial } from '@/lib/raw-materials';

export async function GET() {
  try {
    const materials = await getRawMaterials();
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name || !data.category || !data.unitOfMeasure) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const id = await createRawMaterial(data);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await updateRawMaterial(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update raw material' }, { status: 500 });
  }
}
