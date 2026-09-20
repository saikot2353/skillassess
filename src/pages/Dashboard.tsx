import React, { useState, useEffect } from 'react';
import { 
  Globe2, Building2, Users2, CalendarCheck, Award, 
  ArrowUpRight, Clock, ShieldCheck, Activity, UserCheck, 
  Layers, CheckCircle2, AlertCircle, Eye,
  Plus, CheckSquare, RefreshCw, MapPin, Lock, FileText,
  CreditCard, Camera, Search, Bell, UserCircle, Shield, AlertTriangle, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { 
  Candidate, Center, Country, Schedule, Batch, AuditLog, 
  User, Assessment, Result, LiveActivityEvent, Notification,
  Complaint, AssessmentVarianceRecord
} from '../types';

export const Dashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [countries, setCountries] = useState<Country[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [varianceRecords, setVarianceRecords] = useState<AssessmentVarianceRecord[]>([]);

  const loadData = () => {
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setUsers(StorageService.get<User[]>(STORAGE_KEYS.USERS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
    setSchedules(StorageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []));
    setBatches(StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []));
    setAssessments(StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []));
    setResults(StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []));
    setAuditLogs(StorageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []));
    setLiveActivities(StorageService.get<LiveActivityEvent[]>(STORAGE_KEYS.LIVE_ACTIVITY, []));
    setComplaints(StorageService.get<Complaint[]>(STORAGE_KEYS.COMPLAINTS, []));
    setVarianceRecords(StorageService.get<AssessmentVarianceRecord[]>(STORAGE_KEYS.VARIANCE_RECORDS, []));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Section 8 KPIs calculation derived from localStorage
  const totalCountries = countries.length;
  const activeCountries = countries.filter(c => c.status === 'ACTIVE').length;
  const totalCenters = centers.length;
  const activeCenters = centers.filter(c => c.status === 'ACTIVE').length;

  const countryAccounts = users.filter(u => u.role === 'COUNTRY_ACCOUNT').length;
  const centerAdmins = users.filter(u => u.role === 'CENTER_ADMIN').length;
  const assessors = users.filter(u => u.role === 'ASSESSOR').length;
  const supportStaff = users.filter(u => u.role === 'SUPPORT_STAFF').length;

  const totalCandidates = candidates.length;
  const todayAssessments = schedules.reduce((acc, s) => acc + (s.assignedCandidates || 0), 0);
  const pendingResults = results.filter(r => r.status === 'PENDING' || r.status === 'SUBMITTED').length;
  const completedAssessments = results.filter(r => r.status === 'LOCKED' || r.status === 'CORRECTED').length;

  // Section 10: Horizontal Assessment Pipeline Stages calculation
  const pipelineCounts = {
    scheduled: candidates.filter(c => c.status === 'SCHEDULED' || c.status === 'ASSIGNED').length,
    enrolled: candidates.filter(c => c.status === 'REGISTERED' || c.status === 'ENROLLED' || c.status === 'VERIFIED' || c.enrollmentStatus === 'ENROLLED').length,
    cbtCompleted: candidates.filter(c => c.cbtStatus === 'COMPLETED' || c.cbtScore !== undefined).length || assessments.filter(a => a.theoryScore !== undefined).length,
    practicalInProgress: candidates.filter(c => c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.practicalStatus === 'IN_PROGRESS').length || assessments.filter(a => a.status === 'PRACTICAL_IN_PROGRESS' || a.status === 'IN_PROGRESS').length,
    evaluationPending: candidates.filter(c => c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATION_PENDING').length || assessments.filter(a => a.status === 'EVALUATION_PENDING' || a.status === 'SUBMITTED' || a.status === 'RESULT_SUBMITTED').length,
    resultSubmitted: results.filter(r => r.status === 'SUBMITTED').length || candidates.filter(c => c.status === 'SUBMITTED').length,
    locked: results.filter(r => r.status === 'LOCKED' || r.status === 'CORRECTED').length || candidates.filter(c => c.status === 'LOCKED' || c.resultLocked === true).length,
  };

  const kpiRows = [
    {
      id: 'countries',
      label: t.dashboard.totalCountries,
      value: totalCountries,
      badge: `${activeCountries} ${t.common.activate}`,
      icon: Globe2,
      color: 'maroon',
      link: '/countries'
    },
    {
      id: 'centers',
      label: t.dashboard.totalCenters,
      value: totalCenters,
      badge: `${activeCenters} ${t.common.activate}`,
      icon: Building2,
      color: 'gold',
      link: '/centers'
    },
    {
      id: 'countryAccounts',
      label: t.dashboard.countryAccounts,
      value: countryAccounts,
      badge: 'National Mandates',
      icon: ShieldCheck,
      color: 'maroon',
      link: '/users?role=COUNTRY_ACCOUNT'
    },
    {
      id: 'centerAdmins',
      label: t.dashboard.centerAdmins,
      value: centerAdmins,
      badge: 'Hub Managers',
      icon: Users2,
      color: 'gold',
      link: '/users?role=CENTER_ADMIN'
    },
    {
      id: 'assessors',
      label: t.dashboard.assessors,
      value: assessors,
      badge: 'Accredited',
      icon: UserCheck,
      color: 'maroon',
      link: '/users?role=ASSESSOR'
    },
    {
      id: 'supportStaff',
      label: t.dashboard.supportStaff,
      value: supportStaff,
      badge: 'Operations',
      icon: Users2,
      color: 'gold',
      link: '/users?role=SUPPORT_STAFF'
    },
    {
      id: 'candidates',
      label: t.dashboard.totalCandidates,
      value: totalCandidates,
      badge: 'Enrolled & Verified',
      icon: Users2,
      color: 'maroon',
      link: '/candidates'
    },
    {
      id: 'todayAssessments',
      label: t.dashboard.todayAssessments,
      value: todayAssessments,
      badge: 'Active Seats',
      icon: CalendarCheck,
      color: 'gold',
      link: '/schedules'
    },
    {
      id: 'pendingResults',
      label: t.dashboard.pendingResults,
      value: pendingResults,
      badge: 'Verification Queue',
      icon: AlertCircle,
      color: 'maroon',
      link: '/results'
    },
    {
      id: 'completedAssessments',
      label: t.dashboard.completedAssessments,
      value: completedAssessments,
      badge: 'Locked & Issued',
      icon: CheckCircle2,
      color: 'gold',
      link: '/results'
    }
  ];

  const pipelineStages = [
    { id: 'scheduled', label: t.dashboard.scheduled, count: pipelineCounts.scheduled, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'enrolled', label: t.dashboard.enrolled, count: pipelineCounts.enrolled, color: 'bg-stone-50 text-stone-700 border-stone-200' },
    { id: 'cbtCompleted', label: t.dashboard.cbtCompleted, count: pipelineCounts.cbtCompleted, color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'practicalInProgress', label: t.dashboard.practicalInProgress, count: pipelineCounts.practicalInProgress, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'evaluationPending', label: t.dashboard.evaluationPending, count: pipelineCounts.evaluationPending, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'resultSubmitted', label: t.dashboard.resultSubmitted, count: pipelineCounts.resultSubmitted, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'locked', label: t.dashboard.locked, count: pipelineCounts.locked, color: 'bg-[#F8ECEE] text-[#7A2E3A] border-[#E8D9D2]' },
  ];

  // COUNTRY ACCOUNT VIEW - Strict Sovereign / National-Scoped Operations
  if (user?.role === 'COUNTRY_ACCOUNT') {
    const userCountryId = user.countryId || 'cnt-sa';
    const currentCountry = countries.find(c => c.id === userCountryId) || {
      id: userCountryId,
      code: 'SA',
      nameEn: 'Saudi Arabia',
      nameAr: 'المملكة العربية السعودية',
      status: 'ACTIVE'
    };

    const countryCenters = centers.filter(c => c.countryId === userCountryId);
    const countryCenterIds = new Set(countryCenters.map(c => c.id));

    const countryCandidates = candidates.filter(c => c.countryId === userCountryId || (c.centerId && countryCenterIds.has(c.centerId)));
    const countryBatches = batches.filter(b => countryCenterIds.has(b.centerId));
    const countrySchedules = schedules.filter(s => countryCenterIds.has(s.centerId));
    const countryUsers = users.filter(u => u.countryId === userCountryId || (u.centerId && countryCenterIds.has(u.centerId)));
    const countryAssessors = countryUsers.filter(u => u.role === 'ASSESSOR');
    const countryCenterAdmins = countryUsers.filter(u => u.role === 'CENTER_ADMIN');
    const countrySupportStaff = countryUsers.filter(u => u.role === 'SUPPORT_STAFF');
    const countryAssessments = assessments.filter(a => a.centerId ? countryCenterIds.has(a.centerId) : false);
    const countryResults = results.filter(r => r.centerId ? countryCenterIds.has(r.centerId) : false);
    const countryAudits = auditLogs.filter(a => a.countryId === userCountryId || (a.centerId ? countryCenterIds.has(a.centerId) : false));
    const countryLiveActivities = liveActivities.filter(a => a.centerId ? countryCenterIds.has(a.centerId) : false);

    const totalCountryCenters = countryCenters.length;
    const activeCountryCenters = countryCenters.filter(c => c.status === 'ACTIVE').length;
    const totalCountryCandidates = countryCandidates.length;
    const enrolledCandidatesCount = countryCandidates.filter(c => 
      c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED' || c.status === 'VERIFIED' || c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATED' || c.status === 'SUBMITTED' || c.status === 'LOCKED' || c.status === 'COMPLETED'
    ).length;
    const cbtCompletedCount = countryCandidates.filter(c => c.cbtStatus === 'COMPLETED' || c.cbtScore !== undefined).length || countryAssessments.filter(a => a.theoryScore !== undefined).length;
    const practicalCompletedCount = countryCandidates.filter(c => c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATION_PENDING' || c.status === 'SUBMITTED' || c.status === 'LOCKED').length || countryAssessments.filter(a => a.practicalScore !== undefined).length;
    const pendingEvaluationCount = countryAssessments.filter(a => a.status === 'EVALUATION_PENDING' || a.status === 'SUBMITTED').length || countryCandidates.filter(c => c.status === 'EVALUATION_PENDING' || (c.status === 'IN_ASSESSMENT' && c.practicalStatus === 'COMPLETED')).length;
    const resultsSubmittedCount = countryResults.filter(r => r.status === 'SUBMITTED').length || countryCandidates.filter(c => c.status === 'SUBMITTED').length;
    const lockedResultsCount = countryResults.filter(r => r.status === 'LOCKED' || r.status === 'CORRECTED').length || countryCandidates.filter(c => c.status === 'LOCKED' || c.resultLocked === true).length;

    const countryKpis = [
      { id: 'centers', label: language === 'ar' ? 'المراكز المعتمدة' : 'Accredited Centers', value: totalCountryCenters, badge: `${activeCountryCenters} Active`, icon: Building2, link: '/centers', color: 'maroon' },
      { id: 'admins', label: language === 'ar' ? 'مدراء المراكز' : 'Center Admins', value: countryCenterAdmins.length, badge: 'Hub Leads', icon: Users2, link: '/users', color: 'gold' },
      { id: 'assessors', label: language === 'ar' ? 'المقيمون المعتمدون' : 'Accredited Assessors', value: countryAssessors.length, badge: 'Field Evaluators', icon: UserCheck, link: '/assessors', color: 'maroon' },
      { id: 'batches', label: language === 'ar' ? 'الدفعات النشطة' : 'Active Batches', value: countryBatches.length, badge: 'Operational', icon: Layers, link: '/batches', color: 'gold' },
      { id: 'candidates', label: language === 'ar' ? 'إجمالي المرشحين' : 'National Candidates', value: totalCountryCandidates, badge: 'Registered', icon: Users2, link: '/candidates', color: 'maroon' },
      { id: 'cbt', label: language === 'ar' ? 'منجز CBT' : 'CBT Passed', value: cbtCompletedCount, badge: 'Theory', icon: CheckSquare, link: '/assessment-monitoring', color: 'gold' },
      { id: 'practical', label: language === 'ar' ? 'العملي المكتمل' : 'Practical Completed', value: practicalCompletedCount, badge: 'Assessed', icon: Award, link: '/assessment-monitoring?tab=practical', color: 'maroon' },
      { id: 'locked', label: language === 'ar' ? 'الشهادات المعتمدة' : 'Certified Results', value: lockedResultsCount, badge: 'Locked & Issued', icon: Lock, link: '/results', color: 'gold' },
    ];

    const countryPipelineStages = [
      { id: 'scheduled', label: language === 'ar' ? 'مجدول' : 'Scheduled', count: countryCandidates.filter(c => c.status === 'SCHEDULED' || c.status === 'ASSIGNED').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'enrolled', label: language === 'ar' ? 'حاضر ومسجل' : 'Enrolled', count: enrolledCandidatesCount, color: 'bg-stone-50 text-stone-700 border-stone-200' },
      { id: 'cbt', label: language === 'ar' ? 'اختبار CBT' : 'CBT', count: cbtCompletedCount, color: 'bg-amber-50 text-amber-800 border-amber-200' },
      { id: 'practical', label: language === 'ar' ? 'التقييم العملي' : 'Practical', count: practicalCompletedCount, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { id: 'evaluation', label: language === 'ar' ? 'التدقيق والتقييم' : 'Evaluation', count: pendingEvaluationCount, color: 'bg-purple-50 text-purple-700 border-purple-200' },
      { id: 'submitted', label: language === 'ar' ? 'النتائج المرفوعة' : 'Result', count: resultsSubmittedCount, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      { id: 'locked', label: language === 'ar' ? 'مقفل ومعتمد' : 'Locked', count: lockedResultsCount, color: 'bg-[#F8ECEE] text-[#7A2E3A] border-[#E8D9D2]' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Country Header Banner */}
        <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_2px_8px_rgba(63,48,48,0.04)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#7A2E3A] tracking-tight">
                  {language === 'ar' ? currentCountry.nameAr : currentCountry.nameEn}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                  {currentCountry.code}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {language === 'ar' ? 'نطاق سيادي وطني' : 'Sovereign National Account'}
                </span>
              </div>
              <p className="text-xs text-[#806F6F] mt-1 flex items-center gap-3 flex-wrap">
                <span>{language === 'ar' ? 'مدير الحساب الوطني:' : 'Country Director:'} <strong className="text-[#3F3030]">{user.name}</strong></span>
                <span>•</span>
                <span>{language === 'ar' ? 'المراكز التابعة:' : 'Affiliated Centers:'} <strong className="text-[#3F3030]">{totalCountryCenters} {language === 'ar' ? 'مركز' : 'Centers'}</strong></span>
                <span>•</span>
                <span>{language === 'ar' ? 'إجمالي الدفعات:' : 'Total Cohorts:'} <strong className="text-[#3F3030]">{countryBatches.length}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {t.common.refresh}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/reports')}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'التقارير الوطنية' : 'National Reports'}
            </Button>
          </div>
        </div>

        {/* Security & RBAC Isolation Notice */}
        <div className="p-3.5 rounded-xl bg-[#FBF6E8] border border-[#E8D9D2] flex items-center justify-between gap-3 text-xs text-[#806F6F]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#C9A24D] shrink-0" />
            <span>
              {language === 'ar'
                ? `بيانات هذا الحساب مقيدة ومفصولة تماماً لنطاق ${currentCountry.nameAr}. لا يمكن الوصول إلى بيانات أي دولة أخرى.`
                : `Security Scope Hardening: This account is strictly partitioned to ${currentCountry.nameEn}. Access to other sovereign jurisdictions is prevented by RBAC.`}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#7A2E3A] uppercase tracking-wider shrink-0 bg-white px-2 py-0.5 rounded border border-[#E8D9D2]">
            Data Boundary Active
          </span>
        </div>

        {/* Country KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {countryKpis.map(kpi => {
            const Icon = kpi.icon;
            const isMaroon = kpi.color === 'maroon';
            return (
              <div
                key={kpi.id}
                onClick={() => onNavigate(kpi.link)}
                className="p-3 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.02)] hover:border-[#7A2E3A] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${isMaroon ? 'bg-[#F8ECEE] text-[#7A2E3A]' : 'bg-[#FBF6E8] text-[#C9A24D]'} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FAF8F5] text-[#806F6F] border border-[#E8D9D2]/70">
                    {kpi.badge}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#3F3030] tracking-tight group-hover:text-[#7A2E3A] transition-colors">
                    {kpi.value}
                  </div>
                  <div className="text-[11px] text-[#806F6F] font-medium mt-0.5 leading-snug line-clamp-1">
                    {kpi.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* National Pipeline Progression */}
        <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
              {language === 'ar' ? 'مسار تقييم المرشحين الوطني' : 'National Assessment Pipeline'}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('/assessment-monitoring')}
              className="text-xs text-[#7A2E3A] font-semibold hover:underline flex items-center gap-1"
            >
              <span>{language === 'ar' ? 'عرض غرفة المراقبة' : 'Live Operations'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {countryPipelineStages.map(stage => (
              <div
                key={stage.id}
                onClick={() => onNavigate('/assessment-monitoring')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.02] ${stage.color}`}
              >
                <div className="text-xl font-bold">{stage.count}</div>
                <div className="text-[11px] font-medium mt-0.5 truncate">{stage.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-Column Operations Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Accredited Centers in this Country */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#E8D9D2] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'المراكز المعتمدة في الدولة' : 'National Accredited Assessment Centers'}
                  </h3>
                  <p className="text-xs text-[#806F6F]">
                    {language === 'ar' ? 'متابعة الطاقة الاستيعابية والنشاط الميداني' : 'Hub performance and active operational throughput'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('/centers')}
                >
                  {language === 'ar' ? 'إدارة المراكز' : 'Manage Centers'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FFFCF8] text-[#806F6F] uppercase border-b border-[#E8D9D2]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز' : 'Center'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المدينة' : 'City'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'السعة' : 'Capacity'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'المرشحون' : 'Candidates'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {countryCenters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#806F6F]">
                          {language === 'ar' ? 'لا توجد مراكز معتمدة مسجلة لهذه الدولة حالياً' : 'No accredited centers registered for this country.'}
                        </td>
                      </tr>
                    ) : (
                      countryCenters.map(center => {
                        const candCount = candidates.filter(c => c.centerId === center.id).length;
                        return (
                          <tr key={center.id} className="hover:bg-[#FFFCF8] transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#3F3030]">
                                {language === 'ar' ? center.nameAr : center.nameEn}
                              </div>
                              <div className="font-mono text-[10px] text-[#806F6F]">{center.code}</div>
                            </td>
                            <td className="py-2.5 px-3 text-[#3F3030]">{center.city}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium">{center.capacity}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#7A2E3A]">{candCount}</td>
                            <td className="py-2.5 px-3 text-center">
                              <StatusBadge status={center.status} />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/centers`)}
                                className="p-1 rounded text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                                title={language === 'ar' ? 'عرض المركز' : 'View Hub'}
                              >
                                <Eye className="w-4 h-4" />
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
          </div>

          {/* Right Col: National Audits & Profile Dossier */}
          <div className="space-y-6">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7A2E3A]" />
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {language === 'ar' ? 'سجل العمليات الوطنية' : 'National Activity Log'}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[#806F6F]">
                  {countryAudits.length} events
                </span>
              </div>
              <div className="p-3 space-y-2.5 max-h-[380px] overflow-y-auto">
                {countryAudits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#806F6F]">
                    {language === 'ar' ? 'لا توجد سجلات عمليات للدولة' : 'No national audit records found'}
                  </div>
                ) : (
                  countryAudits.slice(0, 6).map(log => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#3F3030] truncate">{log.userName}</span>
                        <span className="font-mono text-[10px] text-[#806F6F] shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#806F6F] leading-tight">
                        {log.action} • {log.details}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Country Director Dossier Card */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#3F3030]">
                <UserCircle className="w-4 h-4 text-[#7A2E3A]" />
                <span>{language === 'ar' ? 'بيانات المشرف السيادي' : 'Country Director Dossier'}</span>
              </div>
              <div className="text-[11px] text-[#806F6F] space-y-1 pt-1 border-t border-[#E8D9D2]">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-semibold text-[#3F3030]">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-mono font-semibold text-[#7A2E3A]">COUNTRY_ACCOUNT</span>
                </div>
                <div className="flex justify-between">
                  <span>Jurisdiction:</span>
                  <span className="font-mono text-[#3F3030]">{currentCountry.nameEn} ({currentCountry.code})</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-700 font-semibold">{user.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CENTER ADMIN VIEW - Strict Center-Scoped Operations
  if (user?.role === 'CENTER_ADMIN') {
    const userCenterId = user.centerId || 'ctr-sa-1';
    const currentCenter = centers.find(c => c.id === userCenterId) || {
      id: userCenterId,
      code: 'CTR-SA-001',
      nameEn: 'Riyadh Central Technical Hub',
      nameAr: 'مركز الرياض التقني المركزي',
      city: 'Riyadh',
      address: 'King Fahd Road, Olaya District, Riyadh',
      capacity: 120,
      status: 'ACTIVE'
    };

    const centerCandidates = candidates.filter(c => c.centerId === userCenterId);
    const centerSchedules = schedules.filter(s => s.centerId === userCenterId);
    const centerBatches = batches.filter(b => b.centerId === userCenterId);
    const centerAssessors = users.filter(u => u.role === 'ASSESSOR' && u.centerId === userCenterId);
    const centerSupportStaff = users.filter(u => u.role === 'SUPPORT_STAFF' && u.centerId === userCenterId);
    const centerAssessments = assessments.filter(a => a.centerId === userCenterId);
    const centerResults = results.filter(r => r.centerId === userCenterId);
    const centerAudits = auditLogs.filter(a => a.centerId === userCenterId || a.userId === user.id);
    const centerLiveActivities = liveActivities.filter(a => a.centerId === userCenterId);

    // Section 5 Center KPIs strictly calculated from stored data
    const totalAssessors = centerAssessors.length;
    const supportStaffCount = centerSupportStaff.length;
    const todaySchedulesCount = centerSchedules.length;
    const activeBatchesCount = centerBatches.filter(b => b.status === 'ACTIVE').length;
    const totalCandidatesCount = centerCandidates.length;
    const enrolledCandidatesCount = centerCandidates.filter(c => 
      c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED' || c.status === 'VERIFIED' || c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATED' || c.status === 'SUBMITTED' || c.status === 'LOCKED' || c.status === 'COMPLETED'
    ).length;
    const cbtCompletedCount = centerCandidates.filter(c => c.cbtStatus === 'COMPLETED' || c.cbtScore !== undefined).length || centerAssessments.filter(a => a.theoryScore !== undefined).length;
    const practicalCompletedCount = centerCandidates.filter(c => c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED' || c.status === 'EVALUATION_PENDING' || c.status === 'SUBMITTED' || c.status === 'LOCKED').length || centerAssessments.filter(a => a.practicalScore !== undefined).length;
    const pendingEvaluationCount = centerAssessments.filter(a => a.status === 'EVALUATION_PENDING' || a.status === 'SUBMITTED').length || centerCandidates.filter(c => c.status === 'EVALUATION_PENDING' || (c.status === 'IN_ASSESSMENT' && c.practicalStatus === 'COMPLETED')).length;
    const resultsSubmittedCount = centerResults.filter(r => r.status === 'SUBMITTED').length || centerCandidates.filter(c => c.status === 'SUBMITTED').length;
    const lockedResultsCount = centerResults.filter(r => r.status === 'LOCKED' || r.status === 'CORRECTED').length || centerCandidates.filter(c => c.status === 'LOCKED' || c.resultLocked === true).length;

    const centerKpis = [
      { id: 'assessors', label: language === 'ar' ? 'إجمالي المقيمين' : 'Total Assessors', value: totalAssessors, badge: 'Accredited', icon: UserCheck, link: '/assessors', color: 'maroon' },
      { id: 'staff', label: language === 'ar' ? 'فريق الدعم' : 'Support Staff', value: supportStaffCount, badge: 'On Site', icon: Users2, link: '/support-staff', color: 'gold' },
      { id: 'schedules', label: language === 'ar' ? 'جداول اليوم' : "Today's Schedules", value: todaySchedulesCount, badge: 'Scheduled', icon: CalendarCheck, link: '/schedules', color: 'maroon' },
      { id: 'batches', label: language === 'ar' ? 'الدفعات النشطة' : 'Active Batches', value: activeBatchesCount, badge: 'Operational', icon: Layers, link: '/batches', color: 'gold' },
      { id: 'candidates', label: language === 'ar' ? 'إجمالي المرشحين' : 'Total Candidates', value: totalCandidatesCount, badge: 'Center Pool', icon: Users2, link: '/candidates', color: 'maroon' },
      { id: 'enrolled', label: language === 'ar' ? 'المرشحون المسجلون' : 'Enrolled Candidates', value: enrolledCandidatesCount, badge: 'Verified', icon: CheckCircle2, link: '/enrollment', color: 'gold' },
      { id: 'cbt', label: language === 'ar' ? 'منجز CBT' : 'CBT Completed', value: cbtCompletedCount, badge: 'Theory Passed', icon: CheckSquare, link: '/assessment-monitoring', color: 'maroon' },
      { id: 'practical', label: language === 'ar' ? 'العملي المكتمل' : 'Practical Completed', value: practicalCompletedCount, badge: 'Workstation Done', icon: Award, link: '/assessment-monitoring?tab=practical', color: 'gold' },
      { id: 'pendingEval', label: language === 'ar' ? 'بانتظار التقييم' : 'Pending Evaluation', value: pendingEvaluationCount, badge: 'Awaiting Rubric', icon: Clock, link: '/assessment-monitoring', color: 'maroon' },
      { id: 'submitted', label: language === 'ar' ? 'النتائج المرفوعة' : 'Results Submitted', value: resultsSubmittedCount, badge: 'Submitted', icon: FileText, link: '/results', color: 'gold' },
      { id: 'locked', label: language === 'ar' ? 'النتائج المقفلة' : 'Locked Results', value: lockedResultsCount, badge: 'Immutable', icon: Lock, link: '/results', color: 'maroon' },
    ];

    const centerPipelineStages = [
      { id: 'scheduled', label: language === 'ar' ? 'مجدول' : 'Scheduled', count: centerCandidates.filter(c => c.status === 'SCHEDULED' || c.status === 'ASSIGNED').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'enrolled', label: language === 'ar' ? 'حاضر ومسجل' : 'Enrolled', count: enrolledCandidatesCount, color: 'bg-stone-50 text-stone-700 border-stone-200' },
      { id: 'cbt', label: language === 'ar' ? 'اختبار CBT' : 'CBT', count: cbtCompletedCount, color: 'bg-amber-50 text-amber-800 border-amber-200' },
      { id: 'practical', label: language === 'ar' ? 'التقييم العملي' : 'Practical', count: practicalCompletedCount, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { id: 'evaluation', label: language === 'ar' ? 'التدقيق والتقييم' : 'Evaluation', count: pendingEvaluationCount, color: 'bg-purple-50 text-purple-700 border-purple-200' },
      { id: 'submitted', label: language === 'ar' ? 'النتائج المرفوعة' : 'Result', count: resultsSubmittedCount, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      { id: 'locked', label: language === 'ar' ? 'مقفل ومعتمد' : 'Locked', count: lockedResultsCount, color: 'bg-[#F8ECEE] text-[#7A2E3A] border-[#E8D9D2]' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Center Header Banner */}
        <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_2px_8px_rgba(63,48,48,0.04)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#7A2E3A] tracking-tight">
                  {language === 'ar' ? currentCenter.nameAr : currentCenter.nameEn}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                  {currentCenter.code}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {language === 'ar' ? 'مركز معتمد نشط' : 'Active Certified Center'}
                </span>
              </div>
              <p className="text-xs text-[#806F6F] mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A24D]" />
                  {currentCenter.city}, {currentCenter.address || 'Saudi Arabia'}
                </span>
                <span>•</span>
                <span>{language === 'ar' ? 'مدير المركز:' : 'Center Admin:'} <strong className="text-[#3F3030]">{user.name}</strong></span>
                <span>•</span>
                <span>{language === 'ar' ? 'السعة التشغيلية:' : 'Capacity:'} <strong className="text-[#3F3030]">{currentCenter.capacity || 120} {language === 'ar' ? 'مقعد' : 'Seats'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {t.common.refresh}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/enrollment')}
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'تسجيل مرشح' : 'Enroll Candidate'}
            </Button>
          </div>
        </div>

        {/* Quick Action Operation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/schedules?action=create')}
            className="p-3 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#F8ECEE]/50 hover:border-[#7A2E3A]/40 transition-all text-start flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-[#3F3030] block group-hover:text-[#7A2E3A]">
                {language === 'ar' ? 'إنشاء جدول جديد' : 'Create Schedule'}
              </span>
              <span className="text-[10px] text-[#806F6F] block truncate">
                {language === 'ar' ? 'تخصيص مقاعد ومواعيد' : 'Define assessment slot'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/batches?action=create')}
            className="p-3 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#F8ECEE]/50 hover:border-[#7A2E3A]/40 transition-all text-start flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FBF6E8] text-[#C9A24D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-[#3F3030] block group-hover:text-[#7A2E3A]">
                {language === 'ar' ? 'إنشاء دفعة جديدة' : 'Create Batch'}
              </span>
              <span className="text-[10px] text-[#806F6F] block truncate">
                {language === 'ar' ? 'تجميع المرشحين' : 'Cohort group tracking'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/reservations?tab=import')}
            className="p-3 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#F8ECEE]/50 hover:border-[#7A2E3A]/40 transition-all text-start flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-[#3F3030] block group-hover:text-[#7A2E3A]">
                {language === 'ar' ? 'استيراد الحجوزات' : 'Import Reservations'}
              </span>
              <span className="text-[10px] text-[#806F6F] block truncate">
                {language === 'ar' ? 'معالجة ملفات المرشحين' : 'Process and validate'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/enrollment')}
            className="p-3 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#F8ECEE]/50 hover:border-[#7A2E3A]/40 transition-all text-start flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FBF6E8] text-[#C9A24D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-[#3F3030] block group-hover:text-[#7A2E3A]">
                {language === 'ar' ? 'التحقق والقرعة' : 'Enroll & Lottery'}
              </span>
              <span className="text-[10px] text-[#806F6F] block truncate">
                {language === 'ar' ? 'التقاط الصورة وتوليد المهمة' : 'Photo & task trigger'}
              </span>
            </div>
          </button>
        </div>

        {/* Center KPIs Grid (11 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#7A2E3A] rounded-full" />
              {language === 'ar' ? 'مؤشرات الأداء التشغيلية للمركز' : 'Center Operational Key Performance Indicators'}
            </h3>
            <span className="text-[11px] text-[#806F6F] font-mono">
              {language === 'ar' ? 'بيانات حية من التخزين المحلي' : 'Calculated live from storage'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {centerKpis.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => onNavigate(card.link)}
                  className="p-3.5 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#FFFCF8] hover:border-[#C9A24D]/50 transition-all cursor-pointer shadow-[0_1px_3px_rgba(63,48,48,0.03)] flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-[#806F6F] tracking-tight truncate max-w-[100px]">
                      {card.label}
                    </span>
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      card.color === 'maroon' ? 'bg-[#F8ECEE] text-[#7A2E3A]' : 'bg-[#FBF6E8] text-[#C9A24D]'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#3F3030] group-hover:text-[#7A2E3A] transition-colors">
                      {card.value}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#806F6F]">{card.badge}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#C9A24D] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Horizontal Assessment Pipeline Stages */}
        <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#C9A24D] rounded-full" />
              {language === 'ar' ? 'مسار تقييم المرشحين بالمركز' : 'Center Assessment Pipeline Workflow'}
            </h4>
            <span className="text-[11px] text-[#806F6F]">
              {language === 'ar' ? 'متابعة تدفق المرشحين لحظياً' : 'Live Candidate Flow Tracking'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {centerPipelineStages.map((stage, idx) => (
              <div 
                key={stage.id} 
                onClick={() => onNavigate('/assessment-monitoring')}
                className={`p-3 rounded-lg border ${stage.color} flex flex-col justify-between cursor-pointer hover:shadow-xs transition-shadow`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-1">
                  <span>Step {idx + 1}</span>
                  <span className="font-mono text-xs">{stage.count}</span>
                </div>
                <div className="text-xs font-bold truncate">
                  {stage.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Center Candidate Operational Registry (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
              <div className="p-4 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {language === 'ar' ? 'سجل المرشحين الحاليين بالمركز' : 'Active Center Candidate Registry'}
                  </h4>
                  <p className="text-[11px] text-[#806F6F] mt-0.5">
                    {language === 'ar' ? `إجمالي ${centerCandidates.length} مرشح مسجل لهذا المركز` : `${centerCandidates.length} registered candidates for this center`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/candidates')}
                  className="text-xs text-[#7A2E3A] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{t.common.view} {language === 'ar' ? 'الكل' : 'All'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FFFFFF] text-[#806F6F] border-b border-[#E8D9D2]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.fullName}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.passport}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.occupation}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.assessmentStatus}</th>
                      <th className="py-2.5 px-3 text-end font-semibold">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {centerCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-[#806F6F]">
                          {language === 'ar' ? 'لا يوجد مرشحون مسجلون في هذا المركز حتى الآن.' : 'No candidates registered in this center yet.'}
                        </td>
                      </tr>
                    ) : (
                      centerCandidates.slice(0, 6).map(c => (
                        <tr key={c.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <div className="text-[#3F3030] font-semibold">{language === 'ar' ? c.fullNameAr : c.fullNameEn}</div>
                            <div className="text-[10px] text-[#806F6F] font-mono">{c.aproReference}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">{c.passportNumber}</td>
                          <td className="py-2.5 px-3 text-[#3F3030] truncate max-w-[150px]">{c.occupation}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-2.5 px-3 text-end">
                            <button
                              type="button"
                              onClick={() => onNavigate(`/candidates`)}
                              className="p-1 px-2 rounded text-xs text-[#7A2E3A] hover:bg-[#F8ECEE] font-medium transition-colors"
                            >
                              {t.common.view}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Live Center Activity & Schedules (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Section 6: Center Recent Activity Feed */}
            <div className="border border-[#E8D9D2] rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#7A2E3A]" />
                  {language === 'ar' ? 'النشاط الأخير للمركز' : 'Center Live Activity'}
                </h4>
                <button 
                  type="button" 
                  onClick={() => onNavigate('/live-activity')}
                  className="text-[11px] text-[#7A2E3A] font-semibold hover:underline"
                >
                  {t.common.view}
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {centerAudits.length === 0 && centerLiveActivities.length === 0 ? (
                  <p className="text-xs text-[#806F6F] py-4 text-center">
                    {language === 'ar' ? 'لا توجد أنشطة مسجلة حديثاً للمركز.' : 'No recent activities recorded for this center.'}
                  </p>
                ) : (
                  (centerAudits.length > 0 ? centerAudits : centerLiveActivities as any).slice(0, 5).map((act: any) => (
                    <div key={act.id} className="text-xs pb-2 border-b border-[#E8D9D2] last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-[10px] text-[#806F6F] mb-0.5">
                        <span className="font-bold text-[#7A2E3A]">{act.action?.replace(/_/g, ' ') || 'OPERATION'}</span>
                        <span className="font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#3F3030] font-medium line-clamp-1">{act.details || act.entity}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#806F6F] mt-0.5">
                        <span>{act.userName || act.user}</span>
                        <span className="font-mono text-[#C9A24D]">{currentCenter.code}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Center Grievance & Compliance Governance Card */}
            <div className="border border-[#E8D9D2] rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7A2E3A]" />
                  {language === 'ar' ? 'حوكمة الشكاوى والامتثال بالمركز' : 'Center Grievance & Compliance'}
                </h4>
                <button
                  type="button"
                  onClick={() => onNavigate('/complaints')}
                  className="text-[11px] text-[#7A2E3A] font-semibold hover:underline"
                >
                  {language === 'ar' ? 'سجل الشكاوى' : 'Complaints'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                  <span className="text-[10px] text-[#806F6F] block">
                    {language === 'ar' ? 'الشكاوى النشطة' : 'Active Grievances'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-[#7A2E3A] font-mono text-sm">
                      {complaints.filter(c => c.centerId === userCenterId && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length}
                    </span>
                    <span className="text-[10px] text-[#806F6F]">
                      {language === 'ar' ? 'قيد المعالجة' : 'in review'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                  <span className="text-[10px] text-[#806F6F] block">
                    {language === 'ar' ? 'أقفال التقييم المعتمدة' : 'ISO Sealed Ratings'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {results.filter(r => r.centerId === userCenterId && r.status === 'LOCKED').length}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      100% Sealed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Immediate Center Schedules */}
            <div className="border border-[#E8D9D2] rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#C9A24D]" />
                  {language === 'ar' ? 'جداول المركز القادمة' : 'Upcoming Center Schedules'}
                </h4>
                <button 
                  type="button" 
                  onClick={() => onNavigate('/schedules')}
                  className="text-[11px] text-[#7A2E3A] font-semibold hover:underline"
                >
                  {t.common.view}
                </button>
              </div>

              <div className="space-y-2.5">
                {centerSchedules.length === 0 ? (
                  <p className="text-xs text-[#806F6F] py-4 text-center">
                    {language === 'ar' ? 'لا توجد جداول مسجلة لهذا المركز.' : 'No schedules configured for this center.'}
                  </p>
                ) : (
                  centerSchedules.slice(0, 3).map(sch => (
                    <div key={sch.id} className="p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-xs">
                      <div className="flex items-center justify-between font-semibold text-[#3F3030] mb-0.5">
                        <span className="font-mono">{sch.code}</span>
                        <span className="text-[10px] text-[#806F6F]">{sch.date}</span>
                      </div>
                      <p className="text-[#806F6F] truncate">{sch.occupation}</p>
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#E8D9D2] text-[10px] text-[#806F6F]">
                        <span>Seats: {sch.assignedCandidates}/{sch.totalSeats}</span>
                        <span className="font-mono text-[#7A2E3A]">{sch.timeSlot}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SUPPORT STAFF / ORGANIZER / CBT TEST SUPPORT VIEW - Center-Scoped Operational Support Dashboard
  if (user?.role === 'SUPPORT_STAFF' || user?.role === 'ORGANIZER' || user?.role === 'CBT_TEST_SUPPORT') {
    const userCenterId = user.centerId || 'ctr-sa-1';
    const currentCenter = centers.find(c => c.id === userCenterId) || {
      id: userCenterId,
      code: 'CTR-SA-001',
      nameEn: 'Riyadh Central Technical Hub',
      nameAr: 'مركز الرياض التقني المركزي',
      city: 'Riyadh',
      address: 'King Fahd Road, Olaya District, Riyadh',
      capacity: 120,
      status: 'ACTIVE'
    };

    const centerCandidates = candidates.filter(c => c.centerId === userCenterId);
    const centerBatches = batches.filter(b => b.centerId === userCenterId);
    const centerLiveActivities = liveActivities.filter(a => !a.centerId || a.centerId === userCenterId);
    const centerNotifications = StorageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []).filter(
      n => !n.targetRole || n.targetRole === 'ALL' || n.targetRole === 'SUPPORT_STAFF' || n.targetRole === 'ORGANIZER' || n.targetRole === 'CBT_TEST_SUPPORT'
    );

    // Operational KPI calculations derived directly from real data
    const totalCandidatesCount = centerCandidates.length;
    const pendingEnrollmentCount = centerCandidates.filter(c => {
      const isEntryVerified = c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true;
      const alreadyEnrolled = c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLMENT_VERIFY';
      return isEntryVerified && !alreadyEnrolled;
    }).length;
    const enrollVerifyCount = centerCandidates.filter(c => 
      c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLMENT_VERIFY' || c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED'
    ).length;
    const cbtPendingCount = centerCandidates.filter(c => {
      const isEnrolled = c.enrollmentStatus === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLED' || c.status === 'ENROLLMENT_VERIFY' || !!c.enrolledAt;
      const isCbtPending = (!c.cbtStatus || c.cbtStatus === 'NOT_STARTED' || c.cbtStatus === 'PENDING') && c.cbtStatus !== 'CONFIRMED' && c.cbtStatus !== 'COMPLETED';
      return isEnrolled && isCbtPending;
    }).length;
    const cbtConfirmedCount = centerCandidates.filter(c => c.cbtStatus === 'CONFIRMED' || c.status === 'CBT_EXAM_CONFIRMED').length;
    const verifiedCandidatesCount = centerCandidates.filter(c => 
      c.enrollmentStatus === 'ENROLLED' || c.status === 'VERIFIED' || c.status === 'ENROLLED' || c.status === 'IN_PROGRESS' || c.status === 'COMPLETED'
    ).length;
    const exitCandidatesCount = centerCandidates.filter(c => c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true).length;
    const inProgressAssessmentsCount = centerCandidates.filter(c => c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.practicalStatus === 'IN_PROGRESS' || c.cbtStatus === 'IN_PROGRESS').length;
    const unreadNotificationsCount = centerNotifications.filter(n => !n.read).length;

    const isSupportStaffUser = user.role === 'SUPPORT_STAFF';
    const isOrganizerUser = user.role === 'ORGANIZER';
    const isCbtTestSupportUser = user.role === 'CBT_TEST_SUPPORT';

    const supportKpis = isCbtTestSupportUser ? [
      {
        id: 'cbtPending',
        label: language === 'ar' ? 'بانتظار اختبار CBT' : 'CBT Exam Pending',
        value: cbtPendingCount,
        badge: language === 'ar' ? 'جاهز للاختبار' : 'Ready for CBT',
        icon: CheckSquare,
        link: '/cbt-exam-pending',
        color: 'maroon'
      },
      {
        id: 'cbtConfirmed',
        label: language === 'ar' ? 'مؤكد اختبار CBT' : 'CBT Confirmed',
        value: cbtConfirmedCount,
        badge: language === 'ar' ? 'مصرح' : 'Authorized',
        icon: CheckCircle2,
        link: '/cbt-confirmed',
        color: 'gold'
      },
      {
        id: 'inProgress',
        label: language === 'ar' ? 'التقييمات الجارية ميدانياً' : 'Assessments In Progress',
        value: inProgressAssessmentsCount,
        badge: language === 'ar' ? 'مباشر' : 'Live Telemetry',
        icon: Activity,
        link: '/assessment-monitoring?tab=pipeline',
        color: 'maroon'
      },
      {
        id: 'notifications',
        label: language === 'ar' ? 'مهام وتنبيهات الدعم' : 'Support Tasks & Alerts',
        value: unreadNotificationsCount,
        badge: language === 'ar' ? 'معلق' : 'Actionable',
        icon: Bell,
        link: '/support/notifications',
        color: 'gold'
      },
    ] : isOrganizerUser ? [
      {
        id: 'pendingEnrollment',
        label: language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending',
        value: pendingEnrollmentCount,
        badge: language === 'ar' ? 'مؤكد الدخول' : 'Entry Verified',
        icon: UserCheck,
        link: '/enrollment-pending',
        color: 'gold'
      },
      {
        id: 'enrollVerify',
        label: language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify',
        value: enrollVerifyCount,
        badge: language === 'ar' ? 'معتمد' : 'Enrolled',
        icon: ShieldCheck,
        link: '/enroll-verify',
        color: 'maroon'
      },
      {
        id: 'inProgress',
        label: language === 'ar' ? 'التقييمات الجارية ميدانياً' : 'Assessments In Progress',
        value: inProgressAssessmentsCount,
        badge: language === 'ar' ? 'مباشر' : 'Live Telemetry',
        icon: Activity,
        link: '/assessment-monitoring?tab=pipeline',
        color: 'maroon'
      },
      {
        id: 'notifications',
        label: language === 'ar' ? 'مهام وتنبيهات الدعم' : 'Support Tasks & Alerts',
        value: unreadNotificationsCount,
        badge: language === 'ar' ? 'معلق' : 'Actionable',
        icon: Bell,
        link: '/support/notifications',
        color: 'gold'
      },
    ] : [
      {
        id: 'candidates',
        label: language === 'ar' ? 'إجمالي المرشحين بالمركز' : "Today's Center Candidates",
        value: totalCandidatesCount,
        badge: language === 'ar' ? 'مسجلون' : 'Active Cohort',
        icon: Users2,
        link: '/candidates',
        color: 'maroon'
      },
      {
        id: 'verified',
        label: language === 'ar' ? 'المرشحون المتحقق منهم' : 'Identity Verified',
        value: verifiedCandidatesCount,
        badge: language === 'ar' ? 'مكتمل' : 'Intake Ready',
        icon: CheckCircle2,
        link: '/candidates',
        color: 'gold'
      },
      {
        id: 'exitList',
        label: language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List',
        value: exitCandidatesCount,
        badge: language === 'ar' ? 'مغادرة' : 'Exit Flow',
        icon: LogOut,
        link: '/candidate-exit-list',
        color: 'maroon'
      },
      {
        id: 'inProgress',
        label: language === 'ar' ? 'التقييمات الجارية ميدانياً' : 'Assessments In Progress',
        value: inProgressAssessmentsCount,
        badge: language === 'ar' ? 'مباشر' : 'Live Telemetry',
        icon: Activity,
        link: '/assessment-monitoring?tab=pipeline',
        color: 'gold'
      },
      {
        id: 'notifications',
        label: language === 'ar' ? 'مهام وتنبيهات الدعم' : 'Support Tasks & Alerts',
        value: unreadNotificationsCount,
        badge: language === 'ar' ? 'معلق' : 'Actionable',
        icon: Bell,
        link: '/support/notifications',
        color: 'maroon'
      },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Support Staff Header Banner */}
        <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_2px_8px_rgba(63,48,48,0.04)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#7A2E3A] tracking-tight">
                  {language === 'ar' ? currentCenter.nameAr : currentCenter.nameEn}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                  {currentCenter.code}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {language === 'ar' ? 'وردية التشغيل النشطة' : 'Active Support Shift'}
                </span>
              </div>
              <p className="text-xs text-[#806F6F] mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#3F3030]">{user.name}</span>
                <span>•</span>
                <span className="text-[#C9A24D] font-medium">
                  {user.assignedFunction || (user.role === 'CBT_TEST_SUPPORT' ? (language === 'ar' ? 'دعم وتأكيد اختبار الحاسب CBT' : 'CBT Exam Authorization & Live Photo') : (user.role === 'ORGANIZER' ? (language === 'ar' ? 'منسق المركز المعتمد' : 'Center Organizer Operations') : (language === 'ar' ? 'الاستقبال والتحقق من الهوية' : 'Reception & Biometric Verification')))}
                </span>
                <span>•</span>
                <span>{language === 'ar' ? 'نطاق الدعم التشغيلي للمركز' : 'Center Operational Support Scope'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {t.common.refresh}
            </Button>
            {isCbtTestSupportUser ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('/cbt-exam-pending')}
                  leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'بانتظار اختبار CBT' : 'CBT Exam Pending'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/cbt-confirmed')}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'مؤكد اختبار CBT' : 'CBT Confirmed'}
                </Button>
              </>
            ) : isOrganizerUser ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('/enrollment-pending')}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/enroll-verify')}
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('/candidates')}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'قائمة المرشحين' : 'Candidate List'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/candidate-exit-list')}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'قائمة الخروج' : 'Candidate Exit List'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Operational Duty Boundary Notice */}
        <div className="p-3.5 rounded-xl bg-[#FBF6E8] border border-[#E8D9D2] flex items-center justify-between gap-3 text-xs text-[#806F6F]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#C9A24D] shrink-0" />
            <span>
              {isCbtTestSupportUser
                ? (language === 'ar'
                    ? 'مهام دعم اختبار CBT: التحقق من جاهزية المرشحين المسجلين، التقاط صورة اختبار CBT الإلزامية بالكاميرا المباشرة، وتأكيد الإذن ببدء اختبار الحاسب الآلي للمركز.'
                    : 'CBT Test Support Mandate: Verify enrolled candidate readiness, capture mandatory live camera CBT photo, and authorize candidates to start center CBT computer tests.')
                : isOrganizerUser
                ? (language === 'ar'
                    ? 'مهام منسق المركز: التحقق من حضور المرشحين، استكمال إجراءات التسجيل في الورش، والتحقق من التسجيل المعتمد.'
                    : 'Organizer Mandate: Candidate enrollment, workstation attendance registration, and enroll verification.')
                : (language === 'ar'
                    ? 'مهام فريق الدعم: استقبال المرشحين، التحقق من الجوازات والهوية، وتأكيد قائمة خروج المرشحين بعد انتهاء التقييم.'
                    : 'Support Staff Mandate: Candidate identity verification, passport matching, reception, and candidate exit verification.')}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#7A2E3A] uppercase tracking-wider shrink-0 bg-white px-2 py-0.5 rounded border border-[#E8D9D2]">
            RBAC Compliant
          </span>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {supportKpis.map(kpi => {
            const Icon = kpi.icon;
            const isMaroon = kpi.color === 'maroon';
            return (
              <div
                key={kpi.id}
                onClick={() => onNavigate(kpi.link)}
                className="p-3.5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.02)] hover:border-[#7A2E3A] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${isMaroon ? 'bg-[#F8ECEE] text-[#7A2E3A]' : 'bg-[#FBF6E8] text-[#C9A24D]'} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FAF8F5] text-[#806F6F] border border-[#E8D9D2]/70">
                    {kpi.badge}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#3F3030] tracking-tight group-hover:text-[#7A2E3A] transition-colors">
                    {kpi.value}
                  </div>
                  <div className="text-[11px] text-[#806F6F] font-medium mt-0.5 leading-snug line-clamp-2">
                    {kpi.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Operational Actions Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isCbtTestSupportUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/cbt-exam-pending')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] group-hover:bg-[#7A2E3A] group-hover:text-white transition-colors">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'بانتظار اختبار CBT' : 'CBT Exam Pending'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'التقاط الصورة وتأكيد الاختبار' : 'Photo capture & authorization'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/cbt-confirmed')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#FBF6E8] text-[#C9A24D] group-hover:bg-[#C9A24D] group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'مؤكد اختبار CBT' : 'CBT Confirmed'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'قائمة المرشحين المصرح لهم' : 'Authorized CBT candidate list'}</div>
                </div>
              </button>
            </>
          ) : isOrganizerUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/enrollment-pending')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] group-hover:bg-[#7A2E3A] group-hover:text-white transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'تسجيل المرشحين وتعيين الورش' : 'Candidate enrollment'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/enroll-verify')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#FBF6E8] text-[#C9A24D] group-hover:bg-[#C9A24D] group-hover:text-white transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'سجل المرشحين المسجلين' : 'Enrolled candidate list'}</div>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/candidates')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] group-hover:bg-[#7A2E3A] group-hover:text-white transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'قائمة المرشحين' : 'Candidate Registry'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'التحقق ومطابقة الهوية' : 'Verify identity & APRO'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/candidate-exit-list')}
                className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
              >
                <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] group-hover:bg-[#7A2E3A] group-hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List'}</div>
                  <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'التحقق وتأكيد المغادرة' : 'Verify & confirm exit'}</div>
                </div>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onNavigate('/assessment-monitoring?tab=pipeline')}
            className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
          >
            <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] group-hover:bg-[#7A2E3A] group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'مسار التقييم' : 'Assessment Pipeline'}</div>
              <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'متابعة مراحل الإنجاز' : 'Track pipeline stages'}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/assessment-monitoring?tab=live')}
            className="p-3 rounded-xl bg-white border border-[#E8D9D2] hover:border-[#7A2E3A] hover:bg-[#FFFCF8] transition-all text-start flex items-center gap-3 shadow-2xs group"
          >
            <div className="p-2 rounded-lg bg-[#FBF6E8] text-[#C9A24D] group-hover:bg-[#C9A24D] group-hover:text-white transition-colors">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#3F3030]">{language === 'ar' ? 'الأنشطة الميدانية' : 'Live Activities'}</div>
              <div className="text-[10px] text-[#806F6F]">{language === 'ar' ? 'متابعة حركة الورش والقاعات' : 'Track workshop operations'}</div>
            </div>
          </button>
        </div>

        {/* 2-Column Split: Today's Candidates & Center Operational Live Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Active Candidates Intake (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {isCbtTestSupportUser
                      ? (language === 'ar' ? 'قائمة انتظار وتأكيد اختبار CBT' : 'CBT Examination Queue & Authorization')
                      : isOrganizerUser
                      ? (language === 'ar' ? 'قائمة انتظار وتسجيل المرشحين' : 'Pending Enrollment & Verification Queue')
                      : (language === 'ar' ? 'سجل استقبال وتحقق المرشحين بالمركز' : 'Center Candidate Reception & Verification Pool')}
                  </h4>
                  <p className="text-[11px] text-[#806F6F] mt-0.5">
                    {isCbtTestSupportUser
                      ? (language === 'ar' ? `${cbtPendingCount} مرشح بانتظار تأكيد اختبار CBT` : `${cbtPendingCount} candidates awaiting CBT authorization`)
                      : isOrganizerUser
                      ? (language === 'ar' ? `${pendingEnrollmentCount} مرشح بانتظار استكمال التسجيل` : `${pendingEnrollmentCount} candidates pending enrollment`)
                      : (language === 'ar' ? `${centerCandidates.length} مرشح ضمن نطاق المركز الحالي` : `${centerCandidates.length} candidates assigned to this center`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(isCbtTestSupportUser ? '/cbt-exam-pending' : isOrganizerUser ? '/enrollment-pending' : '/candidates')}
                  className="text-xs text-[#7A2E3A] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{language === 'ar' ? 'عرض الكل' : 'View All'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FFFFFF] text-[#806F6F] border-b border-[#E8D9D2]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.fullName}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.passport}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.candidatesModule.occupation}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{language === 'ar' ? 'الصورة' : 'Photo'}</th>
                      <th className="py-2.5 px-3 text-start font-semibold">{t.common.status}</th>
                      <th className="py-2.5 px-3 text-center font-semibold">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]/60">
                    {(isCbtTestSupportUser
                      ? centerCandidates.filter(c => {
                          const isEnrolled = c.enrollmentStatus === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLED' || c.status === 'ENROLLMENT_VERIFY' || !!c.enrolledAt;
                          const isCbtPending = (!c.cbtStatus || c.cbtStatus === 'NOT_STARTED' || c.cbtStatus === 'PENDING') && c.cbtStatus !== 'CONFIRMED' && c.cbtStatus !== 'COMPLETED';
                          return isEnrolled && isCbtPending;
                        })
                      : isOrganizerUser
                      ? centerCandidates.filter(c => {
                          const isEntryVerified = c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true;
                          const alreadyEnrolled = c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLMENT_VERIFY';
                          return isEntryVerified && !alreadyEnrolled;
                        })
                      : centerCandidates
                    ).slice(0, 6).map(cand => (
                      <tr key={cand.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E8D9D2] overflow-hidden shrink-0 flex items-center justify-center font-bold text-[10px] text-[#7A2E3A]">
                              {cand.photoUrl ? (
                                <img src={cand.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                cand.fullNameEn.charAt(0)
                              )}
                            </div>
                            <div className="truncate max-w-[140px]">
                              <span className="font-semibold text-[#3F3030] block truncate">
                                {language === 'ar' ? cand.fullNameAr : cand.fullNameEn}
                              </span>
                              <span className="text-[10px] font-mono text-[#806F6F] block truncate">
                                {cand.aproReference}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-[#3F3030]">
                          {cand.passportNumber}
                        </td>
                        <td className="py-2.5 px-3 text-[#806F6F] truncate max-w-[120px]">
                          {cand.occupation}
                        </td>
                        <td className="py-2.5 px-3">
                          {cand.photoUrl ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              Required
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={cand.status} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onNavigate(isCbtTestSupportUser ? '/cbt-exam-pending' : isOrganizerUser ? '/enrollment-pending' : '/candidates')}
                            className="p-1 rounded text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                            title={language === 'ar' ? 'عرض التفاصيل' : 'View Candidate Dossier'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Live Operational Activity Feed (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {language === 'ar' ? 'نشاط المركز المباشر' : 'Center Live Activity'}
                  </h4>
                  <p className="text-[11px] text-[#806F6F] mt-0.5">
                    {language === 'ar' ? 'سجل العمليات والاستقبال الفوري' : 'Real-time operational events'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live
                </div>
              </div>

              <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto">
                {centerLiveActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#806F6F]">
                    {language === 'ar' ? 'لا توجد أنشطة مسجلة حالياً' : 'No recent center activities recorded'}
                  </div>
                ) : (
                  centerLiveActivities.slice(0, 7).map(act => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] hover:bg-white transition-colors text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#3F3030] truncate">
                          {act.actorName || act.user || 'Center Ops'}
                        </span>
                        <span className="font-mono text-[10px] text-[#806F6F] shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#806F6F] leading-tight">
                        {act.description || act.action || 'Operational action performed.'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Support Staff Quick Contact Info Card */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#3F3030]">
                <UserCircle className="w-4 h-4 text-[#7A2E3A]" />
                <span>{language === 'ar' ? 'الملف التشغيلي النشط' : 'Active Staff Dossier'}</span>
              </div>
              <div className="text-[11px] text-[#806F6F] space-y-1 pt-1 border-t border-[#E8D9D2]">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-semibold text-[#3F3030]">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-mono font-semibold text-[#7A2E3A]">SUPPORT_STAFF</span>
                </div>
                <div className="flex justify-between">
                  <span>Center:</span>
                  <span className="font-mono text-[#3F3030]">{currentCenter.code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Function:</span>
                  <span className="text-[#C9A24D] font-medium truncate max-w-[130px]">{user.assignedFunction || 'Reception'}</span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                onClick={() => onNavigate('/profile')}
              >
                {language === 'ar' ? 'عرض الملف الشخصي' : 'View Full Profile'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t.dashboard.welcome.replace('{name}', user?.name || 'Super Admin')}
        subtitle={t.dashboard.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {t.common.refresh}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/centers?action=create')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {t.centersModule.addNew}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/countries?action=create')}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {t.countriesModule.addNew}
            </Button>
          </div>
        }
      />

      {/* System Health Status Bar */}
      <div className="p-3.5 rounded-lg border border-[#E8D9D2] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_1px_3px_rgba(63,48,48,0.04)]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-[#3F3030]">
            {t.dashboard.systemStatus}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#806F6F]">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#7A2E3A]" />
            ISO/IEC 17024 Assessment Architecture
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Activity className="w-4 h-4 text-[#C9A24D]" />
            Governed Relational Persistence
          </span>
        </div>
      </div>

      {/* Section 8: Minimal KPI blocks (10-cell grid) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
            System Key Performance Indicators
          </h3>
          <span className="text-[11px] text-[#806F6F]">Live calculated metrics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {kpiRows.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.id}
                onClick={() => onNavigate(kpi.link)}
                className="p-3.5 rounded-lg border border-[#E8D9D2] bg-white hover:border-[#7A2E3A]/40 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(63,48,48,0.03)]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[#806F6F] truncate">{kpi.label}</span>
                  <div className={`p-1.5 rounded-md ${
                    kpi.color === 'maroon' ? 'bg-[#F8ECEE] text-[#7A2E3A]' : 'bg-[#FBF6E8] text-[#C9A24D]'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-[#3F3030] tracking-tight">{kpi.value}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#7A2E3A] transition-colors" />
                </div>
                <div className="mt-1 text-[10px] text-[#806F6F] font-medium truncate">
                  {kpi.badge}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 10: Horizontal Assessment Progress Pipeline */}
      <div className="p-4 rounded-lg border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
              {t.dashboard.assessmentPipeline}
            </h3>
            <p className="text-[11px] text-[#806F6F]">Global candidate throughput from schedule to locked certification</p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onNavigate('/assessments')}
            className="text-[#7A2E3A] hover:text-[#7A2E3A]"
          >
            {t.common.view} →
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {pipelineStages.map((stage, idx) => (
            <div
              key={stage.id}
              className={`p-2.5 rounded-md border text-center transition-all ${stage.color}`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                Stage {idx + 1}
              </div>
              <div className="text-lg font-bold my-0.5">{stage.count}</div>
              <div className="text-[11px] font-medium truncate">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Governance, Audit & Risk Surveillance Hub */}
      <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-soft space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'منظومة الحوكمة والرقابة والنزاهة المؤسسية' : 'System Governance, Audit Trail & Risk Surveillance'}
              </h3>
              <p className="text-xs text-[#806F6F]">
                {language === 'ar'
                  ? 'رصد متصل لشكاوى المترشحين، تباين تقييم المقيمين، وسجل التدقيق المشفر وفق معيار ISO 17024'
                  : 'Connected oversight of candidate grievances, assessor scoring variance, and tamper-evident audit trail'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/audit')}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#7A2E3A]" />}
            >
              {language === 'ar' ? 'سجل التدقيق' : 'Audit Trail'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/complaints')}
              leftIcon={<AlertCircle className="w-3.5 h-3.5 text-[#C9A24D]" />}
            >
              {language === 'ar' ? 'سجل الشكاوى' : 'Grievances'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/monitoring?tab=variance')}
              leftIcon={<Activity className="w-3.5 h-3.5 text-[#7A2E3A]" />}
            >
              {language === 'ar' ? 'رصد التباين' : 'Variance Watch'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8D9D2]">
          <div 
            onClick={() => onNavigate('/complaints')}
            className="p-3 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] hover:border-[#7A2E3A]/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#806F6F] uppercase">
                {language === 'ar' ? 'الشكاوى والتظلمات النشطة' : 'Active Grievances'}
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[#7A2E3A]">
                {complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length}
              </span>
              <span className="text-xs text-[#806F6F]">
                / {complaints.length} {language === 'ar' ? 'إجمالي' : 'total'}
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-medium block mt-1">
              {complaints.filter(c => c.priority === 'HIGH' || c.priority === 'URGENT').length} {language === 'ar' ? 'عالية الأولوية' : 'high/urgent priority'}
            </span>
          </div>

          <div 
            onClick={() => onNavigate('/monitoring?tab=variance')}
            className="p-3 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] hover:border-[#7A2E3A]/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#806F6F] uppercase">
                {language === 'ar' ? 'تنبيهات تباين المقيمين' : 'Assessor Variance Flags'}
              </span>
              <Activity className="w-3.5 h-3.5 text-[#C9A24D]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[#3F3030]">
                {varianceRecords.filter(r => Math.abs(r.variance) >= 15).length}
              </span>
              <span className="text-xs text-[#806F6F]">
                {language === 'ar' ? 'جلسة يوصى بمراجعتها' : 'review recommended'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium block mt-1">
              {language === 'ar' ? 'عتبة قياسية إرشادية ±15%' : 'Advisory ±15% threshold active'}
            </span>
          </div>

          <div 
            onClick={() => onNavigate('/audit')}
            className="p-3 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] hover:border-[#7A2E3A]/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#806F6F] uppercase">
                {language === 'ar' ? 'سجل التدقيق المشفر' : 'ISO 17024 Audit Seal'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-700">
                {auditLogs.length}
              </span>
              <span className="text-xs text-[#806F6F]">
                {language === 'ar' ? 'سجل موثق بالكامل' : 'immutable events logged'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium block mt-1">
              {language === 'ar' ? 'مختوم ومؤمّن رقمياً' : 'Cryptographically verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Candidates & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Candidates Table (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#3F3030]">{t.dashboard.recentCandidates}</h3>
              <p className="text-xs text-[#806F6F]">Candidates across all international centers and occupations</p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigate('/candidates')}
              className="text-[#7A2E3A] hover:text-[#7A2E3A]"
            >
              {t.common.view} →
            </Button>
          </div>

          <div className="border border-[#E8D9D2] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] font-semibold">
                    <th className="py-2.5 px-3 text-start">{t.candidatesModule.fullName}</th>
                    <th className="py-2.5 px-3 text-start">{t.candidatesModule.passport}</th>
                    <th className="py-2.5 px-3 text-start">{t.candidatesModule.occupation}</th>
                    <th className="py-2.5 px-3 text-start">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2] text-[#3F3030]">
                  {candidates.slice(0, 5).map(c => (
                    <tr key={c.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        <div className="text-[#3F3030]">{language === 'ar' ? c.fullNameAr : c.fullNameEn}</div>
                        <div className="text-[10px] text-[#806F6F] font-mono">{c.aproReference}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#806F6F]">{c.passportNumber}</td>
                      <td className="py-2.5 px-3 text-[#3F3030] truncate max-w-[150px]">{c.occupation}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info Panels (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Section 9: Live System Activity Feed */}
          <div className="border border-[#E8D9D2] rounded-lg bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7A2E3A]" />
                {t.dashboard.recentSystemActivity}
              </h4>
              <button 
                type="button" 
                onClick={() => onNavigate('/monitoring?tab=live')}
                className="text-[11px] text-[#7A2E3A] hover:underline"
              >
                {t.common.view}
              </button>
            </div>
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {liveActivities.slice(0, 4).map(act => (
                <div key={act.id} className="text-xs pb-2 border-b border-[#E8D9D2] last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-[10px] text-[#806F6F] mb-0.5">
                    <span className="font-bold text-[#7A2E3A]">{(act.action || 'ACTIVITY').replace(/_/g, ' ')}</span>
                    <span className="font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[#3F3030] font-medium line-clamp-1">{act.entity}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#806F6F] mt-0.5">
                    <span>{act.user}</span>
                    <span className="font-mono text-[#C9A24D]">{act.centerName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Immediate Assessment Schedules Panel */}
          <div className="border border-[#E8D9D2] rounded-lg bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-[#C9A24D]" />
                {t.dashboard.upcomingSchedules}
              </h4>
              <button 
                type="button" 
                onClick={() => onNavigate('/schedules')}
                className="text-[11px] text-[#7A2E3A] hover:underline"
              >
                {t.common.view}
              </button>
            </div>
            <div className="space-y-2.5">
              {schedules.slice(0, 3).map(sch => (
                <div key={sch.id} className="p-2.5 rounded-md border border-[#E8D9D2] bg-[#FFFCF8] text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#3F3030] mb-0.5">
                    <span className="font-mono">{sch.code}</span>
                    <span className="text-[10px] text-[#806F6F]">{sch.date}</span>
                  </div>
                  <p className="text-[#806F6F] truncate">{sch.occupation}</p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#E8D9D2] text-[10px] text-[#806F6F]">
                    <span>Seats: {sch.assignedCandidates}/{sch.totalSeats}</span>
                    <span className="font-mono text-[#7A2E3A]">{sch.timeSlot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

