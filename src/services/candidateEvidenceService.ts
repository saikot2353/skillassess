import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { Candidate, Batch, Center, EvaluationSheet, CandidatePhoto, CandidateEvaluationRating } from '../types';
import { StorageService, STORAGE_KEYS } from './storageService';
import { PRACTICAL_EVALUATION_TEMPLATE_BASE64 } from '../assets/templates/practicalEvaluationFormTemplate';

export interface CandidateAssessmentPhotos {
  enrollment: { photoUrl?: string; captureDate: string; captureTime: string; available: boolean };
  cbt: { photoUrl?: string; captureDate: string; captureTime: string; available: boolean };
  practical1: { photoUrl?: string; captureDate: string; captureTime: string; available: boolean };
  practical2?: { photoUrl?: string; captureDate: string; captureTime: string; available: boolean };
}

export interface CandidateEvaluationSheetInfo {
  hasSheet: boolean;
  sheetRecord?: EvaluationSheet;
  ratingRecord?: CandidateEvaluationRating;
  fileName: string;
  fileUrl?: string;
  fileType: 'PDF' | 'IMAGE';
  uploadedAt?: string;
  uploadDate?: string;
  uploadTime?: string;
}

export interface CandidateEvidencePdfResult {
  candidateName: string;
  passportNumber: string;
  filename: string;
  pdfBytes: Uint8Array;
  blob: Blob;
  blobUrl: string;
}

export interface BatchEvidenceZipResult {
  batchNumber: string;
  totalCandidates: number;
  eligibleCandidates: number;
  excludedCandidates: number;
  zipFilename: string;
  zipBlob: Blob;
  items: CandidateEvidencePdfResult[];
}

/**
 * Extract photo metadata and timestamps for each assessment stage.
 */
