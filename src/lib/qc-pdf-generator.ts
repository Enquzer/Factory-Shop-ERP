import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MarketingOrder, QualityInspection } from './marketing-orders';

export async function generateQCPDF(
  order: MarketingOrder,
  inspection: QualityInspection,
  factoryName: string = 'Carement Fashion',
  factoryAddress: string = 'Addis Ababa, Ethiopia',
  factoryEmail: string = 'info@carementfashion.com'
): Promise<Blob> {
  try {
    console.log('Starting PDF generation for order:', order.orderNumber);
    console.log('Inspection data:', inspection);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

  // Header - Company Info
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(factoryName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Gray-500
  doc.text(`${factoryAddress} | ${factoryEmail}`, pageWidth / 2, 28, { align: 'center' });
  
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(15, 35, pageWidth - 15, 35);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'bold');
  doc.text('QUALITY INSPECTION REPORT', pageWidth / 2, 45, { align: 'center' });

  // Order Details Section
  doc.setFontSize(12);
  doc.text('ORDER INFORMATION', 15, 60);
  
  const orderDetails = [
    ['Order Number:', order.orderNumber, 'Product Code:', order.productCode],
    ['Product Name:', order.productName, 'Target Qty:', order.quantity.toString()],
    ['Current Status:', order.status, 'Inspection Date:', format(new Date(inspection.date), 'dd MMMM yyyy')]
  ];

  autoTable(doc, {
    startY: 65,
    head: [],
    body: orderDetails,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 45 },
      2: { fontStyle: 'bold', cellWidth: 25 },
      3: { cellWidth: 45 }
    }
  });

  // Inspection Results Section
  const currentY = ((doc as any).lastAutoTable?.finalY || 95) + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AQL INSPECTION SUMMARY', 15, currentY);

  const resultsData = [
    ['Inspection Stage', inspection.stage],
    ['Color / Size', `${inspection.color || 'N/A'} / ${inspection.size || 'N/A'}`],
    ['Sample Size (Checked)', (inspection.sampleSize || inspection.quantityInspected).toString()],
    ['Critical Defects', (inspection.totalCritical || 0).toString()],
    ['Major Defects', (inspection.totalMajor || 0).toString()],
    ['Minor Defects', (inspection.totalMinor || 0).toString()],
    ['VERDICT', inspection.status.toUpperCase()]
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [['AQL Criteria', 'Results']],
    body: resultsData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 }
    }
  });

  // Detailed Defect Matrix (if available)
  let nextY = (doc as any).lastAutoTable.finalY + 15;
  if (inspection.defectJson) {
    try {
      const defects = JSON.parse(inspection.defectJson);
      if (defects && Array.isArray(defects) && defects.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAILED DEFECT MATRIX', 15, nextY);

        const defectRows = defects
          .filter((d: any) => d.critical > 0 || d.major > 0 || d.minor > 0)
          .map((d: any) => [d.category, d.point, d.critical, d.major, d.minor]);

        if (defectRows.length > 0) {
          autoTable(doc, {
            startY: nextY + 5,
            head: [['Category', 'Inspection Point', 'Crit', 'Maj', 'Min']],
            body: defectRows,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], textColor: 255 },
            styles: { fontSize: 8 },
            columnStyles: {
              2: { halign: 'center' },
              3: { halign: 'center' },
              4: { halign: 'center' }
            }
          });
          nextY = (doc as any).lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No defects were recorded during this inspection.', 15, nextY + 7);
            nextY += 15;
        }
      }
    } catch (e) {
      console.error("Failed to parse defectJson for PDF", e);
    }
  }

  // Remarks Section
  const remarksY = nextY;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('REMARKS & OBSERVATIONS', 15, remarksY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitRemarks = doc.splitTextToSize(inspection.remarks || 'No additional remarks provided.', pageWidth - 30);
  doc.text(splitRemarks, 15, remarksY + 7);

  // Footer / Signatures
  const footerY = doc.internal.pageSize.height - 30;
  doc.line(15, footerY, 75, footerY);
  doc.line(pageWidth - 75, footerY, pageWidth - 15, footerY);
  
  doc.setFontSize(9);
  doc.text('Inspector Signature', 45, footerY + 5, { align: 'center' });
  doc.text(`${inspection.stage} Supervisor`, pageWidth - 45, footerY + 5, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} by Quality System`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

    const blob = doc.output('blob');
    console.log('PDF generation completed successfully, blob size:', blob.size);
    return blob;
  } catch (error) {
    console.error('Error in PDF generation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to generate QC PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
