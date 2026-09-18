import React, { useState, useEffect } from 'react';
import { 
  FileCode, Layers, FileText, CheckCircle2, Clock, Wrench, Shield,
  Plus, Search, Filter, Eye, Download, Upload, Trash2, Edit2, Save,
  CheckCircle, ArrowRight, UserCheck, AlertTriangle, FileSpreadsheet,
  Check, XCircle, Power, FileUp
} from 'lucide-react';
import { PracticalTask, Worksheet, TaskAllocation, TaskDifficulty, Candidate } from '../types';
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
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';

export interface PracticalTasksProps {
  onNavigate?: (path: string) => void;
}

export const PracticalTasksPage: React.FC<PracticalTasksProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('pool');
  const [tasks, setTasks] = useState<PracticalTask[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [allocations, setAllocations] = useState<TaskAllocation[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Task Pool State
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [occupationFilter, setOccupationFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Viewing Task Detail
  const [viewingTask, setViewingTask] = useState<PracticalTask | null>(null);

  // Add / Edit Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PracticalTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    code: '',
    titleEn: '',
    titleAr: '',
    occupation: 'Electrical Installation',
    difficulty: 'INTERMEDIATE' as TaskDifficulty,
    situation: '',
    toolsAndEquipment: 'Digital Multimeter, Wire Strippers, Insulated Screwdrivers',
    steps: 'Verify zero potential across terminals\nInspect circuit insulation resistance\nPerform visual continuity check',
    maxScore: 100,
    passingScore: 60,
    durationMinutes: 45,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
  });

  // Upload Worksheet Modal
  const [isUploadWorksheetOpen, setIsUploadWorksheetOpen] = useState(false);
  const [worksheetForm, setWorksheetForm] = useState({
    code: '',
    title: '',
    occupation: 'Electrical Installation',
    taskId: '',
    fileName: 'Task_Worksheet_v1.pdf',
    version: 'v1.0',
  });

  // Task Allocation Modal
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    candidateId: '',
    taskId: '',
  });

  // Excel Bulk Import Modal
  interface ParsedTaskRow {
    code: string;
    titleEn: string;
    titleAr: string;
    occupation: string;
    difficulty: TaskDifficulty;
    maxScore: number;
    passingScore: number;
    durationMinutes: number;
    situation: string;
    toolsAndEquipment: string[];
    steps: string[];
    isValid: boolean;
    error?: string;
  }

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedTaskRow[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  const loadData = () => {
    setTasks(StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []));
    setWorksheets(StorageService.get<Worksheet[]>(STORAGE_KEYS.WORKSHEETS, []));
    setAllocations(StorageService.get<TaskAllocation[]>(STORAGE_KEYS.TASK_ALLOCATIONS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  };

  useEffect(() => {
    loadData();

    // Check URL query parameters for tab
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['pool', 'worksheets', 'allocation'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // --- Task Handlers ---
  const handleOpenAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      code: `TSK-${Date.now().toString().slice(-4)}`,
      titleEn: '',
      titleAr: '',
      occupation: 'Electrical Installation',
      difficulty: 'INTERMEDIATE',
      situation: 'Candidate must diagnose and restore operational continuity in a simulation technical panel under safety rules.',
      toolsAndEquipment: 'Digital Multimeter, Safety Gloves, Wire Stripper, Precision Screwdriver set',
      steps: 'Wear required PPE equipment\nPerform electrical lockout / tagout\nMeasure continuity across relays\nRecord findings in worksheet',
      maxScore: 100,
      passingScore: 60,
      durationMinutes: 45,
      status: 'ACTIVE',
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (tsk: PracticalTask) => {
    setEditingTask(tsk);
    setTaskForm({
      code: tsk.code,
      titleEn: tsk.titleEn,
      titleAr: tsk.titleAr,
      occupation: tsk.occupation,
      difficulty: tsk.difficulty,
      situation: tsk.situation,
      toolsAndEquipment: tsk.toolsAndEquipment.join(', '),
      steps: tsk.steps.join('\n'),
      maxScore: tsk.maxScore,
      passingScore: tsk.passingScore,
      durationMinutes: tsk.durationMinutes,
      status: tsk.status,
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.titleEn.trim()) {
      showToast('Task title is required', 'error');
      return;
    }

    const toolsArr = taskForm.toolsAndEquipment.split(',').map(s => s.trim()).filter(Boolean);
    const stepsArr = taskForm.steps.split('\n').map(s => s.trim()).filter(Boolean);

    if (editingTask) {
      const updated: PracticalTask = {
        ...editingTask,
        code: taskForm.code.trim().toUpperCase(),
        titleEn: taskForm.titleEn.trim(),
        titleAr: taskForm.titleAr.trim() || taskForm.titleEn.trim(),
        occupation: taskForm.occupation,
        difficulty: taskForm.difficulty,
        situation: taskForm.situation,
        toolsAndEquipment: toolsArr,
        steps: stepsArr,
        maxScore: Number(taskForm.maxScore) || 100,
        passingScore: Number(taskForm.passingScore) || 60,
        durationMinutes: Number(taskForm.durationMinutes) || 45,
        status: taskForm.status,
        updatedAt: new Date().toISOString(),
      };
      StorageService.updateItem(STORAGE_KEYS.TASKS, updated);
      AuditService.log('UPDATE', 'TASK', `Updated practical task ${updated.code}: ${updated.titleEn}`, updated.id, 'SUCCESS');
      showToast('Practical task updated successfully', 'success');
      if (viewingTask?.id === updated.id) setViewingTask(updated);
    } else {
      const newTask: PracticalTask = {
        id: `tsk-${Date.now()}`,
        code: taskForm.code.trim().toUpperCase(),
        titleEn: taskForm.titleEn.trim(),
        titleAr: taskForm.titleAr.trim() || taskForm.titleEn.trim(),
        occupation: taskForm.occupation,
        difficulty: taskForm.difficulty,
        practicalWork: taskForm.situation,
        situation: taskForm.situation,
        toolsAndEquipment: toolsArr,
        steps: stepsArr,
        maxScore: Number(taskForm.maxScore) || 100,
        passingScore: Number(taskForm.passingScore) || 60,
        durationMinutes: Number(taskForm.durationMinutes) || 45,
        status: taskForm.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      StorageService.updateItem(STORAGE_KEYS.TASKS, newTask);
      AuditService.log('CREATE', 'TASK', `Created practical assessment task ${newTask.code}: ${newTask.titleEn}`, newTask.id, 'SUCCESS');
      showToast('New practical task registered', 'success');
    }

    setIsTaskModalOpen(false);
    loadData();
  };

  // --- Worksheet Handlers ---
  const handleOpenUploadWorksheet = () => {
    setWorksheetForm({
      code: `WS-${Date.now().toString().slice(-4)}`,
      title: 'Technical Evaluation Worksheet & Rubric Form',
      occupation: 'Electrical Installation',
      taskId: tasks[0]?.id || '',
      fileName: 'Evaluation_Blueprint_v1.pdf',
      version: 'v1.0',
    });
    setIsUploadWorksheetOpen(true);
  };

  const handleSaveWorksheet = (e: React.FormEvent) => {
    e.preventDefault();
    const newWs: Worksheet = {
      id: `ws-${Date.now()}`,
      code: worksheetForm.code,
      title: worksheetForm.title,
      occupation: worksheetForm.occupation,
      taskId: worksheetForm.taskId,
      fileName: worksheetForm.fileName,
      fileSize: '1.4 MB',
      uploadedBy: 'Super Admin Oversight',
      uploadedAt: new Date().toISOString().split('T')[0],
      version: worksheetForm.version,
      status: 'ACTIVE',
    };
    StorageService.updateItem(STORAGE_KEYS.WORKSHEETS, newWs);
    AuditService.log('CREATE', 'WORKSHEET', `Uploaded new practical task worksheet ${newWs.code}: ${newWs.title}`, newWs.id, 'SUCCESS');
    showToast('Worksheet uploaded and linked to task blueprint', 'success');
    setIsUploadWorksheetOpen(false);
    loadData();
  };

  const handleDownloadWorksheet = (ws: Worksheet) => {
    AuditService.log('EXPORT', 'WORKSHEET', `Downloaded worksheet blueprint ${ws.code} (${ws.fileName})`, ws.id, 'SUCCESS');
    showToast(`Downloading ${ws.fileName}...`, 'info');
  };

  // --- Task Allocation Handlers ---
  const handleOpenAllocateModal = () => {
    const unallocated = candidates.find(c => !allocations.some(a => a.candidateId === c.id));
    setAllocationForm({
      candidateId: unallocated?.id || candidates[0]?.id || '',
      taskId: tasks[0]?.id || '',
    });
    setIsAllocateModalOpen(true);
  };

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find(c => c.id === allocationForm.candidateId);
    const tsk = tasks.find(t => t.id === allocationForm.taskId);
    if (!cand || !tsk) return;

    const newAlloc: TaskAllocation = {
      id: `alloc-${Date.now()}`,
      candidateId: cand.id,
      candidateName: cand.fullNameEn,
      aproReference: cand.aproReference,
      occupation: tsk.occupation,
      taskId: tsk.id,
      taskCode: tsk.code,
      taskTitle: tsk.titleEn,
      difficulty: tsk.difficulty,
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'ASSIGNED',
    };

    StorageService.updateItem(STORAGE_KEYS.TASK_ALLOCATIONS, newAlloc);
    AuditService.log('ALLOCATE_TASK', 'TASK_ALLOCATION', `Allocated practical task ${tsk.code} (${tsk.titleEn}) to candidate ${cand.fullNameEn} (${cand.aproReference})`, newAlloc.id, 'SUCCESS');
    showToast('Task allocated to candidate successfully', 'success');
    setIsAllocateModalOpen(false);
    loadData();
  };

  // --- Task Status Activation Toggle ---
  const handleToggleTaskStatus = (tsk: PracticalTask) => {
    const nextStatus = tsk.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    const updated: PracticalTask = { ...tsk, status: nextStatus, updatedAt: new Date().toISOString() };
    StorageService.updateItem(STORAGE_KEYS.TASKS, updated);
    AuditService.log('UPDATE', 'TASK', `Status changed for task ${tsk.code} (${tsk.titleEn}) to ${nextStatus}`, tsk.id, 'SUCCESS');
    showToast(`Task ${tsk.code} status changed to ${nextStatus}`, 'info');
    if (viewingTask?.id === tsk.id) setViewingTask(updated);
    loadData();
  };

  // --- Excel Task Pool Import Handlers ---
  const parseTaskCsvContent = (csvText: string) => {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      showToast('Uploaded file contains no data rows', 'error');
      return;
    }

    const existingCodes = new Set(tasks.map(t => t.code.toUpperCase()));
    const results: ParsedTaskRow[] = [];

    // Parse data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      const code = (parts[0] || '').trim().toUpperCase() || `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
      const titleEn = (parts[1] || '').trim();
      const titleAr = (parts[2] || '').trim() || titleEn;
      const occupation = (parts[3] || 'Electrical Installation').trim();
      const diffRaw = (parts[4] || 'INTERMEDIATE').trim().toUpperCase();
      const difficulty: TaskDifficulty = (['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'].includes(diffRaw) ? diffRaw : 'INTERMEDIATE') as TaskDifficulty;
      const maxScore = Number((parts[5] || '100').trim()) || 100;
      const passingScore = Number((parts[6] || '60').trim()) || 60;
      const durationMinutes = Number((parts[7] || '45').trim()) || 45;
      const tools = (parts[8] || 'Digital Multimeter; Safety Gear').split(';').map(s => s.trim()).filter(Boolean);
      const steps = (parts[9] || 'Verify zero potential; Execute inspection; Record parameters').split(';').map(s => s.trim()).filter(Boolean);

      let error = '';
      if (!titleEn) {
        error = 'Missing task title';
      } else if (existingCodes.has(code)) {
        error = `Code ${code} already exists in task pool`;
      } else if (passingScore > maxScore) {
        error = `Passing score (${passingScore}) exceeds max score (${maxScore})`;
      } else if (durationMinutes <= 0) {
        error = 'Invalid duration';
      }

      results.push({
        code,
        titleEn,
        titleAr,
        occupation,
        difficulty,
        maxScore,
        passingScore,
        durationMinutes,
        situation: `Practical scenario for ${titleEn}. Candidate demonstrates competent execution under standard safety regulations.`,
        toolsAndEquipment: tools,
        steps,
        isValid: !error,
        error: error || undefined,
      });
    }

    setParsedRows(results);
  };

  const handleLoadSampleExcel = () => {
    setExcelFileName('Practical_Task_Pool_Standard_Template.xlsx');
    const sample = `code,titleEn,titleAr,occupation,difficulty,maxScore,passingScore,durationMinutes,tools,steps
TSK-7101,Three-Phase Induction Motor Terminal Reversal,عكس أطراف محرك حثي ثلاثي الأطوار,Electrical Installation,ADVANCED,100,70,50,Digital Multimeter; Insulation Tester; Phase Rotation Meter,De-energize main breaker; Swap line phase connections L1 and L3; Measure insulation resistance; Verify rotation safely
TSK-7102,Dual-Stage Air Filter & Damper Servicing,صيانة فلتر الهواء ومخمد التدفق ثنائي المرحلة,HVAC Maintenance,INTERMEDIATE,100,60,40,Differential Pressure Manometer; Fin Comb; Clamp Meter,Isolate fan motor power; Measure pressure drop across dirty filter; Replace primary media; Clean and lubricate linkages
TSK-7103,Fillet Weld Inspection with Bridge Cam Gauge,فحص اللحام الزاوي بمقياس الكامة الجسرية,Welding & Fabrication,FOUNDATIONAL,100,60,30,Bridge Cam Gauge; Wire Brush; LED Torch,Clean weld slag thoroughly; Measure throat thickness; Measure leg length; Check for undercut defects
TSK-7104,BACnet Temperature Transmitter Re-addressing,إعادة عنونة مرسل درجة الحرارة عبر بروتوكول باكنت,BMS Automation,ADVANCED,100,75,45,Field Calibrator; MS/TP Adapter; Precision Screwdriver,Set DIP switches to assigned MAC address; Connect to MSTP field bus; Verify sensor online; Calibrate 0-10V signal`;
    parseTaskCsvContent(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setIsParsingExcel(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseTaskCsvContent(text || '');
      setIsParsingExcel(false);
    };
    reader.onerror = () => {
      setIsParsingExcel(false);
      showToast('Failed to read selected file', 'error');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('No valid task rows to import', 'error');
      return;
    }

    const now = new Date().toISOString();
    const newTasks: PracticalTask[] = validRows.map((r, idx) => ({
      id: `tsk-imp-${Date.now()}-${idx}`,
      code: r.code,
      titleEn: r.titleEn,
      titleAr: r.titleAr || r.titleEn,
      occupation: r.occupation,
      difficulty: r.difficulty,
      situation: r.situation,
      practicalWork: r.situation,
      toolsAndEquipment: r.toolsAndEquipment,
      steps: r.steps,
      maxScore: r.maxScore,
      passingScore: r.passingScore,
      durationMinutes: r.durationMinutes,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }));

    const existing = StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []);
    const merged = [...newTasks, ...existing];
    StorageService.set(STORAGE_KEYS.TASKS, merged);

    AuditService.log(
      'CREATE',
      'TASK',
      `Bulk imported ${newTasks.length} practical tasks from Excel spreadsheet (${excelFileName})`,
      newTasks[0]?.id || 'TASKS',
      'SUCCESS'
    );

    showToast(`Successfully imported ${newTasks.length} tasks into task pool!`, 'success');
    setIsExcelModalOpen(false);
    setParsedRows([]);
    setExcelFileName('');
    loadData();
  };

  const getDifficultyBadge = (diff: TaskDifficulty) => {
    switch (diff) {
      case 'ADVANCED':
        return <Badge variant="danger" size="sm">Advanced</Badge>;
      case 'INTERMEDIATE':
        return <Badge variant="gold" size="sm">Intermediate</Badge>;
      case 'FOUNDATIONAL':
      default:
        return <Badge variant="success" size="sm">Foundational</Badge>;
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.titleAr.includes(searchTerm) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = difficultyFilter === 'ALL' || t.difficulty === difficultyFilter;
    const matchesOcc = occupationFilter === 'ALL' || t.occupation === occupationFilter;
    return matchesSearch && matchesDiff && matchesOcc;
  });

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const taskColumns: Column<PracticalTask>[] = [
    {
      key: 'code',
      header: language === 'ar' ? 'رمز المهمة' : 'Task Code',
      render: tsk => (
        <span className="font-mono font-bold text-xs text-[#7A2E3A]">{tsk.code}</span>
      ),
    },
    {
      key: 'title',
      header: language === 'ar' ? 'عنوان المهمة العملية' : 'Practical Task Title',
      render: tsk => (
        <div>
          <button
            onClick={() => setViewingTask(tsk)}
            className="font-semibold text-xs text-[#3F3030] hover:text-[#7A2E3A] block text-start transition-colors"
          >
            {language === 'ar' ? tsk.titleAr : tsk.titleEn}
          </button>
          <span className="text-[11px] text-[#806F6F]">{tsk.occupation}</span>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: language === 'ar' ? 'مستوى الصعوبة' : 'Difficulty',
      render: tsk => getDifficultyBadge(tsk.difficulty),
    },
    {
      key: 'duration',
      header: language === 'ar' ? 'المدة' : 'Duration',
      render: tsk => (
        <span className="text-xs text-[#3F3030] font-medium flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#806F6F]" />
          <span>{tsk.durationMinutes} min</span>
        </span>
      ),
    },
    {
      key: 'passScore',
      header: language === 'ar' ? 'درجة الاجتياز' : 'Pass / Max',
      render: tsk => (
        <span className="text-xs font-mono font-semibold text-[#3F3030]">
          {tsk.passingScore} / {tsk.maxScore}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.common.status,
      render: tsk => (
        <button
          type="button"
          onClick={() => handleToggleTaskStatus(tsk)}
          title={tsk.status === 'ACTIVE' ? 'Click to set Draft' : 'Click to activate'}
          className="cursor-pointer group"
        >
          <StatusBadge status={tsk.status} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: tsk => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewingTask(tsk)}
            className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
            title={language === 'ar' ? 'عرض المعايير والخطوات' : 'View Rubric & Steps'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleTaskStatus(tsk)}
            className={`p-1.5 rounded transition-colors ${tsk.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
            title={tsk.status === 'ACTIVE' ? 'Deactivate (Set Draft)' : 'Activate Task'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEditTask(tsk)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={t.common.edit}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const tabs = [
    { id: 'pool', label: language === 'ar' ? `بنك المهام العملية (${tasks.length})` : `Task Pool (${tasks.length})` },
    { id: 'worksheets', label: language === 'ar' ? `أوراق التقييم (${worksheets.length})` : `Worksheets (${worksheets.length})` },
    { id: 'allocation', label: language === 'ar' ? `تخصيص المهام للمترشحين (${allocations.length})` : `Task Allocation (${allocations.length})` },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={language === 'ar' ? 'إدارة المهام العملية والمعايير' : 'Practical Task Management'}
        subtitle={language === 'ar' ? 'بنك المهام التقنية المعيارية، نماذج التقييم، وأوراق العمل المعتمدة' : 'Standardized practical tasks bank, technical scoring rubrics, blueprints, and candidate allocations'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المهام العملية' : 'Practical Tasks' },
        ]}
        actions={
          activeTab === 'pool' ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsExcelModalOpen(true)} leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-700" />}>
                {language === 'ar' ? 'استيراد مهام إكسل' : 'Import Tasks (Excel)'}
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenAddTask} leftIcon={<Plus className="w-4 h-4" />}>
                {language === 'ar' ? 'إضافة مهمة عملية' : 'Create Task'}
              </Button>
            </div>
          ) : activeTab === 'worksheets' ? (
            <Button variant="primary" size="sm" onClick={handleOpenUploadWorksheet} leftIcon={<Upload className="w-4 h-4" />}>
              {language === 'ar' ? 'رفع ورقة تقييم' : 'Upload Worksheet'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleOpenAllocateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {language === 'ar' ? 'تخصيص مهمة لمترشح' : 'Allocate Task'}
            </Button>
          )
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. TASK POOL TAB */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          {/* 4 Metric counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
              <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'إجمالي المهام المعتمدة' : 'Total Practical Tasks'}</span>
              <span className="text-xl font-bold text-[#3F3030] block mt-0.5">{tasks.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
              <span className="text-[11px] text-[#806F6F] block">Foundational Level</span>
              <span className="text-xl font-bold text-emerald-700 block mt-0.5">
                {tasks.filter(t => t.difficulty === 'FOUNDATIONAL').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
              <span className="text-[11px] text-[#806F6F] block">Intermediate Level</span>
              <span className="text-xl font-bold text-[#91702C] block mt-0.5">
                {tasks.filter(t => t.difficulty === 'INTERMEDIATE').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
              <span className="text-[11px] text-[#806F6F] block">Advanced Level</span>
              <span className="text-xl font-bold text-[#7A2E3A] block mt-0.5">
                {tasks.filter(t => t.difficulty === 'ADVANCED').length}
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-[#E8D9D2] rounded-xl shadow-soft">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder={language === 'ar' ? 'بحث بالرمز أو عنوان المهمة...' : 'Search task title, code...'}
                className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-stone-400" />
              <select
                value={difficultyFilter}
                onChange={e => { setDifficultyFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
              >
                <option value="ALL">All Difficulties</option>
                <option value="FOUNDATIONAL">Foundational</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>

              <select
                value={occupationFilter}
                onChange={e => { setOccupationFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
              >
                <option value="ALL">All Occupations</option>
                <option value="Electrical Installation">Electrical Installation</option>
                <option value="HVAC Maintenance">HVAC Maintenance</option>
                <option value="Welding & Fabrication">Welding & Fabrication</option>
                <option value="BMS Automation">BMS Automation</option>
                <option value="Plumbing">Plumbing</option>
              </select>
            </div>
          </div>

          <Table
            columns={taskColumns}
            data={paginatedTasks}
            keyExtractor={t => t.id}
          />

          <Pagination
            currentPage={currentPage}
            totalItems={filteredTasks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* 2. WORKSHEETS TAB */}
      {activeTab === 'worksheets' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'أوراق العمل ونماذج التصحيح الورقية والمطبوعة' : 'Practical Assessment Worksheets & Scoring Forms'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'وثائق المعايير ونماذج التقييم المعايرة للورش والمختبرات' : 'Standardized blueprints, calibration sheets, and printable scoring protocols'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الرمز' : 'Code'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'عنوان الورقة' : 'Title'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الإصدار' : 'Version'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحجم' : 'Size'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'تاريخ الرفع' : 'Uploaded'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'تحميل' : 'Download'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {worksheets.map(ws => (
                    <tr key={ws.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{ws.code}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#3F3030] block">{ws.title}</span>
                        <span className="text-[11px] text-[#806F6F] font-mono">{ws.fileName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#3F3030]">{ws.occupation}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded font-semibold text-stone-700">
                          {ws.version}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#806F6F] font-mono">{ws.fileSize}</td>
                      <td className="py-2.5 px-3 text-[#806F6F]">{ws.uploadedAt}</td>
                      <td className="py-2.5 px-3 text-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadWorksheet(ws)}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TASK ALLOCATION TAB */}
      {activeTab === 'allocation' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'توزيع المهام العملية على المترشحين' : 'Candidate Task Allocations'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'جدول إسناد المهام العملية لكل مترشح مع بيان مستوى الصعوبة وحالة الإنجاز' : 'Mapping of candidates to assigned tasks to prevent task leakage and maintain test integrity'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشح' : 'Candidate'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رقم APRO' : 'APRO Ref'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهمة المسندة' : 'Assigned Task'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المستوى' : 'Level'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {allocations.map(al => (
                    <tr key={al.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{al.candidateName}</td>
                      <td className="py-2.5 px-3 font-mono text-[#7A2E3A] font-semibold">{al.aproReference}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#3F3030] block">{al.taskTitle}</span>
                        <span className="text-[11px] text-[#806F6F] font-mono">{al.taskCode} • {al.occupation}</span>
                      </td>
                      <td className="py-2.5 px-3">{getDifficultyBadge(al.difficulty)}</td>
                      <td className="py-2.5 px-3 text-[#806F6F]">{al.assignedDate}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{al.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {viewingTask && (
        <Modal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          maxWidth="lg"
          icon={<FileCode className="w-6 h-6 text-[#7A2E3A]" />}
          title={`${viewingTask.code}: ${viewingTask.titleEn}`}
          subtitle={viewingTask.occupation}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#806F6F]">Duration: {viewingTask.durationMinutes} min • Passing: {viewingTask.passingScore}/{viewingTask.maxScore}</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const t = viewingTask;
                  setViewingTask(null);
                  handleOpenEditTask(t);
                }}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                {t.common.edit}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Practical Scenario / Situation */}
            <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-1.5">
              <span className="text-xs font-bold text-[#7A2E3A] uppercase tracking-wider block">
                {language === 'ar' ? 'سيناريو ومسألة الاختبار العملي' : 'Assessment Scenario / Technical Situation'}
              </span>
              <p className="text-xs text-[#3F3030] leading-relaxed">{viewingTask.situation}</p>
            </div>

            {/* Tools and Equipment Required */}
            <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-2">
              <span className="text-xs font-bold text-[#7A2E3A] uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'الأدوات والمعدات والتجهيزات المطلوبة' : 'Required Tools & Safety Equipment'}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {viewingTask.toolsAndEquipment.map((tool, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-[#E8D9D2] text-[#3F3030]">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Step-by-Step Scoring Rubrics */}
            <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-2">
              <span className="text-xs font-bold text-[#7A2E3A] uppercase tracking-wider block">
                {language === 'ar' ? 'خطوات التنفيذ ومعايير التقييم' : 'Standard Execution Steps & Scoring Rubric'}
              </span>
              <div className="space-y-2">
                {viewingTask.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#3F3030] bg-white p-2 rounded-lg border border-[#E8D9D2]">
                    <span className="w-5 h-5 rounded-full bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center font-bold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        maxWidth="lg"
        icon={<FileCode className="w-6 h-6" />}
        title={editingTask ? 'Edit Practical Task' : 'Create Practical Task'}
        subtitle="Manage standardized practical blueprints and scoring rubrics"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveTask} leftIcon={<Save className="w-4 h-4" />}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Input
              label="Task Code"
              required
              value={taskForm.code}
              onChange={e => setTaskForm({ ...taskForm, code: e.target.value })}
            />
            <Select
              label="Occupation"
              required
              value={taskForm.occupation}
              onChange={e => setTaskForm({ ...taskForm, occupation: e.target.value })}
              options={[
                { value: 'Electrical Installation', label: 'Electrical Installation' },
                { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                { value: 'BMS Automation', label: 'BMS Automation' },
                { value: 'Plumbing', label: 'Plumbing' },
              ]}
            />
            <Select
              label="Difficulty"
              required
              value={taskForm.difficulty}
              onChange={e => setTaskForm({ ...taskForm, difficulty: e.target.value as TaskDifficulty })}
              options={[
                { value: 'FOUNDATIONAL', label: 'Foundational' },
                { value: 'INTERMEDIATE', label: 'Intermediate' },
                { value: 'ADVANCED', label: 'Advanced' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Task Title (English)"
              required
              value={taskForm.titleEn}
              onChange={e => setTaskForm({ ...taskForm, titleEn: e.target.value })}
            />
            <Input
              label="Task Title (Arabic)"
              dir="rtl"
              value={taskForm.titleAr}
              onChange={e => setTaskForm({ ...taskForm, titleAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Input
              label="Duration (Minutes)"
              type="number"
              required
              value={taskForm.durationMinutes}
              onChange={e => setTaskForm({ ...taskForm, durationMinutes: Number(e.target.value) })}
            />
            <Input
              label="Max Score"
              type="number"
              required
              value={taskForm.maxScore}
              onChange={e => setTaskForm({ ...taskForm, maxScore: Number(e.target.value) })}
            />
            <Input
              label="Passing Score"
              type="number"
              required
              value={taskForm.passingScore}
              onChange={e => setTaskForm({ ...taskForm, passingScore: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F3030] mb-1">Scenario / Situation</label>
            <textarea
              rows={2}
              required
              value={taskForm.situation}
              onChange={e => setTaskForm({ ...taskForm, situation: e.target.value })}
              className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg p-2.5 focus:outline-none focus:border-[#7A2E3A]"
            />
          </div>

          <div>
            <Input
              label="Tools & Equipment (comma separated)"
              value={taskForm.toolsAndEquipment}
              onChange={e => setTaskForm({ ...taskForm, toolsAndEquipment: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F3030] mb-1">Execution Steps / Rubric (one step per line)</label>
            <textarea
              rows={3}
              required
              value={taskForm.steps}
              onChange={e => setTaskForm({ ...taskForm, steps: e.target.value })}
              className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg p-2.5 focus:outline-none focus:border-[#7A2E3A]"
            />
          </div>
        </form>
      </Modal>

      {/* Upload Worksheet Modal */}
      <Modal
        isOpen={isUploadWorksheetOpen}
        onClose={() => setIsUploadWorksheetOpen(false)}
        maxWidth="md"
        icon={<Upload className="w-6 h-6" />}
        title="Upload Task Worksheet"
        subtitle="Attach official PDF blueprint for assessor test station"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsUploadWorksheetOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveWorksheet} leftIcon={<Upload className="w-4 h-4" />}>
              Save Blueprint
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveWorksheet} className="space-y-3.5">
          <Input
            label="Worksheet Code"
            required
            value={worksheetForm.code}
            onChange={e => setWorksheetForm({ ...worksheetForm, code: e.target.value })}
          />
          <Input
            label="Worksheet Title"
            required
            value={worksheetForm.title}
            onChange={e => setWorksheetForm({ ...worksheetForm, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3.5">
            <Select
              label="Linked Task"
              required
              value={worksheetForm.taskId}
              onChange={e => setWorksheetForm({ ...worksheetForm, taskId: e.target.value })}
              options={tasks.map(t => ({ value: t.id, label: `${t.code} - ${t.titleEn}` }))}
            />
            <Input
              label="Version"
              value={worksheetForm.version}
              onChange={e => setWorksheetForm({ ...worksheetForm, version: e.target.value })}
            />
          </div>
          <div className="p-4 border-2 border-dashed border-[#E8D9D2] rounded-xl text-center space-y-1 bg-[#FFFCF8]">
            <FileText className="w-8 h-8 text-[#7A2E3A] mx-auto" />
            <span className="text-xs font-semibold text-[#3F3030] block">Blueprint PDF Ready</span>
            <span className="text-[11px] text-[#806F6F] font-mono">{worksheetForm.fileName} (1.4 MB)</span>
          </div>
        </form>
      </Modal>

      {/* Task Allocation Modal */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        maxWidth="md"
        icon={<UserCheck className="w-6 h-6" />}
        title="Allocate Task to Candidate"
        subtitle="Assign random or curated practical challenge to candidate"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAllocateModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAllocation} leftIcon={<Save className="w-4 h-4" />}>
              Confirm Allocation
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAllocation} className="space-y-3.5">
          <Select
            label="Select Candidate"
            required
            value={allocationForm.candidateId}
            onChange={e => setAllocationForm({ ...allocationForm, candidateId: e.target.value })}
            options={candidates.map(c => ({
              value: c.id,
              label: `${c.fullNameEn} (${c.aproReference}) - ${c.occupation}`,
            }))}
          />
          <Select
            label="Select Practical Task"
            required
            value={allocationForm.taskId}
            onChange={e => setAllocationForm({ ...allocationForm, taskId: e.target.value })}
            options={tasks.map(t => ({
              value: t.id,
              label: `${t.code} [${t.difficulty}] - ${t.titleEn} (${t.occupation})`,
            }))}
          />
        </form>
      </Modal>

      {/* Excel Task Pool Bulk Upload & Validation Modal */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setParsedRows([]);
          setExcelFileName('');
        }}
        maxWidth="2xl"
        icon={<FileSpreadsheet className="w-6 h-6 text-emerald-700" />}
        title={language === 'ar' ? 'استيراد بنك المهام العملية من إكسل / CSV' : 'Bulk Import Practical Tasks (Excel / CSV)'}
        subtitle={language === 'ar' ? 'رفع جدول المهام مع التدقيق الفوري للرموز والمعايير ومستويات الصعوبة' : 'Upload spreadsheet with pre-import validation, uniqueness check, and rubric verification'}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsExcelModalOpen(false);
                setParsedRows([]);
                setExcelFileName('');
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmImport}
              disabled={parsedRows.filter(r => r.isValid).length === 0}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {language === 'ar' 
                ? `اعتماد واستيراد (${parsedRows.filter(r => r.isValid).length}) مهمة`
                : `Validate & Import (${parsedRows.filter(r => r.isValid).length}) Tasks`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Upload Area & Quick Sample */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-stone-50 border border-[#E8D9D2] rounded-xl">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A2E3A] bg-white border border-[#7A2E3A] rounded-lg hover:bg-[#F8ECEE] transition-colors shadow-xs">
                  <FileUp className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'اختر ملف CSV / Excel' : 'Choose CSV / Excel File'}
                </span>
              </label>
              <span className="text-xs text-[#806F6F] font-mono truncate max-w-[200px]">
                {excelFileName || (language === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected')}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleExcel}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'تحميل نموذج تجريبي جاهز' : 'Load Demo Excel Template'}
            </Button>
          </div>

          {/* Validation Metrics */}
          {parsedRows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] text-center">
                <span className="text-[10px] text-[#806F6F] uppercase tracking-wider block">Total Rows</span>
                <span className="text-base font-bold text-[#3F3030]">{parsedRows.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider block">Ready to Import</span>
                <span className="text-base font-bold text-emerald-700">{parsedRows.filter(r => r.isValid).length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] text-rose-800 uppercase tracking-wider block">Validation Errors</span>
                <span className="text-base font-bold text-rose-700">{parsedRows.filter(r => !r.isValid).length}</span>
              </div>
            </div>
          )}

          {/* Tabular Preview */}
          {parsedRows.length > 0 ? (
            <div className="border border-[#E8D9D2] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead className="bg-[#F8ECEE] text-[#7A2E3A] sticky top-0 z-10 border-b border-[#E8D9D2]">
                  <tr>
                    <th className="p-2 text-start font-semibold">Code</th>
                    <th className="p-2 text-start font-semibold">Title</th>
                    <th className="p-2 text-start font-semibold">Occupation</th>
                    <th className="p-2 text-start font-semibold">Diff.</th>
                    <th className="p-2 text-start font-semibold">Pass/Max</th>
                    <th className="p-2 text-center font-semibold">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-stone-50' : 'bg-rose-50/40'}>
                      <td className="p-2 font-mono font-bold text-[#7A2E3A]">{row.code}</td>
                      <td className="p-2 font-medium text-[#3F3030] max-w-[160px] truncate" title={row.titleEn}>
                        {row.titleEn}
                      </td>
                      <td className="p-2 text-[#806F6F]">{row.occupation}</td>
                      <td className="p-2">
                        <Badge variant={row.difficulty === 'ADVANCED' ? 'danger' : row.difficulty === 'INTERMEDIATE' ? 'gold' : 'success'} size="sm">
                          {row.difficulty}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-[#3F3030]">{row.passingScore} / {row.maxScore}</td>
                      <td className="p-2 text-center">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-medium" title={row.error}>
                            <XCircle className="w-3.5 h-3.5" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-[#806F6F] border border-dashed border-[#E8D9D2] rounded-xl bg-[#FFFCF8]">
              <FileSpreadsheet className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-medium">No spreadsheet data loaded yet.</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Click "Load Demo Excel Template" or select a file above to preview.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
