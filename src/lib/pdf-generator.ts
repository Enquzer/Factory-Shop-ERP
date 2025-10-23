// lib/pdf-generator.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MarketingOrder } from './marketing-orders';

export async function generateOrderPDF(order: MarketingOrder): Promise<string> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add company logo (placeholder - in a real implementation, you would load an actual image)
    // doc.addImage(logoData, 'PNG', 10, 10, 50, 20);
    
    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Addis Ababa, Ethiopia', 105, 27, { align: 'center' });
    doc.text('Phone: +251 11 123 4567 | Email: info@carementfashion.com', 105, 33, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 40, 190, 40);
    
    // Add order title
    doc.setFontSize(18);
    doc.text('Production Order', 105, 50, { align: 'center' });
    
    // Add product image if available
    if (order.imageUrl) {
      try {
        // In a real implementation, you would load the actual image
        // For now, we'll add a placeholder
        doc.setDrawColor(200);
        doc.setFillColor(240, 240, 240);
        doc.rect(150, 55, 40, 40, 'F');
        doc.setTextColor(150);
        doc.setFontSize(10);
        doc.text('Product Image', 170, 75, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
      } catch (error) {
        console.warn('Could not add product image to PDF:', error);
      }
    }
    
    // Add order information
    const startY = order.imageUrl ? 100 : 60;
    doc.setFontSize(12);
    doc.text(`Order Number: ${order.orderNumber}`, 20, startY);
    doc.text(`Product Name: ${order.productName}`, 20, startY + 7);
    doc.text(`Product Code: ${order.productCode}`, 20, startY + 14);
    doc.text(`Total Quantity: ${order.quantity}`, 20, startY + 21);
    doc.text(`Status: ${order.status}`, 20, startY + 28);
    doc.text(`Created By: ${order.createdBy}`, 20, startY + 35);
    doc.text(`Created Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, startY + 42);
    
    if (order.description) {
      doc.text(`Description: ${order.description}`, 20, startY + 49);
    }
    
    // Add a line separator
    doc.line(20, startY + 55, 190, startY + 55);
    
    // Add table title
    doc.setFontSize(14);
    doc.text('Size and Color Breakdown', 105, startY + 65, { align: 'center' });
    
    // Add table with size/color breakdown
    (doc as any).autoTable({
      startY: startY + 70,
      head: [['Size', 'Color', 'Quantity']],
      body: order.items.map(item => [item.size, item.color, item.quantity]),
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || startY + 80;
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 105, finalY + 20, { align: 'center' });
    doc.text('Confidential - For internal use only.', 105, finalY + 25, { align: 'center' });
    
    // Generate PDF as blob
    const pdfBlob = doc.output('blob');
    
    // In a real implementation, you would upload this to a server or save it
    // For now, we'll create a data URL
    return URL.createObjectURL(pdfBlob);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

// Function to download PDF
export function downloadPDF(pdfUrl: string, filename: string) {
  try {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF');
  }
}