import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, 
  Camera, Eye, User, FileText, ArrowRight, ShieldAlert, Sparkles, RefreshCw, Filter, Search,
  Clock, CheckSquare, Layers, UserCheck
} from 'lucide-react';
import { Candidate, Batch } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';

interface PhotoVerificationQueuePageProps {
  onNavigate?: (path: string) => void;
}

export const PhotoVerificationQueuePage: React.FC<PhotoVerificationQueuePageProps> = ({
  onNavigate,
}) => {
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

  const [activeTab, setActiveTab] = useState<'queue' | 'passed'>('queue');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [inspectingCandidate, setInspectingCandidate] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [expelReason, setExpelReason] = useState('');
  const [isExpelling, setIsExpelling] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<{ title: string; url: string } | null>(null);

  const reloadData = () => {
    const fresh = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    setCandidates(fresh);
    showToast(isRTL ? 'تم تحديث بيانات طابور التحقق' : 'Verification queue updated.', 'info');
  };

  // Center-filtered candidates
  const centerCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'GLOBAL_ADMIN') return true;
      return c.centerId === userCenterId;
    });
  }, [candidates, user, userCenterId]);

  // Center-filtered batches
  const centerBatches = useMemo(() => {
    return batches.filter(b => {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'GLOBAL_ADMIN') return true;
      return b.centerId === userCenterId;
    });
  }, [batches, user, userCenterId]);

  // Queue Candidates: Only candidates who need verification (and not expelled)
  const queueCandidates = useMemo(() => {
    return centerCandidates.filter(c => {
      if (c.isExpelled || c.status === 'EXPELLED') return false;

      const matchesBatch = selectedBatchId === 'ALL' || c.batchId === selectedBatchId;
      const matchesSearch = 
        !searchQuery ||
        c.fullNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.fullNameAr && c.fullNameAr.includes(searchQuery)) ||
        c.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const needsVerification = 
        c.status === 'PAUSED_PENDING_VERIFICATION' ||
        c.status === 'PAUSED' ||
        c.supportStaffVerificationStatus === 'PENDING' ||
        (c.photoUrl && !c.passportMatchConfirmed) ||
        (c.practicalPhoto1 && c.practicalStatus === 'PENDING');

      return matchesBatch && matchesSearch && needsVerification;
    });
  }, [centerCandidates, selectedBatchId, searchQuery]);

  // Passed Candidates: Candidates whose verification has been approved
  const passedCandidates = useMemo(() => {
    return centerCandidates.filter(c => {
      if (c.isExpelled || c.status === 'EXPELLED') return false;

      const matchesBatch = selectedBatchId === 'ALL' || c.batchId === selectedBatchId;
      const matchesSearch = 
        !searchQuery ||
        c.fullNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.fullNameAr && c.fullNameAr.includes(searchQuery)) ||
        c.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const isPassed = 
        c.passportMatchConfirmed === true ||
        c.supportStaffVerificationStatus === 'CONFIRMED' ||
        c.status === 'VERIFIED';

      return matchesBatch && matchesSearch && isPassed;
    });
  }, [centerCandidates, selectedBatchId, searchQuery]);

  // Selected candidate in detailed view
  const activeCandidate = useMemo(() => {
    if (inspectingCandidate) {
      return centerCandidates.find(c => c.id === inspectingCandidate.id) || inspectingCandidate;
    }
    if (selectedCandidateId) {
      const found = queueCandidates.find(c => c.id === selectedCandidateId);
      if (found) return found;
    }
    return queueCandidates[0] || null;
  }, [inspectingCandidate, selectedCandidateId, queueCandidates, centerCandidates]);

  // Helper to determine verification step
  const getVerificationStep = (cand: Candidate): string => {
    if (cand.practicalPhoto1 || cand.practicalStatus === 'PENDING' || cand.practicalStatus === 'COMPLETED') {
      return 'Step 4 – Practical Assessment';
    }
    if (cand.cbtPhoto || cand.cbtStatus === 'COMPLETED' || cand.cbtStatus === 'IN_PROGRESS') {
      return 'Step 3 – CBT';
    }
    if (cand.enrollmentPhoto || cand.enrollmentStatus === 'ENROLLED') {
      return 'Step 2 – Verification';
    }
    return 'Step 1 – Check-in';
  };

  // Helper to determine waiting time
  const getWaitingTime = (cand: Candidate): string => {
    if (cand.supportStaffVerifiedAt) {
      const mins = Math.max(2, Math.floor((Date.now() - new Date(cand.supportStaffVerifiedAt).getTime()) / (1000 * 60)));
      return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }
    if (cand.registeredAt) {
      const mins = Math.max(5, Math.floor((Date.now() - new Date(cand.registeredAt).getTime()) / (1000 * 60)) % 120);
      return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }
    return '14m';
  };

  // Helper to determine flagged by
  const getFlaggedBy = (cand: Candidate): string => {
    if (cand.supportStaffVerifiedBy) return cand.supportStaffVerifiedBy;
    if (cand.enrolledBy) return `${cand.enrolledBy} (Organizer)`;
    return 'Biometric Guard (Automated)';
  };

  // Reference photo (Step 1 Entry / Passport photo)
  const getReferencePhoto = (cand: Candidate | null): string => {
    return cand?.passportVerificationPhoto || cand?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
  };

  // Current Step photo
  const getCurrentStepPhoto = (cand: Candidate | null): string => {
    return (
      cand?.practicalPhoto1 || 
      cand?.practicalPhoto2 || 
      cand?.cbtPhoto || 
      cand?.enrollmentPhoto || 
      cand?.photoUrl ||
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'
    );
  };

  const handleApprove = (candidate: Candidate) => {
    const approvalTime = new Date().toISOString();
    const updatedCandidates = candidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'VERIFIED' as any,
          isPaused: false,
          pauseReason: undefined,
          passportMatchConfirmed: true,
          supportStaffVerificationStatus: 'CONFIRMED' as any,
          supportStaffVerifiedAt: approvalTime,
          supportStaffVerifiedBy: user?.name || 'Center Assessment Director',
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    setCandidates(updatedCandidates);

    AuditService.log(
      'APPROVE_PHOTO',
      'PHOTO_VERIFICATION',
      `Approved photo verification (Same Person) for candidate ${candidate.fullNameEn} (Passport: ${candidate.passportNumber}). Biometric status marked VERIFIED by ${user?.name || 'Center Admin'}.`,
      candidate.id
    );

    showToast(
      isRTL 
        ? 'تمت الموافقة على التحقق من الصورة واعتماد المرشح بنجاح' 
        : `Approved: ${candidate.fullNameEn} verified as Same Person & moved to Passed!`, 
      'success'
    );

    // Close inspection modal if open
    setInspectingCandidate(null);

    // Switch or reset selection
    if (queueCandidates.length > 1) {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidateId(nextCand ? nextCand.id : null);
    } else {
      setSelectedCandidateId(null);
    }
  };

  const handleExpel = (candidate: Candidate) => {
    if (!expelReason.trim()) {
      showToast(isRTL ? 'يرجى كتابة سبب الاستبعاد الإلزامي' : 'Please provide a mandatory expulsion reason.', 'error');
      return;
    }

    const expelTime = new Date().toISOString();
    const updatedCandidates = candidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'EXPELLED' as any,
          isPaused: false,
          isExpelled: true,
          expelledReason: expelReason.trim(),
          expelledAt: expelTime,
          expelledBy: user?.name || 'Center Admin',
          resultStatus: 'FAIL' as any,
          resultLocked: true,
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    setCandidates(updatedCandidates);

    AuditService.log(
      'EXPEL_CANDIDATE',
      'CANDIDATE_DISCIPLINARY',
      `Expelled candidate ${candidate.fullNameEn} (Passport: ${candidate.passportNumber}) from assessment. Impersonation / Facial mismatch detected. Reason: ${expelReason.trim()}`,
      candidate.id
    );

    showToast(
      isRTL 
        ? 'تم استبعاد المرشح وإيقاف الاختبار وتوثيق ذلك في سجل التدقيق' 
        : `Candidate ${candidate.fullNameEn} has been expelled and permanently disqualified.`, 
      'warning'
    );

    setIsExpelling(false);
    setExpelReason('');
    setInspectingCandidate(null);

    if (queueCandidates.length > 1) {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidateId(nextCand ? nextCand.id : null);
    } else {
      setSelectedCandidateId(null);
    }
  };

  const tabs = [
    {
      id: 'queue',
      label: isRTL ? 'طابور التحقق' : 'Verification Queue',
      count: queueCandidates.length,
    },
    {
      id: 'passed',
      label: isRTL ? 'المعتمدون' : 'Passed',
      count: passedCandidates.length,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <ShieldCheck className="w-6 h-6 text-[#A43950]" />
            <span>{isRTL ? 'طابور التحقق من الصور' : 'Verification Queue'}</span>
          </div>
        }
        subtitle={
          isRTL
            ? 'مراجعة وتدقيق المطابقة الحية لصور المرشحين واعتماد الهوية البيومترية وفق معايير الحوكمة'
            : 'Center biometric audit console for side-by-side candidate photo verification & fraud prevention'
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: isRTL ? 'طابور التحقق' : 'Verification Queue' },
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

      {/* Top Filter and Batch Selection Bar */}
      <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Batch Selection Dropdown */}
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-[#A43950] shrink-0" />
          <span className="text-xs font-bold text-[#3F3030] shrink-0">
            {isRTL ? 'تصفية حسب الدفعة:' : 'Select Batch:'}
          </span>
          <select
            value={selectedBatchId}
            onChange={e => setSelectedBatchId(e.target.value)}
            className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg py-2 px-3 font-semibold text-[#3F3030] focus:outline-none focus:border-[#A43950] min-w-[220px]"
          >
            <option value="ALL">{isRTL ? 'جميع الدفعات (All Batches)' : 'All Available Batches'}</option>
            {centerBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.occupation}
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
            placeholder={isRTL ? 'بحث بالاسم أو رقم جواز السفر...' : 'Search candidate name or passport...'}
            className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg ps-9 pe-3 py-2 text-[#3F3030] focus:outline-none focus:border-[#A43950]"
          />
        </div>
      </div>

      {/* Tabs: Queue & Passed */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* TAB 1: PENDING QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queueCandidates.length === 0 ? (
            <div className="p-12 rounded-xl border border-[#E8D9D2] bg-white shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#3F3030]">
                {isRTL ? 'طابور التحقق خالٍ تماماً' : 'Verification Queue is Clean'}
              </h3>
              <p className="text-xs text-[#806F6F] max-w-md mx-auto">
                {isRTL
                  ? 'جميع صور المرشحين معتمدة ومطابقة ولا يوجد أي مرشح متوقف بانتظار التدقيق البيومتري في هذه الدفعة.'
                  : 'All candidate photos for this selection have been verified. There are no pending verification backlogs.'}
              </p>
            </div>
          ) : (
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {isRTL ? 'قائمة المرشحين بانتظار التحقق من الصور' : 'Pending Verification Queue'}
                  </h4>
                  <p className="text-[11px] text-[#806F6F] mt-0.5">
                    {isRTL ? 'انقر على أي مرشح لفتح شاشة المطابقة الثنائية المباشرة' : 'Click on any candidate to inspect side-by-side photos and make a verification decision.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
                  {queueCandidates.length} Pending
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">Candidate</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Passport No.</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Verification Step</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Flagged By</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Waiting Time</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Status</th>
                      <th className="py-2.5 px-3 text-end font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {queueCandidates.map(cand => {
                      const step = getVerificationStep(cand);
                      const waitingTime = getWaitingTime(cand);
                      const flaggedBy = getFlaggedBy(cand);
                      const batch = batches.find(b => b.id === cand.batchId);
                      const entryPhoto = getReferencePhoto(cand);
                      const currentPhoto = getCurrentStepPhoto(cand);

                      return (
                        <tr 
                          key={cand.id}
                          className="hover:bg-[#FFFCF8] transition-colors cursor-pointer"
                          onClick={() => {
                            setInspectingCandidate(cand);
                            setIsExpelling(false);
                            setExpelReason('');
                          }}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0">
                                <img src={currentPhoto} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <strong className="text-xs text-[#3F3030] block">
                                  {isRTL ? cand.fullNameAr : cand.fullNameEn}
                                </strong>
                                <span className="text-[10px] text-[#806F6F] font-mono">
                                  {batch ? batch.batchNumber : cand.batchId} • {cand.occupation}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                            {cand.passportNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                              <Camera className="w-3 h-3 text-[#A43950]" />
                              {step}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#806F6F]">
                            {flaggedBy}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-800 font-semibold">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {waitingTime}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              PENDING REVIEW
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setInspectingCandidate(cand);
                                  setIsExpelling(false);
                                  setExpelReason('');
                                }}
                                leftIcon={<Eye className="w-3.5 h-3.5 text-[#A43950]" />}
                              >
                                {isRTL ? 'فحص ومطابقة' : 'Review & Decision'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASSED VERIFICATIONS */}
      {activeTab === 'passed' && (
        <div className="space-y-4">
          {passedCandidates.length === 0 ? (
            <div className="p-12 rounded-xl border border-[#E8D9D2] bg-white shadow-xs text-center space-y-2">
              <span className="text-3xl">📋</span>
              <h3 className="text-sm font-bold text-[#3F3030]">No Passed Verifications Yet</h3>
              <p className="text-xs text-[#806F6F]">
                Candidates approved via &ldquo;Approve — Same Person&rdquo; will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {isRTL ? 'سجل المرشحين المعتمدين بيومترياً' : 'Approved Biometric Verifications'}
                  </h4>
                  <p className="text-[11px] text-[#806F6F] mt-0.5">
                    {isRTL ? 'قائمة المرشحين الذين تمت مطابقة صورهم واعتمادهم بنجاح' : 'Candidates whose identity has been verified and confirmed as the Same Person.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {passedCandidates.length} Approved
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Passport Number</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Verification Step</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Reference Photo</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Verified Photo</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Approved By</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Approval Date & Time</th>
                      <th className="py-2.5 px-3 text-end font-semibold">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {passedCandidates.map(cand => {
                      const step = getVerificationStep(cand);
                      const batch = batches.find(b => b.id === cand.batchId);
                      const refPhoto = getReferencePhoto(cand);
                      const verPhoto = getCurrentStepPhoto(cand);
                      const approvedBy = cand.supportStaffVerifiedBy || 'Center Assessment Director';
                      const approvedTime = cand.supportStaffVerifiedAt 
                        ? new Date(cand.supportStaffVerifiedAt).toLocaleString() 
                        : (cand.registeredAt ? new Date(cand.registeredAt).toLocaleString() : 'Today, 10:15 AM');

                      return (
                        <tr key={cand.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                            {isRTL ? cand.fullNameAr : cand.fullNameEn}
                            <span className="block text-[10px] text-[#806F6F] font-normal">{cand.occupation}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                            {cand.passportNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">
                            {batch ? batch.batchNumber : cand.batchId}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                              {step}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl({ title: `Reference: ${cand.fullNameEn}`, url: refPhoto })}
                              className="w-8 h-8 rounded-lg border border-[#E8D9D2] overflow-hidden hover:scale-105 transition-transform inline-block"
                              title="Click to zoom reference photo"
                            >
                              <img src={refPhoto} alt="" className="w-full h-full object-cover" />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl({ title: `Verified Capture: ${cand.fullNameEn}`, url: verPhoto })}
                              className="w-8 h-8 rounded-lg border border-emerald-300 overflow-hidden hover:scale-105 transition-transform inline-block ring-1 ring-emerald-400"
                              title="Click to zoom verified capture"
                            >
                              <img src={verPhoto} alt="" className="w-full h-full object-cover" />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-[#3F3030]">
                            <span className="font-semibold text-emerald-800">{approvedBy}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#806F6F]">
                            {approvedTime}
                          </td>
                          <td className="py-2.5 px-3 text-end">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PASSED</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CANDIDATE VERIFICATION DETAILS MODAL (SIDE-BY-SIDE INSPECTION) */}
      {inspectingCandidate && (
        <Modal
          isOpen={true}
          onClose={() => {
            setInspectingCandidate(null);
            setIsExpelling(false);
            setExpelReason('');
          }}
          maxWidth="2xl"
          title={
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-[#A43950]" />
              <span>{isRTL ? 'التدقيق البيومتري المباشر والمطابقة الثنائية' : 'Side-by-Side Biometric Verification'}</span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Candidate Metadata Banner */}
            <div className="p-3.5 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#806F6F] block">Candidate Name:</span>
                <strong className="text-[#3F3030] block truncate">{inspectingCandidate.fullNameEn}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Passport Number:</span>
                <strong className="font-mono text-[#7A2E3A] block">{inspectingCandidate.passportNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Batch Number:</span>
                <strong className="font-mono text-[#3F3030] block">
                  {batches.find(b => b.id === inspectingCandidate.batchId)?.batchNumber || inspectingCandidate.batchId}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Verification Step:</span>
                <span className="font-semibold text-[#A43950] block">{getVerificationStep(inspectingCandidate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Flagged By:</span>
                <strong className="text-[#3F3030] block">{getFlaggedBy(inspectingCandidate)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Waiting Time:</span>
                <strong className="font-mono text-amber-800 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {getWaitingTime(inspectingCandidate)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Date & Time:</span>
                <span className="font-mono text-[11px] text-[#3F3030] block">
                  {inspectingCandidate.supportStaffVerifiedAt 
                    ? new Date(inspectingCandidate.supportStaffVerifiedAt).toLocaleString() 
                    : new Date().toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">Assigned Assessor / Staff:</span>
                <strong className="text-[#3F3030] block truncate">
                  {inspectingCandidate.assessorName || inspectingCandidate.enrolledBy || 'Assigned Assessor'}
                </strong>
              </div>
            </div>

            {/* Side-by-Side Photos Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo 1: Reference Photo */}
              <div className="border border-[#E8D9D2] rounded-xl bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C9A24D]" />
                    <span>Reference / Previous Step Photo</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                    Intake Master
                  </span>
                </div>

                <div 
                  className="aspect-4/3 w-full bg-stone-100 rounded-lg overflow-hidden border border-[#E8D9D2] relative cursor-pointer group"
                  onClick={() => setPreviewPhotoUrl({ title: 'Reference Photo', url: getReferencePhoto(inspectingCandidate) })}
                >
                  <img 
                    src={getReferencePhoto(inspectingCandidate)} 
                    alt="Reference Master" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono">
                    Official Passport Record
                  </div>
                </div>
                <p className="text-[10px] text-[#806F6F]">
                  Captured at initial intake / passport matching gate.
                </p>
              </div>

              {/* Photo 2: New Verification Photo */}
              <div className="border border-[#E8D9D2] rounded-xl bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#A43950]" />
                    <span>New Verification Photo</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
                    Current Step Live
                  </span>
                </div>

                <div 
                  className="aspect-4/3 w-full bg-stone-100 rounded-lg overflow-hidden border border-[#E8D9D2] relative cursor-pointer group"
                  onClick={() => setPreviewPhotoUrl({ title: 'New Verification Capture', url: getCurrentStepPhoto(inspectingCandidate) })}
                >
                  <img 
                    src={getCurrentStepPhoto(inspectingCandidate)} 
                    alt="Live Verification Snapshot" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono">
                    Station Camera Capture
                  </div>
                </div>
                <p className="text-[10px] text-[#806F6F]">
                  Biometric snapshot taken during assessment progression.
                </p>
              </div>
            </div>

            {/* Decision Controls */}
            {!isExpelling ? (
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsExpelling(true)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Expel Candidate</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInspectingCandidate(null)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleApprove(inspectingCandidate)}
                    leftIcon={<ShieldCheck className="w-4 h-4 text-white" />}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Approve — Same Person
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>Confirm Disqualification & Expulsion</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExpelling(false)}
                    className="text-xs text-stone-500 hover:text-stone-800"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  value={expelReason}
                  onChange={e => setExpelReason(e.target.value)}
                  placeholder="Provide mandatory legal/governance reason for expulsion (e.g. Facial geometry mismatch, proxy test taker detected)..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-rose-300 bg-white text-[#3F3030] focus:outline-none focus:border-rose-600"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsExpelling(false)}
                  >
                    Back
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleExpel(inspectingCandidate)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white transition-colors"
                  >
                    Confirm Permanent Expulsion
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Photo Zoom Overlay */}
      {previewPhotoUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewPhotoUrl(null)}
          title={previewPhotoUrl.title}
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="w-full h-80 bg-stone-100 rounded-xl overflow-hidden border border-[#E8D9D2] flex items-center justify-center">
              <img src={previewPhotoUrl.url} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="text-end">
              <Button variant="secondary" size="sm" onClick={() => setPreviewPhotoUrl(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
