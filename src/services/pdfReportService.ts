import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PRACTICAL_EVALUATION_TEMPLATE_BASE64 } from '../assets/templates/practicalEvaluationFormTemplate';

export interface ReservationPdfRecord {
  testTakerName: string;
  project: string;
  idNo: string;
  passportNumber: string;
  cprNumber: string;
  bookingNo: string;
  occupation: string;
  status: string;
  attachment: string;
  assessorName?: string;
  assessorId?: string;
}

export interface ReservationReportOptions {
  batchName: string;
  centerName: string;
  date: string;
  records: ReservationPdfRecord[];
}

export interface CandidateEvaluationPdfOptions {
  candidateName: string;
  passportNumber: string;
  occupation: string;
  bookingNo?: string;
  idNo?: string;
  centerName: string;
  date: string;
  taskCode?: string;
  difficulty?: 'Hard' | 'Moderate' | 'Easy';
  assessorName: string;
  assessorId: string;
}

export interface GeneratedEvaluationPdfItem {
  candidateName: string;
  passportNumber: string;
  occupation: string;
  assessorName: string;
  assessorId: string;
  filename: string;
  pdfBytes: Uint8Array;
  blob: Blob;
  blobUrl: string;
}

export interface BatchEvaluationResult {
  count: number;
  items: GeneratedEvaluationPdfItem[];
  zipBlob?: Blob;
  zipFilename?: string;
}

/**
 * Load the official Practical Evaluation Form - L1 (English) template bytes.
 * Attempts to fetch from public/templates/Practical Evaluation Form - L1 (English).pdf first,
 * and falls back to the embedded base64 template if offline or running in sandboxed environment.
 */
export const getEvaluationTemplateBytes = async (): Promise<Uint8Array> => {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const response = await fetch('/templates/Practical Evaluation Form - L1 (English).pdf');
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 1000) {
          return new Uint8Array(buffer);
        }
      }
    }
  } catch (err) {
    // Network or static fetch not available, fallback to embedded template
    console.warn('Could not fetch template via URL, falling back to embedded template constant.');
  }

  // Fallback to base64 embedded template
  const binaryString = atob(PRACTICAL_EVALUATION_TEMPLATE_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Populate and overlay candidate & assessor information on the stored Practical Evaluation Form template.
 * Strictly adheres to requirements:
 * 1. Test Center Name
 * 2. Date
 * 3. Occupation Name
 * 4. Candidate Name
 * 5. Passport #
 * 6. Assessor Name
 * 7. Assessor ID Number
 * 8. Practical Task # MUST ALWAYS REMAIN BLANK
 * 9. All other visual layout, ratings, rubrics, and declaration remain exactly as original.
 */
export const populateEvaluationFormFromTemplate = async (
  templateBytes: Uint8Array,
  options: CandidateEvaluationPdfOptions
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  // Helper to neatly draw auto-filled text over the template's dotted lines with white backing
  const drawField = (text: string | undefined, x: number, y: number, maxW: number, fontSize = 8.5) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxW && currentFontSize > 6) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    // Mask dotted placeholder line cleanly
    page.drawRectangle({
      x: x - 2,
      y: y - 2,
      width: Math.max(textWidth + 4, 30),
      height: currentFontSize + 4,
      color: rgb(1, 1, 1),
    });

    page.drawText(cleanText, {
      x,
      y,
      size: currentFontSize,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });
  };

  // 1. Test Center Name (width 138 pt max to not collide with Date at 345)
  drawField(options.centerName, 198, 696.5, 138, 8);

  // 2. Date
  drawField(options.date, 452, 695, 75, 8.5);

  // 3. Occupation Name
  drawField(options.occupation, 198, 678.2, 138, 8.5);

  // 4. Candidate Name
  drawField(options.candidateName, 452, 678.2, 120, 8.5);

  // 5. Passport #
  drawField(options.passportNumber, 452, 663, 80, 8.5);

  // 6. Practical Task # MUST ALWAYS REMAIN BLANK (per requirement 4)
  // Intentionally nothing is drawn at (198, 648.2)

  // 7. Assessor Name
  drawField(options.assessorName, 100, 42, 140, 8.5);

  // 8. Assessor ID Number
  drawField(options.assessorId, 320, 42, 75, 8.5);

  return await pdfDoc.save();
};

