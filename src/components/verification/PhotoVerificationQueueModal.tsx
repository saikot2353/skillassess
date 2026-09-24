import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, 
  Camera, Eye, User, FileText, ArrowRight, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';
import { Candidate } from '../../types';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { AuditService } from '../../services/auditService';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

interface PhotoVerificationQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  centerId: string;
  onUpdated?: () => void;
}

export const PhotoVerificationQueueModal: React.FC<PhotoVerificationQueueModalProps> = ({
  isOpen,
  onClose,
  centerId,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [expelReason, setExpelReason] = useState('');
  const [isExpelling, setIsExpelling] = useState(false);

  // Load all candidates for this center needing photo review or paused
  const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
  const queueCandidates = allCandidates.filter(c => {
    if (c.centerId !== centerId) return false;
    if (c.isExpelled || c.status === 'EXPELLED') return false;
    // Candidates who are paused pending verification or have verification photos needing approval
    return (
      c.status === 'PAUSED_PENDING_VERIFICATION' ||
      c.status === 'PAUSED' ||
      c.supportStaffVerificationStatus === 'PENDING' ||
      (c.photoUrl && !c.passportMatchConfirmed) ||
      (c.practicalPhoto1 && c.practicalStatus === 'PENDING')
    );
  });

  const activeCandidate = selectedCandidate || queueCandidates[0] || null;

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
    const updatedCandidates = allCandidates.map(c => {
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
    AuditService.log(
      'APPROVE_PHOTO',
      'PHOTO_VERIFICATION',
      `Approved photo verification for candidate ${candidate.fullNameEn} (${candidate.aproReference}). Biometric status marked VERIFIED.`,
      candidate.id
    );

    showToast(isRTL ? 'تمت الموافقة على التحقق واعتماد المرشح بنجاح' : `Candidate ${candidate.fullNameEn} successfully verified & unpaused!`, 'success');
    if (onUpdated) onUpdated();
    if (queueCandidates.length <= 1) {
      onClose();
    } else {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidate(nextCand);
    }
  };

  const handleExpel = (candidate: Candidate) => {
    if (!expelReason.trim()) {
      showToast(isRTL ? 'يرجى كتابة سبب الاستبعاد' : 'Please provide an expulsion reason.', 'error');
      return;
    }

    const updatedCandidates = allCandidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'EXPELLED' as any,
          isPaused: false,
          isExpelled: true,
          expelledReason: expelReason.trim(),
          expelledAt: new Date().toISOString(),
          expelledBy: 'Center Admin',
          resultStatus: 'FAIL' as any,
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    AuditService.log(
      'EXPEL_CANDIDATE',
      'CANDIDATE_DISCIPLINARY',
      `Expelled candidate ${candidate.fullNameEn} (${candidate.aproReference}) from assessment. Reason: ${expelReason.trim()}`,
      candidate.id
    );

    showToast(isRTL ? 'تم استبعاد المرشح وإيقاف الاختبار' : `Candidate ${candidate.fullNameEn} has been expelled and blocked from all subsequent stages.`, 'warning');
    setIsExpelling(false);
    setExpelReason('');
    if (onUpdated) onUpdated();
    if (queueCandidates.length <= 1) {
      onClose();
    } else {
      const nextCand = queueCandidates.find(c => c.id !== candidate.id) || null;
      setSelectedCandidate(nextCand);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#A43950]" />
          <span>{isRTL ? 'طابور التحقق من الصور والمطابقة الحية' : 'Live Photo Verification & Audit Queue'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2]">
            {queueCandidates.length} {isRTL ? 'قيد المراجعة' : 'Pending'}
          </span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {queueCandidates.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#3F3030]">
              {isRTL ? 'طابور التحقق فارغ تماماً' : 'All Candidates Verified'}
            </h3>
            <p className="text-xs text-[#806F6F] max-w-sm mx-auto">
              {isRTL 
                ? 'لا توجد طلبات تحقق معلقة أو مرشحون متوقفون بانتظار المطابقة في هذا المركز حالياً.'
                : 'There are no pending photo verification flags or paused candidates requiring Center Admin review.'}
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              {isRTL ? 'إغلاق' : 'Close Queue'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Candidate List in Queue (4 cols) */}
            <div className="lg:col-span-4 border border-[#E8D9D2] rounded-xl bg-white p-3 space-y-2 max-h-[520px] overflow-y-auto">
              <div className="text-[11px] font-bold text-[#806F6F] uppercase tracking-wider px-1 pb-1 border-b border-[#E8D9D2] flex items-center justify-between">
                <span>{isRTL ? 'المرشحون المعلقون' : 'Candidates in Queue'}</span>
                <span className="font-mono text-[#A43950]">{queueCandidates.length}</span>
              </div>
              {queueCandidates.map(cand => {
                const isSelected = activeCandidate?.id === cand.id;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(cand);
                      setIsExpelling(false);
                      setExpelReason('');
                    }}
                    className={`w-full text-start p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                      isSelected 
                        ? 'border-[#A43950] bg-[#F8ECEE]/60 shadow-xs' 
                        : 'border-[#E8D9D2] hover:bg-[#FFFCF8]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0 mt-0.5">
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
                      <div className="text-[10px] text-[#806F6F] font-mono mt-0.5">
                        {cand.passportNumber}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={cand.status} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Side-by-Side Photo Comparison & Controls (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {activeCandidate && (
                <>
                  {/* Candidate Header Summary */}
                  <div className="p-3.5 rounded-xl border border-[#E8D9D2] bg-white flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-sm font-bold text-[#3F3030]">
                        {isRTL ? activeCandidate.fullNameAr : activeCandidate.fullNameEn}
                      </h4>
                      <p className="text-xs text-[#806F6F] mt-0.5 flex items-center gap-3">
                        <span>{isRTL ? 'المهنة:' : 'Occupation:'} <strong className="text-[#3F3030]">{activeCandidate.occupation}</strong></span>
                        <span>•</span>
                        <span>{isRTL ? 'جواز السفر:' : 'Passport:'} <strong className="font-mono text-[#3F3030]">{activeCandidate.passportNumber}</strong></span>
                      </p>
                    </div>
                    <div>
                      <StatusBadge status={activeCandidate.status} />
                    </div>
                  </div>

                  {/* Side-by-Side Photos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left: Step 1 Reference Photo */}
                    <div className="border border-[#E8D9D2] rounded-xl bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#C9A24D]" />
                          {isRTL ? 'صورة المرجع (الخطوة 1 - التحقق)' : 'Step 1 Reference Photo'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Baseline ID
                        </span>
                      </div>
                      <div className="w-full h-56 rounded-lg bg-stone-100 border border-[#E8D9D2] overflow-hidden flex items-center justify-center relative">
                        <img 
                          src={referencePhoto} 
                          alt="Reference" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-2 start-2 end-2 bg-black/60 backdrop-blur-xs text-white text-[10px] p-1.5 rounded text-center">
                          {isRTL ? 'صورة الهوية الوطنية / جواز السفر المسجل' : 'Primary Registered Passport Photo'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Current Step Captured Photo */}
                    <div className="border border-[#E8D9D2] rounded-xl bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3F3030] flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-[#A43950]" />
                          {isRTL ? 'الصورة الملتقطة للمرحلة الحالية' : 'Current Stage Captured Photo'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Live Capture
                        </span>
                      </div>
                      <div className="w-full h-56 rounded-lg bg-stone-100 border border-[#E8D9D2] overflow-hidden flex items-center justify-center relative">
                        <img 
                          src={currentStepPhoto} 
                          alt="Current Stage" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-2 start-2 end-2 bg-black/60 backdrop-blur-xs text-white text-[10px] p-1.5 rounded text-center">
                          {isRTL ? 'التقاط الكاميرا الميدانية في المحطة' : 'On-Site Terminal High-Resolution Capture'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expel Reason Section (if toggled) */}
                  {isExpelling && (
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{isRTL ? 'تأكيد استبعاد المرشح من التقييم' : 'Confirm Candidate Expulsion'}</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        {isRTL
                          ? 'سيتم حظر المرشح فوراً من جميع المراحل القادمة وتسجيل واقعة الاستبعاد وسجلات التدقيق الرسمية مع الاحتفاظ بالأدلة.'
                          : 'The candidate will be immediately disqualified and blocked from all remaining assessment stages. Evidence and audit records are permanently locked.'}
                      </p>
                      <input
                        type="text"
                        value={expelReason}
                        onChange={e => setExpelReason(e.target.value)}
                        placeholder={isRTL ? 'اكتب سبب الاستبعاد (مثال: عدم تطابق الهوية البيومترية أو محاولة انتحال شخصية)...' : 'Reason for expulsion (e.g. Biometric impersonation, severe safety violation)...'}
                        className="w-full text-xs bg-white border border-rose-300 rounded-lg p-2.5 focus:outline-none focus:border-rose-600"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => {
                            setIsExpelling(false);
                            setExpelReason('');
                          }}
                        >
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleExpel(activeCandidate)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isRTL ? 'تأكيد الاستبعاد وحظر المرشح' : 'Confirm Expulsion'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  {!isExpelling && (
                    <div className="p-3.5 rounded-xl border border-[#E8D9D2] bg-white flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setIsExpelling(true)}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>{isRTL ? 'استبعاد المرشح' : 'Expel Candidate'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>
                          {isRTL ? 'إغلاق' : 'Close'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(activeCandidate)}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        >
                          {isRTL ? 'اعتماد ومتابعة التقييم' : 'Approve & Advance'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
