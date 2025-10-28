import { NextResponse } from 'next/server';
import { getProducts, getProductById, updateProduct, deleteProduct, productCodeExists, createProduct } from '@/lib/products-sqlite';
import { Product } from '@/lib/products';
import { getDb } from '@/lib/db';
import { withAuth, withRoleAuth, AuthenticatedUser } from '@/lib/auth-middleware';
import { NextRequest } from 'next/server';
import { productSchema, sanitizeInput } from '@/lib/validation';
import { handleErrorResponse, ValidationError, ConflictError } from '@/lib/error-handler';
import { logAuditEntry } from '@/lib/audit-logger'; // Import audit logger

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
    return handleErrorResponse(error);
  }
}

// POST /api/products - Create a new product (protected - factory only)
export async function POST(request: NextRequest) {
  return withRoleAuth(async (req, user) => {
    try {
      // Parse the request body
      let productData;
      try {
        productData = await req.json();
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        throw new ValidationError('Invalid request body. Expected JSON data.');
      }
      
      // Sanitize input data
      const sanitizedData = sanitizeInput(productData);
      
      // Validate input data
      try {
        productSchema.parse(sanitizedData);
      } catch (validationError: any) {
        throw new ValidationError('Invalid input data', validationError.errors);
      }
      
      // Check if product code already exists
      const exists = await productCodeExists(sanitizedData.productCode);
      if (exists) {
        throw new ConflictError(`Product with code "${sanitizedData.productCode}" already exists`);
      }
      
      // For now, we'll pass the data as-is to the createProduct function
      // In a real implementation, you would process file uploads here
      const newProduct = await createProduct(sanitizedData);
      
      // Log audit entry
      await logAuditEntry({
        userId: user.id,
        username: user.username,
        action: 'CREATE',
        resourceType: 'PRODUCT',
        resourceId: newProduct.id,
        details: `Created product "${newProduct.name}" with code "${newProduct.productCode}"`
      });
      
      // Remove the automatic population of shop inventories
      // Shops will only get inventory when they actually order products
      
      return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
      console.error('Error in POST /api/products:', error);
      return handleErrorResponse(error);
    }
  }, 'factory'); // Only factory users can create products
}

// PUT /api/products/:id - Update a product (protected - factory only)
export async function PUT(request: NextRequest) {
  return withRoleAuth(async (req, user) => {
    try {
      console.log('PUT /api/products called');
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      
      console.log('Product ID from query params:', id);
      
      if (!id) {
        throw new ValidationError('Product ID is required');
      }
      
      let productData;
      try {
        productData = await req.json();
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        throw new ValidationError('Invalid request body. Expected JSON data.');
      }
      
      // Sanitize input data
      const sanitizedData = sanitizeInput(productData);
      
      // Validate input data (only validate provided fields)
      if (Object.keys(sanitizedData).length > 0) {
        try {
          // Create a partial schema for validation
          const partialSchema = productSchema.partial();
          partialSchema.parse(sanitizedData);
        } catch (validationError: any) {
          throw new ValidationError('Invalid input data', validationError.errors);
        }
      }
      
      console.log('Product data received:', sanitizedData);
      
      // Validate that we have at least one field to update
      const hasProductData = Object.keys(sanitizedData).length > 0;
      const hasVariants = sanitizedData.variants && sanitizedData.variants.length > 0;
      const hasAgePricing = sanitizedData.agePricing && sanitizedData.agePricing.length >= 0; // Allow empty array to clear pricing
      
      if (!hasProductData && !hasVariants && !hasAgePricing) {
        throw new ValidationError('No data provided for update');
      }
      
      // Get current product for audit logging
      const currentProduct = await getProductById(id);
      
      const success = await updateProduct(id, sanitizedData);
      
      console.log('Update product result:', success);
      
      if (success) {
        console.log('Product updated successfully');
        
        // Log audit entry
        if (currentProduct) {
          await logAuditEntry({
            userId: user.id,
            username: user.username,
            action: 'UPDATE',
            resourceType: 'PRODUCT',
            resourceId: id,
            details: `Updated product "${currentProduct.name}" with code "${currentProduct.productCode}"`
          });
        }
        
        return NextResponse.json({ message: 'Product updated successfully' });
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error('Error in PUT /api/products:', error);
      return handleErrorResponse(error);
    }
  }, 'factory'); // Only factory users can update products
}

// DELETE /api/products/:id - Delete a product (protected - factory only)
export async function DELETE(request: NextRequest) {
  return withRoleAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      
      if (!id) {
        throw new ValidationError('Product ID is required');
      }
      
      // Get current product for audit logging
      const currentProduct = await getProductById(id);
      
      const success = await deleteProduct(id);
      
      if (success) {
        // Log audit entry
        if (currentProduct) {
          await logAuditEntry({
            userId: user.id,
            username: user.username,
            action: 'DELETE',
            resourceType: 'PRODUCT',
            resourceId: id,
            details: `Deleted product "${currentProduct.name}" with code "${currentProduct.productCode}"`
          });
        }
        
        return NextResponse.json({ message: 'Product deleted successfully' });
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error in DELETE /api/products:', error);
      return handleErrorResponse(error);
    }
  }, 'factory'); // Only factory users can delete products
}