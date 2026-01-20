import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { MarketingOrder, QualityInspection } from './marketing-orders';

export async function generateQCPDF(
  order: MarketingOrder,
  inspection: QualityInspection,
  factoryName: string = 'Carement Fashion',
  factoryAddress: string = 'Addis Ababa, Ethiopia',
  factoryEmail: string = 'info@carementfashion.com'
): Promise<Blob> {
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

  (doc as any).autoTable({
    startY: 65,
    head: [],
    body: orderDetails,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 60 }
    }
  });

  // Inspection Results Section
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTION RESULTS', 15, currentY);

  const resultsData = [
    ['Inspection Stage', inspection.stage],
    ['Color / Size', `${inspection.color || 'N/A'} / ${inspection.size || 'N/A'}`],
    ['Quantity Inspected', inspection.quantityInspected.toString()],
    ['Quantity Approved', inspection.quantityPassed.toString()],
    ['Quantity Rejected', inspection.quantityRejected.toString()],
    ['VERDICT', inspection.status.toUpperCase()]
  ];

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Field', 'Value']],
    body: resultsData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 }
    }
  });

  // Remarks Section
  const remarksY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.text('REMARKS & OBSERVATIONS', 15, remarksY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitRemarks = doc.splitTextToSize(inspection.remarks || 'No specific remarks provided.', pageWidth - 30);
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

  return doc.output('blob');
}
