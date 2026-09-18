import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Copy, Download, Search, Filter,
  UserCheck, RefreshCw, Eye, Sparkles, Check, AlertCircle, FileSpreadsheet,
  Users, Trash2, CheckSquare, Square, FileCheck, ChevronLeft, ChevronRight,
  ExternalLink, Printer, FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { SerialService } from '../services/serialService';
import { 
  generateCombinedReservationReportPdf, 
  generateBatchEvaluationPdfs, 
  generateSingleEvaluationPdf,
  triggerDownload,
  ReservationPdfRecord,
  GeneratedEvaluationPdfItem
} from '../services/pdfReportService';
import { Batch, Candidate, User, Center, Reservation } from '../types';

export interface ReservationManagementProps {
  onNavigate?: (path: string) => void;
}

export interface ParsedRecord {
  id: string;
  testTakerName: string;
  project: string;
  idNo: string;
  passportNumber: string;
  cprNumber: string; // Strictly '—'
  bookingNo: string;
  occupation: string;
  status: string;
  attachment: string; // Strictly '—'
  actions: string;
  assessorId?: string;
  assessorName?: string;

  // Validation
  isValid: boolean;
  validationError?: string;
  isDuplicatePassport?: boolean;
  isDuplicateReservation?: boolean;
  isCancelled?: boolean;
}

