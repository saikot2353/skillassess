import { Candidate, CandidateAssessmentStatus } from '../src/types';
import { DEMO_CANDIDATES } from '../src/services/demoData';

// Candidate Exit Process Indicator Logic (Matching Candidates.tsx implementation)
export const isCandidateCheckInCompleted = (c: Candidate): boolean => {
  return (
    c.supportStaffVerificationStatus === 'CONFIRMED' ||
    c.passportMatchConfirmed === true ||
    Boolean(c.supportStaffConfirmationDate) ||
    Boolean(c.supportStaffVerifiedAt)
  );
};

export const isCandidateEnrollmentCompleted = (c: Candidate): boolean => {
  if (c.enrollmentStatus === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY') return true;
  if (c.status === 'ENROLLED' || c.status === 'ENROLLMENT_VERIFY') return true;
  if (c.enrolledAt) return true;

  const downstreamStatuses: CandidateAssessmentStatus[] = [
    'CBT_EXAM_CONFIRMED',
    'IN_ASSESSMENT',
    'IN_PROGRESS',
    'PRACTICAL_COMPLETED',
    'EVALUATION_PENDING',
    'EVALUATED',
    'ASSESSMENT_COMPLETED',
    'RESULT_PENDING',
    'SUBMITTED',
    'LOCKED',
    'COMPLETED',
  ];
  if (downstreamStatuses.includes(c.status)) return true;
  if (c.cbtStatus === 'CONFIRMED' || c.cbtStatus === 'COMPLETED') return true;
  if (c.practicalStatus === 'COMPLETED' || c.practicalStatus === 'IN_PROGRESS') return true;

  return false;
};

export const isCandidatePracticalCompleted = (c: Candidate): boolean => {
  return (
    c.practicalStatus === 'COMPLETED' ||
    c.status === 'PRACTICAL_COMPLETED' ||
    Boolean(c.practicalConfirmationDate) ||
    Boolean(c.practicalConfirmedAt) ||
    c.evaluationStatus === 'COMPLETED' ||
    c.status === 'EVALUATED' ||
    c.status === 'ASSESSMENT_COMPLETED' ||
    c.status === 'COMPLETED'
  );
};

function runExitProcessIndicatorTests() {
  console.log('=== CANDIDATE EXIT LIST — PROCESS STATUS INDICATORS TEST ===\n');

  // 1. Verify candidate exit filtering
  const exitEligible = DEMO_CANDIDATES.filter(
    c => c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true
  );

  console.log(`Found ${exitEligible.length} candidates eligible for Candidate Exit List.`);
  if (exitEligible.length === 0) {
    throw new Error('No candidates found eligible for Candidate Exit List.');
  }

  // 2. Test specific candidates representing each required workflow stage permutation
  console.log('\n--- Test 1: Candidate 01 (✓ ✓ ✓ All Completed) ---');
  const cand01 = DEMO_CANDIDATES.find(c => c.id === 'can-bd-wh-1');
  if (!cand01) throw new Error('Candidate can-bd-wh-1 not found');
  const c1CheckIn = isCandidateCheckInCompleted(cand01);
  const c1Enroll = isCandidateEnrollmentCompleted(cand01);
  const c1Practical = isCandidatePracticalCompleted(cand01);
  console.log(`Candidate: ${cand01.fullNameEn} (${cand01.passportNumber})`);
  console.log(`1st Check-In: ${c1CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c1Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Practical:    ${c1Practical ? '✓' : '✕'} (Expected: ✓)`);
  if (!c1CheckIn || !c1Enroll || !c1Practical) {
    throw new Error('Candidate 01 failed status check');
  }
  console.log('[PASS] Candidate 01 satisfies ✓ ✓ ✓');

  console.log('\n--- Test 2: Candidate 02 (✓ ✓ ✕ Check-In & Enrollment ✓, Practical ✕) ---');
  const cand02 = DEMO_CANDIDATES.find(c => c.id === 'can-1');
  if (!cand02) throw new Error('Candidate can-1 not found');
  const c2CheckIn = isCandidateCheckInCompleted(cand02);
  const c2Enroll = isCandidateEnrollmentCompleted(cand02);
  const c2Practical = isCandidatePracticalCompleted(cand02);
  console.log(`Candidate: ${cand02.fullNameEn} (${cand02.passportNumber})`);
  console.log(`1st Check-In: ${c2CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c2Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Practical:    ${c2Practical ? '✓' : '✕'} (Expected: ✕)`);
  if (!c2CheckIn || !c2Enroll || c2Practical) {
    throw new Error('Candidate 02 failed status check');
  }
  console.log('[PASS] Candidate 02 satisfies ✓ ✓ ✕');

  console.log('\n--- Test 3: Candidate 03 (✓ ✕ ✕ Check-In ✓, Enrollment ✕, Practical ✕) ---');
  const cand03 = DEMO_CANDIDATES.find(c => c.id === 'can-9');
  if (!cand03) throw new Error('Candidate can-9 not found');
  const c3CheckIn = isCandidateCheckInCompleted(cand03);
  const c3Enroll = isCandidateEnrollmentCompleted(cand03);
  const c3Practical = isCandidatePracticalCompleted(cand03);
  console.log(`Candidate: ${cand03.fullNameEn} (${cand03.passportNumber})`);
  console.log(`1st Check-In: ${c3CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c3Enroll ? '✓' : '✕'} (Expected: ✕)`);
  console.log(`Practical:    ${c3Practical ? '✓' : '✕'} (Expected: ✕)`);
  if (!c3CheckIn || c3Enroll || c3Practical) {
    throw new Error('Candidate 03 failed status check');
  }
  console.log('[PASS] Candidate 03 satisfies ✓ ✕ ✕');

  console.log('\n--- Test 4: Candidate 04 (✓ ✓ ✕ Check-In & Enrollment ✓, Practical ✕, Exit Confirmed) ---');
  const cand04 = DEMO_CANDIDATES.find(c => c.id === 'can-2');
  if (!cand04) throw new Error('Candidate can-2 not found');
  const c4CheckIn = isCandidateCheckInCompleted(cand04);
  const c4Enroll = isCandidateEnrollmentCompleted(cand04);
  const c4Practical = isCandidatePracticalCompleted(cand04);
  console.log(`Candidate: ${cand04.fullNameEn} (${cand04.passportNumber})`);
  console.log(`1st Check-In: ${c4CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c4Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Practical:    ${c4Practical ? '✓' : '✕'} (Expected: ✕)`);
  console.log(`Exit Status:  ${cand04.exitStatus} (Confirmed)`);
  if (!c4CheckIn || !c4Enroll || c4Practical || cand04.exitStatus !== 'CONFIRMED') {
    throw new Error('Candidate 04 failed status check');
  }
  console.log('[PASS] Candidate 04 satisfies ✓ ✓ ✕ with Exit Confirmed');

  console.log('\n--- Test 5: Dynamic State Transition (Automatic Update) ---');
  // Simulate candidate 03 completing enrollment
  const updatedCand03: Candidate = {
    ...cand03,
    enrollmentStatus: 'ENROLLED',
    enrolledAt: new Date().toISOString()
  };
  if (!isCandidateEnrollmentCompleted(updatedCand03)) {
    throw new Error('Dynamic enrollment transition failed');
  }
  console.log('[PASS] Candidate 03 Enrollment dynamically transitions ✕ → ✓ upon enrollment confirmation');

  // Simulate candidate 02 completing practical assessment
  const updatedCand02: Candidate = {
    ...cand02,
    practicalStatus: 'COMPLETED',
    practicalConfirmedAt: new Date().toISOString()
  };
  if (!isCandidatePracticalCompleted(updatedCand02)) {
    throw new Error('Dynamic practical transition failed');
  }
  console.log('[PASS] Candidate 02 Practical dynamically transitions ✕ → ✓ upon practical confirmation');

  console.log('\n>>> ALL CANDIDATE EXIT PROCESS STATUS INDICATOR TESTS PASSED! <<<');
}

runExitProcessIndicatorTests();
