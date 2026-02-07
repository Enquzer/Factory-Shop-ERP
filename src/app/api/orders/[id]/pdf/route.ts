import { NextResponse } from 'next/server';
import { getOrdersFromDB } from '@/lib/orders';
import { generateShopOrderPDFBlob } from '@/lib/pdf-generator';
import { dbUtils } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Get all orders
    const orders = await getOrdersFromDB();
    
    // Find the specific order
    const order = orders.find(o => o.id === id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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

    // Generate the shop order PDF as a Blob
    const pdfBlob = await generateShopOrderPDFBlob(order, branding);
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Convert to Buffer for Next.js Response
    const buffer = Buffer.from(arrayBuffer);
    
    // Return the PDF as a downloadable file
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=shop-order-${id}.pdf`,
      },
    });
  } catch (error) {
    console.error('Error generating shop order PDF:', error);
    return NextResponse.json({ error: 'Failed to generate shop order PDF' }, { status: 500 });
  }
}