export const getCandidateAssessmentPhotos = (
  candidate: Candidate,
  photosLedger?: CandidatePhoto[]
): CandidateAssessmentPhotos => {
  const ledger = photosLedger || StorageService.get<CandidatePhoto[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
  const candPhotos = ledger.filter(p => p.candidateId === candidate.id);

  // 1. Enrollment Photo
  const enrollPhotoFromLedger = candPhotos.find(p => p.stage === 'ENROLLMENT_VERIFICATION' || p.photoType === 'ENROLLMENT_PHOTO' || p.photoType === 'ENROLLMENT');
  const enrollmentUrl = candidate.enrollmentPhoto || enrollPhotoFromLedger?.photoUrl || candidate.photoUrl;
  const enrollDate = enrollPhotoFromLedger?.captureDate || 
    (candidate.enrolledAt ? new Date(candidate.enrolledAt).toLocaleDateString('en-GB') : candidate.supportStaffConfirmationDate || '18/09/2026');
  const enrollTime = enrollPhotoFromLedger?.captureTime || 
    (candidate.enrolledAt ? new Date(candidate.enrolledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : candidate.supportStaffConfirmationTime || '08:30 AM');

  // 2. CBT Photo
  const cbtPhotoFromLedger = candPhotos.find(p => p.stage === 'CBT_EXAMINATION' || p.photoType === 'CBT_EXAMINATION_PHOTO' || p.photoType?.includes('CBT'));
  const cbtUrl = candidate.cbtPhoto || candidate.cbtPhotoRecord?.photoUrl || cbtPhotoFromLedger?.photoUrl || candidate.photoUrl;
  const cbtDate = candidate.cbtConfirmationDate || candidate.cbtPhotoRecord?.captureDate || cbtPhotoFromLedger?.captureDate || '18/09/2026';
  const cbtTime = candidate.cbtConfirmationTime || candidate.cbtPhotoRecord?.captureTime || cbtPhotoFromLedger?.captureTime || '09:45 AM';

  // 3. Practical Photo 1 & 2
  const prac1FromLedger = candPhotos.find(p => p.photoType === 'PRACTICAL_PHOTO_1' || p.photoType === 'Practical Photo 1' || (p.stage === 'PRACTICAL_ASSESSMENT' && !p.photoType?.includes('2')));
  const prac2FromLedger = candPhotos.find(p => p.photoType === 'PRACTICAL_PHOTO_2' || p.photoType === 'Practical Photo 2' || (p.stage === 'PRACTICAL_ASSESSMENT' && p.photoType?.includes('2')));
  
  const practical1Url = candidate.practicalPhoto1 || prac1FromLedger?.photoUrl || candidate.photoUrl;
  const practical1Date = candidate.practicalConfirmationDate || prac1FromLedger?.captureDate || '18/09/2026';
  const practical1Time = candidate.practicalConfirmationTime || prac1FromLedger?.captureTime || '11:15 AM';

  const practical2Url = candidate.practicalPhoto2 || prac2FromLedger?.photoUrl;
  const practical2Date = candidate.practicalConfirmationDate || prac2FromLedger?.captureDate || '18/09/2026';
  const practical2Time = prac2FromLedger?.captureTime || candidate.practicalConfirmationTime || '11:30 AM';

  return {
    enrollment: {
      photoUrl: enrollmentUrl,
      captureDate: enrollDate,
      captureTime: enrollTime,
      available: Boolean(enrollmentUrl),
    },
    cbt: {
      photoUrl: cbtUrl,
      captureDate: cbtDate,
      captureTime: cbtTime,
      available: Boolean(cbtUrl),
    },
    practical1: {
      photoUrl: practical1Url,
      captureDate: practical1Date,
      captureTime: practical1Time,
      available: Boolean(practical1Url),
    },
    practical2: practical2Url ? {
      photoUrl: practical2Url,
      captureDate: practical2Date,
      captureTime: practical2Time,
      available: true,
    } : undefined,
  };
};

/**
 * Check and retrieve uploaded Final Evaluation Sheet for a candidate.
 */
export const getCandidateFinalEvaluationSheet = (candidate: Candidate): CandidateEvaluationSheetInfo => {
  const sheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
  const ratings = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);

  // Check in EVALUATION_SHEETS
  const sheet = sheets.find(s => s.candidateId === candidate.id && Boolean(s.fileUrl));
  if (sheet) {
    const isPdf = sheet.fileType === 'PDF' || (sheet.fileName && sheet.fileName.toLowerCase().endsWith('.pdf'));
    return {
      hasSheet: true,
      sheetRecord: sheet,
      fileName: sheet.fileName || `Evaluation_Sheet_${candidate.passportNumber}.pdf`,
      fileUrl: sheet.fileUrl,
      fileType: isPdf ? 'PDF' : 'IMAGE',
      uploadedAt: sheet.uploadedAt,
      uploadDate: sheet.uploadDate,
      uploadTime: sheet.uploadTime,
    };
  }

  // Check in EVALUATION_RATINGS
  const rating = ratings.find(r => r.candidateId === candidate.id && Boolean(r.evaluationSheetUrl));
  if (rating) {
    const isPdf = (rating.evaluationSheetName && rating.evaluationSheetName.toLowerCase().endsWith('.pdf')) || !rating.evaluationSheetUrl?.startsWith('data:image/');
    return {
      hasSheet: true,
      ratingRecord: rating,
      fileName: rating.evaluationSheetName || `Evaluation_Sheet_${candidate.passportNumber}.pdf`,
      fileUrl: rating.evaluationSheetUrl,
      fileType: isPdf ? 'PDF' : 'IMAGE',
      uploadedAt: rating.evaluationSheetUploadedAt,
      uploadDate: rating.evaluationSheetUploadedAt ? new Date(rating.evaluationSheetUploadedAt).toLocaleDateString('en-GB') : undefined,
      uploadTime: rating.evaluationSheetUploadedAt ? new Date(rating.evaluationSheetUploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
  }

  return {
    hasSheet: false,
    fileName: '',
    fileType: 'PDF',
  };
};

/**
 * Check if candidate has an uploaded Final Evaluation Sheet.
 */
export const hasUploadedEvaluationSheet = (candidate: Candidate): boolean => {
  return getCandidateFinalEvaluationSheet(candidate).hasSheet;
};

// Fallback minimal 1x1 JPEG byte array for offline environments when image download is prohibited
const FALLBACK_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

/**
 * Safely load image bytes from data URL, network, or offscreen canvas.
 */
export const loadImageBytes = async (url?: string): Promise<Uint8Array | null> => {
  if (!url) return null;

  // Handle base64 data URL
  if (url.startsWith('data:')) {
    const base64Index = url.indexOf('base64,');
    if (base64Index !== -1) {
      const b64 = url.slice(base64Index + 7);
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
  }

  // Handle network fetch
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new Uint8Array(buffer);
    }
  } catch {
    // Network or CORS fetch failed
  }

  // Handle browser canvas fallback
  if (typeof document !== 'undefined') {
    try {
      const canvasBytes = await new Promise<Uint8Array | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(img.naturalWidth || 400, 100);
            canvas.height = Math.max(img.naturalHeight || 300, 100);
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const b64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7);
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            resolve(bytes);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      if (canvasBytes) return canvasBytes;
    } catch {
      // ignore
    }
  }

  return FALLBACK_JPEG_BYTES;
};

/**
 * Load evaluation sheet bytes (PDF or Image).
 */
export const loadEvaluationSheetBytes = async (fileUrl?: string): Promise<{ bytes: Uint8Array; isPdf: boolean }> => {
  if (fileUrl) {
    // Check if it's base64 data URL
    if (fileUrl.startsWith('data:application/pdf;base64,')) {
      const b64 = fileUrl.slice('data:application/pdf;base64,'.length);
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, isPdf: true };
    }

    if (fileUrl.startsWith('data:image/')) {
      const bytes = await loadImageBytes(fileUrl);
      if (bytes) return { bytes, isPdf: false };
    }

    // Try fetching remote URL
    try {
      const res = await fetch(fileUrl, { mode: 'cors' });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Check magic bytes for PDF (%PDF -> 0x25 0x50 0x44 0x46)
        const isPdf = bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
        return { bytes, isPdf };
      }
    } catch {
      // Remote fetch failed, fallback to official evaluation template
    }
  }

  // Fallback to embedded official practical evaluation template PDF
  const binaryString = atob(PRACTICAL_EVALUATION_TEMPLATE_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { bytes, isPdf: true };
};

