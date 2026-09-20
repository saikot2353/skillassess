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

export const isCandidateCbtCompleted = (c: Candidate): boolean => {
  return (
    c.cbtStatus === 'CONFIRMED' ||
    c.cbtStatus === 'COMPLETED' ||
    c.status === 'CBT_EXAM_CONFIRMED' ||
    Boolean(c.cbtConfirmationDate) ||
    Boolean(c.cbtConfirmedAt)
  );
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

  // 2. Test specific candidates representing each required workflow stage permutation from prompt:
  // | Candidate    | 1st Check-In | Enrollment | CBT | Practical Assessment |
  // | Candidate 01 |            ✓ |          ✓ |   ✓ |                    ✓ |
  // | Candidate 02 |            ✓ |          ✓ |   ✓ |                    ✕ |
  // | Candidate 03 |            ✓ |          ✓ |   ✕ |                    ✕ |
  // | Candidate 04 |            ✓ |          ✕ |   ✕ |                    ✕ |

  console.log('\n--- Test 1: Candidate 01 (✓ ✓ ✓ ✓ All Completed) ---');
  const cand01 = DEMO_CANDIDATES.find(c => c.id === 'can-bd-wh-1');
  if (!cand01) throw new Error('Candidate can-bd-wh-1 not found');
  const c1CheckIn = isCandidateCheckInCompleted(cand01);
  const c1Enroll = isCandidateEnrollmentCompleted(cand01);
  const c1Cbt = isCandidateCbtCompleted(cand01);
  const c1Practical = isCandidatePracticalCompleted(cand01);
  console.log(`Candidate: ${cand01.fullNameEn} (${cand01.passportNumber})`);
  console.log(`1st Check-In: ${c1CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c1Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`CBT:          ${c1Cbt ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Practical:    ${c1Practical ? '✓' : '✕'} (Expected: ✓)`);
  if (!c1CheckIn || !c1Enroll || !c1Cbt || !c1Practical) {
    throw new Error('Candidate 01 failed status check');
  }
  console.log('[PASS] Candidate 01 satisfies ✓ ✓ ✓ ✓');

  console.log('\n--- Test 2: Candidate 02 (✓ ✓ ✓ ✕ Check-In, Enrollment & CBT ✓, Practical ✕) ---');
  const cand02 = DEMO_CANDIDATES.find(c => c.id === 'can-1');
  if (!cand02) throw new Error('Candidate can-1 not found');
  const c2CheckIn = isCandidateCheckInCompleted(cand02);
  const c2Enroll = isCandidateEnrollmentCompleted(cand02);
  const c2Cbt = isCandidateCbtCompleted(cand02);
  const c2Practical = isCandidatePracticalCompleted(cand02);
  console.log(`Candidate: ${cand02.fullNameEn} (${cand02.passportNumber})`);
  console.log(`1st Check-In: ${c2CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c2Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`CBT:          ${c2Cbt ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Practical:    ${c2Practical ? '✓' : '✕'} (Expected: ✕)`);
  if (!c2CheckIn || !c2Enroll || !c2Cbt || c2Practical) {
    throw new Error('Candidate 02 failed status check');
  }
  console.log('[PASS] Candidate 02 satisfies ✓ ✓ ✓ ✕');

  console.log('\n--- Test 3: Candidate 03 (✓ ✓ ✕ ✕ Check-In & Enrollment ✓, CBT ✕, Practical ✕) ---');
  const cand03 = DEMO_CANDIDATES.find(c => c.id === 'can-cbt-ryd-1');
  if (!cand03) throw new Error('Candidate can-cbt-ryd-1 not found');
  const c3CheckIn = isCandidateCheckInCompleted(cand03);
  const c3Enroll = isCandidateEnrollmentCompleted(cand03);
  const c3Cbt = isCandidateCbtCompleted(cand03);
  const c3Practical = isCandidatePracticalCompleted(cand03);
  console.log(`Candidate: ${cand03.fullNameEn} (${cand03.passportNumber})`);
  console.log(`1st Check-In: ${c3CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c3Enroll ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`CBT:          ${c3Cbt ? '✓' : '✕'} (Expected: ✕)`);
  console.log(`Practical:    ${c3Practical ? '✓' : '✕'} (Expected: ✕)`);
  if (!c3CheckIn || !c3Enroll || c3Cbt || c3Practical) {
    throw new Error('Candidate 03 failed status check');
  }
  console.log('[PASS] Candidate 03 satisfies ✓ ✓ ✕ ✕');

  console.log('\n--- Test 4: Candidate 04 (✓ ✕ ✕ ✕ Check-In ✓, Enrollment ✕, CBT ✕, Practical ✕) ---');
  const cand04 = DEMO_CANDIDATES.find(c => c.id === 'can-9');
  if (!cand04) throw new Error('Candidate can-9 not found');
  const c4CheckIn = isCandidateCheckInCompleted(cand04);
  const c4Enroll = isCandidateEnrollmentCompleted(cand04);
  const c4Cbt = isCandidateCbtCompleted(cand04);
  const c4Practical = isCandidatePracticalCompleted(cand04);
  console.log(`Candidate: ${cand04.fullNameEn} (${cand04.passportNumber})`);
  console.log(`1st Check-In: ${c4CheckIn ? '✓' : '✕'} (Expected: ✓)`);
  console.log(`Enrollment:   ${c4Enroll ? '✓' : '✕'} (Expected: ✕)`);
  console.log(`CBT:          ${c4Cbt ? '✓' : '✕'} (Expected: ✕)`);
  console.log(`Practical:    ${c4Practical ? '✓' : '✕'} (Expected: ✕)`);
  if (!c4CheckIn || c4Enroll || c4Cbt || c4Practical) {
    throw new Error('Candidate 04 failed status check');
  }
  console.log('[PASS] Candidate 04 satisfies ✓ ✕ ✕ ✕');

  console.log('\n--- Test 5: Dynamic State Transition (Automatic Update when CBT is Confirmed) ---');
  // Simulate candidate 03 completing CBT confirmation (e.g. via handleConfirmCbtExam)
  const updatedCand03WithCbt: Candidate = {
    ...cand03,
    cbtStatus: 'CONFIRMED',
    status: 'CBT_EXAM_CONFIRMED',
    cbtConfirmationDate: '20/09/2026',
    cbtConfirmationTime: '10:00 AM',
    cbtConfirmedAt: new Date().toISOString(),
    cbtConfirmedBy: 'CBT Test Support'
  };
  if (!isCandidateCbtCompleted(updatedCand03WithCbt)) {
    throw new Error('Dynamic CBT transition failed: CBT not marked completed after confirmation');
  }
  console.log(`Candidate 03 Before CBT Confirmation: ${c3Cbt ? '✓' : '✕'}`);
  console.log(`Candidate 03 After CBT Confirmation:  ${isCandidateCbtCompleted(updatedCand03WithCbt) ? '✓' : '✕'}`);
  console.log('[PASS] Candidate 03 CBT dynamically transitions ✕ → ✓ upon CBT confirmation');

  console.log('\n--- Test 6: Dynamic Practical Transition ---');
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

  console.log('\n>>> ALL CANDIDATE EXIT PROCESS STATUS INDICATOR TESTS (INCLUDING CBT) PASSED! <<<');
}

runExitProcessIndicatorTests();
