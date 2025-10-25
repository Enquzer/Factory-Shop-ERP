import { NextResponse } from 'next/server';
import { getOrdersFromDB } from '@/lib/orders';
import { generateOrdersReport } from '@/lib/pdf-generator';

export async function GET() {
  try {
    // Get all orders
    const orders = await getOrdersFromDB();
    
    // Generate the orders report as a Blob
    const pdfBlob = await generateOrdersReport(orders);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=orders-report.pdf',
      },
    });
  } catch (error) {
    console.error('Error generating orders report:', error);
    return NextResponse.json({ error: 'Failed to generate orders report' }, { status: 500 });
  }
}