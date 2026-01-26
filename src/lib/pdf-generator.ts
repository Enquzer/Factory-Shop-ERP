// lib/pdf-generator.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MarketingOrder } from './marketing-orders';
import { Product } from './products';
import { Order } from './orders';
import { Shop } from './shops';

// Function to decode HTML entities and fix text rendering issues
function decodeHTMLEntities(text: string): string {
  if (!text) return text;
  
  // First decode HTML entities
  let decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&'); // This must be last to avoid double decoding
  
  // Address potential character spacing issues
  // If text appears to have been split character by character with spaces
  // (like "O r d e r" instead of "Order"), try to reconstruct it
  // This is a heuristic approach that looks for patterns of single letters
  // separated by spaces in a consistent pattern
  if (hasCharacterSpacing(decoded)) {
    decoded = reconstructSpacedText(decoded);
  }
  
  return decoded;
}

// Helper function to detect if text has character spacing issue
function hasCharacterSpacing(text: string): boolean {
  // Look for patterns where single characters are separated by spaces
  // This is a heuristic that checks if there are many single-letter words
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const singleCharWords = words.filter(word => word.length === 1);
  
  // If more than 50% of the words are single characters, it might have spacing issue
  return words.length > 2 && (singleCharWords.length / words.length) > 0.5;
}

// Helper function to reconstruct text that was split character by character
function reconstructSpacedText(text: string): string {
  // Simple approach: if we have single letters separated by single spaces,
  // join them back together. For example: "O r d e r" -> "Order"
  // Split the text by spaces and process each segment
  const segments = text.split(' ');
  
  // Check if this looks like spaced-out characters
  const allSingleChars = segments.every(seg => seg.length === 1 && /[a-zA-Z]/.test(seg));
  
  if (allSingleChars && segments.length > 1) {
    // Join all single characters together
    return segments.join('');
  }
  
  // If not all single characters, return original text
  return text;
}

// Function to convert image to base64
async function imageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Function to safely convert ArrayBuffer to Base64 without stack size limits
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to convert image URL to base64 (server-side and client-side robust)
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    if (!url || url.trim() === '') {
      throw new Error('Empty URL provided');
    }
    
    // For absolute URLs, fetch the image
    if (url.startsWith('http')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      
      // Use chunked conversion or robust method
      let base64 = '';
      if (typeof window === 'undefined') {
        const buffer = Buffer.from(arrayBuffer);
        base64 = buffer.toString('base64');
      } else {
        base64 = arrayBufferToBase64(arrayBuffer);
      }
      
      return `data:${contentType};base64,${base64}`;
    }
    
    // For relative URLs, try to resolve them properly
    if (typeof window === 'undefined') {
      // Server-side: Use Node.js file system
      const fs = await import('fs');
      const path = await import('path');
      
      // Construct the full path to the image file
      const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
      // Also handle public dir
      const pathsToTry = [
        path.join(process.cwd(), 'public', cleanUrl),
        path.join(process.cwd(), cleanUrl)
      ];
      
      for (const imagePath of pathsToTry) {
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64 = imageBuffer.toString('base64');
          let contentType = 'image/png';
          if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (url.toLowerCase().endsWith('.gif')) {
            contentType = 'image/gif';
          }
          return `data:${contentType};base64,${base64}`;
        }
      }
      throw new Error(`Image file not found: ${url}`);
    } else {
      // Client-side: Use fetch with current origin if relative
      const resolvedUrl = url.startsWith('/') ? url : `/${url}`;
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      return `data:${contentType};base64,${base64}`;
    }
  } catch (error) {
    console.warn(`Failed code to convert image to base64 for URL ${url}:`, error);
    throw error;
  }
}

