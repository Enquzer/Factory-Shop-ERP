import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';
import { generateInventoryReport } from '@/lib/pdf-generator';
import { dbUtils } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm') || '';
    const category = searchParams.get('category') || 'all';
    const minStock = searchParams.get('minStock') || '';
    const maxStock = searchParams.get('maxStock') || '';
    
    // Get all products
    let products = await getProducts();
    
    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(term) || 
        product.productCode.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    }
    
    if (category !== 'all') {
      products = products.filter(product => product.category === category);
    }
    
    if (minStock) {
      products = products.filter(product => {
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return totalStock >= parseInt(minStock);
      });
    }
    
    if (maxStock) {
      products = products.filter(product => {
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return totalStock <= parseInt(maxStock);
      });
    }
    
    // Fetch branding settings from database
    const companyName = await dbUtils.getSetting('companyName');
    const logo = await dbUtils.getSetting('logo');
    const primaryColor = await dbUtils.getSetting('primaryColor');
    const secondaryColor = await dbUtils.getSetting('secondaryColor');

    const branding = {
        companyName: companyName || undefined,
        logo: logo || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined
    };

    // Generate the inventory report as a Blob
    const pdfBlob = await generateInventoryReport(products, branding);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=inventory-report.pdf',
      },
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return NextResponse.json({ error: 'Failed to generate inventory report' }, { status: 500 });
  }
}