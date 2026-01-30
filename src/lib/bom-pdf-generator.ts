import jsPDF from 'jspdf';
import { ProductBOMItem } from './bom';
import { MarketingOrder } from './marketing-orders';

interface BOMItem {
  id: string;
  materialName: string;
  materialId: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  unitOfMeasure: string;
  type: string;
  supplier?: string;
  cost?: number;
  color?: string;
  calculatedTotal?: number;
  requestedQty?: number;
  calculatedCost?: number;
  materialImageUrl?: string; // Raw material image URL
}

interface MarketingOrderItem {
  size: string;
  color: string;
  quantity: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  imageUrl?: string;
  items: MarketingOrderItem[];
}

export async function generateBOMPDF(
  orderDetails: OrderDetails,
  bomItems: BOMItem[],
  companyName: string = 'Carement Fashion'
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 10;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // ============================================================
      // HEADER WITH COMPANY LOGO AND NAME
      // ============================================================
      // Draw header background
      doc.setFillColor(45, 55, 72);
      doc.rect(0, 0, pageWidth, 25, 'F');

      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, margin, 15);

      // Report title
      doc.setFontSize(14);
      doc.text('Bill of Materials Report', pageWidth / 2, 15, { align: 'center' });

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 15, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // ============================================================
      // ORDER DETAILS SECTION
      // ============================================================
      let currentY = 35;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order: ${orderDetails.orderNumber}`, margin, currentY);

      currentY += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Product: ${orderDetails.productName}`, margin, currentY);
      doc.text(`Product Code: ${orderDetails.productCode}`, margin + 80, currentY);

      currentY += 6;
      doc.text(`Total Quantity: ${orderDetails.quantity}`, margin, currentY);
      doc.text(`Variants: ${orderDetails.items.length}`, margin + 80, currentY);

      // Add product image if available
      if (orderDetails.imageUrl) {
        try {
          const imgProps = doc.getImageProperties(orderDetails.imageUrl);
          const imgWidth = 25;
          const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
          doc.addImage(orderDetails.imageUrl, 'JPEG', pageWidth - margin - imgWidth, 30, imgWidth, imgHeight);
        } catch (e) {
          console.warn('Could not add product image to PDF:', e);
        }
      }

      // ============================================================
      // AGGREGATE COLOR QUANTITIES
      // ============================================================
      const colorQuantities: Record<string, number> = {};
      orderDetails.items.forEach(item => {
        const color = item.color.toLowerCase();
        colorQuantities[color] = (colorQuantities[color] || 0) + item.quantity;
      });

      // Color quantities table
      currentY += 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Aggregated Color Quantities', margin, currentY);

      currentY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Color', margin, currentY);
      doc.text('Quantity', margin + 50, currentY);

      currentY += 4;
      doc.line(margin, currentY, margin + 80, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      
      // First, try to use order-level color quantities
      const bomColors: Record<string, { quantity: number, count: number }> = {};
      for (const [color, quantity] of Object.entries(colorQuantities)) {
        const colorKey = color.toLowerCase();
        bomColors[colorKey] = { quantity, count: 0 };
      }
      
      // If order-level color quantities are empty, fall back to aggregating from bomItems
      if (Object.keys(bomColors).length === 0) {
        bomItems.forEach(item => {
          if (item.color) {
            const colorKey = item.color.toLowerCase();
            if (!bomColors[colorKey]) {
              bomColors[colorKey] = { quantity: 0, count: 0 };
            }
            // Use requestedQty if available, otherwise use calculatedTotal as fallback
            const qtyToAdd = item.requestedQty || item.calculatedTotal || 0;
            bomColors[colorKey].quantity += qtyToAdd;
            bomColors[colorKey].count += 1;
          }
        });
      }
      
      // Display the aggregated colors
      for (const [color, data] of Object.entries(bomColors)) {
        doc.text(color.charAt(0).toUpperCase() + color.slice(1), margin, currentY);
        doc.text(data.quantity.toString(), margin + 50, currentY);
        currentY += 5;
      }

      // ============================================================
      // BOM ITEMS TABLE
      // ============================================================
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('BOM Items', margin, currentY);
      currentY += 6;

      // Table headers
      const headers = ['Type', 'Material', 'Color', 'Unit', 'Qty/Unit', 'Wastage %', 'Requested Qty', 'Calc. Amount', 'Calc. Cost'];
      const colWidths = [22, 40, 28, 15, 22, 22, 28, 28, 28];
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY - 4, pageWidth - 2 * margin, 7, 'F');
      
      let colX = margin;
      headers.forEach((h, i) => {
        doc.text(h, colX + 1, currentY);
        colX += colWidths[i];
      });

      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 4;

      // Table rows
      doc.setFont('helvetica', 'normal');
      let totalMaterialCost = 0;
      const typeSummary: Record<string, { amount: number; cost: number; materials: string[] }> = {};

      for (const item of bomItems) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
          
          // Re-add headers on new page
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, currentY - 4, pageWidth - 2 * margin, 7, 'F');
          colX = margin;
          headers.forEach((h, i) => {
            doc.text(h, colX + 1, currentY);
            colX += colWidths[i];
          });
          currentY += 5;
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 4;
          doc.setFont('helvetica', 'normal');
        }

        // Use the exact values from the BOM item as displayed in the UI
        const requestedQty = item.requestedQty || 0;
        const calcAmount = item.calculatedTotal || 0;
        const calcCost = item.calculatedCost || 0;
        totalMaterialCost += calcCost;

        // Accumulate for summary
        if (!typeSummary[item.type]) {
          typeSummary[item.type] = { amount: 0, cost: 0, materials: [] };
        }
        typeSummary[item.type].amount += calcAmount;
        typeSummary[item.type].cost += calcCost;
        
        // Avoid duplicating color info in material names
        // Extract base material name without redundant color suffix
        const baseMaterialName = item.materialName.split(' - ')[0]; // Get just the type (e.g., "Fabric", "Thread")
        typeSummary[item.type].materials.push(`${baseMaterialName} - ${item.color || 'N/A'}`);

        // Draw row
        colX = margin;
        const rowValues = [
          item.type,
          item.materialName,
          item.color || '-',
          item.unitOfMeasure,
          item.quantityPerUnit.toString(),
          `${item.wastagePercentage || 0}`,
          requestedQty.toString(),
          calcAmount.toFixed(2),
          `$${calcCost.toFixed(2)}`
        ];
        
        rowValues.forEach((val, i) => {
          doc.text(val.substring(0, 15), colX + 1, currentY);
          colX += colWidths[i];
        });

        // Add material image if available
        if (item.materialImageUrl) {
          try {
            const imgProps = doc.getImageProperties(item.materialImageUrl);
            const imgWidth = 15;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            const imgY = currentY - 4;
            
            // Position image at the end of the row
            const imgX = pageWidth - margin - imgWidth;
            doc.addImage(item.materialImageUrl, 'JPEG', imgX, imgY, imgWidth, imgHeight);
          } catch (e) {
            console.warn('Could not add material image to PDF:', e);
          }
        }

        currentY += 5;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setDrawColor(0, 0, 0);
      }

      // ============================================================
      // SUMMARY SECTION
      // ============================================================
      currentY += 12;
      
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, currentY);
      currentY += 8;

      // Total cost box
      doc.setFillColor(45, 55, 72);
      doc.rect(margin, currentY - 5, 80, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`Total Material Cost: $${totalMaterialCost.toFixed(2)}`, margin + 3, currentY + 2);
      doc.setTextColor(0, 0, 0);

      // Summary by material type
      currentY += 18;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary by Material Type', margin, currentY);
      currentY += 6;

      // Table headers for summary
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY - 4, pageWidth - 2 * margin, 7, 'F');
      
      const summaryHeaders = ['Type', 'Amount', 'Cost', 'Materials'];
      const summaryColWidths = [40, 40, 40, pageWidth - (margin * 2) - 120];
      
      let summaryColX = margin;
      summaryHeaders.forEach((h, i) => {
        doc.text(h, summaryColX + 1, currentY);
        summaryColX += summaryColWidths[i];
      });
      
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 4;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      for (const [type, data] of Object.entries(typeSummary)) {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
          
          // Re-add headers on new page
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, currentY - 4, pageWidth - 2 * margin, 7, 'F');
          
          summaryColX = margin;
          summaryHeaders.forEach((h, i) => {
            doc.text(h, summaryColX + 1, currentY);
            summaryColX += summaryColWidths[i];
          });
          
          currentY += 5;
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 4;
          doc.setFont('helvetica', 'normal');
        }

        // Clean up material names by removing duplicate color info
        const cleanedMaterials = data.materials.map(material => {
          // Extract just the base material name without redundant color (e.g., convert "Fabric - Blue - Blue" to "Blue")
          const parts = material.split(' - ');
          if (parts.length >= 2) {
            // Return just the color part to avoid duplication
            return parts[parts.length - 1];
          }
          return material;
        });

        summaryColX = margin;
        const summaryRowValues = [
          type,
          data.amount.toFixed(2),
          `$${data.cost.toFixed(2)}`,
          cleanedMaterials.join(', ')
        ];
        
        summaryRowValues.forEach((val, i) => {
          // Limit text length and add ellipsis if needed
          let displayText = val;
          if (displayText.length > 50) {
            displayText = displayText.substring(0, 47) + '...';
          }
          doc.text(displayText, summaryColX + 1, currentY);
          summaryColX += summaryColWidths[i];
        });

        currentY += 5;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.setDrawColor(0, 0, 0);
        currentY += 2;
      }

      // Save the PDF
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      resolve(pdfUrl);
    } catch (error) {
      console.error('Error generating BOM PDF:', error);
      reject(error);
    }
  });
}

export function downloadBOMPDF(pdfUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
}