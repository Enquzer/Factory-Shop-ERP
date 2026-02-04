
import { NextRequest, NextResponse } from 'next/server';
import { getSampleInspectionById, updateSampleInspection } from '@/lib/sample-qc';
import { generateSampleQCPDF } from '@/lib/sample-qc-pdf-generator';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inspection = await getSampleInspectionById(params.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBlob = await generateSampleQCPDF(inspection);
    
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QC_Report_${inspection.id}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await getSampleInspectionById(params.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBlob = await generateSampleQCPDF(inspection);
    
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QC_Report_${inspection.id}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

