import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, PracticalTask, AuditLog } from '../../types';
import {
  Wrench,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileCheck,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Flame,
  Award,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AssessorPracticalWorkspaceProps {
  onNavigate?: (path: string) => void;
}

export const AssessorPracticalWorkspace: React.FC<AssessorPracticalWorkspaceProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [task, setTask] = useState<PracticalTask | null>(null);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Observations checklist
  const [observations, setObservations] = useState<Record<string, boolean>>({
    ppe_compliance: false,
    loto_isolation: false,
    tool_inspection: false,
    intermediate_accuracy: false,
    assembly_finishing: false,
    workstation_cleanup: false,
  });

  // Complete confirmation modal
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [assessorNotes, setAssessorNotes] = useState<string>('');

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const myCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(myCandidates);

    const allTasks = storageService.get<PracticalTask[]>(STORAGE_KEYS.PRACTICAL_TASKS, []);
    setTasks(allTasks);

    const urlParams = new URLSearchParams(window.location.search);
    const candidateIdParam = urlParams.get('candidateId');

    const activeCand = (candidateIdParam && myCandidates.find((c: Candidate) => c.id === candidateIdParam)) || myCandidates[0];
    if (activeCand) {
      setSelectedCandidateId(activeCand.id);
      setCandidate(activeCand);
      const activeTask = allTasks.find((t: PracticalTask) => t.id === activeCand.assignedTaskId) || allTasks[0];
      setTask(activeTask || null);

      if (activeCand.status === 'IN_PROGRESS' || activeCand.status === 'IN_ASSESSMENT') {
        setTimerRunning(true);
        setTimerSeconds(1840); // Pre-seed 30 mins elapsed
      }
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const handleCandidateChange = (newCandId: string) => {
    setSelectedCandidateId(newCandId);
    const found = candidates.find(c => c.id === newCandId);
    if (found) {
      setCandidate(found);
      const tsk = tasks.find(t => t.id === found.assignedTaskId) || tasks[0];
      setTask(tsk || null);
      if (found.status === 'IN_PROGRESS' || found.status === 'IN_ASSESSMENT') {
        setTimerRunning(true);
        setTimerSeconds(1840);
      } else {
        setTimerRunning(false);
        setTimerSeconds(0);
      }
    }
  };

  const toggleTimer = () => {
    setTimerRunning(prev => !prev);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartPractical = () => {
    if (!candidate || !user) return;

    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = allCandidates.map((c: Candidate) => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'IN_PROGRESS' as const,
          practicalStatus: 'IN_PROGRESS' as const
        };
      }
      return c;
    });

    storageService.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidate({ ...candidate, status: 'IN_PROGRESS', practicalStatus: 'IN_PROGRESS' });
    setTimerRunning(true);

    // Audit log
    const auditLogs = storageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'START_PRACTICAL' as any,
      entity: 'Practical Assessment Workspace',
      details: `Assessor started practical assessment timer for candidate ${candidate.fullNameEn} (${candidate.aproReference}).`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.14',
      status: 'SUCCESS'
    };
    storageService.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...auditLogs]);

    showToast(isRTL ? 'تم بدء الاختبار العملي وتشغيل المؤقت' : 'Practical assessment started and timer running', 'success');
  };

  const handleConfirmComplete = () => {
    if (!candidate || !user) return;
    setTimerRunning(false);

    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updated = allCandidates.map((c: Candidate) => {
      if (c.id === candidate.id) {
        return {
          ...c,
          status: 'PRACTICAL_COMPLETED' as const,
          practicalStatus: 'COMPLETED' as const,
          evaluationStatus: 'PENDING' as const
        };
      }
      return c;
    });

    storageService.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidate({
      ...candidate,
      status: 'PRACTICAL_COMPLETED',
      practicalStatus: 'COMPLETED',
      evaluationStatus: 'PENDING'
    });

    // Audit log
    const auditLogs = storageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'COMPLETE_PRACTICAL' as any,
      entity: 'Practical Assessment Workspace',
      details: `Assessor concluded practical assessment for candidate ${candidate.fullNameEn}. Elapsed time: ${formatTime(timerSeconds)}.`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.14',
      status: 'SUCCESS'
    };
    storageService.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...auditLogs]);

    setShowCompleteModal(false);
    showToast(isRTL ? 'تم إنهاء الاختبار العملي بنجاح. يمكنك الآن رصد التقييم.' : 'Practical assessment concluded. Proceed to Evaluation & Rating.', 'success');
  };

  const toggleObservation = (key: string) => {
    setObservations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const standardMinutes = task?.durationMinutes || 120;
  const standardSeconds = standardMinutes * 60;
  const isOvertime = timerSeconds > standardSeconds;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header & Candidate Selector */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8D9D2] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            <Wrench className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'منصة التقييم العملي المباشر' : 'Live Practical Assessment Workspace'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'مساحة العمل ومراقبة أداء المرشح' : 'Practical Assessment & Milestone Controller'}
          </h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
            {isRTL ? 'المرشح:' : 'Candidate:'}
          </label>
          <select
            value={selectedCandidateId}
            onChange={e => handleCandidateChange(e.target.value)}
            className="text-xs font-medium border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A] text-gray-900"
          >
            {candidates.map(c => (
              <option key={c.id} value={c.id}>
                {isRTL ? c.fullNameAr : c.fullNameEn} ({c.passportNumber} - {c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {candidate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Candidate Dossier & Quick Actions */}
          <div className="space-y-6">
            {/* Candidate Identity Card */}
            <div className="bg-white rounded-2xl border border-[#E8D9D2] p-5 shadow-sm">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <img
                  src={candidate.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#7A2E3A] shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {isRTL ? candidate.fullNameAr : candidate.fullNameEn}
                  </h3>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{candidate.passportNumber}</div>
                  <div className="text-xs font-semibold text-indigo-700 mt-1">{candidate.occupation}</div>
                </div>
              </div>

              <div className="space-y-2.5 py-4 text-xs border-b border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">{isRTL ? 'رقم الجواز:' : 'Passport:'}</span>
                  <span className="font-mono font-bold text-gray-800">{candidate.passportNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{isRTL ? 'المنصة / المحطة:' : 'Station Bay:'}</span>
                  <span className="font-bold text-[#7A2E3A]">{candidate.assignedBay || 'Bay-04'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{isRTL ? 'حالة التقييم:' : 'Stage Status:'}</span>
                  <span className="font-bold text-gray-800">{candidate.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{isRTL ? 'درجة النظري (CBT):' : 'CBT Score:'}</span>
                  <span className="font-bold text-emerald-700">{candidate.cbtScore || 85}% (Passed)</span>
                </div>
              </div>

              {/* Fast Jump Actions */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => onNavigate?.(`/assessor/evidence?candidateId=${candidate.id}`)}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors flex items-center justify-between border border-purple-200"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>{isRTL ? 'توثيق ورفع الأدلة' : 'Capture Evidence'}</span>
                  </span>
                  <span className="bg-purple-200 px-2 py-0.5 rounded-full text-[10px]">
                    {candidate.evidenceItems?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${candidate.id}`)}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors flex items-center justify-between border border-rose-200"
                >
                  <span className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-rose-600" />
                    <span>{isRTL ? 'نموذج الرصد والتقييم' : 'Evaluation Rubric'}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* Task Quick Summary */}
            {task && (
              <div className="bg-white rounded-2xl border border-[#E8D9D2] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{isRTL ? 'المهمة المسندة' : 'Assigned Task'}</span>
                  <span className="text-xs font-mono font-bold text-[#7A2E3A] bg-[#F8ECEE] px-2 py-0.5 rounded">
                    {task.code}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug mb-2">
                  {task.titleEn}
                </h4>
                <div className="text-[11px] text-gray-600 space-y-1">
                  <div>• {isRTL ? 'المدة القياسية:' : 'Standard Time:'} <b>{task.durationMinutes} min</b></div>
                  <div>• {isRTL ? 'الدرجة القصوى:' : 'Max Score:'} <b>{task.maxScore} pts</b></div>
                  <div>• {isRTL ? 'درجة النجاح:' : 'Passing Score:'} <b>{task.passingScore} pts</b></div>
                </div>
                <button
                  onClick={() => onNavigate?.(`/assessor/practical-task?candidateId=${candidate.id}&taskId=${task.id}`)}
                  className="mt-3 text-xs text-[#7A2E3A] font-bold hover:underline block"
                >
                  {isRTL ? 'عرض المواصفة الكاملة' : 'View Full Task Spec →'}
                </button>
              </div>
            )}
          </div>

          {/* Right 2 Columns: Live Stopwatch Timer & Milestone Checklist */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Stopwatch Timer Card */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${timerRunning ? 'text-amber-400 animate-spin' : 'text-gray-400'}`} style={{ animationDuration: '4s' }} />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    {isRTL ? 'مؤقت الاختبار العملي المباشر' : 'Live Practical Assessment Timer'}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-400">
                  {isRTL ? 'المدة القياسية: ' : 'Standard: '} {standardMinutes}m 00s
                </div>
              </div>

              {/* Huge Timer Digits */}
              <div className="text-center py-4">
                <div className={`text-6xl md:text-7xl font-mono font-black tracking-tight ${isOvertime ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {formatTime(timerSeconds)}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-widest mt-2">
                  {isOvertime ? (
                    <span className="text-rose-400 font-bold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {isRTL ? 'تجاوز الوقت القياسي المحدد للمهمة' : 'STANDARD TIME EXCEEDED (OVERTIME)'}
                    </span>
                  ) : (
                    <span>{isRTL ? 'الوقت المنقضي' : 'ELAPSED EXECUTION TIME'}</span>
                  )}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-700/80">
                <button
                  type="button"
                  onClick={toggleTimer}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                    timerRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-gray-950'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>{isRTL ? 'إيقاف مؤقت' : 'Pause Timer'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isRTL ? 'تشغيل المؤقت' : 'Resume / Start'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetTimer}
                  className="px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إعادة ضبط' : 'Reset'}</span>
                </button>
              </div>
            </div>

            {/* Assessment Milestone & Observation Checklist */}
            <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#3F3030] text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#7A2E3A]" />
                  <span>{isRTL ? 'قائمة نقاط التحقق والمراقبة الميدانية' : 'Assessor Practical Milestones & Observation Checklist'}</span>
                </h3>
                <span className="text-xs text-gray-500">
                  {Object.values(observations).filter(Boolean).length}/6 {isRTL ? 'مكتمل' : 'Checked'}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'ppe_compliance', titleEn: 'PPE Compliance & Workshop Attire', titleAr: 'ارتداء معدات الوقاية الشخصية بالكامل والالتزام بأنظمة الورشة' },
                  { key: 'loto_isolation', titleEn: 'LOTO Electrical / Power Isolation Verified', titleAr: 'تأكيد العزل الكهربائي وقفل مصادر الطاقة قبل بدء العمل' },
                  { key: 'tool_inspection', titleEn: 'Pre-use Tool & Instrument Integrity Check', titleAr: 'فحص سلامة الأدوات والأجهزة والتأكد من العزل السليم' },
                  { key: 'intermediate_accuracy', titleEn: 'Intermediate Alignment & Dimension Accuracy', titleAr: 'متابعة دقة المحاذاة والقياسات أثناء خطوات التجميع' },
                  { key: 'assembly_finishing', titleEn: 'Workpiece Finishing & Clean Termination', titleAr: 'جودة الإنهاء والتشطيب ونظافة النهايات والتوصيلات' },
                  { key: 'workstation_cleanup', titleEn: 'Workstation Cleanup & Scrap Disposal', titleAr: 'تنظيف موقع العمل وإزالة المخلفات وإعادتها للحاويات' },
                ].map(item => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      observations[item.key]
                        ? 'bg-[#F8ECEE]/50 border-[#7A2E3A]/40 text-[#7A2E3A]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={observations[item.key]}
                      onChange={() => toggleObservation(item.key)}
                      className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
                    />
                    <div className="text-xs font-semibold flex-1">
                      {isRTL ? item.titleAr : item.titleEn}
                    </div>
                    {observations[item.key] && (
                      <CheckCircle2 className="w-4 h-4 text-[#7A2E3A] flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>

              {/* Assessment Progression Trigger Controls */}
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500">
                    {isRTL ? 'إدارة حالة الاختبار الميداني' : 'Assessment Stage Controller'}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {candidate.status === 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={handleStartPractical}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-[#C9A24D] fill-current" />
                      <span>{isRTL ? 'بدء التقييم العملي رسمياً' : 'Start Practical Assessment'}</span>
                    </button>
                  )}

                  {(candidate.status === 'IN_PROGRESS' || candidate.status === 'IN_ASSESSMENT') && (
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRTL ? 'إتمام الاختبار العملي' : 'Complete Practical Assessment'}</span>
                    </button>
                  )}

                  {(candidate.status === 'PRACTICAL_COMPLETED' || candidate.status === 'EVALUATION_PENDING') && (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${candidate.id}`)}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>{isRTL ? 'الانتقال لرصد الدرجات' : 'Proceed to Evaluation Rubric'}</span>
                      {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Practical Confirmation Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title={isRTL ? 'تأكيد إتمام الاختبار العملي' : 'Confirm Practical Assessment Completion'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
            <p className="font-bold mb-1">
              {isRTL ? 'إيقاف وقت الاختبار والانتقال لمرحلة الرصد' : 'Conclude Practical Work & Stop Elapsed Timer'}
            </p>
            {isRTL
              ? `سيتم تسجيل وقت الانتهاء (${formatTime(timerSeconds)}) ونقل المرشح إلى حالة "بانتظار التقييم" لرصد الدرجات وفق المعايير الخمسة المعتمدة.`
              : `Total elapsed time (${formatTime(timerSeconds)}) will be recorded. Candidate status will move to 'PRACTICAL_COMPLETED', unlocking rubric evaluation.`}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRTL ? 'ملاحظات المقيم الميدانية (اختياري):' : 'Assessor Practical Notes (Optional):'}
            </label>
            <textarea
              rows={3}
              value={assessorNotes}
              onChange={e => setAssessorNotes(e.target.value)}
              placeholder={isRTL ? 'سجل أي ملاحظات خاصة بجودة العمل أو مخالفات السلامة...' : 'Record any safety observations, craftsmanship remarks, or tool handling notes...'}
              className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirmComplete}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              {isRTL ? 'تأكيد الإتمام' : 'Confirm & Finish'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
