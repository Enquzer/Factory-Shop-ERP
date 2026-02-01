import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { MarketingOrder, QualityInspection } from './marketing-orders';
import { CuttingHandover, CuttingHandoverItem } from './cutting';

export async function generateHandoverPDF(
  order: MarketingOrder,
  handover: CuttingHandover,
  items: CuttingHandoverItem[],
  latestQualityInspection?: QualityInspection,
  factoryName: string = 'Carement Fashion',
  factoryAddress: string = 'Addis Ababa, Ethiopia',
  factoryEmail: string = 'info@carementfashion.com'
): Promise<Blob> {
  // Validate input data
  if (!order) throw new Error('Order data is required');
  if (!handover) throw new Error('Handover data is required');
  if (!items || items.length === 0) throw new Error('Handover items are required');
  
  console.log('PDF Generator Input:', { order, handover, items, latestQualityInspection });
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header - Company Info
  doc.setFontSize(22);
  doc.setTextColor(59, 130, 246); // Blue-500
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
  doc.text('CUTTING TO PRODUCTION HANDOVER', pageWidth / 2, 45, { align: 'center' });

  // Order Details Section
  doc.setFontSize(12);
  doc.text('ORDER INFORMATION', 15, 60);
  
  const orderDetails = [
    ['Order Number:', order.orderNumber, 'Product Code:', order.productCode],
    ['Product Name:', order.productName, 'Handover Date:', format(new Date(handover.handoverDate), 'dd MMM yyyy HH:mm')],
    ['Handed Over By:', handover.handoverBy, 'Received By:', handover.receivedBy]
  ];

  (doc as any).autoTable({
    startY: 65,
    body: orderDetails,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 60 }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Handover Quantities Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HANDOVER QUANTITIES', 15, currentY);

  // Validate items data
  const validItems = items.filter(item => item.quantity > 0);
  if (validItems.length === 0) {
    throw new Error('No valid items with quantity > 0 found');
  }

  const itemsTable = validItems.map(item => [
    item.size || 'N/A',
    item.color || 'N/A',
    item.quantity.toString()
  ]);
  
  console.log('Items table data:', itemsTable);

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Size', 'Color', 'Quantity Handed Over']],
    body: itemsTable,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10, halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'left' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Quality Report Integration
  if (latestQualityInspection) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('QUALITY CLEARANCE SUMMARY', 15, currentY);

    const qualityData = [
      ['Status:', latestQualityInspection.status.toUpperCase()],
      ['Inspection Stage:', latestQualityInspection.stage],
      ['Inspected Qty:', latestQualityInspection.quantityInspected.toString()],
      ['Passed Qty:', latestQualityInspection.quantityPassed.toString()],
      ['Rejected Qty:', latestQualityInspection.quantityRejected.toString()],
      ['Remarks:', latestQualityInspection.remarks || 'None']
    ];

    (doc as any).autoTable({
      startY: currentY + 5,
      body: qualityData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 140 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Digital Signatures Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL SIGNATURES', 15, currentY);

  const sigY = currentY + 30;
  
  // Cutting Signature
  doc.line(15, sigY, 65, sigY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(handover.handoverBy, 40, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Cutting Representative', 40, sigY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Digitally signed: ${format(new Date(handover.created_at), 'yyyy-MM-dd HH:mm')}`, 40, sigY + 15, { align: 'center' });

  // Sewing Signature
  doc.line(80, sigY, 130, sigY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(handover.receivedBy, 105, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Sewing/Production Receiver', 105, sigY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Digitally signed: ${format(new Date(handover.created_at), 'yyyy-MM-dd HH:mm')}`, 105, sigY + 15, { align: 'center' });

  // Quality Signature
  doc.line(145, sigY, 195, sigY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(handover.qualityInspectorBy || latestQualityInspection?.inspectorId || 'Quality Dept', 170, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Quality Assurance', 170, sigY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.text('Verified via Quality Module', 170, sigY + 15, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Handover Document ID: HO-${handover.id} | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

  return doc.output('blob');
}
