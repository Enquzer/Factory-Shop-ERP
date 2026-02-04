
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Style, BOMItem, Measurement, Attachment, Canvas } from './styles-sqlite';

async function getBase64Image(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateTechPackPDF(style: Style) {
  const doc = new jsPDF();
  
  // -- Page 1: Cover Sheet --
  doc.setFontSize(24);
  doc.text(style.name.toUpperCase(), 105, 40, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`Style #: ${style.number}`, 105, 50, { align: 'center' });
  doc.text(`Season: ${style.season || 'N/A'}`, 105, 58, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 66, { align: 'center' });

  if (style.imageUrl) {
      try {
        const base64Img = await getBase64Image(style.imageUrl);
        doc.addImage(base64Img, 'JPEG', 55, 80, 100, 100 * (1.2)); // Fallback ratio if needed
      } catch (e) {
          console.error("Failed to load image for PDF", e);
          doc.rect(55, 80, 100, 100);
          doc.text("Image N/A", 105, 130, { align: 'center' });
      }
  }

  // Attributes
  doc.setFontSize(10);
  doc.text(`Category: ${style.category || '-'}`, 20, 200);
  doc.text(`Status: ${style.status}`, 20, 206);
  doc.text(`Version: ${style.version}`, 20, 212);
  
  if (style.description) {
      doc.text("Description:", 20, 225);
      const splitDesc = doc.splitTextToSize(style.description, 170);
      doc.text(splitDesc, 20, 230);
  }

  // -- Page 2: BOM --
  if (style.bom && style.bom.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Bill of Materials", 14, 20);
      
      const bomData = style.bom.map(item => [
          item.type,
          item.itemName,
          item.supplier || '',
          `${item.consumption || 0} ${item.unit || ''}`,
          `${item.cost || 0} ${item.currency}`,
          item.comments || ''
      ]);

      autoTable(doc, {
          head: [['Type', 'Item', 'Supplier', 'Cons.', 'Cost', 'Comments']],
          body: bomData,
          startY: 30,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40] }
      });
  }

  // Helper to add header on every page
  const addHeader = async (doc: jsPDF, title: string) => {
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          // Header Background
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(0, 0, 210, 25, 'F');
          
          // Logo
          try {
             // In a real app involving client-side generation, caching the base64 logo is better. 
             // We'll try to add it if we can, otherwise just text.
             // Loading images in jsPDF synchronously is tricky if they are URLs.
             // We will skip actual image loading for now to avoid breaking if fetch fails, 
             // and just add the text header.
          } catch(e) {}

          doc.setFontSize(20);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text("CAREMENT", 14, 16);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text("Factory & Shop ERP", 60, 16);

          doc.setFontSize(8);
          doc.text(`Generated: ${new Date().toLocaleDateString()}`, 190, 10, { align: 'right' });
          doc.text(`Page ${i} of ${pageCount}`, 190, 14, { align: 'right' });
          
          // Line
          doc.setDrawColor(226, 232, 240);
          doc.line(0, 25, 210, 25);
      }
  };

  // -- Page 3: Visual Guide & Measurements (Combined) --
  if (style.measurements || style.canvas) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Measurement Specification", 14, 40);
      
      let currentY = 50;

      // 1. Draw Visual Guide if exists
      if (style.canvas && style.canvas.canvasImageUrl) {
          try {
              const base64Img = await getBase64Image(style.canvas.canvasImageUrl);
              const imgX = (210 - 100) / 2; // Center
              doc.addImage(base64Img, 'JPEG', imgX, currentY, 100, 100);
              const pdfImgWidth = 100;
              const pdfImgHeight = 100;
              
              // Draw Annotations
              if (style.canvas.annotationsJson) {
                  const arrows = JSON.parse(style.canvas.annotationsJson);
                  arrows.forEach((a: any) => {
                      const x1 = imgX + (a.start.x / 100) * pdfImgWidth;
                      const y1 = currentY + (a.start.y / 100) * pdfImgHeight;
                      const x2 = imgX + (a.end.x / 100) * pdfImgWidth;
                      const y2 = currentY + (a.end.y / 100) * pdfImgHeight;

                      // Line
                      doc.setDrawColor(239, 68, 68); // Red-500
                      doc.setLineWidth(0.5);
                      doc.line(x1, y1, x2, y2);

                      // Arrowhead (simple circle/triangle at end)
                      // Vector math for correct rotation is complex for simple script, 
                      // let's just draw a small red circle at endpoints
                      doc.setFillColor(239, 68, 68);
                      doc.circle(x1, y1, 0.7, 'F');
                      doc.circle(x2, y2, 0.7, 'F');

                      // Label Bubble
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      
                      doc.setFillColor(239, 68, 68);
                      doc.circle(midX, midY, 2.5, 'F'); // 5mm diameter bubble
                      
                      doc.setTextColor(255, 255, 255);
                      doc.setFontSize(7);
                      doc.text(a.label, midX, midY + 1, { align: 'center' }); // +1 for baseline adjustment
                  });
              }

              currentY += pdfImgHeight + 10; // Space after image
          } catch(e) {
              console.error("Error drawing visual guide", e);
          }
      }

      // 2. Draw Measurement Table
      if (style.measurements && style.measurements.length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text("Spec Sheet", 14, currentY);
          currentY += 5;

          const sizes = Object.keys(style.measurements[0].sizeValues).sort();
          const head = ['POM', 'Tol', ...sizes];
          const body = style.measurements.map(m => [
              m.pom || '',
              m.tolerance ?? 0,
              ...sizes.map(s => m.sizeValues[s] ?? 0)
          ]);

          autoTable(doc, {
              head: [head],
              body: body,
              startY: currentY,
              theme: 'grid',
              headStyles: { 
                  fillColor: [241, 245, 249], // slate-100
                  textColor: [71, 85, 105], // slate-600
                  fontStyle: 'bold',
                  lineWidth: 0.1,
                  lineColor: [226, 232, 240]
              },
              styles: {
                  fontSize: 9,
                  cellPadding: 3,
                  lineColor: [226, 232, 240],
                  lineWidth: 0.1
              },
              columnStyles: {
                  0: { fontStyle: 'bold', cellWidth: 'auto' }, // POM column
                  1: { halign: 'center', cellWidth: 20 }, // Tol
                  // others auto
              }
          });
      }
  }

  // -- Page 4: Finishing Specifications --
  const finishingSpecs = style.specifications?.filter(s => s.category === 'Finishing');
  if (finishingSpecs && finishingSpecs.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Finishing Specifications (Print/Wash/Embroidery)", 14, 40);
      
      let currentY = 50;
      for (const spec of finishingSpecs) {
          if (currentY > 250) {
              doc.addPage();
              currentY = 40;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(spec.type.toUpperCase(), 14, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          if (spec.description) {
              doc.text(`Placement: ${spec.description}`, 14, currentY);
              currentY += 5;
          }

          if (spec.comments) {
              const splitComments = doc.splitTextToSize(`Instructions: ${spec.comments}`, 100);
              doc.text(splitComments, 14, currentY);
              currentY += (splitComments.length * 5);
          }

          if (spec.imageUrl) {
              try {
                  const base64Img = await getBase64Image(spec.imageUrl);
                  doc.addImage(base64Img, 'JPEG', 120, currentY - 10, 70, 70);
                  currentY = Math.max(currentY, (currentY - 10) + 70) + 10;
              } catch(e) {
                  currentY += 10;
              }
          } else {
              currentY += 10;
          }

          doc.setDrawColor(226, 232, 240);
          doc.line(14, currentY - 5, 196, currentY - 5);
          currentY += 5;
      }
  }

  // -- Page 5: Labels & Tags --
  const labelSpecs = style.specifications?.filter(s => s.category === 'Labels');
  if (labelSpecs && labelSpecs.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Labels & Tags Specifications", 14, 40);
      
      let currentY = 50;
      for (const spec of labelSpecs) {
          if (currentY > 250) {
              doc.addPage();
              currentY = 40;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(spec.type, 14, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          if (spec.description) {
              doc.text(`Detail: ${spec.description}`, 14, currentY);
              currentY += 5;
          }

          if (spec.comments) {
              const splitComments = doc.splitTextToSize(`Comments: ${spec.comments}`, 180);
              doc.text(splitComments, 14, currentY);
              currentY += (splitComments.length * 5);
          }

          if (spec.imageUrl) {
              try {
                  const base64Img = await getBase64Image(spec.imageUrl);
                  doc.addImage(base64Img, 'JPEG', 14, currentY, 50, 50);
                  currentY += 60;
              } catch(e) {
                  currentY += 10;
              }
          } else {
              currentY += 10;
          }

          doc.setDrawColor(226, 232, 240);
          doc.line(14, currentY - 5, 196, currentY - 5);
          currentY += 5;
      }
  }

  // Finalize Header on all pages
  await addHeader(doc, style.name);

  return doc.output('blob');
}
