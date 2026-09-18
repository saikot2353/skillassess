import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, PracticalTask, TaskDifficulty } from '../../types';
import {
  Wrench,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  FileText,
  Layers,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface AssessorPracticalTaskProps {
  onNavigate?: (path: string) => void;
}

export const AssessorPracticalTask: React.FC<AssessorPracticalTaskProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<PracticalTask | null>(null);

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const myCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(myCandidates);

    const allTasks = storageService.get<PracticalTask[]>(STORAGE_KEYS.PRACTICAL_TASKS, []);
    setTasks(allTasks);

    // Read URL params if present
    const urlParams = new URLSearchParams(window.location.search);
    const candidateIdParam = urlParams.get('candidateId');
    const taskIdParam = urlParams.get('taskId');

    if (candidateIdParam) {
      setSelectedCandidateId(candidateIdParam);
      const cand = myCandidates.find((c: Candidate) => c.id === candidateIdParam);
      if (cand && cand.assignedTaskId) {
        const task = allTasks.find((t: PracticalTask) => t.id === cand.assignedTaskId);
        if (task) setSelectedTask(task);
      }
    } else if (myCandidates.length > 0) {
      setSelectedCandidateId(myCandidates[0].id);
      const firstTask = allTasks.find((t: PracticalTask) => t.id === myCandidates[0].assignedTaskId) || allTasks[0];
      if (firstTask) setSelectedTask(firstTask);
    } else if (taskIdParam) {
      const task = allTasks.find((t: PracticalTask) => t.id === taskIdParam);
      if (task) setSelectedTask(task);
    } else if (allTasks.length > 0) {
      setSelectedTask(allTasks[0]);
    }
  }, [user]);

  const handleCandidateChange = (candId: string) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c: Candidate) => c.id === candId);
    if (cand && cand.assignedTaskId) {
      const task = tasks.find((t: PracticalTask) => t.id === cand.assignedTaskId);
      if (task) setSelectedTask(task);
    }
  };

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  const getDifficultyBadge = (diff?: TaskDifficulty | string) => {
    switch (diff) {
      case 'ADVANCED':
      case 'Hard':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">{isRTL ? 'متقدم' : 'Advanced'}</span>;
      case 'INTERMEDIATE':
      case 'Moderate':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">{isRTL ? 'متوسط' : 'Intermediate'}</span>;
      case 'FOUNDATIONAL':
      case 'Easy':
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{isRTL ? 'أساسي' : 'Foundational'}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Wrench className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'مواصفات المهمة العملية' : 'Practical Task Specifications'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'استعراض ورقة ومعايير المهمة العملية' : 'Practical Assessment Task & Blueprint Specification'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'عرض تفصيلي غير قابل للتعديل لمتطلبات المهمة المسندة للمرشح عبر نظام القرعة الآلية.'
              : 'Read-only technical dossier of the candidate’s assigned practical task, safety constraints, and step checklist.'}
          </p>
        </div>

        {selectedCandidate && (
          <button
            onClick={() => onNavigate?.(`/assessor/practical-workspace?candidateId=${selectedCandidate.id}`)}
            className="px-5 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-md"
          >
            <PlayCircle className="w-4 h-4 text-[#C9A24D]" />
            <span>{isRTL ? 'فتح منصة التقييم والمؤقت' : 'Open Practical Workspace'}</span>
            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Candidate Selector Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
            {isRTL ? 'اختر المرشح:' : 'Select Candidate:'}
          </label>
          <div className="relative flex-1 sm:w-80">
            <select
              value={selectedCandidateId}
              onChange={e => handleCandidateChange(e.target.value)}
              className="w-full text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] bg-white text-gray-900"
            >
              {candidates.map(cand => (
                <option key={cand.id} value={cand.id}>
                  {isRTL ? cand.fullNameAr : cand.fullNameEn} ({cand.aproReference} - {cand.occupation})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCandidate && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{isRTL ? 'حالة المرشح:' : 'Status:'}</span>
            <span className="font-bold text-[#7A2E3A] bg-[#F8ECEE] px-2.5 py-1 rounded-full border border-[#E8D9D2]">
              {selectedCandidate.status}
            </span>
          </div>
        )}
      </div>

      {/* Practical Task Card */}
      {selectedTask ? (
        <div className="space-y-6">
          {/* Main Task Header Card */}
          <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                    {selectedTask.code}
                  </span>
                  {getDifficultyBadge(selectedTask.difficulty)}
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded">
                    {selectedTask.occupation}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">
                  {selectedTask.titleEn}
                </h2>
                <div className="text-base text-gray-600 font-arabic mt-1">
                  {selectedTask.titleAr}
                </div>
              </div>

              {/* Stats Box */}
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="text-center px-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    {isRTL ? 'المدة الزمنية' : 'Duration'}
                  </span>
                  <div className="text-base font-black text-gray-800 flex items-center justify-center gap-1 mt-0.5">
                    <Clock className="w-4 h-4 text-[#7A2E3A]" />
                    <span>{selectedTask.durationMinutes} min</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center px-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    {isRTL ? 'الدرجة القصوى' : 'Max Score'}
                  </span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {selectedTask.maxScore} pts
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center px-2">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    {isRTL ? 'درجة النجاح' : 'Passing'}
                  </span>
                  <div className="text-base font-black text-[#7A2E3A] mt-0.5">
                    {selectedTask.passingScore} pts
                  </div>
                </div>
              </div>
            </div>

            {/* Situation / Problem Statement */}
            <div className="py-6 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7A2E3A]" />
                <span>{isRTL ? 'سيناريو ومسألة المهمة العملية' : 'Practical Scenario / Situation'}</span>
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-[#F8ECEE]/30 p-4 rounded-xl border border-[#E8D9D2]/60">
                {selectedTask.situation || selectedTask.practicalWork}
              </p>
            </div>

            {/* Required Tools & Equipment */}
            <div className="py-6 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#7A2E3A]" />
                <span>{isRTL ? 'الأدوات والمعدات والمواد المطلوبة' : 'Required Tools, Instruments & Materials'}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {(selectedTask.toolsAndEquipment || [
                  'Multimeter with calibrated high-voltage probes',
                  'Insulated screwdriver set (1000V VDE rated)',
                  'Cable stripper and wire cutter',
                  'Torque wrench for terminal busbars',
                  'Residual current device (RCD) tester',
                  'Personal protective equipment (PPE Kit)'
                ]).map((tool, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{tool}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Procedure */}
            <div className="py-6 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7A2E3A]" />
                <span>{isRTL ? 'خطوات التنفيذ المنهجية' : 'Standard Execution Workflow Steps'}</span>
              </h3>
              <div className="space-y-2.5">
                {(selectedTask.steps || [
                  'Inspect workstation and verify lock-out / tag-out isolation before touching conductors.',
                  'Mount circuit breakers and RCD onto DIN rail in accordance with standard schematic.',
                  'Dress, strip, and terminate incoming and outgoing wiring with proper torque limits.',
                  'Perform insulation resistance test between phase-phase and phase-neutral.',
                  'Energize circuit under assessor supervision and verify trip curve with RCD test ramp.'
                ]).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="w-6 h-6 rounded-full bg-[#7A2E3A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed font-medium">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety & Compliance Notice */}
            <div className="pt-6">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900">
                  <div className="font-bold mb-1">
                    {isRTL ? 'إرشادات السلامة الإلزامية للمقيم:' : 'Mandatory Safety & Quality Guidelines:'}
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {isRTL
                      ? 'يجب على المقيم إيقاف الاختبار فوراً في حال ارتكاب المرشح لأي مخالفة سلامة جسيمة (مثل لمس موصل حي أو عدم ارتداء القفازات العازلة) ورصد ذلك كفشل فوري في معيار السلامة.'
                      : 'The assessor must immediately halt practical work if the candidate breaches zero-tolerance safety rules (e.g. failing to verify de-energization or removing eye protection), logging an immediate safety failure.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E8D9D2] text-gray-500">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold">{isRTL ? 'لم يتم العثور على مهمة مخصصة.' : 'No practical task assigned or found.'}</p>
        </div>
      )}
    </div>
  );
};
