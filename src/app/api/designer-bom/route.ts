import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest, UserRole } from '@/lib/auth-middleware';

// GET: Fetch designer BOM items for a specific product code
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }
    
    // Check if user has allowed roles
    const allowedRoles: UserRole[] = ['factory', 'planning', 'marketing', 'designer'];
    if (!user.hasRole(allowedRoles)) {
      return NextResponse.json({ 
        error: `Unauthorized: Access required for one of: ${allowedRoles.join(', ')}. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get('productCode');

    if (!productCode) {
      return NextResponse.json({ error: 'Product code is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Find the style associated with this product code
    // Assuming styles table has a 'number' field that matches productCode
    const style = await db.get(`
      SELECT id, number, name 
      FROM styles 
      WHERE number = ? AND isActive = 1
    `, [productCode]);

    if (!style) {
      // No style found for this product code - return empty array
      return NextResponse.json([]);
    }

    // Fetch BOM items for this style
    const bomItems = await db.all(`
      SELECT 
        sb.id,
        sb.styleId,
        sb.materialId,
        sb.type,
        sb.itemName as materialName,
        sb.itemCode,
        sb.supplier,
        sb.consumption as quantityPerUnit,
        sb.unit as unitOfMeasure,
        sb.cost,
        sb.currency,
        sb.comments,
        rm.imageUrl as materialImageUrl,
        rm.currentBalance
      FROM style_bom sb
      LEFT JOIN raw_materials rm ON sb.materialId = rm.id
      WHERE sb.styleId = ?
      ORDER BY sb.type, sb.itemName
    `, [style.id]);

    // Transform to match the BOM modification dialog format
    const transformedItems = bomItems.map((item: any) => ({
      id: item.id,
      materialId: item.materialId,
      materialName: item.materialName,
      quantityPerUnit: item.quantityPerUnit || 0,
      wastagePercentage: 5, // Default wastage percentage
      unitOfMeasure: item.unitOfMeasure || 'M',
      type: item.type || 'Fabric',
      supplier: item.supplier || '',
      cost: item.cost || 0,
      materialImageUrl: item.materialImageUrl || '',
      comments: item.comments || ''
    }));

    return NextResponse.json(transformedItems);
  } catch (error) {
    console.error('Error fetching designer BOM:', error);
    return NextResponse.json({ error: 'Failed to fetch designer BOM' }, { status: 500 });
  }
}
