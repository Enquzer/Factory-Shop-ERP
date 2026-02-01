import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getMarketingOrderById as getMarketingOrderByOrderId, getQualityInspectionsFromDB } from '@/lib/marketing-orders';
import { generateQCPDF } from '@/lib/qc-pdf-generator';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const stage = searchParams.get('stage');

    console.log('PDF Generation Request - orderId:', orderId, 'stage:', stage);

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Get order details
    const order = await getMarketingOrderByOrderId(orderId);
    if (!order) {
      console.error('Order not found for ID:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('Found order:', order.orderNumber, order.productName);

    // Get quality inspections for the order
    const inspections = await getQualityInspectionsFromDB(orderId);
    console.log('Found inspections:', inspections.length);
    
    // Find inspection by stage if specified, otherwise use the latest
    let inspection;
    if (stage) {
      // Try exact match first
      inspection = inspections.find((insp: any) => insp.stage === stage);
      
      // If no exact match, try flexible matching
      if (!inspection) {
        const normalizedStage = stage.toLowerCase();
        inspection = inspections.find((insp: any) => {
          const inspStage = (insp.stage || '').toLowerCase();
          // Match if the inspection stage contains the requested stage
          // e.g., "Sewing" matches "Inline-Sewing"
          return inspStage.includes(normalizedStage) || normalizedStage.includes(inspStage);
        });
      }
    } else {
      inspection = inspections[0]; // Latest inspection
    }

    if (!inspection) {
      console.error('No inspection found for order:', orderId, 'stage:', stage);
      console.error('Available inspections:', inspections.map((i: any) => ({ stage: i.stage, date: i.date })));
      return NextResponse.json({ 
        error: 'Quality inspection not found',
        details: `No inspection found for stage "${stage}". Available stages: ${inspections.map((i: any) => i.stage).join(', ')}`
      }, { status: 404 });
    }

    console.log('Using inspection:', inspection.stage, inspection.date);

    // Generate the QC PDF as a Blob
    const factoryProfile = {
      name: 'Carement Fashion',
      address: 'Addis Ababa, Ethiopia',
      email: 'info@carementfashion.com'
    };
    
    console.log('Generating PDF for order:', order.orderNumber, 'inspection:', inspection.stage);
    
    const pdfBlob = await generateQCPDF(
      order,
      inspection,
      factoryProfile.name,
      factoryProfile.address,
      factoryProfile.email
    );
    
    console.log('PDF generated successfully, size:', pdfBlob.size);

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Convert to Uint8Array for Next.js Response (compatible with BodyInit)
    const uint8Array = new Uint8Array(arrayBuffer);

    // Determine filename based on stage
    const stagePart = stage || inspection.stage || 'report';
    const fileName = `QC_Report_${order.orderNumber}_${stagePart}.pdf`;

    // Return the PDF as a downloadable file
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('Error generating quality inspection PDF:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to generate quality inspection PDF', 
      details: error.message 
    }, { status: 500 });
  }
}