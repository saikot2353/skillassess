import fs from 'fs';
import path from 'path';

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

import { OcrService } from '../src/services/ocrService';
import { Candidate, User } from '../src/types';
import { SVP_L1_EVALUATION_RUBRIC, SVP_L1_OVERALL_QUESTIONS } from '../src/services/demoData';

async function runTests() {
  console.log('--- Starting OCR Auto-Fill Rating Verification ---');

  const pdfPath = 'C:/Users/ruhul/.gemini/antigravity/brain/4daea0c2-dddc-4b90-9ef6-eaa26f13c1d6/.user_uploaded/media_1789825180829.pdf';
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found at ${pdfPath}`);
  }

  const pdfBuffer = fs.readFileSync(pdfPath);

  const mockCandidate: Candidate = {
    id: 'can-bd-1',
    applicationNumber: 'APP-2026-091',
    passportNumber: 'A21891481',
    fullNameEn: 'MOHAMMAD SHAHED MIAH',
    fullNameAr: 'محمد شاهد ميا',
    nationality: 'Bangladeshi',
    dateOfBirth: '1992-05-15',
    gender: 'MALE',
    occupation: 'Warehouse Worker',
    centerId: 'ctr-bd-1',
    batchId: 'bat-5',
    status: 'PRACTICAL_COMPLETED',
    practicalStatus: 'COMPLETED',
    assessorId: 'usr-15',
    assessorName: 'Kamal Hossain',
    assignedTaskId: 'tsk-01',
    taskNumber: 1,
    assignedTaskTitle: 'Task 01 - Practical Assessment',
    taskDifficulty: 'Moderate',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z'
  };

  const mockAssessor: User = {
    id: 'usr-15',
    username: 'kamal.hossain',
    name: 'Kamal Hossain',
    role: 'ASSESSOR',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  };

  // Run OCR processing
  const result = await OcrService.processEvaluationSheetOcr(
    pdfBuffer,
    'SVP_Evaluation_Sheet_A21891481.pdf',
    mockCandidate,
    mockAssessor
  );

  console.log('OCR Result Success:', result.success);
  console.log('Evaluation Number:', result.extractedData.evaluationNumber);
  console.log('Candidate Name Matched:', result.validation.candidateMatched, result.extractedData.candidateName);
  console.log('Passport Matched:', result.validation.passportMatched, result.extractedData.passportNumber);
  console.log('Assessor Matched:', result.validation.assessorMatched, result.extractedData.assessorName);
  console.log('Difficulty:', result.extractedData.difficulty);

  // Verify Required Ratings mapping
  const expectedRubricRatings: Record<string, number> = {
    // Problem Understanding & Demo Process Flow
    'svp-p-q1': 3,
    'svp-p-q2': 4,
    'svp-p-q3': 2,
    'svp-p-q4': 3,
    'svp-p-q5': 4,
    // Safety
    'svp-s-q1': 4,
    'svp-s-q2': 3,
    'svp-s-q3': 4,
    'svp-s-q4': 5,
    // Tools & Equipment
    'svp-t-q1': 3,
    'svp-t-q2': 4,
    // Hygiene & Cleanliness
    'svp-h-q1': 4,
    'svp-h-q2': 5
  };

  const expectedOverallRatings: Record<string, number> = {
    'ov-1': 8,
    'ov-2': 8,
    'ov-3': 9
  };

  console.log('\n--- Checking Canonical Rubric Ratings (0-5 scale) ---');
  let rubricPassed = true;
  for (const [qId, expectedVal] of Object.entries(expectedRubricRatings)) {
    const actualVal = result.extractedData.rubricRatings[qId];
    const match = actualVal === expectedVal;
    if (!match) rubricPassed = false;
    console.log(`[${match ? 'PASS' : 'FAIL'}] ${qId}: expected ${expectedVal}, got ${actualVal}`);
  }

  console.log('\n--- Checking Canonical Overall Ratings (0-10 scale) ---');
  let overallPassed = true;
  for (const [qId, expectedVal] of Object.entries(expectedOverallRatings)) {
    const actualVal = result.extractedData.overallRatings[qId];
    const match = actualVal === expectedVal;
    if (!match) overallPassed = false;
    console.log(`[${match ? 'PASS' : 'FAIL'}] ${qId}: expected ${expectedVal}, got ${actualVal}`);
  }

  console.log('\n--- Checking Aliases for backward compatibility ---');
  const aliasChecks: Record<string, number> = {
    'sec1-q1': 3, 'sec1-q2': 4, 'sec1-q3': 2, 'sec1-q4': 3, 'sec1-q5': 4,
    'sec2-q1': 4, 'sec2-q2': 3, 'sec2-q3': 4, 'sec2-q4': 5,
    'sec3-q1': 3, 'sec3-q2': 4,
    'sec4-q1': 4, 'sec4-q2': 5,
    'overall-q1': 8, 'overall-q2': 8, 'overall-q3': 9
  };
  let aliasPassed = true;
  for (const [key, val] of Object.entries(aliasChecks)) {
    const actual = key.startsWith('overall') 
      ? result.extractedData.overallRatings[key] 
      : result.extractedData.rubricRatings[key];
    const match = actual === val;
    if (!match) aliasPassed = false;
  }
  console.log(`[${aliasPassed ? 'PASS' : 'FAIL'}] All 16 aliases mapped correctly.`);

  console.log('\n--- Simulating Form State & Scoring ---');
  const formRubricScores = { ...result.extractedData.rubricRatings };
  const formOverallScores = { ...result.extractedData.overallRatings };

  let totalRubricScore = 0;
  let totalRubricMax = 0;
  SVP_L1_EVALUATION_RUBRIC.forEach(sec => {
    sec.questions.forEach(q => {
      const s = formRubricScores[q.id];
      totalRubricScore += s;
      totalRubricMax += q.maxScore;
    });
  });

  let totalOverallScore = 0;
  let totalOverallMax = 0;
  SVP_L1_OVERALL_QUESTIONS.forEach(q => {
    const s = formOverallScores[q.id];
    totalOverallScore += s;
    totalOverallMax += q.maxScore;
  });

  const combinedTotal = totalRubricScore + totalOverallScore;
  const combinedMax = totalRubricMax + totalOverallMax;
  const percentage = Math.round((combinedTotal / combinedMax) * 100);

  console.log(`Rubric Total: ${totalRubricScore} / ${totalRubricMax} (Expected: 48 / 65)`);
  console.log(`Overall Total: ${totalOverallScore} / ${totalOverallMax} (Expected: 25 / 30)`);
  console.log(`Combined Total: ${combinedTotal} / ${combinedMax} (${percentage}%) (Expected: 73 / 95 - 77%)`);

  const scoringPassed = totalRubricScore === 48 && totalOverallScore === 25 && combinedTotal === 73;

  if (rubricPassed && overallPassed && aliasPassed && scoringPassed) {
    console.log('\n>>> ALL 16 RATINGS AUTOMATICALLY POPULATED & VERIFIED SUCCESSFULLY! <<<');
  } else {
    throw new Error('Some rating checks failed.');
  }
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
