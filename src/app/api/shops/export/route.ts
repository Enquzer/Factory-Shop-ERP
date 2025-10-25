import { NextResponse } from 'next/server';
import { getShops } from '@/lib/shops';
import { generateShopsReport } from '@/lib/pdf-generator';

export async function GET() {
  try {
    // Get all shops
    const shops = await getShops();
    
    // Generate the shops report as a Blob
    const pdfBlob = await generateShopsReport(shops);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=shops-report.pdf',
      },
    });
  } catch (error) {
    console.error('Error generating shops report:', error);
    return NextResponse.json({ error: 'Failed to generate shops report' }, { status: 500 });
  }
}