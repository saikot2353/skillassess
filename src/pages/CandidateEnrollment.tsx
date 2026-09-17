import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Search, Camera, CheckCircle2, AlertTriangle, 
  XCircle, ArrowRight, RefreshCw, Shield, Shuffle, Award, 
  Layers, CreditCard, User, Sparkles, Check, Clock, CheckSquare
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { Candidate, Batch, Reservation, PracticalTask, TaskAllocation } from '../types';

export interface CandidateEnrollmentProps {
  onNavigate?: (path: string) => void;
}

export const CandidateEnrollmentPage: React.FC<CandidateEnrollmentProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);

  // Search & Batch State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [passportInput, setPassportInput] = useState('');
  const [matchedCandidate, setMatchedCandidate] = useState<Candidate | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Photo State
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Lottery Success Modal
  const [lotteryResult, setLotteryResult] = useState<{
    candidate: Candidate;
    task: PracticalTask;
    bayNumber: number;
    allocatedAt: string;
  } | null>(null);

  const loadData = () => {
    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const centerBatches = allBatches.filter(b => b.centerId === userCenterId);
    setBatches(centerBatches);

    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const centerCandidates = allCandidates.filter(c => c.centerId === userCenterId);
    setCandidates(centerCandidates);

    const allRes = StorageService.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    setReservations(allRes.filter(r => r.centerId === userCenterId));

    const allTasks = StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []);
    setTasks(allTasks);

    // If batch from URL
    const params = new URLSearchParams(window.location.search);
    const batchIdParam = params.get('batchId');
    const passportParam = params.get('passport');

    if (batchIdParam && centerBatches.some(b => b.id === batchIdParam)) {
      setSelectedBatchId(batchIdParam);
    } else if (centerBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(centerBatches[0].id);
    }

    if (passportParam) {
      setPassportInput(passportParam);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When passportInput or batch changes, lookup candidate
  const handleFindCandidate = () => {
    setValidationError(null);
    setMatchedCandidate(null);
    setCapturedPhotoUrl(null);

    const passport = passportInput.trim().toUpperCase();
    if (!passport) {
      setValidationError('Please enter or scan candidate passport number.');
      return;
    }

    if (!selectedBatchId) {
      setValidationError('Please select an active assessment batch first.');
      return;
    }

    // 1. Check if candidate exists
    const candidate = candidates.find(c => c.passportNumber.toUpperCase() === passport);
    if (!candidate) {
      // Check reservation roster
      const reservation = reservations.find(r => r.passportNumber.toUpperCase() === passport);
      if (reservation) {
        if (reservation.status === 'CANCELLED') {
          setValidationError('This reservation has been CANCELLED and cannot proceed to enrollment (BR-CA-006).');
          return;
        }
        setValidationError(`Candidate is registered under reservation ${reservation.reservationId} but has not been preloaded into a batch yet. Please preload the reservation first.`);
        return;
      }
      setValidationError('No candidate record found with this passport number in this center.');
      return;
    }

    // 2. Check batch alignment
    if (candidate.batchId !== selectedBatchId) {
      const actualBatch = batches.find(b => b.id === candidate.batchId);
      setValidationError(
        `Batch mismatch: Candidate belongs to batch ${actualBatch?.batchNumber || candidate.batchId}. Please switch batch or reassign candidate.`
      );
      return;
    }

    // 3. Check reservation cancelled
    const matchingRes = reservations.find(r => r.passportNumber.toUpperCase() === passport || r.reservationId === candidate.reservationId);
    if (matchingRes && matchingRes.status === 'CANCELLED') {
      setValidationError('Reservation for this candidate is CANCELLED. Enrollment is forbidden (BR-CA-006).');
      return;
    }

    // 4. Check already enrolled (BR-CA-007)
    if (candidate.enrollmentStatus === 'ENROLLED' || candidate.status === 'ENROLLED' || candidate.status === 'IN_ASSESSMENT' || candidate.status === 'COMPLETED') {
      setValidationError(`Candidate ${candidate.fullNameEn} (${candidate.passportNumber}) is ALREADY ENROLLED in this assessment context (BR-CA-007).`);
      return;
    }

    // Candidate is eligible!
    setMatchedCandidate(candidate);
    if (candidate.photoUrl) {
      setCapturedPhotoUrl(candidate.photoUrl);
    }
  };

  // Sample quick-fill passports
  const quickTestPassports = [
    { label: 'FA8872190 (Abdul Karim - Ready)', passport: 'FA8872190', batch: 'bat-1' },
    { label: 'SA1190284 (Saad Al-Qarni - Preload)', passport: 'SA1190284', batch: 'bat-2' },
    { label: 'SA5591028 (Cancelled Reservation)', passport: 'SA5591028', batch: 'bat-1' },
  ];

  // Capture Photo simulation
  const handleSimulateCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      // Pick simulated high-resolution biometric face photo
      const samplePhotos = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
      ];
      const randomPhoto = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
      setCapturedPhotoUrl(randomPhoto);
      setIsCapturing(false);
      showToast('Biometric facial photo captured and verified (99.2% alignment score)', 'success');
    }, 600);
  };

  // Confirm Enrollment & Trigger Practical Task Lottery (BR-CA-008)
  const handleConfirmEnrollment = () => {
    if (!matchedCandidate) return;

    if (!capturedPhotoUrl) {
      showToast('Mandatory biometric photo is required before confirming enrollment.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();

    // 1. Trigger Practical Task Lottery (BR-CA-008)
    // Find eligible tasks matching occupation
    const eligibleTasks = tasks.filter(t => t.occupation.toLowerCase() === matchedCandidate.occupation.toLowerCase());
    const assignedTask = eligibleTasks.length > 0 
      ? eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)]
      : tasks[0] || {
          id: 'tsk-default',
          code: 'TSK-GEN-01',
          titleEn: 'Standard Practical Workstation Evaluation',
          titleAr: 'تقييم محطة العمل العملية المعتمدة',
          occupation: matchedCandidate.occupation,
          difficulty: 'INTERMEDIATE',
          durationMinutes: 90,
          maxScore: 100,
          passingScore: 60,
        };

    const assignedBayNumber = Math.floor(1 + Math.random() * 12);

    // 2. Update Candidate
    const updatedCandidate: Candidate = {
      ...matchedCandidate,
      enrollmentStatus: 'ENROLLED',
      status: 'ENROLLED',
      photoUrl: capturedPhotoUrl,
      enrolledAt: nowIso,
      practicalStatus: 'TASK_ASSIGNED',
      assignedTaskId: assignedTask.id,
      assignedTaskCode: assignedTask.code,
      assignedTaskTitle: assignedTask.titleEn,
      taskDifficulty: assignedTask.difficulty,
      taskAssignedAt: nowIso,
    };

    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    // 3. Store Task Allocation
    const newAllocation: TaskAllocation = {
      id: `alloc-${Date.now()}`,
      candidateId: updatedCandidate.id,
      candidateName: updatedCandidate.fullNameEn,
      aproReference: updatedCandidate.aproReference,
      occupation: updatedCandidate.occupation,
      taskId: assignedTask.id,
      taskCode: assignedTask.code,
      taskTitle: assignedTask.titleEn,
      difficulty: assignedTask.difficulty,
      assignedDate: nowIso,
      status: 'ASSIGNED',
    };
    StorageService.updateItem(STORAGE_KEYS.TASK_ALLOCATIONS, newAllocation);

    // 4. Audit Log
    AuditService.log(
      'ENROLL_CANDIDATE',
      'CANDIDATE',
      `Enrolled candidate ${updatedCandidate.fullNameEn} (${updatedCandidate.passportNumber}) with biometric photo capture.`,
      updatedCandidate.id,
      'SUCCESS'
    );
    AuditService.log(
      'ALLOCATE_TASK',
      'PRACTICAL_TASK',
      `Practical Task Lottery triggered: assigned ${assignedTask.code} (${assignedTask.titleEn}) at Bay ${assignedBayNumber} for candidate ${updatedCandidate.fullNameEn}.`,
      assignedTask.id,
      'SUCCESS'
    );

    // 5. Open Lottery Modal
    setLotteryResult({
      candidate: updatedCandidate,
      task: assignedTask,
      bayNumber: assignedBayNumber,
      allocatedAt: nowIso,
    });

    showToast('Candidate successfully enrolled & Practical Task assigned!', 'success');
    loadData();
  };

  const handleResetForNext = () => {
    setLotteryResult(null);
    setMatchedCandidate(null);
    setPassportInput('');
    setCapturedPhotoUrl(null);
    setValidationError(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={language === 'ar' ? 'تسجيل حضور المرشحين والقرعة العملية' : 'Candidate Enrollment & Task Allocation'}
        subtitle={language === 'ar' ? 'التحقق من الجواز، التقاط الصورة البيومترية، وتوليد مهمة التقييم العملي آلياً عبر نظام القرعة' : 'Scan passport, verify batch eligibility, capture live photo, and trigger automated Practical Task Lottery.'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المرشحون' : 'Candidates', href: '/candidates' },
          { label: language === 'ar' ? 'تسجيل الحضور' : 'Enrollment' },
        ]}
      />

      {/* Quick Test Helper Pills */}
      <div className="p-3 bg-[#FBF6E8] border border-[#E8D9D2] rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C9A24D] shrink-0" />
          <span className="font-semibold text-[#3F3030]">
            {language === 'ar' ? 'اختبار المسار السريع:' : 'Prototype Quick Test Cases:'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickTestPassports.map((tc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedBatchId(tc.batch);
                setPassportInput(tc.passport);
                setValidationError(null);
                setMatchedCandidate(null);
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] text-[#7A2E3A] transition-colors"
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 & Step 2 Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Batch & Passport Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#E8D9D2] pb-3">
              <div className="w-7 h-7 rounded-full bg-[#7A2E3A] text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-[#7A2E3A]">
                {language === 'ar' ? 'اختيار الدفعة وفحص الجواز' : 'Select Batch & Scan Passport'}
              </h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#3F3030] block mb-1">
                  {language === 'ar' ? 'الدفعة التشغيلية الحالية' : 'Operational Assessment Batch'}
                </label>
                <select
                  value={selectedBatchId}
                  onChange={e => {
                    setSelectedBatchId(e.target.value);
                    setMatchedCandidate(null);
                    setValidationError(null);
                  }}
                  className="w-full text-xs font-semibold py-2 px-3 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} — {b.occupation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#3F3030] block mb-1">
                  {language === 'ar' ? 'رقم جواز السفر' : 'Passport Number (Scan or Type)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={passportInput}
                    onChange={e => setPassportInput(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleFindCandidate();
                    }}
                    placeholder="e.g. FA8872190"
                    className="w-full text-xs font-mono font-bold py-2 ps-3 pe-10 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                  />
                  <button
                    type="button"
                    onClick={handleFindCandidate}
                    className="absolute inset-y-1 end-1 px-2.5 rounded bg-[#F8ECEE] hover:bg-[#7A2E3A] hover:text-white text-[#7A2E3A] text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'بحث' : 'Find'}</span>
                  </button>
                </div>
              </div>

              {validationError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="leading-relaxed">
                    <strong>Validation Blocked:</strong> {validationError}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Candidate Info & Biometric Photo (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {matchedCandidate ? (
            <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#C9A24D] text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-[#7A2E3A]">
                    {language === 'ar' ? 'التحقق من الهوية والتقاط الصورة' : 'Candidate Identity & Photo Verification'}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {language === 'ar' ? 'مطابق ومؤهل للتسجيل' : 'Verified Eligible'}
                </span>
              </div>

              {/* Candidate Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] text-xs">
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Candidate Full Name</span>
                  <strong className="text-[#3F3030] block text-sm">{matchedCandidate.fullNameEn}</strong>
                  <span className="text-[#806F6F] font-arabic text-[11px] block">{matchedCandidate.fullNameAr}</span>
                </div>
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Passport Number</span>
                  <strong className="font-mono text-sm text-[#7A2E3A] block">{matchedCandidate.passportNumber}</strong>
                  <span className="text-[10px] text-[#806F6F] font-mono">APRO: {matchedCandidate.aproReference}</span>
                </div>
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Reservation Reference</span>
                  <strong className="font-mono text-xs text-[#3F3030] block">{matchedCandidate.reservationId || 'N/A'}</strong>
                  <span className="text-[10px] text-emerald-700 font-semibold">Preloaded in Batch</span>
                </div>
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Target Occupation</span>
                  <strong className="text-[#3F3030] block">{matchedCandidate.occupation}</strong>
                </div>
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Assigned Center</span>
                  <strong className="text-[#3F3030] block">{userCenterId}</strong>
                </div>
                <div>
                  <span className="text-[#806F6F] block text-[11px]">Batch Allocation</span>
                  <strong className="text-[#3F3030] block font-mono">
                    {batches.find(b => b.id === matchedCandidate.batchId)?.batchNumber || matchedCandidate.batchId}
                  </strong>
                </div>
              </div>

              {/* Step 3: Photo Capture Section */}
              <div className="border border-[#E8D9D2] rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#7A2E3A]" />
                    <span className="text-xs font-bold text-[#3F3030]">
                      {language === 'ar' ? 'التقاط الصورة البيومترية الإلزامية' : 'Biometric Face Photo Capture'}
                    </span>
                  </div>
                  {capturedPhotoUrl ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Photo Verified
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Photo Required
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Camera Viewfinder */}
                  <div className="w-40 h-44 rounded-xl border-2 border-dashed border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                    {capturedPhotoUrl ? (
                      <img
                        src={capturedPhotoUrl}
                        alt="Candidate Portrait"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 text-[#806F6F]">
                        <Camera className="w-8 h-8 mx-auto text-[#806F6F] mb-1 opacity-50" />
                        <span className="text-[10px] block font-medium">Ready to capture</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs flex-1">
                    <p className="text-[#806F6F] text-[11px] leading-relaxed">
                      {language === 'ar' 
                        ? 'يتم التقاط صورة المرشح في قاعة التقييم لربطها ببطاقة الاختبار، والتحقق البيومتري، ومسار القرعة العملية.'
                        : 'Live portrait capture links candidate identity to assessment worksheet, CBT login, and practical station bay.'}
                    </p>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSimulateCapture}
                      disabled={isCapturing}
                      leftIcon={<Camera className="w-3.5 h-3.5" />}
                    >
                      {capturedPhotoUrl ? (language === 'ar' ? 'إعادة التقاط الصورة' : 'Retake Portrait') : (language === 'ar' ? 'التقاط الصورة الآن' : 'Capture Live Photo')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Confirm Enrollment CTA */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E8D9D2]">
                <span className="text-[11px] text-[#806F6F]">
                  {language === 'ar' ? 'تأكيد التسجيل سيقوم بتوليد المهمة العملية آلياً' : 'Confirming triggers automated Practical Task Lottery allocation.'}
                </span>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmEnrollment}
                  disabled={!capturedPhotoUrl}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'تأكيد التسجيل وإجراء القرعة' : 'Confirm Enrollment & Trigger Lottery'}
                </Button>
              </div>
            </div>
          ) : (
            /* Empty Prompt */
            <div className="p-12 rounded-xl border border-[#E8D9D2] bg-white text-center text-[#806F6F] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'بانتظار مسح جواز السفر' : 'Awaiting Passport Search'}
              </h4>
              <p className="text-xs max-w-sm mx-auto">
                {language === 'ar' ? 'اختر الدفعة وأدخل رقم الجواز للتحقق من المرشح وتأكيد تسجيله.' : 'Select an assessment batch and enter candidate passport to display records and capture biometric photo.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LOTTERY TRIGGER CONFIRMATION MODAL (Section 13) */}
      {lotteryResult && (
        <Modal
          isOpen={!!lotteryResult}
          onClose={handleResetForNext}
          maxWidth="lg"
          icon={<Shuffle className="w-6 h-6 text-[#C9A24D]" />}
          title={language === 'ar' ? 'تم تسجيل المرشح وتوليد المهمة العملية بنجاح!' : 'Candidate Enrolled & Practical Task Allocated!'}
          subtitle={`APRO Ref: ${lotteryResult.candidate.aproReference} — ${lotteryResult.candidate.fullNameEn}`}
          infoNotice={language === 'ar' ? 'تم قفل تخصيص المهمة العملية بنجاح ولا يمكن تعديلها يدوياً وفق معايير الحوكمة.' : 'Practical Task Lottery allocation is cryptographically bound and protected under ISO 17024 rules.'}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleResetForNext}>
                {language === 'ar' ? 'تسجيل مرشح آخر' : 'Enroll Another Candidate'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleResetForNext();
                  if (onNavigate) onNavigate('/assessment-monitoring');
                }}
                leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'متابعة شاشات التقييم' : 'View Monitoring Dashboard'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Candidate & Photo Confirmation */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2]">
              <div className="w-16 h-18 rounded-lg overflow-hidden border border-[#E8D9D2] shrink-0 bg-white">
                <img
                  src={lotteryResult.candidate.photoUrl}
                  alt={lotteryResult.candidate.fullNameEn}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-[#3F3030] text-sm block">
                  {lotteryResult.candidate.fullNameEn}
                </span>
                <span className="text-[#806F6F] font-mono block">
                  Passport: <strong className="text-[#7A2E3A]">{lotteryResult.candidate.passportNumber}</strong> | APRO: {lotteryResult.candidate.aproReference}
                </span>
                <span className="text-[11px] text-[#806F6F] block">
                  Occupation: <strong className="text-[#3F3030]">{lotteryResult.candidate.occupation}</strong>
                </span>
              </div>
            </div>

            {/* Practical Task Lottery Result Box (Section 13) */}
            <div>
              <ModalSectionTitle title="Practical Task Lottery Engine Assignment" />
              <div className="p-4 rounded-xl bg-[#F8ECEE]/40 border border-[#7A2E3A]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#7A2E3A] text-white">
                    {lotteryResult.task.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                    Difficulty: {lotteryResult.task.difficulty}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#7A2E3A]">
                    {lotteryResult.task.titleEn}
                  </h4>
                  <p className="text-xs text-[#806F6F] mt-0.5 font-arabic">
                    {lotteryResult.task.titleAr}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8D9D2] text-[11px]">
                  <div>
                    <span className="text-[#806F6F] block">Allocated Workstation</span>
                    <strong className="text-[#3F3030] font-mono">Bay #{lotteryResult.bayNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[#806F6F] block">Duration</span>
                    <strong className="text-[#3F3030]">{lotteryResult.task.durationMinutes || 90} Minutes</strong>
                  </div>
                  <div>
                    <span className="text-[#806F6F] block">Allocation Time</span>
                    <strong className="text-[#3F3030] font-mono">{new Date(lotteryResult.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
