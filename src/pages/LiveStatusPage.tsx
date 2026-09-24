import React, { useState, useMemo } from 'react';
import { 
  Radio, Layers, CheckCircle2, Clock, Camera, Eye, 
  User, Search, Filter, RefreshCw, AlertTriangle, ArrowRight,
  ShieldCheck, X, FileText, CheckSquare, Award, ArrowUpRight, UserCheck, Check
} from 'lucide-react';
import { Candidate, Batch } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';

interface LiveStatusPageProps {
  onNavigate?: (path: string) => void;
}

export const LiveStatusPage: React.FC<LiveStatusPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const userCenterId = user?.centerId || 'ctr-sa-1';

  const [candidates, setCandidates] = useState<Candidate[]>(() => 
    StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, [])
  );
  const [batches] = useState<Batch[]>(() => 
    StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, [])
  );

  // Available batches for logged-in Center Admin
  const centerBatches = useMemo(() => {
    return batches.filter(b => {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'GLOBAL_ADMIN') return true;
      return b.centerId === userCenterId;
    });
  }, [batches, user, userCenterId]);

  // Selected Batch Dropdown state (defaults to first batch or ALL)
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    return centerBatches[0]?.id || 'ALL';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{
    stageName: string;
    photoType: string;
    photoUrl: string;
    captureDate?: string;
    captureTime?: string;
    performedBy?: string;
  } | null>(null);

  const reloadData = () => {
    const fresh = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    setCandidates(fresh);
    showToast(isRTL ? 'تم تحديث بيانات الحالة المباشرة' : 'Live Status data reloaded.', 'info');
  };

  // Center-filtered candidates
  const centerCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'GLOBAL_ADMIN') return true;
      return c.centerId === userCenterId;
    });
  }, [candidates, user, userCenterId]);

  // Candidates filtered by selected batch
  const batchCandidates = useMemo(() => {
    if (selectedBatchId === 'ALL') return centerCandidates;
    return centerCandidates.filter(c => c.batchId === selectedBatchId);
  }, [centerCandidates, selectedBatchId]);

  // Helper to determine candidate stage-by-stage progress
  const getCandidateStageInfo = (c: Candidate) => {
    const isStep1Done = c.status !== 'SCHEDULED' && c.status !== 'REGISTERED';
    const isStep2Done = c.passportMatchConfirmed || c.supportStaffVerificationStatus === 'CONFIRMED' || c.enrollmentStatus === 'ENROLLED' || c.cbtStatus === 'COMPLETED' || c.practicalStatus === 'COMPLETED' || c.status === 'COMPLETED';
    const isStep3Done = c.cbtStatus === 'COMPLETED' || c.cbtScore !== undefined;
    const isStep4Done = c.practicalStatus === 'COMPLETED' || c.practicalScore !== undefined;
    const isStep5Done = c.exitStatus === 'CONFIRMED' || c.status === 'COMPLETED' || c.status === 'LOCKED';

    // Step 1: Check-in
    const step1Status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = isStep1Done 
      ? 'COMPLETED' 
      : (c.status === 'CHECKED_IN' ? 'IN_PROGRESS' : 'PENDING');

    // Step 2: Verification
    const step2Status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = isStep2Done 
      ? 'COMPLETED' 
      : ((c.status === 'ENROLLMENT_VERIFY' || c.status === 'PAUSED_PENDING_VERIFICATION' || c.supportStaffVerificationStatus === 'PENDING') ? 'IN_PROGRESS' : 'PENDING');

    // Step 3: CBT
    const step3Status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = isStep3Done 
      ? 'COMPLETED' 
      : ((c.cbtStatus === 'IN_PROGRESS' || c.status === 'CBT_EXAM_CONFIRMED') ? 'IN_PROGRESS' : 'PENDING');

    // Step 4: Practical
    const step4Status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = isStep4Done 
      ? 'COMPLETED' 
      : ((c.practicalStatus === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.status === 'EVALUATION_PENDING') ? 'IN_PROGRESS' : 'PENDING');

    // Step 5: Exit
    const step5Status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = isStep5Done 
      ? 'COMPLETED' 
      : (c.exitStatus === 'PENDING' && isStep4Done ? 'IN_PROGRESS' : 'PENDING');

    // Current Stage & Next Action calculation (Requirement 8)
    let currentStage = 'Step 1 – Check-in';
    let currentStatus = 'Scheduled';
    let nextAction = 'Complete Check-in';

    if (c.isExpelled || c.status === 'EXPELLED') {
      currentStage = 'Disqualified';
      currentStatus = 'Expelled';
      nextAction = 'Candidate expelled from assessment';
    } else if (c.isPaused || c.status === 'PAUSED_PENDING_VERIFICATION') {
      currentStage = 'Step 2 – Verification';
      currentStatus = 'Paused Pending Verification';
      nextAction = 'Complete Verification in Queue';
    } else if (step1Status !== 'COMPLETED') {
      currentStage = 'Step 1 – Check-in';
      currentStatus = step1Status === 'IN_PROGRESS' ? 'Checked In' : 'Scheduled';
      nextAction = 'Complete Check-in';
    } else if (step2Status !== 'COMPLETED') {
      currentStage = 'Step 2 – Verification';
      currentStatus = step2Status === 'IN_PROGRESS' ? 'Verification In Progress' : 'Pending Verification';
      nextAction = 'Complete Verification';
    } else if (step3Status !== 'COMPLETED') {
      currentStage = 'Step 3 – CBT';
      currentStatus = step3Status === 'IN_PROGRESS' ? 'Exam In Progress' : 'CBT Pending';
      nextAction = 'Complete CBT';
    } else if (step4Status !== 'COMPLETED') {
      currentStage = 'Step 4 – Practical Assessment';
      if (c.status === 'EVALUATION_PENDING') {
        currentStatus = 'Evaluation Pending';
        nextAction = 'Upload Evaluation Sheet';
      } else {
        currentStatus = step4Status === 'IN_PROGRESS' ? 'Practical In Progress' : 'Practical Pending';
        nextAction = 'Complete Practical Assessment';
      }
    } else if (step5Status !== 'COMPLETED') {
      currentStage = 'Step 5 – Exit';
      currentStatus = 'Exit Pending';
      nextAction = 'Complete Candidate Exit';
    } else {
      currentStage = 'Step 5 – Exit';
      currentStatus = 'Completed & Sealed';
      nextAction = 'Assessment Complete — Dossier Sealed';
    }

    // Determine Last Activity and timestamp
    let lastActivity = 'Intake Registered';
    let lastActivityTime = c.registeredAt ? new Date(c.registeredAt).toLocaleString() : 'N/A';

    if (c.exitVerifiedAt || c.exitConfirmationTime) {
      lastActivity = 'Exit Verified & Checked Out';
      lastActivityTime = c.exitVerifiedAt ? new Date(c.exitVerifiedAt).toLocaleString() : `${c.exitConfirmationDate || ''} ${c.exitConfirmationTime || ''}`.trim();
    } else if (c.practicalConfirmedAt || c.practicalConfirmationTime) {
      lastActivity = 'Practical Assessment Submitted';
      lastActivityTime = c.practicalConfirmedAt ? new Date(c.practicalConfirmedAt).toLocaleString() : `${c.practicalConfirmationDate || ''} ${c.practicalConfirmationTime || ''}`.trim();
    } else if (c.cbtConfirmedAt || c.cbtConfirmationTime) {
      lastActivity = 'CBT Exam Submitted';
      lastActivityTime = c.cbtConfirmedAt ? new Date(c.cbtConfirmedAt).toLocaleString() : `${c.cbtConfirmationDate || ''} ${c.cbtConfirmationTime || ''}`.trim();
    } else if (c.supportStaffVerifiedAt || c.supportStaffConfirmationTime) {
      lastActivity = 'Biometrics & Passport Verified';
      lastActivityTime = c.supportStaffVerifiedAt ? new Date(c.supportStaffVerifiedAt).toLocaleString() : `${c.supportStaffConfirmationDate || ''} ${c.supportStaffConfirmationTime || ''}`.trim();
    } else if (c.enrolledAt) {
      lastActivity = 'Enrolled & Photo Captured';
      lastActivityTime = new Date(c.enrolledAt).toLocaleString();
    }

    return {
      step1Status,
      step2Status,
      step3Status,
      step4Status,
      step5Status,
      currentStage,
      currentStatus,
      nextAction,
      lastActivity,
      lastActivityTime,
    };
  };

  // KPI Dashboard metrics (Requirement 10)
  const dashboardKpis = useMemo(() => {
    const total = batchCandidates.length;
    let completedCheckin = 0;
    let completedVerification = 0;
    let completedCBT = 0;
    let inPractical = 0;
    let waitingEvaluation = 0;
    let completedAll = 0;
    let pendingAction = 0;

    batchCandidates.forEach(c => {
      const info = getCandidateStageInfo(c);
      if (info.step1Status === 'COMPLETED') completedCheckin++;
      if (info.step2Status === 'COMPLETED') completedVerification++;
      if (info.step3Status === 'COMPLETED') completedCBT++;
      if (info.step4Status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT') inPractical++;
      if (c.status === 'EVALUATION_PENDING' || (info.step4Status === 'COMPLETED' && !c.resultLocked)) waitingEvaluation++;
      if (info.step5Status === 'COMPLETED') completedAll++;
      if (info.nextAction && !info.nextAction.includes('Complete — Dossier Sealed') && !c.isExpelled) pendingAction++;
    });

    return {
      total,
      completedCheckin,
      completedVerification,
      completedCBT,
      inPractical,
      waitingEvaluation,
      completedAll,
      pendingAction,
    };
  }, [batchCandidates]);

  // Filtered candidate roster for table
  const filteredCandidates = useMemo(() => {
    return batchCandidates.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        c.fullNameEn.toLowerCase().includes(q) ||
        (c.fullNameAr && c.fullNameAr.includes(q)) ||
        c.passportNumber.toLowerCase().includes(q) ||
        (c.nationalId && c.nationalId.toLowerCase().includes(q)) ||
        (c.idNo && c.idNo.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (stageFilter === 'ALL') return true;
      const info = getCandidateStageInfo(c);
      if (stageFilter === 'CHECKIN') return info.step1Status === 'COMPLETED';
      if (stageFilter === 'VERIFICATION') return info.step2Status === 'COMPLETED';
      if (stageFilter === 'CBT') return info.step3Status === 'COMPLETED';
      if (stageFilter === 'PRACTICAL') return info.step4Status === 'IN_PROGRESS' || info.step4Status === 'COMPLETED';
      if (stageFilter === 'PENDING_EVAL') return c.status === 'EVALUATION_PENDING';
      if (stageFilter === 'COMPLETED') return info.step5Status === 'COMPLETED';
      if (stageFilter === 'EXPELLED') return c.isExpelled || c.status === 'EXPELLED';
      return true;
    });
  }, [batchCandidates, searchQuery, stageFilter]);

  // Selected candidate live details
  const activeCandidateDetails = useMemo(() => {
    if (!selectedCandidate) return null;
    const fresh = candidates.find(c => c.id === selectedCandidate.id) || selectedCandidate;
    const info = getCandidateStageInfo(fresh);
    const batch = batches.find(b => b.id === fresh.batchId);
    return { candidate: fresh, info, batch };
  }, [selectedCandidate, candidates, batches]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-[#A43950] animate-pulse" />
            <span>{isRTL ? 'المراقبة الميدانية المباشرة (Live Status)' : 'Live Status'}</span>
          </div>
        }
        subtitle={
          isRTL
            ? 'المراقبة الميدانية الحية لتقدم مرشحي الدفعات وتتبع المحطات البيومترية ونماذج التقييم'
            : 'Operational live candidate progress monitor with stage-by-stage photo and activity traceability'
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: isRTL ? 'الحالة المباشرة' : 'Live Status' },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={reloadData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {t.common.refresh}
          </Button>
        }
      />

      {/* Top Filter and Batch Selection Bar (Requirement 2) */}
      <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Batch Selection Dropdown */}
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-[#A43950] shrink-0" />
          <span className="text-xs font-bold text-[#3F3030] shrink-0">
            {isRTL ? 'اختيار الدفعة:' : 'Batch Selection:'}
          </span>
          <select
            value={selectedBatchId}
            onChange={e => setSelectedBatchId(e.target.value)}
            className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg py-2 px-3 font-semibold text-[#3F3030] focus:outline-none focus:border-[#A43950] min-w-[240px]"
          >
            <option value="ALL">{isRTL ? 'جميع الدفعات (All Batches)' : 'All Available Batches'}</option>
            {centerBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.occupation} ({b.startDate})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، رقم الجواز، أو الهوية...' : 'Search name, passport, NID, or ID...'}
            className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg ps-9 pe-3 py-2 text-[#3F3030] focus:outline-none focus:border-[#A43950]"
          />
        </div>
      </div>

      {/* Real-time Operational Dashboard KPI Cards (Requirement 10) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="p-3 rounded-xl border border-[#E8D9D2] bg-white text-center shadow-2xs">
          <span className="text-[10px] text-[#806F6F] block font-semibold">{isRTL ? 'إجمالي الدفعة' : 'Batch Total'}</span>
          <span className="text-xl font-bold font-mono text-[#3F3030]">{dashboardKpis.total}</span>
        </div>
        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 text-center shadow-2xs">
          <span className="text-[10px] text-blue-800 block font-semibold">{isRTL ? 'تم الوصول' : 'Check-In'}</span>
          <span className="text-xl font-bold font-mono text-blue-700">{dashboardKpis.completedCheckin}</span>
        </div>
        <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-center shadow-2xs">
          <span className="text-[10px] text-stone-700 block font-semibold">{isRTL ? 'التحقق' : 'Verification'}</span>
          <span className="text-xl font-bold font-mono text-stone-800">{dashboardKpis.completedVerification}</span>
        </div>
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-center shadow-2xs">
          <span className="text-[10px] text-amber-800 block font-semibold">CBT</span>
          <span className="text-xl font-bold font-mono text-amber-700">{dashboardKpis.completedCBT}</span>
        </div>
        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50 text-center shadow-2xs">
          <span className="text-[10px] text-purple-800 block font-semibold">{isRTL ? 'في العملي' : 'In Practical'}</span>
          <span className="text-xl font-bold font-mono text-purple-700">{dashboardKpis.inPractical}</span>
        </div>
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/80 text-center shadow-2xs">
          <span className="text-[10px] text-amber-900 block font-semibold">{isRTL ? 'بانتظار التقييم' : 'Eval Pending'}</span>
          <span className="text-xl font-bold font-mono text-amber-800">{dashboardKpis.waitingEvaluation}</span>
        </div>
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-center shadow-2xs">
          <span className="text-[10px] text-emerald-800 block font-semibold">{isRTL ? 'مكتمل ومعتمد' : 'All Complete'}</span>
          <span className="text-xl font-bold font-mono text-emerald-700">{dashboardKpis.completedAll}</span>
        </div>
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-center shadow-2xs">
          <span className="text-[10px] text-rose-800 block font-semibold">{isRTL ? 'يتطلب إجراء' : 'Next Action'}</span>
          <span className="text-xl font-bold font-mono text-rose-700">{dashboardKpis.pendingAction}</span>
        </div>
      </div>

      {/* Stage Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[#806F6F] font-semibold text-[11px] me-1 shrink-0">
          <Filter className="w-3.5 h-3.5 inline me-1" />
          Filter:
        </span>
        {[
          { id: 'ALL', label: 'All Candidates' },
          { id: 'CHECKIN', label: 'Completed Check-in' },
          { id: 'VERIFICATION', label: 'Verified' },
          { id: 'CBT', label: 'Completed CBT' },
          { id: 'PRACTICAL', label: 'In Practical' },
          { id: 'PENDING_EVAL', label: 'Evaluation Pending' },
          { id: 'COMPLETED', label: 'Fully Completed' },
          { id: 'EXPELLED', label: 'Expelled' },
        ].map(btn => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setStageFilter(btn.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors border ${
              stageFilter === btn.id
                ? 'bg-[#7A2E3A] text-white border-[#7A2E3A]'
                : 'bg-white text-[#5C554E] border-[#E8D9D2] hover:bg-stone-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Candidate Live Status List Table (Requirement 4) */}
      <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
              {isRTL ? 'قائمة المرشحين بالحالة المباشرة' : 'Candidate Live Status Roster'}
            </h4>
            <p className="text-[11px] text-[#806F6F] mt-0.5">
              {isRTL ? 'انقر على أي مرشح لفتح المسار التفصيلي وتتبع الصور والأنشطة' : 'Click any candidate to open their detailed stage-by-stage journey with photos and activity traceability.'}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
            {filteredCandidates.length} Candidates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
              <tr>
                <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                <th className="py-2.5 px-3 text-start font-semibold">Passport Number</th>
                <th className="py-2.5 px-3 text-start font-semibold">NID / Candidate ID</th>
                <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                <th className="py-2.5 px-3 text-start font-semibold">Current Stage</th>
                <th className="py-2.5 px-3 text-start font-semibold">Assigned Assessor</th>
                <th className="py-2.5 px-3 text-end font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D9D2]">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#806F6F]">
                    No candidates found matching the selected batch and filters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(cand => {
                  const info = getCandidateStageInfo(cand);
                  const batch = batches.find(b => b.id === cand.batchId);
                  const displayPhoto = cand.practicalPhoto1 || cand.cbtPhoto || cand.enrollmentPhoto || cand.passportVerificationPhoto || cand.photoUrl;

                  return (
                    <tr 
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className="hover:bg-[#FFFCF8] transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0">
                            <img 
                              src={displayPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <strong className="text-xs text-[#3F3030] block group-hover:text-[#7A2E3A] transition-colors">
                              {isRTL ? cand.fullNameAr : cand.fullNameEn}
                            </strong>
                            {cand.isExpelled && (
                              <span className="text-[10px] text-rose-600 font-bold block">DISQUALIFIED</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                        {cand.passportNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#806F6F]">
                        {cand.nationalId || cand.idNo || cand.id}
                      </td>
                      <td className="py-2.5 px-3 text-[#3F3030]">
                        {cand.occupation}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#806F6F]">
                        {batch ? batch.batchNumber : cand.batchId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                          {info.currentStage}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#3F3030]">
                        {cand.assessorName ? (
                          <span className="font-semibold text-emerald-800">{cand.assessorName}</span>
                        ) : (
                          <span className="text-[#806F6F] italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedCandidate(cand)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-[#A43950]" />}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANDIDATE DETAILED LIVE STATUS MODAL (Requirements 5, 6, 7, 8, 9, 11) */}
      {activeCandidateDetails && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCandidate(null)}
          maxWidth="2xl"
          title={
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-[#A43950] animate-pulse" />
              <span>{isRTL ? 'تفاصيل المراقبة الميدانية المباشرة للمرشح' : 'Candidate Detailed Live Status'}</span>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Candidate Information Header */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0">
                    <img 
                      src={activeCandidateDetails.candidate.photoUrl || activeCandidateDetails.candidate.passportVerificationPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#3F3030]">
                      {isRTL ? activeCandidateDetails.candidate.fullNameAr : activeCandidateDetails.candidate.fullNameEn}
                    </h3>
                    <div className="flex items-center gap-2.5 text-xs text-[#806F6F] mt-0.5 flex-wrap">
                      <span>Passport: <strong className="font-mono text-[#7A2E3A]">{activeCandidateDetails.candidate.passportNumber}</strong></span>
                      <span>•</span>
                      <span>NID: <strong className="font-mono text-[#3F3030]">{activeCandidateDetails.candidate.nationalId || activeCandidateDetails.candidate.idNo || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Batch: <strong className="font-mono text-[#3F3030]">{activeCandidateDetails.batch ? activeCandidateDetails.batch.batchNumber : activeCandidateDetails.candidate.batchId}</strong></span>
                      <span>•</span>
                      <span>Occupation: <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.occupation}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <StatusBadge status={activeCandidateDetails.candidate.status} />
                </div>
              </div>
            </div>

            {/* Requirement 7: Candidate Progress Summary Line */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  Overall Candidate Assessment Journey
                </span>
                <span className="text-[11px] font-mono text-[#806F6F]">
                  5 Standard SVP Stages
                </span>
              </div>

              {/* Progress Flow Line */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {[
                  { num: 1, name: 'Check-in', status: activeCandidateDetails.info.step1Status },
                  { num: 2, name: 'Verification', status: activeCandidateDetails.info.step2Status },
                  { num: 3, name: 'CBT', status: activeCandidateDetails.info.step3Status },
                  { num: 4, name: 'Practical', status: activeCandidateDetails.info.step4Status },
                  { num: 5, name: 'Exit', status: activeCandidateDetails.info.step5Status },
                ].map((step, idx, arr) => {
                  const isDone = step.status === 'COMPLETED';
                  const isCurrent = step.status === 'IN_PROGRESS';
                  return (
                    <div key={step.num} className="text-center relative">
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : isCurrent
                          ? 'bg-[#7A2E3A] text-white border-[#7A2E3A] ring-2 ring-rose-200 animate-pulse'
                          : 'bg-stone-100 text-stone-400 border-stone-300'
                      }`}>
                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : (isCurrent ? '●' : '○')}
                      </div>
                      <span className={`block text-[11px] mt-1 font-semibold truncate ${
                        isDone ? 'text-emerald-800' : isCurrent ? 'text-[#7A2E3A]' : 'text-stone-400'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requirement 8: Current & Next Action Box */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-[#806F6F] uppercase block">Current Stage</span>
                <strong className="text-xs text-[#7A2E3A] font-bold block mt-0.5">
                  {activeCandidateDetails.info.currentStage}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#806F6F] uppercase block">Current Status</span>
                <strong className="text-xs text-[#3F3030] font-bold block mt-0.5">
                  {activeCandidateDetails.info.currentStatus}
                </strong>
              </div>
              <div className="bg-[#FFFCF8] p-2.5 rounded-lg border border-[#E8D9D2]">
                <span className="text-[10px] font-semibold text-[#806F6F] uppercase block">Next Action Required</span>
                <span className="text-xs text-[#91702C] font-bold block mt-0.5 flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-[#C9A24D] shrink-0" />
                  <span>{activeCandidateDetails.info.nextAction}</span>
                </span>
              </div>
            </div>

            {/* Requirements 5, 6, 9: Stage-by-Stage Detailed Activity & Photo Timeline */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                Stage-by-Stage Activity & Evidence Timeline
              </h4>

              {/* STEP 1: CHECK-IN */}
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeCandidateDetails.info.step1Status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      1
                    </span>
                    <strong className="text-xs text-[#3F3030]">Step 1 – Check-in</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeCandidateDetails.info.step1Status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {activeCandidateDetails.info.step1Status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Check-in Status:</span>
                      <strong className="text-[#3F3030]">{activeCandidateDetails.info.step1Status === 'COMPLETED' ? 'Confirmed & Checked In' : 'Pending Arrival'}</strong>
                    </div>
                    {activeCandidateDetails.candidate.supportStaffVerifiedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Photo Capture Date & Time:</span>
                        <strong className="font-mono text-[#3F3030]">
                          {new Date(activeCandidateDetails.candidate.supportStaffVerifiedAt).toLocaleString()}
                        </strong>
                      </div>
                    )}
                    {activeCandidateDetails.candidate.supportStaffVerifiedBy && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Staff / Member:</span>
                        <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.supportStaffVerifiedBy}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Activity:</span>
                      <span className="text-[#3F3030]">Candidate identity check against passport roster at intake desk.</span>
                    </div>
                  </div>

                  {/* Check-in Photo Preview */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                    {(activeCandidateDetails.candidate.passportVerificationPhoto || activeCandidateDetails.candidate.photoUrl) ? (
                      <div 
                        className="w-24 h-24 rounded-lg overflow-hidden border border-[#E8D9D2] cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewPhoto({
                          stageName: 'Step 1 – Check-in Photo',
                          photoType: 'Check-in Biometric Photo',
                          photoUrl: (activeCandidateDetails.candidate.passportVerificationPhoto || activeCandidateDetails.candidate.photoUrl)!,
                          captureDate: activeCandidateDetails.candidate.supportStaffConfirmationDate,
                          captureTime: activeCandidateDetails.candidate.supportStaffConfirmationTime,
                          performedBy: activeCandidateDetails.candidate.supportStaffVerifiedBy || 'Adel Al-Harbi (Reception Desk)'
                        })}
                      >
                        <img 
                          src={activeCandidateDetails.candidate.passportVerificationPhoto || activeCandidateDetails.candidate.photoUrl} 
                          alt="Check-in" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">No check-in photo recorded</span>
                    )}
                    <span className="text-[10px] text-[#806F6F] mt-1 font-semibold">Check-in Photo</span>
                  </div>
                </div>
              </div>

              {/* STEP 2: VERIFICATION */}
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeCandidateDetails.info.step2Status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      2
                    </span>
                    <strong className="text-xs text-[#3F3030]">Step 2 – Verification</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeCandidateDetails.info.step2Status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {activeCandidateDetails.info.step2Status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Verification Status:</span>
                      <strong className="text-[#3F3030]">
                        {activeCandidateDetails.candidate.passportMatchConfirmed ? 'CONFIRMED' : (activeCandidateDetails.candidate.supportStaffVerificationStatus || 'PENDING')}
                      </strong>
                    </div>
                    {activeCandidateDetails.candidate.enrolledAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Photo Capture Date & Time:</span>
                        <strong className="font-mono text-[#3F3030]">
                          {new Date(activeCandidateDetails.candidate.enrolledAt).toLocaleString()}
                        </strong>
                      </div>
                    )}
                    {activeCandidateDetails.candidate.enrolledBy && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Staff / Organizer:</span>
                        <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.enrolledBy}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Verification Decision:</span>
                      <span className="font-semibold text-emerald-800">
                        {activeCandidateDetails.candidate.passportMatchConfirmed ? 'Approved — Same Person' : 'Pending Confirmation'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Related Activity:</span>
                      <span className="text-[#3F3030]">Biometric photo matching and ID badge assignment.</span>
                    </div>
                  </div>

                  {/* Reference & Verification Photos */}
                  <div className="md:col-span-4 flex items-center justify-center gap-2 p-2 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8D9D2] cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewPhoto({
                          stageName: 'Step 2 – Reference Photo',
                          photoType: 'Passport Intake Reference',
                          photoUrl: (activeCandidateDetails.candidate.passportVerificationPhoto || activeCandidateDetails.candidate.photoUrl)!,
                          captureDate: activeCandidateDetails.candidate.registeredAt,
                          performedBy: 'Intake Desk'
                        })}
                      >
                        <img 
                          src={activeCandidateDetails.candidate.passportVerificationPhoto || activeCandidateDetails.candidate.photoUrl} 
                          alt="Ref" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[9px] text-[#806F6F] block mt-0.5">Reference</span>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden border border-emerald-300 cursor-pointer hover:scale-105 transition-transform ring-1 ring-emerald-400"
                        onClick={() => setPreviewPhoto({
                          stageName: 'Step 2 – Verification Capture',
                          photoType: 'Live Verification Photo',
                          photoUrl: (activeCandidateDetails.candidate.enrollmentPhoto || activeCandidateDetails.candidate.photoUrl)!,
                          captureDate: activeCandidateDetails.candidate.enrolledAt,
                          performedBy: activeCandidateDetails.candidate.enrolledBy || 'Khalid Al-Ghamdi (Organizer)'
                        })}
                      >
                        <img 
                          src={activeCandidateDetails.candidate.enrollmentPhoto || activeCandidateDetails.candidate.photoUrl} 
                          alt="Ver" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[9px] text-[#806F6F] block mt-0.5">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: CBT */}
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeCandidateDetails.info.step3Status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      3
                    </span>
                    <strong className="text-xs text-[#3F3030]">Step 3 – CBT</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeCandidateDetails.info.step3Status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {activeCandidateDetails.info.step3Status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">CBT Status:</span>
                      <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.cbtStatus || 'Pending'}</strong>
                    </div>
                    {activeCandidateDetails.candidate.cbtScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">CBT Score:</span>
                        <strong className="font-mono text-emerald-800 font-bold">{activeCandidateDetails.candidate.cbtScore}%</strong>
                      </div>
                    )}
                    {activeCandidateDetails.candidate.cbtConfirmedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Photo Capture Date & Time:</span>
                        <strong className="font-mono text-[#3F3030]">
                          {new Date(activeCandidateDetails.candidate.cbtConfirmedAt).toLocaleString()}
                        </strong>
                      </div>
                    )}
                    {activeCandidateDetails.candidate.cbtConfirmedBy && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">CBT Test Support:</span>
                        <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.cbtConfirmedBy}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Related Activity:</span>
                      <span className="text-[#3F3030]">Computer-Based Assessment submission at exam terminal.</span>
                    </div>
                  </div>

                  {/* CBT Photo Preview */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-2 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                    {activeCandidateDetails.candidate.cbtPhoto ? (
                      <div 
                        className="w-24 h-24 rounded-lg overflow-hidden border border-[#E8D9D2] cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewPhoto({
                          stageName: 'Step 3 – CBT Exam Photo',
                          photoType: 'Exam Terminal Live Capture',
                          photoUrl: activeCandidateDetails.candidate.cbtPhoto!,
                          captureDate: activeCandidateDetails.candidate.cbtConfirmationDate,
                          captureTime: activeCandidateDetails.candidate.cbtConfirmationTime,
                          performedBy: activeCandidateDetails.candidate.cbtConfirmedBy || 'Mira Tarabishi – CBT Assessor'
                        })}
                      >
                        <img src={activeCandidateDetails.candidate.cbtPhoto} alt="CBT" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">No CBT photo recorded</span>
                    )}
                    <span className="text-[10px] text-[#806F6F] mt-1 font-semibold">CBT Photo</span>
                  </div>
                </div>
              </div>

              {/* STEP 4: PRACTICAL ASSESSMENT */}
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeCandidateDetails.info.step4Status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      4
                    </span>
                    <strong className="text-xs text-[#3F3030]">Step 4 – Practical Assessment</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeCandidateDetails.info.step4Status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {activeCandidateDetails.info.step4Status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Practical Status:</span>
                      <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.practicalStatus || 'Pending'}</strong>
                    </div>
                    {activeCandidateDetails.candidate.practicalScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Practical Score:</span>
                        <strong className="font-mono text-purple-800 font-bold">{activeCandidateDetails.candidate.practicalScore}%</strong>
                      </div>
                    )}
                    {activeCandidateDetails.candidate.practicalConfirmedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#806F6F]">Photo Capture Date & Time:</span>
                        <strong className="font-mono text-[#3F3030]">
                          {new Date(activeCandidateDetails.candidate.practicalConfirmedAt).toLocaleString()}
                        </strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Assigned Assessor:</span>
                      <strong className="text-emerald-800 font-semibold">{activeCandidateDetails.candidate.assessorName || 'Eng. Fahad Al-Otaibi'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Evaluation Status:</span>
                      <span className="font-semibold text-[#7A2E3A]">
                        {activeCandidateDetails.candidate.status === 'EVALUATION_PENDING' ? 'Pending Assessor Upload' : (activeCandidateDetails.candidate.resultLocked ? 'Locked & Certified' : 'Completed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Related Activity:</span>
                      <span className="text-[#3F3030]">Practical workpiece execution and performance rubric evaluation.</span>
                    </div>
                  </div>

                  {/* Practical Photos Preview */}
                  <div className="md:col-span-4 flex items-center justify-center gap-2 p-2 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                    <div className="text-center">
                      {activeCandidateDetails.candidate.practicalPhoto1 ? (
                        <div 
                          className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8D9D2] cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setPreviewPhoto({
                            stageName: 'Step 4 – Practical Photo 1',
                            photoType: 'Workpiece Evidence Photo 1',
                            photoUrl: activeCandidateDetails.candidate.practicalPhoto1!,
                            captureDate: activeCandidateDetails.candidate.practicalConfirmationDate,
                            captureTime: activeCandidateDetails.candidate.practicalConfirmationTime,
                            performedBy: activeCandidateDetails.candidate.assessorName || 'Assessor'
                          })}
                        >
                          <img src={activeCandidateDetails.candidate.practicalPhoto1} alt="Pract 1" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-dashed border-stone-300 flex items-center justify-center text-[10px] text-stone-400">
                          Pending
                        </div>
                      )}
                      <span className="text-[9px] text-[#806F6F] block mt-0.5">Photo 1</span>
                    </div>

                    {activeCandidateDetails.candidate.practicalPhoto2 && (
                      <div className="text-center">
                        <div 
                          className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8D9D2] cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setPreviewPhoto({
                            stageName: 'Step 4 – Practical Photo 2',
                            photoType: 'Workpiece Evidence Photo 2',
                            photoUrl: activeCandidateDetails.candidate.practicalPhoto2!,
                            captureDate: activeCandidateDetails.candidate.practicalConfirmationDate,
                            captureTime: activeCandidateDetails.candidate.practicalConfirmationTime,
                            performedBy: activeCandidateDetails.candidate.assessorName || 'Assessor'
                          })}
                        >
                          <img src={activeCandidateDetails.candidate.practicalPhoto2} alt="Pract 2" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[9px] text-[#806F6F] block mt-0.5">Photo 2</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 5: EXIT */}
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeCandidateDetails.info.step5Status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      5
                    </span>
                    <strong className="text-xs text-[#3F3030]">Step 5 – Exit</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeCandidateDetails.info.step5Status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {activeCandidateDetails.info.step5Status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                  </span>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#806F6F]">Exit Status:</span>
                    <strong className="text-[#3F3030]">
                      {activeCandidateDetails.candidate.exitStatus === 'CONFIRMED' ? 'Confirmed & Checked Out' : 'Pending Exit Checkout'}
                    </strong>
                  </div>
                  {activeCandidateDetails.candidate.exitVerifiedAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Exit Date & Time:</span>
                      <strong className="font-mono text-[#3F3030]">
                        {new Date(activeCandidateDetails.candidate.exitVerifiedAt).toLocaleString()}
                      </strong>
                    </div>
                  )}
                  {activeCandidateDetails.candidate.exitVerifiedBy && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#806F6F]">Staff Name:</span>
                      <strong className="text-[#3F3030]">{activeCandidateDetails.candidate.exitVerifiedBy}</strong>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[#806F6F]">Exit Confirmation:</span>
                    <span className="text-[#3F3030]">
                      {activeCandidateDetails.candidate.exitNotes || 'Biometric identity match confirmed upon terminal departure.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCandidate(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* PHOTO & ACTIVITY TRACEABILITY ZOOM OVERLAY (Requirement 6) */}
      {previewPhoto && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          maxWidth="md"
          title={previewPhoto.stageName}
        >
          <div className="space-y-4">
            {/* Traceability Metadata Grid */}
            <div className="p-3 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[#806F6F] block">Photo Type:</span>
                <strong className="text-[#3F3030] block">{previewPhoto.photoType}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Performed By:</span>
                <strong className="text-[#3F3030] block">{previewPhoto.performedBy || 'Authorized Staff'}</strong>
              </div>
              {previewPhoto.captureDate && (
                <div>
                  <span className="text-[10px] text-[#806F6F] block">Capture Date:</span>
                  <span className="font-mono text-[#3F3030] block">{previewPhoto.captureDate}</span>
                </div>
              )}
              {previewPhoto.captureTime && (
                <div>
                  <span className="text-[10px] text-[#806F6F] block">Capture Time:</span>
                  <span className="font-mono text-[#3F3030] block">{previewPhoto.captureTime}</span>
                </div>
              )}
            </div>

            <div className="w-full h-80 bg-stone-100 rounded-xl overflow-hidden border border-[#E8D9D2] flex items-center justify-center">
              <img src={previewPhoto.photoUrl} alt="" className="w-full h-full object-contain" />
            </div>

            <div className="text-end">
              <Button variant="secondary" size="sm" onClick={() => setPreviewPhoto(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
