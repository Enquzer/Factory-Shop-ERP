// lib/pdf-generator.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MarketingOrder } from './marketing-orders';
import { Product } from './products';
import { Order } from './orders';
import { Shop } from './shops';

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

// Function to generate a summary report PDF
export async function generateSummaryReport(orders: MarketingOrder[]): Promise<string> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 148, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Production Summary Report', 148, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 32, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 38, 276, 38);
    
    // Add summary statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.isCompleted).length;
    const inProgressOrders = orders.filter(o => !o.isCompleted).length;
    
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, 48);
    
    doc.setFontSize(12);
    doc.text(`Total Orders: ${totalOrders}`, 20, 58);
    doc.text(`Completed Orders: ${completedOrders}`, 20, 65);
    doc.text(`In Progress Orders: ${inProgressOrders}`, 20, 72);
    
    // Add status breakdown
    doc.setFontSize(14);
    doc.text('Status Breakdown', 20, 85);
    
    doc.setFontSize(12);
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    let statusY = 95;
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
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 148, finalY + 15, { align: 'center' });
    doc.text('Confidential - For internal use only.', 148, finalY + 20, { align: 'center' });
    
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

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 148, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Inventory Report', 148, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 32, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 38, 276, 38);
    
    // Add summary statistics
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    const totalValue = products.reduce(
      (sum, product) => 
        sum + (product.price * product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0)),
      0
    );
    
    doc.setFontSize(14);
    doc.text('Inventory Summary', 20, 48);
    
    doc.setFontSize(12);
    doc.text(`Total Products: ${totalProducts}`, 20, 58);
    doc.text(`Total Variants: ${totalVariants}`, 20, 65);
    doc.text(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`, 20, 72);
    
    // Add a line separator
    doc.line(20, 78, 276, 78);
    
    // Add products table
    doc.setFontSize(14);
    doc.text('Product Inventory Details', 20, 88);
    
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
      startY: 95,
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
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 148, finalY + 15, { align: 'center' });
    doc.text('Confidential - For internal use only.', 148, finalY + 20, { align: 'center' });
    
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

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 148, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Products Report', 148, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 32, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 38, 276, 38);
    
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
    doc.text('Products Summary', 20, 48);
    
    doc.setFontSize(12);
    doc.text(`Total Products: ${totalProducts}`, 20, 58);
    doc.text(`Total Variants: ${totalVariants}`, 20, 65);
    doc.text(`Total Inventory Value: ETB ${totalValue.toLocaleString()}`, 20, 72);
    doc.text(`Low Stock Items: ${lowStockItems}`, 20, 79);
    
    // Add a line separator
    doc.line(20, 85, 276, 85);
    
    // Add products table
    doc.setFontSize(14);
    doc.text('Product Details', 20, 95);
    
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
      startY: 102,
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
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 107;
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 148, finalY + 15, { align: 'center' });
    doc.text('Confidential - For internal use only.', 148, finalY + 20, { align: 'center' });
    
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

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 148, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Orders Report', 148, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 32, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 38, 276, 38);
    
    // Add summary statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      order.status === 'Pending' || order.status === 'Awaiting Payment'
    ).length;
    const completedOrders = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    
    doc.setFontSize(14);
    doc.text('Orders Summary', 20, 48);
    
    doc.setFontSize(12);
    doc.text(`Total Orders: ${totalOrders}`, 20, 58);
    doc.text(`Pending Orders: ${pendingOrders}`, 20, 65);
    doc.text(`Completed Orders: ${completedOrders}`, 20, 72);
    doc.text(`Total Revenue: ETB ${totalRevenue.toLocaleString()}`, 20, 79);
    
    // Add a line separator
    doc.line(20, 85, 276, 85);
    
    // Add orders table
    doc.setFontSize(14);
    doc.text('Order Details', 20, 95);
    
    // Prepare table data
    const tableData: (string | number)[][] = orders.map(order => [
      order.id,
      order.shopName,
      new Date(order.date).toLocaleDateString(),
      order.status,
      `ETB ${order.amount.toLocaleString()}`
    ]);
    
    // Add table with order details
    (doc as any).autoTable({
      startY: 102,
      head: [['Order ID', 'Shop Name', 'Date', 'Status', 'Amount (ETB)']],
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
    const finalY = (doc as any).lastAutoTable.finalY || 107;
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 148, finalY + 15, { align: 'center' });
    doc.text('Confidential - For internal use only.', 148, finalY + 20, { align: 'center' });
    
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

    // Add company header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Carement Fashion', 148, 15, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Shops Report', 148, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 148, 32, { align: 'center' });
    
    // Add a line separator
    doc.line(20, 38, 276, 38);
    
    // Add summary statistics
    const totalShops = shops.length;
    const activeShops = shops.filter(shop => shop.status === 'Active').length;
    const inactiveShops = shops.filter(shop => shop.status === 'Inactive').length;
    const cities = new Set(shops.map(shop => shop.city)).size;
    
    doc.setFontSize(14);
    doc.text('Shops Summary', 20, 48);
    
    doc.setFontSize(12);
    doc.text(`Total Shops: ${totalShops}`, 20, 58);
    doc.text(`Active Shops: ${activeShops}`, 20, 65);
    doc.text(`Inactive Shops: ${inactiveShops}`, 20, 72);
    doc.text(`Cities Covered: ${cities}`, 20, 79);
    
    // Add a line separator
    doc.line(20, 85, 276, 85);
    
    // Add shops table
    doc.setFontSize(14);
    doc.text('Shop Details', 20, 95);
    
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
      startY: 102,
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
    const finalY = (doc as any).lastAutoTable.finalY || 107;
    doc.setFontSize(10);
    doc.text('This document is generated automatically by the Carement Fashion ERP system.', 148, finalY + 15, { align: 'center' });
    doc.text('Confidential - For internal use only.', 148, finalY + 20, { align: 'center' });
    
    // Generate PDF as blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating shops report:', error);
    throw new Error('Failed to generate shops report');
  }
}