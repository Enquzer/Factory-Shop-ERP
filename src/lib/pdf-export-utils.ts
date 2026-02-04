import jsPDF from 'jspdf';
import { UserOptions } from 'jspdf-autotable';
import 'jspdf-autotable'; // Import for side effects (attaches autoTable to jsPDF)
import { format } from 'date-fns';

// Define the autoTable type extension for jsPDF
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

// Helper to convert image URL to base64
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      resolve(reader.result as string);
    }, false);
    reader.onerror = () => {
      reject(new Error("Failed to convert image to base64"));
    };
    reader.readAsDataURL(blob);
  });
}

export async function exportFinancialReportToPDF({
  title,
  subtitle,
  columns,
  data,
  summaryData,
  fileName
}: {
  title: string;
  subtitle?: string;
  columns: string[];
  data: any[][];
  summaryData?: { label: string; value: string }[];
  fileName: string;
}) {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add Logo
  try {
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
  } catch (error) {
    console.error("Failed to load logo for PDF:", error);
  }

  // Header Info
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(title, 50, 25);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 50, 32);
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 50, 38);

  // Summary Grid
  if (summaryData && summaryData.length > 0) {
    let yPos = 50;
    doc.setDrawColor(200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    
    const colWidth = (pageWidth - 30) / Math.min(summaryData.length, 4);
    summaryData.forEach((item, index) => {
      const x = 15 + (index % 4) * colWidth;
      const y = yPos + Math.floor(index / 4) * 15;
      
      doc.setFont("helvetica", "bold");
      doc.text(item.label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(item.value, x, y + 6);
    });
    
    yPos += Math.ceil(summaryData.length / 4) * 20;
    doc.autoTable({
      startY: yPos,
      head: [columns],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 },
      margin: { top: 10 }
    });
  } else {
    doc.autoTable({
      startY: 50,
      head: [columns],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} - Private & Confidential - Carement Fashion ERP`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`${fileName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
