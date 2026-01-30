import { NextResponse } from 'next/server';
import {
  getRawMaterialSubcategories,
  getRawMaterialSubcategoriesByCategory,
  addRawMaterialSubcategory,
  updateRawMaterialSubcategory,
  deleteRawMaterialSubcategory
} from '@/lib/raw-material-subcategories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let subcategories;
    if (category) {
      subcategories = await getRawMaterialSubcategoriesByCategory(category);
    } else {
      subcategories = await getRawMaterialSubcategories();
    }
    
    return NextResponse.json(subcategories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch raw material subcategories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { category, subcategory, code } = data;
    
    if (!category || !subcategory || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const success = await addRawMaterialSubcategory(category, subcategory, code);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create raw material subcategory' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, category, subcategory, code } = data;
    
    if (!id || !category || !subcategory || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const success = await updateRawMaterialSubcategory(id, category, subcategory, code);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update raw material subcategory' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const success = await deleteRawMaterialSubcategory(parseInt(id));
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete raw material subcategory' }, { status: 500 });
  }
}