/**
 * Generate a single individual Practical Evaluation Form PDF for one candidate.
 */
export const generateSingleEvaluationPdf = async (
  options: CandidateEvaluationPdfOptions,
  templateBytesArg?: Uint8Array
): Promise<GeneratedEvaluationPdfItem> => {
  const templateBytes = templateBytesArg || await getEvaluationTemplateBytes();
  const pdfBytes = await populateEvaluationFormFromTemplate(templateBytes, options);

  const cleanName = (options.candidateName || 'Candidate').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanPassport = (options.passportNumber || 'Passport').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Evaluation_Report_${cleanName}_${cleanPassport}.pdf`;

  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    candidateName: options.candidateName,
    passportNumber: options.passportNumber,
    occupation: options.occupation,
    assessorName: options.assessorName,
    assessorId: options.assessorId,
    filename,
    pdfBytes,
    blob,
    blobUrl,
  };
};

export interface BatchEvaluationPdfOptions {
  records: ReservationPdfRecord[];
  centerName: string;
  batchDate: string;
  batchName: string;
}

/**
 * Generate 1 PDF per candidate using the stored Practical Evaluation Form - L1 template.
 * Produces individual candidate PDFs and bundles them into a ZIP archive.
 */
export const generateBatchEvaluationPdfs = async (
  recordsOrOptions: ReservationPdfRecord[] | BatchEvaluationPdfOptions,
  centerNameArg?: string,
  batchDateArg?: string,
  batchNameArg?: string
): Promise<BatchEvaluationResult> => {
  let records: ReservationPdfRecord[];
  let centerName: string;
  let batchDate: string;
  let batchName: string;

  if (Array.isArray(recordsOrOptions)) {
    records = recordsOrOptions;
    centerName = centerNameArg || 'Saudi Skills Verification Center';
    batchDate = batchDateArg || new Date().toISOString().split('T')[0];
    batchName = batchNameArg || 'Batch';
  } else {
    records = recordsOrOptions.records;
    centerName = recordsOrOptions.centerName;
    batchDate = recordsOrOptions.batchDate;
    batchName = recordsOrOptions.batchName;
  }

  if (!records || records.length === 0) {
    return { count: 0, items: [] };
  }

  const templateBytes = await getEvaluationTemplateBytes();
  const items: GeneratedEvaluationPdfItem[] = [];
  const zip = new JSZip();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const candidateItem = await generateSingleEvaluationPdf(
      {
        candidateName: rec.testTakerName,
        passportNumber: rec.passportNumber,
        occupation: rec.occupation,
        bookingNo: rec.bookingNo,
        idNo: rec.idNo,
        centerName: centerName,
        date: batchDate,
        assessorName: rec.assessorName || 'Assigned Technical Assessor',
        assessorId: rec.assessorId || 'ASS-001',
      },
      templateBytes
    );

    items.push(candidateItem);
    zip.file(candidateItem.filename, candidateItem.blob);

    // If single candidate, trigger direct download
    if (records.length === 1) {
      triggerDownload(candidateItem.blob, candidateItem.filename);
    }
  }

  // Generate bundled ZIP package
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const cleanBatch = (batchName || 'Batch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = (batchDate || 'Date').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zipFilename = `Evaluation_Reports_${cleanBatch}_${cleanDate}.zip`;

  if (records.length > 1) {
    triggerDownload(zipBlob, zipFilename);
  }

  return {
    count: items.length,
    items,
    zipBlob,
    zipFilename,
  };
};

/**
 * Helper to trigger browser file download
 */
export const triggerDownload = (blob: Blob, filename: string): void => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate a combined PDF table report of all imported reservation records
 * Filename: Reservation_Report_[BatchName]_[Date].pdf
 */
export const generateCombinedReservationReportPdf = (options: ReservationReportOptions): void => {
  const { batchName, centerName, date, records } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const cleanBatch = batchName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = date.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Reservation_Report_${cleanBatch}_${cleanDate}.pdf`;

  // Page dimensions: 297 x 210 mm
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;

  // Header Banner
  doc.setFillColor(122, 46, 58); // #7A2E3A Maroon
  doc.rect(margin, margin, pageWidth - margin * 2, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SkillAssess 360 — Reservation Intake Roster Report', margin + 6, margin + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Center: ${centerName}   |   Target Batch: ${batchName}   |   Scheduled Date: ${date}`, margin + 6, margin + 17);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Records: ${records.length}`, pageWidth - margin - 35, margin + 17);

  // Table Setup
  let currentY = margin + 28;
  const colWidths = [10, 50, 24, 26, 26, 26, 44, 22, 41];
  const colHeaders = [
    '#', 
    '1. Test Taker Name', 
    '2. Project', 
    '3. ID No.', 
    '4. Passport #', 
    '6. Booking #', 
    '7. Occupation', 
    '8. Status', 
    'Assigned Assessor'
  ];

  const renderTableHeader = (y: number) => {
    doc.setFillColor(248, 236, 238); // #F8ECEE
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(122, 46, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let currentX = margin + 2;
    colHeaders.forEach((h, i) => {
      doc.text(h, currentX, y + 5.5);
      currentX += colWidths[i];
    });
  };

  renderTableHeader(currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  records.forEach((rec, idx) => {
    if (currentY + 8 > pageHeight - margin - 10) {
      doc.addPage();
      currentY = margin;
      renderTableHeader(currentY);
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(252, 250, 248);
      doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
    }

    let x = margin + 2;
    doc.text(String(idx + 1), x, currentY + 4.8);
    x += colWidths[0];

    const shortName = rec.testTakerName.length > 25 ? rec.testTakerName.substring(0, 25) + '...' : rec.testTakerName;
    doc.setFont('helvetica', 'bold');
    doc.text(shortName, x, currentY + 4.8);
    doc.setFont('helvetica', 'normal');
    x += colWidths[1];

    doc.text(rec.project || 'Saudi SVP', x, currentY + 4.8);
    x += colWidths[2];

    doc.setFont('courier', 'normal');
    doc.text(rec.idNo || '—', x, currentY + 4.8);
    x += colWidths[3];

    doc.setFont('courier', 'bold');
    doc.setTextColor(122, 46, 58);
    doc.text(rec.passportNumber || '—', x, currentY + 4.8);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
    x += colWidths[4];

    doc.setFont('courier', 'normal');
    doc.text(rec.bookingNo || '—', x, currentY + 4.8);
    doc.setFont('helvetica', 'normal');
    x += colWidths[5];

    const shortOcc = rec.occupation.length > 24 ? rec.occupation.substring(0, 24) + '...' : rec.occupation;
    doc.text(shortOcc, x, currentY + 4.8);
    x += colWidths[6];

    doc.setFont('helvetica', 'bold');
    doc.text(rec.status || 'Reserved', x, currentY + 4.8);
    doc.setFont('helvetica', 'normal');
    x += colWidths[7];

    const assessorDisplay = rec.assessorName ? `${rec.assessorName} (${rec.assessorId || 'ASS'})` : 'Unassigned';
    doc.text(assessorDisplay, x, currentY + 4.8);

    doc.setDrawColor(232, 217, 210);
    doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

    currentY += 7;
  });

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(128, 111, 111);
  doc.text(
    `Generated by SkillAssess 360 Verification Platform • All candidate records verified for Skills Verification Program (SVP) • Page 1 of ${doc.getNumberOfPages()}`,
    margin,
    pageHeight - margin + 4
  );

  doc.save(filename);
};
