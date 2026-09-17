import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, TaskDifficulty } from '../../types';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  PlayCircle,
  FileCheck,
  ShieldCheck,
  Eye,
  Camera,
  Layers,
  Award,
  AlertCircle
} from 'lucide-react';

interface AssessorAssignedCandidatesProps {
  onNavigate?: (path: string) => void;
}

export const AssessorAssignedCandidates: React.FC<AssessorAssignedCandidatesProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [occupationFilter, setOccupationFilter] = useState('ALL');

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const assessorCandidates = allCandidates.filter((c: Candidate) => 
      c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(assessorCandidates);
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

  const getDifficultyBadge = (diff?: TaskDifficulty | string) => {
    switch (diff) {
      case 'ADVANCED':
      case 'Hard':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">{isRTL ? 'متقدم' : 'Advanced'}</span>;
      case 'INTERMEDIATE':
      case 'Moderate':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">{isRTL ? 'متوسط' : 'Intermediate'}</span>;
      case 'FOUNDATIONAL':
      case 'Easy':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">{isRTL ? 'أساسي' : 'Foundational'}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{isRTL ? 'تم التعيين' : 'Assigned'}</span>;
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
            <Users className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'إدارة المترشحين' : 'Candidate Management'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'المرشحون المعينون لتقييمي' : 'My Assigned Candidates Roster'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'سجل حصري ومحمي بالصلاحيات للمرشحين المخصصين لك من نظام القرعة العشوائية.'
              : 'Isolated roster of candidates allocated to your assessor account via automated lottery pairing.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#F8ECEE] px-3.5 py-2 rounded-xl border border-[#E8D9D2] flex items-center gap-2 text-xs font-bold text-[#7A2E3A]">
            <ShieldCheck className="w-4 h-4 text-[#C9A24D]" />
            <span>{candidates.length} {isRTL ? 'مرشح معين' : 'Total Assigned'}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isRTL ? 'البحث بالاسم، الجواز، أو APRO...' : 'Search by name, passport, or APRO...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
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

      {/* Candidate Table */}
      <div className="bg-white rounded-xl border border-[#E8D9D2] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8ECEE]/60 text-[#715D5D] text-xs uppercase font-semibold border-b border-[#E8D9D2]">
              <tr>
                <th className="px-5 py-3.5">{isRTL ? 'المرشح' : 'Candidate'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهنة' : 'Occupation'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'نتيجة النظري (CBT)' : 'CBT Theory'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'المهمة ومستوى الصعوبة' : 'Task & Difficulty'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'الأدلة والتوثيق' : 'Evidence Status'}</th>
                <th className="px-5 py-3.5">{isRTL ? 'حالة التقييم' : 'Assessment Stage'}</th>
                <th className="px-5 py-3.5 text-right">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">{isRTL ? 'لا يوجد مرشحين يطابقون خيارات البحث.' : 'No candidates match your filters.'}</p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(cand => {
                  const evidenceCount = cand.evidenceItems?.length || 0;
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
                              {cand.aproReference} • {cand.passportNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trade */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-xs text-gray-900">{cand.occupation}</span>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {cand.batchId || 'BATCH-2026-081'}
                        </div>
                      </td>

                      {/* CBT Theory */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cand.cbtScore || 85}%</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {isRTL ? 'مكتمل ومعتمد' : 'CBT Passed'}
                        </div>
                      </td>

                      {/* Task & Difficulty */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-gray-800">
                          {cand.assignedTaskCode || 'TSK-ELE-01'}
                        </div>
                        <div className="mt-1">
                          {getDifficultyBadge(cand.taskDifficulty)}
                        </div>
                      </td>

                      {/* Evidence */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-gray-800">{evidenceCount}</span>
                          <span className="text-xs text-gray-500">{isRTL ? 'عناصر' : 'items'}</span>
                        </div>
                        <button
                          onClick={() => onNavigate?.(`/assessor/evidence?candidateId=${cand.id}`)}
                          className="text-[11px] text-purple-700 hover:underline font-medium mt-0.5 block"
                        >
                          {isRTL ? 'إدارة الأدلة' : 'Manage Evidence'}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {getStatusBadge(cand.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${cand.id}`)}
                            title={isRTL ? 'فتح منصة التقييم' : 'Open Workspace'}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#7A2E3A] hover:text-white text-gray-600 transition-colors"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${cand.id}`)}
                            title={isRTL ? 'الرصد والدرجات' : 'Evaluation & Rating'}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-600 hover:text-white text-gray-600 transition-colors"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNavigate?.(`/assessor/assessments/history?candidateId=${cand.id}`)}
                            title={isRTL ? 'معاينة السجل' : 'View Record'}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