// Function to generate a production planning PDF
export async function generateProductionPlanningPDF(
  orders: MarketingOrder[], 
  ganttImageData?: string,
  reportType: 'full' | 'cutting' | 'sewing' | 'packing' = 'full',
  operationBulletins?: Record<string, any[]>
): Promise<string> {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const title = reportType.charAt(0).toUpperCase() + reportType.slice(1) + ' Planning Report';
    await addHeaderAndLogo(doc, title);
    
    // Fetch unique images first to avoid redundant requests
    const imageCache: Record<string, string | null> = {};
    const imagePromises = orders.map(async (order: any) => {
      // Logic: Only show image for the first component of an order (to match UI)
      // or if it's not a component at all.
      const isFirstComponent = !order.isComponent || order.componentIndex === 0;
      
      if (order.imageUrl && isFirstComponent) {
        if (imageCache[order.imageUrl]) return imageCache[order.imageUrl];
        
        try {
          const b64 = await imageUrlToBase64(order.imageUrl);
          imageCache[order.imageUrl] = b64;
          return b64;
        } catch (error) {
          console.warn(`Could not load image for ${order.productCode}:`, error);
          return null;
        }
      }
      return null;
    });

    const images = await Promise.all(imagePromises);

    // Define columns based on report type
    let head: string[][] = [];
    let columnStyles: any = {
      0: { cellWidth: 8 },
      1: { cellWidth: 15 }
    };

    if (reportType === 'cutting') {
      head = [['SEQ', 'IMAGE', 'ORDER NO / PRODUCT', 'PLACEMENT', 'DELIVERY', 'QTY', 'CUTTING START', 'CUTTING FINISH']];
      columnStyles = { ...columnStyles, 5: { halign: 'right' } };
    } else if (reportType === 'sewing') {
      head = [['SEQ', 'IMAGE', 'ORDER NO / PRODUCT', 'PLACEMENT', 'DELIVERY', 'QTY', 'SEWING START', 'SEWING FINISH']];
      columnStyles = { ...columnStyles, 5: { halign: 'right' } };
    } else if (reportType === 'packing') {
      head = [['SEQ', 'IMAGE', 'ORDER NO / PRODUCT', 'PLACEMENT', 'DELIVERY', 'QTY', 'PACKING START', 'PACKING FINISH']];
      columnStyles = { ...columnStyles, 5: { halign: 'right' } };
    } else {
      // Full Plan
      head = [['SEQ', 'IMAGE', 'ORDER NO', 'CODE', 'QTY', 'PCS/SET', 'SMV', 'MP', 'EFF%', 'O/P', 'DAYS', 'CUTTING', 'SEWING', 'PACKING']];
      columnStyles = { 
        ...columnStyles, 
        4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 
        7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' } 
      };
    }

    // Add table
    const tableData = (orders as any[]).map((order, idx) => {
      const isComp = order.isComponent === true;
      const compName = order.componentName ? ` (${order.componentName})` : '';
      const orderProduct = `${order.orderNumber || ''}${compName} / ${order.productCode || ''}`;
      
      if (reportType === 'cutting') {
        return [
          (idx + 1).toString(),
          '',
          orderProduct,
          order.orderPlacementDate || '',
          order.plannedDeliveryDate || '',
          order.quantity?.toString() || '0',
          order.cuttingStartDate || '',
          order.cuttingFinishDate || ''
        ];
      } else if (reportType === 'sewing') {
        return [
          (idx + 1).toString(),
          '',
          orderProduct,
          order.orderPlacementDate || '',
          order.plannedDeliveryDate || '',
          order.quantity?.toString() || '0',
          order.sewingStartDate || '',
          order.sewingFinishDate || ''
        ];
      } else if (reportType === 'packing') {
        return [
          (idx + 1).toString(),
          '',
          orderProduct,
          order.orderPlacementDate || '',
          order.plannedDeliveryDate || '',
          order.quantity?.toString() || '0',
          order.packingStartDate || '',
          order.packingFinishDate || ''
        ];
      } else {
        return [
          (idx + 1).toString(),
          '', // Placeholder for image
          order.orderNumber || '',
          order.productCode || '',
          order.quantity?.toString() || '0',
          (order.piecesPerSet || 1).toString(),
          (order.smv || 0).toFixed(2),
          (order.manpower || 0).toString(),
          `${(order.efficiency || 70).toFixed(1)}%`,
          (order.sewingOutputPerDay || 0).toString(),
          (order.operationDays || 0).toString(),
          order.cuttingStartDate || '',
          order.sewingStartDate || '',
          order.packingStartDate || ''
        ];
      }
    });

    (doc as any).autoTable({
      startY: 55,
      head: head,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        cellPadding: 1,
        overflow: 'linebreak',
        valign: 'middle'
      },
      columnStyles: columnStyles,
      didDrawCell: (data: any) => {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          const imageBase64 = images[rowIndex];
          
          if (imageBase64) {
            try {
              const padding = 1;
              const imgW = data.cell.width - (padding * 2);
              const imgH = data.cell.height - (padding * 2);
              doc.addImage(imageBase64, 'PNG', data.cell.x + padding, data.cell.y + padding, imgW, imgH);
            } catch (error) {
              console.warn('Error adding image to cell:', error);
            }
          }
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // For Sewing Plan, add Operation Bulletin for each order
    if (reportType === 'sewing' && operationBulletins) {
      orders.forEach((order: any) => {
        const key = order.displayId || order.id;
        const obData = operationBulletins[key];
        
        if (obData && obData.length > 0) {
          // Check if we need a new page
          if (currentY > 160) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const compLabel = order.componentName ? ` - ${order.componentName}` : '';
          doc.text(`Operation Bulletin: ${order.orderNumber} / ${order.productCode}${compLabel}`, 15, currentY);
          currentY += 5;

          (doc as any).autoTable({
            startY: currentY,
            head: [['Seq', 'Operation', 'Machine', 'SMV', 'MP']],
            body: obData.map(item => [item.sequence, item.operationName, item.machineType, item.smv?.toFixed(2), item.manpower]),
            theme: 'striped',
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [52, 73, 94] },
            margin: { left: 15 }
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;
        }
      });
    }

    // Add Gantt Chart Image if provided (mostly for full plan)
    if (ganttImageData && reportType === 'full') {
      // Check if we need a new page for the chart
      if (currentY > 140) {
        doc.addPage();
        currentY = 20;
        doc.setFontSize(14);
        doc.text('Production Timeline', 148, currentY, { align: 'center' });
        currentY += 10;
      } else {
        doc.setFontSize(14);
        doc.text('Production Timeline', 148, currentY, { align: 'center' });
        currentY += 5;
      }

      const imgWidth = 277;
      const imgHeight = 100;
      doc.addImage(ganttImageData, 'PNG', 10, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    }

    addFooter(doc, currentY);
    
    return URL.createObjectURL(doc.output('blob'));
  } catch (error) {
    console.error('Error generating production planning PDF:', error);
    throw new Error('Failed to generate production planning PDF');
  }
}

// Function to add logo and header to PDF
export async function addHeaderAndLogo(doc: jsPDF, title: string) {
  // Add company logo on top left
  try {
    if (typeof window === 'undefined') {
      // Server-side: Use Node.js file system
      const fs = await import('fs');
      const path = await import('path');
      
      // Try to read the base64 logo file first
      try {
        const logoBase64Path = path.join(process.cwd(), 'public', 'logo-base64.txt');
        const logoBase64 = fs.readFileSync(logoBase64Path, 'utf8');
        
        // Clean up the base64 string (remove any whitespace)
        let cleanLogoBase64 = logoBase64.trim();
        
        // Ensure the data URI prefix is present
        let logoDataUri: string;
        if (cleanLogoBase64.startsWith('data:image')) {
          logoDataUri = cleanLogoBase64;
        } else {
          // Add the data URI prefix
          logoDataUri = 'data:image/png;base64,' + cleanLogoBase64;
        }
        
        doc.addImage(logoDataUri, 'PNG', 15, 10, 40, 20);
        return;
      } catch (base64Error) {
        console.warn('Could not load base64 logo, trying PNG logo:', base64Error);
        // Fallback: Try to load the actual logo.png file
        try {
          const logoPath = path.join(process.cwd(), 'public', 'logo.png');
          const logoBuffer = fs.readFileSync(logoPath);
          const logoBase64 = logoBuffer.toString('base64');
          const logoDataUri = 'data:image/png;base64,' + logoBase64;
          doc.addImage(logoDataUri, 'PNG', 15, 10, 40, 20);
          return;
        } catch (pngError) {
          throw new Error(`Could not load either logo file: ${pngError instanceof Error ? pngError.message : String(pngError)}`);
        }
      }
    } else {
      // Client-side: Use fetch
      // Try to read the base64 logo file first
      const logoBase64Response = await fetch('/logo-base64.txt');
      if (!logoBase64Response.ok) {
        throw new Error(`Failed to fetch logo: ${logoBase64Response.status} ${logoBase64Response.statusText}`);
      }
      const logoBase64 = await logoBase64Response.text();
      
      // Clean up the base64 string (remove any whitespace)
      let cleanLogoBase64 = logoBase64.trim();
      
      // Ensure the data URI prefix is present
      let logoDataUri: string;
      if (cleanLogoBase64.startsWith('data:image')) {
        logoDataUri = cleanLogoBase64;
      } else {
        // Add the data URI prefix
        logoDataUri = 'data:image/png;base64,' + cleanLogoBase64;
      }
      
      doc.addImage(logoDataUri, 'PNG', 15, 10, 40, 20);
    }
  } catch (error) {
    console.warn('Could not load logo, using placeholder:', error);
    // Fallback to placeholder if logo can't be loaded
    doc.setDrawColor(0);
    doc.setFillColor(22, 160, 133); // Carement green color
    doc.rect(15, 10, 40, 20, 'F'); // Logo placeholder
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('LOGO', 35, 22, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
  
  // Add company header
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(decodeHTMLEntities('Carement Fashion'), 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(decodeHTMLEntities('Addis Ababa, Ethiopia'), 105, 27, { align: 'center' });
  doc.text(decodeHTMLEntities('Phone: +251 11 123 4567 | Email: info@carementfashion.com'), 105, 33, { align: 'center' });
  
  // Add document title
  doc.setFontSize(18);
  doc.text(decodeHTMLEntities(title), 105, 45, { align: 'center' });
  
  // Add a line separator
  doc.line(20, 50, 190, 50);
}

// Function to add footer to PDF
export function addFooter(doc: jsPDF, finalY: number) {
  // Add "For internal use only" at the bottom
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray color
  doc.text(decodeHTMLEntities('This document is generated automatically by the Carement Fashion ERP system.'), 105, pageHeight - 15, { align: 'center' });
  doc.text(decodeHTMLEntities('Confidential - For internal use only.'), 105, pageHeight - 10, { align: 'center' });
  doc.setTextColor(0, 0, 0); // Reset to black
}

export async function generateOrderPDF(order: MarketingOrder): Promise<string> {
  try {
    console.log('Starting PDF generation for order:', order.orderNumber);
    
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    console.log('PDF document created, adding header...');
    
    // Add header and logo
    try {
      await addHeaderAndLogo(doc, 'Production Order');
      console.log('Header and logo added successfully');
    } catch (headerError) {
      console.warn('Error adding header/logo, continuing without it:', headerError);
      // Continue without header if it fails
      doc.setFontSize(18);
      doc.text('Production Order', 105, 20, { align: 'center' });
    }
    
    // Add product image if available
    if (order.imageUrl) {
      try {
        console.log('Loading product image from:', order.imageUrl);
        // Try to load the actual product image
        const imageBase64 = await imageToBase64(order.imageUrl);
        doc.addImage(imageBase64, 'PNG', 150, 55, 40, 40);
        console.log('Product image added successfully');
      } catch (error) {
        console.warn('Could not load product image, using placeholder:', error);
        // Fallback to placeholder if image can't be loaded
        doc.setDrawColor(200);
        doc.setFillColor(240, 240, 240);
        doc.rect(150, 55, 40, 40, 'F');
        doc.setTextColor(150);
        doc.setFontSize(10);
        doc.text('Product Image', 170, 75, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
      }
    }
    
    console.log('Adding order information...');
    
    // Add order information
    const startY = order.imageUrl ? 100 : 60;
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Order Number: ${order.orderNumber}`), 20, startY);
    doc.text(decodeHTMLEntities(`Product Name: ${order.productName}`), 20, startY + 7);
    doc.text(decodeHTMLEntities(`Product Code: ${order.productCode}`), 20, startY + 14);
    doc.text(decodeHTMLEntities(`Total Quantity: ${order.quantity}`), 20, startY + 21);
    doc.text(decodeHTMLEntities(`Status: ${order.status}`), 20, startY + 28);
    doc.text(decodeHTMLEntities(`Created By: ${order.createdBy}`), 20, startY + 35);
    doc.text(decodeHTMLEntities(`Created Date: ${new Date(order.createdAt).toLocaleDateString()}`), 20, startY + 42);
    
    // Add new date fields
    if (order.orderPlacementDate) {
      doc.text(decodeHTMLEntities(`Order Placement Date: ${new Date(order.orderPlacementDate).toLocaleDateString()}`), 20, startY + 49);
    }
    
    if (order.plannedDeliveryDate) {
      doc.text(decodeHTMLEntities(`Planned Delivery Date: ${new Date(order.plannedDeliveryDate).toLocaleDateString()}`), 20, startY + 56);
    }
    
    // Add sample status tracking fields
    let currentY = startY + 49;
    if (order.orderPlacementDate) currentY += 7;
    if (order.plannedDeliveryDate) currentY += 7;
    
    if (order.sizeSetSampleApproved) {
      doc.text(decodeHTMLEntities(`Size Set Sample Approved: ${new Date(order.sizeSetSampleApproved).toLocaleDateString()}`), 20, currentY);
      currentY += 7;
    }
    
    if (order.productionStartDate) {
      doc.text(decodeHTMLEntities(`Production Start Date: ${new Date(order.productionStartDate).toLocaleDateString()}`), 20, currentY);
      currentY += 7;
    }
    
    if (order.productionFinishedDate) {
      doc.text(decodeHTMLEntities(`Production Finished Date: ${new Date(order.productionFinishedDate).toLocaleDateString()}`), 20, currentY);
      currentY += 7;
    }
    
    if (order.description) {
      doc.text(decodeHTMLEntities(`Description: ${order.description}`), 20, currentY);
      currentY += 7;
    }
    
    // Add a line separator
    doc.line(20, currentY + 5, 190, currentY + 5);
    
    // Add table title
    doc.setFontSize(14);
    doc.text('Size and Color Breakdown', 105, currentY + 15, { align: 'center' });
    
    console.log('Adding items table with', order.items.length, 'items');
    
    // Add table with size/color breakdown
    (doc as any).autoTable({
      startY: currentY + 20,
      head: [['Size', 'Color', 'Quantity']],
      body: order.items.map(item => [decodeHTMLEntities(item.size), decodeHTMLEntities(item.color), item.quantity]),
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
    
    console.log('Table added successfully');
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || currentY + 30;
    addFooter(doc, finalY);
    
    console.log('Generating PDF blob...');
    
    // Generate PDF as blob
    const pdfBlob = doc.output('blob');
    
    console.log('PDF blob generated, size:', pdfBlob.size, 'bytes');
    
    // In a real implementation, you would upload this to a server or save it
    // For now, we'll create a data URL
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    console.log('Blob URL created:', blobUrl);
    
    return blobUrl;
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to generate a shop order PDF with logo and product images (returns Blob for server-side use)
export async function generateShopOrderPDFBlob(order: Order): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Shop Order Receipt');
    
    // Add order information
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Order ID: ${order.id}`), 20, 60);
    doc.text(decodeHTMLEntities(`Shop Name: ${order.shopName}`), 20, 67);
    doc.text(decodeHTMLEntities(`Order Date: ${new Date(order.date).toLocaleDateString()}`), 20, 74);
    doc.text(decodeHTMLEntities(`Status: ${order.status}`), 20, 81);
    
    // Enhanced Order Summary
    const uniqueDesigns = new Set(order.items.map(item => item.productId)).size;
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.text(decodeHTMLEntities(`Unique Designs: ${uniqueDesigns}`), 20, 88);
    doc.text(decodeHTMLEntities(`Total Items: ${totalItems}`), 20, 95);
    doc.text(decodeHTMLEntities(`Total Amount: ETB ${order.amount.toLocaleString()}`), 20, 102);
    
    // Add delivery date if available
    let currentY = 109;
    if (order.deliveryDate) {
      doc.text(decodeHTMLEntities(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`), 20, currentY);
      currentY += 7;
    }
    
    // Add delivery performance metrics if available
    if (order.requestedDeliveryDate || order.expectedReceiptDate || order.actualDispatchDate || order.confirmationDate) {
      doc.text(decodeHTMLEntities('Delivery Performance:'), 20, currentY);
      currentY += 7;
      
      if (order.requestedDeliveryDate) {
        doc.text(decodeHTMLEntities(`  Requested Delivery: ${new Date(order.requestedDeliveryDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.expectedReceiptDate) {
        doc.text(decodeHTMLEntities(`  Expected Receipt: ${new Date(order.expectedReceiptDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.actualDispatchDate) {
        doc.text(decodeHTMLEntities(`  Actual Dispatch: ${new Date(order.actualDispatchDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.confirmationDate) {
        doc.text(decodeHTMLEntities(`  Confirmation Date: ${new Date(order.confirmationDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
    }
    
    // Add dispatch information if available
    if (order.dispatchInfo) {
      doc.text(decodeHTMLEntities('Dispatch Information:'), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Shop Name: ${order.dispatchInfo.shopName}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Transport License Plate: ${order.dispatchInfo.transportLicensePlate}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Contact Person: ${order.dispatchInfo.contactPerson}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Dispatch Date: ${order.dispatchInfo.dispatchDate}`), 20, currentY);
      if (order.dispatchInfo.driverName) {
        currentY += 7;
        doc.text(decodeHTMLEntities(`  Driver Name: ${order.dispatchInfo.driverName}`), 20, currentY);
      }
      if (order.dispatchInfo.attachments && order.dispatchInfo.attachments.length > 0) {
        currentY += 7;
        doc.text(decodeHTMLEntities(`  Attachments: ${order.dispatchInfo.attachments.join(', ')}`), 20, currentY);
      }
    }
    
    // Add a line separator
    doc.line(20, currentY + 5, 190, currentY + 5);
    currentY += 10;
    
    // Add table title
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Order Items'), 105, currentY, { align: 'center' });
    
    // Create table data with image placeholders
    const imagePromises = [];
    
    for (const item of order.items) {
      // Create a promise for each image
      const imagePromise = (async () => {
        let imageBase64 = null;
        // Try to load the main product image first, then variant image
        const imageUrl = item.imageUrl || item.variant?.imageUrl;
        if (imageUrl) {
          try {
            imageBase64 = await imageUrlToBase64(imageUrl);
          } catch (error) {
            console.warn(`Could not load product image for ${item.name}:`, error);
          }
        }
        return imageBase64;
      })();
      
      imagePromises.push(imagePromise);
    }
    
    // Wait for all images to load
    const images = await Promise.all(imagePromises);
    
    // Add table with order items including images
    (doc as any).autoTable({
      startY: currentY + 15,
      head: [['Product Image', 'Product ID', 'Product', 'Variant', 'Quantity', 'Price (ETB)', 'Total (ETB)']],
      body: order.items.map((item, index) => {
        const imageBase64 = images[index];
        return [
          { 
            content: '', 
            styles: { 
              cellWidth: 30,
              minCellHeight: 20
            }
          },
          item.productId, // Add product ID
          decodeHTMLEntities(item.name),
          decodeHTMLEntities(`${item.variant.color}, ${item.variant.size}`),
          item.quantity,
          item.price.toLocaleString(),
          (item.quantity * item.price).toLocaleString()
        ];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      didDrawCell: (data: any) => {
        // Add images to the first column after the table is drawn
        if (data.column.index === 0 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          const imageBase64 = images[rowIndex];
          
          if (imageBase64) {
            try {
              // Calculate position to center the image in the cell
              const cellWidth = data.cell.width;
              const cellHeight = data.cell.height;
              const imgWidth = 26;
              const imgHeight = 16;
              const x = data.cell.x + (cellWidth - imgWidth) / 2;
              const y = data.cell.y + (cellHeight - imgHeight) / 2;
              
              doc.addImage(imageBase64, 'PNG', x, y, imgWidth, imgHeight);
            } catch (error) {
              console.warn('Could not add image to PDF:', error);
            }
          } else {
            // Add placeholder if no image
            doc.setDrawColor(200);
            doc.setFillColor(240, 240, 240);
            doc.rect(data.cell.x + 2, data.cell.y + 2, 26, 16, 'F');
            doc.setTextColor(150);
            doc.setFontSize(8);
            doc.text(decodeHTMLEntities('No Image'), data.cell.x + 15, data.cell.y + 10, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    });
    
    // Add payment information if available
    let finalY = (doc as any).lastAutoTable.finalY || currentY + 30;
    finalY += 15; // Increased spacing to prevent overlap
    
    if (order.paymentSlipUrl) {
      doc.setFontSize(14);
      doc.text(decodeHTMLEntities('Payment Information'), 20, finalY);
      finalY += 10;
      
      doc.setFontSize(12);
      doc.text(decodeHTMLEntities('Payment Status: Payment Confirmed'), 20, finalY);
      finalY += 10; // Increased spacing
      
      doc.text(decodeHTMLEntities('Payment Slip:'), 20, finalY);
      finalY += 10; // Increased spacing
      
      // Try to add payment slip image
      try {
        const paymentSlipBase64 = await imageUrlToBase64(order.paymentSlipUrl);
        // Check if we need a new page
        if (finalY > 240) { // Near bottom of page
          doc.addPage();
          finalY = 20;
        }
        doc.addImage(paymentSlipBase64, 'PNG', 20, finalY, 80, 60);
        finalY += 75; // Increased spacing after image
      } catch (error) {
        console.warn('Could not load payment slip image:', error);
        doc.text('Payment slip image not available', 20, finalY);
        finalY += 15; // Increased spacing
      }
    }
    
    // Add order progress/status information
    // Check if we need a new page
    if (finalY > 200) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Order Progress'), 20, finalY);
    finalY += 10;
    
    // Add status flow information
    const statuses = [
      'Order Placed',
      'Payment Awaiting',
      'Payment Confirmed',
      'Order Dispatched',
      'Order Delivered',
      'Order Cancelled'
    ];
    
    // Find current status index
    const statusOrder = ['Pending', 'Awaiting Payment', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];
    const currentStatusIndex = statusOrder.indexOf(order.status);
    
    // Add status indicators
    statuses.forEach((status, index) => {
      const isCurrent = index === currentStatusIndex;
      const isCompleted = index < currentStatusIndex;
      
      doc.setFontSize(10);
      if (isCurrent) {
        doc.setTextColor(22, 160, 133); // Carement green
        doc.text(decodeHTMLEntities(status + ' <- Current'), 25, finalY);
      } else if (isCompleted) {
        doc.setTextColor(0, 150, 0); // Dark green
        doc.text(decodeHTMLEntities(status + ' ✓'), 25, finalY);
      } else {
        doc.setTextColor(150, 150, 150); // Gray
        doc.text(decodeHTMLEntities(status), 25, finalY);
      }
      finalY += 7;
    });
    
    // Add current status description
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(decodeHTMLEntities('Current Status'), 20, finalY);
    finalY += 7;
    
    let statusDescription = '';
    switch (order.status) {
      case 'Pending':
        statusDescription = 'Order has been placed but payment is pending.';
        break;
      case 'Awaiting Payment':
        statusDescription = 'Payment is being processed.';
        break;
      case 'Paid':
        statusDescription = 'Payment confirmed. Order is being prepared for dispatch.';
        break;
      case 'Dispatched':
        statusDescription = 'Order has been dispatched to the shop.';
        break;
      case 'Delivered':
        statusDescription = 'Order has been delivered to the shop.';
        break;
      case 'Cancelled':
        statusDescription = 'Order has been cancelled.';
        break;
      default:
        statusDescription = `Order is in ${order.status} status.`;
    }
    
    doc.setFontSize(10);
    doc.text(decodeHTMLEntities(statusDescription), 25, finalY);
    finalY += 15; // Increased spacing
    
    // Add inventory update information
    // Check if we need a new page
    if (finalY > 200) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Inventory Update'), 20, finalY);
    finalY += 10;
    
    doc.setFontSize(10);
    if (order.status === 'Paid' || order.status === 'Dispatched' || order.status === 'Delivered') {
      doc.text(decodeHTMLEntities('Status: Inventory has been updated. Shop inventory increased and factory stock reduced when payment was confirmed.'), 25, finalY);
    } else {
      doc.text(decodeHTMLEntities('Status: Inventory update pending.'), 25, finalY);
    }
    finalY += 15; // Increased spacing
    
    // Add footer
    addFooter(doc, finalY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating shop order PDF:', error);
    throw new Error('Failed to generate shop order PDF');
  }
}

// Function to generate a shop order PDF with logo and product images (returns URL for client-side use)
export async function generateShopOrderPDF(order: Order): Promise<string> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Shop Order Receipt');
    
    // Add order information
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Order ID: ${order.id}`), 20, 60);
    doc.text(decodeHTMLEntities(`Shop Name: ${order.shopName}`), 20, 67);
    doc.text(decodeHTMLEntities(`Order Date: ${new Date(order.date).toLocaleDateString()}`), 20, 74);
    doc.text(decodeHTMLEntities(`Status: ${order.status}`), 20, 81);
    
    // Enhanced Order Summary
    const uniqueDesigns = new Set(order.items.map(item => item.productId)).size;
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.text(decodeHTMLEntities(`Unique Designs: ${uniqueDesigns}`), 20, 88);
    doc.text(decodeHTMLEntities(`Total Items: ${totalItems}`), 20, 95);
    doc.text(decodeHTMLEntities(`Total Amount: ETB ${order.amount.toLocaleString()}`), 20, 102);
    
    // Add delivery date if available
    let currentY = 109;
    if (order.deliveryDate) {
      doc.text(decodeHTMLEntities(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`), 20, currentY);
      currentY += 7;
    }
    
    // Add delivery performance metrics if available
    if (order.requestedDeliveryDate || order.expectedReceiptDate || order.actualDispatchDate || order.confirmationDate) {
      doc.text(decodeHTMLEntities('Delivery Performance:'), 20, currentY);
      currentY += 7;
      
      if (order.requestedDeliveryDate) {
        doc.text(decodeHTMLEntities(`  Requested Delivery: ${new Date(order.requestedDeliveryDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.expectedReceiptDate) {
        doc.text(decodeHTMLEntities(`  Expected Receipt: ${new Date(order.expectedReceiptDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.actualDispatchDate) {
        doc.text(decodeHTMLEntities(`  Actual Dispatch: ${new Date(order.actualDispatchDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
      if (order.confirmationDate) {
        doc.text(decodeHTMLEntities(`  Confirmation Date: ${new Date(order.confirmationDate).toLocaleDateString()}`), 20, currentY);
        currentY += 7;
      }
    }
    
    // Add dispatch information if available
    if (order.dispatchInfo) {
      doc.text(decodeHTMLEntities('Dispatch Information:'), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Shop Name: ${order.dispatchInfo.shopName}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Transport License Plate: ${order.dispatchInfo.transportLicensePlate}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Contact Person: ${order.dispatchInfo.contactPerson}`), 20, currentY);
      currentY += 7;
      doc.text(decodeHTMLEntities(`  Dispatch Date: ${order.dispatchInfo.dispatchDate}`), 20, currentY);
      if (order.dispatchInfo.driverName) {
        currentY += 7;
        doc.text(decodeHTMLEntities(`  Driver Name: ${order.dispatchInfo.driverName}`), 20, currentY);
      }
      if (order.dispatchInfo.attachments && order.dispatchInfo.attachments.length > 0) {
        currentY += 7;
        doc.text(decodeHTMLEntities(`  Attachments: ${order.dispatchInfo.attachments.join(', ')}`), 20, currentY);
      }
    }
    
    // Add a line separator
    doc.line(20, currentY + 5, 190, currentY + 5);
    currentY += 10;
    
    // Add table title
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Order Items'), 105, currentY, { align: 'center' });
    
    // Create table data with image placeholders
    const imagePromises = [];
    
    for (const item of order.items) {
      // Create a promise for each image
      const imagePromise = (async () => {
        let imageBase64 = null;
        // Try to load the main product image first, then variant image
        const imageUrl = item.imageUrl || item.variant?.imageUrl;
        if (imageUrl) {
          try {
            imageBase64 = await imageUrlToBase64(imageUrl);
          } catch (error) {
            console.warn(`Could not load product image for ${item.name}:`, error);
          }
        }
        return imageBase64;
      })();
      
      imagePromises.push(imagePromise);
    }
    
    // Wait for all images to load
    const images = await Promise.all(imagePromises);
    
    // Add table with order items including images
    (doc as any).autoTable({
      startY: currentY + 15,
      head: [['Product Image', 'Product ID', 'Product', 'Variant', 'Quantity', 'Price (ETB)', 'Total (ETB)']],
      body: order.items.map((item, index) => {
        const imageBase64 = images[index];
        return [
          { 
            content: '', 
            styles: { 
              cellWidth: 30,
              minCellHeight: 20
            }
          },
          item.productId, // Add product ID
          decodeHTMLEntities(item.name),
          decodeHTMLEntities(`${item.variant.color}, ${item.variant.size}`),
          item.quantity,
          item.price.toLocaleString(),
          (item.quantity * item.price).toLocaleString()
        ];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      didDrawCell: (data: any) => {
        // Add images to the first column after the table is drawn
        if (data.column.index === 0 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          const imageBase64 = images[rowIndex];
          
          if (imageBase64) {
            try {
              // Calculate position to center the image in the cell
              const cellWidth = data.cell.width;
              const cellHeight = data.cell.height;
              const imgWidth = 26;
              const imgHeight = 16;
              const x = data.cell.x + (cellWidth - imgWidth) / 2;
              const y = data.cell.y + (cellHeight - imgHeight) / 2;
              
              doc.addImage(imageBase64, 'PNG', x, y, imgWidth, imgHeight);
            } catch (error) {
              console.warn('Could not add image to PDF:', error);
            }
          } else {
            // Add placeholder if no image
            doc.setDrawColor(200);
            doc.setFillColor(240, 240, 240);
            doc.rect(data.cell.x + 2, data.cell.y + 2, 26, 16, 'F');
            doc.setTextColor(150);
            doc.setFontSize(8);
            doc.text(decodeHTMLEntities('No Image'), data.cell.x + 15, data.cell.y + 10, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    });
    
    // Add payment information if available
    let finalY = (doc as any).lastAutoTable.finalY || currentY + 30;
    finalY += 10;
    
    if (order.paymentSlipUrl) {
      doc.setFontSize(14);
      doc.text('Payment Information', 20, finalY);
      finalY += 10;
      
      doc.setFontSize(12);
      doc.text('Payment Status: Payment Confirmed', 20, finalY);
      finalY += 7;
      
      doc.text('Payment Slip:', 20, finalY);
      finalY += 7;
      
      // Try to add payment slip image
      try {
        const paymentSlipBase64 = await imageUrlToBase64(order.paymentSlipUrl);
        doc.addImage(paymentSlipBase64, 'PNG', 20, finalY, 80, 60);
        finalY += 70;
      } catch (error) {
        console.warn('Could not load payment slip image:', error);
        doc.text('Payment slip image not available', 20, finalY);
        finalY += 10;
      }
    }
    
    // Add order progress/status information
    doc.setFontSize(14);
    doc.text('Order Progress', 20, finalY);
    finalY += 10;
    
    // Add status flow information
    const statuses = [
      'Order Placed',
      'Payment Awaiting',
      'Payment Confirmed',
      'Order Dispatched',
      'Order Delivered',
      'Order Cancelled'
    ];
    
    // Find current status index
    const statusOrder = ['Pending', 'Awaiting Payment', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];
    const currentStatusIndex = statusOrder.indexOf(order.status);
    
    // Add status indicators
    statuses.forEach((status, index) => {
      const isCurrent = index === currentStatusIndex;
      const isCompleted = index < currentStatusIndex;
      
      doc.setFontSize(10);
      if (isCurrent) {
        doc.setTextColor(22, 160, 133); // Carement green
        doc.text(decodeHTMLEntities(status + ' <- Current'), 25, finalY);
      } else if (isCompleted) {
        doc.setTextColor(0, 150, 0); // Dark green
        doc.text(decodeHTMLEntities(status + ' ✓'), 25, finalY);
      } else {
        doc.setTextColor(150, 150, 150); // Gray
        doc.text(decodeHTMLEntities(status), 25, finalY);
      }
      finalY += 7;
    });
    
    // Add current status description
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(decodeHTMLEntities('Current Status'), 20, finalY);
    finalY += 7;
    
    let statusDescription = '';
    switch (order.status) {
      case 'Pending':
        statusDescription = 'Order has been placed but payment is pending.';
        break;
      case 'Awaiting Payment':
        statusDescription = 'Payment is being processed.';
        break;
      case 'Paid':
        statusDescription = 'Payment confirmed. Order is being prepared for dispatch.';
        break;
      case 'Dispatched':
        statusDescription = 'Order has been dispatched to the shop.';
        break;
      case 'Delivered':
        statusDescription = 'Order has been delivered to the shop.';
        break;
      case 'Cancelled':
        statusDescription = 'Order has been cancelled.';
        break;
      default:
        statusDescription = `Order is in ${order.status} status.`;
    }
    
    doc.setFontSize(10);
    doc.text(decodeHTMLEntities(statusDescription), 25, finalY);
    finalY += 10;
    
    // Add inventory update information
    doc.setFontSize(14);
    doc.text('Inventory Update', 20, finalY);
    finalY += 10;
    
    doc.setFontSize(10);
    if (order.status === 'Paid' || order.status === 'Dispatched' || order.status === 'Delivered') {
      doc.text('Status: Inventory has been updated. Shop inventory increased and factory stock reduced when payment was confirmed.', 25, finalY);
    } else {
      doc.text('Status: Inventory update pending.', 25, finalY);
    }
    finalY += 10;
    
    // Add footer
    addFooter(doc, finalY);
    
    // Generate PDF as blob
    const pdfBlob = doc.output('blob');
    
    // Create a data URL
    return URL.createObjectURL(pdfBlob);
  } catch (error) {
    console.error('Error generating shop order PDF:', error);
    throw new Error('Failed to generate shop order PDF');
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

// Function to generate a summary report PDF
export async function generateSummaryReport(orders: MarketingOrder[]): Promise<string> {
  try {
    console.log('Starting summary report generation for', orders.length, 'orders');
    
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    console.log('PDF document created, adding header...');
    
    // Add header and logo
    try {
      await addHeaderAndLogo(doc, 'Production Summary Report');
      console.log('Header and logo added successfully');
    } catch (headerError) {
      console.warn('Error adding header/logo, continuing without it:', headerError);
      // Continue without header if it fails
      doc.setFontSize(18);
      doc.text('Production Summary Report', 148, 20, { align: 'center' });
    }
    
    // Add report date
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${new Date().toLocaleDateString()}`), 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.isCompleted).length;
    const inProgressOrders = orders.filter(o => !o.isCompleted).length;
    
    console.log('Summary stats:', { totalOrders, completedOrders, inProgressOrders });
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Summary Statistics'), 20, 70);
    
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Total Orders: ${totalOrders}`), 20, 80);
    doc.text(decodeHTMLEntities(`Completed Orders: ${completedOrders}`), 20, 87);
    doc.text(decodeHTMLEntities(`In Progress Orders: ${inProgressOrders}`), 20, 94);
    
    // Add status breakdown
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Status Breakdown'), 20, 107);
    
    doc.setFontSize(12);
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    let statusY = 117;
    Object.entries(statusCounts).forEach(([status, count]) => {
      doc.text(decodeHTMLEntities(`${status}: ${count}`), 20, statusY);
      statusY += 7;
    });
    
    // Add a line separator
    doc.line(20, statusY + 5, 276, statusY + 5);
    
    // Add orders table
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Order Details'), 20, statusY + 15);
    
    console.log('Preparing table data...');
    
    // Prepare table data
    const tableData = orders.map(order => [
      decodeHTMLEntities(order.orderNumber),
      decodeHTMLEntities(order.productName),
      decodeHTMLEntities(order.productCode),
      order.quantity.toString(),
      decodeHTMLEntities(order.status),
      order.orderPlacementDate ? new Date(order.orderPlacementDate).toLocaleDateString() : '',
      order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate).toLocaleDateString() : ''
    ]);
    
    console.log('Adding table with', tableData.length, 'rows');
    
    // Add table with order details
    (doc as any).autoTable({
      startY: statusY + 20,
      head: [['Order Number', 'Product Name', 'Product Code', 'Quantity', 'Status', 'Placement Date', 'Delivery Date']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
    
    console.log('Table added successfully');
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || statusY + 30;
    addFooter(doc, finalY);
    
    console.log('Generating PDF blob...');
    
    // Generate PDF as blob
    const pdfBlob = doc.output('blob');
    
    console.log('PDF blob generated, size:', pdfBlob.size, 'bytes');
    
    // Create a data URL
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    console.log('Blob URL created:', blobUrl);
    
    return blobUrl;
  } catch (error) {
    console.error('Error generating summary report:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to generate summary report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to generate an inventory report PDF
export async function generateInventoryReport(products: Product[]): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Inventory Report');
    
    // Add report date
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${new Date().toLocaleDateString()}`), 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    const totalValue = products.reduce(
      (sum, product) => 
        sum + (product.price * product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0)),
      0
    );
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Inventory Summary'), 20, 70);
    
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Total Products: ${totalProducts}`), 20, 80);
    doc.text(decodeHTMLEntities(`Total Variants: ${totalVariants}`), 20, 87);
    doc.text(decodeHTMLEntities(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`), 20, 94);
    
    // Add a line separator
    doc.line(20, 100, 276, 100);
    
    // Add products table
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Product Inventory Details'), 20, 110);
    
    // Prepare table data
    const tableData: (string | number)[][] = [];
    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const totalVariantValue = totalStock * product.price;
      
      // Add main product row
      tableData.push([
        decodeHTMLEntities(product.name),
        decodeHTMLEntities(product.productCode),
        decodeHTMLEntities(product.category),
        `ETB ${product.price.toLocaleString()}`,
        totalStock.toString(),
        `ETB ${totalVariantValue.toLocaleString()}`
      ]);
      
      // Add variant rows
      product.variants.forEach(variant => {
        tableData.push([
          decodeHTMLEntities(`  ${variant.color}, ${variant.size}`),
          '',
          '',
          '',
          variant.stock.toString(),
          `ETB ${(variant.stock * product.price).toLocaleString()}`
        ]);
      });
    });
    
    // Add table with product details
    (doc as any).autoTable({
      startY: 117,
      head: [['Product Name', 'Product Code', 'Category', 'Price (ETB)', 'Stock Quantity', 'Value (ETB)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
    
    // Add product images section
    let currentY = (doc as any).lastAutoTable.finalY || 122;
    currentY += 10;
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Product Images'), 148, currentY, { align: 'center' });
    currentY += 10;
    
    // Add images for each product
    for (const product of products) {
      // Check if we need a new page
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      }
      
      // Add product name
      doc.setFontSize(12);
      doc.text(decodeHTMLEntities(product.name), 20, currentY);
      currentY += 8;
      
      // Try to add product image
      let imageAdded = false;
      if (product.imageUrl) {
        try {
          const imageBase64 = await imageUrlToBase64(product.imageUrl);
          doc.addImage(imageBase64, 'PNG', 20, currentY, 30, 30);
          imageAdded = true;
        } catch (error) {
          console.warn('Could not load product image:', error);
        }
      }
      
      // If no image was added, add a placeholder
      if (!imageAdded) {
        doc.setDrawColor(200);
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY, 30, 30, 'F');
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text(decodeHTMLEntities('No Image'), 35, currentY + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
      
      currentY += 40;
      
      // Add a line separator
      doc.setDrawColor(200);
      doc.line(20, currentY, 276, currentY);
      currentY += 5;
    }
    
    // Add footer
    addFooter(doc, currentY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating inventory report:', error);
    throw new Error('Failed to generate inventory report');
  }
}

// Function to generate a products report PDF
export async function generateProductsReport(products: Product[]): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Products Report');
    
    // Add report date
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${new Date().toLocaleDateString()}`), 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    const totalValue = products.reduce(
      (sum, product) => 
        sum + (product.price * product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0)),
      0
    );
    const lowStockItems = products.filter(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      return totalStock < (product.minimumStockLevel || 10);
    }).length;
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Products Summary'), 20, 70);
    
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Total Products: ${totalProducts}`), 20, 80);
    doc.text(decodeHTMLEntities(`Total Variants: ${totalVariants}`), 20, 87);
    doc.text(decodeHTMLEntities(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`), 20, 94);
    doc.text(decodeHTMLEntities(`Low Stock Items: ${lowStockItems}`), 20, 101);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add products table
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Product Details'), 20, 117);
    
    // Prepare table data
    const tableData: (string | number)[][] = [];
    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const totalVariantValue = totalStock * product.price;
      
      // Add main product row
      tableData.push([
        decodeHTMLEntities(product.name),
        decodeHTMLEntities(product.productCode),
        decodeHTMLEntities(product.category),
        `ETB ${product.price.toLocaleString()}`,
        totalStock.toString(),
        product.readyToDeliver === 1 ? 'Available' : 'Unavailable',
        `ETB ${totalVariantValue.toLocaleString()}`
      ]);
    });
    
    // Add table with product details
    (doc as any).autoTable({
      startY: 124,
      head: [['Product Name', 'Product Code', 'Category', 'Price (ETB)', 'Stock Quantity', 'Status', 'Value (ETB)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
    
    // Add product images section
    let currentY = (doc as any).lastAutoTable.finalY || 129;
    currentY += 10;
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Product Images'), 148, currentY, { align: 'center' });
    currentY += 10;
    
    // Add images for each product
    for (const product of products) {
      // Check if we need a new page
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      }
      
      // Add product name
      doc.setFontSize(12);
      doc.text(decodeHTMLEntities(product.name), 20, currentY);
      currentY += 8;
      
      // Try to add product image
      let imageAdded = false;
      if (product.imageUrl) {
        try {
          const imageBase64 = await imageUrlToBase64(product.imageUrl);
          doc.addImage(imageBase64, 'PNG', 20, currentY, 30, 30);
          imageAdded = true;
        } catch (error) {
          console.warn('Could not load product image:', error);
        }
      }
      
      // If no image was added, add a placeholder
      if (!imageAdded) {
        doc.setDrawColor(200);
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY, 30, 30, 'F');
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text(decodeHTMLEntities('No Image'), 35, currentY + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
      
      currentY += 40;
      
      // Add a line separator
      doc.setDrawColor(200);
      doc.line(20, currentY, 276, currentY);
      currentY += 5;
    }
    
    // Add footer
    addFooter(doc, currentY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating products report:', error);
    throw new Error('Failed to generate products report');
  }
}

// Function to generate an orders report PDF
export async function generateOrdersReport(orders: Order[]): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Orders Report');
    
    // Add report date
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${new Date().toLocaleDateString()}`), 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      order.status === 'Pending' || order.status === 'Awaiting Payment'
    ).length;
    const completedOrders = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    
    // Enhanced summary with order details
    const totalUniqueDesigns = new Set(orders.flatMap(order => order.items.map(item => item.productId))).size;
    const totalItemsOrdered = orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Orders Summary'), 20, 70);
    
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Total Orders: ${totalOrders}`), 20, 80);
    doc.text(decodeHTMLEntities(`Pending Orders: ${pendingOrders}`), 20, 87);
    doc.text(decodeHTMLEntities(`Completed Orders: ${completedOrders}`), 20, 94);
    doc.text(decodeHTMLEntities(`Total Revenue: ETB ${totalRevenue.toLocaleString()}`), 20, 101);
    doc.text(decodeHTMLEntities(`Unique Designs: ${totalUniqueDesigns}`), 20, 108);
    doc.text(decodeHTMLEntities(`Total Items Ordered: ${totalItemsOrdered}`), 20, 115);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add orders table
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Order Details'), 20, 117);
    
    // Prepare table data with delivery dates
    const tableData: (string | number)[][] = orders.map(order => [
      decodeHTMLEntities(order.id),
      decodeHTMLEntities(order.shopName),
      new Date(order.date).toLocaleDateString(),
      order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set',
      decodeHTMLEntities(order.status),
      `ETB ${order.amount.toLocaleString()}`
    ]);
    
    // Add table with order details
    (doc as any).autoTable({
      startY: 124,
      head: [['Order ID', 'Shop Name', 'Order Date', 'Delivery Date', 'Status', 'Amount (ETB)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
    
    // Add a new page for detailed order information with images
    let currentY = (doc as any).lastAutoTable.finalY || 129;
    
    // Add detailed order information with product images
    for (const order of orders) {
      // Add a new page if needed
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 10;
      }
      
      // Add order title
      doc.setFontSize(14);
      doc.text(decodeHTMLEntities(`Order: ${order.id}`), 20, currentY);
      
      // Add delivery date if available
      if (order.deliveryDate) {
        doc.setFontSize(12);
        doc.text(decodeHTMLEntities(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`), 20, currentY + 7);
        currentY += 14;
      } else {
        currentY += 7;
      }
      
      // Add delivery performance metrics if available
      if (order.requestedDeliveryDate || order.expectedReceiptDate || order.actualDispatchDate || order.confirmationDate) {
        doc.setFontSize(12);
        doc.text(decodeHTMLEntities('Delivery Performance:'), 20, currentY);
        currentY += 7;
        
        if (order.requestedDeliveryDate) {
          doc.text(decodeHTMLEntities(`  Requested Delivery: ${new Date(order.requestedDeliveryDate).toLocaleDateString()}`), 20, currentY);
          currentY += 7;
        }
        if (order.expectedReceiptDate) {
          doc.text(decodeHTMLEntities(`  Expected Receipt: ${new Date(order.expectedReceiptDate).toLocaleDateString()}`), 20, currentY);
          currentY += 7;
        }
        if (order.actualDispatchDate) {
          doc.text(decodeHTMLEntities(`  Actual Dispatch: ${new Date(order.actualDispatchDate).toLocaleDateString()}`), 20, currentY);
          currentY += 7;
        }
        if (order.confirmationDate) {
          doc.text(decodeHTMLEntities(`  Confirmation Date: ${new Date(order.confirmationDate).toLocaleDateString()}`), 20, currentY);
          currentY += 7;
        }
        currentY += 7;
      }
      
      // Add items with images
      for (const item of order.items) {
        // Check if we need a new page
        if (currentY > 170) {
          doc.addPage();
          currentY = 20;
        }
        
        // Try to add product image
        let imageAdded = false;
        if (item.imageUrl || item.variant?.imageUrl) {
          try {
            const imageUrl = item.imageUrl || item.variant?.imageUrl;
            if (imageUrl) {
              const imageBase64 = await imageUrlToBase64(imageUrl);
              doc.addImage(imageBase64, 'PNG', 150, currentY, 20, 20);
              imageAdded = true;
            }
          } catch (error) {
            console.warn('Could not load product image:', error);
          }
        }
        
        // If no image was added, add a placeholder
        if (!imageAdded) {
          doc.setDrawColor(200);
          doc.setFillColor(240, 240, 240);
          doc.rect(150, currentY, 20, 20, 'F');
          doc.setTextColor(150);
          doc.setFontSize(8);
          doc.text('No Image', 160, currentY + 10, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
        
        // Add item details
        doc.setFontSize(10);
        doc.text(decodeHTMLEntities(item.name), 20, currentY + 5);
        doc.text(decodeHTMLEntities(`${item.variant?.color}, ${item.variant?.size}`), 20, currentY + 12);
        doc.text(decodeHTMLEntities(`Quantity: ${item.quantity}`), 20, currentY + 19);
        doc.text(decodeHTMLEntities(`Price: ETB ${item.price.toLocaleString()}`), 20, currentY + 26);
        doc.text(decodeHTMLEntities(`Total: ETB ${(item.quantity * item.price).toLocaleString()}`), 20, currentY + 33);
        
        currentY += 40;
      }
      
      // Add separator
      doc.setDrawColor(200);
      doc.line(20, currentY, 276, currentY);
      currentY += 5;
    }
    
    // Add footer
    addFooter(doc, currentY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating orders report:', error);
    throw new Error('Failed to generate orders report');
  }
}

// Function to generate a shops report PDF
export async function generateShopsReport(shops: Shop[]): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Shops Report');
    
    // Add report date
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${new Date().toLocaleDateString()}`), 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalShops = shops.length;
    const activeShops = shops.filter(shop => shop.status === 'Active').length;
    const inactiveShops = shops.filter(shop => shop.status === 'Inactive').length;
    const cities = new Set(shops.map(shop => shop.city)).size;
    
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Shops Summary'), 20, 70);
    
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Total Shops: ${totalShops}`), 20, 80);
    doc.text(decodeHTMLEntities(`Active Shops: ${activeShops}`), 20, 87);
    doc.text(decodeHTMLEntities(`Inactive Shops: ${inactiveShops}`), 20, 94);
    doc.text(decodeHTMLEntities(`Cities Covered: ${cities}`), 20, 101);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add shops table
    doc.setFontSize(14);
    doc.text(decodeHTMLEntities('Shop Details'), 20, 117);
    
    // Prepare table data
    const tableData: (string | number)[][] = shops.map(shop => [
      decodeHTMLEntities(shop.name),
      decodeHTMLEntities(shop.username),
      decodeHTMLEntities(shop.contactPerson),
      decodeHTMLEntities(shop.contactPhone),
      decodeHTMLEntities(shop.city),
      decodeHTMLEntities(shop.status),
      shop.discount ? `${(shop.discount * 100).toFixed(1)}%` : '0%',
      shop.monthlySalesTarget ? `ETB ${shop.monthlySalesTarget.toLocaleString()}` : 'Not set'
    ]);
    
    // Add table with shop details
    (doc as any).autoTable({
      startY: 124,
      head: [['Shop Name', 'Username', 'Contact Person', 'Phone', 'City', 'Status', 'Discount', 'Sales Target']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 129;
    addFooter(doc, finalY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating shops report:', error);
    throw new Error('Failed to generate shops report');
  }
}

// Function to generate owner KPI dashboard PDF report
export async function generateOwnerKPIReport(kpis: any, filters: any): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Owner KPI Dashboard Report');
    
    // Add report generation date and filters
    const generationDate = new Date().toLocaleDateString();
    doc.setFontSize(12);
    doc.text(decodeHTMLEntities(`Report Generated: ${generationDate}`), 20, 60);
    
    // Add filters used
    let currentY = 67;
    doc.text(decodeHTMLEntities('Filters Applied:'), 20, currentY);
    currentY += 7;
    
    if (filters.startDate && filters.endDate) {
      doc.text(decodeHTMLEntities(`Date Range: ${filters.startDate} to ${filters.endDate}`), 25, currentY);
      currentY += 7;
    }
    
    if (filters.shopId) {
      doc.text(decodeHTMLEntities(`Shop ID: ${filters.shopId}`), 25, currentY);
      currentY += 7;
    }
    
    if (filters.category) {
      doc.text(decodeHTMLEntities(`Category: ${filters.category}`), 25, currentY);
      currentY += 7;
    }
    
    if (filters.region) {
      doc.text(decodeHTMLEntities(`Region: ${filters.region}`), 25, currentY);
      currentY += 7;
    }
    
    if (filters.orderStatus) {
      doc.text(decodeHTMLEntities(`Order Status: ${filters.orderStatus}`), 25, currentY);
      currentY += 7;
    }
    
    // Add a line separator
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    
    // Add KPI summary table
    doc.setFontSize(16);
    doc.text(decodeHTMLEntities('Key Performance Indicators'), 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(12);
    
    const bestSellingProduct = kpis.bestSellingProduct || (kpis.bestSellingProducts && kpis.bestSellingProducts[0]) || { name: 'N/A', quantity: 0 };
    const topShop = kpis.topPerformingShop || (kpis.shopRanking && kpis.shopRanking[0]) || { name: 'N/A', sales: 0 };

    // Core KPIs
    const coreKPIs = [
      [decodeHTMLEntities('Total Sales Value'), `ETB ${(kpis.totalSalesValue || 0).toLocaleString()}`],
      [decodeHTMLEntities('Total Orders'), (kpis.totalOrders || 0).toString()],
      [decodeHTMLEntities('Units Produced'), (kpis.unitsProduced || 0).toString()],
      [decodeHTMLEntities('Active Shops'), `${kpis.activeShops || 0} of ${kpis.registeredShops || 0}`],
      [decodeHTMLEntities('Average Order Value'), `ETB ${(kpis.averageOrderValue || 0).toFixed(2)}`],
      [decodeHTMLEntities('Units per Transaction'), (kpis.unitsPerTransaction || 0).toFixed(1)],
      [decodeHTMLEntities('Customer Retention Rate'), `${(kpis.customerRetentionRate || 0).toFixed(1)}%`],
      [decodeHTMLEntities('Order Fulfillment Rate'), `${(kpis.orderFulfillmentRate || 0).toFixed(1)}%`],
      [decodeHTMLEntities('On-Time Delivery Rate'), `${(kpis.onTimeDeliveryRate || 0).toFixed(1)}%`],
      [decodeHTMLEntities('Marketing Order Completion Rate'), `${(kpis.marketingOrderCompletionRate || 0).toFixed(1)}%`],
      [decodeHTMLEntities('Best Selling Product'), decodeHTMLEntities(`${bestSellingProduct.name || 'N/A'} (${bestSellingProduct.quantity || 0} units)`)],
      [decodeHTMLEntities('Top Performing Shop'), decodeHTMLEntities(`${topShop.name || 'N/A'} (ETB ${(topShop.sales || 0).toLocaleString()})`)],
      [decodeHTMLEntities('Sales Growth (MoM)'), `${(kpis.salesGrowthMoM || 0).toFixed(1)}%`],
      [decodeHTMLEntities('Total Stock Quantity'), (kpis.totalStockQuantity || 0).toString()],
      [decodeHTMLEntities('Total Stock Value'), `ETB ${(kpis.totalStockValue || 0).toLocaleString()}`],
      [decodeHTMLEntities('Low Stock Alerts'), (kpis.lowStockAlerts || 0).toString()],
      [decodeHTMLEntities('Production Efficiency'), `${(kpis.productionEfficiency || 0).toFixed(1)}%`]
    ];
    
    (doc as any).autoTable({
      startY: currentY,
      head: [['Metric', 'Value']],
      body: coreKPIs,
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
    
    // Add product images section if we have product information
    let finalY = (doc as any).lastAutoTable.finalY || currentY + 30;
    finalY += 10;
    
    const productsSource = kpis.productInfo || kpis.bestSellingProducts;

    if (productsSource) {
      doc.setFontSize(16);
      doc.text(decodeHTMLEntities('Best Selling Products'), 105, finalY, { align: 'center' });
      finalY += 10;
      
      // Get top 5 best selling products with images
      // Handle array or object structure
      const productsArray = Array.isArray(productsSource) ? productsSource : Object.values(productsSource);
        
      const topProducts = productsArray
        .sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
        .slice(0, 5);
      
      // Load product images
      const imagePromises = topProducts.map(async (product: any) => {
        if (product.imageUrl) {
          try {
            return await imageUrlToBase64(product.imageUrl);
          } catch (error) {
            console.warn(`Could not load product image for ${product.name}:`, error);
            return null;
          }
        }
        return null;
      });
      
      const images = await Promise.all(imagePromises);
      
      // Create table with product images
      const productTableData = topProducts.map((product: any, index: number) => {
        return [
          { 
            content: '', 
            styles: { 
              cellWidth: 30,
              minCellHeight: 20
            }
          },
          decodeHTMLEntities(product.name || 'Unknown'),
          (product.quantity || 0).toString()
        ];
      });
      
      (doc as any).autoTable({
        startY: finalY,
        head: [['Product Image', 'Product Name', 'Units Sold']],
        body: productTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        didDrawCell: (data: any) => {
          // Add images to the first column after the table is drawn
          if (data.column.index === 0 && data.cell.section === 'body') {
            const rowIndex = data.row.index;
            const imageBase64 = images[rowIndex];
            
            if (imageBase64) {
              try {
                // Calculate position to center the image in the cell
                const cellWidth = data.cell.width;
                const cellHeight = data.cell.height;
                const imgWidth = 26;
                const imgHeight = 16;
                const x = data.cell.x + (cellWidth - imgWidth) / 2;
                const y = data.cell.y + (cellHeight - imgHeight) / 2;
                
                doc.addImage(imageBase64, 'PNG', x, y, imgWidth, imgHeight);
              } catch (error) {
                console.warn('Could not add image to PDF:', error);
              }
            } else {
              // Add placeholder if no image
              doc.setDrawColor(200);
              doc.setFillColor(240, 240, 240);
              doc.rect(data.cell.x + 2, data.cell.y + 2, 26, 16, 'F');
              doc.setTextColor(150);
              doc.setFontSize(8);
              doc.text('No Image', data.cell.x + 15, data.cell.y + 10, { align: 'center' });
              doc.setTextColor(0, 0, 0);
            }
          }
        }
      });
      
      finalY = (doc as any).lastAutoTable.finalY || finalY + 30;
      finalY += 10;
    }
    
    // Add detailed stock information if available
    const stockSource = kpis.stockByProduct || kpis.stockInfo;
    
    if (stockSource && stockSource.length > 0) {
      doc.setFontSize(16);
      doc.text(decodeHTMLEntities('Inventory Details'), 105, finalY, { align: 'center' });
      finalY += 10;
      
      // Get top 10 products by stock value
      const topStockProducts = stockSource
        .sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0))
        .slice(0, 10);
      
      // Create table with stock details
      const stockTableData = topStockProducts.map((product: any) => {
        return [
          decodeHTMLEntities(product.name || 'Unknown'),
          decodeHTMLEntities(product.category || 'N/A'),
          (product.totalStock || 0).toString(),
          `ETB ${(product.totalValue || 0).toLocaleString()}`
        ];
      });
      
      (doc as any).autoTable({
        startY: finalY,
        head: [['Product Name', 'Category', 'Stock Quantity', 'Stock Value']],
        body: stockTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 2
        }
      });
      
      finalY = (doc as any).lastAutoTable.finalY || finalY + 30;
    }
    
    // Add footer
    addFooter(doc, finalY);
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating owner KPI report:', error);
    throw new Error('Failed to generate owner KPI report');
  }
}