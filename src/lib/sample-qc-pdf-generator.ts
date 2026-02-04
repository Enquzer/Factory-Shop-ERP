
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { SampleInspection, SampleMeasurement } from './sample-qc';

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

async function imageUrlToBase64(url: string): Promise<string> {
  try {
    if (!url || url.trim() === '') return "";
    
    if (url.startsWith('data:')) return url;
    
    if (url.startsWith('http')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      
      let base64 = '';
      if (typeof window === 'undefined') {
        base64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        base64 = arrayBufferToBase64(arrayBuffer);
      }
      return `data:${contentType};base64,${base64}`;
    }
    
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      
      const cleanUrl = url.split('?')[0];
      const relativePath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
      
      const pathsToTry = [
        path.join(process.cwd(), 'public', relativePath),
        path.join(process.cwd(), relativePath),
        // Compatibility for nested uploads
        path.join(process.cwd(), 'public', 'api', relativePath)
      ];
      
      for (const imagePath of pathsToTry) {
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64 = imageBuffer.toString('base64');
          let contentType = 'image/png';
          if (relativePath.toLowerCase().endsWith('.jpg') || relativePath.toLowerCase().endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (relativePath.toLowerCase().endsWith('.webp')) {
            contentType = 'image/webp';
          }
          return `data:${contentType};base64,${base64}`;
        }
      }
      throw new Error(`Not found on disk: ${url}`);
    } else {
      const response = await fetch(url.startsWith('/') ? url : `/${url}`);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${arrayBufferToBase64(arrayBuffer)}`;
    }
  } catch (error: any) {
    console.error(`QC PDF Generator: Image conversion failed for ${url}:`, error.message);
    return "";
  }
}

export async function generateSampleQCPDF(
  inspection: SampleInspection & { 
    productName: string, 
    productCode: string, 
    measurements: SampleMeasurement[],
    howToMeasureImage?: string | null,
    howToMeasureAnnotations?: any[]
  },
  factoryName: string = 'Carement Fashion',
  factoryAddress: string = 'Addis Ababa, Ethiopia'
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text(factoryName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(factoryAddress, pageWidth / 2, 28, { align: 'center' });
  
  doc.line(15, 35, pageWidth - 15, 35);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`${inspection.sampleType.toUpperCase()} INSPECTION REPORT`, pageWidth / 2, 45, { align: 'center' });

  // Summary Information
  autoTable(doc, {
    startY: 55,
    body: [
      ['Product Name:', inspection.productName, 'Product Code:', inspection.productCode],
      ['Sample Type:', inspection.sampleType, 'Request Date:', format(new Date(inspection.requestDate), 'dd MMM yyyy')],
      ['Status:', inspection.status, 'Inspection Date:', inspection.inspectionDate ? format(new Date(inspection.inspectionDate), 'dd MMM yyyy') : 'Pending']
    ],
    theme: 'plain',
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 60 }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // POINT OF MEASURE (POM) VISUAL GUIDE - MOVED TO TOP
  if (inspection.howToMeasureImage) {
    if (currentY > 150) { doc.addPage(); currentY = 20; }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('POINT OF MEASURE (POM) VISUAL GUIDE', 15, currentY);
    currentY += 10;

    try {
      const base64Img = await imageUrlToBase64(inspection.howToMeasureImage);
      
      // Target dimensions
      const imgWidth = 90;
      const imgHeight = 110;
      const imgX = (pageWidth - imgWidth) / 2;

      if (base64Img) {
        // Use auto-detection by omitting format or passing the correct one
        const format = base64Img.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(base64Img, format, imgX, currentY, imgWidth, imgHeight);

        // Draw Annotations
        if (inspection.howToMeasureAnnotations && inspection.howToMeasureAnnotations.length > 0) {
            doc.setDrawColor(239, 68, 68); 
            doc.setLineWidth(0.6);
            
            inspection.howToMeasureAnnotations.forEach((arrow: any) => {
                if (!arrow.start || !arrow.end) return;
                
                const x1 = imgX + (arrow.start.x * imgWidth / 100);
                const y1 = currentY + (arrow.start.y * imgHeight / 100);
                const x2 = imgX + (arrow.end.x * imgWidth / 100);
                const y2 = currentY + (arrow.end.y * imgHeight / 100);
                
                doc.line(x1, y1, x2, y2);
                
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                
                doc.setFillColor(239, 68, 68);
                doc.circle(midX, midY, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.text(arrow.label?.toString() || '', midX, midY + 0.5, { align: 'center', baseline: 'middle' });
            });
        }
      } else {
          // Placeholder box if image fails but is expected
          doc.setDrawColor(200, 200, 200);
          doc.rect(imgX, currentY, imgWidth, imgHeight);
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text('Visual Guide Unavailable', pageWidth / 2, currentY + (imgHeight / 2), { align: 'center' });
      }
      
      currentY += imgHeight + 15;
    } catch (e) {
      console.error("Error drawing POM section in PDF", e);
      currentY += 20;
    }
  }

  // Measurement Comparison Table
  doc.setFontSize(12);
  doc.text('MEASUREMENT VERIFICATION', 15, currentY);
  
  const measurementRows = inspection.measurements.map(m => [
    m.pom,
    m.tolerance,
    m.designerMeasurement,
    m.actualMeasurement ?? '-',
    m.variance !== undefined ? m.variance.toFixed(2) : '-',
    m.status || 'Pending'
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Point of Measure', 'Tolerance', 'Designer', 'Actual', 'Variance', 'Status']],
    body: measurementRows,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 8 },
    columnStyles: {
      5: { fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // BOM Summary (if available)
  if (inspection.fullBOMJson) {
    try {
      const bom = JSON.parse(inspection.fullBOMJson);
      doc.setFontSize(12);
      doc.text('BILL OF MATERIALS (BOM) SNAPSHOT', 15, currentY);
      
      const bomRows = bom.map((item: any) => [
        item.type,
        item.itemName,
        item.supplier || '-',
        `${item.consumption} ${item.unit || ''}`
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Type', 'Item Name', 'Supplier', 'Consumption']],
        body: bomRows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    } catch (e) {}
  }

  // Comments
  if (inspection.comments) {
    if (currentY > 250) { doc.addPage(); currentY = 20; }
    doc.setFontSize(12);
    doc.text('COMMENTS & FINDINGS', 15, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitComments = doc.splitTextToSize(inspection.comments, pageWidth - 30);
    doc.text(splitComments, 15, currentY + 7);
    currentY += (splitComments.length * 5) + 15;
  }

  // Placeholder if POM is needed later

  // Footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by Carement Factory Inspector on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
}
