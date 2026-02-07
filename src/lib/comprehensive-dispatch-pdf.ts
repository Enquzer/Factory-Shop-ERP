import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDb } from '@/lib/db';
import { addHeaderAndLogo } from '@/lib/pdf-generator';
import path from 'path';
import fs from 'fs';

// Local implementation of imageUrlToBase64 to avoid import issues
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

interface OrderItem {
  productCode: string;
  name: string;
  variant: {
    color: string;
    size: string;
    imageUrl?: string;
  };
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface Shop {
  name: string;
  contactPerson: string;
  address: string;
  city: string;
  discount: number;
}

interface Order {
  id: string;
  shopId: string;
  shopName: string;
  status: string;
  amount: number;
  created_at: string;
  paymentSlipUrl?: string;
  dispatchInfo?: any;
  actualDispatchDate?: string;
  padNumber?: string;
  items: OrderItem[] | string;
}

interface DispatchInfo {
  driverName: string;
  transportLicensePlate: string;
  contactPerson: string;
  dispatchDate: string;
  padNumber: string;
  receiptNumber: string;
  comment?: string;
}

export async function generateComprehensiveDispatchPDF(orderId: string): Promise<{ 
  dispatchPdfPath: string; 
  packingListPdfPath: string; 
  summary: { 
    uniqueStyles: number; 
    totalQuantity: number; 
    totalValue: number;
    shopName: string;
    dispatchDate: string;
  } 
}> {
  try {
    console.log(`Generating comprehensive dispatch PDF for order: ${orderId}`);
    
    const db = await getDb();
    
    // Get order details
    const order = await db.get(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    ) as Order | undefined;
    
    if (!order) throw new Error('Order not found');
    
    // Parse items if they're stored as JSON
    const items: OrderItem[] = typeof order.items === 'string' 
      ? JSON.parse(order.items) 
      : order.items;
    
    // Get shop details
    const shop = await db.get(
      `SELECT * FROM shops WHERE id = ?`,
      [order.shopId]
    ) as Shop | undefined;
    
    if (!shop) throw new Error('Shop not found');
    
    // Calculate order statistics
    const uniqueStyles = new Set(items.map(item => item.productCode)).size;
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Generate Dispatch Document (Page 1)
    await generateDispatchDocument(doc, order, shop, items);
    
    // Add new page for Packing List
    doc.addPage();
    await generatePackingList(doc, order, shop, items);
    
    // Save dispatch PDF
    const pdfDir = path.join(process.cwd(), 'public', 'dispatch-pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    const orderDate = new Date(order.created_at);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthDate = `${monthNames[orderDate.getMonth()]}${orderDate.getDate()}`;
    const shopNameClean = shop.name.replace(/[^a-zA-Z0-9]/g, '');
    
    const dispatchFileName = `${shopNameClean}_${monthDate}_Dispatch_${orderId}.pdf`;
    const dispatchPdfPath = path.join(pdfDir, dispatchFileName);
    
    const dispatchPdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(dispatchPdfPath, Buffer.from(dispatchPdfOutput));
    
    // Create separate packing list PDF
    const packingListDoc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    await generatePackingList(packingListDoc, order, shop, items);
    
    const packingListFileName = `${shopNameClean}_${monthDate}_PackingList_${orderId}.pdf`;
    const packingListPdfPath = path.join(pdfDir, packingListFileName);
    
    const packingListPdfOutput = packingListDoc.output('arraybuffer');
    fs.writeFileSync(packingListPdfPath, Buffer.from(packingListPdfOutput));
    
    const summary = {
      uniqueStyles,
      totalQuantity: totalQty,
      totalValue: order.amount,
      shopName: shop.name,
      dispatchDate: new Date().toLocaleString()
    };
    
    console.log(`Comprehensive dispatch PDF generation successful: ${dispatchPdfPath}`);
    console.log(`Packing list PDF generation successful: ${packingListPdfPath}`);
    
    return { 
      dispatchPdfPath, 
      packingListPdfPath,
      summary 
    };
    
  } catch (error) {
    console.error(`Error in generateComprehensiveDispatchPDF for ${orderId}:`, error);
    throw error;
  }
}

async function generateDispatchDocument(
  doc: jsPDF, 
  order: Order, 
  shop: Shop, 
  items: OrderItem[]
) {
  // Add header with company logo
  await addHeaderAndLogo(doc, 'DISPATCH DOCUMENT');
  
  let currentY = 60;
  
  // Dispatch Information Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DISPATCH DETAILS', 20, currentY);
  currentY += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Dispatch Date: ${new Date().toLocaleString()}`, 20, currentY);
  doc.text(`Order ID: ${order.id}`, 120, currentY);
  currentY += 8;
  
  doc.text(`Shop Name: ${shop.name}`, 20, currentY);
  doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`, 120, currentY);
  currentY += 8;
  
  doc.text(`Shop Contact: ${shop.contactPerson}`, 20, currentY);
  doc.text(`PAD Number: ${order.padNumber || 'N/A'}`, 120, currentY);
  currentY += 8;
  
  doc.text(`Shop Address: ${shop.address}, ${shop.city}`, 20, currentY);
  currentY += 12;
  
  // Dispatch Information (if available)
  if (order.dispatchInfo) {
    const dispatchInfo = typeof order.dispatchInfo === 'string' 
      ? JSON.parse(order.dispatchInfo) 
      : order.dispatchInfo;
    
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSPORT INFORMATION', 20, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Driver Name: ${dispatchInfo.driverName || 'N/A'}`, 25, currentY);
    currentY += 6;
    doc.text(`License Plate: ${dispatchInfo.transportLicensePlate || 'N/A'}`, 25, currentY);
    currentY += 6;
    doc.text(`Contact Person: ${dispatchInfo.contactPerson || shop.contactPerson}`, 25, currentY);
    currentY += 6;
    doc.text(`Receipt Number: ${dispatchInfo.receiptNumber || 'N/A'}`, 25, currentY);
    currentY += 6;
    if (dispatchInfo.comment) {
      doc.text(`Comment: ${dispatchInfo.comment}`, 25, currentY);
      currentY += 6;
    }
    currentY += 8;
  }
  
  // Order Summary
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER SUMMARY', 20, currentY);
  currentY += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Unique Styles: ${new Set(items.map(item => item.productCode)).size}`, 25, currentY);
  currentY += 6;
  doc.text(`Total Quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)} pieces`, 25, currentY);
  currentY += 6;
  doc.text(`Total Order Value: ${order.amount.toLocaleString()} Birr`, 25, currentY);
  currentY += 12;
  
  // Payment Information
  if (order.paymentSlipUrl) {
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT VERIFICATION', 20, currentY);
    currentY += 8;
    
    try {
      const slipBase64 = await imageUrlToBase64(order.paymentSlipUrl);
      
      // Get image properties for proportional scaling
      const imgProps = doc.getImageProperties(slipBase64);
      const maxWidth = 90;
      const maxHeight = 70;
      let imgWidth = imgProps.width;
      let imgHeight = imgProps.height;
      
      // Scale proportionally
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      imgWidth = imgWidth * ratio;
      imgHeight = imgHeight * ratio;
      
      doc.addImage(slipBase64, 'PNG', 20, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (e) {
      doc.text('Payment slip image not available', 25, currentY);
      currentY += 10;
    }
  }
  
  // Order Items Table with Images
  const tableData = [];
  const images: (string | null)[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const catalogPrice = item.price;
    const discountRate = shop.discount || 0;
    const sellingPrice = catalogPrice;
    const buyingPrice = catalogPrice * (1 - discountRate);
    const quantity = item.quantity;
    const totalBuyingPrice = buyingPrice * quantity;
    
    tableData.push([
      (i + 1).toString(),
      item.productCode || '',
      '', // Image placeholder
      item.name,
      item.variant?.color || '',
      item.variant?.size || '',
      quantity.toString(),
      sellingPrice.toLocaleString(),
      `${(discountRate * 100).toFixed(0)}%`,
      buyingPrice.toLocaleString(),
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
  
  // Check if table fits on current page, if not, add new page
  const tableHeight = items.length * 8 + 15; // Approximate height
  const remainingSpace = 280 - currentY; // Page height minus current position
  
  if (tableHeight > remainingSpace && remainingSpace < 100) {
    doc.addPage();
    currentY = 20;
  }
  
  // Draw main order table with image support and page break prevention
  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Code', 'Image', 'Product Name', 'Color', 'Size', 'Qty', 'Sell Price', 'Disc %', 'Buy Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 8, minCellHeight: 10 },
    styles: { fontSize: 7, valign: 'middle', halign: 'center', minCellHeight: 25 },
    pageBreak: 'avoid', // Prevent table from splitting across pages
    columnStyles: {
      0: { cellWidth: 8 },    // #
      1: { cellWidth: 18 },   // Code
      2: { cellWidth: 25 },   // Image
      3: { cellWidth: 30 },   // Product Name
      4: { cellWidth: 15 },   // Color
      5: { cellWidth: 12 },   // Size
      6: { cellWidth: 10, halign: 'center' },   // Qty
      7: { cellWidth: 18, halign: 'right' },    // Sell Price
      8: { cellWidth: 12, halign: 'right' },    // Disc %
      9: { cellWidth: 18, halign: 'right' },    // Buy Price
      10: { cellWidth: 20, halign: 'right' }    // Total
    },
    didDrawCell: (data: any) => {
      // Handle image rendering in the table
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
  
  // Footer - Add only once per page at the end
  const finalY = (doc as any).lastAutoTable.finalY || currentY + 20;
  let footerY = finalY + 15;
  
  // Ensure footer is positioned correctly
  if (footerY > 270) {
    doc.addPage();
    footerY = 25;
  }
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleString()} | Carement Fashion ERP`, 105, 285, { align: 'center' });
}

