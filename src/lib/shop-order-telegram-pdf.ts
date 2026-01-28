import { getDb } from './db';
import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Function to convert image URL to base64 (server-side compatible)
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    if (!url || url.trim() === '') {
      throw new Error('Empty URL provided');
    }
    
    if (url.startsWith('http')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    }
    
    // Server-side: Use Node.js file system
    const imagePath = path.join(process.cwd(), 'public', url.startsWith('/') ? url.substring(1) : url);
    
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
    } else {
      throw new Error(`Image file not found: ${imagePath}`);
    }
  } catch (error) {
    console.warn('Failed to convert image to base64:', error);
    throw error;
  }
}

async function addHeaderAndLogo(doc: jsPDF, title: string) {
  try {
    const logoBase64Path = path.join(process.cwd(), 'public', 'logo-base64.txt');
    let logoDataUri = '';
    if (fs.existsSync(logoBase64Path)) {
      const logoBase64 = fs.readFileSync(logoBase64Path, 'utf8').trim();
      logoDataUri = logoBase64.startsWith('data:image') ? logoBase64 : 'data:image/png;base64,' + logoBase64;
    } else {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUri = 'data:image/png;base64,' + logoBuffer.toString('base64');
      }
    }

    if (logoDataUri) {
      doc.addImage(logoDataUri, 'PNG', 15, 10, 40, 20);
    } else {
      doc.setDrawColor(22, 160, 133);
      doc.rect(15, 10, 40, 20, 'S');
      doc.text('CAREMENT', 20, 22);
    }
  } catch (error) {
    console.warn('Error adding logo:', error);
  }

  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('Carement Fashion', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Addis Ababa, Ethiopia | Phone: +251 11 123 4567', 105, 27, { align: 'center' });
  doc.text('Email: info@carementfashion.com', 105, 33, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(title, 105, 45, { align: 'center' });
  doc.line(20, 50, 190, 50);
}

/**
 * Generate Order PDF for Telegram based on stage
 */
export async function generateOrderTelegramPDF(orderId: string, stage: 'order_placed' | 'payment_verified' | 'order_dispatched'): Promise<{ pdfPath: string; summary: { uniqueStyles: number; totalQuantity: number; totalValue: number } }> {
  console.log(`Starting PDF generation for Order: ${orderId}, Stage: ${stage}`);
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side');
  }

  try {
    const db = await getDb();
  
  const order = await db.get('SELECT * FROM orders WHERE id = ?', orderId);
  if (!order) throw new Error('Order not found');

  const items = JSON.parse(order.items);
  const shop = await db.get('SELECT * FROM shops WHERE id = ?', order.shopId);
  if (!shop) throw new Error('Shop not found');

  const orderCount = await db.get(
    'SELECT COUNT(*) as count FROM orders WHERE shopId = ? AND created_at <= ?',
    [order.shopId, order.created_at]
  );
  const sequenceNumber = orderCount.count;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let title = 'Order Information Sheet';
  if (order.status === 'Paid' || order.status === 'Released') title = 'Verified Order & Payment Sheet';
  if (order.status === 'Dispatched' || order.status === 'Delivered') title = 'Final Order & Dispatch Report';

  await addHeaderAndLogo(doc, title);

  // Order Info Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 60);
  doc.text(`Shop Name: ${shop.name}`, 20, 67);
  doc.text(`Order Sequence: #${sequenceNumber}`, 20, 74);
  doc.text(`Order ID: ${orderId}`, 20, 81);

  // Collect item images and data
  const tableData = [];
  const images: (string | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Attempt to get selling price from products table if not available in item
    // For this implementation, we'll assume item.price is the buying price
    // and we might need to back-calculate or store selling price.
    // Let's look up the product to be sure.
    // Use the price from the order item, which already accounts for age-based pricing
    const catalogPrice = item.price;
    const discountRate = shop.discount || 0; // Assuming decimal (e.g., 0.15)
    
    const sellingPrice = catalogPrice;
    const reductionPercent = (discountRate * 100).toFixed(0);
    const buyingPrice = catalogPrice * (1 - discountRate);
    const quantity = item.quantity;
    const totalBuyingPrice = buyingPrice * quantity;

    tableData.push([
      (i + 1).toString(), // Unique Product #
      item.productCode || item.productId,
      '', // Picture placeholder
      sellingPrice.toLocaleString(),
      `${reductionPercent}%`,
      buyingPrice.toLocaleString(),
      quantity.toString(),
      totalBuyingPrice.toLocaleString()
    ]);

    // Load image
    let imgBase64 = null;
    try {
      const imgUrl = item.imageUrl || item.variant?.imageUrl;
      if (imgUrl) {
        imgBase64 = await imageUrlToBase64(imgUrl);
      }
    } catch (e) {
      console.warn('Could not load image for item', i);
    }
    images.push(imgBase64);
  }

  // Draw Table with proper row heights for images
  autoTable(doc, {
    startY: 95,
    head: [['#', 'Code', 'Pic', 'Sell Price', '% Red.', 'Buy Price', 'Qty', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 8, minCellHeight: 10 },
    styles: { fontSize: 8, valign: 'middle', halign: 'center', minCellHeight: 22 },
    columnStyles: {
      0: { cellWidth: 10 },    // #
      1: { cellWidth: 30 },   // Code
      2: { cellWidth: 25 },   // Picture
      3: { cellWidth: 22, halign: 'right' },  // Sell Price
      4: { cellWidth: 15, halign: 'right' },  // % Red
      5: { cellWidth: 22, halign: 'right' },  // Buy Price
      6: { cellWidth: 12, halign: 'center' }, // Qty
      7: { cellWidth: 28, halign: 'right' }   // Total
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 2 && data.cell.section === 'body') {
        const rowIndex = data.row.index;
        const img = images[rowIndex];
        if (img) {
          try {
            const imgWidth = 20;
            const imgHeight = 18;
            const x = data.cell.x + (data.cell.width - imgWidth) / 2;
            const y = data.cell.y + (data.cell.height - imgHeight) / 2;
            doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
          } catch (e) {
            console.warn('Failed to add image to PDF:', e);
            doc.setFontSize(6);
            doc.text('Img Error', data.cell.x + 2, data.cell.y + 11);
          }
        } else {
           doc.setFontSize(6);
           doc.setTextColor(150);
           doc.text('No Image', data.cell.x + 5, data.cell.y + 11);
           doc.setTextColor(0);
        }
      }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // Calculate summary for display and return
  const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const uniqueStyles = new Set(items.map((item: any) => item.productId)).size;
  
  // Check if summary fits on page
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Summary:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Unique Styles: ${uniqueStyles}`, 25, currentY + 8);
  doc.text(`Total Quantity: ${totalQty} pieces`, 25, currentY + 16);
  doc.text(`Total Order Value: ${order.amount.toLocaleString()} Birr`, 25, currentY + 24);
  currentY += 35;

  // Stage Specific Content - Show Payment Information for both Payment Verification and Dispatch
  if (stage === 'payment_verified' || stage === 'order_dispatched' || order.paymentSlipUrl) {
    if (currentY > 210) { doc.addPage(); currentY = 25; }
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Information:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${order.status}`, 25, currentY + 8);
    
    if (order.paymentSlipUrl) {
      doc.text('Payment Slip Attached:', 25, currentY + 16);
      try {
        const slipBase64 = await imageUrlToBase64(order.paymentSlipUrl);
        
        // Get image properties for proportional scaling
        const imgProps = doc.getImageProperties(slipBase64);
        const maxWidth = 90; // mm
        const maxHeight = 70; // mm
        let imgWidth = imgProps.width;
        let imgHeight = imgProps.height;
        
        // Scale proportionally
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        imgWidth = imgWidth * ratio;
        imgHeight = imgHeight * ratio;
        
        doc.addImage(slipBase64, 'PNG', 20, currentY + 20, imgWidth, imgHeight);
        currentY += imgHeight + 30;
      } catch (e) {
        doc.text('Slip image not accessible via ERP link', 25, currentY + 24);
        currentY += 30;
      }
    } else {
      currentY += 20;
    }
  }

  if (stage === 'order_dispatched' || order.dispatchInfo) {
    if (currentY > 230) { doc.addPage(); currentY = 25; }
    const dispatchInfo = order.dispatchInfo ? (typeof order.dispatchInfo === 'string' ? JSON.parse(order.dispatchInfo) : order.dispatchInfo) : {};
    
    doc.setFont('helvetica', 'bold');
    doc.text('Dispatch Details:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dispatch Date: ${order.actualDispatchDate ? new Date(order.actualDispatchDate).toLocaleString() : 'N/A'}`, 25, currentY + 8);
    doc.text(`Driver Name: ${dispatchInfo?.driverName || 'N/A'}`, 25, currentY + 16);
    doc.text(`License Plate: ${dispatchInfo?.transportLicensePlate || 'N/A'}`, 25, currentY + 24);
    doc.text(`Contact Person: ${dispatchInfo?.contactPerson || shop.contactPerson}`, 25, currentY + 32);
    currentY += 45;
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString()} | Carement Fashion ERP`, 105, 285, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
  }

  // Create summary object using already-calculated values
  const summary = {
    uniqueStyles,
    totalQuantity: totalQty,
    totalValue: order.amount
  };

  // Save to file with descriptive name
  const pdfDir = path.join(process.cwd(), 'public', 'telegram-pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Format: ShopName_MonthDate_Seq#
  const orderDate = new Date(order.created_at);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthDate = `${monthNames[orderDate.getMonth()]}${orderDate.getDate()}`;
  const shopNameClean = shop.name.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${shopNameClean}_${monthDate}_Order${sequenceNumber}.pdf`;
  const pdfPath = path.join(pdfDir, fileName);
  
  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(pdfPath, Buffer.from(pdfOutput));

  console.log(`PDF generation successful: ${pdfPath}`);
  return { pdfPath, summary };
  } catch (error) {
    console.error(`Error in generateOrderTelegramPDF for ${orderId}:`, error);
    throw error;
  }
}

/**
 * Generate Order Placement PDF wrapped for backward compatibility
 */
export async function generateOrderPlacementPDF(orderId: string): Promise<{ pdfPath: string; summary: { uniqueStyles: number; totalQuantity: number; totalValue: number } }> {
  return generateOrderTelegramPDF(orderId, 'order_placed');
}

/**
 * Generate Order Dispatch PDF wrapped for backward compatibility
 */
export async function generateOrderDispatchPDF(orderId: string): Promise<{ pdfPath: string; summary: { uniqueStyles: number; totalQuantity: number; totalValue: number } }> {
  return generateOrderTelegramPDF(orderId, 'order_dispatched');
}
