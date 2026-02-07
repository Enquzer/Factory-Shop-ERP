import { NextResponse } from 'next/server';
import { getShops } from '@/lib/shops';
import { generateShopsReport } from '@/lib/pdf-generator';
import { dbUtils } from '@/lib/db';

export async function GET() {
  try {
    // Get all shops
    const shops = await getShops();
    
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

    // Generate the shops report as a Blob
    const pdfBlob = await generateShopsReport(shops, branding);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer as any, {
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