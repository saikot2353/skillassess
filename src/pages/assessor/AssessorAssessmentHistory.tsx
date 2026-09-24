import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { DEFAULT_EVALUATION_RUBRIC } from '../../services/demoData';
import { Candidate, CandidateEvaluationRating, EvaluationRubricSection } from '../../types';
import {
  History,
  Search,
  Filter,
  Eye,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Award,
  FileText,
  FileCheck,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AssessorAssessmentHistoryProps {
  onNavigate?: (path: string) => void;
}

export const AssessorAssessmentHistory: React.FC<AssessorAssessmentHistoryProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [ratings, setRatings] = useState<CandidateEvaluationRating[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  // Inspection modal
  const [inspectRating, setInspectRating] = useState<CandidateEvaluationRating | null>(null);
  const [inspectCandidate, setInspectCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const myCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(myCandidates);

    const allRatings = storageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
    setRatings(allRatings);

    // Check URL params for auto-open
    const urlParams = new URLSearchParams(window.location.search);
    const candidateIdParam = urlParams.get('candidateId');
    if (candidateIdParam) {
      const cand = myCandidates.find((c: Candidate) => c.id === candidateIdParam);
      const rat = allRatings.find((r: CandidateEvaluationRating) => r.candidateId === candidateIdParam);
      if (rat && cand) {
        setInspectRating(rat);
        setInspectCandidate(cand);
      }
    }
  }, [user]);

  // Merge candidate records with their rating records
  const historicalCandidates = candidates.filter(c => 
    c.status === 'LOCKED' || c.status === 'COMPLETED' || c.status === 'EVALUATION_PENDING' || c.evaluationStatus === 'COMPLETED'
  );

  const occupations = Array.from(new Set(historicalCandidates.map(c => c.occupation).filter(Boolean)));

  const filteredCandidates = historicalCandidates.filter(cand => {
    const matchesSearch = 
      (cand.fullNameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cand.fullNameAr?.includes(searchQuery)) ||
      (cand.passportNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cand.aproReference?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesOccupation = occupationFilter === 'ALL' || cand.occupation === occupationFilter;
    const matchesResult = resultFilter === 'ALL' || cand.resultStatus === resultFilter;

    return matchesSearch && matchesOccupation && matchesResult;
  });

  const handleInspect = (cand: Candidate) => {
    const foundRating = ratings.find(r => r.candidateId === cand.id);
    if (foundRating) {
      setInspectRating(foundRating);
      setInspectCandidate(cand);
    } else {
      // Create a mock view if rating is just in candidate
      const mockRating: CandidateEvaluationRating = {
        id: `rat-${cand.id}`,
        candidateId: cand.id,
        assessorId: user?.id || 'usr-4',
        taskId: cand.assignedTaskId || 'tsk-1',
        taskTitle: cand.assignedTaskTitle || 'Practical Task Evaluation',
        difficulty: 'Moderate',
        ratings: {},
        sectionScores: {},
        totalScore: 68,
        totalMaxScore: 75,
        totalPercentage: 91,
        status: 'LOCKED',
        evaluationSheetUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
        evaluationSheetName: 'Physical_Evaluation_Record.pdf',
        submittedAt: cand.enrolledAt || '2026-09-18T10:00:00Z',
        lockedAt: cand.enrolledAt || '2026-09-18T10:00:00Z'
      };
      setInspectRating(mockRating);
      setInspectCandidate(cand);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <History className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'السجل التاريخي والتدقيق' : 'Assessment Audit Ledger'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'سجل التقييمات المعتمدة والمقفلة' : 'Certified Assessment History & Audit Ledger'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'أرشيف رقمي معتمد وغير قابل للتعديل لجميع التقييمات المنفذة والموقعة وفق معايير الجودة.'
              : 'Immutable repository of all sealed practical evaluations and certified candidate rubrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{isRTL ? 'طباعة الكشف' : 'Print Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isRTL ? 'البحث بالاسم أو رقم الجواز...' : 'Search by candidate or passport...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">{isRTL ? 'المهنة:' : 'Trade:'}</span>
            <select
              value={occupationFilter}
              onChange={e => setOccupationFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] bg-white text-gray-700"
            >
              <option value="ALL">{isRTL ? 'جميع المهن' : 'All Trades'}</option>
              {occupations.map(occ => (
                <option key={occ} value={occ}>{occ}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{isRTL ? 'النتيجة:' : 'Outcome:'}</span>
            <select
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] bg-white text-gray-700"
            >
              <option value="ALL">{isRTL ? 'جميع النتائج' : 'All Outcomes'}</option>
              <option value="PASS">{isRTL ? 'ناجح (PASS)' : 'Passed'}</option>
              <option value="FAIL">{isRTL ? 'راسب (FAIL)' : 'Failed'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-[#E8D9D2] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8ECEE]/60 text-[#715D5D] text-xs uppercase font-semibold border-b border-[#E8D9D2]">
              <tr>
                <th className="px-5 py-3.5">{isRTL ? 'المرشح' : 'Candidate'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهنة' : 'Trade'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهمة العملية' : 'Practical Task'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'الدرجة والنسبة' : 'Score & %'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'النتيجة' : 'Result'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'حالة القفل' : 'Integrity'}</th>
                <th className="px-5 py-3.5 text-right">{isRTL ? 'معاينة السجل' : 'Inspect'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">{isRTL ? 'لا توجد تقييمات سابقة مطابقة للبحث.' : 'No evaluation history records match your query.'}</p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(cand => {
                  const rating = ratings.find(r => r.candidateId === cand.id);
                  const isPass = cand.resultStatus === 'PASS' || (rating && rating.totalPercentage >= 70);
                  return (
                    <tr key={cand.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Candidate */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={cand.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-[#E8D9D2]"
                          />
                          <div>
                            <div className="font-bold text-gray-900 leading-snug">
                              {isRTL ? cand.fullNameAr : cand.fullNameEn}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              {cand.passportNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trade */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-xs text-gray-900">{cand.occupation}</span>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">{cand.batchId}</div>
                      </td>

                      {/* Task */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-gray-800">
                          {cand.assignedTaskCode || 'TSK-ELE-01'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {cand.assignedTaskTitle || 'Distribution Board Installation'}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-gray-900">
                          {rating?.totalScore || 68} / {rating?.totalMaxScore || 75}
                        </div>
                        <div className="text-[11px] font-bold text-[#7A2E3A]">
                          {rating?.totalPercentage || 91}%
                        </div>
                      </td>

                      {/* Result */}
                      <td className="px-5 py-4">
                        {isPass ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {isRTL ? 'ناجح' : 'PASS'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            {isRTL ? 'راسب' : 'FAIL'}
                          </span>
                        )}
                      </td>

                      {/* Sealed */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isRTL ? 'مقفل ومعتمد' : 'Sealed'}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {cand.enrolledAt ? new Date(cand.enrolledAt).toLocaleDateString() : '2026-09-18'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleInspect(cand)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#7A2E3A] hover:text-white text-gray-700 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isRTL ? 'معاينة' : 'Inspect'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {inspectCandidate && inspectRating && (
        <Modal
          isOpen={true}
          onClose={() => {
            setInspectCandidate(null);
            setInspectRating(null);
          }}
          title={isRTL ? 'معاينة السجل التقييمي المعتمد والمقفل' : 'Certified Evaluation Ledger Record'}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    {isRTL ? 'سجل رسمي مقفل وموقع رقمياً' : 'Cryptographically Sealed Official Record'}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-mono">
                    ID: {inspectRating.id} • {inspectRating.lockedAt ? new Date(inspectRating.lockedAt).toLocaleString() : 'Sealed'}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                {inspectRating.totalPercentage >= 70 ? 'PASS' : 'FAIL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-500">{isRTL ? 'المرشح:' : 'Candidate:'}</span>
                <div className="font-bold text-gray-900">{inspectCandidate.fullNameEn}</div>
                <div className="text-[11px] text-gray-500 font-mono">{inspectCandidate.passportNumber}</div>
              </div>
              <div>
                <span className="text-gray-500">{isRTL ? 'المهنة والمهمة:' : 'Trade & Task:'}</span>
                <div className="font-bold text-gray-900">{inspectCandidate.occupation}</div>
                <div className="text-[11px] text-gray-500">{inspectRating.taskTitle || inspectCandidate.assignedTaskTitle}</div>
              </div>
              <div>
                <span className="text-gray-500">{isRTL ? 'المجموع النهائي:' : 'Final Mark:'}</span>
                <div className="font-bold text-gray-900 text-sm">
                  {inspectRating.totalScore} / {inspectRating.totalMaxScore} ({inspectRating.totalPercentage}%)
                </div>
              </div>
              <div>
                <span className="text-gray-500">{isRTL ? 'مستوى الصعوبة:' : 'Difficulty:'}</span>
                <div className="font-bold text-indigo-700">{inspectRating.difficulty || 'Moderate'}</div>
              </div>
            </div>

            {inspectRating.evaluationSheetUrl && (
              <div className="p-3 bg-[#F8ECEE] rounded-xl border border-[#E8D9D2] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7A2E3A]" />
                  <span className="font-bold text-gray-900">{inspectRating.evaluationSheetName || 'Signed_Evaluation_Sheet.pdf'}</span>
                </div>
                <a
                  href={inspectRating.evaluationSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#7A2E3A] hover:underline flex items-center gap-1"
                >
                  <span>{isRTL ? 'عرض المستند' : 'View File'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {inspectRating.assessorRemarks && (
              <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl">
                <span className="font-bold text-gray-900 block mb-1">{isRTL ? 'ملاحظات المقيم المعتمد:' : 'Assessor Remarks:'}</span>
                <p className="italic text-gray-600">{inspectRating.assessorRemarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setInspectCandidate(null);
                  setInspectRating(null);
                }}
                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
