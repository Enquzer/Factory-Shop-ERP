import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { Product, ProductVariant } from '@/lib/products';
import { createProduct, updateProduct, productCodeExists, getProductById, getProductByProductCode } from '@/lib/products-sqlite';
import { fileToText, parseExcelData, csvToJson } from '@/lib/utils';
import { logAuditEntry } from '@/lib/audit-logger';
import { handleErrorResponse, ValidationError, ConflictError, AppError } from '@/lib/error-handler';
import { isValidImageUrl } from '@/lib/image-utils';

// POST /api/products/upload-excel - Upload Excel/CSV file and process product data
export async function POST(request: Request) {
  try {
    // Authenticate the request manually
    const user = await authenticateRequest(request as any);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has factory role
    if (user.role !== 'factory') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify that this is a multipart/form-data request
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type must be multipart/form-data');
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'text/plain' // for CSV files
    ];

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && 
        !file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.csv')) {
      throw new ValidationError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
    }

    // Read file content
    let fileContent: string;
    let parsedData: any[] = [];

    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      // For CSV files, we can read as text
      fileContent = await file.text();
      parsedData = csvToJson(fileContent);
    } else {
      // For Excel files, we'll need to handle differently
      // In a real implementation, we would use a proper Excel parser here
      // For now, we'll return an error since we can't install the xlsx library
      throw new ValidationError('Excel format not supported due to dependency conflicts. Please convert your Excel file to CSV format and try again.');
    }

    if (parsedData.length === 0) {
      throw new ValidationError('No data found in the file. Please check the file format.');
    }

    // Validate required columns
    const requiredColumns = ['productCode', 'sellingPrice'];
    const firstRow = parsedData[0];
    const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
    
    if (missingColumns.length > 0) {
      throw new ValidationError(`Missing required columns: ${missingColumns.join(', ')}. Required columns are: productCode, sellingPrice. Optional columns: image.`);
    }

    // Process each row in the Excel/CSV file
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const row of parsedData) {
      let productCode = row.productCode?.toString()?.trim();
      let sellingPriceStr = row.sellingPrice?.toString()?.trim();
      let productionCostStr = (row.productionCost || row.production_cost || row.cost)?.toString()?.trim();
      let imageUrl = row.image || row.imageUrl || null;
      let name = row.name?.toString()?.trim() || null;
      let category = row.category?.toString()?.trim() || 'Unisex';
      let description = row.description?.toString()?.trim() || null;
      
      // Clean up product code: remove extra spaces and normalize
      if (productCode) {
        productCode = productCode.replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-').trim().toUpperCase();
      }
      
      if (!productCode) {
        console.warn(`Skipping row with missing product code:`, row);
        continue;
      }
      
      // Skip if selling price is "New" or empty
      if (!sellingPriceStr || sellingPriceStr.toLowerCase() === 'new' || sellingPriceStr.trim() === '') {
        console.warn(`Skipping row with invalid selling price for product ${productCode}:`, row);
        continue;
      }
      
      // Try to parse the selling price
      let sellingPrice = parseFloat(sellingPriceStr);
      if (isNaN(sellingPrice)) {
        console.warn(`Skipping row with invalid selling price for product ${productCode}:`, row);
        continue;
      }

      // Try to parse the production cost
      let productionCost = parseFloat(productionCostStr || "");
      if (isNaN(productionCost)) {
        productionCost = 0; // Default to 0 if invalid or not provided
      }

      // Validate image URL if provided
      if (imageUrl) {
        imageUrl = imageUrl.toString().trim();
        if (!isValidImageUrl(imageUrl)) {
          console.warn(`Invalid image URL for product ${productCode}:`, imageUrl);
          imageUrl = null; // Set to null if invalid
        }
      }

      // Clean up name if it exists
      if (name) {
        // Remove quotes and special formatting
        name = name.replace(/"/g, '').trim();
      } else {
        // Use product code as name if no name is provided
        name = productCode;
      }

      // Clean up category
      if (category) {
        category = category.replace(/"/g, '').replace(/\n/g, ' ').trim();
      }

      // Clean up description
      if (description) {
        description = description.replace(/"/g, '').replace(/\n/g, ' ').trim();
      }

      // Check if product exists by product code (case-insensitive)
      const exists = await productCodeExists(productCode);
      
      if (exists) {
        // Update existing product
        // Get the existing product to preserve other fields
        const existingProduct = await getProductByProductCode(productCode);
        
        if (existingProduct) {
          // Update the product with new selling price and other fields
          const updateData = {
            price: sellingPrice,
            imageUrl: imageUrl || existingProduct.imageUrl,
            name: name || existingProduct.name,
            category: category || existingProduct.category,
            description: description || existingProduct.description,
            cost: productionCost || existingProduct.cost
          };
          
          await updateProduct(existingProduct.id, updateData);
          updatedCount++;
          
          // Log audit entry for update
          await logAuditEntry({
            userId: user.id,
            username: user.username,
            action: 'UPDATE',
            resourceType: 'PRODUCT',
            resourceId: existingProduct.id,
            details: `Updated product "${existingProduct.name}" selling price via Excel upload`
          });
        }
      } else {
        // Create new product
        // We need to create a minimal product with the required fields
        const newProductData = {
          productCode: productCode,
          name: name || productCode, // Use product code as name if not provided
          category: category || 'Unisex', // Default category
          price: sellingPrice,
          cost: productionCost,
          minimumStockLevel: 10, // Default minimum stock level
          variants: [], // For now, create without variants
          imageUrl: imageUrl || null,
          description: description || null
        };
        
        // Create the product
        await createProduct(newProductData as any);
        createdCount++;
        
        // Log audit entry for creation
        await logAuditEntry({
          userId: user.id,
          username: user.username,
          action: 'CREATE',
          resourceType: 'PRODUCT',
          resourceId: newProductData.productCode,
          details: `Created product "${newProductData.name}" via Excel upload`
        });
      }
    }

    return NextResponse.json({
      message: 'Excel file processed successfully',
      processed: parsedData.length,
      created: createdCount,
      updated: updatedCount
    });
  } catch (error: any) {
    console.error('Error processing Excel upload:', error);
    return handleErrorResponse(error);
  }
}