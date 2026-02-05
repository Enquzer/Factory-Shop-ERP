import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/products-sqlite';
import { handleErrorResponse } from '@/lib/error-handler';

// GET /api/products/[code] - Get a single product by ID (using 'code' param key to match existing structure)
// Note: Even though the param is named 'code', we expect the frontend to pass the Product ID (UUID)
// This is because the folder structure already uses [code] for other endpoints like stock-distribution.
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    // We treat 'code' as the ID here because the frontend calls /api/products/{id}
    const id = code; 
    console.log(`GET /api/products/${id} called (param: code)`);
    
    const product = await getProductById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Error in GET /api/products/${params.code}:`, error);
    return handleErrorResponse(error);
  }
}
