// lib/pdf-generator.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MarketingOrder } from './marketing-orders';
import { Product } from './products';
import { Order } from './orders';
import { Shop } from './shops';

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

// Function to convert image URL to base64 (server-side compatible)
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    // Handle empty or invalid URLs
    if (!url || url.trim() === '') {
      throw new Error('Empty URL provided');
    }
    
    // For absolute URLs, fetch the image
    if (url.startsWith('http')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    }
    
    // For relative URLs, try to resolve them properly
    // Check if we're running server-side
    if (typeof window === 'undefined') {
      // Server-side: Use Node.js file system to read the image file directly
      const fs = await import('fs');
      const path = await import('path');
      
      // Construct the full path to the image file
      const imagePath = path.join(process.cwd(), 'public', url.startsWith('/') ? url.substring(1) : url);
      
      // Check if file exists
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        // Determine content type based on file extension
        let contentType = 'image/png';
        if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (url.toLowerCase().endsWith('.gif')) {
          contentType = 'image/gif';
        }
        return `data:${contentType};base64,${base64}`;
      } else {
        throw new Error(`Image file not found: ${imagePath}`);
      }
    } else {
      // Client-side: Use fetch with proper base URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const resolvedUrl = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    }
  } catch (error) {
    console.warn('Failed to convert image to base64:', error);
    throw error;
  }
}

