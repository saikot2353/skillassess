import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Upload, FileText, CheckCircle2, AlertTriangle, 
  XCircle, Copy, Download, Search, Filter, Layers, ArrowRight,
  UserCheck, RefreshCw, Eye, Sparkles, Check, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { SerialService } from '../services/serialService';
import { Reservation, Batch, Candidate } from '../types';

export interface ReservationManagementProps {
  onNavigate?: (path: string) => void;
}

interface ParsedRecord {
  reservationId: string;
  passportNumber: string;
  candidateName: string;
  occupation: string;
  reservationStatus: string;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Import State
  const [pastedData, setPastedData] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Preloaded Table Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  const loadData = () => {
    const allRes = StorageService.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    const centerRes = allRes.filter(r => r.centerId === userCenterId);
    setReservations(centerRes);

    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const centerBatches = allBatches.filter(b => b.centerId === userCenterId);
    setBatches(centerBatches);
    if (centerBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(centerBatches[0].id);
    }

    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const centerCandidates = allCandidates.filter(c => c.centerId === userCenterId);
    setCandidates(centerCandidates);
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['import', 'preload'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const sampleCsvData = `RES-2026-SA-3001,EB9912801,Hamidul Islam,Electrical Installation,CONFIRMED
RES-2026-SA-3002,EB9912802,Saifur Rahman,Electrical Installation,CONFIRMED
RES-2026-SA-3003,FA8872190,Abdul Karim Mansoor,Electrical Installation,CONFIRMED
RES-2026-SA-3004,EB9912804,Jamal Hossain,Electrical Installation,CANCELLED
RES-2026-SA-3005,,Invalid Candidate,Electrical Installation,CONFIRMED
RES-2026-SA-1001,EB0982714,Mohammed Alamgir Hossain,Electrical Installation,CONFIRMED`;

  const handleLoadSample = () => {
    setPastedData(sampleCsvData);
    setHasProcessed(false);
    setParsedRecords([]);
    showToast('Loaded sample reservation data into import parser', 'info');
  };

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
    const seenResIds = new Set<string>();

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) return;

      const parts = cleanLine.split(/,|\t/).map(p => p.trim());
      if (parts.length < 3) {
        records.push({
          reservationId: `LINE-${index + 1}`,
          passportNumber: 'UNKNOWN',
          candidateName: 'Malformed Row',
          occupation: 'General',
          reservationStatus: 'INVALID',
          isValid: false,
          validationError: 'Insufficient columns (expected at least 3: ID, Passport, Name)',
        });
        return;
      }

      const resId = parts[0] || `RES-${Date.now()}-${index}`;
      const passport = parts[1]?.toUpperCase() || '';
      const name = parts[2] || '';
      const occupation = parts[3] || 'Electrical Installation';
      const statusRaw = (parts[4] || 'CONFIRMED').toUpperCase();

      let isDuplicatePassport = false;
      let isDuplicateReservation = false;
      let isCancelled = statusRaw.includes('CANCEL') || statusRaw === 'VOID';
      let error = '';

      if (!passport) {
        error = 'Missing passport number';
      } else if (!name) {
        error = 'Missing candidate full name';
      } else if (seenPassports.has(passport) || existingReservations.some(r => r.passportNumber === passport && r.centerId === userCenterId)) {
        isDuplicatePassport = true;
        error = 'Duplicate passport detected in reservation pool';
      } else if (seenResIds.has(resId) || existingReservations.some(r => r.reservationId === resId)) {
        isDuplicateReservation = true;
        error = 'Duplicate Reservation ID already exists';
      } else if (isCancelled) {
        error = 'Reservation is cancelled by agency';
      }

      seenPassports.add(passport);
      seenResIds.add(resId);

      records.push({
        reservationId: resId,
        passportNumber: passport,
        candidateName: name,
        occupation: occupation,
        reservationStatus: statusRaw,
        isValid: !error && !isCancelled && !isDuplicatePassport && !isDuplicateReservation,
        validationError: error,
        isDuplicatePassport,
        isDuplicateReservation,
        isCancelled,
      });
    });

    setParsedRecords(records);
    setHasProcessed(true);
    setIsProcessing(false);
    showToast(`Parsed ${records.length} records successfully.`, 'info');
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

    const targetBatch = batches.find(b => b.id === selectedBatchId);
    const targetBatchNumber = targetBatch ? targetBatch.batchNumber : 'BATCH-PRELOAD';
    const nowIso = new Date().toISOString();

    // 1. Save to reservations storage
    const existingRes = StorageService.get<Reservation[]>(STORAGE_KEYS.RESERVATIONS, []);
    const newReservations: Reservation[] = validOnes.map(r => ({
      id: `res-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      reservationId: r.reservationId,
      passportNumber: r.passportNumber,
      candidateName: r.candidateName,
      occupation: r.occupation,
      status: 'PRELOADED',
      centerId: userCenterId,
      batchId: selectedBatchId,
      countryId: 'cnt-sa',
      notes: `Preloaded into ${targetBatchNumber}`,
      importedAt: nowIso,
    }));

    const updatedReservations = [...newReservations, ...existingRes];
    StorageService.set(STORAGE_KEYS.RESERVATIONS, updatedReservations);

    // 2. Preload candidate stubs into candidate pool (Preload != Enrollment)
    const existingCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const newCandidates: Candidate[] = validOnes.map((r, i) => ({
      id: `can-pre-${Date.now()}-${i}`,
      fullNameEn: r.candidateName,
      fullNameAr: r.candidateName,
      passportNumber: r.passportNumber,
      aproReference: SerialService.generateNextApro('SA'),
      nationalId: `199${Math.floor(1000000 + Math.random() * 9000000)}`,
      occupation: r.occupation,
      countryId: 'cnt-sa',
      centerId: userCenterId,
      batchId: selectedBatchId,
      reservationId: r.reservationId,
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

    // 3. Log Audit
    AuditService.log(
      'PRELOAD_CANDIDATE',
      'RESERVATION',
      `Preloaded ${validOnes.length} valid reservation candidates into ${targetBatchNumber}`,
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

  // Preloaded candidate list (from Candidate storage with preloadStatus = PRELOADED)
  const preloadedCandidates = useMemo(() => {
    return candidates.filter(c => {
      const isPreloaded = c.preloadStatus === 'PRELOADED' || !!c.reservationId;
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        c.fullNameEn.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        (c.reservationId && c.reservationId.toLowerCase().includes(q)) ||
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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={language === 'ar' ? 'إدارة واستيراد الحجوزات' : 'Reservation Import & Preload Management'}
        subtitle={language === 'ar' ? 'معالجة بيانات الحجوزات المعتمدة، التحقق من الجوازات المكررة، وتجهيز الدفعات قبل التسجيل' : 'Process reservation rosters, validate duplicate passports and cancelled records, and preload candidates into target batches.'}
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
                  {language === 'ar' ? 'يمكن لصق بيانات CSV أو اختيار عينة لاختبار التحقق من التكرار والإلغاء.' : 'Paste CSV records (Reservation ID, Passport, Name, Occupation, Status) or load sample data.'}
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

          {/* Input & Target Batch Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  {language === 'ar' ? 'نص سجلات الحجز (CSV / نص مفصول بفواصل)' : 'Raw Reservation Data (CSV / Tab-Delimited)'}
                </label>
                <span className="text-[10px] text-[#806F6F] font-mono">Format: ID, Passport, Full Name, Occupation, Status</span>
              </div>
              <textarea
                value={pastedData}
                onChange={e => setPastedData(e.target.value)}
                rows={8}
                placeholder={`RES-2026-SA-001,EB998124,Mohammed Alamgir,Electrical Installation,CONFIRMED\nRES-2026-SA-002,FA887219,Abdul Karim,Electrical Installation,CONFIRMED`}
                className="w-full p-3 font-mono text-xs bg-white border border-[#E8D9D2] rounded-xl focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#806F6F] font-medium">{language === 'ar' ? 'إسناد الدفعة المستهدفة:' : 'Target Batch:'}</span>
                  <select
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="text-xs font-semibold py-1.5 px-3 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} — {b.occupation} ({b.candidateCount} seats)
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProcessData}
                  disabled={isProcessing || !pastedData.trim()}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />}
                >
                  {language === 'ar' ? 'معالجة وتحقق' : 'Parse & Validate Records'}
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
                      <XCircle className="w-3.5 h-3.5" />
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

          {/* Parsed Records Table Preview */}
          {hasProcessed && (
            <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
              <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                  {language === 'ar' ? 'معاينة فحص السجلات المستوردة' : 'Imported Records Inspection Table'}
                </span>
                <span className="text-[11px] text-[#806F6F] font-mono">
                  {summary.valid} ready for candidate pool preload
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                    <tr>
                      <th className="py-2.5 px-3 text-start font-semibold">Status</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Reservation ID</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Passport</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Validation Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {parsedRecords.map((rec, idx) => (
                      <tr key={idx} className={rec.isValid ? 'hover:bg-[#FFFCF8]' : 'bg-rose-50/20'}>
                        <td className="py-2.5 px-3">
                          {rec.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> VALID
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
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#3F3030]">{rec.reservationId}</td>
                        <td className="py-2.5 px-3 font-mono text-[#806F6F]">{rec.passportNumber || '—'}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{rec.candidateName || '—'}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{rec.occupation}</td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {rec.validationError ? (
                            <span className="text-rose-600 font-medium">{rec.validationError}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Verified & ready for preload</span>
                          )}
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
                  {language === 'ar' ? 'المرشحون المجهزون بانتظار حضور يوم الاختبار والتقاط الصورة' : 'Preloaded candidates awaiting test-day biometric photo enrollment.'}
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
                    <th className="py-2.5 px-3 text-start font-semibold">Reservation ID</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Preload Status</th>
                    <th className="py-2.5 px-3 text-end font-semibold">Enrollment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {preloadedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#806F6F]">
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
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">{c.reservationId || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-[#3F3030]">{c.occupation}</td>
                          <td className="py-2.5 px-3 font-mono text-[#806F6F]">{b ? b.batchNumber : c.batchId}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                              PRELOADED
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end">
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
    </div>
  );
};
