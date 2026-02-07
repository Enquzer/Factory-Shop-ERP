import { NextResponse } from 'next/server';
import { getOrdersFromDB } from '@/lib/orders';
import { generateOrdersReport } from '@/lib/pdf-generator';
import { dbUtils } from '@/lib/db';

export async function GET() {
  try {
    // Get all orders
    const orders = await getOrdersFromDB();
    
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

    // Generate the orders report as a Blob
    const pdfBlob = await generateOrdersReport(orders, branding);
    
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer as any, {
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