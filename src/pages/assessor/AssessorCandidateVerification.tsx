import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, AuditLog } from '../../types';
import {
  UserCheck,
  Search,
  Scan,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Camera,
  PlayCircle,
  FileCheck,
  RefreshCw,
  Award,
  Clock,
  UserX
} from 'lucide-react';

interface AssessorCandidateVerificationProps {
  onNavigate?: (path: string) => void;
}

export const AssessorCandidateVerification: React.FC<AssessorCandidateVerificationProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [matchedCandidate, setMatchedCandidate] = useState<Candidate | null>(null);
  const [unauthorizedCandidate, setUnauthorizedCandidate] = useState<Candidate | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Verification checkboxes
  const [passportVerified, setPassportVerified] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [attendanceSigned, setAttendanceSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    // Check if query parameter exists
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    if (query) {
      setSearchQuery(query);
      performLookup(query);
    }
  }, []);

  const performLookup = (query: string) => {
    if (!query.trim()) return;

    setNotFound(false);
    setUnauthorizedCandidate(null);
    setMatchedCandidate(null);
    setVerifiedSuccess(false);

    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const cleanQuery = query.trim().toLowerCase();

    const found = allCandidates.find((c: Candidate) => 
      c.passportNumber.toLowerCase() === cleanQuery ||
      c.aproReference.toLowerCase() === cleanQuery ||
      c.id.toLowerCase() === cleanQuery ||
      c.fullNameEn.toLowerCase().includes(cleanQuery)
    );

    if (!found) {
      setNotFound(true);
      return;
    }

    // Security Check: Is candidate assigned to this assessor?
    const isAssignedToMe = found.assessorId === user?.id || (user?.role === 'ASSESSOR' && !found.assessorId && found.centerId === user?.centerId);

    if (!isAssignedToMe) {
      setUnauthorizedCandidate(found);
      return;
    }

    setMatchedCandidate(found);
    // If already verified or further in pipeline, check default boxes
    if (found.status !== 'ASSIGNED') {
      setPassportVerified(true);
      setBiometricVerified(true);
      setAttendanceSigned(true);
    } else {
      setPassportVerified(false);
      setBiometricVerified(false);
      setAttendanceSigned(false);
    }
  };

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // Pick an assigned candidate for demonstration
      const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const myCandidates = allCandidates.filter((c: Candidate) => c.assessorId === user?.id);
      const target = myCandidates.find((c: Candidate) => c.status === 'ASSIGNED') || myCandidates[0] || allCandidates[0];
      
      if (target) {
        setSearchQuery(target.passportNumber);
        performLookup(target.passportNumber);
        showToast('Passport scanner read barcode successfully', 'success');
      }
    }, 1600);
  };

  const handleConfirmVerification = () => {
    if (!matchedCandidate || !user) return;
    setIsSubmitting(true);

    setTimeout(() => {
      // 1. Update candidate status to VERIFIED (if ASSIGNED)
      const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const updatedCandidates = allCandidates.map((c: Candidate) => {
        if (c.id === matchedCandidate.id) {
          return {
            ...c,
            status: c.status === 'ASSIGNED' ? ('VERIFIED' as const) : c.status,
            enrolledAt: c.enrolledAt || new Date().toISOString()
          };
        }
        return c;
      });

      storageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);

      // 2. Add audit log
      const auditLogs = storageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
      const newAuditLog: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'CANDIDATE_VERIFICATION' as any,
        entity: 'Candidate Verification Desk',
        details: `Assessor verified passport and biometric identity for candidate ${matchedCandidate.fullNameEn} (${matchedCandidate.aproReference}).`,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.14',
        status: 'SUCCESS'
      };
      storageService.set(STORAGE_KEYS.AUDIT_LOGS, [newAuditLog, ...auditLogs]);

      setMatchedCandidate({
        ...matchedCandidate,
        status: matchedCandidate.status === 'ASSIGNED' ? 'VERIFIED' : matchedCandidate.status
      });

      setIsSubmitting(false);
      setVerifiedSuccess(true);
      showToast(isRTL ? 'تم التحقق من هوية المرشح بنجاح' : 'Candidate identity verified successfully', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <ShieldCheck className="w-4 h-4 text-[#7A2E3A]" />
          <span>{isRTL ? 'التحقق ومطابقة الهوية' : 'Identity Verification Desk'}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#3F3030]">
          {isRTL ? 'التحقق من هوية المرشح ومطابقة الجواز' : 'Candidate Identity Verification & Biometric Match'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isRTL
            ? 'مسح جواز السفر، التحقق من الوجه والتأكد من تعيين المرشح لمحطة التقييم الخاصة بك وفق القرعة المعتمدة.'
            : 'Scan physical passport, cross-check facial features, and authorize candidate entry to workshop practical station.'}
        </p>
      </div>

      {/* Lookup & Scanner Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8D9D2] shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Scan className="w-4 h-4 text-[#7A2E3A]" />
          <span>{isRTL ? 'البحث عن المرشح أو مسح وثيقة السفر' : 'Lookup Candidate or Scan Travel Document'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isRTL ? 'رقم جواز السفر أو الرقم المرجعي APRO' : 'Passport Number or APRO Reference ID'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={isRTL ? 'مثال: FA8872190 أو APRO-SA-92813...' : 'e.g. FA8872190 or APRO-SA-92813...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && performLookup(searchQuery)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs font-mono border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
                />
              </div>
              <button
                type="button"
                onClick={() => performLookup(searchQuery)}
                className="px-5 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-colors shadow-sm"
              >
                {isRTL ? 'بحث' : 'Lookup'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isRTL ? 'الماسح الضوئي الذكي' : 'Automated Barcode / OCR'}
            </label>
            <button
              type="button"
              disabled={isScanning}
              onClick={handleSimulatedScan}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 text-indigo-900 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>{isRTL ? 'جارٍ مسح الجواز...' : 'Scanning Document...'}</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 text-indigo-600" />
                  <span>{isRTL ? 'تشغيل الماسح الضوئي' : 'Trigger Hardware Scanner'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanner animation simulation */}
        {isScanning && (
          <div className="mt-4 p-4 rounded-xl bg-gray-900 text-white flex items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent animate-pulse" />
            <Camera className="w-5 h-5 text-emerald-400 animate-bounce" />
            <span className="text-xs font-mono tracking-wider text-emerald-300">
              SCANNING PASSPORT MRZ & BIOMETRIC CHIP...
            </span>
          </div>
        )}
      </div>

      {/* Security Violation Alert: Candidate Not Assigned to This Assessor */}
      {unauthorizedCandidate && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-rose-900">
                {isRTL ? 'تحذير أمني: المرشح غير مخصص لك اليوم' : 'Access Restricted: Candidate Not Assigned to Your Roster'}
              </h3>
              <p className="text-xs text-rose-700 leading-relaxed">
                {isRTL
                  ? `المرشح ${unauthorizedCandidate.fullNameEn} (${unauthorizedCandidate.aproReference}) مسجل في المركز، ولكنه معين لمقيم آخر (${unauthorizedCandidate.assessorName || 'مقيم آخر'}). لا يمكنك بدء التقييم له دون تفويض صريح من مدير المركز.`
                  : `Candidate ${unauthorizedCandidate.fullNameEn} (${unauthorizedCandidate.aproReference}) is registered in the center, but is paired with ${unauthorizedCandidate.assessorName || 'another assessor'}. You cannot conduct assessment for unassigned candidates.`}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => onNavigate?.('/assessor/assessments/assigned')}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
                >
                  {isRTL ? 'الرجوع للمرشحين المخصصين لك' : 'Return to My Assigned Roster'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Found Alert */}
      {notFound && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <UserX className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-900">
            {isRTL ? 'لم يتم العثور على المرشح' : 'No Candidate Found'}
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            {isRTL
              ? 'تأكد من إدخال رقم الجواز أو الرمز المرجعي APRO بشكل صحيح، أو تحقق من تسجيل المرشح لدى قسم الاستقبال.'
              : 'Please double-check the passport number or APRO reference ID. Verify candidate intake with Center Admin.'}
          </p>
        </div>
      )}

      {/* Candidate Dossier & Verification Form */}
      {matchedCandidate && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E8D9D2] shadow-sm overflow-hidden">
            {/* Top banner */}
            <div className="bg-[#F8ECEE] px-6 py-4 border-b border-[#E8D9D2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#7A2E3A]" />
                <span className="font-bold text-sm text-[#7A2E3A]">
                  {isRTL ? 'بيانات المرشح المعتمدة بالجلسة' : 'Verified Roster Record'}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {isRTL ? 'مرشح مخصص لك' : 'Assigned to You'}
              </span>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Photo & Biometric Card */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={matchedCandidate.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-32 h-32 rounded-2xl object-cover border-2 border-[#7A2E3A] shadow-md"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 mt-2">
                    {matchedCandidate.id}
                  </span>
                </div>

                {/* Candidate details */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'الاسم بالإنجليزية' : 'Full Name (English)'}</span>
                    <div className="text-base font-bold text-gray-900">{matchedCandidate.fullNameEn}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'الاسم بالعربية' : 'Full Name (Arabic)'}</span>
                    <div className="text-base font-bold text-gray-900 font-arabic">{matchedCandidate.fullNameAr}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'رقم جواز السفر' : 'Passport Number'}</span>
                    <div className="text-sm font-bold font-mono text-[#7A2E3A]">{matchedCandidate.passportNumber}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'الرقم المرجعي APRO' : 'APRO Reference ID'}</span>
                    <div className="text-sm font-bold font-mono text-gray-800">{matchedCandidate.aproReference}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'المهنة المعتمدة' : 'Trade / Occupation'}</span>
                    <div className="text-sm font-semibold text-gray-800">{matchedCandidate.occupation}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{isRTL ? 'المحطة / المنصة المعينة' : 'Workshop Bay'}</span>
                    <div className="text-sm font-bold text-indigo-700">{matchedCandidate.assignedBay || 'Bay-04'}</div>
                  </div>
                </div>
              </div>

              {/* CBT Theory Result & Task Allocation */}
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        {isRTL ? 'نتيجة اختبار الحاسب النظري (CBT)' : 'CBT Theory Exam'}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {isRTL ? 'مؤهل للاختبار العملي' : 'Cleared for Practical Execution'}
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-emerald-700">
                    {matchedCandidate.cbtScore || 85}%
                  </span>
                </div>

                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                      {isRTL ? 'المهمة العملية المخصصة بالقرعة' : 'Assigned Practical Task'}
                    </span>
                    <div className="text-xs font-bold text-blue-950 mt-0.5">
                      {matchedCandidate.assignedTaskCode || 'TSK-ELE-01'}
                    </div>
                    <div className="text-[11px] text-blue-700 truncate max-w-[220px]">
                      {matchedCandidate.assignedTaskTitle || 'Three-Phase Distribution Board Installation'}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate?.(`/assessor/practical-task?taskId=${matchedCandidate.assignedTaskId || 'tsk-1'}&candidateId=${matchedCandidate.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    {isRTL ? 'عرض' : 'Spec'}
                  </button>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  {isRTL ? 'قائمة التحقق الإلزامية لمطابقة الهوية:' : 'Assessor Verification Protocol:'}
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100/80 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={passportVerified}
                      onChange={e => setPassportVerified(e.target.checked)}
                      className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
                    />
                    <span className="text-xs text-gray-800 font-medium">
                      {isRTL
                        ? 'تم فحص جواز السفر الأصلي وتطابق الصورة والرقم مع السجل الرقمي.'
                        : 'Physical original passport inspected; photo and document numbers strictly match system record.'}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100/80 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={biometricVerified}
                      onChange={e => setBiometricVerified(e.target.checked)}
                      className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
                    />
                    <span className="text-xs text-gray-800 font-medium">
                      {isRTL
                        ? 'تمت مطابقة الملامح الحيوية للوجه وخلو المرشح من أي محاولات انتحال شخصية.'
                        : 'Facial biometric cross-verification passed with zero impersonation flags.'}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100/80 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={attendanceSigned}
                      onChange={e => setAttendanceSigned(e.target.checked)}
                      className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
                    />
                    <span className="text-xs text-gray-800 font-medium">
                      {isRTL
                        ? 'وقع المرشح على كشف الحضور واستلم شارة دخول الورشة ومعدات الوقاية.'
                        : 'Candidate signed physical station attendance sheet and received workshop safety badge.'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  {isRTL ? 'الخطوة التالية: فتح منصة التقييم وبدء المؤقت' : 'Next Step: Practical Assessment Workspace'}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={!passportVerified || !biometricVerified || !attendanceSigned || isSubmitting}
                    onClick={handleConfirmVerification}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#C9A24D]" />
                    <span>
                      {isSubmitting
                        ? (isRTL ? 'جارٍ الحفظ...' : 'Confirming...')
                        : (isRTL ? 'اعتماد التحقق وإدخال المرشح' : 'Confirm Verification & Admit')}
                    </span>
                  </button>

                  {(verifiedSuccess || matchedCandidate.status !== 'ASSIGNED') && (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${matchedCandidate.id}`)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-md flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{isRTL ? 'دخول منصة التقييم' : 'Proceed to Workspace'}</span>
                      {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5 text-white" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
