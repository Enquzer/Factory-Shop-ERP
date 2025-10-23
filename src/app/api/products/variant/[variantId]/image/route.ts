import { NextResponse } from 'next/server';
import { updateVariantImage } from '@/lib/products-sqlite';

// PUT /api/products/variant/:variantId/image - Update variant image
export async function PUT(request: Request, { params }: { params: { variantId: string } }) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    
    const success = await updateVariantImage(params.variantId, imageUrl);
    
    if (success) {
      return NextResponse.json({ message: 'Variant image updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update variant image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating variant image:', error);
    return NextResponse.json({ error: 'Failed to update variant image' }, { status: 500 });
  }
}