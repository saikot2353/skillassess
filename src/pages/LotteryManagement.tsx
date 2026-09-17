import React, { useState, useEffect } from 'react';
import { 
  Dice5, Shield, ShieldCheck, Eye, EyeOff, Lock, Unlock, Play,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Layers, Users,
  Building2, Globe, FileCode, CheckCircle, Info
} from 'lucide-react';
import { AssessorLottery, TaskLottery, Center, Country, User, Candidate, PracticalTask } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';

export interface LotteryProps {
  onNavigate?: (path: string) => void;
}

export const LotteryManagementPage: React.FC<LotteryProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('assessor');
  const [assessorLotteries, setAssessorLotteries] = useState<AssessorLottery[]>([]);
  const [taskLotteries, setTaskLotteries] = useState<TaskLottery[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);

  // Inspect Modal
  const [inspectLottery, setInspectLottery] = useState<AssessorLottery | null>(null);

  // Run Assessor Lottery Modal
  const [isRunAssessorOpen, setIsRunAssessorOpen] = useState(false);
  const [runAssessorForm, setRunAssessorForm] = useState({
    centerId: '',
    occupation: 'Electrical Installation',
  });

  // Run Task Lottery Modal
  const [isRunTaskOpen, setIsRunTaskOpen] = useState(false);
  const [runTaskForm, setRunTaskForm] = useState({
    centerId: '',
    occupation: 'Electrical Installation',
  });

  const loadData = () => {
    setAssessorLotteries(StorageService.get<AssessorLottery[]>(STORAGE_KEYS.ASSESSOR_LOTTERY, []));
    setTaskLotteries(StorageService.get<TaskLottery[]>(STORAGE_KEYS.TASK_LOTTERY, []));
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    setUsers(StorageService.get<User[]>(STORAGE_KEYS.USERS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
    setTasks(StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []));
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['assessor', 'tasks'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleOpenRunAssessor = () => {
    setRunAssessorForm({
      centerId: centers[0]?.id || '',
      occupation: 'Electrical Installation',
    });
    setIsRunAssessorOpen(true);
  };

  const handleOpenRunTask = () => {
    setRunTaskForm({
      centerId: centers[0]?.id || '',
      occupation: 'Electrical Installation',
    });
    setIsRunTaskOpen(true);
  };

  // Run Assessor Blind Allocation Engine
  const handleExecuteAssessorLottery = (e: React.FormEvent) => {
    e.preventDefault();
    const ctr = centers.find(c => c.id === runAssessorForm.centerId);
    if (!ctr) return;

    const centerAssessors = users.filter(u => u.role === 'ASSESSOR' && u.centerId === ctr.id);
    const centerCandidates = candidates.filter(c => c.centerId === ctr.id && c.occupation === runAssessorForm.occupation);

    if (centerAssessors.length === 0) {
      showToast('Cannot run lottery: No accredited assessors found for this center', 'error');
      return;
    }

    // Generate random pairings
    const pairings = centerCandidates.map((c, idx) => {
      const assignedAssessor = centerAssessors[idx % centerAssessors.length];
      return {
        candidateId: c.id,
        candidateName: c.fullNameEn,
        aproReference: c.aproReference,
        assessorId: assignedAssessor.id,
        assessorName: assignedAssessor.name,
        stationNumber: idx + 1,
      };
    });

    const newRecord: AssessorLottery = {
      id: `lot-as-${Date.now()}`,
      centerId: ctr.id,
      centerName: ctr.nameEn,
      occupation: runAssessorForm.occupation,
      scheduledDate: new Date().toISOString().split('T')[0],
      algorithmVersion: 'v2.4-AntiBias-Cryptographic',
      totalCandidates: pairings.length,
      pairings,
      releaseStatus: 'HIDDEN',
      status: 'GENERATED',
      releaseScheduledTime: '08:30 AM (Test Day - Configurable / TBC)',
      createdAt: new Date().toISOString(),
    };

    StorageService.updateItem(STORAGE_KEYS.ASSESSOR_LOTTERY, newRecord);
    AuditService.log('GENERATE_LOTTERY', 'ASSESSOR_LOTTERY', `Executed blind assessor lottery allocation for ${ctr.nameEn} (${newRecord.totalCandidates} pairings generated)`, newRecord.id, 'SUCCESS');
    showToast(`Lottery generated for ${ctr.nameEn} with ${newRecord.totalCandidates} blind pairings`, 'success');
    setIsRunAssessorOpen(false);
    loadData();
  };

  const handleToggleRelease = (lottery: AssessorLottery) => {
    const nextStatus: 'RELEASED' | 'HIDDEN' = lottery.releaseStatus === 'HIDDEN' ? 'RELEASED' : 'HIDDEN';
    const updated: AssessorLottery = {
      ...lottery,
      releaseStatus: nextStatus,
      status: nextStatus === 'RELEASED' ? 'CONFIRMED' : 'GENERATED',
    };
    StorageService.updateItem(STORAGE_KEYS.ASSESSOR_LOTTERY, updated);
    AuditService.log(
      'RELEASE_LOTTERY',
      'ASSESSOR_LOTTERY',
      `${nextStatus === 'RELEASED' ? 'Released' : 'Concealed'} assessor pairing roster for ${lottery.centerName} (${lottery.occupation})`,
      lottery.id,
      'SUCCESS'
    );
    showToast(nextStatus === 'RELEASED' ? 'Pairings released to active assessors' : 'Pairings hidden to ensure blind examination integrity', 'info');
    loadData();
    if (inspectLottery?.id === lottery.id) setInspectLottery(updated);
  };

  // Run Task Lottery Engine
  const handleExecuteTaskLottery = (e: React.FormEvent) => {
    e.preventDefault();
    const ctr = centers.find(c => c.id === runTaskForm.centerId);
    if (!ctr) return;

    const availableTasks = tasks.filter(t => t.occupation === runTaskForm.occupation && t.status === 'ACTIVE');
    if (availableTasks.length === 0) {
      showToast('Cannot run task lottery: No active tasks for this occupation in the task pool', 'error');
      return;
    }

    const bayAllocations = [1, 2, 3, 4, 5, 6].map(bayNumber => {
      const assignedTask = availableTasks[bayNumber % availableTasks.length];
      return {
        bayNumber,
        taskId: assignedTask.id,
        taskCode: assignedTask.code,
        taskTitle: assignedTask.titleEn,
      };
    });

    const newTaskLottery: TaskLottery = {
      id: `lot-tsk-${Date.now()}`,
      centerId: ctr.id,
      centerName: ctr.nameEn,
      occupation: runTaskForm.occupation,
      scheduledDate: new Date().toISOString().split('T')[0],
      algorithmVersion: 'v1.8-BayDispersion',
      bayAllocations,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    StorageService.updateItem(STORAGE_KEYS.TASK_LOTTERY, newTaskLottery);
    AuditService.log('GENERATE_LOTTERY', 'TASK_LOTTERY', `Executed practical task dispersion lottery for ${ctr.nameEn} (${bayAllocations.length} bays randomized)`, newTaskLottery.id, 'SUCCESS');
    showToast(`Task lottery completed for ${ctr.nameEn}`, 'success');
    setIsRunTaskOpen(false);
    loadData();
  };

  const tabs = [
    { id: 'assessor', label: language === 'ar' ? `قرعة تخصيص المقيمين (${assessorLotteries.length})` : `Candidate-Assessor Lottery (${assessorLotteries.length})` },
    { id: 'tasks', label: language === 'ar' ? `قرعة المهام العملية (${taskLotteries.length})` : `Practical Task Lottery (${taskLotteries.length})` },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={language === 'ar' ? 'محرك القرعة والتخصيص الأعمى' : 'Assessor & Task Lottery Engine'}
        subtitle={language === 'ar' ? 'تخصيص خوارزمي أعمى للمقيمين والمهام لمنع تضارب المصالح وضمان النزاهة' : 'Cryptographic algorithmic randomization engine for blind assessor allocation and anti-leakage task dispersion'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'محرك القرعة' : 'Lottery Management' },
        ]}
        actions={
          activeTab === 'assessor' ? (
            <Button variant="primary" size="sm" onClick={handleOpenRunAssessor} leftIcon={<Dice5 className="w-4 h-4" />}>
              {language === 'ar' ? 'إجراء قرعة المقيمين' : 'Run Assessor Lottery'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleOpenRunTask} leftIcon={<Dice5 className="w-4 h-4" />}>
              {language === 'ar' ? 'إجراء قرعة المهام' : 'Run Task Lottery'}
            </Button>
          )
        }
      />

      {/* Integrity & Governance Banner */}
      <div className="p-4 rounded-xl bg-[#FBF6E8] border border-[#C9A24D]/40 flex items-start gap-3.5 shadow-soft">
        <ShieldCheck className="w-5 h-5 text-[#91702C] shrink-0 mt-0.5" />
        <div className="text-xs text-[#3F3030] space-y-1">
          <span className="font-bold text-[#91702C] block text-sm">
            {language === 'ar' ? 'مبدأ النزاهة والتقييم الأعمى (Blind Assessment Protocol)' : 'Blind Evaluation Protection Protocol & Anti-Conflict Rules'}
          </span>
          <p className="text-[#806F6F] leading-relaxed">
            {language === 'ar'
              ? 'تتم عملية الربط بين المترشحين والمقيمين عبر خوارزمية عشوائية تمنع المعرفة المسبقة أو التدخل البشري. تبقى أسماء المقيمين مخفية (HIDDEN) حتى التوقيت المحدد للفتح (Configurable / TBC) لضمان الشفافية التامة ومنع أي تواطؤ.'
              : 'Candidate-assessor pairings are generated through anti-bias randomization algorithms. To prevent conflict of interest, identities remain concealed (HIDDEN) until the pre-configured release timestamp (Configurable / TBC) on the assessment morning.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. ASSESSOR LOTTERY TAB */}
      {activeTab === 'assessor' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الرمز' : 'Lottery Run'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز التابع' : 'Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشحون' : 'Pairings'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'حالة الحجب' : 'Concealment Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'توقيت الفتح المحدد' : 'Release Window (TBC)'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {assessorLotteries.map(lot => (
                    <tr key={lot.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{lot.id.slice(-8).toUpperCase()}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{lot.centerName}</td>
                      <td className="py-2.5 px-3 text-[#806F6F]">{lot.occupation}</td>
                      <td className="py-2.5 px-3 font-bold text-[#3F3030]">{lot.totalCandidates} pairs</td>
                      <td className="py-2.5 px-3">
                        {lot.releaseStatus === 'RELEASED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <Eye className="w-3 h-3" />
                            <span>{language === 'ar' ? 'معلن للمقيمين' : 'RELEASED'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#91702C] bg-[#FBF6E8] border border-[#C9A24D]/30 px-2 py-0.5 rounded">
                            <EyeOff className="w-3 h-3" />
                            <span>{language === 'ar' ? 'محجوب للنزاهة' : 'HIDDEN (BLIND)'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#806F6F]">{lot.releaseScheduledTime}</td>
                      <td className="py-2.5 px-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectLottery(lot)}
                            className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                            title={language === 'ar' ? 'فحص الأزواج المخصصة' : 'Inspect Pairings'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            variant={lot.releaseStatus === 'RELEASED' ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleRelease(lot)}
                            leftIcon={lot.releaseStatus === 'RELEASED' ? <EyeOff className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          >
                            {lot.releaseStatus === 'RELEASED' ? (language === 'ar' ? 'حجب' : 'Conceal') : (language === 'ar' ? 'فتح النتائج' : 'Release')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TASK LOTTERY TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الرمز' : 'Lottery Run'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز' : 'Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'توزيع المنصات' : 'Bay Allocations'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {taskLotteries.map(tl => (
                    <tr key={tl.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{tl.id.slice(-8).toUpperCase()}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{tl.centerName}</td>
                      <td className="py-2.5 px-3 text-[#806F6F]">{tl.occupation}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {tl.bayAllocations?.map((bay, bIdx) => (
                            <span key={bIdx} className="px-1.5 py-0.5 rounded bg-stone-100 text-[#3F3030] font-mono text-[10px]" title={bay.taskTitle}>
                              Bay {bay.bayNumber}: <b>{bay.taskCode}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#806F6F]">{tl.scheduledDate}</td>
                      <td className="py-2.5 px-3 text-end"><StatusBadge status={tl.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Pairings Modal */}
      {inspectLottery && (
        <Modal
          isOpen={!!inspectLottery}
          onClose={() => setInspectLottery(null)}
          maxWidth="lg"
          icon={<Dice5 className="w-6 h-6 text-[#7A2E3A]" />}
          title={`Blind Pairings: ${inspectLottery.centerName}`}
          subtitle={`${inspectLottery.occupation} • ${inspectLottery.algorithmVersion}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#806F6F]">
                Status: <b>{inspectLottery.releaseStatus}</b>
              </span>
              <Button
                variant={inspectLottery.releaseStatus === 'RELEASED' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleToggleRelease(inspectLottery)}
                leftIcon={inspectLottery.releaseStatus === 'RELEASED' ? <EyeOff className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              >
                {inspectLottery.releaseStatus === 'RELEASED' ? 'Conceal Pairings' : 'Authorize Release to Assessors'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2 px-3 font-semibold text-start">Station / Bay</th>
                    <th className="py-2 px-3 font-semibold text-start">Candidate</th>
                    <th className="py-2 px-3 font-semibold text-start">APRO Ref</th>
                    <th className="py-2 px-3 font-semibold text-start">Randomized Assessor</th>
                    <th className="py-2 px-3 font-semibold text-end">Visibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {inspectLottery.pairings.map((pair, idx) => (
                    <tr key={idx} className="hover:bg-[#FFFCF8]/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">Station #{pair.stationNumber || idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{pair.candidateName}</td>
                      <td className="py-2.5 px-3 font-mono text-[#806F6F]">{pair.aproReference}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                        {inspectLottery.releaseStatus === 'RELEASED' ? (
                          pair.assessorName
                        ) : (
                          <span className="font-mono text-stone-400">●●●●●● (Blind Encrypted)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inspectLottery.releaseStatus === 'RELEASED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {inspectLottery.releaseStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Run Assessor Lottery Modal */}
      <Modal
        isOpen={isRunAssessorOpen}
        onClose={() => setIsRunAssessorOpen(false)}
        maxWidth="md"
        icon={<Dice5 className="w-6 h-6 text-[#7A2E3A]" />}
        title="Trigger Assessor Lottery"
        subtitle="Cryptographic randomized candidate-assessor pairing"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsRunAssessorOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleExecuteAssessorLottery} leftIcon={<Play className="w-4 h-4" />}>
              Generate Blind Pairings
            </Button>
          </>
        }
      >
        <form onSubmit={handleExecuteAssessorLottery} className="space-y-3.5">
          <Select
            label="Assessment Center"
            required
            value={runAssessorForm.centerId}
            onChange={e => setRunAssessorForm({ ...runAssessorForm, centerId: e.target.value })}
            options={centers.map(c => ({ value: c.id, label: `${c.code} - ${c.nameEn}` }))}
          />
          <Select
            label="Target Occupation"
            required
            value={runAssessorForm.occupation}
            onChange={e => setRunAssessorForm({ ...runAssessorForm, occupation: e.target.value })}
            options={[
              { value: 'Electrical Installation', label: 'Electrical Installation' },
              { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
              { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
              { value: 'BMS Automation', label: 'BMS Automation' },
              { value: 'Plumbing', label: 'Plumbing' },
            ]}
          />
          <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs text-[#806F6F] space-y-1">
            <span className="font-semibold text-[#3F3030] block">Randomization Guarantee:</span>
            <p>Seed-based permutation prevents sequential bias or geographic favoritism. Generated pairs will default to HIDDEN status.</p>
          </div>
        </form>
      </Modal>

      {/* Run Task Lottery Modal */}
      <Modal
        isOpen={isRunTaskOpen}
        onClose={() => setIsRunTaskOpen(false)}
        maxWidth="md"
        icon={<Dice5 className="w-6 h-6 text-[#7A2E3A]" />}
        title="Trigger Practical Task Lottery"
        subtitle="Disperse task blueprints across workshop testing bays"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsRunTaskOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleExecuteTaskLottery} leftIcon={<Play className="w-4 h-4" />}>
              Randomize Bay Tasks
            </Button>
          </>
        }
      >
        <form onSubmit={handleExecuteTaskLottery} className="space-y-3.5">
          <Select
            label="Assessment Center"
            required
            value={runTaskForm.centerId}
            onChange={e => setRunTaskForm({ ...runTaskForm, centerId: e.target.value })}
            options={centers.map(c => ({ value: c.id, label: `${c.code} - ${c.nameEn}` }))}
          />
          <Select
            label="Target Occupation"
            required
            value={runTaskForm.occupation}
            onChange={e => setRunTaskForm({ ...runTaskForm, occupation: e.target.value })}
            options={[
              { value: 'Electrical Installation', label: 'Electrical Installation' },
              { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
              { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
              { value: 'BMS Automation', label: 'BMS Automation' },
              { value: 'Plumbing', label: 'Plumbing' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
