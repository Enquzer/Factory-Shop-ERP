import { NextRequest, NextResponse } from 'next/server';
import { generateComprehensiveDispatchPDF } from '@/lib/comprehensive-dispatch-pdf';
import { withRoleAuth } from '@/lib/auth-middleware';

export const GET = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Generate the comprehensive dispatch PDFs
    const result = await generateComprehensiveDispatchPDF(orderId);
    
    return NextResponse.json({
      success: true,
      message: 'Dispatch PDFs generated successfully',
      dispatchPdfPath: result.dispatchPdfPath,
      packingListPdfPath: result.packingListPdfPath,
      summary: result.summary
    });
    
  } catch (error: any) {
    console.error('Error generating comprehensive dispatch PDF:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate dispatch PDFs' 
    }, { status: 500 });
  }
}, ['store', 'factory', 'admin']);

export const POST = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const orderId = params.id;
    const { includePackingList = true } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Generate the comprehensive dispatch PDFs
    const result = await generateComprehensiveDispatchPDF(orderId);
    
    // Return download URLs
    const baseUrl = request.nextUrl.origin;
    const dispatchPdfUrl = `${baseUrl}/api/dispatch/${orderId}/pdf/dispatch`;
    const packingListPdfUrl = `${baseUrl}/api/dispatch/${orderId}/pdf/packing-list`;
    
    return NextResponse.json({
      success: true,
      message: 'Dispatch PDFs generated successfully',
      dispatchPdfUrl,
      packingListPdfUrl,
      summary: result.summary
    });
    
  } catch (error: any) {
    console.error('Error generating comprehensive dispatch PDF:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate dispatch PDFs' 
    }, { status: 500 });
  }
}, ['store', 'factory', 'admin']);