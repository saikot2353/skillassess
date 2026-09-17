import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Monitor, Wrench, Image as ImageIcon, AlertTriangle, 
  CheckCircle2, Clock, Search, Filter, Eye, RefreshCw, Radio,
  ShieldCheck, Check, X, Camera, Laptop, Award, Lock, Play, ChevronRight, FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { Candidate, Batch, Schedule, User, PracticalTask, AssessorLottery, LiveActivityEvent, EvidenceItem } from '../types';

export interface AssessmentMonitoringPageProps {
  onNavigate?: (path: string) => void;
}

export const AssessmentMonitoringPage: React.FC<AssessmentMonitoringPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF';

  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'live' || t === 'activities') return 'activities';
    return t || (user?.role === 'SUPPORT_STAFF' ? 'activities' : 'pipeline');
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [lotteries, setLotteries] = useState<AssessorLottery[]>([]);
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);

  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedOccupation, setSelectedOccupation] = useState('ALL');

  // Modals
  const [viewingEvidence, setViewingEvidence] = useState<{
    candidate: Candidate;
    evidence: any;
  } | null>(null);

  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');

  const [cbtModalCandidate, setCbtModalCandidate] = useState<Candidate | null>(null);
  const [cbtScoreInput, setCbtScoreInput] = useState('85');

  const loadData = () => {
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const centerCandidates = allCandidates.filter(c => c.centerId === userCenterId);
    setCandidates(centerCandidates);

    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    setBatches(allBatches.filter(b => b.centerId === userCenterId));

    setTasks(StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []));

    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    setAssessors(allUsers.filter(u => u.role === 'ASSESSOR' && u.centerId === userCenterId));

    const allLotteries = StorageService.get<AssessorLottery[]>(STORAGE_KEYS.ASSESSOR_LOTTERY, []);
    setLotteries(allLotteries.filter(l => l.centerId === userCenterId));

    const allLive = StorageService.get<LiveActivityEvent[]>(STORAGE_KEYS.LIVE_ACTIVITY, []);
    setLiveActivities(allLive.filter(a => !a.centerId || a.centerId === userCenterId));
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      if (tabParam === 'live' || tabParam === 'activities') {
        setActiveTab('activities');
      } else if (['pipeline', 'cbt', 'practical', 'evidence', 'incidents'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [userCenterId]);

  // Unique Occupations
  const occupations = useMemo(() => {
    return Array.from(new Set(candidates.map(c => c.occupation).filter(Boolean)));
  }, [candidates]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchesSearch = 
        c.fullNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.fullNameAr.includes(searchTerm) ||
        c.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.applicationNumber ? c.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) : false);

      const matchesBatch = selectedBatch === 'ALL' || c.batchId === selectedBatch;
      const matchesOcc = selectedOccupation === 'ALL' || c.occupation === selectedOccupation;

      return matchesSearch && matchesBatch && matchesOcc;
    });
  }, [candidates, searchTerm, selectedBatch, selectedOccupation]);

  // Pipeline Counts
  const pipelineStats = useMemo(() => {
    const total = candidates.length;
    const scheduled = candidates.filter(c => c.status === 'SCHEDULED' || c.status === 'REGISTERED').length;
    const enrolled = candidates.filter(c => c.status === 'ENROLLED' || c.status === 'BIOMETRICS_VERIFIED').length;
    const cbtDone = candidates.filter(c => c.cbtStatus === 'COMPLETED').length;
    const practicalDone = candidates.filter(c => c.practicalStatus === 'COMPLETED').length;
    const evaluated = candidates.filter(c => c.status === 'ASSESSMENT_COMPLETED').length;
    const resultOut = candidates.filter(c => c.status === 'RESULT_PENDING' || c.resultStatus).length;
    const locked = candidates.filter(c => c.resultLocked).length;

    return {
      total,
      scheduled,
      enrolled,
      cbtDone,
      practicalDone,
      evaluated,
      resultOut,
      locked
    };
  }, [candidates]);

  // CBT actions
  const handleCompleteCbt = (candidate: Candidate) => {
    const score = parseInt(cbtScoreInput, 10) || 80;
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = allCandidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          cbtStatus: 'COMPLETED' as const,
          cbtScore: score,
          practicalStatus: c.practicalStatus || 'IN_PROGRESS'
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidates(updated.filter(c => c.centerId === userCenterId));

    AuditService.log(
      'UPDATE_CANDIDATE',
      'CANDIDATE',
      `CBT completed for ${candidate.fullNameEn} (${candidate.passportNumber}) with score ${score}%`,
      candidate.id,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? `تم تسجيل نتيجة CBT بنجاح (${score}%)` : `CBT completion score recorded (${score}%)`,
      'success'
    );
    setCbtModalCandidate(null);
  };

  // Practical status update
  const handleCompletePractical = (candidate: Candidate) => {
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = allCandidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          practicalStatus: 'COMPLETED' as const,
          status: 'ASSESSMENT_COMPLETED' as const,
          resultStatus: 'PASS' as const
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidates(updated.filter(c => c.centerId === userCenterId));

    AuditService.log(
      'UPDATE_CANDIDATE',
      'CANDIDATE',
      `Practical assessment completed for ${candidate.fullNameEn} on bay ${candidate.assignedBay || 'unassigned'}`,
      candidate.id,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? 'تم تسجيل إتمام التقييم العملي' : 'Practical assessment completed and rubric sealed',
      'success'
    );
  };

  // Evidence review
  const handleReviewEvidence = (candidate: Candidate, evidenceId: string, status: 'APPROVED' | 'REJECTED' | 'VERIFIED') => {
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = allCandidates.map(c => {
      if (c.id === candidate.id && c.evidenceItems) {
        return {
          ...c,
          evidenceItems: c.evidenceItems.map(item => item.id === evidenceId ? { ...item, status } : item)
        };
      }
      return c;
    });

    StorageService.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidates(updated.filter(c => c.centerId === userCenterId));

    AuditService.log(
      'UPDATE_CANDIDATE',
      'EVIDENCE',
      `Evidence item ${evidenceId} status updated to ${status} for candidate ${candidate.fullNameEn}`,
      candidate.id,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? `تم تحديث حالة الدليل إلى ${status}` : `Evidence status updated to ${status}`,
      'info'
    );
    setViewingEvidence(null);
  };

  // Log Center Incident
  const handleLogIncident = () => {
    if (!incidentDescription.trim()) return;

    const newActivity: LiveActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SECURITY_ALERT',
      severity: incidentSeverity,
      centerId: userCenterId,
      centerName: userCenterId === 'ctr-sa-1' ? 'Riyadh Central Technical Hub' : 'Jeddah Vocational Center',
      countryId: 'ctr-sa-1',
      countryCode: 'SA',
      user: user?.name || 'Center Administrator',
      actorName: user?.name || 'Center Administrator',
      role: 'CENTER_ADMIN',
      action: 'SECURITY_ALERT',
      entity: 'CENTER',
      status: 'WARNING',
      description: incidentDescription.trim()
    };

    const allActivities = StorageService.get<LiveActivityEvent[]>(STORAGE_KEYS.LIVE_ACTIVITY, []);
    const updated = [newActivity, ...allActivities];
    StorageService.set(STORAGE_KEYS.LIVE_ACTIVITY, updated);
    setLiveActivities(updated.filter(a => !a.centerId || a.centerId === userCenterId));

    AuditService.log(
      'UPDATE',
      'LIVE_ACTIVITY',
      `Operational incident reported [${incidentSeverity}]: ${incidentDescription.trim()}`,
      userCenterId,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? 'تم تسجيل البلاغ التشغيلي في منصة المراقبة' : 'Operational incident logged into monitoring stream',
      'warning'
    );
    setIncidentDescription('');
    setIncidentModalOpen(false);
  };

  const tabs = [
    { id: 'activities', label: language === 'ar' ? 'أنشطة اليوم التشغيلية' : "Today's Activities", icon: <Clock className="w-4 h-4" /> },
    { id: 'pipeline', label: language === 'ar' ? 'مسار المراحل' : 'Pipeline Progression', icon: <Activity className="w-4 h-4" /> },
    { id: 'cbt', label: language === 'ar' ? 'مراقبة CBT' : 'CBT Lab Monitor', icon: <Laptop className="w-4 h-4" /> },
    { id: 'practical', label: language === 'ar' ? 'الورش العملية' : 'Practical Workshop', icon: <Wrench className="w-4 h-4" /> },
    { id: 'evidence', label: language === 'ar' ? 'الأدلة والتوثيق' : 'Evidence Surveillance', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'incidents', label: language === 'ar' ? 'البلاغات والأحداث' : 'Live Incidents', icon: <Radio className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'مراقبة التقييم والعمليات' : 'Assessment & Operations Monitoring'}
        subtitle={language === 'ar' ? 'المراقبة الفورية لمراحل CBT، الورش العملية، كاميرات التوثيق والأدلة الميدانية' : 'Real-time telemetry across CBT testing, workshop practicals, evidence captures, and station integrity'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المراقبة الميدانية' : 'Operations Monitoring' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadData}
            >
              {language === 'ar' ? 'تحديث فوري' : 'Sync Stream'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setIncidentModalOpen(true)}
            >
              {language === 'ar' ? 'تسجيل حدث طارئ' : 'Log Incident'}
            </Button>
          </div>
        }
      />

      {/* Global Filter Toolbar */}
      <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[#7C756D]" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث بالمرشح، الجواز أو الرقم...' : 'Search candidate, passport or ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A] text-[#2C2623]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg text-[#2C2623] focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'جميع الدفعات' : 'All Batches'}</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.code} ({b.name})</option>
            ))}
          </select>

          <select
            value={selectedOccupation}
            onChange={(e) => setSelectedOccupation(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg text-[#2C2623] focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'جميع المهن' : 'All Occupations'}</option>
            {occupations.map(occ => (
              <option key={occ} value={occ}>{occ}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB: TODAY'S ACTIVITIES (Section 20 Operational Support Screen) */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2C2623] text-sm">
                  {language === 'ar' ? 'أنشطة اليوم التشغيلية ومتابعة الوفود' : "Today's Assessment Activities & Operational Shifts"}
                </h3>
                <p className="text-xs text-[#7C756D]">
                  {language === 'ar'
                    ? 'رصد فوري لجميع دفعات اليوم، أوقات الاختبار، واكتمال التحقق والحضور دون التدخل في القرعة المكتومة'
                    : 'Real-time cohort activity tracker: shift timing, candidate intake status, and stage progress with lottery isolation.'}
                </p>
              </div>
            </div>
            <div className="text-end text-xs text-[#7C756D]">
              <span className="font-semibold text-[#2C2623]">{batches.length}</span> {language === 'ar' ? 'دفعات نشطة' : 'Cohorts Today'}
            </div>
          </div>

          {/* Section 20 Table */}
          <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E8E4DC] text-[#7C756D] text-xs font-semibold uppercase">
                    <th className="py-3 px-4">{language === 'ar' ? 'الدفعة' : 'Batch'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'وقت التقييم' : 'Assessment Time'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'المرشحون' : 'Candidates'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'تم التحقق' : 'Verified'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'قيد الاختبار' : 'In Progress'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'مكتمل' : 'Completed'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'معلق' : 'Pending'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DC]">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#7C756D]">
                        {language === 'ar' ? 'لا توجد دفعات مسجلة لهذا اليوم' : 'No active cohorts scheduled for today.'}
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => {
                      const bCandidates = candidates.filter(c => c.batchId === b.id);
                      const totalC = bCandidates.length || b.candidateCount;
                      const verifiedC = bCandidates.filter(c => c.enrollmentStatus === 'ENROLLED' || c.status === 'VERIFIED' || c.status === 'COMPLETED').length;
                      const inProgressC = bCandidates.filter(c => c.status === 'IN_PROGRESS' || c.status === 'IN_ASSESSMENT' || c.practicalStatus === 'IN_PROGRESS' || c.cbtStatus === 'IN_PROGRESS').length;
                      const completedC = bCandidates.filter(c => c.status === 'COMPLETED' || c.status === 'LOCKED' || c.resultLocked === true).length;
                      const pendingC = Math.max(0, totalC - (verifiedC + inProgressC + completedC));

                      return (
                        <tr key={b.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-[#7A2E3A]">
                            {b.batchNumber || b.code || b.id}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-[#2C2623]">
                            {b.occupation}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-[#7C756D]">
                            {b.assessmentTime || `${b.startDate} (08:00 - 15:00)`}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-xs text-[#2C2623]">
                            {totalC}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {verifiedC}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              {inProgressC}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              {completedC}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                              {pendingC}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-Time Live Activity Event Log (Filtered to Center) */}
          <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#7A2E3A]" />
                <h4 className="font-bold text-sm text-[#2C2623]">
                  {language === 'ar' ? 'سجل الأحداث والعمليات الميدانية اللحظية' : 'Live Assessment-Day Operational Telemetry'}
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Center Live
              </span>
            </div>

            <div className="divide-y divide-[#E8E4DC] max-h-72 overflow-y-auto">
              {liveActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#7C756D]">
                  {language === 'ar' ? 'لا توجد أنشطة مسجلة لهذا المركز' : 'No activities recorded for this center today.'}
                </div>
              ) : (
                liveActivities.map((act) => (
                  <div key={act.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-[#FAF8F5]">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[#2C2623]">
                        {act.actorName || act.user || 'Center Staff'}: {act.description || act.action}
                      </div>
                      <div className="text-[11px] text-[#7C756D] font-mono">
                        {act.entity} {act.centerName ? `• ${act.centerName}` : ''}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#7C756D] shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PIPELINE PROGRESSION */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Pipeline Horizontal Flow Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-[#D5D0C7] text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-[#7C756D] uppercase">1. {language === 'ar' ? 'المجدولون' : 'Scheduled'}</div>
              <div className="text-xl font-bold text-[#2C2623] mt-1">{pipelineStats.scheduled}</div>
              <div className="text-[10px] text-[#7C756D] mt-0.5">{language === 'ar' ? 'بانتظار الحضور' : 'Awaiting Intake'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-[#C9A24D]/60 bg-[#FAF8F5] text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-[#8F6F24] uppercase">2. {language === 'ar' ? 'المسجلون' : 'Enrolled'}</div>
              <div className="text-xl font-bold text-[#8F6F24] mt-1">{pipelineStats.enrolled}</div>
              <div className="text-[10px] text-[#8F6F24] mt-0.5">{language === 'ar' ? 'بصمة + قرعة' : 'Biometric Ready'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-blue-200 text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-blue-800 uppercase">3. {language === 'ar' ? 'اختبار CBT' : 'CBT Lab'}</div>
              <div className="text-xl font-bold text-blue-900 mt-1">{pipelineStats.cbtDone}</div>
              <div className="text-[10px] text-blue-700 mt-0.5">{language === 'ar' ? 'مكتمل' : 'Passed / Done'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-amber-200 text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-amber-800 uppercase">4. {language === 'ar' ? 'الورشة العملية' : 'Practical'}</div>
              <div className="text-xl font-bold text-amber-900 mt-1">{pipelineStats.practicalDone}</div>
              <div className="text-[10px] text-amber-700 mt-0.5">{language === 'ar' ? 'مهام منجزة' : 'Work Completed'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-purple-200 text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-purple-800 uppercase">5. {language === 'ar' ? 'التقييم' : 'Evaluation'}</div>
              <div className="text-xl font-bold text-purple-900 mt-1">{pipelineStats.evaluated}</div>
              <div className="text-[10px] text-purple-700 mt-0.5">{language === 'ar' ? 'رصد المقيم' : 'Rubric Submitted'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-emerald-200 text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">6. {language === 'ar' ? 'النتائج' : 'Results'}</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">{pipelineStats.resultOut}</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">{language === 'ar' ? 'ناجح / راسب' : 'Outcome Ready'}</div>
            </div>

            <div className="bg-[#FFFCF8] p-3.5 rounded-xl border border-[#7A2E3A]/40 text-center shadow-2xs">
              <div className="text-[11px] font-semibold text-[#7A2E3A] uppercase">7. {language === 'ar' ? 'المقفل رسمياً' : 'Locked'}</div>
              <div className="text-xl font-bold text-[#7A2E3A] mt-1">{pipelineStats.locked}</div>
              <div className="text-[10px] text-[#7A2E3A] mt-0.5">{language === 'ar' ? 'مختوم ومؤمّن' : 'Sealed Official'}</div>
            </div>
          </div>

          {/* Active Candidates Pipeline Table */}
          <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between">
              <h3 className="font-bold text-[#2C2623] text-sm">
                {language === 'ar' ? 'تفاصيل حالة المرشحين بالمسار التشغيلي' : 'Candidate Operational Trajectory'} ({filteredCandidates.length})
              </h3>
              <div className="text-xs text-[#7C756D]">
                {language === 'ar' ? 'تحديث لحظي حسب إجراءات المركز' : 'Live sync based on center actions'}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E8E4DC] text-[#7C756D] text-xs font-medium uppercase">
                    <th className="py-3 px-4">{language === 'ar' ? 'المرشح' : 'Candidate'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'الدفعة والمهنة' : 'Batch & Trade'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'البصمة والتسجيل' : 'Biometric'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'اختبار CBT' : 'CBT Status'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'الورشة العملية' : 'Practical Bay'}</th>
                    <th className="py-3 px-4 text-center">{language === 'ar' ? 'النتيجة والإقفال' : 'Result State'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DC]">
                  {filteredCandidates.map(cand => (
                    <tr key={cand.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#2C2623]">
                          {language === 'ar' ? cand.fullNameAr : cand.fullNameEn}
                        </div>
                        <div className="text-xs text-[#7C756D] font-mono">
                          {cand.passportNumber} • {cand.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#2C2623] text-xs">{cand.occupation}</div>
                        <div className="text-xs text-[#7C756D]">{batches.find(b => b.id === cand.batchId)?.code || cand.batchId}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cand.status === 'ENROLLED' || cand.status === 'BIOMETRICS_VERIFIED' || cand.cbtStatus ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'متحقق' : 'Verified'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#7C756D] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#D5D0C7]">
                            <Clock className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'مجدول' : 'Awaiting'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cand.cbtStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium border border-blue-200">
                            <Check className="w-3.5 h-3.5" />
                            {cand.cbtScore ? `${cand.cbtScore}%` : 'Passed'}
                          </span>
                        ) : (
                          <span className="text-xs text-[#7C756D] font-mono">
                            {cand.cbtStatus || 'PENDING'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cand.assignedBay ? (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            <Wrench className="w-3 h-3" />
                            <span>{cand.assignedBay}</span>
                            <span className="text-[10px] font-mono text-amber-600">({cand.assignedTaskId || 'TASK'})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#7C756D]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cand.resultLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#7A2E3A] bg-[#7A2E3A]/10 px-2 py-0.5 rounded font-bold border border-[#7A2E3A]/30">
                            <Lock className="w-3 h-3" />
                            {language === 'ar' ? 'مقفل رسمياً' : 'LOCKED'}
                          </span>
                        ) : cand.resultStatus ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${cand.resultStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {cand.resultStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-[#7C756D]">{language === 'ar' ? 'قيد التقييم' : 'In Review'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CBT LAB MONITOR */}
      {activeTab === 'cbt' && (
        <div className="space-y-4">
          <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2C2623] text-sm">
                  {language === 'ar' ? 'محطة متابعة قاعات الاختبار النظري (CBT)' : 'CBT Examination Terminal Grid'}
                </h3>
                <p className="text-xs text-[#7C756D]">
                  {language === 'ar' ? 'مراقبة زمن الإجابة وحالة الأجهزة ورصد نتائج الاختبارات الفورية' : 'Live terminal latency, test completion and theoretical score recording'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs overflow-hidden">
            <table className="w-full text-left rtl:text-right border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8E4DC] text-[#7C756D] text-xs font-medium uppercase">
                  <th className="py-3 px-4">{language === 'ar' ? 'المرشح' : 'Candidate'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'المحطة / الجهاز' : 'Terminal Station'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'حالة الاختبار' : 'Exam State'}</th>
                  <th className="py-3 px-4">{language === 'ar' ? 'الدرجة المحققة' : 'Current Score'}</th>
                  <th className="py-3 px-4 text-center">{language === 'ar' ? 'الإجراء الميداني' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DC]">
                {filteredCandidates.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2C2623]">
                        {language === 'ar' ? c.fullNameAr : c.fullNameEn}
                      </div>
                      <div className="text-xs text-[#7C756D]">{c.passportNumber} • {c.occupation}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-[#2C2623]">
                        TERM-{String((idx % 15) + 1).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-[#7C756D] font-mono">192.168.10.{20 + idx}</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.cbtStatus === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'مكتمل ومعتمد' : 'Completed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          {language === 'ar' ? 'قيد الاختبار' : 'Active Session'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.cbtScore ? (
                        <span className="font-bold text-sm text-[#2C2623]">{c.cbtScore}%</span>
                      ) : (
                        <span className="text-xs text-[#7C756D] italic">{language === 'ar' ? 'بانتظار التسليم' : 'In progress'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!isSupportStaff ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCbtModalCandidate(c);
                            setCbtScoreInput(c.cbtScore ? String(c.cbtScore) : '85');
                          }}
                        >
                          {c.cbtStatus === 'COMPLETED' 
                            ? (language === 'ar' ? 'تعديل الدرجة' : 'Update Score') 
                            : (language === 'ar' ? 'رصد نتيجة CBT' : 'Record CBT Score')}
                        </Button>
                      ) : (
                        <span className="text-xs font-mono text-[#7C756D]">
                          {c.cbtStatus === 'COMPLETED' ? 'Sealed' : 'Monitored'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRACTICAL WORKSHOP MONITOR */}
      {activeTab === 'practical' && (
        <div className="space-y-4">
          <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2C2623] text-sm">
                  {language === 'ar' ? 'محطات الورش والاختبار العملي' : 'Workshop Workstation & Practical Bays'}
                </h3>
                <p className="text-xs text-[#7C756D]">
                  {language === 'ar' ? 'متابعة المنصات والمهام الموزعة عبر القرعة، والمقيمين المكلفين' : 'Surveillance of randomized practical tasks, workstation allocation, and assessor grading'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((c) => {
              const matchedTask = tasks.find(t => t.id === c.assignedTaskId || t.code === c.assignedTaskId);
              const isAssessorBlind = lotteries.some(l => l.batchId === c.batchId && l.status === 'DRAFT');

              return (
                <div key={c.id} className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#D5D0C7] text-[#2C2623]">
                      {c.assignedBay || 'BAY-UNASSIGNED'}
                    </span>
                    <Badge variant={c.practicalStatus === 'COMPLETED' ? 'success' : 'gold'} size="sm">
                      {c.practicalStatus || 'PENDING'}
                    </Badge>
                  </div>

                  <div>
                    <div className="font-bold text-sm text-[#2C2623]">
                      {language === 'ar' ? c.fullNameAr : c.fullNameEn}
                    </div>
                    <div className="text-xs text-[#7C756D]">{c.occupation}</div>
                  </div>

                  {/* Task details */}
                  <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] space-y-1">
                    <div className="text-[11px] font-semibold text-[#7C756D] uppercase">
                      {language === 'ar' ? 'المهمة العملية المخصصة' : 'Allocated Practical Task'}
                    </div>
                    <div className="font-semibold text-xs text-[#2C2623]">
                      {matchedTask?.titleEn || c.assignedTaskId || 'General Practical Task'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#D5D0C7]">
                        {matchedTask?.code || c.assignedTaskId || 'TASK-01'}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {c.taskDifficulty || matchedTask?.difficulty || 'STANDARD'}
                      </span>
                    </div>
                  </div>

                  {/* Assessor Assignment */}
                  <div className="text-xs text-[#5C554E] flex items-center justify-between">
                    <span className="text-[#7C756D]">{language === 'ar' ? 'المقيّم المعتمد:' : 'Assigned Assessor:'}</span>
                    {isAssessorBlind ? (
                      <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                        {language === 'ar' ? 'مخفي (قرعة عمياء)' : '[HIDDEN - BLIND]'}
                      </span>
                    ) : (
                      <span className="font-medium text-[#2C2623]">
                        {assessors[0]?.name || 'Eng. Yasir Mahmood'}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E8E4DC] flex justify-end">
                    {c.practicalStatus !== 'COMPLETED' ? (
                      !isSupportStaff ? (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleCompletePractical(c)}
                        >
                          {language === 'ar' ? 'اعتماد إتمام الورشة' : 'Finalize Practical'}
                        </Button>
                      ) : (
                        <span className="text-xs text-amber-800 font-medium">
                          {language === 'ar' ? 'قيد العمل بالورشة' : 'Workshop Active'}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {language === 'ar' ? 'تم اكتمال الاختبار العملي' : 'Workpiece Submitted'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EVIDENCE SURVEILLANCE */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2C2623] text-sm">
                  {language === 'ar' ? 'معرض الأدلة الميدانية والمصادقة' : 'Field Evidence & Verification Depot'}
                </h3>
                <p className="text-xs text-[#7C756D]">
                  {language === 'ar' ? 'فحص ومصادقة صور القطع المنفذة، بطاقات التفتيش، وتوثيق السلامة المهنية' : 'Inspect workpiece captures, safety verification stamps, and rubric photo attachments'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((cand) => {
              const items: EvidenceItem[] = cand.evidenceItems || [
                {
                  id: `ev-${cand.id}-1`,
                  type: 'WORKPIECE_PHOTO',
                  title: 'Finished Assembly Front View',
                  fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80',
                  url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80',
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: 'Assessor Lead',
                  status: 'VERIFIED'
                },
                {
                  id: `ev-${cand.id}-2`,
                  type: 'SAFETY_CHECK',
                  title: 'PPE & Isolation Checklist',
                  fileUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=80',
                  url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=80',
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: 'Assessor Lead',
                  status: 'UPLOADED'
                }
              ];

              return (
                <div key={cand.id} className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#2C2623]">
                        {language === 'ar' ? cand.fullNameAr : cand.fullNameEn}
                      </div>
                      <div className="text-xs text-[#7C756D]">{cand.passportNumber} • {cand.occupation}</div>
                    </div>
                    <Badge variant="neutral" size="sm">{items.length} items</Badge>
                  </div>

                  <div className="space-y-2">
                    {items.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC]">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={ev.fileUrl || ev.url || ''} 
                            alt={ev.title} 
                            className="w-12 h-12 object-cover rounded-md border border-[#D5D0C7]"
                          />
                          <div>
                            <div className="font-semibold text-xs text-[#2C2623]">{ev.title}</div>
                            <div className="text-[10px] text-[#7C756D]">{ev.type}</div>
                            <div className="mt-0.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${ev.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {ev.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingEvidence({ candidate: cand, evidence: ev })}
                        >
                          <Eye className="w-4 h-4 text-[#7C756D]" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: INCIDENTS & ANOMALIES */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#D5D0C7] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2C2623] text-sm">
                  {language === 'ar' ? 'سجل الأحداث الميدانية والبلاغات التشغيلية' : 'Live Operational Incidents & Anomalies'}
                </h3>
                <p className="text-xs text-[#7C756D]">
                  {language === 'ar' ? 'رصد الانقطاعات الفنية، طلبات استبدال الأدوات، وحالات التدقيق الخاصة' : 'Center-level telemetry, security alerts, and technical anomalies'}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setIncidentModalOpen(true)}
            >
              {language === 'ar' ? 'إضافة بلاغ' : 'Add Incident'}
            </Button>
          </div>

          <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs divide-y divide-[#E8E4DC]">
            {liveActivities.length === 0 ? (
              <div className="p-8 text-center text-[#7C756D]">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
                <p className="font-semibold">{language === 'ar' ? 'لا توجد بلاغات مسجلة حالياً' : 'All systems normal'}</p>
                <p className="text-xs">{language === 'ar' ? 'عمليات المركز تسير بانسيابية تامة' : 'No active operational anomalies reported for this center'}</p>
              </div>
            ) : (
              liveActivities.map((act) => (
                <div key={act.id} className="p-4 flex items-start justify-between gap-4 hover:bg-[#FAF8F5]/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {act.severity === 'CRITICAL' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 block animate-ping" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#2C2623]">{act.description}</div>
                      <div className="text-xs text-[#7C756D] mt-1 flex items-center gap-2">
                        <span>{act.actorName || 'System'}</span>
                        <span>•</span>
                        <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{act.type}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={act.severity === 'CRITICAL' ? 'danger' : 'gold'} size="sm">
                    {act.severity || 'INFO'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CBT Score Modal */}
      {cbtModalCandidate && (
        <Modal
          isOpen={true}
          onClose={() => setCbtModalCandidate(null)}
          title={language === 'ar' ? 'تسجيل درجة اختبار CBT' : 'Record CBT Examination Score'}
          maxWidth="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCbtModalCandidate(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="primary" onClick={() => handleCompleteCbt(cbtModalCandidate)}>
                {language === 'ar' ? 'تأكيد وحفظ الدرجة' : 'Confirm & Save Score'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC]">
              <div className="font-bold text-sm text-[#2C2623]">
                {language === 'ar' ? cbtModalCandidate.fullNameAr : cbtModalCandidate.fullNameEn}
              </div>
              <div className="text-xs text-[#7C756D]">
                {cbtModalCandidate.passportNumber} • {cbtModalCandidate.occupation}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                {language === 'ar' ? 'الدرجة المحققة (من 100)' : 'Obtained Score (Out of 100)'}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={cbtScoreInput}
                onChange={(e) => setCbtScoreInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A] font-bold text-lg text-center"
              />
              <p className="text-[11px] text-[#7C756D] mt-1">
                {language === 'ar' ? 'درجة النجاح الدنيا هي 70%' : 'Minimum passing threshold is 70%'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Evidence Viewer Modal */}
      {viewingEvidence && (
        <Modal
          isOpen={true}
          onClose={() => setViewingEvidence(null)}
          title={language === 'ar' ? 'معاينة واعتماد الدليل الميداني' : 'Evidence Inspection & Audit'}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-[#7C756D]">
                {language === 'ar' ? 'التحقق مشروط بالمعايير الفنية' : 'Verification sealed with audit timestamp'}
              </div>
              {!isSupportStaff ? (
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleReviewEvidence(viewingEvidence.candidate, viewingEvidence.evidence.id, 'REJECTED')}
                    className="text-rose-700 hover:bg-rose-50"
                  >
                    {language === 'ar' ? 'رفض الدليل' : 'Reject'}
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={() => handleReviewEvidence(viewingEvidence.candidate, viewingEvidence.evidence.id, 'VERIFIED')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    {language === 'ar' ? 'اعتماد ومصادقة' : 'Approve & Verify'}
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setViewingEvidence(null)}>
                  {t.common.close}
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#2C2623]">{viewingEvidence.evidence.title}</h4>
                <p className="text-xs text-[#7C756D]">
                  {viewingEvidence.candidate.fullNameEn} • {viewingEvidence.candidate.passportNumber}
                </p>
              </div>
              <Badge variant="neutral">{viewingEvidence.evidence.type}</Badge>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#D5D0C7] bg-black max-h-[420px] flex items-center justify-center">
              <img 
                src={viewingEvidence.evidence.fileUrl || viewingEvidence.evidence.url || ''} 
                alt="Evidence" 
                className="max-h-[420px] w-auto object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-[11px] p-2 rounded backdrop-blur-xs flex justify-between font-mono">
                <span>TIMESTAMP: {new Date(viewingEvidence.evidence.uploadedAt || viewingEvidence.evidence.timestamp || Date.now()).toLocaleString()}</span>
                <span>SHA-256: 9f8a3c2...b71e</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Incident Modal */}
      {incidentModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIncidentModalOpen(false)}
          title={language === 'ar' ? 'تسجيل بلاغ تشغيلي بالمركز' : 'Log Center Operational Incident'}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIncidentModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" onClick={handleLogIncident}>
                {language === 'ar' ? 'تسجيل البلاغ' : 'Publish Alert'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                {language === 'ar' ? 'مستوى الخطورة' : 'Severity Level'}
              </label>
              <select
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="INFO">INFO - ملاحظة إجرائية اعتيادية</option>
                <option value="WARNING">WARNING - تنبيه تشغيلي أو تأخير</option>
                <option value="CRITICAL">CRITICAL - طارئ فني أو اشتباه أمني</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                {language === 'ar' ? 'تفاصيل البلاغ' : 'Incident Details & Description'}
              </label>
              <textarea
                rows={3}
                placeholder={language === 'ar' ? 'اكتب ملخص الإجراء أو العطل الفني...' : 'Describe technical issue, power fluctuation, or supervisor alert...'}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssessmentMonitoringPage;
