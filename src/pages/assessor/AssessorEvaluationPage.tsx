import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { DEFAULT_EVALUATION_RUBRIC } from '../../services/demoData';
import {
  Candidate,
  EvaluationRubricSection,
  CandidateEvaluationRating,
  AuditLog,
  EvaluationSheet,
  Result,
  Assessment,
  Notification
} from '../../types';
import {
  FileCheck,
  ShieldCheck,
  Award,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Lock,
  FileText,
  Trash2,
  Eye,
  AlertCircle,
  HelpCircle,
  Printer,
  ChevronRight
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AssessorEvaluationPageProps {
  onNavigate?: (path: string) => void;
}

export const AssessorEvaluationPage: React.FC<AssessorEvaluationPageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // Rubric state
  const rubricSections: EvaluationRubricSection[] = DEFAULT_EVALUATION_RUBRIC;
  const [scores, setScores] = useState<Record<string, number>>({});
  const [difficulty, setDifficulty] = useState<string>('Moderate');
  const [remarks, setRemarks] = useState<string>('');

  // Physical evaluation sheet upload
  const [uploadedSheetUrl, setUploadedSheetUrl] = useState<string>('');
  const [uploadedSheetName, setUploadedSheetName] = useState<string>('');

  // Lock status
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedAt, setLockedAt] = useState<string>('');

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const myCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(myCandidates);

    const urlParams = new URLSearchParams(window.location.search);
    const candidateIdParam = urlParams.get('candidateId');

    const active = (candidateIdParam && myCandidates.find((c: Candidate) => c.id === candidateIdParam)) ||
      myCandidates.find((c: Candidate) => c.status === 'EVALUATION_PENDING' || c.status === 'PRACTICAL_COMPLETED') ||
      myCandidates[0];

    if (active) {
      loadCandidateEvaluation(active);
    }
  }, [user]);

  const loadCandidateEvaluation = (cand: Candidate) => {
    setSelectedCandidateId(cand.id);
    setCandidate(cand);

    // Check if evaluation already exists in storage
    const existingRatings = storageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
    const found = existingRatings.find((r: CandidateEvaluationRating) => r.candidateId === cand.id);

    if (found) {
      setScores(found.ratings || {});
      setDifficulty(found.difficulty || 'Moderate');
      setRemarks(found.assessorRemarks || '');
      setUploadedSheetUrl(found.evaluationSheetUrl || '');
      setUploadedSheetName(found.evaluationSheetName || '');
      setIsLocked(found.status === 'LOCKED' || cand.status === 'LOCKED' || cand.resultLocked === true);
      setLockedAt(found.lockedAt || found.submittedAt || '');
    } else {
      // Default / fresh scores
      const initialScores: Record<string, number> = {};
      rubricSections.forEach(section => {
        section.questions.forEach(q => {
          initialScores[q.id] = 4; // Default starting score 4
        });
      });
      setScores(initialScores);
      setDifficulty('Moderate');
      setRemarks('');
      setUploadedSheetUrl('');
      setUploadedSheetName('');
      setIsLocked(cand.status === 'LOCKED' || cand.resultLocked === true);
      setLockedAt('');
    }
  };

  const handleCandidateChange = (candId: string) => {
    const cand = candidates.find(c => c.id === candId);
    if (cand) {
      loadCandidateEvaluation(cand);
    }
  };

  const handleScoreChange = (questionId: string, value: number) => {
    if (isLocked) return;
    setScores(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      const mockUrl = URL.createObjectURL(file);
      setUploadedSheetUrl(mockUrl);
      setUploadedSheetName(file.name);
      showToast(isRTL ? 'تم إرفاق نموذج التقييم الورقي الموقع' : 'Physical evaluation sheet attached', 'success');
    }
  };

  const handleRemoveSheet = () => {
    if (isLocked) return;
    setUploadedSheetUrl('');
    setUploadedSheetName('');
  };

  // Calculations
  let totalScore = 0;
  let totalMaxScore = 0;
  const sectionScores: Record<string, { score: number; maxScore: number; percentage: number }> = {};

  rubricSections.forEach(sec => {
    let secScore = 0;
    let secMax = 0;
    sec.questions.forEach(q => {
      secScore += scores[q.id] || 0;
      secMax += q.maxScore;
    });
    totalScore += secScore;
    totalMaxScore += secMax;
    sectionScores[sec.id] = {
      score: secScore,
      maxScore: secMax,
      percentage: secMax > 0 ? Math.round((secScore / secMax) * 100) : 0
    };
  });

  const totalPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  const isPassing = totalPercentage >= 70;
  const isPracticalCompleted = candidate?.practicalStatus === 'COMPLETED' || candidate?.status === 'PRACTICAL_COMPLETED' || candidate?.status === 'EVALUATION_PENDING';

  const handleConfirmAndLock = () => {
    if (!candidate || !user) return;

    if (candidate.status === 'LOCKED' || candidate.resultLocked || isLocked) {
      showToast(isRTL ? 'هذا التقييم مقفل رقابياً ولا يمكن تعديله أو إعادة إرساله.' : 'This evaluation is permanently locked under regulatory anti-tampering rules.', 'error');
      return;
    }

    if (!isPracticalCompleted) {
      showToast(isRTL ? 'يجب إكمال الاختبار العملي في ورشة التقييم أولاً قبل اعتماد الدرجات.' : 'Prerequisite: Candidate practical exam must be completed before submitting evaluation marks.', 'error');
      return;
    }

    if (!uploadedSheetUrl) {
      showToast(isRTL ? 'يجب رفع صورة نموذج التقييم الورقي الموقع أولاً' : 'Uploading signed evaluation sheet is mandatory before submission', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const now = new Date().toISOString();

      // 1. Create or update rating record
      const existingRatings = storageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
      const newRating: CandidateEvaluationRating = {
        id: `rat-${Date.now()}`,
        candidateId: candidate.id,
        assessorId: user.id,
        batchId: candidate.batchId,
        taskId: candidate.assignedTaskId || 'tsk-1',
        taskTitle: candidate.assignedTaskTitle || 'Practical Task',
        difficulty,
        ratings: scores,
        sectionScores,
        totalScore,
        totalMaxScore,
        totalPercentage,
        evaluationSheetUrl: uploadedSheetUrl,
        evaluationSheetName: uploadedSheetName || 'Signed_Evaluation_Sheet.pdf',
        evaluationSheetUploadedAt: now,
        assessorRemarks: remarks,
        status: 'LOCKED',
        submittedAt: now,
        lockedAt: now
      };

      const filteredRatings = existingRatings.filter((r: CandidateEvaluationRating) => r.candidateId !== candidate.id);
      storageService.set(STORAGE_KEYS.EVALUATION_RATINGS, [...filteredRatings, newRating]);

      // 2. Update candidate record to LOCKED
      const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const updatedCandidates = allCandidates.map((c: Candidate) => {
        if (c.id === candidate.id) {
          return {
            ...c,
            status: 'LOCKED' as const,
            evaluationStatus: 'COMPLETED' as const,
            resultStatus: isPassing ? ('PASS' as const) : ('FAIL' as const),
            resultLocked: true
          };
        }
        return c;
      });
      storageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);

      // 3. Synchronize with official Result record in STORAGE_KEYS.RESULTS
      const existingResults = storageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
      const resultIdx = existingResults.findIndex((r: Result) => r.candidateId === candidate.id);
      const theoryScore = candidate.cbtScore || 85;
      const finalScore = Math.round((theoryScore * 0.3) + (totalPercentage * 0.7));
      const finalGrade: 'DISTINCTION' | 'PASS' | 'FAIL' = isPassing ? (totalPercentage >= 85 ? 'DISTINCTION' : 'PASS') : 'FAIL';
      const certNum = isPassing ? `CERT-SA-2026-${candidate.passportNumber.slice(-4)}-${Date.now().toString().slice(-4)}` : undefined;

      const newResult: Result = {
        id: resultIdx >= 0 ? existingResults[resultIdx].id : `res-${candidate.id}`,
        assessmentId: candidate.scheduleId || `asm-${candidate.id}`,
        candidateId: candidate.id,
        candidateName: candidate.fullNameEn,
        aproReference: candidate.aproReference,
        countryId: candidate.countryId,
        centerId: candidate.centerId,
        occupation: candidate.occupation,
        assessorName: user.name,
        theoryScore: theoryScore,
        practicalScore: totalPercentage,
        score: finalScore,
        grade: finalGrade,
        status: 'LOCKED',
        submissionDate: now,
        certificateNumber: certNum,
        issuedAt: isPassing ? now : undefined
      };
      const filteredResults = existingResults.filter((r: Result) => r.candidateId !== candidate.id);
      storageService.set(STORAGE_KEYS.RESULTS, [...filteredResults, newResult]);

      // 4. Synchronize Assessment record in STORAGE_KEYS.ASSESSMENTS
      const existingAssessments = storageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []);
      const asmIdx = existingAssessments.findIndex((a: Assessment) => a.candidateId === candidate.id);
      const updatedAssessment: Assessment = {
        id: asmIdx >= 0 ? existingAssessments[asmIdx].id : `asm-${candidate.id}`,
        candidateId: candidate.id,
        candidateName: candidate.fullNameEn,
        centerId: candidate.centerId,
        countryId: candidate.countryId,
        assessorId: user.id,
        assessorName: user.name,
        scheduleId: candidate.scheduleId || 'sch-1',
        occupation: candidate.occupation,
        date: now.split('T')[0],
        theoryScore: theoryScore,
        practicalScore: totalPercentage,
        totalScore: finalScore,
        status: 'LOCKED',
        evaluatedAt: now
      };
      const filteredAssessments = existingAssessments.filter((a: Assessment) => a.candidateId !== candidate.id);
      storageService.set(STORAGE_KEYS.ASSESSMENTS, [...filteredAssessments, updatedAssessment]);

      // 5. Automated Center Admin Notification
      const existingNotifs = storageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        titleEn: `Evaluation Sealed: ${candidate.fullNameEn}`,
        titleAr: `تم قفل واعتماد التقييم: ${candidate.fullNameAr}`,
        messageEn: `Assessor ${user.name} submitted and locked final practical rating for ${candidate.fullNameEn} (${candidate.aproReference}). Practical Score: ${totalPercentage}%, Final Mark: ${finalScore}% (${finalGrade}).`,
        messageAr: `قام المقيم ${user.name} باعتماد وقفل النتيجة النهائية للمرشح ${candidate.fullNameAr} (${candidate.aproReference}) بدرجة عملية ${totalPercentage}%، النتيجة: ${finalGrade === 'FAIL' ? 'راسب' : 'ناجح'}.`,
        type: isPassing ? 'SUCCESS' : 'ALERT',
        targetRole: 'CENTER_ADMIN',
        read: false,
        createdAt: now,
        link: `/results?id=${newResult.id}`
      };
      storageService.set(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...existingNotifs]);

      // 6. Audit log
      const auditLogs = storageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
      const auditEntry: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'SUBMIT_EVALUATION' as any,
        entity: 'Evaluation & Rating Ledger',
        details: `Assessor finalized, sealed, and locked practical rating for ${candidate.fullNameEn} (${candidate.aproReference}). Score: ${totalScore}/${totalMaxScore} (${totalPercentage}% - ${isPassing ? 'PASS' : 'FAIL'}).`,
        timestamp: now,
        ipAddress: '192.168.1.14',
        status: 'SUCCESS'
      };
      storageService.set(STORAGE_KEYS.AUDIT_LOGS, [auditEntry, ...auditLogs]);

      setIsLocked(true);
      setLockedAt(now);
      setCandidate({
        ...candidate,
        status: 'LOCKED',
        evaluationStatus: 'COMPLETED',
        resultStatus: isPassing ? 'PASS' : 'FAIL',
        resultLocked: true
      });
      setIsSubmitting(false);
      setShowConfirmModal(false);

      showToast(isRTL ? 'تم اعتماد التقييم وقفل النتيجة بصورة نهائية غير قابلة للتعديل' : 'Evaluation sealed and locked permanently in the ledger', 'success');
    }, 800);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <FileCheck className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'رصد التقييم ومعايير الأداء' : 'Practical Evaluation & Rating'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'نموذج رصد الدرجات والتقييم المعياري' : 'Evaluation Rubric & Physical Sheet Verification'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'رصد درجات المرشح عبر الأقسام الخمسة المعتمدة، ورفع نموذج التقييم الورقي الموقع، وقفل النتيجة نهائياً.'
              : 'Record candidate scores across certified rubric sections, upload signed evaluation sheet, and seal final ratings.'}
          </p>
        </div>

        {isLocked && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>{isRTL ? 'السجل معتمد ومقفل' : 'Certified & Sealed'}</span>
          </div>
        )}
      </div>

      {/* Candidate Selector Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
            {isRTL ? 'المرشح:' : 'Select Candidate:'}
          </label>
          <select
            value={selectedCandidateId}
            onChange={e => handleCandidateChange(e.target.value)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] text-gray-900"
          >
            {candidates.map(cand => (
              <option key={cand.id} value={cand.id}>
                {isRTL ? cand.fullNameAr : cand.fullNameEn} ({cand.aproReference} - {cand.status})
              </option>
            ))}
          </select>
        </div>

        {candidate && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{isRTL ? 'المحطة:' : 'Bay:'} <b>{candidate.assignedBay || 'Bay-04'}</b></span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{isRTL ? 'المهنة:' : 'Trade:'} <b>{candidate.occupation}</b></span>
          </div>
        )}
      </div>

      {/* Locked Alert Banner */}
      {isLocked && (
        <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                {isRTL ? 'التقييم معتمد ومقفل بصفة رسمية نهائية (Immutable & Certified)' : 'Evaluation Permanently Sealed & Immutable'}
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                {isRTL
                  ? `تم توثيق واعتماد هذا التقييم بواسطة المقيم المعتمد بتاريخ ${lockedAt ? new Date(lockedAt).toLocaleString() : 'مسبقاً'}. لا يمكن تعديل أو حذف أي درجات بعد القفل وفق بروتوكول نزاهة الاختبارات.`
                  : `This evaluation record was finalized and cryptographically logged on ${lockedAt ? new Date(lockedAt).toLocaleString() : 'Record Date'}. Modification controls are disabled by governance policy.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Physical Signed Evaluation Sheet Upload Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8D9D2] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'نموذج التقييم الورقي الموقع (إلزامي)' : 'Physical Signed Evaluation Sheet (Mandatory)'}</span>
          </h2>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
            {isRTL ? 'شرط إلزامي للاعتماد' : 'Required for submission'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {isRTL
            ? 'قم برفع النسخة الموقعة يدوياً من نموذج رصد الدرجات الميداني بصيغة PDF أو صورة واضحة كمرجع تدقيق رسمي.'
            : 'Upload a clear scanned photo or PDF of the physical paper rubric co-signed by candidate and assessor.'}
        </p>

        {uploadedSheetUrl ? (
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8ECEE]/60 border border-[#E8D9D2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7A2E3A] text-[#C9A24D] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">{uploadedSheetName || 'Signed_Evaluation_Sheet.pdf'}</div>
                <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'تم الرفع والتحقق بنجاح' : 'Attached & Ready'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={uploadedSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isRTL ? 'معاينة' : 'Preview'}</span>
              </a>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleRemoveSheet}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إزالة' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 hover:border-[#7A2E3A] rounded-xl p-6 text-center relative bg-gray-50/50">
            <input
              type="file"
              accept="image/*,.pdf"
              disabled={isLocked}
              onChange={handleSheetUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
            />
            <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-gray-800">
              {isRTL ? 'اضغط لرفع ورقة التقييم الموقعة أو اسحب الملف هنا' : 'Click to upload signed evaluation sheet or drag & drop'}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</div>
          </div>
        )}
      </div>

      {/* 5 Rubric Sections */}
      <div className="space-y-6">
        {rubricSections.map((section, sIdx) => {
          const secStats = sectionScores[section.id] || { score: 0, maxScore: 0, percentage: 0 };
          return (
            <div key={section.id} className="bg-white rounded-2xl border border-[#E8D9D2] shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="bg-[#F8ECEE]/70 px-6 py-4 border-b border-[#E8D9D2] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-mono font-bold text-[#7A2E3A] uppercase tracking-wider">
                    {section.code} • {isRTL ? `القسم ${sIdx + 1}` : `Section ${sIdx + 1}`}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {isRTL ? section.titleAr : section.titleEn}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#7A2E3A]">
                      {secStats.score} / {secStats.maxScore} pts
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      ({secStats.percentage}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="divide-y divide-gray-100 p-6 space-y-4">
                {section.questions.map((q, qIdx) => {
                  const currentScore = scores[q.id] || 0;
                  return (
                    <div key={q.id} className="pt-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-[11px] font-mono font-bold text-gray-600 flex items-center justify-center">
                            {qIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {isRTL ? q.textAr : q.textEn}
                          </span>
                        </div>
                      </div>

                      {/* 0 to 5 Score Radio / Buttons */}
                      <div className="flex items-center gap-1.5 self-end md:self-auto">
                        {[0, 1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleScoreChange(q.id, val)}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                              currentScore === val
                                ? 'bg-[#7A2E3A] text-white shadow-md scale-105'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Difficulty & Remarks Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8D9D2] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isRTL ? 'تقييم مستوى صعوبة المهمة المنفذة:' : 'Assessed Task Execution Difficulty:'}
          </label>
          <select
            value={difficulty}
            disabled={isLocked}
            onChange={e => setDifficulty(e.target.value)}
            className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A] disabled:bg-gray-100"
          >
            <option value="Foundational">{isRTL ? 'أساسي (Foundational / Easy)' : 'Foundational (Easy)'}</option>
            <option value="Moderate">{isRTL ? 'متوسط (Intermediate / Moderate)' : 'Intermediate (Moderate)'}</option>
            <option value="Hard">{isRTL ? 'متقدم (Advanced / Hard)' : 'Advanced (Hard)'}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isRTL ? 'ملاحظات وتوصيات المقيم النهائية:' : 'Final Assessor Remarks & Recommendations:'}
          </label>
          <textarea
            rows={3}
            value={remarks}
            disabled={isLocked}
            onChange={e => setRemarks(e.target.value)}
            placeholder={isRTL ? 'سجل ملخص الأداء وجودة العمل والالتزام بالسلامة...' : 'Summarize precision, technical adherence, and safety standards...'}
            className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A] disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Real-Time Total Calculation Summary Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
              {isRTL ? 'المجموع النهائي' : 'TOTAL SCORE'}
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {totalScore} <span className="text-sm font-normal text-gray-400">/ {totalMaxScore}</span>
            </div>
          </div>

          <div className="w-px h-12 bg-gray-700" />

          <div className="text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
              {isRTL ? 'النسبة المئوية' : 'PERCENTAGE'}
            </span>
            <div className="text-3xl font-black text-[#C9A24D] mt-1">
              {totalPercentage}%
            </div>
          </div>

          <div className="w-px h-12 bg-gray-700" />

          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
              {isRTL ? 'النتيجة المبدئية' : 'OUTCOME'}
            </span>
            {isPassing ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRTL ? 'مؤهل للنجاح (PASS)' : 'PASSED (>= 70%)'}</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isRTL ? 'غير مؤهل (FAIL)' : 'FAILED (< 70%)'}</span>
              </span>
            )}
          </div>
        </div>

        <div>
          {!isLocked ? (
            <button
              type="button"
              disabled={!isPracticalCompleted}
              onClick={() => {
                if (!isPracticalCompleted) {
                  showToast(isRTL ? 'لا يمكن اعتماد التقييم: يجب اكتمال الاختبار العملي أولاً' : 'Prerequisite required: Practical exam must be marked COMPLETED first', 'error');
                  return;
                }
                setShowConfirmModal(true);
              }}
              className={`px-6 py-3 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-2 ${
                isPracticalCompleted 
                  ? 'bg-[#C9A24D] hover:bg-[#B38F3E] text-[#3F3030] cursor-pointer' 
                  : 'bg-stone-600 text-stone-300 opacity-60 cursor-not-allowed'
              }`}
              title={!isPracticalCompleted ? (isRTL ? 'الاختبار العملي لم يكتمل بعد' : 'Practical Exam not completed') : undefined}
            >
              <Lock className="w-4 h-4" />
              <span>{isRTL ? 'تأكيد وقفل التقييم نهائياً' : 'Confirm & Lock Evaluation'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>{isRTL ? 'طباعة التقرير' : 'Print Certified Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.(`/assessor/assessments/history?candidateId=${candidate?.id}`)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{isRTL ? 'السجل التاريخي' : 'View in Ledger'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Rating Lockout Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={isRTL ? 'تأكيد اعتماد التقييم وقفل السجل نهائياً' : 'Confirm & Irreversibly Seal Evaluation'}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-200 text-xs text-rose-900 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-950 mb-1">
                {isRTL ? 'تنبيه حاسم: هذا الإجراء غير قابل للتراجع أو التعديل!' : 'CRITICAL WARNING: Irreversible Final Submission'}
              </p>
              {isRTL
                ? `بمجرد التأكيد، سيتم قفل درجات المرشح ${candidate?.fullNameEn} بنسبة ${totalPercentage}% (${isPassing ? 'ناجح' : 'راسب'}) وإرفاق نموذج التقييم الورقي بالرقم التسلسلي للشهادة. لن يتمكن أي مقيم من فتح أو تعديل هذا السجل.`
                : `Once confirmed, ratings for candidate ${candidate?.fullNameEn} will be permanently locked at ${totalScore}/${totalMaxScore} (${totalPercentage}% - ${isPassing ? 'PASS' : 'FAIL'}). You will not be able to edit these marks again.`}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>{isRTL ? 'اسم المرشح:' : 'Candidate:'}</span>
              <span className="font-bold text-gray-900">{candidate?.fullNameEn}</span>
            </div>
            <div className="flex justify-between">
              <span>{isRTL ? 'المهمة العملية:' : 'Practical Task:'}</span>
              <span className="font-bold text-gray-900">{candidate?.assignedTaskCode}</span>
            </div>
            <div className="flex justify-between">
              <span>{isRTL ? 'نموذج التقييم الورقي:' : 'Physical Sheet:'}</span>
              <span className="font-bold text-emerald-700">{uploadedSheetName}</span>
            </div>
            <div className="flex justify-between">
              <span>{isRTL ? 'النتيجة والنسبة:' : 'Calculated Mark:'}</span>
              <span className="font-bold text-gray-900">{totalScore}/{totalMaxScore} ({totalPercentage}%)</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
            >
              {isRTL ? 'مراجعة الدرجات' : 'Return & Review'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAndLock}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? (isRTL ? 'جارٍ الاعتماد والقفل...' : 'Sealing Record...')
                  : (isRTL ? 'أؤكد الاعتماد والقفل النهائي' : 'Confirm & Seal Record')}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