export const ReservationManagementPage: React.FC<ReservationManagementProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';

  const [activeTab, setActiveTab] = useState<string>('import');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);

  // Import State
  const [pastedData, setPastedData] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedAssessorIds, setSelectedAssessorIds] = useState<string[]>([]);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingEval, setIsGeneratingEval] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<ParsedRecord | null>(null);

  // Evaluation Form Preview Modal State
  const [previewItems, setPreviewItems] = useState<GeneratedEvaluationPdfItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewZipBlob, setPreviewZipBlob] = useState<Blob | null>(null);
  const [previewZipFilename, setPreviewZipFilename] = useState<string>('');

  // Preloaded Table Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  const loadData = () => {
    const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    setCenters(allCenters);

    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const centerBatches = allBatches.filter(b => b.centerId === userCenterId);
    setBatches(centerBatches);

    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const centerCandidates = allCandidates.filter(c => c.centerId === userCenterId);
    setCandidates(centerCandidates);

    // Active Assessors for this center
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const centerAssessors = allUsers.filter(
      u => u.role === 'ASSESSOR' && u.status === 'ACTIVE' && (u.centerId === userCenterId || !u.centerId)
    );
    const fallbackAssessors = centerAssessors.length > 0 
      ? centerAssessors 
      : allUsers.filter(u => u.role === 'ASSESSOR' && u.status === 'ACTIVE');
    setAssessors(fallbackAssessors);

    // Check URL parameters for tab or batch
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['import', 'preload'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const batchParam = params.get('batchId');
    let targetBatch: Batch | undefined;
    if (batchParam && centerBatches.some(b => b.id === batchParam)) {
      setSelectedBatchId(batchParam);
      targetBatch = centerBatches.find(b => b.id === batchParam);
    } else if (centerBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(centerBatches[0].id);
      targetBatch = centerBatches[0];
    }

    if (targetBatch?.assessorIds && targetBatch.assessorIds.length > 0) {
      setSelectedAssessorIds(targetBatch.assessorIds);
    } else if (fallbackAssessors.length > 0 && selectedAssessorIds.length === 0) {
      setSelectedAssessorIds(fallbackAssessors.slice(0, 2).map(a => a.id));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When user changes batch selection
  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const chosenBatch = batches.find(b => b.id === batchId);
    if (chosenBatch?.assessorIds && chosenBatch.assessorIds.length > 0) {
      setSelectedAssessorIds(chosenBatch.assessorIds);
    }
  };

  // Toggle assessor selection
  const toggleAssessor = (assessorId: string) => {
    setSelectedAssessorIds(prev => {
      const next = prev.includes(assessorId)
        ? prev.filter(id => id !== assessorId)
        : [...prev, assessorId];

      if (parsedRecords.length > 0) {
        applyAssessorDistribution(parsedRecords, next);
      }
      return next;
    });
  };

  const handleSelectAllAssessors = () => {
    const allIds = assessors.map(a => a.id);
    setSelectedAssessorIds(allIds);
    if (parsedRecords.length > 0) {
      applyAssessorDistribution(parsedRecords, allIds);
    }
  };

  const handleClearAssessors = () => {
    setSelectedAssessorIds([]);
    if (parsedRecords.length > 0) {
      applyAssessorDistribution(parsedRecords, []);
    }
  };

  // 10-Column Sequential Sample Data
  const sampleCsvData = `Test taker name\tProject\tID No.\tPassport No.\tCPR/Personal Number\tBooking No.\tOccupation\tStatus\tAttachment\tActions
MOHAMMAD SHAHED MIAH\tSaudi SVP\t8732786226\tA21891481\t—\t3824996\tWarehouse Worker\tReserved\t—\tView
MD RABIUL ISLAM\tSaudi SVP\t8732786227\tA21891482\t—\t3824997\tWarehouse Worker\tReserved\t—\tView
MD AL AMIN\tSaudi SVP\t8732786228\tA21891483\t—\t3824998\tWarehouse Worker\tReserved\t—\tView
KAMAL HOSSAIN\tSaudi SVP\t8732786229\tA21891484\t—\t3824999\tWarehouse Worker\tReserved\t—\tView
MD SUMON MIAH\tSaudi SVP\t8732786230\tA21891485\t—\t3825000\tWarehouse Worker\tReserved\t—\tView
SOHEL RANA\tSaudi SVP\t8732786231\tA21891486\t—\t3825001\tWarehouse Worker\tReserved\t—\tView
MD FIROZ AHMED\tSaudi SVP\t8732786232\tA21891487\t—\t3825002\tWarehouse Worker\tReserved\t—\tView
MD SAGOR ALI\tSaudi SVP\t8732786233\tA21891488\t—\t3825003\tWarehouse Worker\tReserved\t—\tView
MD JEWEL RANA\tSaudi SVP\t8732786234\tA21891489\t—\t3825004\tWarehouse Worker\tReserved\t—\tView
MD ROKEY MIAH\tSaudi SVP\t8732786235\tA21891490\t—\t3825005\tWarehouse Worker\tReserved\t—\tView`;

  const handleLoadSample = () => {
    setPastedData(sampleCsvData);
    setHasProcessed(false);
    setParsedRecords([]);
    showToast('Loaded 10-column sample reservation data', 'info');
  };

  /**
   * Balanced Candidate-to-Assessor Distribution
   * Base = floor(N / M)
   * Remainder = N % M
   * First Remainder assessors get Base + 1, rest get Base
   */
  const applyAssessorDistribution = (records: ParsedRecord[], assessorIdList: string[]) => {
    const activeSelectedAssessors = assessors.filter(a => assessorIdList.includes(a.id));
    const m = activeSelectedAssessors.length;

    if (m === 0) {
      const updated = records.map(r => ({
        ...r,
        assessorId: undefined,
        assessorName: undefined,
      }));
      setParsedRecords(updated);
      return updated;
    }

    const validCount = records.filter(r => r.isValid).length;
    const base = Math.floor(validCount / m);
    const remainder = validCount % m;

    let validIndex = 0;
    const updated = records.map(r => {
      if (!r.isValid) {
        return { ...r, assessorId: undefined, assessorName: undefined };
      }

      let accumulated = 0;
      let assigned = activeSelectedAssessors[0];

      for (let j = 0; j < m; j++) {
        const quota = j < remainder ? base + 1 : base;
        if (validIndex < accumulated + quota) {
          assigned = activeSelectedAssessors[j];
          break;
        }
        accumulated += quota;
      }

      validIndex++;
      return {
        ...r,
        assessorId: assigned.id,
        assessorName: assigned.name,
      };
    });

    setParsedRecords(updated);
    return updated;
  };

  // Parse Raw Pasted Data
  const handleProcessData = () => {
    if (!pastedData.trim()) {
      showToast('Please paste reservation data or load sample data', 'error');
      return;
    }

    setIsProcessing(true);
    const existingReservations = StorageService.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    const lines = pastedData.trim().split('\n');
    const records: ParsedRecord[] = [];
    const seenPassports = new Set<string>();
    const seenBookings = new Set<string>();

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) return;

      const lower = cleanLine.toLowerCase();
      if (
        (lower.includes('test taker') || lower.includes('candidate name')) &&
        (lower.includes('passport') || lower.includes('booking'))
      ) {
        return;
      }

      const delimiter = cleanLine.includes('\t') ? '\t' : ',';
      const parts = cleanLine.split(delimiter).map(p => p.trim());

      let testTakerName = '';
      let project = 'Saudi SVP';
      let idNo = '';
      let passportNumber = '';
      const cprNumber = '—';
      let bookingNo = '';
      let occupation = 'Warehouse Worker';
      let statusRaw = 'Reserved';
      const attachment = '—';
      let actions = 'View';

      if (parts.length >= 8) {
        testTakerName = parts[0] || '';
        project = parts[1] || 'Saudi SVP';
        idNo = parts[2] || '';
        passportNumber = parts[3]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
        bookingNo = parts[5] || parts[2] || '';
        occupation = parts[6] || 'Warehouse Worker';
        statusRaw = parts[7] || 'Reserved';
        actions = parts[9] || 'View';
      } else if (parts.length === 7) {
        testTakerName = parts[0] || '';
        project = parts[1] || 'Saudi SVP';
        idNo = parts[2] || '';
        passportNumber = parts[3]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
        bookingNo = parts[4] || '';
        occupation = parts[5] || 'Warehouse Worker';
        statusRaw = parts[6] || 'Reserved';
      } else if (parts.length >= 4 && (parts[0].startsWith('RES-') || parts[1]?.length >= 6)) {
        testTakerName = parts[2] || '';
        project = 'Saudi SVP';
        idNo = `ID-${parts[1] || Date.now()}`;
        passportNumber = parts[1]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
        bookingNo = parts[0] || '';
        occupation = parts[3] || 'Electrical Installation';
        statusRaw = parts[4] || 'Reserved';
      } else {
        records.push({
          id: `row-${Date.now()}-${index}`,
          testTakerName: parts[0] || 'Malformed Row',
          project: 'Saudi SVP',
          idNo: 'UNKNOWN',
          passportNumber: 'UNKNOWN',
          cprNumber: '—',
          bookingNo: 'UNKNOWN',
          occupation: 'General',
          status: 'INVALID',
          attachment: '—',
          actions: '—',
          isValid: false,
          validationError: 'Insufficient columns (expected 10 sequential columns or valid roster row)',
        });
        return;
      }

      let isDuplicatePassport = false;
      let isDuplicateReservation = false;
      const isCancelled = statusRaw.toUpperCase().includes('CANCEL') || statusRaw.toUpperCase().includes('VOID');
      let error = '';

      if (!passportNumber) {
        error = 'Missing passport number';
      } else if (!testTakerName) {
        error = 'Missing candidate test taker name';
      } else if (
        seenPassports.has(passportNumber) || 
        existingReservations.some(r => r.passportNumber === passportNumber && r.centerId === userCenterId)
      ) {
        isDuplicatePassport = true;
        error = 'Duplicate passport detected in reservation pool';
      } else if (
        bookingNo && 
        (seenBookings.has(bookingNo) || existingReservations.some(r => (r.bookingNo === bookingNo || r.reservationId === bookingNo) && r.centerId === userCenterId))
      ) {
        isDuplicateReservation = true;
        error = 'Duplicate booking / reservation ID already exists';
      } else if (isCancelled) {
        error = 'Reservation cancelled or voided';
      }

      if (passportNumber) seenPassports.add(passportNumber);
      if (bookingNo) seenBookings.add(bookingNo);

      records.push({
        id: `row-${Date.now()}-${index}`,
        testTakerName,
        project,
        idNo,
        passportNumber,
        cprNumber,
        bookingNo,
        occupation,
        status: statusRaw,
        attachment,
        actions,
        isValid: !error && !isCancelled && !isDuplicatePassport && !isDuplicateReservation,
        validationError: error,
        isDuplicatePassport,
        isDuplicateReservation,
        isCancelled,
      });
    });

    const distributedRecords = applyAssessorDistribution(records, selectedAssessorIds);

    setParsedRecords(distributedRecords);
    setHasProcessed(true);
    setIsProcessing(false);
    showToast(`Parsed ${records.length} records successfully.`, 'info');
  };

  // Remove individual row from parsed records
  const handleRemoveRow = (rowId: string) => {
    const filtered = parsedRecords.filter(r => r.id !== rowId);
    applyAssessorDistribution(filtered, selectedAssessorIds);
    showToast('Record removed from inspection roster', 'info');
  };

  // Summary Counters
  const summary = useMemo(() => {
    const total = parsedRecords.length;
    const valid = parsedRecords.filter(r => r.isValid).length;
    const duplicate = parsedRecords.filter(r => r.isDuplicatePassport || r.isDuplicateReservation).length;
    const cancelled = parsedRecords.filter(r => r.isCancelled).length;
    const invalid = parsedRecords.filter(r => !r.isValid && !r.isCancelled && !r.isDuplicatePassport && !r.isDuplicateReservation).length;

    return { total, valid, duplicate, cancelled, invalid };
  }, [parsedRecords]);

  // Selected batch and center details
  const targetBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId);
  }, [batches, selectedBatchId]);

  const targetCenter = useMemo(() => {
    return centers.find(c => c.id === userCenterId);
  }, [centers, userCenterId]);

  // Combined Reservation PDF Download
  const handleDownloadCombinedPdf = () => {
    const validOnes = parsedRecords.filter(r => r.isValid);
    if (validOnes.length === 0) {
      showToast('No valid reservation records found to generate PDF report.', 'error');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const batchName = targetBatch ? targetBatch.batchNumber : 'BATCH-RESERVATIONS';
      const centerName = targetCenter ? targetCenter.nameEn : 'Saudi Skills Verification Center';
      const reportDate = targetBatch?.startDate || new Date().toISOString().split('T')[0];

      const pdfRecords: ReservationPdfRecord[] = validOnes.map(r => ({
        testTakerName: r.testTakerName,
        project: r.project,
        idNo: r.idNo,
        passportNumber: r.passportNumber,
        cprNumber: '—',
        bookingNo: r.bookingNo,
        occupation: r.occupation,
        status: r.status,
        attachment: '—',
        assessorName: r.assessorName,
        assessorId: r.assessorId,
      }));

      generateCombinedReservationReportPdf({
        batchName,
        centerName,
        date: reportDate,
        records: pdfRecords,
      });

      showToast(`Reservation Report PDF downloaded (${validOnes.length} records)`, 'success');
    } catch (err) {
      console.error('Failed to generate reservation PDF:', err);
      showToast('Failed to generate PDF report', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * Generates Practical Evaluation Form - L1 PDFs using the stored original template
   * and opens the interactive preview modal with candidate navigation.
   */
  const handleGenerateEvaluationReports = async () => {
    const validOnes = parsedRecords.filter(r => r.isValid);
    if (validOnes.length === 0) {
      showToast('No valid records found to generate evaluation reports.', 'error');
      return;
    }

    try {
      setIsGeneratingEval(true);
      const batchName = targetBatch ? targetBatch.batchNumber : 'BATCH-EVAL';
      const centerName = targetCenter ? targetCenter.nameEn : 'Saudi Skills Verification Center';
      const batchDate = targetBatch?.startDate || new Date().toISOString().split('T')[0];

      const evalRecords: ReservationPdfRecord[] = validOnes.map(r => ({
        testTakerName: r.testTakerName,
        project: r.project,
        idNo: r.idNo,
        passportNumber: r.passportNumber,
        cprNumber: '—',
        bookingNo: r.bookingNo,
        occupation: r.occupation,
        status: r.status,
        attachment: '—',
        assessorName: r.assessorName || 'Assigned Technical Assessor',
        assessorId: r.assessorId || 'ASS-001',
      }));

      const result = await generateBatchEvaluationPdfs({
        batchName,
        centerName,
        batchDate,
        records: evalRecords,
      });

      if (result.items.length > 0) {
        setPreviewItems(result.items);
        setPreviewIndex(0);
        setPreviewZipBlob(result.zipBlob || null);
        setPreviewZipFilename(result.zipFilename || 'Evaluation_Reports.zip');
        setIsPreviewModalOpen(true);
        showToast(`Loaded ${result.count} individual Evaluation Forms in template preview!`, 'success');
      }
    } catch (err) {
      console.error('Failed to generate evaluation reports:', err);
      showToast('Failed to generate evaluation reports', 'error');
    } finally {
      setIsGeneratingEval(false);
    }
  };

  /**
   * Preview an individual candidate's Practical Evaluation Form
   */
  const handlePreviewSingleCandidate = async (candidateData: {
    name: string;
    passport: string;
    occupation: string;
    bookingNo?: string;
    idNo?: string;
    assessorName?: string;
    assessorId?: string;
    batchId?: string;
  }) => {
    try {
      setIsGeneratingEval(true);
      const centerName = targetCenter ? targetCenter.nameEn : 'Saudi Skills Verification Center';
      const chosenBatch = batches.find(b => b.id === (candidateData.batchId || selectedBatchId));
      const batchDate = chosenBatch?.startDate || targetBatch?.startDate || new Date().toISOString().split('T')[0];

      const item = await generateSingleEvaluationPdf({
        candidateName: candidateData.name,
        passportNumber: candidateData.passport,
        occupation: candidateData.occupation,
        bookingNo: candidateData.bookingNo,
        idNo: candidateData.idNo,
        centerName,
        date: batchDate,
        assessorName: candidateData.assessorName || 'Assigned Technical Assessor',
        assessorId: candidateData.assessorId || 'ASS-001',
      });

      setPreviewItems([item]);
      setPreviewIndex(0);
      setPreviewZipBlob(null);
      setPreviewZipFilename('');
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error('Failed to preview candidate evaluation form:', err);
      showToast('Failed to preview evaluation form', 'error');
    } finally {
      setIsGeneratingEval(false);
    }
  };

  // Preload Valid Records
  const handlePreloadValidCandidates = () => {
    const validOnes = parsedRecords.filter(r => r.isValid);
    if (validOnes.length === 0) {
      showToast('No valid reservation records found to preload.', 'error');
      return;
    }

    if (!selectedBatchId) {
      showToast('Please select an assessment batch for preloading.', 'error');
      return;
    }

    const batchNumber = targetBatch ? targetBatch.batchNumber : 'BATCH-PRELOAD';
    const nowIso = new Date().toISOString();

    // 1. Save to reservations storage
    const existingRes = StorageService.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    const newReservations: Reservation[] = validOnes.map(r => ({
      id: `res-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      reservationId: r.bookingNo || r.idNo,
      testTakerName: r.testTakerName,
      candidateName: r.testTakerName,
      project: r.project,
      idNo: r.idNo,
      passportNumber: r.passportNumber,
      cprNumber: '—',
      bookingNo: r.bookingNo,
      occupation: r.occupation,
      status: 'PRELOADED',
      attachment: '—',
      centerId: userCenterId,
      batchId: selectedBatchId,
      countryId: 'cnt-sa',
      notes: `Preloaded into ${batchNumber}`,
      importedAt: nowIso,
      assessorId: r.assessorId,
      assessorName: r.assessorName,
    }));

    const updatedReservations = [...newReservations, ...existingRes];
    StorageService.set(STORAGE_KEYS.RESERVATIONS, updatedReservations);

    // 2. Preload candidate stubs into candidate pool
    const existingCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const newCandidates: Candidate[] = validOnes.map((r, i) => ({
      id: `can-pre-${Date.now()}-${i}`,
      fullNameEn: r.testTakerName,
      fullNameAr: r.testTakerName,
      testTakerName: r.testTakerName,
      project: r.project,
      idNo: r.idNo,
      bookingNo: r.bookingNo,
      cprNumber: '—',
      attachment: '—',
      passportNumber: r.passportNumber,
      aproReference: SerialService.generateNextApro('SA'),
      nationalId: r.idNo || `199${Math.floor(1000000 + Math.random() * 9000000)}`,
      occupation: r.occupation,
      countryId: 'cnt-sa',
      centerId: userCenterId,
      batchId: selectedBatchId,
      reservationId: r.bookingNo || r.idNo,
      assessorId: r.assessorId,
      assessorName: r.assessorName,
      enrollmentStatus: 'NOT_ENROLLED',
      preloadStatus: 'PRELOADED',
      cbtStatus: 'NOT_STARTED',
      practicalStatus: 'NOT_STARTED',
      evidenceStatus: 'NOT_UPLOADED',
      status: 'REGISTERED',
      registeredAt: nowIso,
      idCardStatus: 'NOT_REQUESTED',
    }));

    const updatedCandidates = [...newCandidates, ...existingCandidates];
    StorageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);

    // 3. Persist selected assessor IDs to target Batch
    if (selectedBatchId && selectedAssessorIds.length > 0) {
      const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
      const updatedBatches = allBatches.map(b => {
        if (b.id === selectedBatchId) {
          return {
            ...b,
            assessorIds: selectedAssessorIds,
          };
        }
        return b;
      });
      StorageService.set(STORAGE_KEYS.BATCHES, updatedBatches);
    }

    // 4. Log Audit
    AuditService.log(
      'PRELOAD_CANDIDATE',
      'RESERVATION',
      `Preloaded ${validOnes.length} valid candidates into ${batchNumber} with ${selectedAssessorIds.length} balanced assessors`,
      selectedBatchId,
      'SUCCESS'
    );

    showToast(`Successfully preloaded ${validOnes.length} candidates into batch!`, 'success');
    setPastedData('');
    setParsedRecords([]);
    setHasProcessed(false);
    loadData();
    setActiveTab('preload');
  };

  // Preloaded candidate list (from Candidate storage)
  const preloadedCandidates = useMemo(() => {
    return candidates.filter(c => {
      const isPreloaded = c.preloadStatus === 'PRELOADED' || !!c.reservationId;
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        c.fullNameEn.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        (c.reservationId && c.reservationId.toLowerCase().includes(q)) ||
        (c.bookingNo && c.bookingNo.toLowerCase().includes(q)) ||
        c.aproReference.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter || c.enrollmentStatus === statusFilter;
      const matchesBatch = batchFilter === 'ALL' || c.batchId === batchFilter;

      return isPreloaded && matchesSearch && matchesStatus && matchesBatch;
    });
  }, [candidates, searchTerm, statusFilter, batchFilter]);

  const tabs = [
    { id: 'import', label: language === 'ar' ? 'استيراد الحجوزات والمعالجة' : 'Reservation Import & Validation' },
    { id: 'preload', label: language === 'ar' ? `المرشحون المجهزون (${preloadedCandidates.length})` : `Preloaded Candidate Pool (${preloadedCandidates.length})` },
  ];

  const currentPreviewItem = previewItems[previewIndex];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={language === 'ar' ? 'إدارة واستيراد الحجوزات' : 'Reservation Import & Preload Management'}
        subtitle={language === 'ar' ? 'معالجة بيانات الحجوزات المعتمدة، التحقق من الجوازات المكررة، وتجهيز الدفعات قبل التسجيل' : 'Process reservation rosters, validate duplicate passports and cancelled records, distribute candidates to assessors, and preload candidates.'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'الحجوزات' : 'Reservations' },
        ]}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'import' ? (
        <div className="space-y-5">
          {/* Top Info Notice */}
          <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center shrink-0 border border-[#E8D9D2]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#3F3030]">
                  {language === 'ar' ? 'منفذ معالجة بيانات الحجوزات والتحقق المسبق' : 'Center Reservation Intake Pipeline'}
                </h4>
                <p className="text-[11px] text-[#806F6F] mt-0.5">
                  {language === 'ar' 
                    ? 'الصق بيانات الحجوزات بالأعمدة العشرة المعتمدة. سيقوم النظام بالتوزيع المتوازن وتوليد نموذج التقييم العملي المعتمد لكل مرشح.' 
                    : 'Paste TSV/CSV roster data matching the 10 sequential SVP columns. Generates official Practical Evaluation Form - L1 for each candidate.'}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#C9A24D]" />}
            >
              {language === 'ar' ? 'تحميل بيانات تجريبية' : 'Load Sample Data'}
            </Button>
          </div>

          {/* Batch & Assessor Assignment Configuration Card */}
          <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Target Batch Selection (Seat count removed as required) */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-[#3F3030] uppercase tracking-wider block">
                  {language === 'ar' ? 'الدفعة المستهدفة' : 'Target Assessment Batch'} <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedBatchId}
                  onChange={e => handleBatchChange(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} — {b.occupation}
                    </option>
                  ))}
                </select>
                {targetBatch && (
                  <p className="text-[10px] text-[#806F6F]">
                    Date: <strong className="font-mono text-[#3F3030]">{targetBatch.startDate}</strong> {targetBatch.startTime && `at ${targetBatch.startTime}`}
                  </p>
                )}
              </div>

              {/* Multi-Select Assessors for Balanced Candidate Distribution */}
              <div className="md:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3F3030] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7A2E3A]" />
                    {language === 'ar' ? 'المقيمون المعتمدون (توزيع متوازن)' : 'Assigned Assessor(s) — Balanced Distribution'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAssessors}
                      className="text-[10px] font-semibold text-[#7A2E3A] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-[10px] text-stone-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAssessors}
                      className="text-[10px] font-semibold text-[#806F6F] hover:underline"
                    >
                      Clear
                    </button>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F8ECEE] text-[#7A2E3A]">
                      {selectedAssessorIds.length} Selected
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-0.5">
                  {assessors.map(a => {
                    const isSelected = selectedAssessorIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAssessor(a.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#7A2E3A] text-white border-[#7A2E3A] shadow-sm'
                            : 'bg-[#FFFCF8] text-[#3F3030] border-[#E8D9D2] hover:bg-[#F8ECEE]/50'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-white shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#806F6F] shrink-0" />
                        )}
                        <span>{a.name}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-rose-100' : 'text-[#806F6F]'}`}>
                          ({a.username || a.id})
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#806F6F]">
                  Candidates are evenly allocated using: Base = ⌊N / M⌋, Remainder = N mod M. First Remainder assessors get Base + 1.
                </p>
              </div>
            </div>
          </div>

          {/* Input & Statistics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  {language === 'ar' ? 'نص سجلات الحجز (الأعمدة العشرة المعتمدة)' : 'Raw Reservation Data (TSV / CSV — 10 Columns)'}
                </label>
                <span className="text-[10px] text-[#806F6F] font-mono">
                  Name, Project, ID No, Passport, CPR, Booking No, Occupation, Status, Attachment, Actions
                </span>
              </div>
              <textarea
                value={pastedData}
                onChange={e => setPastedData(e.target.value)}
                rows={7}
                placeholder="Paste tab-separated or comma-separated rows here..."
                className="w-full p-3 font-mono text-xs bg-white border border-[#E8D9D2] rounded-xl focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
              />

              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProcessData}
                  disabled={isProcessing || !pastedData.trim()}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />}
                >
                  {language === 'ar' ? 'معالجة وتحقق وتوزيع' : 'Parse & Validate Records'}
                </Button>
              </div>
            </div>

            {/* Verification Statistics Panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl border border-[#E8D9D2] bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-3">
                <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider border-b border-[#E8D9D2] pb-2">
                  {language === 'ar' ? 'نتائج التدقيق والتحقق' : 'Verification Counters'}
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
                    <span className="text-[#806F6F] font-medium">{language === 'ar' ? 'إجمالي السجلات' : 'Total Records'}</span>
                    <strong className="font-mono text-sm text-[#3F3030]">{summary.total}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'سجلات صالحة' : 'Valid Records'}
                    </span>
                    <strong className="font-mono text-sm">{summary.valid}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="font-medium flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'جوازات / حجوزات مكررة' : 'Duplicate Records'}
                    </span>
                    <strong className="font-mono text-sm">{summary.duplicate}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                    <span className="font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'حجوزات ملغاة' : 'Cancelled Records'}
                    </span>
                    <strong className="font-mono text-sm">{summary.cancelled}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                    <span className="font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'سجلات غير مكتملة' : 'Invalid Format'}
                    </span>
                    <strong className="font-mono text-sm">{summary.invalid}</strong>
                  </div>
                </div>

                {hasProcessed && summary.valid > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handlePreloadValidCandidates}
                    leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? `تجهيز (${summary.valid}) مرشح في الدفعة` : `Preload (${summary.valid}) Candidates`}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Parsed Records Table Preview with PDF Generation Actions */}
          {hasProcessed && (
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider block">
                    {language === 'ar' ? 'معاينة فحص السجلات المستوردة' : 'Imported Records Inspection Table'}
                  </span>
                  <span className="text-[11px] text-[#806F6F] font-mono">
                    {summary.valid} valid records ready • Formatted strictly to SVP 10-Column Standard
                  </span>
                </div>

                {/* PDF Action Buttons */}
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadCombinedPdf}
                    disabled={isGeneratingPdf || summary.valid === 0}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateEvaluationReports}
                    disabled={isGeneratingEval || summary.valid === 0}
                    leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                  >
                    {isGeneratingEval 
                      ? 'Generating Forms...' 
                      : `Evaluation Report (${summary.valid})`}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FFFCF8] border-b border-[#E8D9D2] text-[#806F6F]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">1. Test taker name</th>
                      <th className="py-2.5 px-3 text-start font-semibold">2. Project</th>
                      <th className="py-2.5 px-3 text-start font-semibold">3. ID No.</th>
                      <th className="py-2.5 px-3 text-start font-semibold">4. Passport No.</th>
                      <th className="py-2.5 px-3 text-center font-semibold">5. CPR/Personal Number</th>
                      <th className="py-2.5 px-3 text-start font-semibold">6. Booking No.</th>
                      <th className="py-2.5 px-3 text-start font-semibold">7. Occupation</th>
                      <th className="py-2.5 px-3 text-start font-semibold">8. Status</th>
                      <th className="py-2.5 px-3 text-center font-semibold">9. Attachment</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Assigned Assessor</th>
                      <th className="py-2.5 px-3 text-end font-semibold">10. Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {parsedRecords.map(rec => (
                      <tr key={rec.id} className={rec.isValid ? 'hover:bg-[#FFFCF8]' : 'bg-rose-50/25'}>
                        {/* 1. Test taker name */}
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                          {rec.testTakerName}
                          {rec.validationError && (
                            <div className="text-[10px] text-rose-600 font-normal">{rec.validationError}</div>
                          )}
                        </td>

                        {/* 2. Project */}
                        <td className="py-2.5 px-3 text-[#806F6F] whitespace-nowrap">{rec.project}</td>

                        {/* 3. ID No. */}
                        <td className="py-2.5 px-3 font-mono text-[#806F6F] whitespace-nowrap">{rec.idNo || '—'}</td>

                        {/* 4. Passport No. */}
                        <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A] whitespace-nowrap">
                          {rec.passportNumber || '—'}
                        </td>

                        {/* 5. CPR/Personal Number (Strictly '—') */}
                        <td className="py-2.5 px-3 text-center font-mono text-stone-400 select-none">
                          —
                        </td>

                        {/* 6. Booking No. */}
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#3F3030] whitespace-nowrap">
                          {rec.bookingNo || '—'}
                        </td>

                        {/* 7. Occupation */}
                        <td className="py-2.5 px-3 text-[#3F3030] whitespace-nowrap">{rec.occupation}</td>

                        {/* 8. Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {rec.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> {rec.status || 'Reserved'}
                            </span>
                          ) : rec.isCancelled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              CANCELLED
                            </span>
                          ) : rec.isDuplicatePassport || rec.isDuplicateReservation ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              DUPLICATE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              INVALID
                            </span>
                          )}
                        </td>

                        {/* 9. Attachment (Strictly '—') */}
                        <td className="py-2.5 px-3 text-center font-mono text-stone-400 select-none">
                          —
                        </td>

                        {/* Assigned Assessor */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {rec.assessorName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                              {rec.assessorName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* 10. Actions */}
                        <td className="py-2.5 px-3 text-end whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {rec.isValid && (
                              <button
                                type="button"
                                onClick={() => handlePreviewSingleCandidate({
                                  name: rec.testTakerName,
                                  passport: rec.passportNumber,
                                  occupation: rec.occupation,
                                  bookingNo: rec.bookingNo,
                                  idNo: rec.idNo,
                                  assessorName: rec.assessorName,
                                  assessorId: rec.assessorId,
                                  batchId: selectedBatchId,
                                })}
                                title="Preview Official Evaluation Form (L1)"
                                className="p-1 text-[#7A2E3A] hover:bg-[#F8ECEE] rounded transition-colors"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectedRecord(rec)}
                              title="Inspect Raw Record"
                              className="p-1 text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#F8ECEE] rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rec.id)}
                              title="Remove Record"
                              className="p-1 text-[#806F6F] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PRELOADED CANDIDATES TAB (Section 11) */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-white border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-[#806F6F]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search passport, reservation, candidate name..."
                className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-[#806F6F]" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="REGISTERED">Registered</option>
                <option value="NOT_ENROLLED">Not Enrolled</option>
                <option value="ENROLLED">Enrolled</option>
              </select>

              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'جميع الدفعات' : 'All Batches'}</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.batchNumber}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preloaded Pool Table */}
          <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
            <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  {language === 'ar' ? 'سجل المرشحين المجهزين بالدفعات' : 'Preloaded Candidate Roster'}
                </h4>
                <p className="text-[11px] text-[#806F6F] mt-0.5">
                  {language === 'ar' ? 'المرشحون المجهزون بانتظار حضور يوم الاختبار والتقاط الصورة' : 'Preloaded candidates with assigned assessors awaiting test-day biometric photo enrollment.'}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate && onNavigate('/enrollment')}
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'بدء التحقق وتسجيل الحضور' : 'Proceed to Enrollment'}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                  <tr>
                    <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Passport</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Booking / Reservation</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Assigned Assessor</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Preload Status</th>
                    <th className="py-2.5 px-3 text-end font-semibold">Evaluation & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {preloadedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#806F6F]">
                        {language === 'ar' ? 'لا يوجد مرشحون مجهزون حالياً.' : 'No preloaded candidates found in the pool.'}
                      </td>
                    </tr>
                  ) : (
                    preloadedCandidates.map(c => {
                      const isEnrolled = c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED' || c.status === 'IN_ASSESSMENT' || c.status === 'COMPLETED';
                      const b = batches.find(batch => batch.id === c.batchId);
                      return (
                        <tr key={c.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                            {language === 'ar' ? c.fullNameAr : c.fullNameEn}
                            <div className="text-[10px] text-[#806F6F] font-mono">{c.aproReference}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{c.passportNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">{c.bookingNo || c.reservationId || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-[#3F3030]">{c.occupation}</td>
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">{b ? b.batchNumber : c.batchId}</td>
                          <td className="py-2.5 px-3">
                            {c.assessorName ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2]">
                                {c.assessorName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400 italic">Not Assigned</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                              PRELOADED
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handlePreviewSingleCandidate({
                                  name: c.fullNameEn,
                                  passport: c.passportNumber,
                                  occupation: c.occupation,
                                  bookingNo: c.bookingNo,
                                  idNo: c.idNo || c.nationalId,
                                  assessorName: c.assessorName,
                                  assessorId: c.assessorId,
                                  batchId: c.batchId,
                                })}
                                title="Preview Evaluation Form (L1)"
                                className="p-1 text-[#7A2E3A] hover:bg-[#F8ECEE] rounded transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Form L1</span>
                              </button>

                              {isEnrolled ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onNavigate && onNavigate(`/enrollment?passport=${c.passportNumber}&batchId=${c.batchId}`)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold text-white bg-[#7A2E3A] hover:bg-[#682430] transition-colors"
                                >
                                  {language === 'ar' ? 'تسجيل الآن' : 'Enroll Now'}
                                </button>
                              )}
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
      )}

      {/* Raw Record Inspection Modal */}
      {inspectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setInspectedRecord(null)}
          title="Reservation Record Inspection"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#FFFCF8] border border-[#E8D9D2] rounded-xl">
              <div>
                <span className="text-[#806F6F] block">1. Test Taker Name:</span>
                <strong className="text-sm text-[#3F3030]">{inspectedRecord.testTakerName}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">2. Project:</span>
                <strong className="text-sm text-[#3F3030]">{inspectedRecord.project}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">3. ID No:</span>
                <strong className="font-mono text-[#3F3030]">{inspectedRecord.idNo || '—'}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">4. Passport No:</span>
                <strong className="font-mono text-[#7A2E3A]">{inspectedRecord.passportNumber}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">5. CPR/Personal Number:</span>
                <span className="font-mono text-stone-400">—</span>
              </div>
              <div>
                <span className="text-[#806F6F] block">6. Booking No:</span>
                <strong className="font-mono text-[#3F3030]">{inspectedRecord.bookingNo || '—'}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">7. Occupation:</span>
                <strong className="text-[#3F3030]">{inspectedRecord.occupation}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">8. Status:</span>
                <span className="font-semibold text-emerald-700">{inspectedRecord.status}</span>
              </div>
              <div>
                <span className="text-[#806F6F] block">9. Attachment:</span>
                <span className="font-mono text-stone-400">—</span>
              </div>
              <div>
                <span className="text-[#806F6F] block">Assigned Assessor:</span>
                <strong className="text-[#7A2E3A]">{inspectedRecord.assessorName || 'None assigned'}</strong>
              </div>
            </div>

            {inspectedRecord.validationError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                Validation Note: {inspectedRecord.validationError}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              {inspectedRecord.isValid && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setInspectedRecord(null);
                    handlePreviewSingleCandidate({
                      name: inspectedRecord.testTakerName,
                      passport: inspectedRecord.passportNumber,
                      occupation: inspectedRecord.occupation,
                      bookingNo: inspectedRecord.bookingNo,
                      idNo: inspectedRecord.idNo,
                      assessorName: inspectedRecord.assessorName,
                      assessorId: inspectedRecord.assessorId,
                      batchId: selectedBatchId,
                    });
                  }}
                >
                  Preview Practical Evaluation Form
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setInspectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Practical Evaluation Form - L1 Official Template Preview Modal */}
      {isPreviewModalOpen && currentPreviewItem && (
        <Modal
          isOpen={true}
          onClose={() => setIsPreviewModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#7A2E3A]" />
              <span>Practical Evaluation Form - L1 (English) Preview</span>
            </div>
          }
          subtitle="Official Skills Verification Program (SVP) Stored Template with dynamic candidate and assessor population"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Top Navigation & Controls Bar */}
            <div className="p-3 bg-[#FFFCF8] border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              {/* Candidate Switcher */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-lg border border-[#E8D9D2] bg-white text-[#3F3030] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F8ECEE] transition-colors"
                  title="Previous Candidate"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={previewIndex}
                  onChange={e => setPreviewIndex(Number(e.target.value))}
                  className="text-xs font-semibold py-1.5 px-2.5 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A] max-w-[280px] sm:max-w-xs truncate"
                >
                  {previewItems.map((item, idx) => (
                    <option key={idx} value={idx}>
                      Candidate {idx + 1} of {previewItems.length}: {item.candidateName} ({item.passportNumber})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={previewIndex >= previewItems.length - 1}
                  onClick={() => setPreviewIndex(prev => Math.min(previewItems.length - 1, prev + 1))}
                  className="p-1.5 rounded-lg border border-[#E8D9D2] bg-white text-[#3F3030] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F8ECEE] transition-colors"
                  title="Next Candidate"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerDownload(currentPreviewItem.blob, currentPreviewItem.filename)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download This Form
                </Button>

                {previewZipBlob && previewItems.length > 1 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => triggerDownload(previewZipBlob, previewZipFilename)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download All ({previewItems.length}) ZIP
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => window.open(currentPreviewItem.blobUrl, '_blank')}
                  title="Open in new window / full screen"
                  className="p-2 rounded-lg border border-[#E8D9D2] bg-white text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Auto-Populated Verification Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-lg bg-stone-50 border border-stone-200">
              <div>
                <span className="text-[#806F6F] block text-[10px]">Test Center Name:</span>
                <strong className="text-[#3F3030] truncate block">{targetCenter?.nameEn || 'Saudi Skills Verification Center'}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Assessment Date:</span>
                <strong className="font-mono text-[#3F3030]">{targetBatch?.startDate || new Date().toISOString().split('T')[0]}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Occupation:</span>
                <strong className="text-[#3F3030] truncate block">{currentPreviewItem.occupation}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Candidate & Passport:</span>
                <strong className="text-[#7A2E3A] truncate block">{currentPreviewItem.candidateName} ({currentPreviewItem.passportNumber})</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Assessor Name:</span>
                <strong className="text-[#3F3030] truncate block">{currentPreviewItem.assessorName}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Assessor ID Number:</span>
                <strong className="font-mono text-[#3F3030]">{currentPreviewItem.assessorId}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Practical Task #:</span>
                <span className="font-mono text-stone-400 font-bold">[BLANK]</span>
              </div>
              <div>
                <span className="text-[#806F6F] block text-[10px]">Template Standard:</span>
                <span className="text-emerald-700 font-semibold">Official SVP L1 Form</span>
              </div>
            </div>

            {/* Embedded Live PDF Document Viewer */}
            <div className="w-full bg-[#525659] rounded-xl overflow-hidden border border-[#E8D9D2] shadow-inner">
              <iframe
                src={currentPreviewItem.blobUrl}
                title={`Evaluation Form - ${currentPreviewItem.candidateName}`}
                className="w-full h-[620px] border-0"
              />
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#806F6F] font-mono">
                Candidate {previewIndex + 1} of {previewItems.length} • Filename: {currentPreviewItem.filename}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
