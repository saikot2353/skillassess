import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, 
  Camera, Eye, User, FileText, ArrowRight, ShieldAlert, Sparkles, RefreshCw, Filter, Search
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

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [expelReason, setExpelReason] = useState('');
  const [isExpelling, setIsExpelling] = useState(false);

  const reloadData = () => {
    const fresh = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    setCandidates(fresh);
  };

  // Candidates for this center who are in the verification queue or paused
  const centerCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'GLOBAL_ADMIN') return true;
      return c.centerId === userCenterId;
    });
  }, [candidates, user, userCenterId]);

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

  const activeCandidate = useMemo(() => {
    if (selectedCandidateId) {
      const found = queueCandidates.find(c => c.id === selectedCandidateId);
      if (found) return found;
    }
    return queueCandidates[0] || null;
  }, [selectedCandidateId, queueCandidates]);

  // Determine Reference photo (Step 1 Entry / Passport photo)
  const referencePhoto = activeCandidate?.passportVerificationPhoto || activeCandidate?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
  
  // Determine Current Step photo
  const currentStepPhoto = 
    activeCandidate?.practicalPhoto1 || 
    activeCandidate?.practicalPhoto2 || 
    activeCandidate?.cbtPhoto || 
    activeCandidate?.enrollmentPhoto || 
    activeCandidate?.photoUrl ||
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80';

  const handleApprove = (candidate: Candidate) => {
    const updatedCandidates = candidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'VERIFIED' as any,
          isPaused: false,
          pauseReason: undefined,
          passportMatchConfirmed: true,
          supportStaffVerificationStatus: 'CONFIRMED' as any,
          supportStaffVerifiedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    setCandidates(updatedCandidates);

    AuditService.log(
      'APPROVE_PHOTO',
      'PHOTO_VERIFICATION',
      `Approved photo verification for candidate ${candidate.fullNameEn} (Passport: ${candidate.passportNumber}). Biometric status marked VERIFIED.`,
      candidate.id
    );

    showToast(
      isRTL 
        ? 'تمت الموافقة على التحقق من الصورة واعتماد المرشح بنجاح' 
        : `Candidate ${candidate.fullNameEn} successfully verified & unpaused!`, 
      'success'
    );

    if (queueCandidates.length > 1) {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidateId(nextCand ? nextCand.id : null);
    } else {
      setSelectedCandidateId(null);
    }
  };

  const handleExpel = (candidate: Candidate) => {
    if (!expelReason.trim()) {
      showToast(isRTL ? 'يرجى كتابة سبب الاستبعاد' : 'Please provide a mandatory expulsion reason.', 'error');
      return;
    }

    const updatedCandidates = candidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'EXPELLED' as any,
          isPaused: false,
          isExpelled: true,
          expelledReason: expelReason.trim(),
          expelledAt: new Date().toISOString(),
          expelledBy: user?.name || 'Center Admin',
          resultStatus: 'FAIL' as any,
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    setCandidates(updatedCandidates);

    AuditService.log(
      'EXPEL_CANDIDATE',
      'CANDIDATE_DISCIPLINARY',
      `Expelled candidate ${candidate.fullNameEn} (Passport: ${candidate.passportNumber}) from assessment. Reason: ${expelReason.trim()}`,
      candidate.id
    );

    showToast(
      isRTL 
        ? 'تم استبعاد المرشح وإيقاف الاختبار وتوثيق ذلك في سجل التدقيق' 
        : `Candidate ${candidate.fullNameEn} has been expelled and blocked from all assessment stages.`, 
      'warning'
    );

    setIsExpelling(false);
    setExpelReason('');

    if (queueCandidates.length > 1) {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidateId(nextCand ? nextCand.id : null);
    } else {
      setSelectedCandidateId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{isRTL ? 'طابور التحقق من الصور' : 'Photo Verification Queue'}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
              {queueCandidates.length} {isRTL ? 'معلق في الطابور' : 'Pending in Queue'}
            </span>
          </div>
        }
        subtitle={
          isRTL
            ? 'مراجعة وتدقيق المطابقة الحية لصور المرشحين واعتماد الهوية البيومترية قبل التقييم'
            : 'Operational side-by-side biometric audit console for live candidate verification'
        }
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#806F6F] font-medium shrink-0">
              {isRTL ? 'الدفعة:' : 'Batch:'}
            </span>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-2 px-3 font-semibold text-[#3F3030] focus:outline-none focus:border-[#A43950]"
            >
              <option value="ALL">{isRTL ? 'جميع الدفعات' : 'All Batches'}</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} - {b.occupation}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
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
              ? 'جميع صور المرشحين معتمدة ومطابقة ولا يوجد أي مرشح متوقف بانتظار التدقيق البيومتري.'
              : 'All candidates in this center are fully verified. There are no photo review backlogs or paused records.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Candidate Queue List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] bg-white flex items-center justify-between">
                <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  {isRTL ? 'قائمة المراجعة' : 'Candidate Queue'} ({queueCandidates.length})
                </span>
                <span className="text-[10px] text-[#806F6F]">
                  {isRTL ? 'انقر للمطابقة' : 'Select to inspect'}
                </span>
              </div>

              <div className="divide-y divide-[#E8D9D2] max-h-[600px] overflow-y-auto">
                {queueCandidates.map(cand => {
                  const isSelected = activeCandidate?.id === cand.id;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidateId(cand.id);
                        setIsExpelling(false);
                        setExpelReason('');
                      }}
                      className={`w-full text-start p-3 transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-[#F8ECEE]/60 border-s-4 border-[#A43950]' 
                          : 'bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0 mt-0.5">
                        <img 
                          src={cand.photoUrl || referencePhoto} 
                          alt={cand.fullNameEn} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#3F3030] truncate">
                          {isRTL ? cand.fullNameAr : cand.fullNameEn}
                        </div>
                        <div className="text-[11px] text-[#806F6F] font-mono mt-0.5">
                          {cand.passportNumber}
                        </div>
                        <div className="text-[10px] text-[#806F6F] mt-0.5 truncate">
                          {cand.occupation}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <StatusBadge status={cand.status} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Biometric Audit & Comparison Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeCandidate && (
              <div className="border border-[#E8D9D2] rounded-xl bg-white p-5 shadow-xs space-y-5">
                {/* Active Candidate Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D9D2] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#3F3030]">
                      {isRTL ? activeCandidate.fullNameAr : activeCandidate.fullNameEn}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#806F6F] mt-1 flex-wrap">
                      <span>{isRTL ? 'المهنة:' : 'Occupation:'} <strong className="text-[#3F3030]">{activeCandidate.occupation}</strong></span>
                      <span>•</span>
                      <span>{isRTL ? 'جواز السفر:' : 'Passport:'} <strong className="font-mono text-[#3F3030]">{activeCandidate.passportNumber}</strong></span>
                      <span>•</span>
                      <span>{isRTL ? 'الدفعة:' : 'Batch:'} <strong className="font-mono text-[#7A2E3A]">{activeCandidate.batchId}</strong></span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={activeCandidate.status} />
                  </div>
                </div>

                {/* Side-by-Side Photos Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo 1: Step 1 Official Reference / Passport Photo */}
                  <div className="border border-[#E8D9D2] rounded-xl bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#C9A24D]" />
                        <span>{isRTL ? 'الصورة المرجعية (جواز السفر / التسجيل)' : 'Reference / Passport Photo'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                        Step 1 Master
                      </span>
                    </div>

                    <div className="aspect-4/3 w-full bg-stone-100 rounded-lg overflow-hidden border border-[#E8D9D2] relative">
                      <img 
                        src={referencePhoto} 
                        alt="Reference Portrait" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        Official Passport Record
                      </div>
                    </div>

                    <div className="text-[11px] text-[#806F6F] bg-stone-50 p-2 rounded-md">
                      {isRTL
                        ? 'الصورة المعتمدة عند تسجيل المرشح ومطابقة وثيقة السفر الرسمية.'
                        : 'Official identity photo archived during reception and passport intake.'}
                    </div>
                  </div>

                  {/* Photo 2: Live Assessment Capture Photo */}
                  <div className="border border-[#E8D9D2] rounded-xl bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#A43950]" />
                        <span>{isRTL ? 'صورة التحقق الحية (مرحلة التقييم)' : 'Current Step Live Capture'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
                        Live Camera
                      </span>
                    </div>

                    <div className="aspect-4/3 w-full bg-stone-100 rounded-lg overflow-hidden border border-[#E8D9D2] relative">
                      <img 
                        src={currentStepPhoto} 
                        alt="Current Live Capture" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        Stage: Practical / Verification
                      </div>
                    </div>

                    <div className="text-[11px] text-[#806F6F] bg-stone-50 p-2 rounded-md">
                      {isRTL
                        ? 'الصورة الحية الملتقطة عبر كاميرا المحطة للتحقق من هوية الحاضر الفعلي.'
                        : 'Biometric snapshot captured in real-time by the test station webcam.'}
                    </div>
                  </div>
                </div>

                {/* Audit Inspection Checklist Notice */}
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>{isRTL ? 'إرشادات التدقيق والمطابقة' : 'Center Admin Verification Guideline'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isRTL
                      ? 'يرجى التأكد من تطابق الملامح الأساسية للوجه بين الصورة المرجعية والصورة الحية. عند الشك في محاولة انتحال شخصية، انقر على خيار الاستبعاد واذكر السبب النظامي.'
                      : 'Carefully compare facial biometric alignment between the official intake photo and the live capture. If an impersonation attempt is confirmed, select Expel Candidate with mandatory justification.'}
                  </p>
                </div>

                {/* Action Controls */}
                <div className="pt-2">
                  {!isExpelling ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsExpelling(true)}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>{isRTL ? 'استبعاد المرشح (عدم مطابقة)' : 'Expel Candidate (Fraud / Discrepancy)'}</span>
                      </button>

                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleApprove(activeCandidate)}
                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                      >
                        {isRTL ? 'اعتماد ومطابقة الصورة (Approve)' : 'Approve & Mark Verified'}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          <span>{isRTL ? 'تأكيد استبعاد المرشح' : 'Confirm Candidate Expulsion'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsExpelling(false)}
                          className="text-xs text-stone-500 hover:text-stone-800"
                        >
                          {t.common.cancel}
                        </button>
                      </div>

                      <textarea
                        value={expelReason}
                        onChange={e => setExpelReason(e.target.value)}
                        placeholder={isRTL ? 'يرجى كتابة سبب الاستبعاد الإلزامي...' : 'Provide mandatory justification (e.g., Facial mismatch, impersonation suspected)...'}
                        rows={3}
                        className="w-full text-xs p-2.5 rounded-lg border border-rose-200 bg-white focus:outline-none focus:border-rose-500 text-[#3F3030]"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsExpelling(false)}
                        >
                          {t.common.cancel}
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleExpel(activeCandidate)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{isRTL ? 'تأكيد الاستبعاد النهائي' : 'Confirm Expulsion'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