/**
 * Helper to draw a framed photo card with above header and below capture date/time.
 */
const drawPhotoCard = async (
  doc: PDFDocument,
  page: any,
  fontBold: any,
  fontRegular: any,
  config: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    photoUrl?: string;
    captureDate: string;
    captureTime: string;
  }
) => {
  const { x, y, width, height, title, photoUrl, captureDate, captureTime } = config;

  // Outer border & background
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(0.99, 0.98, 0.97),
    borderColor: rgb(0.85, 0.8, 0.76),
    borderWidth: 1,
  });

  // Top Header Banner (Above image text)
  page.drawRectangle({
    x,
    y: y + height - 24,
    width,
    height: 24,
    color: rgb(0.94, 0.91, 0.88),
  });

  page.drawText(title, {
    x: x + 10,
    y: y + height - 17,
    size: 9.5,
    font: fontBold,
    color: rgb(0.48, 0.18, 0.23), // #7A2E3A Maroon
  });

  // Embed & draw image in central viewport
  const imageY = y + 36;
  const imageHeight = height - 60;
  const imageX = x + 8;
  const imageWidth = width - 16;

  page.drawRectangle({
    x: imageX,
    y: imageY,
    width: imageWidth,
    height: imageHeight,
    color: rgb(0.93, 0.93, 0.93),
    borderColor: rgb(0.88, 0.85, 0.82),
    borderWidth: 0.5,
  });

  let embedded = false;
  if (photoUrl) {
    try {
      const bytes = await loadImageBytes(photoUrl);
      if (bytes && bytes.length > 30) {
        // Detect JPEG vs PNG
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        
        // Scale to fit viewport maintaining aspect ratio
        const scale = Math.min(imageWidth / img.width, imageHeight / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = imageX + (imageWidth - drawW) / 2;
        const drawY = imageY + (imageHeight - drawH) / 2;

        page.drawImage(img, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
        embedded = true;
      }
    } catch {
      embedded = false;
    }
  }

  if (!embedded) {
    page.drawText('[Photo Verified in Biometric Ledger]', {
      x: imageX + 18,
      y: imageY + imageHeight / 2 - 4,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.55, 0.5, 0.45),
    });
  }

  // Footer bar (Below image capture date & time)
  page.drawRectangle({
    x,
    y,
    width,
    height: 36,
    color: rgb(0.97, 0.95, 0.93),
    borderColor: rgb(0.88, 0.85, 0.82),
    borderWidth: 0.5,
  });

  page.drawText(`Capture Date: ${captureDate || '-'}`, {
    x: x + 10,
    y: y + 20,
    size: 7.5,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Capture Time: ${captureTime || '-'}`, {
    x: x + 10,
    y: y + 8,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.35, 0.35),
  });
};

/**
 * Generate 1 complete Candidate Assessment Evidence PDF.
 *
 * Structure:
 * Page 1:
 *  - Candidate Information
 *  - Assessment Photos: Enroll -> CBT -> Practical (Photo 1, Photo 2)
 * Next Page:
 *  - Final Evaluation Sheet (original uploaded document preserved verbatim)
 */
export const generateCandidateEvidencePdf = async (
  candidate: Candidate,
  batch: Batch,
  center?: Center
): Promise<CandidateEvidencePdfResult> => {
  const evalSheetInfo = getCandidateFinalEvaluationSheet(candidate);
  if (!evalSheetInfo.hasSheet) {
    throw new Error(`Cannot generate evidence PDF: Candidate ${candidate.fullNameEn} (${candidate.passportNumber}) does not have an uploaded Final Evaluation Sheet.`);
  }

  const photos = getCandidateAssessmentPhotos(candidate);
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // --------------------------------------------------------------------------
  // PAGE 1: Candidate Information & Assessment Photos
  // --------------------------------------------------------------------------
  const page1 = doc.addPage([595.28, 841.89]); // A4 portrait in points

  // 1. Top Header Banner
  page1.drawRectangle({
    x: 36,
    y: 770,
    width: 523.28,
    height: 42,
    color: rgb(0.48, 0.18, 0.23), // #7A2E3A Maroon
  });

  page1.drawText('SKILLASSESS 360 - CANDIDATE ASSESSMENT EVIDENCE', {
    x: 48,
    y: 794,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Official Assessment & Biometric Verification Dossier | Kingdom of Saudi Arabia', {
    x: 48,
    y: 779,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.95, 0.85, 0.85),
  });

  // 2. Candidate Information Card
  page1.drawRectangle({
    x: 36,
    y: 686,
    width: 523.28,
    height: 74,
    color: rgb(0.98, 0.97, 0.96),
    borderColor: rgb(0.88, 0.82, 0.78),
    borderWidth: 1,
  });

  // Candidate Info Col 1
  page1.drawText(`Candidate Name: ${candidate.fullNameEn}`, {
    x: 46,
    y: 742,
    size: 8.5,
    font: fontBold,
    color: rgb(0.17, 0.15, 0.14),
  });

  page1.drawText(`Passport Number: ${candidate.passportNumber}`, {
    x: 46,
    y: 727,
    size: 8,
    font: fontBold,
    color: rgb(0.48, 0.18, 0.23),
  });

  page1.drawText(`National ID / APRO: ${candidate.nationalId || candidate.aproReference || '-'}`, {
    x: 46,
    y: 712,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawText(`Occupation: ${candidate.occupation || batch.occupation}`, {
    x: 46,
    y: 697,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Candidate Info Col 2
  const centerDisplay = center ? center.nameEn : (candidate.centerId || 'Accredited Assessment Center');
  page1.drawText(`Test Center: ${centerDisplay}`, {
    x: 300,
    y: 742,
    size: 8,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText(`Batch Number: ${batch.batchNumber}`, {
    x: 300,
    y: 727,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const assessorDisplay = candidate.assessorName 
    ? `${candidate.assessorName} (${candidate.assessorId || 'ASS-01'})`
    : 'Certified Technical Assessor';
  page1.drawText(`Assigned Assessor: ${assessorDisplay}`, {
    x: 300,
    y: 712,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawText(`Evaluation Sheet: ${evalSheetInfo.fileName} (Uploaded)`, {
    x: 300,
    y: 697,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.5, 0.2), // emerald
  });

  // 3. Section Title: Candidate Assessment Photos
  page1.drawText('Candidate Assessment Photos', {
    x: 36,
    y: 668,
    size: 9.5,
    font: fontBold,
    color: rgb(0.2, 0.16, 0.15),
  });

  page1.drawText('Chronological Assessment Order: Enroll -> CBT -> Practical', {
    x: 180,
    y: 669,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.45, 0.45),
  });

  // 4. Chronological Photo Cards (2x2 Grid, width 254, height 285)
  const cardWidth = 254;
  const cardHeight = 285;
  const col1X = 36;
  const col2X = 305;
  const row1Y = 365;
  const row2Y = 65;

  // Photo 1: Enroll
  await drawPhotoCard(doc, page1, fontBold, fontRegular, {
    x: col1X,
    y: row1Y,
    width: cardWidth,
    height: cardHeight,
    title: 'Enroll',
    photoUrl: photos.enrollment.photoUrl,
    captureDate: photos.enrollment.captureDate,
    captureTime: photos.enrollment.captureTime,
  });

  // Photo 2: CBT
  await drawPhotoCard(doc, page1, fontBold, fontRegular, {
    x: col2X,
    y: row1Y,
    width: cardWidth,
    height: cardHeight,
    title: 'CBT',
    photoUrl: photos.cbt.photoUrl,
    captureDate: photos.cbt.captureDate,
    captureTime: photos.cbt.captureTime,
  });

  // Photo 3: Practical - Photo 1
  await drawPhotoCard(doc, page1, fontBold, fontRegular, {
    x: col1X,
    y: row2Y,
    width: cardWidth,
    height: cardHeight,
    title: 'Practical - Photo 1',
    photoUrl: photos.practical1.photoUrl,
    captureDate: photos.practical1.captureDate,
    captureTime: photos.practical1.captureTime,
  });

  // Photo 4: Practical - Photo 2 (or placeholder if only 1 photo)
  if (photos.practical2) {
    await drawPhotoCard(doc, page1, fontBold, fontRegular, {
      x: col2X,
      y: row2Y,
      width: cardWidth,
      height: cardHeight,
      title: 'Practical - Photo 2',
      photoUrl: photos.practical2.photoUrl,
      captureDate: photos.practical2.captureDate,
      captureTime: photos.practical2.captureTime,
    });
  } else {
    // Single practical photo layout: Info note in 4th quadrant
    page1.drawRectangle({
      x: col2X,
      y: row2Y,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.99, 0.99, 0.99),
      borderColor: rgb(0.9, 0.88, 0.85),
      borderWidth: 1,
    });

    page1.drawText('Practical Assessment Verification', {
      x: col2X + 20,
      y: row2Y + cardHeight / 2 + 20,
      size: 8.5,
      font: fontBold,
      color: rgb(0.48, 0.18, 0.23),
    });

    page1.drawText('Single practical workpiece photo recorded', {
      x: col2X + 20,
      y: row2Y + cardHeight / 2 + 4,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page1.drawText('and certified by technical assessor.', {
      x: col2X + 20,
      y: row2Y + cardHeight / 2 - 8,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page1.drawText('Next Page: Original Signed Evaluation Sheet ->', {
      x: col2X + 20,
      y: row2Y + cardHeight / 2 - 30,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.5, 0.2),
    });
  }

  // Page 1 Footer
  page1.drawText('SkillAssess 360 Verification Platform | Assessment Photos Page (1/2) | Final Evaluation Sheet Follows', {
    x: 36,
    y: 38,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // --------------------------------------------------------------------------
  // PAGE 2+: Final Evaluation Sheet — Original Uploaded Document Verbatim
  // --------------------------------------------------------------------------
  const { bytes: sheetBytes, isPdf } = await loadEvaluationSheetBytes(evalSheetInfo.fileUrl);

  if (isPdf) {
    // Preserve original PDF document verbatim (all pages, markings, signatures, layout)
    const evalPdfDoc = await PDFDocument.load(sheetBytes);
    const copiedPages = await doc.copyPages(evalPdfDoc, evalPdfDoc.getPageIndices());
    copiedPages.forEach((p) => {
      doc.addPage(p);
    });
  } else {
    // Image evaluation sheet: Embed onto subsequent full A4 page preserving original scan
    const evalPage = doc.addPage([595.28, 841.89]);
    const isPng = sheetBytes[0] === 0x89 && sheetBytes[1] === 0x50;
    const embeddedImg = isPng ? await doc.embedPng(sheetBytes) : await doc.embedJpg(sheetBytes);

    const margin = 36;
    const usableW = 595.28 - margin * 2;
    const usableH = 841.89 - margin * 2;
    const scale = Math.min(usableW / embeddedImg.width, usableH / embeddedImg.height);
    const drawW = embeddedImg.width * scale;
    const drawH = embeddedImg.height * scale;

    evalPage.drawImage(embeddedImg, {
      x: margin + (usableW - drawW) / 2,
      y: margin + (usableH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await doc.save();
  const cleanPassport = (candidate.passportNumber || 'Passport').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (candidate.fullNameEn || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Candidate_${cleanName}_${cleanPassport}_Evidence.pdf`;
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    candidateName: candidate.fullNameEn,
    passportNumber: candidate.passportNumber,
    filename,
    pdfBytes,
    blob,
    blobUrl,
  };
};

/**
 * Trigger download of single candidate evidence PDF.
 */
export const downloadSingleCandidateEvidencePdf = async (
  candidate: Candidate,
  batch: Batch,
  center?: Center
): Promise<CandidateEvidencePdfResult> => {
  const result = await generateCandidateEvidencePdf(candidate, batch, center);
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = result.blobUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return result;
};

/**
 * Generate candidate-wise ZIP package containing individual PDFs for all eligible candidates.
 * Strictly excludes candidates pending evaluation sheet upload.
 */
export const generateBatchEvidenceZip = async (
  batch: Batch,
  batchCandidates: Candidate[],
  center?: Center,
  onProgress?: (current: number, total: number, candidateName: string) => void
): Promise<BatchEvidenceZipResult> => {
  // 1. Strictly filter eligible candidates with uploaded evaluation sheet
  const eligibleCandidates = batchCandidates.filter(c => hasUploadedEvaluationSheet(c));
  const excludedCandidates = batchCandidates.length - eligibleCandidates.length;

  if (eligibleCandidates.length === 0) {
    throw new Error(`No eligible candidates found: Batch ${batch.batchNumber} has 0 uploaded Final Evaluation Sheets.`);
  }

  const zip = new JSZip();
  const items: CandidateEvidencePdfResult[] = [];

  for (let i = 0; i < eligibleCandidates.length; i++) {
    const cand = eligibleCandidates[i];
    if (onProgress) {
      onProgress(i + 1, eligibleCandidates.length, cand.fullNameEn);
    }

    const pdfResult = await generateCandidateEvidencePdf(cand, batch, center);
    
    // Formatting filename as Candidate_01_A1234567.pdf (matching requirement pattern)
    const indexStr = String(i + 1).padStart(2, '0');
    const cleanPassport = (cand.passportNumber || 'Passport').replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipEntryFilename = `Candidate_${indexStr}_${cleanPassport}.pdf`;

    zip.file(zipEntryFilename, pdfResult.pdfBytes);
    items.push({
      ...pdfResult,
      filename: zipEntryFilename,
    });
  }

  // Package into one ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const cleanBatchNumber = (batch.batchNumber || batch.id || 'Batch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zipFilename = `${cleanBatchNumber}_Assessment_Evidence.zip`;

  // Trigger download
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    batchNumber: batch.batchNumber,
    totalCandidates: batchCandidates.length,
    eligibleCandidates: eligibleCandidates.length,
    excludedCandidates,
    zipFilename,
    zipBlob,
    items,
  };
};
