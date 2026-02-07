import { NextRequest, NextResponse } from 'next/server';
import { generateComprehensiveDispatchPDF } from '@/lib/comprehensive-dispatch-pdf';
import path from 'path';
import fs from 'fs';
import { withRoleAuth } from '@/lib/auth-middleware';

export const GET = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string, type: string } }) => {
  try {
    const orderId = params.id;
    const pdfType = params.type; // 'dispatch' or 'packing-list'
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    if (!pdfType || (pdfType !== 'dispatch' && pdfType !== 'packing-list')) {
      return NextResponse.json({ error: 'Invalid PDF type. Must be "dispatch" or "packing-list"' }, { status: 400 });
    }
    
    // First generate the PDFs to ensure they exist
    const result = await generateComprehensiveDispatchPDF(orderId);
    
    // Determine which PDF to serve
    const pdfPath = pdfType === 'dispatch' 
      ? result.dispatchPdfPath 
      : result.packingListPdfPath;
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF file not found' }, { status: 404 });
    }
    
    // Read the PDF file
    const fileBuffer = fs.readFileSync(pdfPath);
    
    // Get file name for download
    const fileName = path.basename(pdfPath);
    
    // Return the PDF file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('Error serving dispatch PDF:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to serve PDF file' 
    }, { status: 500 });
  }
}, ['store', 'factory', 'admin']);