// Function to add logo and header to PDF
async function addHeaderAndLogo(doc: jsPDF, title: string) {
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
  doc.text('Carement Fashion', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Addis Ababa, Ethiopia', 105, 27, { align: 'center' });
  doc.text('Phone: +251 11 123 4567 | Email: info@carementfashion.com', 105, 33, { align: 'center' });
  
  // Add document title
  doc.setFontSize(18);
  doc.text(title, 105, 45, { align: 'center' });
  
  // Add a line separator
  doc.line(20, 50, 190, 50);
}

// Function to add footer to PDF
function addFooter(doc: jsPDF, finalY: number) {
  // Add "For internal use only" at the bottom
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray color
  doc.text('This document is generated automatically by the Carement Fashion ERP system.', 105, pageHeight - 15, { align: 'center' });
  doc.text('Confidential - For internal use only.', 105, pageHeight - 10, { align: 'center' });
  doc.setTextColor(0, 0, 0); // Reset to black
}

export async function generateOrderPDF(order: MarketingOrder): Promise<string> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Production Order');
    
    // Add product image if available
    if (order.imageUrl) {
      try {
        // Try to load the actual product image
        const imageBase64 = await imageToBase64(order.imageUrl);
        doc.addImage(imageBase64, 'PNG', 150, 55, 40, 40);
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
    
    // Add new date fields
    if (order.orderPlacementDate) {
      doc.text(`Order Placement Date: ${new Date(order.orderPlacementDate).toLocaleDateString()}`, 20, startY + 49);
    }
    
    if (order.plannedDeliveryDate) {
      doc.text(`Planned Delivery Date: ${new Date(order.plannedDeliveryDate).toLocaleDateString()}`, 20, startY + 56);
    }
    
    // Add sample status tracking fields
    let currentY = startY + 49;
    if (order.orderPlacementDate) currentY += 7;
    if (order.plannedDeliveryDate) currentY += 7;
    
    if (order.sizeSetSampleApproved) {
      doc.text(`Size Set Sample Approved: ${new Date(order.sizeSetSampleApproved).toLocaleDateString()}`, 20, currentY);
      currentY += 7;
    }
    
    if (order.productionStartDate) {
      doc.text(`Production Start Date: ${new Date(order.productionStartDate).toLocaleDateString()}`, 20, currentY);
      currentY += 7;
    }
    
    if (order.productionFinishedDate) {
      doc.text(`Production Finished Date: ${new Date(order.productionFinishedDate).toLocaleDateString()}`, 20, currentY);
      currentY += 7;
    }
    
    if (order.description) {
      doc.text(`Description: ${order.description}`, 20, currentY);
      currentY += 7;
    }
    
    // Add a line separator
    doc.line(20, currentY + 5, 190, currentY + 5);
    
    // Add table title
    doc.setFontSize(14);
    doc.text('Size and Color Breakdown', 105, currentY + 15, { align: 'center' });
    
    // Add table with size/color breakdown
    (doc as any).autoTable({
      startY: currentY + 20,
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
    const finalY = (doc as any).lastAutoTable.finalY || currentY + 30;
    addFooter(doc, finalY);
    
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
    doc.text(`Order ID: ${order.id}`, 20, 60);
    doc.text(`Shop Name: ${order.shopName}`, 20, 67);
    doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, 20, 74);
    doc.text(`Status: ${order.status}`, 20, 81);
    
    // Enhanced Order Summary
    const uniqueDesigns = new Set(order.items.map(item => item.productId)).size;
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.text(`Unique Designs: ${uniqueDesigns}`, 20, 88);
    doc.text(`Total Items: ${totalItems}`, 20, 95);
    doc.text(`Total Amount: ETB ${order.amount.toLocaleString()}`, 20, 102);
    
    // Add delivery date if available
    if (order.deliveryDate) {
      doc.text(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`, 20, 109);
    }
    
    // Add dispatch information if available
    if (order.dispatchInfo) {
      let currentY = order.deliveryDate ? 116 : 109;
      doc.text('Dispatch Information:', 20, currentY);
      currentY += 7;
      doc.text(`  Shop Name: ${order.dispatchInfo.shopName}`, 20, currentY);
      currentY += 7;
      doc.text(`  Transport License Plate: ${order.dispatchInfo.transportLicensePlate}`, 20, currentY);
      currentY += 7;
      doc.text(`  Contact Person: ${order.dispatchInfo.contactPerson}`, 20, currentY);
      currentY += 7;
      doc.text(`  Dispatch Date: ${order.dispatchInfo.dispatchDate}`, 20, currentY);
      if (order.dispatchInfo.driverName) {
        currentY += 7;
        doc.text(`  Driver Name: ${order.dispatchInfo.driverName}`, 20, currentY);
      }
      if (order.dispatchInfo.attachments && order.dispatchInfo.attachments.length > 0) {
        currentY += 7;
        doc.text(`  Attachments: ${order.dispatchInfo.attachments.join(', ')}`, 20, currentY);
      }
    }
    
    // Add a line separator
    let startY = 100;
    if (order.dispatchInfo) {
      startY = order.deliveryDate ? 130 : 123;
    } else if (order.deliveryDate) {
      startY = 102;
    }
    doc.line(20, startY, 190, startY);
    
    // Add table title
    doc.setFontSize(14);
    doc.text('Order Items', 105, startY + 10, { align: 'center' });
    
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
      startY: startY + 15,
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
          item.name,
          `${item.variant.color}, ${item.variant.size}`,
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
            doc.text('No Image', data.cell.x + 15, data.cell.y + 10, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || startY + 30;
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
    doc.text(`Order ID: ${order.id}`, 20, 60);
    doc.text(`Shop Name: ${order.shopName}`, 20, 67);
    doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, 20, 74);
    doc.text(`Status: ${order.status}`, 20, 81);
    
    // Enhanced Order Summary
    const uniqueDesigns = new Set(order.items.map(item => item.productId)).size;
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.text(`Unique Designs: ${uniqueDesigns}`, 20, 88);
    doc.text(`Total Items: ${totalItems}`, 20, 95);
    doc.text(`Total Amount: ETB ${order.amount.toLocaleString()}`, 20, 102);
    
    // Add delivery date if available
    if (order.deliveryDate) {
      doc.text(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`, 20, 109);
    }
    
    // Add dispatch information if available
    if (order.dispatchInfo) {
      let currentY = order.deliveryDate ? 116 : 109;
      doc.text('Dispatch Information:', 20, currentY);
      currentY += 7;
      doc.text(`  Shop Name: ${order.dispatchInfo.shopName}`, 20, currentY);
      currentY += 7;
      doc.text(`  Transport License Plate: ${order.dispatchInfo.transportLicensePlate}`, 20, currentY);
      currentY += 7;
      doc.text(`  Contact Person: ${order.dispatchInfo.contactPerson}`, 20, currentY);
      currentY += 7;
      doc.text(`  Dispatch Date: ${order.dispatchInfo.dispatchDate}`, 20, currentY);
      if (order.dispatchInfo.driverName) {
        currentY += 7;
        doc.text(`  Driver Name: ${order.dispatchInfo.driverName}`, 20, currentY);
      }
      if (order.dispatchInfo.attachments && order.dispatchInfo.attachments.length > 0) {
        currentY += 7;
        doc.text(`  Attachments: ${order.dispatchInfo.attachments.join(', ')}`, 20, currentY);
      }
    }
    
    // Add a line separator
    let startY = 100;
    if (order.dispatchInfo) {
      startY = order.deliveryDate ? 130 : 123;
    } else if (order.deliveryDate) {
      startY = 102;
    }
    doc.line(20, startY, 190, startY);
    
    // Add table title
    doc.setFontSize(14);
    doc.text('Order Items', 105, startY + 10, { align: 'center' });
    
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
      startY: startY + 15,
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
          item.name,
          `${item.variant.color}, ${item.variant.size}`,
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
            doc.text('No Image', data.cell.x + 15, data.cell.y + 10, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    });
    
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
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add header and logo
    await addHeaderAndLogo(doc, 'Production Summary Report');
    
    // Add report date
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.isCompleted).length;
    const inProgressOrders = orders.filter(o => !o.isCompleted).length;
    
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Orders: ${totalOrders}`, 20, 80);
    doc.text(`Completed Orders: ${completedOrders}`, 20, 87);
    doc.text(`In Progress Orders: ${inProgressOrders}`, 20, 94);
    
    // Add status breakdown
    doc.setFontSize(14);
    doc.text('Status Breakdown', 20, 107);
    
    doc.setFontSize(12);
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    let statusY = 117;
    Object.entries(statusCounts).forEach(([status, count]) => {
      doc.text(`${status}: ${count}`, 20, statusY);
      statusY += 7;
    });
    
    // Add a line separator
    doc.line(20, statusY + 5, 276, statusY + 5);
    
    // Add orders table
    doc.setFontSize(14);
    doc.text('Order Details', 20, statusY + 15);
    
    // Prepare table data
    const tableData = orders.map(order => [
      order.orderNumber,
      order.productName,
      order.productCode,
      order.quantity.toString(),
      order.status,
      order.orderPlacementDate ? new Date(order.orderPlacementDate).toLocaleDateString() : '',
      order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate).toLocaleDateString() : ''
    ]);
    
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
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || statusY + 30;
    addFooter(doc, finalY);
    
    // Generate PDF as blob
    const pdfBlob = doc.output('blob');
    
    // Create a data URL
    return URL.createObjectURL(pdfBlob);
  } catch (error) {
    console.error('Error generating summary report:', error);
    throw new Error('Failed to generate summary report');
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
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 55, { align: 'center' });
    
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
    doc.text('Inventory Summary', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Products: ${totalProducts}`, 20, 80);
    doc.text(`Total Variants: ${totalVariants}`, 20, 87);
    doc.text(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`, 20, 94);
    
    // Add a line separator
    doc.line(20, 100, 276, 100);
    
    // Add products table
    doc.setFontSize(14);
    doc.text('Product Inventory Details', 20, 110);
    
    // Prepare table data
    const tableData: (string | number)[][] = [];
    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const totalVariantValue = totalStock * product.price;
      
      // Add main product row
      tableData.push([
        product.name,
        product.productCode,
        product.category,
        `ETB ${product.price.toLocaleString()}`,
        totalStock.toString(),
        `ETB ${totalVariantValue.toLocaleString()}`
      ]);
      
      // Add variant rows
      product.variants.forEach(variant => {
        tableData.push([
          `  ${variant.color}, ${variant.size}`,
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
    doc.text('Product Images', 148, currentY, { align: 'center' });
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
      doc.text(`${product.name}`, 20, currentY);
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
        doc.text('No Image', 35, currentY + 15, { align: 'center' });
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
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 55, { align: 'center' });
    
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
    doc.text('Products Summary', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Products: ${totalProducts}`, 20, 80);
    doc.text(`Total Variants: ${totalVariants}`, 20, 87);
    doc.text(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`, 20, 94);
    doc.text(`Low Stock Items: ${lowStockItems}`, 20, 101);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add products table
    doc.setFontSize(14);
    doc.text('Product Details', 20, 117);
    
    // Prepare table data
    const tableData: (string | number)[][] = [];
    products.forEach(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      const totalVariantValue = totalStock * product.price;
      
      // Add main product row
      tableData.push([
        product.name,
        product.productCode,
        product.category,
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
    doc.text('Product Images', 148, currentY, { align: 'center' });
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
      doc.text(`${product.name}`, 20, currentY);
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
        doc.text('No Image', 35, currentY + 15, { align: 'center' });
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
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 55, { align: 'center' });
    
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
    doc.text('Orders Summary', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Orders: ${totalOrders}`, 20, 80);
    doc.text(`Pending Orders: ${pendingOrders}`, 20, 87);
    doc.text(`Completed Orders: ${completedOrders}`, 20, 94);
    doc.text(`Total Revenue: ETB ${totalRevenue.toLocaleString()}`, 20, 101);
    doc.text(`Unique Designs: ${totalUniqueDesigns}`, 20, 108);
    doc.text(`Total Items Ordered: ${totalItemsOrdered}`, 20, 115);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add orders table
    doc.setFontSize(14);
    doc.text('Order Details', 20, 117);
    
    // Prepare table data with delivery dates
    const tableData: (string | number)[][] = orders.map(order => [
      order.id,
      order.shopName,
      new Date(order.date).toLocaleDateString(),
      order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set',
      order.status,
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
      doc.text(`Order: ${order.id}`, 20, currentY);
      
      // Add delivery date if available
      if (order.deliveryDate) {
        doc.setFontSize(12);
        doc.text(`Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}`, 20, currentY + 7);
        currentY += 14;
      } else {
        currentY += 7;
      }
      
      // Add delivery performance metrics if available
      if (order.requestedDeliveryDate || order.expectedReceiptDate || order.actualDispatchDate || order.confirmationDate) {
        doc.setFontSize(12);
        doc.text('Delivery Performance:', 20, currentY);
        currentY += 7;
        
        if (order.requestedDeliveryDate) {
          doc.text(`  Requested Delivery: ${new Date(order.requestedDeliveryDate).toLocaleDateString()}`, 20, currentY);
          currentY += 7;
        }
        if (order.expectedReceiptDate) {
          doc.text(`  Expected Receipt: ${new Date(order.expectedReceiptDate).toLocaleDateString()}`, 20, currentY);
          currentY += 7;
        }
        if (order.actualDispatchDate) {
          doc.text(`  Actual Dispatch: ${new Date(order.actualDispatchDate).toLocaleDateString()}`, 20, currentY);
          currentY += 7;
        }
        if (order.confirmationDate) {
          doc.text(`  Confirmation Date: ${new Date(order.confirmationDate).toLocaleDateString()}`, 20, currentY);
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
        doc.text(`${item.name}`, 20, currentY + 5);
        doc.text(`${item.variant?.color}, ${item.variant?.size}`, 20, currentY + 12);
        doc.text(`Quantity: ${item.quantity}`, 20, currentY + 19);
        doc.text(`Price: ETB ${item.price.toLocaleString()}`, 20, currentY + 26);
        doc.text(`Total: ETB ${(item.quantity * item.price).toLocaleString()}`, 20, currentY + 33);
        
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
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 55, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 60, 276, 60);
    
    // Add summary statistics
    const totalShops = shops.length;
    const activeShops = shops.filter(shop => shop.status === 'Active').length;
    const inactiveShops = shops.filter(shop => shop.status === 'Inactive').length;
    const cities = new Set(shops.map(shop => shop.city)).size;
    
    doc.setFontSize(14);
    doc.text('Shops Summary', 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Shops: ${totalShops}`, 20, 80);
    doc.text(`Active Shops: ${activeShops}`, 20, 87);
    doc.text(`Inactive Shops: ${inactiveShops}`, 20, 94);
    doc.text(`Cities Covered: ${cities}`, 20, 101);
    
    // Add a line separator
    doc.line(20, 107, 276, 107);
    
    // Add shops table
    doc.setFontSize(14);
    doc.text('Shop Details', 20, 117);
    
    // Prepare table data
    const tableData: (string | number)[][] = shops.map(shop => [
      shop.name,
      shop.username,
      shop.contactPerson,
      shop.contactPhone,
      shop.city,
      shop.status,
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
    doc.text(`Report Generated: ${generationDate}`, 20, 60);
    
    // Add filters used
    let currentY = 67;
    doc.text('Filters Applied:', 20, currentY);
    currentY += 7;
    
    if (filters.startDate && filters.endDate) {
      doc.text(`Date Range: ${filters.startDate} to ${filters.endDate}`, 25, currentY);
      currentY += 7;
    }
    
    if (filters.shopId) {
      doc.text(`Shop ID: ${filters.shopId}`, 25, currentY);
      currentY += 7;
    }
    
    if (filters.category) {
      doc.text(`Category: ${filters.category}`, 25, currentY);
      currentY += 7;
    }
    
    if (filters.region) {
      doc.text(`Region: ${filters.region}`, 25, currentY);
      currentY += 7;
    }
    
    if (filters.orderStatus) {
      doc.text(`Order Status: ${filters.orderStatus}`, 25, currentY);
      currentY += 7;
    }
    
    // Add a line separator
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    
    // Add KPI summary table
    doc.setFontSize(16);
    doc.text('Key Performance Indicators', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(12);
    
    // Core KPIs
    const coreKPIs = [
      ['Total Sales Value', `ETB ${kpis.totalSalesValue.toLocaleString()}`],
      ['Total Orders', kpis.totalOrders.toString()],
      ['Units Produced', kpis.unitsProduced.toString()],
      ['Active Shops', `${kpis.activeShops} of ${kpis.registeredShops}`],
      ['Average Order Value', `ETB ${kpis.averageOrderValue.toFixed(2)}`],
      ['Units per Transaction', kpis.unitsPerTransaction.toFixed(1)],
      ['Customer Retention Rate', `${kpis.customerRetentionRate.toFixed(1)}%`],
      ['Order Fulfillment Rate', `${kpis.orderFulfillmentRate.toFixed(1)}%`],
      ['On-Time Delivery Rate', `${kpis.onTimeDeliveryRate.toFixed(1)}%`],
      ['Marketing Order Completion Rate', `${kpis.marketingOrderCompletionRate.toFixed(1)}%`],
      ['Best Selling Product', `${kpis.bestSellingProduct.name} (${kpis.bestSellingProduct.quantity} units)`],
      ['Top Performing Shop', `${kpis.topPerformingShop.name} (ETB ${kpis.topPerformingShop.sales?.toLocaleString() || '0.00'})`],
      ['Sales Growth (MoM)', `${kpis.salesGrowthMoM.toFixed(1)}%`],
      ['Total Stock Quantity', kpis.totalStockQuantity.toString()],
      ['Total Stock Value', `ETB ${kpis.totalStockValue.toLocaleString()}`],
      ['Low Stock Alerts', kpis.lowStockAlerts.toString()],
      ['Production Efficiency', `${kpis.productionEfficiency.toFixed(1)}%`]
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
    
    if (kpis.productInfo) {
      doc.setFontSize(16);
      doc.text('Best Selling Products', 105, finalY, { align: 'center' });
      finalY += 10;
      
      // Get top 5 best selling products with images
      const topProducts = Object.values(kpis.productInfo)
        .sort((a: any, b: any) => b.quantity - a.quantity)
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
          product.name,
          product.quantity.toString()
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
    if (kpis.stockByProduct && kpis.stockByProduct.length > 0) {
      doc.setFontSize(16);
      doc.text('Inventory Details', 105, finalY, { align: 'center' });
      finalY += 10;
      
      // Get top 10 products by stock value
      const topStockProducts = kpis.stockByProduct
        .sort((a: any, b: any) => b.totalValue - a.totalValue)
        .slice(0, 10);
      
      // Create table with stock details
      const stockTableData = topStockProducts.map((product: any) => {
        return [
          product.name,
          product.category,
          product.totalStock.toString(),
          `ETB ${product.totalValue.toLocaleString()}`
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