
import { NextResponse, NextRequest } from 'next/server';
import { generateMaterialRequisitionsForOrder, getProductBOM } from '@/lib/bom';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getMarketingOrderByIdFromDB } from '@/lib/marketing-orders';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'marketing')) {
      return NextResponse.json({ error: 'Unauthorized: Planning, Factory, or Marketing access required' }, { status: 403 });
    }

    const { orderId } = await request.json();
    if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const db = await getDb();
    
    // Fetch order details
    const order = await db.get('SELECT * FROM marketing_orders WHERE id = ?', [orderId]);
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Find the product ID associated with this productCode
    const product = await db.get('SELECT id FROM products WHERE productCode = ?', [order.productCode]);
    if (!product) {
        return NextResponse.json({ error: 'Product not found for the given code. Ensure the style is approved as a product first.' }, { status: 404 });
    }

    // For updates, we first clear existing PENDING requisitions or handle logic in generateMaterialRequisitionsForOrder
    // Actually, generateMaterialRequisitionsForOrder has a check for existing. Let's make it allow re-generation if needed.
    
    // Get BOM items and order details for comprehensive response
    const bomItems = await getProductBOM(product.id);
    const orderDetails = await getMarketingOrderByIdFromDB(orderId);
    
    // We'll delete existing PENDING ones to allow updating from a changed BOM
    await db.run('DELETE FROM material_requisitions WHERE orderId = ? AND status = ?', [orderId, 'Pending']);

    await generateMaterialRequisitionsForOrder(orderId, order.quantity, product.id);
    
    // Prepare detailed response with BOM information
    const responsePayload = {
      success: true,
      message: 'Requisitions generated successfully',
      orderId,
      productId: product.id,
      orderQuantity: order.quantity,
      totalBomItems: bomItems.length,
      bomItemsExtracted: bomItems.map(item => ({
        materialName: item.materialName,
        materialId: item.materialId,
        quantityPerUnit: item.quantityPerUnit,
        wastagePercentage: item.wastagePercentage,
        unitOfMeasure: item.unitOfMeasure
      })),
      orderBreakdown: orderDetails?.items || [],
      totalOrderItems: orderDetails?.items?.length || 0
    };
    
    return NextResponse.json(responsePayload);

  } catch (error: any) {
    console.error('Error generating requisitions:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate material requisitions' }, { status: 500 });
  }
}
