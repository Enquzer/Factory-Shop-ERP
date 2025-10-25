import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';
import { generateProductsReport } from '@/lib/pdf-generator';

export async function GET() {
  try {
    // Get all products
    const products = await getProducts();
    
    // Generate the products report as a Blob
    const pdfBlob = await generateProductsReport(products);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=products-report.pdf',
      },
    });
  } catch (error) {
    console.error('Error generating products report:', error);
    return NextResponse.json({ error: 'Failed to generate products report' }, { status: 500 });
  }
}