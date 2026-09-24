import React, { useState, useEffect } from 'react';
import { 
  Award, Shield, ShieldCheck, Lock, Unlock, Edit3, Search, Filter,
  Download, Printer, CheckCircle, XCircle, AlertTriangle, Eye, FileText,
  Clock, ArrowRight, Save, History, CheckCircle2
} from 'lucide-react';
import { Result, ResultCorrection, Country, Center, Candidate } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';

export interface ResultsProps {
  onNavigate?: (path: string) => void;
}

export const ResultsPage: React.FC<ResultsProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user, hasPermission } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const userCountryId = user?.countryId || 'cnt-sa';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCountryAccount = user?.role === 'COUNTRY_ACCOUNT';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isCenterScoped = isCenterAdmin || user?.role === 'SUPPORT_STAFF' || user?.role === 'ORGANIZER';
  const isAssessor = user?.role === 'ASSESSOR';

  const canOverride = hasPermission('result.override');
  const canLock = hasPermission('result.lock');

  const [results, setResults] = useState<Result[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [centerFilter, setCenterFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Selected Result for Inspection / Certificate
  const [viewingResult, setViewingResult] = useState<Result | null>(null);

  // Correction Modal State
  const [correctingResult, setCorrectingResult] = useState<Result | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    theoryScore: 0,
    practicalScore: 0,
    reason: '',
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const loadData = () => {
    const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
    const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    let filtered = allResults;

    if (isAssessor) {
      filtered = allResults.filter(r => r.assessorId === user?.id || r.assessorName === user?.name);
    } else if (isCenterScoped) {
      filtered = allResults.filter(r => r.centerId === userCenterId);
    } else if (isCountryAccount) {
      const countryCenterIds = new Set(allCenters.filter(c => c.countryId === userCountryId).map(c => c.id));
      filtered = allResults.filter(r => r.countryId === userCountryId || (r.centerId && countryCenterIds.has(r.centerId)));
    }

    setResults(filtered);
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    setCenters(allCenters);
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  };

  useEffect(() => {
    loadData();

    // Check URL query parameters
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const centerIdParam = params.get('centerId');
    if (centerIdParam) setCenterFilter(centerIdParam);

    if (idParam) {
      const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
      const found = allResults.find(r => r.id === idParam);
      if (found) setViewingResult(found);
    }
  }, [userCenterId, userCountryId, isCenterScoped, isCountryAccount, isAssessor]);

  // Metrics
  const totalCount = results.length;
  const passCount = results.filter(r => r.grade === 'PASS' || r.grade === 'DISTINCTION').length;
  const failCount = results.filter(r => r.grade === 'FAIL').length;
  const lockedCount = results.filter(r => r.status === 'LOCKED').length;
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  const handleOpenCorrection = (res: Result) => {
    if (!canOverride) {
      showToast(language === 'ar' ? 'غير مصرح: تعديل النتائج مقصور على مدراء المراكز ومدير النظام' : 'Unauthorized: Result correction is restricted to Center Admins and Super Admins', 'error');
      return;
    }
    setCorrectingResult(res);
    setCorrectionForm({
      theoryScore: res.theoryScore || 0,
      practicalScore: res.practicalScore || 0,
      reason: '',
    });
    setCorrectionError('');
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingResult) return;
    if (!canOverride) {
      showToast(language === 'ar' ? 'غير مصرح: تعديل النتائج مقصور على مدراء المراكز ومدير النظام' : 'Unauthorized: Result correction is restricted to Center Admins and Super Admins', 'error');
      return;
    }

    if (!correctionForm.reason.trim()) {
      setCorrectionError('Supervisory justification / rationale is mandatory for audit compliance.');
      return;
    }

    const newTheory = Number(correctionForm.theoryScore) || 0;
    const newPractical = Number(correctionForm.practicalScore) || 0;
    const newTotal = Math.round((newTheory * 0.3) + (newPractical * 0.7));
    const newGrade: 'DISTINCTION' | 'PASS' | 'FAIL' = newTotal >= 85 ? 'DISTINCTION' : (newTotal >= 60 ? 'PASS' : 'FAIL');

    const correctionEntry: ResultCorrection = {
      originalScore: correctingResult.score,
      updatedScore: newTotal,
      originalGrade: correctingResult.grade,
      updatedGrade: newGrade,
      reason: correctionForm.reason.trim(),
      changedBy: user?.name ? `${user.name} (${user.role})` : 'Center Administrator',
      changedAt: new Date().toISOString(),
    };

    const existingHistory = correctingResult.correctionHistory || [];

    const updated: Result = {
      ...correctingResult,
      theoryScore: newTheory,
      practicalScore: newPractical,
      score: newTotal,
      grade: newGrade,
      status: 'CORRECTED',
      correctionHistory: [correctionEntry, ...existingHistory],
    };

    StorageService.updateItem(STORAGE_KEYS.RESULTS, updated);

    // Synchronize corrected grade and status to candidate record
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const candIdx = allCandidates.findIndex(c => c.id === updated.candidateId || c.aproReference === updated.aproReference);
    if (candIdx >= 0) {
      allCandidates[candIdx] = {
        ...allCandidates[candIdx],
        resultStatus: (newGrade === 'PASS' || newGrade === 'DISTINCTION') ? 'PASS' : 'FAIL',
        status: 'COMPLETED',
      };
      StorageService.set(STORAGE_KEYS.CANDIDATES, allCandidates);
    }

    AuditService.log(
      'CORRECT_RESULT',
      'RESULT',
      `Administrative grade correction for candidate ${updated.candidateName} (${updated.aproReference}). Score changed from ${correctingResult.score}% (${correctingResult.grade}) to ${newTotal}% (${newGrade}). Rationale: ${correctionForm.reason}`,
      updated.id,
      'SUCCESS'
    );

    showToast('Result corrected and immutable audit trail updated', 'success');
    setCorrectingResult(null);
    loadData();
    if (viewingResult?.id === updated.id) setViewingResult(updated);
  };

  const handleToggleLock = (res: Result) => {
    if (!canLock) {
      showToast(language === 'ar' ? 'غير مصرح: القفل الرقابي صلاحية إدارية فقط' : 'Unauthorized: Regulatory lock toggling is restricted to authorized supervisors', 'error');
      return;
    }
    const nextStatus: 'LOCKED' | 'SUBMITTED' = res.status === 'LOCKED' ? 'SUBMITTED' : 'LOCKED';
    const updated: Result = { ...res, status: nextStatus };
    StorageService.updateItem(STORAGE_KEYS.RESULTS, updated);

    // Synchronize lock state to candidate record
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const candIdx = allCandidates.findIndex(c => c.id === res.candidateId || c.aproReference === res.aproReference);
    if (candIdx >= 0) {
      allCandidates[candIdx] = {
        ...allCandidates[candIdx],
        resultLocked: nextStatus === 'LOCKED',
      };
      StorageService.set(STORAGE_KEYS.CANDIDATES, allCandidates);
    }

    AuditService.log(
      'UPDATE',
      'RESULT',
      `${nextStatus === 'LOCKED' ? 'Enforced regulatory lock on' : 'Unlocked'} result record for candidate ${res.candidateName} (${res.aproReference})`,
      res.id,
      'SUCCESS'
    );
    showToast(nextStatus === 'LOCKED' ? 'Result locked against further edits' : 'Result unlocked for administrative review', 'info');
    loadData();
    if (viewingResult?.id === res.id) setViewingResult(updated);
  };

  const handleExportCSV = () => {
    const headers = ['Result ID', 'Candidate Name', 'APRO Reference', 'Occupation', 'Theory Score', 'Practical Score', 'Total Score', 'Grade', 'Lock Status', 'Certificate Number', 'Issued Date'];
    const rows = filtered.map(r => [
      r.id,
      `"${r.candidateName || ''}"`,
      r.aproReference || '',
      `"${r.occupation || ''}"`,
      r.theoryScore ?? '',
      r.practicalScore ?? '',
      r.score,
      r.grade,
      r.status,
      r.certificateNumber || '',
      r.issuedAt || r.submissionDate || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SkillAssess360_Results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AuditService.log('EXPORT', 'RESULT', `Exported ${filtered.length} assessment results to CSV`, undefined, 'SUCCESS');
    showToast('Results exported to CSV successfully', 'success');
  };

  const handlePrintCertificate = (res: Result) => {
    AuditService.log('PRINT', 'CERTIFICATE', `Simulated certificate print for candidate ${res.candidateName} (${res.certificateNumber || res.id})`, res.id, 'SUCCESS');
    showToast(`Digital certificate generated for ${res.candidateName}`, 'success');
    window.print();
  };

  const getCountryInfo = (countryId?: string) => {
    if (!countryId) return null;
    return countries.find(c => c.id === countryId) || null;
  };

  const getCenterInfo = (centerId?: string) => {
    if (!centerId) return null;
    return centers.find(c => c.id === centerId) || null;
  };

  const filtered = results.filter(r => {
    const nameMatch = (r.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const aproMatch = (r.aproReference || '').toLowerCase().includes(searchTerm.toLowerCase());
    const certMatch = (r.certificateNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const occMatch = (r.occupation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSearch = nameMatch || aproMatch || certMatch || occMatch;
    const matchesCountry = countryFilter === 'ALL' || r.countryId === countryFilter;
    const matchesCenter = centerFilter === 'ALL' || r.centerId === centerFilter;
    const matchesGrade = gradeFilter === 'ALL' || r.grade === gradeFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesCountry && matchesCenter && matchesGrade && matchesStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Result>[] = [
    {
      key: 'candidate',
      header: language === 'ar' ? 'المترشح' : 'Candidate',
      render: r => (
        <div>
          <button
            onClick={() => setViewingResult(r)}
            className="font-bold text-xs text-[#3F3030] hover:text-[#7A2E3A] block text-start transition-colors"
          >
            {r.candidateName || r.candidateId}
          </button>
        </div>
      ),
    },
    {
      key: 'occupation',
      header: language === 'ar' ? 'المهنة' : 'Occupation',
      render: r => (
        <span className="text-xs text-[#3F3030] font-medium">{r.occupation || '—'}</span>
      ),
    },
    {
      key: 'facility',
      header: language === 'ar' ? 'المركز والدولة' : 'Center & Country',
      render: r => {
        const cnt = getCountryInfo(r.countryId);
        const ctr = getCenterInfo(r.centerId);
        return (
          <div className="text-xs text-[#806F6F]">
            <span className="block font-medium text-[#3F3030]">
              {ctr ? (language === 'ar' ? ctr.nameAr : ctr.nameEn) : '—'}
            </span>
            <span className="text-[11px]">
              {cnt?.flagEmoji} {cnt ? (language === 'ar' ? cnt.nameAr : cnt.nameEn) : ''}
            </span>
          </div>
        );
      },
    },
    {
      key: 'scores',
      header: language === 'ar' ? 'الدرجات (نظري / عملي)' : 'Scores (Theory / Practical)',
      render: r => (
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#806F6F]">T: <span className="font-mono font-semibold text-[#3F3030]">{r.theoryScore ?? '—'}%</span></span>
            <span className="text-[#806F6F]">P: <span className="font-mono font-semibold text-[#3F3030]">{r.practicalScore ?? '—'}%</span></span>
          </div>
          <span className="text-[11px] font-bold text-[#7A2E3A] block mt-0.5">
            Total: {r.score}%
          </span>
        </div>
      ),
    },
    {
      key: 'grade',
      header: language === 'ar' ? 'النتيجة المعتمدة' : 'Official Grade',
      render: r => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
          r.grade === 'DISTINCTION'
            ? 'bg-[#FBF6E8] text-[#91702C] border border-[#C9A24D]/40'
            : r.grade === 'PASS'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {r.grade === 'DISTINCTION' && <Award className="w-3.5 h-3.5 text-[#C9A24D]" />}
          {r.grade === 'PASS' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
          {r.grade === 'FAIL' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
          <span>{r.grade}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'حالة القفل الرقابي' : 'Lock Governance',
      render: r => (
        <div>
          {r.status === 'LOCKED' ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#91702C] bg-[#FBF6E8] border border-[#C9A24D]/40 px-2.5 py-0.5 rounded-md">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'مقفل رقابياً' : 'LOCKED'}</span>
            </span>
          ) : r.status === 'CORRECTED' ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              <History className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'معدل إدارياً' : 'CORRECTED'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
              <Unlock className="w-3.5 h-3.5 text-stone-400" />
              <span>{r.status}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewingResult(r)}
            className="p-1.5 rounded text-[#7A2E3A] hover:text-[#5A222B] hover:bg-[#F8ECEE] transition-colors"
            title={language === 'ar' ? 'عرض الشهادة والنتيجة' : 'View Certificate'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canOverride && (
            <button
              type="button"
              onClick={() => handleOpenCorrection(r)}
              className="p-1.5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-50 transition-colors"
              title={language === 'ar' ? 'تعديل رقابي معتمد' : 'Administrative Correction'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {canLock && (
            <button
              type="button"
              onClick={() => handleToggleLock(r)}
              className={`p-1.5 rounded transition-colors ${
                r.status === 'LOCKED' 
                  ? 'text-[#C9A24D] hover:bg-[#FBF6E8]' 
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
              }`}
              title={r.status === 'LOCKED' ? (language === 'ar' ? 'فك القفل' : 'Unlock Record') : (language === 'ar' ? 'قفل رقابي' : 'Enforce Lock')}
            >
              {r.status === 'LOCKED' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePrintCertificate(r)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={language === 'ar' ? 'طباعة الشهادة' : 'Print Certificate'}
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={language === 'ar' ? 'إدارة النتائج والاعتماد الرقابي' : 'Results Management & Controlled Governance'}
        subtitle={language === 'ar' ? 'فحص النتائج الرسمية، الشهادات الرقمية، وإجراءات التعديل المحكومة بالتبرير الإشرافي' : 'Official assessment results verification, digital certification, and controlled administrative correction workflows'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'النتائج والشهادات' : 'Results & Verification' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
          <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'إجمالي النتائج المسجلة' : 'Total Evaluated'}</span>
          <span className="text-xl font-bold text-[#3F3030] block mt-0.5">{totalCount}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
          <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'الناجحون والمتميزون' : 'Passed / Distinction'}</span>
          <span className="text-xl font-bold text-emerald-700 block mt-0.5">{passCount}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
          <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'غير المجتازين' : 'Failed / Retake'}</span>
          <span className="text-xl font-bold text-rose-700 block mt-0.5">{failCount}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
          <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'نسبة النجاح العامة' : 'System Pass Rate'}</span>
          <span className="text-xl font-bold text-[#7A2E3A] block mt-0.5">{passRate}%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8D9D2] shadow-soft">
          <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'سجلات مقفلة رقابياً' : 'Locked Records'}</span>
          <span className="text-xl font-bold text-[#91702C] block mt-0.5">{lockedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-[#E8D9D2] rounded-xl shadow-soft">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={language === 'ar' ? 'بحث بالاسم أو المهنة...' : 'Search candidate, occupation...'}
            className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
          {!isCenterAdmin && !isAssessor && (
            <>
              {!isCountryAccount && (
                <select
                  value={countryFilter}
                  onChange={e => {
                    setCountryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
                >
                  <option value="ALL">{t.common.all} {t.countriesModule.title}</option>
                  {countries.map(cnt => (
                    <option key={cnt.id} value={cnt.id}>
                      {cnt.flagEmoji} {language === 'ar' ? cnt.nameAr : cnt.nameEn}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={centerFilter}
                onChange={e => {
                  setCenterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
              >
                <option value="ALL">{t.common.all} {t.centersModule.title}</option>
                {centers
                  .filter(ctr => !isCountryAccount || ctr.countryId === userCountryId)
                  .map(ctr => (
                    <option key={ctr.id} value={ctr.id}>
                      {ctr.code} - {language === 'ar' ? ctr.nameAr : ctr.nameEn}
                    </option>
                  ))}
              </select>
            </>
          )}

          <select
            value={gradeFilter}
            onChange={e => {
              setGradeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
          >
            <option value="ALL">{t.common.all} Grades</option>
            <option value="DISTINCTION">DISTINCTION</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
          >
            <option value="ALL">{t.common.all} Lock Status</option>
            <option value="LOCKED">LOCKED</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="CORRECTED">CORRECTED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={r => r.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Controlled Correction Modal */}
      {correctingResult && (
        <Modal
          isOpen={!!correctingResult}
          onClose={() => setCorrectingResult(null)}
          maxWidth="lg"
          icon={<Edit3 className="w-6 h-6 text-amber-600" />}
          title={language === 'ar' ? 'تعديل النتيجة الرقابي المحكوم' : 'Controlled Result Correction'}
          subtitle={language === 'ar' ? 'إجراء تعديل استثنائي يتطلب تبريراً إشرافياً إلزامياً وتوثيقاً في سجل التدقيق' : 'Administrative grade modification requiring mandatory rationale and audit trail logging'}
          infoNotice={language === 'ar' ? 'تخضع جميع التعديلات للرقابة الصارمة ويتم تسجيل هويات المشرفين والتوقيت الزمني بدقة.' : 'All grade adjustments are permanently preserved in the immutable audit log with full supervisor identity.'}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setCorrectingResult(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveCorrection} leftIcon={<Save className="w-4 h-4" />}>
                {language === 'ar' ? 'اعتماد التعديل وحفظ التبرير' : 'Authorize & Save Correction'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4">
            {/* Candidate & Current Status Banner */}
            <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sm text-[#3F3030] block">{correctingResult.candidateName}</span>
                  <span className="text-xs text-[#806F6F]">{correctingResult.occupation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#806F6F]">Current Total: <span className="font-bold text-[#7A2E3A]">{correctingResult.score}%</span></span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-700">{correctingResult.grade}</span>
                </div>
              </div>
            </div>

            {/* Score Inputs */}
            <div>
              <ModalSectionTitle title={language === 'ar' ? 'الدرجات المعدلة' : 'Adjusted Scores'} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label={language === 'ar' ? 'الدرجة النظرية المعدلة (%)' : 'Adjusted Theory Score (%)'}
                  type="number"
                  required
                  value={correctionForm.theoryScore}
                  onChange={e => setCorrectionForm({ ...correctionForm, theoryScore: Number(e.target.value) })}
                />
                <Input
                  label={language === 'ar' ? 'الدرجة العملية المعدلة (%)' : 'Adjusted Practical Score (%)'}
                  type="number"
                  required
                  value={correctionForm.practicalScore}
                  onChange={e => setCorrectionForm({ ...correctionForm, practicalScore: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Mandatory Supervisory Rationale */}
            <div className="pt-1">
              <ModalSectionTitle title={language === 'ar' ? 'التبرير الإشرافي الإلزامي' : 'Mandatory Supervisory Rationale'} />
              <div className="space-y-1.5">
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder={language === 'ar' ? 'اكتب سبب التعديل الإداري بالتفصيل (مثال: إعادة احتساب معيار عملي بناء على مراجعة شريط الاختبار الميداني)...' : 'State regulatory reason for correction (e.g., scoring transcription typo resolved after re-reviewing physical test rubric sheet)...'}
                  className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg p-2.5 focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
                />
                {correctionError && (
                  <p className="text-xs text-rose-600 font-medium">{correctionError}</p>
                )}
              </div>
            </div>

            {/* Previous Correction History (if any) */}
            {correctingResult.correctionHistory && correctingResult.correctionHistory.length > 0 && (
              <div className="pt-1">
                <ModalSectionTitle title={language === 'ar' ? 'سجل التعديلات السابقة' : 'Past Correction History'} />
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {correctingResult.correctionHistory.map((hist, idx) => (
                    <div key={idx} className="p-2.5 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[#806F6F]">
                        <span>{hist.changedBy}</span>
                        <span className="font-mono text-[11px]">{new Date(hist.changedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[#3F3030]">Score changed from <b>{hist.originalScore}%</b> to <b>{hist.updatedScore}%</b> ({hist.updatedGrade})</p>
                      <p className="text-[#806F6F] italic">"{hist.reason}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Digital Certificate Preview Modal */}
      {viewingResult && (
        <Modal
          isOpen={!!viewingResult}
          onClose={() => setViewingResult(null)}
          maxWidth="md"
          icon={<Award className="w-6 h-6 text-[#C9A24D]" />}
          title={language === 'ar' ? 'وثيقة تقييم الكفاءة المهنية' : 'Professional Competency Certificate'}
          subtitle={viewingResult.certificateNumber || `Ref: ${viewingResult.id}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={viewingResult.status === 'LOCKED' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleToggleLock(viewingResult)}
                leftIcon={viewingResult.status === 'LOCKED' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              >
                {viewingResult.status === 'LOCKED' ? (language === 'ar' ? 'فك القفل' : 'Unlock Record') : (language === 'ar' ? 'قفل رقابي' : 'Lock Record')}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const r = viewingResult;
                    setViewingResult(null);
                    handleOpenCorrection(r);
                  }}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'تعديل النتيجة' : 'Correct Result'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePrintCertificate(viewingResult)}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'طباعة الوثيقة' : 'Print Certificate'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Elegant Certificate Mockup Card */}
            <div className="p-5 bg-gradient-to-b from-[#FFFDF9] to-[#FBF6E8] border-2 border-[#C9A24D]/50 rounded-xl relative overflow-hidden shadow-soft text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FBF6E8] border border-[#C9A24D] flex items-center justify-center text-[#91702C]">
                <Award className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] tracking-widest uppercase text-[#91702C] font-semibold block">
                  SkillAssess 360 Digital Certification Authority
                </span>
                <h2 className="text-base font-bold text-[#3F3030] mt-0.5">
                  Certificate of Technical Competency
                </h2>
              </div>

              <div className="py-2 border-y border-[#C9A24D]/30">
                <span className="text-xs text-[#806F6F] block">This is to officially certify that</span>
                <span className="text-lg font-bold text-[#7A2E3A] block my-0.5">{viewingResult.candidateName}</span>
              </div>

              <div className="text-xs text-[#3F3030] space-y-0.5">
                <span className="text-[#806F6F] block">Has demonstrated accredited competence in</span>
                <span className="font-bold text-sm text-[#3F3030]">{viewingResult.occupation}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 bg-white/80 rounded border border-[#E8D9D2]">
                  <span className="text-[10px] text-[#806F6F] block">Theory</span>
                  <span className="font-bold text-[#3F3030]">{viewingResult.theoryScore ?? '—'}%</span>
                </div>
                <div className="p-2 bg-white/80 rounded border border-[#E8D9D2]">
                  <span className="text-[10px] text-[#806F6F] block">Practical</span>
                  <span className="font-bold text-[#3F3030]">{viewingResult.practicalScore ?? '—'}%</span>
                </div>
                <div className="p-2 bg-white/80 rounded border border-[#E8D9D2]">
                  <span className="text-[10px] text-[#806F6F] block">Grade</span>
                  <span className="font-bold text-[#7A2E3A]">{viewingResult.grade}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#806F6F] pt-2 font-mono">
                <span>Cert #: {viewingResult.certificateNumber || 'SA360-CERT-PENDING'}</span>
                <span>Date: {viewingResult.issuedAt || new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            {/* Lock Status Notice */}
            <div className="p-3 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {viewingResult.status === 'LOCKED' ? (
                  <ShieldCheck className="w-4 h-4 text-[#91702C]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span className="font-semibold text-[#3F3030]">
                  {viewingResult.status === 'LOCKED' ? 'Record is sealed under regulatory compliance lock.' : 'Record is currently open for administrative adjustment.'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#806F6F]">{viewingResult.status}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
