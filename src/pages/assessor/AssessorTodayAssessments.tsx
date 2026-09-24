import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, Schedule } from '../../types';
import {
  Calendar,
  Search,
  Filter,
  UserCheck,
  PlayCircle,
  FileCheck,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface AssessorTodayAssessmentsProps {
  onNavigate?: (path: string) => void;
}

export const AssessorTodayAssessments: React.FC<AssessorTodayAssessmentsProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [occupationFilter, setOccupationFilter] = useState('ALL');

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const assessorCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(assessorCandidates);

    const allSchedules = storageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    setSchedules(allSchedules.filter((s: Schedule) => user?.role === 'SUPER_ADMIN' || s.centerId === user?.centerId));
  }, [user]);

  const occupations = Array.from(new Set(candidates.map((c: Candidate) => c.occupation).filter(Boolean)));

  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      (cand.fullNameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cand.fullNameAr?.includes(searchQuery)) ||
      (cand.passportNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (cand.aproReference?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || cand.status === statusFilter;
    const matchesOccupation = occupationFilter === 'ALL' || cand.occupation === occupationFilter;

    return matchesSearch && matchesStatus && matchesOccupation;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{isRTL ? 'معين للاختبار' : 'Assigned'}</span>;
      case 'VERIFIED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">{isRTL ? 'تم التحقق' : 'Verified'}</span>;
      case 'IN_PROGRESS':
      case 'IN_ASSESSMENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            {isRTL ? 'قيد التقييم' : 'In Progress'}
          </span>
        );
      case 'PRACTICAL_COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">{isRTL ? 'أنجز العملي' : 'Practical Done'}</span>;
      case 'EVALUATION_PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">{isRTL ? 'بانتظار الرصد' : 'Eval Pending'}</span>;
      case 'LOCKED':
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{isRTL ? 'معتمد ومقفل' : 'Certified & Locked'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'جدول تقييمات اليوم' : "Today's Assessment Schedule"}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'قائمة الجلسات والمرشحين لليوم' : "Today's Assessment Schedule & Candidate Roster"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'استعراض المرشحين المسجلين في فترات اليوم ومتابعة مسار تقييمهم خطوة بخطوة.'
              : 'Monitor today’s candidate flow, launch practical evaluations, and access assessment workspaces.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('/assessor/candidate-verification')}
            className="px-4 py-2 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-[#C9A24D]" />
            <span>{isRTL ? 'التحقق من مرشح جديد' : 'Verify New Candidate'}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isRTL ? 'البحث بالاسم أو رقم الجواز...' : 'Search by name or passport...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] focus:border-[#7A2E3A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">{isRTL ? 'الحالة:' : 'Status:'}</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] bg-white text-gray-700"
            >
              <option value="ALL">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="ASSIGNED">{isRTL ? 'تم التعيين' : 'Assigned'}</option>
              <option value="VERIFIED">{isRTL ? 'تم التحقق' : 'Verified'}</option>
              <option value="IN_PROGRESS">{isRTL ? 'قيد التقييم' : 'In Progress'}</option>
              <option value="PRACTICAL_COMPLETED">{isRTL ? 'أنجز العملي' : 'Practical Done'}</option>
              <option value="EVALUATION_PENDING">{isRTL ? 'بانتظار الرصد' : 'Evaluation Pending'}</option>
              <option value="LOCKED">{isRTL ? 'معتمد ومقفل' : 'Certified & Locked'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Roster Cards / Table */}
      <div className="bg-white rounded-xl border border-[#E8D9D2] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8ECEE]/60 text-[#715D5D] text-xs uppercase font-semibold border-b border-[#E8D9D2]">
              <tr>
                <th className="px-5 py-3.5">{isRTL ? 'المرشح' : 'Candidate'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهنة ورقم الجلسة' : 'Trade & Session'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهمة العملية' : 'Practical Task'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المحطة / المنصة' : 'Station / Bay'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-5 py-3.5 text-right">{isRTL ? 'إجراءات التقييم' : 'Assessment Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">{isRTL ? 'لا توجد نتائج مطابقة لخيارات البحث.' : 'No candidates match your filters.'}</p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(cand => (
                  <tr key={cand.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Candidate info */}
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

                    {/* Trade & session */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-xs text-gray-900">{cand.occupation}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>09:00 - 13:00 (Slot 1)</span>
                      </div>
                    </td>

                    {/* Assigned task */}
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold text-gray-800">
                        {cand.assignedTaskCode || 'TSK-ELE-01'}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 max-w-[200px]">
                        {cand.assignedTaskTitle || 'Three-Phase Distribution Board Installation'}
                      </div>
                      <button
                        onClick={() => onNavigate?.(`/assessor/practical-task?taskId=${cand.assignedTaskId || 'tsk-1'}&candidateId=${cand.id}`)}
                        className="text-[11px] text-[#7A2E3A] hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isRTL ? 'عرض تفاصيل المهمة' : 'View Task Spec'}</span>
                      </button>
                    </td>

                    {/* Station / Bay */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-700">
                        {cand.assignedBay || 'Bay-04'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {getStatusBadge(cand.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cand.status === 'ASSIGNED' && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/candidate-verification?query=${cand.passportNumber}`)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'التحقق من الهوية' : 'Verify ID'}</span>
                          </button>
                        )}

                        {cand.status === 'VERIFIED' && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${cand.id}`)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#7A2E3A] hover:bg-[#5C1D24] text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-[#C9A24D]" />
                            <span>{isRTL ? 'دخول المنصة' : 'Enter Workspace'}</span>
                          </button>
                        )}

                        {(cand.status === 'IN_PROGRESS' || cand.status === 'IN_ASSESSMENT') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${cand.id}`)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'استئناف التقييم' : 'Resume Live'}</span>
                          </button>
                        )}

                        {(cand.status === 'PRACTICAL_COMPLETED' || cand.status === 'EVALUATION_PENDING') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${cand.id}`)}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'رصد التقييم' : 'Evaluate'}</span>
                          </button>
                        )}

                        {(cand.status === 'LOCKED' || cand.status === 'COMPLETED') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/assessments/history?candidateId=${cand.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isRTL ? 'معاينة السجل' : 'View Record'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