async function generatePackingList(
  doc: jsPDF, 
  order: Order, 
  shop: Shop, 
  items: OrderItem[]
) {
  // Add header with company logo
  await addHeaderAndLogo(doc, 'PACKING LIST');
  
  let currentY = 60;
  
  // Packing List Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PACKING LIST', 20, currentY);
  currentY += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Order ID: ${order.id}`, 20, currentY);
  doc.text(`Dispatch Date: ${new Date().toLocaleString()}`, 150, currentY);
  currentY += 8;
  
  doc.text(`Destination: ${shop.name}`, 20, currentY);
  doc.text(`Contact: ${shop.contactPerson}`, 150, currentY);
  currentY += 8;
  
  doc.text(`Address: ${shop.address}, ${shop.city}`, 20, currentY);
  currentY += 15;
  
  // Create packing matrix by size and color
  const packingMatrix = new Map<string, { 
    color: string; 
    size: string; 
    quantity: number; 
    items: { 
      productCode: string; 
      name: string; 
      price: number; 
      imageUrl?: string 
    }[] 
  }>();
  
  // Group items by color and size
  for (const item of items) {
    const key = `${item.variant?.color || 'N/A'}_${item.variant?.size || 'N/A'}`;
    
    if (!packingMatrix.has(key)) {
      packingMatrix.set(key, {
        color: item.variant?.color || 'N/A',
        size: item.variant?.size || 'N/A',
        quantity: 0,
        items: []
      });
    }
    
    const matrixEntry = packingMatrix.get(key)!;
    matrixEntry.quantity += item.quantity;
    matrixEntry.items.push({
      productCode: item.productCode,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl || item.variant?.imageUrl
    });
  }
  
  // Convert to array and sort
  const matrixData = Array.from(packingMatrix.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => {
      // Sort by color first, then by size
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.size.localeCompare(b.size);
    });
  
  // Create packing matrix table
  const packingTableData = matrixData.map((entry, index) => {
    const catalogPrice = entry.items[0]?.price || 0;
    const discountRate = shop.discount || 0;
    const sellingPrice = catalogPrice;
    const buyingPrice = catalogPrice * (1 - discountRate);
    const totalPayment = buyingPrice * entry.quantity;
    
    return [
      (index + 1).toString(),
      entry.color,
      entry.size,
      entry.quantity.toString(),
      entry.items[0]?.productCode || '',
      sellingPrice.toLocaleString(),
      buyingPrice.toLocaleString(),
      totalPayment.toLocaleString()
    ];
  });
  
  // Draw packing matrix table
  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Color', 'Size', 'Qty', 'Product Code', 'Sell Price', 'Buy Price', 'Total Payment']],
    body: packingTableData,
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8, valign: 'middle', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10 },    // #
      1: { cellWidth: 25 },    // Color
      2: { cellWidth: 20 },    // Size
      3: { cellWidth: 15, halign: 'center' },  // Qty
      4: { cellWidth: 25 },    // Product Code
      5: { cellWidth: 22, halign: 'right' },   // Sell Price
      6: { cellWidth: 22, halign: 'right' },   // Buy Price
      7: { cellWidth: 25, halign: 'right' }    // Total Payment
    }
  });
  
  // Add summary totals
  const totalQuantity = matrixData.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalPayment = matrixData.reduce((sum, entry) => {
    const catalogPrice = entry.items[0]?.price || 0;
    const discountRate = shop.discount || 0;
    const buyingPrice = catalogPrice * (1 - discountRate);
    return sum + (buyingPrice * entry.quantity);
  }, 0);
  
  let finalY = (doc as any).lastAutoTable.finalY || currentY + 20;
  finalY += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL QUANTITY: ${totalQuantity} pieces`, 20, finalY);
  doc.text(`TOTAL PAYMENT: ${totalPayment.toLocaleString()} Birr`, 150, finalY);
  
  // Footer - Add only once at the end of the packing list
  const packingFinalY = (doc as any).lastAutoTable.finalY || currentY + 20;
  let packingFooterY = packingFinalY + 15;
  
  // Ensure footer is positioned correctly
  if (packingFooterY > 190) { // Landscape page height is shorter
    doc.addPage();
    packingFooterY = 25;
  }
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleString()} | Carement Fashion ERP`, 140, 200, { align: 'center' });
}