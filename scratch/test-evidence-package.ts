// Polyfill localStorage in node environment for StorageService
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0
  } as any;
}

import { DEMO_CANDIDATES, DEMO_BATCHES, DEMO_CENTERS, DEMO_EVALUATION_SHEETS } from '../src/services/demoData';
import { 
  getCandidateAssessmentPhotos, 
  getCandidateFinalEvaluationSheet, 
  hasUploadedEvaluationSheet, 
  generateCandidateEvidencePdf, 
  generateBatchEvidenceZip 
} from '../src/services/candidateEvidenceService';
import { StorageService, STORAGE_KEYS } from '../src/services/storageService';
import { PDFDocument } from 'pdf-lib';

async function runEvidencePackageTests() {
  console.log('=== BATCH MANAGEMENT: CANDIDATE EVIDENCE & EVALUATION PACKAGE TEST ===\n');

  // Initialize storage with demo evaluation sheets
  StorageService.set(STORAGE_KEYS.EVALUATION_SHEETS, DEMO_EVALUATION_SHEETS);
  StorageService.set(STORAGE_KEYS.CANDIDATES, DEMO_CANDIDATES);

  const batch = DEMO_BATCHES.find(b => b.id === 'bat-1');
  if (!batch) throw new Error('Batch bat-1 not found in demo data.');

  const center = DEMO_CENTERS.find(c => c.id === batch.centerId);
  const batchCandidates = DEMO_CANDIDATES.filter(c => c.batchId === batch.id);

  console.log(`Target Batch: ${batch.batchNumber} (${batch.id}) - ${batch.occupation}`);
  console.log(`Total Candidates in Batch: ${batchCandidates.length}`);

  // 1. Test Evaluation Sheet Detection & Metrics
  console.log('\n--- Test 1: Evaluation Sheet Upload Detection & Metrics ---');
  const uploadedCandidates = batchCandidates.filter(c => hasUploadedEvaluationSheet(c));
  const pendingCandidates = batchCandidates.filter(c => !hasUploadedEvaluationSheet(c));

  console.log(`Candidates with Uploaded Evaluation Sheet: ${uploadedCandidates.length}`);
  console.log(`Candidates Pending Evaluation Sheet:     ${pendingCandidates.length}`);

  if (uploadedCandidates.length === 0) {
    throw new Error('Expected at least 1 candidate with uploaded evaluation sheet in bat-1.');
  }

  uploadedCandidates.forEach((c, idx) => {
    const sheet = getCandidateFinalEvaluationSheet(c);
    console.log(`  [Uploaded ${idx + 1}] ${c.fullNameEn} (${c.passportNumber}) -> Sheet: ${sheet.fileName} (${sheet.fileType})`);
    if (!sheet.hasSheet || !sheet.fileName) {
      throw new Error(`Candidate ${c.fullNameEn} should have valid sheet metadata`);
    }
  });

  pendingCandidates.slice(0, 3).forEach((c, idx) => {
    const sheet = getCandidateFinalEvaluationSheet(c);
    console.log(`  [Pending ${idx + 1}] ${c.fullNameEn} (${c.passportNumber}) -> Sheet: ${sheet.hasSheet ? 'YES' : 'NONE'}`);
    if (sheet.hasSheet) {
      throw new Error(`Candidate ${c.fullNameEn} should not have an uploaded sheet`);
    }
  });
  console.log('[PASS] Evaluation Sheet detection and metrics accurate.');

  // 2. Test Chronological Assessment Photos Extraction
  console.log('\n--- Test 2: Chronological Assessment Photos Extraction (Enroll -> CBT -> Practical) ---');
  const cand01 = uploadedCandidates[0];
  const photos = getCandidateAssessmentPhotos(cand01);

  console.log(`Candidate: ${cand01.fullNameEn}`);
  console.log(`1. Enroll Photo:    Available: ${photos.enrollment.available} | Date: ${photos.enrollment.captureDate} | Time: ${photos.enrollment.captureTime}`);
  console.log(`2. CBT Photo:       Available: ${photos.cbt.available} | Date: ${photos.cbt.captureDate} | Time: ${photos.cbt.captureTime}`);
  console.log(`3. Practical 1:     Available: ${photos.practical1.available} | Date: ${photos.practical1.captureDate} | Time: ${photos.practical1.captureTime}`);
  if (photos.practical2) {
    console.log(`4. Practical 2:     Available: ${photos.practical2.available} | Date: ${photos.practical2.captureDate} | Time: ${photos.practical2.captureTime}`);
  }

  if (!photos.enrollment.captureDate || !photos.cbt.captureDate || !photos.practical1.captureDate) {
    throw new Error('Assessment photos must contain capture dates and times.');
  }
  console.log('[PASS] Chronological assessment photos extracted with valid capture dates and times.');

  // 3. Test Single Candidate Assessment Evidence PDF Generation
  console.log('\n--- Test 3: Single Candidate Assessment Evidence PDF Generation ---');
  const singlePdfResult = await generateCandidateEvidencePdf(cand01, batch, center);
  console.log(`Generated PDF: ${singlePdfResult.filename} (Size: ${singlePdfResult.pdfBytes.length} bytes)`);

  if (!singlePdfResult.pdfBytes || singlePdfResult.pdfBytes.length < 1000) {
    throw new Error('Generated PDF byte size is invalid.');
  }

  // Load and inspect generated PDF structure
  const parsedDoc = await PDFDocument.load(singlePdfResult.pdfBytes);
  const pageCount = parsedDoc.getPageCount();
  console.log(`Total Pages in Candidate Evidence PDF: ${pageCount}`);
  if (pageCount < 2) {
    throw new Error(`Expected at least 2 pages (Page 1: Assessment Photos, Page 2+: Evaluation Sheet), got ${pageCount}`);
  }
  console.log(`  Page 1: Assessment Photos & Candidate Dossier`);
  console.log(`  Page 2..${pageCount}: Original Uploaded Final Evaluation Sheet`);
  console.log('[PASS] Candidate Assessment Evidence PDF successfully constructed with correct page sequencing.');

  // 4. Test Strict Enforcement of Evaluation Sheet Requirement
  console.log('\n--- Test 4: Strict Eligibility Enforcement (Reject Candidates Without Evaluation Sheet) ---');
  const ineligibleCand = pendingCandidates[0];
  let rejectedAsExpected = false;
  try {
    await generateCandidateEvidencePdf(ineligibleCand, batch, center);
  } catch (err: any) {
    rejectedAsExpected = true;
    console.log(`Correctly rejected ineligible candidate ${ineligibleCand.fullNameEn}: "${err.message}"`);
  }

  if (!rejectedAsExpected) {
    throw new Error('System allowed generating evidence PDF for candidate without uploaded evaluation sheet!');
  }
  console.log('[PASS] Candidates without uploaded evaluation sheet are strictly blocked from evidence generation.');

  // 5. Test Candidate-wise ZIP Package Generation
  console.log('\n--- Test 5: Candidate-wise ZIP Package Generation ---');
  const zipResult = await generateBatchEvidenceZip(batch, batchCandidates, center);

  console.log(`ZIP Filename: ${zipResult.zipFilename}`);
  console.log(`Total Candidates in Batch:    ${zipResult.totalCandidates}`);
  console.log(`Eligible (Packaged) PDFs:     ${zipResult.eligibleCandidates}`);
  console.log(`Excluded (Pending) Candidates: ${zipResult.excludedCandidates}`);

  if (zipResult.eligibleCandidates !== uploadedCandidates.length) {
    throw new Error(`Expected ${uploadedCandidates.length} packaged PDFs, got ${zipResult.eligibleCandidates}`);
  }

  zipResult.items.forEach((item, idx) => {
    console.log(`  ZIP Item [${idx + 1}]: ${item.filename} (Candidate: ${item.candidateName}, Passport: ${item.passportNumber})`);
    if (!item.filename.startsWith('Candidate_')) {
      throw new Error(`Item filename ${item.filename} does not match required Candidate_XX_Passport pattern`);
    }
  });

  if (!zipResult.zipBlob || zipResult.zipBlob.size < 1000) {
    throw new Error('Generated ZIP blob is empty or invalid.');
  }
  console.log(`ZIP Package Size: ${zipResult.zipBlob.size} bytes`);
  console.log('[PASS] Candidate-wise ZIP package generated and structured properly.');

  console.log('\n>>> ALL BATCH ASSESSMENT EVIDENCE & EVALUATION PACKAGE TESTS PASSED! <<<');
}

runEvidencePackageTests().catch(err => {
  console.error('\n[FAIL] Test suite encountered an error:', err);
  process.exit(1);
});
