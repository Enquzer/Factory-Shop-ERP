import { NextRequest, NextResponse } from 'next/server';
import { deleteProduct } from '@/lib/products-sqlite';
import { withRoleAuth } from '@/lib/auth-middleware';

// DELETE /api/bulk/products - Delete multiple products
export async function DELETE(request: NextRequest) {
  const handler = withRoleAuth(
    async (req, user) => {
      try {
        console.log('BULK DELETE: Request received from user:', user.username, user.role);
        
        const body = await req.json();
        console.log('BULK DELETE: Request body:', body);
        
        const { productIds } = body;
      
        // Validate required fields
        if (!productIds || !Array.isArray(productIds)) {
          console.error('BULK DELETE: Invalid productIds:', productIds);
          return NextResponse.json({ success: false, message: 'Missing or invalid product IDs array' }, { status: 400 });
        }
        
        // Validate product IDs
        if (productIds.length === 0) {
          return NextResponse.json({ success: false, message: 'Product IDs array cannot be empty' }, { status: 400 });
        }
        
        console.log(`BULK DELETE: Attempting to delete ${productIds.length} products:`, productIds);
        
        for (const productId of productIds) {
          if (typeof productId !== 'string' || !productId.trim()) {
            return NextResponse.json({ success: false, message: 'All product IDs must be non-empty strings' }, { status: 400 });
          }
        }
        
        // Delete products one by one
        let deletedCount = 0;
        const errors: string[] = [];
        
        for (const productId of productIds) {
          try {
            console.log(`BULK DELETE: Deleting product ${productId}`);
            const success = await deleteProduct(productId);
            if (success) {
              deletedCount++;
              console.log(`BULK DELETE: Product ${productId} deleted`);
            } else {
              console.error(`BULK DELETE: Failed to delete product ${productId} (not found or DB error)`);
              errors.push(`Product with ID ${productId} not found or failed to delete`);
            }
          } catch (error) {
            console.error(`BULK DELETE: Exception deleting product ${productId}:`, error);
            errors.push(`Error deleting product with ID ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        console.log(`BULK DELETE: Completed. Deleted: ${deletedCount}, Errors: ${errors.length}`);
        
        return NextResponse.json({ 
          success: true, 
          message: `Successfully deleted ${deletedCount} of ${productIds.length} products`,
          deletedCount,
          errors: errors.length > 0 ? errors : undefined
        }, { status: 200 });
      } catch (error) {
        console.error('Error deleting products in bulk (Outer Loop):', error);
        return NextResponse.json({ success: false, message: 'Failed to delete products in bulk (Server Error)' }, { status: 500 });
      }
    },
    'factory'
  );

  return handler(request);
}