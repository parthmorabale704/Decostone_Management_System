export async function exportToPdf({ title, subtitle = '', columns, rows, filename = 'decostone_report' }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header styling
  doc.setFillColor(18, 24, 36);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DECOSTONE MATERIAL MANAGEMENT SYSTEM', 14, 15);

  // Subtitle & Date
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase() + (subtitle ? ` - ${subtitle}` : ''), 14, 22);

  const now = new Date().toLocaleString();
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Generated on: ${now}`, 14, 28);

  // Table
  autoTable(doc, {
    startY: 38,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [24, 34, 50],
      textColor: [248, 250, 252],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 38, bottom: 20, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`DecoStone Confidential Report | Page ${data.pageNumber} of ${pageCount}`, 14, 290);
    }
  });

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportToExcel({ data, filename = 'decostone_export', sheetName = 'Sheet1' }) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
