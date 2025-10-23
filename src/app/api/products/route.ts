import { NextResponse } from 'next/server';
import { getProducts, getProductById, updateProduct, deleteProduct, productCodeExists, createProduct } from '@/lib/products-sqlite';
import { Product } from '@/lib/products';
import { getDb } from '@/lib/db'; // Import getDb function

// GET /api/products - Get all products
export async function GET(request: Request) {
  try {
    console.log('GET /api/products called');
    
    // Check if this is a request from a shop user
    const url = new URL(request.url);
    const isShopRequest = url.searchParams.get('for') === 'shop';
    
    let products = await getProducts();
    console.log('Products fetched from database:', products);
    
    // If this is a shop request, only return products that are ready to deliver
    if (isShopRequest) {
      products = products.filter(product => product.readyToDeliver === 1);
      console.log('Filtered products for shop:', products);
    }
    
    const response = NextResponse.json(products);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('Products API response sent');
    return response;
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    // For file uploads, we need to use a different approach
    // This is a simplified version - in a real implementation, you would use a proper file upload handler
    const productData = await request.json() as any;
    
    // Check if product code already exists
    const exists = await productCodeExists(productData.productCode);
    if (exists) {
      return NextResponse.json({ error: `Product with code "${productData.productCode}" already exists` }, { status: 409 });
    }
    
    // For now, we'll pass the data as-is to the createProduct function
    // In a real implementation, you would process file uploads here
    const newProduct = await createProduct(productData);
    
    // If the product is ready to deliver, add it to all active shops' inventories
    if (newProduct.readyToDeliver === 1) {
      try {
        const db = await getDb();
        
        // Get all active shops
        const shops = await db.all(`
          SELECT id FROM shops WHERE status = 'Active'
        `);
        
        // Add product variants to each shop's inventory with 0 stock initially
        for (const shop of shops) {
          for (const variant of newProduct.variants) {
            await db.run(`
              INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock, imageUrl)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              shop.id,
              newProduct.id,
              variant.id,
              newProduct.name,
              newProduct.price,
              variant.color,
              variant.size,
              0, // Start with 0 stock
              variant.imageUrl || newProduct.imageUrl || null
            );
            console.log(`Added variant ${variant.id} to shop ${shop.id} inventory`);
          }
        }
      } catch (inventoryError) {
        console.error('Error populating shop inventory:', inventoryError);
        // Don't fail the product creation if inventory population fails
      }
    }
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// PUT /api/products/:id - Update a product
export async function PUT(request: Request) {
  try {
    console.log('PUT /api/products called');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('Product ID from query params:', id);
    
    if (!id) {
      console.error('Product ID is missing');
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const productData = await request.json() as Partial<Product>;
    console.log('Product data received:', productData);
    
    // Validate that we have at least one field to update
    const hasProductData = Object.keys(productData).length > 0;
    const hasVariants = productData.variants && productData.variants.length > 0;
    const hasAgePricing = productData.agePricing && productData.agePricing.length >= 0; // Allow empty array to clear pricing
    
    if (!hasProductData && !hasVariants && !hasAgePricing) {
      console.warn('No data provided for update');
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }
    
    const success = await updateProduct(id, productData);
    
    console.log('Update product result:', success);
    
    if (success) {
      console.log('Product updated successfully');
      return NextResponse.json({ message: 'Product updated successfully' });
    } else {
      console.error('Failed to update product - updateProduct returned false');
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating product:', error);
    console.error('Error stack:', error.stack);
    // Return more detailed error information
    return NextResponse.json({ 
      error: 'Failed to update product', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// DELETE /api/products/:id - Delete a product
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const success = await deleteProduct(id);
    
    if (success) {
      return NextResponse.json({ message: 'Product deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}