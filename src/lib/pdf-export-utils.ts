import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';

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
  const doc = new jsPDF();
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
    autoTable(doc, {
      startY: yPos,
      head: [columns],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 },
      margin: { top: 10 }
    });
  } else {
    autoTable(doc, {
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

export async function exportPayslipToPDF(payrollRecord: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add Logo
  try {
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
  } catch (error) {
    console.error("Failed to load logo for PDF:", error);
  }

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text("PAYSLIP", pageWidth - 15, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("CAREMENT FASHION PLC", 45, 18);
  doc.text("Addis Ababa, Ethiopia", 45, 23);
  doc.text("Phone: +251 911 000 000", 45, 28);

  doc.setDrawColor(200);
  doc.line(15, 40, pageWidth - 15, 40);

  // Employee Details Section
  let yPos = 50;
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE DETAILS", 15, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const details = [
    { label: "Name:", value: payrollRecord.name },
    { label: "Employee ID:", value: payrollRecord.employeeId },
    { label: "Position:", value: payrollRecord.jobCenter },
    { label: "Join Date:", value: payrollRecord.joinedDate || 'N/A' },
    { label: "Payroll Period:", value: payrollRecord.month },
    { label: "Payment Date:", value: format(new Date(), 'dd MMM yyyy') }
  ];

  details.forEach((item, index) => {
    const x = index % 2 === 0 ? 15 : pageWidth / 2;
    const y = yPos + Math.floor(index / 2) * 7;
    doc.setFont("helvetica", "bold");
    doc.text(item.label, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(item.value), x + 30, y);
  });

  yPos += 25;
  doc.line(15, yPos, pageWidth - 15, yPos);

  // Earnings and Deductions Table
  yPos += 10;
  
  const grossSalary = payrollRecord.baseSalary + payrollRecord.otPay + payrollRecord.incentiveBonus;
  
  const earningsData = [
    ["Basic Salary", `${payrollRecord.baseSalary.toLocaleString()} Br`],
    ["Overtime (OT)", `${payrollRecord.otPay.toLocaleString()} Br`],
    ["Incentive Bonus", `${payrollRecord.incentiveBonus.toLocaleString()} Br`],
    [{ content: "Gross Salary", styles: { fontStyle: 'bold' as any, fillColor: [240, 240, 240] as any } }, { content: `${grossSalary.toLocaleString()} Br`, styles: { fontStyle: 'bold' as any, fillColor: [240, 240, 240] as any } }]
  ];

  const deductionsData = [
    ["Income Tax (PAYE)", `${payrollRecord.taxPayable.toLocaleString()} Br`],
    ["Pension (7%)", `${payrollRecord.pensionEmployee.toLocaleString()} Br`],
    ["Disciplinary Fines", `${payrollRecord.disciplinaryFines.toLocaleString()} Br`],
    ["Other Deductions", `${payrollRecord.otherDeductions.toLocaleString()} Br`],
    [{ content: "Total Deductions", styles: { fontStyle: 'bold' as any, fillColor: [240, 240, 240] as any } }, { content: `${(payrollRecord.taxPayable + payrollRecord.pensionEmployee + payrollRecord.disciplinaryFines + payrollRecord.otherDeductions).toLocaleString()} Br`, styles: { fontStyle: 'bold' as any, fillColor: [240, 240, 240] as any } }]
  ];

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("EARNINGS", 15, yPos);
  doc.text("DEDUCTIONS", pageWidth / 2 + 5, yPos);

  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    body: earningsData,
    theme: 'plain',
    margin: { left: 15, right: pageWidth / 2 + 5 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } }
  });

  autoTable(doc, {
    startY: yPos,
    body: deductionsData,
    theme: 'plain',
    margin: { left: pageWidth / 2 + 5, right: 15 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Net Pay Section
  doc.setFillColor(66, 66, 66);
  doc.rect(15, yPos, pageWidth - 30, 15, 'F');
  
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("NET PAYABLE", 25, yPos + 10);
  doc.text(`${payrollRecord.netSalary.toLocaleString()} Br`, pageWidth - 25, yPos + 10, { align: 'right' });

  // Employer Contribution (Informative)
  yPos += 25;
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`* Employer Pension Contribution (11%): ${payrollRecord.pensionEmployer.toLocaleString()} Br (not deducted from net)`, 15, yPos);

  // Signatures
  yPos += 30;
  doc.line(15, yPos, 70, yPos);
  doc.line(pageWidth - 70, yPos, pageWidth - 15, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text("Employee Signature", 15, yPos + 5);
  doc.text("Authorized Signatory", pageWidth - 15, yPos + 5, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `This is a computer-generated payslip and does not require a physical stamp.`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  doc.save(`Payslip-${payrollRecord.employeeId}-${payrollRecord.month}.pdf`);
}

export async function exportEmployeeActionLetterToPDF(action: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add Logo
  try {
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
  } catch (error) {
    console.error("Failed to load logo for PDF:", error);
  }

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("CAREMENT FASHION PLC", 45, 18);
  doc.text("Addis Ababa, Ethiopia", 45, 23);
  doc.text("Phone: +251 911 000 000", 45, 28);

  doc.setDrawColor(200);
  doc.line(15, 40, pageWidth - 15, 40);

  // Date and Ref
  let yPos = 55;
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy')}`, pageWidth - 15, yPos, { align: 'right' });
  doc.text(`Ref: HR/${action.actionType.toUpperCase()}/${action.id || 'NEW'}`, 15, yPos);

  // Recipient
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text("TO:", 15, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${action.employeeName}`, 30, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("ID:", 15, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${action.employeeId}`, 30, yPos);
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("POSITION:", 15, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${action.currentPosition || action.oldPosition || 'Employee'}`, 40, yPos);

  // Subject
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`SUBJECT: ${action.title.toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
  doc.line(70, yPos + 2, pageWidth - 70, yPos + 2);

  // Body
  yPos += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const splitText = doc.splitTextToSize(action.description, pageWidth - 30);
  doc.text(splitText, 15, yPos);
  
  yPos += (splitText.length * 7);

  // Specifics for Promotion/Demotion
  if (action.actionType === 'Promotion' || action.actionType === 'Demotion') {
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Effective Changes:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    
    if (action.newPosition) {
      doc.text(`• New Position: ${action.newPosition}`, 20, yPos);
      yPos += 7;
    }
    if (action.newSalary) {
      doc.text(`• New Salary: ${action.newSalary.toLocaleString()} Br`, 20, yPos);
      yPos += 7;
    }
    doc.text(`• Effective Date: ${action.effectiveDate}`, 20, yPos);
    yPos += 7;
  }

  // Closing
  yPos = Math.max(yPos + 30, pageHeight - 60);
  doc.text("Sincerely,", 15, yPos);
  yPos += 20;
  doc.line(15, yPos, 70, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${action.issuedBy || 'Human Resource Department'}`, 15, yPos + 7);
  doc.setFont("helvetica", "normal");
  doc.text("Carement Fashion PLC", 15, yPos + 12);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `This is an official document of Carement Fashion PLC. Page 1 of 1.`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  doc.save(`${action.actionType}-Letter-${action.employeeId}.pdf`);
}

export async function exportCertificateToPDF(result: any) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Corporate Border (Double line)
  doc.setDrawColor(44, 62, 80); // Midnight Blue
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Add Logo
  try {
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 20, 40, 40);
  } catch (error) {
    console.error("Failed to load logo for Certificate:", error);
  }

  // Company Information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text("CAREMENT FASHION PLC", pageWidth / 2, 65, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Addis Ababa, Ethiopia | Industrial Zone | +251 911 000 000", pageWidth / 2, 70, { align: 'center' });

  // Main Banner
  doc.setFont("times", "bold");
  doc.setFontSize(48);
  doc.setTextColor(30, 30, 30);
  doc.text("CERTIFICATE", pageWidth / 2, 90, { align: 'center' });
  
  doc.setFontSize(22);
  doc.setFont("times", "italic");
  doc.setTextColor(150, 120, 50); // Gold-ish
  doc.text("OF PROFESSIONAL ACHIEVEMENT", pageWidth / 2, 100, { align: 'center' });

  // Body
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("This is to formally certify that", pageWidth / 2, 115, { align: 'center' });

  doc.setFontSize(32);
  doc.setFont("times", "bold");
  doc.setTextColor(0);
  doc.text(result.employeeName?.toUpperCase() || "EMPLOYEE NAME", pageWidth / 2, 130, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(44, 62, 80);
  doc.text(`Employee ID: ${result.employeeId}`, pageWidth / 2, 137, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`has successfully completed the examination for`, pageWidth / 2, 150, { align: 'center' });

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(44, 62, 80);
  doc.text(result.examTitle, pageWidth / 2, 165, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(44, 62, 80);
  doc.text(`demonstrating a proficiency score of ${result.score}%`, pageWidth / 2, 175, { align: 'center' });

  // Dates
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Issued on: ${result.examDate}`, 40, pageHeight - 35);
  if (result.expiryDate) {
    doc.text(`Valid until: ${result.expiryDate}`, 40, pageHeight - 30);
  }

  // Signatures
  let sigY = pageHeight - 40;
  doc.setDrawColor(150);
  doc.line(pageWidth - 40, sigY, pageWidth - 100, sigY);
  doc.line(40, sigY, 100, sigY);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("Training Director", 70, sigY + 5, { align: 'center' });
  doc.text("HR Manager", pageWidth - 70, sigY + 5, { align: 'center' });

  // Unique Certificate ID (bottom right)
  doc.setFontSize(8);
  doc.setTextColor(200);
  doc.text(`CERT-ID: ${result.employeeId}-${Date.now().toString().slice(-6)}`, pageWidth - 20, pageHeight - 15, { align: 'right' });

  doc.save(`Exam-Certificate-${result.employeeId}.pdf`);
}

export async function exportTrainingCertificateToPDF(tr: any) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Corporate Border
  doc.setDrawColor(39, 174, 96); // Greenish for training
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Add Logo
  try {
    const logoBase64 = await getBase64ImageFromUrl('/logo.png');
    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 20, 40, 40);
  } catch (error) {
    console.error("Failed to load logo:", error);
  }

  // Company Information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(39, 174, 96);
  doc.text("CAREMENT FASHION PLC", pageWidth / 2, 65, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Continuous Professional Development Division", pageWidth / 2, 70, { align: 'center' });

  // Main Banner
  doc.setFont("times", "bold");
  doc.setFontSize(48);
  doc.setTextColor(30, 30, 30);
  doc.text("TRAINING CERTIFICATE", pageWidth / 2, 90, { align: 'center' });
  
  doc.setFontSize(22);
  doc.setFont("times", "italic");
  doc.setTextColor(100);
  doc.text("RECOGNITION OF COMPLETION", pageWidth / 2, 100, { align: 'center' });

  // Body
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("This certifies that our esteemed employee", pageWidth / 2, 115, { align: 'center' });

  doc.setFontSize(32);
  doc.setFont("times", "bold");
  doc.setTextColor(0);
  doc.text(tr.employeeName?.toUpperCase() || "EMPLOYEE NAME", pageWidth / 2, 130, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`has successfully completed the training module`, pageWidth / 2, 145, { align: 'center' });

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(39, 174, 96);
  doc.text(tr.moduleTitle, pageWidth / 2, 160, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(40);
  doc.text(`Duration: ${tr.duration || 'N/A'} Hours`, pageWidth / 2, 175, { align: 'center' });

  // Dates
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Completion Date: ${tr.completionDate || format(new Date(), 'yyyy-MM-dd')}`, 40, pageHeight - 35);
  doc.text(`Instructor: ${tr.instructor || 'Internal Training Dept'}`, 40, pageHeight - 30);

  // Signatures
  let sigY = pageHeight - 40;
  doc.setDrawColor(150);
  doc.line(pageWidth - 40, sigY, pageWidth - 100, sigY);
  doc.line(40, sigY, 100, sigY);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("Lead Instructor", 70, sigY + 5, { align: 'center' });
  doc.text("HR Director", pageWidth - 70, sigY + 5, { align: 'center' });

  doc.save(`Training-Cert-${tr.employeeId}.pdf`);
}
