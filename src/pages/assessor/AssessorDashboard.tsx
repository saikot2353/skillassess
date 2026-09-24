import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { SecurityService } from '../../services/securityService';
import { Candidate, Schedule, PracticalTask, Notification, Batch } from '../../types';
import {
  Users,
  UserCheck,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Wrench,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
  X,
  Lock
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AssessorDashboardProps {
  onNavigate?: (path: string) => void;
}

export const AssessorDashboard: React.FC<AssessorDashboardProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);
  const [briefingAcknowledged, setBriefingAcknowledged] = useState<boolean>(false);

  useEffect(() => {
    // Load candidates filtered by assessor ID
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const assessorCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(assessorCandidates);

    // Load batches for release time tracking
    const allBatches = storageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    setBatches(allBatches);

    // Load schedules
    const allSchedules = storageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    const assessorSchedules = allSchedules.filter((s: Schedule) => user?.role === 'SUPER_ADMIN' || s.centerId === user?.centerId);
    setSchedules(assessorSchedules);

    // Load tasks
    const allTasks = storageService.get<PracticalTask[]>(STORAGE_KEYS.PRACTICAL_TASKS, []);
    setTasks(allTasks);

    // Load notifications
    const allNotifs = storageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    setNotifications(allNotifs.slice(0, 5));

    // Check if shift briefing was shown in this session
    const briefingDone = sessionStorage.getItem(`assessor_briefing_${user?.id}`);
    if (!briefingDone) {
      setShowBriefingModal(true);
    } else {
      setBriefingAcknowledged(true);
    }
  }, [user]);

  const handleAcknowledgeBriefing = () => {
    if (user?.id) {
      sessionStorage.setItem(`assessor_briefing_${user.id}`, 'true');
    }
    setBriefingAcknowledged(true);
    setShowBriefingModal(false);
  };

  // KPIs
  const currentBatch = batches.find(b => b.centerId === user?.centerId && b.status === 'ACTIVE') || batches[0] || null;
  const isAssignmentReleased = SecurityService.isBatchReleased(currentBatch);
  const totalAssigned = candidates.length;
  const verifiedCount = candidates.filter(c => 
    c.status === 'VERIFIED' || c.status === 'IN_PROGRESS' || c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATION_PENDING' || c.status === 'LOCKED' || c.status === 'COMPLETED'
  ).length;
  const inProgressCount = candidates.filter(c => c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT').length;
  const completedCount = candidates.filter(c => c.status === 'LOCKED' || c.status === 'COMPLETED').length;
  const pendingEvaluationCount = candidates.filter(c => 
    c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATION_PENDING' || (c.evaluationStatus === 'PENDING' && c.practicalStatus === 'COMPLETED')
  ).length;

  const verifiedPercent = totalAssigned > 0 ? Math.round((verifiedCount / totalAssigned) * 100) : 0;
  const passCount = candidates.filter(c => c.resultStatus === 'PASS').length;
  const passRate = completedCount > 0 ? Math.round((passCount / completedCount) * 100) : 100;

  const pipelineStages = [
    { labelEn: 'Assigned', labelAr: 'تم التعيين', count: candidates.filter(c => c.status === 'ASSIGNED' || !c.status).length, color: 'bg-blue-500' },
    { labelEn: 'Verified', labelAr: 'تم التحقق', count: candidates.filter(c => c.status === 'VERIFIED').length, color: 'bg-indigo-500' },
    { labelEn: 'In Progress', labelAr: 'قيد التقييم', count: inProgressCount, color: 'bg-amber-500' },
    { labelEn: 'Practical Done', labelAr: 'أنجز العملي', count: candidates.filter(c => c.status === 'PRACTICAL_COMPLETED').length, color: 'bg-purple-500' },
    { labelEn: 'Evaluation Pending', labelAr: 'بانتظار الرصد', count: pendingEvaluationCount, color: 'bg-rose-500' },
    { labelEn: 'Submitted & Locked', labelAr: 'تم الاعتماد والقفل', count: completedCount, color: 'bg-emerald-600' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">{isRTL ? 'تم التعيين' : 'Assigned'}</span>;
      case 'VERIFIED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">{isRTL ? 'تم التحقق' : 'Verified'}</span>;
      case 'IN_PROGRESS':
      case 'IN_ASSESSMENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            {isRTL ? 'قيد التقييم' : 'In Progress'}
          </span>
        );
      case 'PRACTICAL_COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">{isRTL ? 'أنجز العملي' : 'Practical Completed'}</span>;
      case 'EVALUATION_PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">{isRTL ? 'بانتظار التقييم' : 'Evaluation Pending'}</span>;
      case 'LOCKED':
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">{isRTL ? 'معتمد ومقفل' : 'Locked & Certified'}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Assessor Header & Greeting Banner */}
      <div className="bg-white rounded-2xl p-6 border border-borderlight shadow-soft relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-50 text-xs font-medium text-stone-700 mb-2 border border-stone-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A43950]" />
              <span>{isRTL ? 'بوابة المقيم المعتمد — الجلسة النشطة' : 'Certified Assessor Portal — Active Duty'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
              {isRTL ? `مرحباً، ${user?.name || 'المقيم'}` : `Welcome, ${user?.name || 'Assessor'}`}
            </h1>
            <p className="text-sm text-stone-500 mt-1 max-w-2xl">
              {isRTL
                ? 'مركز الرياض للتقييم المهني (مركز #1) • محطة الورشة 04 • يمكنك إدارة تقييماتك اليومية والتحقق من المرشحين ورصد الدرجات.'
                : 'Riyadh Vocational Assessment Center (#1) • Station Bay 04 • Manage today’s roster, verify candidates, record evidence, and seal evaluations.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBriefingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 active:bg-stone-100 border border-stone-200 text-stone-700 text-sm font-medium transition-colors flex items-center gap-2 shadow-xs"
            >
              <Info className="w-4 h-4 text-stone-400" />
              <span>{isRTL ? 'إحاطة الجاهزية اليومية' : 'Shift Briefing'}</span>
            </button>
            <button
              onClick={() => onNavigate?.('/assessor/candidate-verification')}
              className="px-4 py-2.5 rounded-xl bg-[#A43950] hover:bg-[#8E2F43] active:bg-[#7D283A] text-white text-sm font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isRTL ? 'التحقق السريع من الهوية' : 'Quick Verify'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Today's Assigned */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {isRTL ? 'المرشحون المكلفون' : 'Candidates Assigned'}
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isAssignmentReleased ? (
              <>
                <span className="text-3xl font-bold text-[#3F3030]">{totalAssigned}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Candidates Assigned: {totalAssigned}
                </span>
              </>
            ) : (
              <div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 block">
                  🔒 Sealed until {currentBatch?.releaseTime || '09:45 AM'}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">Concealed under blind anti-bias rules</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>{isRTL ? 'حالة التحرير' : 'Release Status'}</span>
            <span className="font-semibold text-blue-600 font-mono text-[11px]">
              {isAssignmentReleased 
                ? `Released (${currentBatch?.releaseTime || '09:45 AM'})` 
                : `Locks until ${currentBatch?.releaseTime || '09:45 AM'}`}
            </span>
          </div>
        </div>

        {/* Card 2: Verified */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {isRTL ? 'تم التحقق' : 'Verified'}
            </span>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3F3030]">{verifiedCount}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {verifiedPercent}%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>{isRTL ? 'تم مطابقة الهوية' : 'ID & photo cleared'}</span>
            <span className="font-semibold text-gray-800">{verifiedCount}/{totalAssigned}</span>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {isRTL ? 'قيد التقييم العملي' : 'In Progress'}
            </span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <PlayCircle className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3F3030]">{inProgressCount}</span>
            {inProgressCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {isRTL ? 'نشط الآن' : 'Active'}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>{isRTL ? 'في منصات العمل' : 'At workshop bays'}</span>
            <span className="font-semibold text-amber-600">{inProgressCount > 0 ? 'Live' : 'None'}</span>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {isRTL ? 'التقييمات المعتمدة' : 'Completed'}
            </span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3F3030]">{completedCount}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {passRate}% {isRTL ? 'نجاح' : 'Pass'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>{isRTL ? 'مقفلة وموثقة' : 'Immutable & sealed'}</span>
            <span className="font-semibold text-emerald-600">{completedCount}</span>
          </div>
        </div>

        {/* Card 5: Pending Evaluations */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {isRTL ? 'بانتظار الرصد' : 'Pending Eval'}
            </span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingEvaluationCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3F3030]">{pendingEvaluationCount}</span>
            {pendingEvaluationCount > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                {isRTL ? 'مطلوب إجراء' : 'Action Req.'}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>{isRTL ? 'أنهوا العملي' : 'Practical finished'}</span>
            <span className="font-semibold text-rose-600">{pendingEvaluationCount}</span>
          </div>
        </div>
      </div>

      {/* Pipeline Progression Visual Bar */}
      <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#3F3030] flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'مسار تقدم التقييم العملي اليومي' : 'Daily Practical Assessment Pipeline Progression'}</span>
          </h2>
          <span className="text-xs text-gray-500">
            {isRTL ? `${candidates.length} مرشح بالإجمالي` : `${candidates.length} Total Candidates`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineStages.map((stage, idx) => (
            <div key={idx} className="bg-[#F8ECEE]/40 rounded-xl p-3 border border-[#E8D9D2]/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {isRTL ? stage.labelAr : stage.labelEn}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
              </div>
              <div className="text-2xl font-black text-[#7A2E3A]">{stage.count}</div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                  style={{ width: `${candidates.length > 0 ? (stage.count / candidates.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Split: Today's Schedule & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Assigned Assessment Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E8D9D2] shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#E8D9D2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7A2E3A]" />
              <h2 className="font-bold text-[#3F3030]">
                {isRTL ? 'جدول تقييمات اليوم والمترشحين' : "Today's Assessment Roster"}
              </h2>
            </div>
            <button
              onClick={() => onNavigate?.('/assessor/assessments/today')}
              className="text-xs font-semibold text-[#7A2E3A] hover:text-[#5C1D24] flex items-center gap-1 transition-colors"
            >
              <span>{isRTL ? 'عرض الجدول الكامل' : 'View Full Schedule'}</span>
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8ECEE]/50 text-[#715D5D] text-xs uppercase font-semibold border-b border-[#E8D9D2]">
                <tr>
                  <th className="px-4 py-3">{isRTL ? 'المرشح' : 'Candidate'}</th>
                  <th className="px-4 py-3">{isRTL ? 'المهنة' : 'Trade'}</th>
                  <th className="px-4 py-3">{isRTL ? 'المهمة المعينة' : 'Assigned Task'}</th>
                  <th className="px-4 py-3">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{isRTL ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {isRTL ? 'لا يوجد مرشحين معينين لك حالياً.' : 'No candidates assigned to your roster yet.'}
                    </td>
                  </tr>
                ) : (
                  candidates.slice(0, 6).map(cand => (
                    <tr key={cand.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={cand.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-[#E8D9D2]"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                              {isRTL ? cand.fullNameAr : cand.fullNameEn}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              {cand.passportNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                        {cand.occupation}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-gray-800">
                          {cand.assignedTaskCode || 'TSK-ELE-01'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {cand.assignedTaskTitle || 'Three-Phase Distribution Board'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(cand.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cand.status === 'ASSIGNED' && (
                          <button
                            onClick={() => onNavigate?.('/assessor/candidate-verification')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs border border-indigo-200 transition-colors inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'تحقق' : 'Verify'}</span>
                          </button>
                        )}
                        {cand.status === 'VERIFIED' && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${cand.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-[#7A2E3A] hover:bg-[#5C1D24] text-white font-medium text-xs transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-[#C9A24D]" />
                            <span>{isRTL ? 'بدء العملي' : 'Start'}</span>
                          </button>
                        )}
                        {(cand.status === 'IN_PROGRESS' || cand.status === 'IN_ASSESSMENT') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${cand.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-xs border border-amber-200 transition-colors inline-flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>{isRTL ? 'متابعة' : 'Resume'}</span>
                          </button>
                        )}
                        {(cand.status === 'PRACTICAL_COMPLETED' || cand.status === 'EVALUATION_PENDING') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${cand.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'رصد التقييم' : 'Evaluate'}</span>
                          </button>
                        )}
                        {(cand.status === 'LOCKED' || cand.status === 'COMPLETED') && (
                          <button
                            onClick={() => onNavigate?.(`/assessor/assessments/history?candidateId=${cand.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isRTL ? 'معاينة' : 'View'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Live Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm">
            <h2 className="font-bold text-[#3F3030] text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A24D]" />
              <span>{isRTL ? 'الإجراءات السريعة للمقيم' : 'Assessor Fast Actions'}</span>
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => onNavigate?.('/assessor/candidate-verification')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8ECEE]/60 hover:bg-[#F8ECEE] border border-[#E8D9D2] text-start transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#7A2E3A] text-[#C9A24D] flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-[#7A2E3A] transition-colors">
                      {isRTL ? 'التحقق من جواز وهوية المرشح' : 'Verify Candidate Identity'}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {isRTL ? 'مسح الجواز أو التحقق البيومتري' : 'Passport & biometric match'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7A2E3A] transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={() => onNavigate?.('/assessor/practical-task')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-start transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {isRTL ? 'استعراض تفاصيل المهمة العملية' : 'Review Practical Task Spec'}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {isRTL ? 'الأدوات، إجراءات السلامة والمخطط' : 'Tools, instructions & blueprint'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-700 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={() => onNavigate?.('/assessor/evidence')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-start transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                      {isRTL ? 'رفع وتوثيق الأدلة' : 'Capture & Upload Evidence'}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {isRTL ? 'صور المنتج وفحص إجراءات السلامة' : 'Workpiece photos & safety logs'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={() => onNavigate?.('/assessor/ai-help')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 text-start transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {isRTL ? 'المساعد الذكي للمقيم (AI Help)' : 'Assessor AI Assistant'}
                    </div>
                    <div className="text-[11px] text-amber-700">
                      {isRTL ? 'استفسر عن معايير التقييم وإرشادات السلامة' : 'Rubric standards & safety rules'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Live Notification Feed */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D9D2] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#3F3030] text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#7A2E3A]" />
                <span>{isRTL ? 'الإشعارات والتنبيهات المباشرة' : 'Live Notifications'}</span>
              </h2>
              <button
                onClick={() => onNavigate?.('/assessor/notifications')}
                className="text-xs text-[#7A2E3A] hover:underline font-medium"
              >
                {isRTL ? 'الكل' : 'View All'}
              </button>
            </div>

            <div className="space-y-2.5">
              {notifications.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  {isRTL ? 'لا توجد تنبيهات جديدة.' : 'No active notifications.'}
                </div>
              ) : (
                notifications.slice(0, 4).map(notif => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-[#E8D9D2] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 leading-snug">
                        {isRTL ? notif.titleAr : notif.titleEn}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                      {isRTL ? notif.messageAr : notif.messageEn}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Briefing Modal */}
      <Modal
        isOpen={showBriefingModal}
        onClose={() => setShowBriefingModal(false)}
        title={isRTL ? 'بروتوكول جاهزية ونزاهة المقيم اليومي' : 'Assessor Daily Readiness & Integrity Protocol'}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="bg-[#F8ECEE] p-4 rounded-xl border border-[#E8D9D2] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#7A2E3A] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#3F3030] leading-relaxed">
              <p className="font-bold text-[#7A2E3A] mb-1">
                {isRTL ? 'تعليمات الجلسة المقررة وفق معايير الجودة الوطنية' : 'Standard Operating Procedure & Assessment Integrity'}
              </p>
              {isRTL
                ? 'بصفتك مقيماً معتمداً، يجب التأكد من تطابق هوية المرشح مع بطاقة الحجز وجواز السفر الأصلي قبل بدء أي اختبار، وعدم السماح بأي استثناءات دون إذن رسمي من مدير المركز.'
                : 'As an accredited assessor, you must strictly confirm candidate biometric & passport identity before practical commencement. No unverified person may enter the workshop bay.'}
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">
              {isRTL ? 'قائمة التحقق الإلزامية قبل بدء الوردية:' : 'Mandatory Shift Checklist:'}
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-gray-600 pl-1">
              <li>{isRTL ? 'التأكد من توفر جميع معدات الوقاية الشخصية (PPE) عند طاولة العمل.' : 'Verify PPE availability and safe positioning at Workstation Bay 04.'}</li>
              <li>{isRTL ? 'معايرة وفحص أجهزة القياس والفحص والأدوات الكهربائية والتأكد من سلامة العزل.' : 'Calibrate test instruments, insulation meters, and verify emergency cutoffs.'}</li>
              <li>{isRTL ? 'استلام ورق التقييم المعتمد وطباعة نماذج الرصد الفيزيائية كمرجع رسمي.' : 'Have signed physical evaluation sheets ready for physical cross-signature.'}</li>
              <li>{isRTL ? 'الالتزام التام بقفل التقييم فور الانتهاء حيث لا يمكن التعديل بعد الاعتماد.' : 'Adhere to finality rule: ratings sealed into the ledger cannot be amended.'}</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={briefingAcknowledged}
                onChange={e => setBriefingAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
              />
              <span className="text-xs text-gray-800 font-medium leading-relaxed">
                {isRTL
                  ? 'أقر أنا المقيم المعتمد بجاهزيتي التامة والالتزام بمعايير النزاهة والحياد والسرية المهنية أثناء تقييم المرشحين اليوم.'
                  : 'I declare that I am fit for duty, independent, and will evaluate all candidates strictly adhering to certified rubric standards and security protocols.'}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={!briefingAcknowledged}
              onClick={handleAcknowledgeBriefing}
              className="px-5 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
            >
              {isRTL ? 'تأكيد الجاهزية والدخول للمنصة' : 'Confirm & Proceed to Duty'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
