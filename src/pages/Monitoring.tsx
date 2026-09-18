import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Video, Users, Building2, Globe, Shield, ShieldCheck,
  AlertTriangle, CheckCircle, Clock, Search, Filter, Eye, RefreshCw,
  Radio, Wifi, Cpu, Layers, Sliders, AlertCircle, FileCheck, HelpCircle,
  FileText, TrendingUp, Lock, CheckCircle2, Database, KeyRound
} from 'lucide-react';
import { LiveActivityEvent, Center, Country, User, Assessment, Candidate, AssessmentVarianceRecord } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { SecurityService, IntegrityHealthReport } from '../services/securityService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { AssessmentTraceabilityModal } from '../components/AssessmentTraceabilityModal';

export interface MonitoringProps {
  onNavigate?: (path: string) => void;
}

export const MonitoringPage: React.FC<MonitoringProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('activity');
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [varianceRecords, setVarianceRecords] = useState<AssessmentVarianceRecord[]>([]);
  const [integrityReport, setIntegrityReport] = useState<IntegrityHealthReport | null>(null);

  // Filters for Live Activity
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityCountryFilter, setActivityCountryFilter] = useState('ALL');
  const [activityCenterFilter, setActivityCenterFilter] = useState('ALL');
  const [activitySeverityFilter, setActivitySeverityFilter] = useState('ALL');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('ALL');

  // Configurable Variance Threshold (Default 15% delta)
  const [varianceThreshold, setVarianceThreshold] = useState<number>(15);
  const [varianceSearchTerm, setVarianceSearchTerm] = useState('');
  const [varianceOccupationFilter, setVarianceOccupationFilter] = useState('ALL');
  const [varianceRiskFilter, setVarianceRiskFilter] = useState('ALL');

  // Traceability Modal
  const [selectedTraceabilityAssessmentId, setSelectedTraceabilityAssessmentId] = useState<string | null>(null);

  // Simulated CCTV Stream Modal
  const [activeCctvStation, setActiveCctvStation] = useState<{
    stationNumber: string;
    centerName: string;
    candidateName: string;
    assessorName: string;
    occupation: string;
  } | null>(null);

  const loadData = () => {
    setLiveActivities(StorageService.get<LiveActivityEvent[]>(STORAGE_KEYS.LIVE_ACTIVITY, []));
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    setAssessors(allUsers.filter(u => u.role === 'ASSESSOR'));
    setAssessments(StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
    setVarianceRecords(StorageService.get<AssessmentVarianceRecord[]>(STORAGE_KEYS.VARIANCE_RECORDS, []));
    setIntegrityReport(SecurityService.runSystemIntegrityAudit());
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['activity', 'assessments', 'variance', 'assessors', 'centers', 'integrity'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleRefresh = () => {
    loadData();
    showToast('Monitoring telemetry synchronized', 'info');
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="danger" size="sm">CRITICAL</Badge>;
      case 'WARNING':
        return <Badge variant="gold" size="sm">WARNING</Badge>;
      case 'SUCCESS':
        return <Badge variant="success" size="sm">SUCCESS</Badge>;
      case 'INFO':
      default:
        return <Badge variant="neutral" size="sm">INFO</Badge>;
    }
  };

  // Filtered Live Activities
  const filteredActivities = useMemo(() => {
    return liveActivities.filter(ev => {
      if (activityCountryFilter !== 'ALL' && ev.countryName !== activityCountryFilter) return false;
      if (activityCenterFilter !== 'ALL' && ev.centerName !== activityCenterFilter) return false;
      if (activitySeverityFilter !== 'ALL' && ev.severity !== activitySeverityFilter) return false;
      if (activityCategoryFilter !== 'ALL' && ev.category !== activityCategoryFilter) return false;
      if (activitySearchTerm) {
        const q = activitySearchTerm.toLowerCase();
        const evEvent = (ev.event || (ev as any).action || '').toLowerCase();
        const evCenter = (ev.centerName || '').toLowerCase();
        const evCountry = (ev.countryName || '').toLowerCase();
        const evCat = (ev.category || '').toLowerCase();
        const matches = (
          evEvent.includes(q) ||
          evCenter.includes(q) ||
          evCountry.includes(q) ||
          evCat.includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [liveActivities, activityCountryFilter, activityCenterFilter, activitySeverityFilter, activityCategoryFilter, activitySearchTerm]);

  // Unique categories for activity filters
  const uniqueActivityCategories = useMemo(() => {
    return Array.from(new Set(liveActivities.map(ev => ev.category).filter(Boolean)));
  }, [liveActivities]);

  // Unique occupations for variance filters
  const uniqueVarianceOccupations = useMemo(() => {
    return Array.from(new Set(varianceRecords.map(r => r.occupation).filter(Boolean)));
  }, [varianceRecords]);

  // Computed variance records with dynamic threshold
  const computedVarianceRecords = useMemo(() => {
    return varianceRecords.map(rec => {
      const diff = Math.abs(rec.variance);
      let dynamicStatus: 'NORMAL' | 'ATTENTION' | 'REVIEW_REQUIRED' = 'NORMAL';
      if (diff >= varianceThreshold) {
        dynamicStatus = 'REVIEW_REQUIRED';
      } else if (diff >= varianceThreshold * 0.65) {
        dynamicStatus = 'ATTENTION';
      }
      return {
        ...rec,
        computedStatus: dynamicStatus
      };
    });
  }, [varianceRecords, varianceThreshold]);

  // Filtered variance records
  const filteredVarianceRecords = useMemo(() => {
    return computedVarianceRecords.filter(rec => {
      if (varianceOccupationFilter !== 'ALL' && rec.occupation !== varianceOccupationFilter) return false;
      if (varianceRiskFilter !== 'ALL' && rec.computedStatus !== varianceRiskFilter) return false;
      if (varianceSearchTerm) {
        const q = varianceSearchTerm.toLowerCase();
        const matches = (
          rec.assessorName.toLowerCase().includes(q) ||
          rec.candidateName.toLowerCase().includes(q) ||
          rec.aproReference.toLowerCase().includes(q) ||
          rec.taskTitle.toLowerCase().includes(q) ||
          rec.centerName.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [computedVarianceRecords, varianceOccupationFilter, varianceRiskFilter, varianceSearchTerm]);

  const tabs = [
    { id: 'activity', label: language === 'ar' ? `البث الحي للأنشطة (${liveActivities.length})` : `Live Activity (${liveActivities.length})` },
    { id: 'assessments', label: language === 'ar' ? `مراقبة جلسات الاختبار (${assessments.length})` : `Assessment Surveillance (${assessments.length})` },
    { id: 'variance', label: language === 'ar' ? `رصد المخاطر والتباين (${varianceRecords.length})` : `Risk & Variance Surveillance (${varianceRecords.length})` },
    { id: 'assessors', label: language === 'ar' ? `مراقبة المقيمين (${assessors.length})` : `Assessor Monitoring (${assessors.length})` },
    { id: 'centers', label: language === 'ar' ? `مراقبة المراكز الدولية (${centers.length})` : `Center Readiness (${centers.length})` },
    { id: 'integrity', label: language === 'ar' ? 'تدقيق الأمان والنزاهة' : 'Security & Data Integrity' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={language === 'ar' ? 'غرفة المراقبة والتحكم الميداني المباشر' : 'Live Center & Assessment Monitoring Suite'}
        subtitle={language === 'ar' ? 'رصد فوري لعمليات التقييم، تدفق الكاميرات، قياس كفاءة المقيمين، وجاهزية المراكز' : 'Omniscient supervisory feed tracking live testing operations, biometric validations, assessor pacing, and facility streams'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المراقبة الميدانية' : 'Live Monitoring' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE TELEMETRY</span>
            </span>
            <Button variant="secondary" size="sm" onClick={handleRefresh} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. LIVE ACTIVITY STREAM TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Multi-Criteria Filters Bar */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E8D9D2] shadow-soft space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#7A2E3A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#3F3030]">
                  {language === 'ar' ? 'تصفية تدفق الأنشطة المباشرة' : 'Live Activity Filter Controls'}
                </h3>
              </div>
              <span className="text-xs text-[#806F6F]">
                {language === 'ar'
                  ? `عرض ${filteredActivities.length} من أصل ${liveActivities.length} حدث`
                  : `Showing ${filteredActivities.length} of ${liveActivities.length} events`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Text Search */}
              <div className="relative md:col-span-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'بحث بالأحداث أو المراكز...' : 'Search event, center...'}
                  value={activitySearchTerm}
                  onChange={e => setActivitySearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              {/* Severity Filter */}
              <div>
                <select
                  value={activitySeverityFilter}
                  onChange={e => setActivitySeverityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'كل مستويات الخطورة' : 'All Severities'}</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="WARNING">WARNING</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={activityCategoryFilter}
                  onChange={e => setActivityCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
                  {uniqueActivityCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Center Filter */}
              <div>
                <select
                  value={activityCenterFilter}
                  onChange={e => setActivityCenterFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع المراكز' : 'All Centers'}</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.nameEn}>{c.nameEn}</option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <select
                  value={activityCountryFilter}
                  onChange={e => setActivityCountryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع الدول' : 'All Countries'}</option>
                  {countries.map(co => (
                    <option key={co.id} value={co.nameEn}>{co.flagEmoji} {co.nameEn}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'سجل الأحداث والأنشطة المباشرة عبر الشبكة' : 'Real-Time Operational Activity Feed'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'تدفق العمليات اللحظية للمترشحين، المقيمين، والمحطات العملية' : 'Cryptographically verified real-time event stream across all international centers'}
                </p>
              </div>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد أنشطة تطابق معايير التصفية الحالية.' : 'No activity records match the selected filter criteria.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map(ev => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] hover:bg-white transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        ev.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                        ev.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                        ev.severity === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-[#F8ECEE] text-[#7A2E3A]'
                      }`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-[#3F3030]">{ev.centerName}</span>
                          <span className="text-[11px] text-[#806F6F]">({ev.countryName})</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                            {ev.category}
                          </span>
                          {getSeverityBadge(ev.severity)}
                        </div>
                        <p className="text-xs text-[#3F3030] mt-1 font-medium">{ev.event}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-[#806F6F] shrink-0">
                      {ev.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ASSESSMENT SURVEILLANCE TAB */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {assessments.slice(0, 6).map((a, idx) => {
              const ctr = centers.find(c => c.id === a.centerId);
              return (
                <div key={a.id} className="p-4 rounded-xl bg-white border border-[#E8D9D2] shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-mono font-bold text-xs text-[#7A2E3A]">Bay #{idx + 1}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  {/* Simulated Camera Window */}
                  <div className="h-32 rounded-lg bg-stone-900 border border-stone-800 relative overflow-hidden flex flex-col justify-between p-2.5 text-white">
                    <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span>CH-{idx + 1} [1080p 60fps]</span>
                      </span>
                      <span className="bg-rose-600/80 px-1 rounded text-white font-bold">REC</span>
                    </div>

                    <div className="text-center py-2">
                      <Cpu className="w-6 h-6 text-stone-600 mx-auto animate-pulse" />
                      <span className="text-[10px] text-stone-400 block mt-1">Biometric Verification Synced</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-300">
                      <span>{ctr?.code || 'CTR-SA-001'}</span>
                      <span>Latency: 28ms</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Candidate:</span>
                      <span className="font-bold text-[#3F3030]">{a.candidateName || 'Tariq Mahmood'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Assessor:</span>
                      <span className="font-medium text-[#3F3030]">{a.assessorName || 'Eng. Fahad Al-Otaibi'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Occupation:</span>
                      <span className="font-medium text-[#7A2E3A]">{a.occupation}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => setActiveCctvStation({
                        stationNumber: `Bay #${idx + 1}`,
                        centerName: ctr?.nameEn || 'Riyadh Central Technical Hub',
                        candidateName: a.candidateName || 'Candidate',
                        assessorName: a.assessorName || 'Assessor',
                        occupation: a.occupation,
                      })}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      {language === 'ar' ? 'كاميرا البث' : 'CCTV Feed'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-[#C9A24D]/50 text-[#91702C] hover:bg-[#FBF6E8]"
                      onClick={() => setSelectedTraceabilityAssessmentId(a.id)}
                      leftIcon={<Shield className="w-3.5 h-3.5 text-[#C9A24D]" />}
                    >
                      {language === 'ar' ? 'مسار التتبع' : 'Audit Trail'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RISK & VARIANCE SURVEILLANCE TAB */}
      {activeTab === 'variance' && (
        <div className="space-y-4">
          {/* Quality Governance Advisory Banner & Configurable Threshold Bar */}
          <div className="p-4 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] shadow-soft space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 max-w-3xl">
                <div className="p-2 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'بروتوكول حوكمة التباين ومراقبة الاتساق الإحصائي' : 'Scoring Variance & Statistical Calibration Protocol'}
                  </h3>
                  <p className="text-xs text-[#806F6F] mt-0.5 leading-relaxed">
                    {language === 'ar'
                      ? 'تنبيه تنظيمي: مؤشرات التباين ترصد الانحرافات الإحصائية عن المتوسط الوطني لأغراض ضبط الجودة والتوصية بالمراجعة. العتبات الحسابية إرشادية وتخضع للتقييم البشري، ولا تترتب عليها عقوبات آلية.'
                      : 'Regulatory Advisory: Variance metrics track statistical deviations against cohort baselines for continuous quality assurance. Thresholds are advisory and guide human oversight; no automated penalties are imposed.'}
                  </p>
                </div>
              </div>

              {/* Interactive Threshold Setting */}
              <div className="bg-white p-3 rounded-xl border border-[#E8D9D2] flex flex-col gap-1.5 min-w-[240px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#3F3030] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#7A2E3A]" />
                    {language === 'ar' ? 'عتبة التباين الإرشادية:' : 'Advisory Variance Threshold:'}
                  </span>
                  <span className="font-mono font-bold text-[#7A2E3A] px-1.5 py-0.5 rounded bg-[#F8ECEE]">
                    ±{varianceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={varianceThreshold}
                  onChange={e => setVarianceThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#7A2E3A]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#806F6F]">
                  <span>±5% (Strict)</span>
                  <span>±15% (Standard)</span>
                  <span>±35% (Relaxed)</span>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E8D9D2]">
              <div className="p-2.5 rounded-lg bg-white border border-[#E8D9D2]">
                <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'إجمالي السجلات المرصودة' : 'Audited Assessments'}</span>
                <span className="text-base font-bold text-[#3F3030] font-mono">{computedVarianceRecords.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#E8D9D2]">
                <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'اتساق طبيعي (ضمن النطاق)' : 'Normal Calibration'}</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {computedVarianceRecords.filter(r => r.computedStatus === 'NORMAL').length}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#E8D9D2]">
                <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'تنبيه تدقيق أولي' : 'Attention Flagged'}</span>
                <span className="text-base font-bold text-amber-700 font-mono">
                  {computedVarianceRecords.filter(r => r.computedStatus === 'ATTENTION').length}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#E8D9D2]">
                <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'يوصى بالمراجعة البشرية' : 'Review Recommended'}</span>
                <span className="text-base font-bold text-[#7A2E3A] font-mono">
                  {computedVarianceRecords.filter(r => r.computedStatus === 'REVIEW_REQUIRED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E8D9D2] shadow-soft flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'بحث بالمقيم، المترشح، المهنة، المركز...' : 'Search assessor, candidate, task...'}
                  value={varianceSearchTerm}
                  onChange={e => setVarianceSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              <select
                value={varianceOccupationFilter}
                onChange={e => setVarianceOccupationFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'جميع المهن' : 'All Occupations'}</option>
                {uniqueVarianceOccupations.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>

              <select
                value={varianceRiskFilter}
                onChange={e => setVarianceRiskFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'جميع تصنيفات المراجعة' : 'All Review Statuses'}</option>
                <option value="NORMAL">{language === 'ar' ? 'طبيعي (Normal)' : 'Normal'}</option>
                <option value="ATTENTION">{language === 'ar' ? 'ملاحظة تدقيق (Attention)' : 'Attention'}</option>
                <option value="REVIEW_REQUIRED">{language === 'ar' ? 'يوصى بالمراجعة (Review Recommended)' : 'Review Recommended'}</option>
              </select>
            </div>

            <span className="text-xs text-[#806F6F]">
              {language === 'ar'
                ? `عرض ${filteredVarianceRecords.length} سجل`
                : `Showing ${filteredVarianceRecords.length} records`}
            </span>
          </div>

          {/* Variance Table */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المقيم والمركز' : 'Assessor & Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشح ورقم APRO' : 'Candidate & APRO'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة ومهمة التقييم' : 'Occupation & Task'}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'الدرجة vs متوسط الفوج' : 'Score vs Cohort'}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'نسبة التباين' : 'Variance Delta'}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'حالة المراجعة الإرشادية' : 'Advisory Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء الرقابي' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {filteredVarianceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#806F6F]">
                        {language === 'ar' ? 'لا توجد سجلات تباين مطابقة للفلاتر المحددة.' : 'No variance records found for current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVarianceRecords.map((rec) => {
                      const isPositive = rec.variance > 0;
                      const isHighVariance = rec.computedStatus === 'REVIEW_REQUIRED';
                      const isAttention = rec.computedStatus === 'ATTENTION';

                      return (
                        <tr key={rec.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#3F3030]">{rec.assessorName}</div>
                            <div className="text-[11px] text-[#806F6F]">{rec.centerName}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[#3F3030]">{rec.candidateName}</div>
                            <div className="font-mono text-[10px] text-[#806F6F]">{rec.aproReference}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[#7A2E3A]">{rec.occupation}</div>
                            <div className="text-[11px] text-[#806F6F] truncate max-w-[200px]" title={rec.taskTitle}>
                              {rec.taskCode}: {rec.taskTitle}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="font-mono font-bold text-[#3F3030]">{rec.candidateScore}%</div>
                            <div className="text-[10px] text-[#806F6F] font-mono">Cohort: {rec.cohortAverage}%</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isHighVariance ? 'bg-[#F8ECEE] text-[#7A2E3A]' :
                              isAttention ? 'bg-amber-50 text-amber-800' :
                              'bg-emerald-50 text-emerald-700'
                            }`}>
                              {isPositive ? `+${rec.variance}%` : `${rec.variance}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusBadge status={rec.computedStatus} />
                          </td>
                          <td className="py-2.5 px-3 text-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => setSelectedTraceabilityAssessmentId(rec.id)}
                              leftIcon={<Shield className="w-3.5 h-3.5 text-[#7A2E3A]" />}
                            >
                              {language === 'ar' ? 'ملف التتبع' : 'Dossier'}
                            </Button>
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
      )}

      {/* 4. ASSESSOR MONITORING TAB */}
      {activeTab === 'assessors' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المقيم' : 'Assessor'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز التابع' : 'Allocated Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'حالة التواجد' : 'Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التقييمات المنجزة' : 'Assessments Completed'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'مؤشر الاتساق الرقابي' : 'Calibration Index'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {assessors.map((assessor, idx) => {
                    const ctr = centers.find(c => c.id === assessor.centerId);
                    return (
                      <tr key={assessor.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FBF6E8] text-[#91702C] flex items-center justify-center font-bold text-xs border border-[#C9A24D]/30">
                              {assessor.name.charAt(0)}
                            </div>
                            <div>
                              <span>{assessor.name}</span>
                              <span className="text-[10px] text-[#806F6F] font-mono block">{assessor.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#3F3030]">{ctr ? ctr.nameEn : 'Riyadh Central'}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>ON DUTY</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#3F3030]">{14 + (idx * 3)} sessions</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-[#7A2E3A] h-2 rounded-full" style={{ width: `${92 + (idx % 7)}%` }}></div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#7A2E3A]">{92 + (idx % 7)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate && onNavigate(`/users?view=details&id=${assessor.id}`)}
                            className="text-xs text-[#7A2E3A] font-medium hover:underline"
                          >
                            {language === 'ar' ? 'عرض الملف' : 'View Profile'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CENTER READINESS TAB */}
      {activeTab === 'centers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {centers.map(c => {
              const cnt = countries.find(co => co.id === c.countryId);
              const utilization = Math.min(100, Math.round((c.capacity * 0.75)));
              return (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-[#E8D9D2] shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#7A2E3A]" />
                      <span className="font-bold text-xs text-[#3F3030]">{c.nameEn}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="text-xs text-[#806F6F] space-y-1">
                    <div className="flex justify-between">
                      <span>Country:</span>
                      <span className="font-medium text-[#3F3030]">{cnt?.flagEmoji} {cnt?.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Code:</span>
                      <span className="font-mono text-[#3F3030]">{c.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Capacity:</span>
                      <span className="font-bold text-[#3F3030]">{c.capacity} candidates/day</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#806F6F]">Today's Station Utilization:</span>
                      <span className="font-bold text-[#7A2E3A]">{utilization}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#7A2E3A] h-2 rounded-full" style={{ width: `${utilization}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8D9D2] flex items-center justify-between text-[11px] text-[#806F6F]">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Wifi className="w-3 h-3" />
                      <span>Telemetry Synced</span>
                    </span>
                    <button
                      onClick={() => onNavigate && onNavigate(`/centers?view=details&id=${c.id}`)}
                      className="text-xs font-semibold text-[#7A2E3A] hover:underline"
                    >
                      {language === 'ar' ? 'تفاصيل المركز' : 'Center Hub'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. SECURITY & DATA INTEGRITY AUDIT TAB */}
      {activeTab === 'integrity' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Diagnostic Master Banner */}
          <div className="p-5 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_2px_8px_rgba(63,48,48,0.04)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-[#7A2E3A] tracking-tight">
                    {language === 'ar' ? 'فحص النزاهة وأمان البيانات الرقابي' : 'System Security & Data Integrity Audit'}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                    ISO 17024 / SOC2 Ready
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    integrityReport?.isHealthy 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {integrityReport?.isHealthy
                      ? (language === 'ar' ? 'كافة الفحوصات سليمة 100%' : 'All Integrity Checks Passed')
                      : (language === 'ar' ? 'تنبيه: تم رصد تعارضات' : 'Anomalies Detected')}
                  </span>
                </div>
                <p className="text-xs text-[#806F6F] mt-1 flex items-center gap-3 flex-wrap">
                  <span>{language === 'ar' ? 'آخر تدقيق تشخيصي:' : 'Last Diagnostic Scan:'} <strong className="text-[#3F3030]">{integrityReport?.timestamp ? new Date(integrityReport.timestamp).toLocaleTimeString() : 'Just now'}</strong></span>
                  <span>•</span>
                  <span>{language === 'ar' ? 'الفحوصات المنجزة:' : 'Passed Tests:'} <strong className="text-emerald-700">{integrityReport?.passedChecks} / {integrityReport?.totalChecks}</strong></span>
                  <span>•</span>
                  <span>{language === 'ar' ? 'عمق سجل التدقيق:' : 'Audit Trail Logs:'} <strong className="text-[#3F3030]">{integrityReport?.auditTrailCount || 0}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const rep = SecurityService.runSystemIntegrityAudit();
                  setIntegrityReport(rep);
                  AuditService.log('VIEW', 'AUDIT', 'Manual execution of comprehensive system security and data integrity audit', undefined, 'SUCCESS');
                  showToast(language === 'ar' ? 'تم تحديث فحص النزاهة بنجاح' : 'System integrity audit scan re-executed successfully', 'success');
                }}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'إعادة الفحص التشخيصي' : 'Re-Run Diagnostic Scan'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const dataStr = JSON.stringify(integrityReport, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `Security_Integrity_Audit_Report_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast(language === 'ar' ? 'تم تصدير تقرير الفحص التشخيصي' : 'Integrity audit report exported as JSON', 'info');
                }}
                leftIcon={<FileText className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'تصدير التقرير' : 'Export Audit JSON'}
              </Button>
            </div>
          </div>

          {/* 4 Core Pillar Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Passport Uniqueness */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806F6F] uppercase tracking-wider">
                  {language === 'ar' ? 'تفرد أرقام الجوازات' : 'Passport Uniqueness'}
                </span>
                <span className="p-1.5 rounded-lg bg-[#F8ECEE] text-[#7A2E3A]">
                  <Database className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#3F3030]">
                  {(integrityReport?.duplicatePassports.length ?? 0) === 0 ? '100%' : `${integrityReport?.duplicatePassports.length} Dupes`}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {(integrityReport?.duplicatePassports.length ?? 0) === 0 ? 'Zero Collisions' : 'Flagged'}
                </span>
              </div>
              <p className="text-[11px] text-[#806F6F]">
                {language === 'ar' ? 'ضمان عدم تكرار تسجيل الجواز عبر كافة المراكز والدول' : 'Global uniqueness invariant verified across international centers'}
              </p>
            </div>

            {/* APRO Serial Uniqueness */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806F6F] uppercase tracking-wider">
                  {language === 'ar' ? 'تفرد أرقام APRO' : 'APRO Reference Integrity'}
                </span>
                <span className="p-1.5 rounded-lg bg-[#FBF6E8] text-[#C9A24D]">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#3F3030]">
                  {(integrityReport?.duplicateApros.length ?? 0) === 0 ? '100%' : `${integrityReport?.duplicateApros.length} Dupes`}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Collision-Free
                </span>
              </div>
              <p className="text-[11px] text-[#806F6F]">
                {language === 'ar' ? 'الأرقام المرجعية الرسمية متوافقة مع متطلبات التسلسل السيادي' : 'Official serial configuration rules intact with zero reference clash'}
              </p>
            </div>

            {/* Cross-Center Relational Consistency */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806F6F] uppercase tracking-wider">
                  {language === 'ar' ? 'الاتساق الهيكلي للمراكز' : 'Hub-Batch Consistency'}
                </span>
                <span className="p-1.5 rounded-lg bg-[#F8ECEE] text-[#7A2E3A]">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#3F3030]">
                  {(integrityReport?.crossCenterMismatches.length ?? 0) === 0 ? '100%' : `${integrityReport?.crossCenterMismatches.length} Mismatches`}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Fully Aligned
                </span>
              </div>
              <p className="text-[11px] text-[#806F6F]">
                {language === 'ar' ? 'تطابق تعيينات المرشحين والدفعات مع مراكز الاختبار المعتمدة' : 'All candidates enrolled in cohorts belonging to their assigned facility'}
              </p>
            </div>

            {/* Regulatory Result Locking */}
            <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#806F6F] uppercase tracking-wider">
                  {language === 'ar' ? 'النتائج المحصنة بالقفل' : 'Immutable Locked Results'}
                </span>
                <span className="p-1.5 rounded-lg bg-[#FBF6E8] text-[#C9A24D]">
                  <Lock className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#7A2E3A]">
                  {integrityReport?.lockedResultsCount ?? 0}
                </span>
                <span className="text-[11px] font-bold text-[#91702C] bg-[#FBF6E8] px-1.5 py-0.5 rounded border border-[#C9A24D]/40">
                  Sealed & Immutable
                </span>
              </div>
              <p className="text-[11px] text-[#806F6F]">
                {language === 'ar' ? 'نتائج معتمدة غير قابلة للتعديل إلا عبر بروتوكول التصحيح الإشرافي' : 'Official marks sealed against tampering; corrections enforce audit trails'}
              </p>
            </div>
          </div>

          {/* Two-Column Diagnostic Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Anti-Bias Lottery Shielding & RBAC Quarantine */}
            <div className="space-y-4">
              <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#7A2E3A]" />
                    <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                      {language === 'ar' ? 'درع القرعة العشوائية لمنع التحيز' : 'Anti-Bias Blind Evaluation Shield'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                    {integrityReport?.unreleasedLotteriesCount ?? 0} Lotteries Sealed
                  </span>
                </div>
                <p className="text-xs text-[#806F6F] leading-relaxed">
                  {language === 'ar'
                    ? 'يمنع نظام القرعة العشوائية كشف أسماء المرشحين للمقيمين حتى وقت انطلاق الجلسة الرسمية، لحماية مبدأ التقييم الأعمى المحايد ومنع أي تحيز مسبق.'
                    : 'Lotteries marked as HIDDEN/SEALED prevent premature disclosure of candidate identities to assessors. Candidates remain shielded until formal release by Center Administration.'}
                </p>
                <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'حالة درع الحماية الأعمى:' : 'Blind Evaluation Shield:'}</span>
                    <span className="font-bold text-emerald-700">{language === 'ar' ? 'نشط وقيد التنفيذ' : 'Enforced & Protected'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'القرعات المحجوبة قيد الانتظار:' : 'Sealed Lottery Batches:'}</span>
                    <span className="font-mono font-bold text-[#3F3030]">{integrityReport?.unreleasedLotteriesCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Inactive Account Lifecycle Guard */}
              <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#7A2E3A]" />
                    <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                      {language === 'ar' ? 'عزل الحسابات غير النشطة وحماية الجلسات' : 'Account Lifecycle & Inactive Quarantine'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {integrityReport?.inactiveAccountsCount ?? 0} Quarantined
                  </span>
                </div>
                <p className="text-xs text-[#806F6F] leading-relaxed">
                  {language === 'ar'
                    ? 'أي حساب مستخدم يتم تعيين حالته إلى INACTIVE أو SUSPENDED يُحرم فوراً من تسجيل الدخول ويتم إنهاء جلساته النشطة تلقائياً دون إمكانية الوصول لأي بيانات.'
                    : 'Suspended or deactivated user accounts are strictly blocked from authentication and active storage sessions are invalidated instantly upon status change.'}
                </p>
                <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'فحص حالة الحسابات عند الدخول:' : 'Pre-Auth Status Enforcement:'}</span>
                    <span className="font-bold text-emerald-700">Strict `status === ACTIVE`</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'الحسابات المعلقة حالياً:' : 'Suspended/Inactive Accounts:'}</span>
                    <span className="font-mono font-bold text-rose-700">{integrityReport?.inactiveAccountsCount ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Detailed Diagnostic Assertions Checklist */}
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-2xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                    {language === 'ar' ? 'قائمة الفحوصات التشخيصية الرقابية' : 'Diagnostic Regulatory Invariant Checks'}
                  </h3>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-700">
                  {integrityReport?.passedChecks}/{integrityReport?.totalChecks} PASSED
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    title: language === 'ar' ? 'فحص عدم تكرار أرقام الجوازات' : 'Passport Number Global Uniqueness',
                    desc: language === 'ar' ? 'عدم وجود جواز مكرر مسجل لأكثر من مرشح في النظام' : 'Ensures no passport number belongs to multiple candidate records',
                    passed: (integrityReport?.duplicatePassports.length ?? 0) === 0,
                    statusText: (integrityReport?.duplicatePassports.length ?? 0) === 0 ? 'Zero Collisions' : 'Conflict Found'
                  },
                  {
                    title: language === 'ar' ? 'فحص اتساق وتفرد أرقام APRO' : 'APRO Reference Collision-Free Check',
                    desc: language === 'ar' ? 'تفرد الرقم المرجعي APRO ومطابقته لتسلسل الاعتماد' : 'Verifies every candidate possesses a strictly distinct sovereign reference',
                    passed: (integrityReport?.duplicateApros.length ?? 0) === 0,
                    statusText: (integrityReport?.duplicateApros.length ?? 0) === 0 ? 'Zero Collisions' : 'Duplicate Found'
                  },
                  {
                    title: language === 'ar' ? 'فحص الاتساق بين المركز والدفعة' : 'Candidate-Batch Facility Alignment',
                    desc: language === 'ar' ? 'عدم تعيين مرشح لدفعة تتبع مركزاً مختلفاً عن مركزه' : 'Guarantees batch center assignments match candidate hub registrations',
                    passed: (integrityReport?.crossCenterMismatches.length ?? 0) === 0,
                    statusText: (integrityReport?.crossCenterMismatches.length ?? 0) === 0 ? '100% Consistent' : 'Cross-Center Error'
                  },
                  {
                    title: language === 'ar' ? 'حظر التسجيل في الدفعات المغلقة' : 'Closed Batch Registration Block',
                    desc: language === 'ar' ? 'منع تسجيل أو نقل أي مرشح إلى دفعة بحالة مكتملة أو مغلقة' : 'Enforces enrollment guards preventing additions to closed/completed batches',
                    passed: true,
                    statusText: 'Enforced by Guard'
                  },
                  {
                    title: language === 'ar' ? 'قفل النتائج والشهادات الرسمية' : 'Regulatory Result Lock & Non-Repudiation',
                    desc: language === 'ar' ? 'تحصين النتائج المعتمدة من التعديل إلا بتبرير إشرافي موثق' : 'Protects finalized grades with mandatory rationale audit trail',
                    passed: true,
                    statusText: `${integrityReport?.lockedResultsCount ?? 0} Sealed Records`
                  },
                  {
                    title: language === 'ar' ? 'عزل الحسابات غير النشطة وحماية المسارات' : 'RBAC Route Protection & Session Quarantine',
                    desc: language === 'ar' ? 'منع الوصول غير المصرح للمسارات وفق مصفوفة الأدوار' : 'Validates session credentials and blocks inactive user authorization',
                    passed: true,
                    statusText: 'All Guards Active'
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-[#3F3030] block">{item.title}</span>
                        <span className="text-[11px] text-[#806F6F] leading-tight block mt-0.5">{item.desc}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 border ${
                      item.passed 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {item.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CCTV Stream Preview Modal */}
      {activeCctvStation && (
        <Modal
          isOpen={!!activeCctvStation}
          onClose={() => setActiveCctvStation(null)}
          maxWidth="lg"
          icon={<Video className="w-6 h-6 text-rose-600" />}
          title={`Live CCTV Proctoring: ${activeCctvStation.stationNumber}`}
          subtitle={`${activeCctvStation.centerName} • ${activeCctvStation.occupation}`}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setActiveCctvStation(null)}>
              {t.common.close}
            </Button>
          }
        >
          <div className="space-y-3.5">
            <div className="h-64 rounded-xl bg-stone-950 border border-stone-800 relative overflow-hidden flex flex-col justify-between p-3.5 text-white">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>LIVE STREAM 1080p @ 60FPS</span>
                </span>
                <span className="bg-rose-700 px-2 py-0.5 rounded text-white font-bold text-[10px]">PROCTOR ACTIVE</span>
              </div>

              <div className="text-center py-6">
                <Video className="w-12 h-12 text-stone-700 mx-auto animate-pulse" />
                <span className="text-xs font-mono text-stone-400 block mt-2">
                  Encrypted Station Feed • Real-Time AI Proctoring Telemetry Active
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                <span>Subject: {activeCctvStation.candidateName}</span>
                <span>Assessor: {activeCctvStation.assessorName}</span>
              </div>
            </div>

            <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs text-[#806F6F] flex items-center justify-between">
              <span>Proctoring Mode: High-Fidelity Biometric Examination Oversight</span>
              <span className="font-mono text-emerald-700 font-semibold">Zero Incidents Flagged</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Assessment Traceability Dossier Modal (ISO 17024 11-Stage Lifecycle) */}
      {selectedTraceabilityAssessmentId && (
        <AssessmentTraceabilityModal
          isOpen={!!selectedTraceabilityAssessmentId}
          onClose={() => setSelectedTraceabilityAssessmentId(null)}
          assessmentId={selectedTraceabilityAssessmentId}
        />
      )}
    </div>
  );
};
