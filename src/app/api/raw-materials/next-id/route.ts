import { NextResponse } from 'next/server';
import { getNextSequenceForSubcategory, generateRawMaterialId } from '@/lib/raw-material-subcategories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    
    if (!category || !subcategory) {
      return NextResponse.json({ error: 'Category and subcategory are required' }, { status: 400 });
    }
    
    const nextSequence = await getNextSequenceForSubcategory(category, subcategory);
    const predictedId = await generateRawMaterialId(category, subcategory, nextSequence);
    
    return NextResponse.json({
      nextId: predictedId,
      sequence: nextSequence
    });
  } catch (error) {
    console.error('Error predicting next ID:', error);
    return NextResponse.json({ error: 'Failed to predict next ID' }, { status: 500 });
  }
}