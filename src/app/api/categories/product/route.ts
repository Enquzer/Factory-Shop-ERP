
import { NextResponse } from 'next/server';
import { getProductCategories, addProductCategory, updateProductCategory, deleteProductCategory } from '@/lib/categories-sqlite';

export async function GET() {
  const categories = await getProductCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const { name, code } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }
    const success = await addProductCategory(name, code);
    if (!success) {
      return NextResponse.json({ error: 'Failed to add category' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, code } = await request.json();
    if (!id || !name || !code) {
      return NextResponse.json({ error: 'ID, Name and Code are required' }, { status: 400 });
    }
    const success = await updateProductCategory(id, name, code);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  
  const success = await deleteProductCategory(parseInt(id));
  return NextResponse.json({ success });
}
