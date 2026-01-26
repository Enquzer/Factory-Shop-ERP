
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, withRoleAuth } from '@/lib/auth-middleware';
import { updateStyle, getStyleById } from '@/lib/styles-sqlite';
import { createNotification } from '@/lib/notifications';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser || authUser.role !== 'factory') { // Explicit factory check
        return NextResponse.json({ error: 'Unauthorized: Factory access required' }, { status: 403 });
    }

    const { id } = params;
    const { price, minStock } = await request.json();

    const style = await getStyleById(id);
    if (!style) {
        return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    if (style.status !== 'Factory Handover') {
        return NextResponse.json({ error: 'Style is not in handover state' }, { status: 400 });
    }

    const db = await getDb();
    
    // 1. Create Product
    const productId = `PROD-${Date.now()}`;
    await db.run(`
        INSERT INTO products (id, productCode, name, category, mainCategory, subCategory, price, minimumStockLevel, imageUrl, description, readyToDeliver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        productId,
        style.number,
        style.name,
        style.category || 'Uncategorized',
        style.mainCategory || null,
        style.subCategory || null,
        price || 0,
        minStock || 10,
        style.imageUrl,
        style.description,
        0
    ]);

    // 2. Copy BOM from Style to Product
    if (style.bom && style.bom.length > 0) {
        for (const item of style.bom) {
            // Only copy if it has a materialId linked to registry
            if (item.materialId) {
                await db.run(`
                    INSERT INTO product_bom (productId, materialId, quantityPerUnit, wastagePercentage)
                    VALUES (?, ?, ?, ?)
                `, [productId, item.materialId, item.consumption || 0, 5]); // Default 5% wastage
            }
        }
    }

    // 3. Update Style Status
    await updateStyle(id, { status: 'Approved' });
    
    // Notify Designer
    await createNotification({
        userType: 'designer',
        title: 'Style Approved',
        description: `Style ${style.number} has been approved and created as ${style.name} in Product List.`,
        href: `/designer/${id}`
    });

    return NextResponse.json({ success: true, productId });

  } catch (error) {
    console.error('Error approving style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
