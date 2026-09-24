import React, { useState, useEffect } from 'react';
import { Plus, Layers, Calendar, Trash2, Search, Save, Eye, CheckCircle2, FileSpreadsheet, Clock, FileArchive, BarChart3, FileText } from 'lucide-react';
import { Batch, Center, Candidate } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { BatchEvaluationSummaryModal } from '../components/batches/BatchEvaluationSummaryModal';
import { BatchLiveProgressModal } from '../components/batches/BatchLiveProgressModal';
import { BatchEndOfDayReportModal } from '../components/batches/BatchEndOfDayReportModal';

export const BatchesPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const userCountryId = user?.countryId || 'cnt-sa';
  const isCountryAdmin = user?.role === 'COUNTRY_ADMIN' || user?.role === 'COUNTRY_ACCOUNT';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF' || user?.role === 'ORGANIZER';
  const isCenterScoped = isCenterAdmin || isSupportStaff;

  const [batches, setBatches] = useState<Batch[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
  const [evaluationSummaryBatch, setEvaluationSummaryBatch] = useState<Batch | null>(null);
  const [liveProgressBatch, setLiveProgressBatch] = useState<Batch | null>(null);
  const [endOfDayReportBatch, setEndOfDayReportBatch] = useState<Batch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    batchNumber: `BATCH-2026-0${Math.floor(10 + Math.random() * 90)}`,
    centerId: '',
    occupation: 'Electrical Installation',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:30 AM',
    releaseTime: '09:45 AM',
    status: 'ACTIVE' as any,
  });

  const loadData = () => {
    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const countryCenterIds = new Set(allCenters.filter(c => c.countryId === userCountryId).map(c => c.id));

    let filteredBatches = allBatches;
    let filteredCenters = allCenters;

    if (isCenterScoped) {
      filteredBatches = allBatches.filter(b => b.centerId === userCenterId);
      filteredCenters = allCenters.filter(c => c.id === userCenterId);
    } else if (isCountryAdmin) {
      filteredBatches = allBatches.filter(b => countryCenterIds.has(b.centerId));
      filteredCenters = allCenters.filter(c => c.countryId === userCountryId);
    }

    setBatches(filteredBatches);
    setCenters(filteredCenters);
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, userCountryId, isCenterScoped, isCountryAdmin]);

  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      batchNumber: `BATCH-2026-0${Math.floor(10 + Math.random() * 90)}`,
      centerId: isCenterAdmin ? userCenterId : (centers[0]?.id || ''),
      occupation: 'Electrical Installation',
      startDate: today,
      startTime: '10:30 AM',
      releaseTime: '09:45 AM',
      status: 'ACTIVE',
    });
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newBatchId = `bat-${Date.now()}`;
    const combinedDateTime = `${formData.startDate} ${formData.startTime}`.trim();
    const newBatch: Batch = {
      id: newBatchId,
      batchNumber: formData.batchNumber.trim(),
      centerId: isCenterAdmin ? userCenterId : formData.centerId,
      occupation: formData.occupation,
      candidateCount: 0, // Automatically derived from enrolled candidates
      startDate: formData.startDate,
      startTime: formData.startTime,
      releaseTime: formData.releaseTime,
      startDateTime: combinedDateTime,
      assessmentDate: formData.startDate,
      assessmentTime: formData.startTime,
      status: formData.status,
    };

    StorageService.updateItem(STORAGE_KEYS.BATCHES, newBatch);
    AuditService.log('CREATE_BATCH', 'BATCH', `Created batch ${newBatch.batchNumber} (${newBatch.occupation}) scheduled for ${combinedDateTime}`, newBatch.id);
    showToast(t.toasts.createdSuccess, 'success');
    setIsAddOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    StorageService.removeItem(STORAGE_KEYS.BATCHES, deleteId);
    AuditService.log('DELETE', 'BATCH', `Deleted batch record ${deleteId}`, deleteId);
    setDeleteId(null);
    showToast(t.toasts.deletedSuccess, 'success');
    loadData();
  };

  const filtered = batches.filter(b =>
    b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.occupation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Batch>[] = [
    {
      key: 'batchNumber',
      header: language === 'ar' ? 'رقم الدفعة' : 'Batch Number',
      render: b => (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#7A2E3A]" />
          <span className="font-mono font-semibold text-[#2C2623]">{b.batchNumber}</span>
        </div>
      ),
    },
    {
      key: 'occupation',
      header: language === 'ar' ? 'المهنة' : 'Occupation',
      render: b => <span className="font-medium text-[#2C2623]">{b.occupation}</span>,
    },
    {
      key: 'candidates',
      header: language === 'ar' ? 'عدد المرشحين' : 'Candidate Count',
      render: b => {
        const count = candidates.filter(c => c.batchId === b.id).length;
        return (
          <span className="text-xs font-semibold text-[#2C2623]">
            {count} {language === 'ar' ? 'مرشح' : 'candidates'}
          </span>
        );
      },
    },
    {
      key: 'duration',
      header: language === 'ar' ? 'تاريخ ووقت البدء' : 'Start Date & Time',
      render: b => (
        <span className="text-xs text-[#7C756D] font-mono flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#7A2E3A]" />
          <span>{b.startDate}</span>
          {b.startTime && <span className="font-semibold text-[#2C2623]">• {b.startTime}</span>}
        </span>
      ),
    },
    {
      key: 'releaseTime',
      header: language === 'ar' ? 'وقت تحرير القرعة' : 'Release Time',
      render: b => (
        <span className="text-xs font-mono font-bold text-[#A43950] flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#C9A24D]" />
          <span>{b.releaseTime || '09:45 AM'}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: t.common.status,
      render: b => <StatusBadge status={b.status} />,
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: b => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEndOfDayReportBatch(b);
              AuditService.log('VIEW', 'BATCH_EOD_REPORT', `Opened End-of-Day report for batch ${b.batchNumber}`, b.id);
            }}
            className="p-1.5 px-2 rounded text-xs font-medium text-[#91702C] hover:bg-[#FBF6E8] border border-[#E8D9D2] transition-colors inline-flex items-center gap-1"
            title={language === 'ar' ? 'التقرير النهائي اليومي للدفعة' : 'End-of-Day Batch Final Report'}
          >
            <FileText className="w-3.5 h-3.5 text-[#C9A24D]" />
            <span className="hidden md:inline">{language === 'ar' ? 'تقرير الختام' : 'EOD Report'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate(`/reservations?tab=import&batchId=${b.id}`)}
            className="p-1.5 px-2 rounded text-xs font-medium text-[#7A2E3A] hover:bg-[#F8ECEE] border border-[#E8D9D2] transition-colors inline-flex items-center gap-1"
            title={language === 'ar' ? 'استيراد الحجوزات للدفعة' : 'Import Reservations'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#7A2E3A]" />
            <span className="hidden lg:inline">{language === 'ar' ? 'استيراد' : 'Import'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEvaluationSummaryBatch(b);
              AuditService.log('VIEW', 'BATCH_EVALUATION_SUMMARY', `Opened batch evaluation summary modal for ${b.batchNumber}`, b.id);
            }}
            className="p-1.5 px-2 rounded text-xs font-medium text-[#7A2E3A] hover:bg-[#F8ECEE] border border-[#E8D9D2] transition-colors inline-flex items-center gap-1"
            title={language === 'ar' ? 'حزمة الأدلة والتقييم' : 'Assessment Evidence & Evaluation Package'}
          >
            <FileArchive className="w-3.5 h-3.5 text-[#7A2E3A]" />
            <span className="hidden lg:inline">{language === 'ar' ? 'الأدلة' : 'Evidence'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewingBatch(b);
              AuditService.log('VIEW', 'BATCH', `Viewed batch dossier for ${b.batchNumber} (${b.occupation})`, b.id);
            }}
            className="p-1.5 rounded text-[#7C756D] hover:text-[#2C2623] hover:bg-[#FAF8F5] transition-colors"
            title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isSupportStaff && (
            <button
              type="button"
              onClick={() => setDeleteId(b.id)}
              className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title={t.common.delete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.nav.batches}
        subtitle="Manage candidate groups, delivery schedules, and session milestones"
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.nav.batches },
        ]}
        actions={
          !isSupportStaff ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Batch
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-white border border-borderlight rounded-lg shadow-soft">
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
            placeholder="Search batch number or occupation..."
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={b => b.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Add Batch Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="lg"
        title="Create New Batch"
        icon={<Layers className="w-6 h-6" />}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setIsAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
              Save Batch
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-6">
          <ModalSectionTitle title={language === 'ar' ? 'بيانات الدفعة والمركز' : 'Batch Identification'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={language === 'ar' ? 'رقم الدفعة' : 'Batch Number'}
              required
              value={formData.batchNumber}
              onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
            />
            {isCenterAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                  {language === 'ar' ? 'المركز المخصص' : 'Assessment Center'}
                </label>
                <div className="px-3 py-2 text-sm bg-[#FAF8F5] border border-[#D5D0C7] rounded-lg text-[#5C554E] font-medium">
                  {centers.find(c => c.id === userCenterId)?.nameEn || 'Riyadh Central Technical Hub'}
                </div>
              </div>
            ) : (
              <Select
                label="Assessment Center"
                value={formData.centerId}
                onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                options={centers.map(c => ({ value: c.id, label: c.nameEn }))}
              />
            )}
          </div>

          <ModalSectionTitle title={language === 'ar' ? 'المهنة التخصصية' : 'Occupation Specialization'} />
          <div>
            <Select
              label={language === 'ar' ? 'المهنة' : 'Occupation'}
              value={formData.occupation}
              onChange={e => setFormData({ ...formData, occupation: e.target.value })}
              options={[
                { value: 'Electrical Installation', label: 'Electrical Installation' },
                { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                { value: 'BMS Automation', label: 'BMS Automation' },
                { value: 'Warehouse Worker', label: 'Warehouse Worker' },
                { value: 'Plumbing & Sanitary Works', label: 'Plumbing & Sanitary Works' },
              ]}
            />
          </div>

          <ModalSectionTitle title={language === 'ar' ? 'موعد انطلاق الدفعة' : 'Batch Assessment Schedule'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <Input
                label={language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C2623] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#7A2E3A]" />
                <span>{language === 'ar' ? 'الوقت' : 'Time'}</span>
                <span className="text-[10px] text-[#7C756D] font-normal">(HH:MM AM/PM)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="10:30 AM"
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A] font-mono"
                />
                <select
                  value={formData.startTime.toUpperCase().includes('PM') ? 'PM' : 'AM'}
                  onChange={e => {
                    const cleanTime = formData.startTime.replace(/\s*(AM|PM)/gi, '').trim() || '10:30';
                    setFormData({ ...formData, startTime: `${cleanTime} ${e.target.value}` });
                  }}
                  className="px-2.5 py-2 text-sm bg-[#FAF8F5] border border-[#D5D0C7] rounded-lg text-[#2C2623] font-semibold cursor-pointer"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <ModalSectionTitle title={language === 'ar' ? 'وقت تحرير قرعة وتكليف المقيمين' : 'Assessor Assignment Release Time'} />
          <div>
            <label className="block text-xs font-semibold text-[#2C2623] mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#A43950]" />
              <span>{language === 'ar' ? 'وقت تحرير التكليف (المقيم)' : 'Release Time (e.g. 09:45 AM)'}</span>
              <span className="text-[10px] text-[#7C756D] font-normal">({language === 'ar' ? 'يحجب التكليف حتى يحين الوقت' : 'Concealed before release time'})</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="09:45 AM"
                value={formData.releaseTime}
                onChange={e => setFormData({ ...formData, releaseTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A] font-mono font-bold text-[#A43950]"
              />
              <select
                value={formData.releaseTime.toUpperCase().includes('PM') ? 'PM' : 'AM'}
                onChange={e => {
                  const cleanTime = formData.releaseTime.replace(/\s*(AM|PM)/gi, '').trim() || '09:45';
                  setFormData({ ...formData, releaseTime: `${cleanTime} ${e.target.value}` });
                }}
                className="px-2.5 py-2 text-sm bg-[#FAF8F5] border border-[#D5D0C7] rounded-lg text-[#2C2623] font-semibold cursor-pointer"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <p className="text-[11px] text-[#7C756D] mt-1">
              {language === 'ar' 
                ? 'وفقاً لضوابط مكافحة الانحياز، تظل قوائم المرشحين محجوبة عن واجهة المقيم حتى يحين وقت التحرير المحدد.'
                : 'Under blind anti-bias rules, candidate allocations remain concealed on the assessor interface until this exact release time.'}
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Batch?"
        message="Are you sure you want to remove this batch record?"
      />

      {/* View Batch Modal */}
      {viewingBatch && (
        <Modal
          isOpen={true}
          onClose={() => setViewingBatch(null)}
          title={language === 'ar' ? 'تفاصيل الدفعة ومسار الإنجاز' : 'Cohort Progress & Dossier'}
          maxWidth="md"
          footer={
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingBatch(null)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2C2623]">{viewingBatch.batchNumber}</h4>
                  <p className="text-xs text-[#7C756D]">{viewingBatch.occupation}</p>
                </div>
              </div>
              <StatusBadge status={viewingBatch.status} />
            </div>

            {(() => {
              const batchCandidates = candidates.filter(c => c.batchId === viewingBatch.id);
              const cbtCompleted = batchCandidates.filter(c => c.cbtStatus === 'COMPLETED').length;
              const practicalCompleted = batchCandidates.filter(c => c.practicalStatus === 'COMPLETED').length;
              const resultsLocked = batchCandidates.filter(c => c.resultLocked).length;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                      <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'المرشحون بالدفعة' : 'Registered Cohort'}</div>
                      <div className="font-semibold text-[#2C2623]">{batchCandidates.length} {language === 'ar' ? 'مرشح' : 'candidates'}</div>
                    </div>
                    <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                      <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'موعد البدء' : 'Start Schedule'}</div>
                      <div className="font-semibold text-[#2C2623] font-mono">{viewingBatch.startDate} {viewingBatch.startTime ? `• ${viewingBatch.startTime}` : ''}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] space-y-2">
                    <div className="text-xs font-bold text-[#2C2623]">{language === 'ar' ? 'مؤشرات الإنجاز الميداني للدفعة' : 'Batch Milestone Metrics'}</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-white border border-[#D5D0C7]">
                        <div className="text-blue-700 font-bold text-base">{cbtCompleted}</div>
                        <div className="text-[10px] text-[#7C756D]">{language === 'ar' ? 'اختبار CBT' : 'CBT Passed'}</div>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#D5D0C7]">
                        <div className="text-amber-800 font-bold text-base">{practicalCompleted}</div>
                        <div className="text-[10px] text-[#7C756D]">{language === 'ar' ? 'الورش العملية' : 'Practicals'}</div>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#D5D0C7]">
                        <div className="text-[#7A2E3A] font-bold text-base">{resultsLocked}</div>
                        <div className="text-[10px] text-[#7C756D]">{language === 'ar' ? 'النتائج المقفلة' : 'Locked Results'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Cohort Candidates List */}
                  <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC] space-y-2">
                    <div className="text-xs font-bold text-[#2C2623] flex items-center justify-between">
                      <span>{language === 'ar' ? 'قائمة مرشحي الدفعة' : 'Enrolled Candidates in Cohort'}</span>
                      <span className="text-[10px] text-[#7C756D] font-mono">({batchCandidates.length})</span>
                    </div>
                    {batchCandidates.length === 0 ? (
                      <div className="text-[11px] text-[#7C756D] py-2 text-center">
                        {language === 'ar' ? 'لا يوجد مرشحون مسجلون في هذه الدفعة بعد.' : 'No candidates registered in this cohort yet.'}
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto divide-y divide-[#E8E4DC]">
                        {batchCandidates.map(c => (
                          <div key={c.id} className="py-1.5 flex items-center justify-between text-xs">
                            <div className="truncate max-w-[180px]">
                              <span className="font-semibold text-[#2C2623] block truncate">
                                {language === 'ar' ? c.fullNameAr : c.fullNameEn}
                              </span>
                              <span className="text-[10px] font-mono text-[#7C756D]">
                                {c.passportNumber}
                              </span>
                            </div>
                            <StatusBadge status={c.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Batch Evaluation Summary & Evidence Package Modal */}
      <BatchEvaluationSummaryModal
        isOpen={Boolean(evaluationSummaryBatch)}
        onClose={() => {
          setEvaluationSummaryBatch(null);
          loadData();
        }}
        batch={evaluationSummaryBatch}
        candidates={candidates}
        centers={centers}
      />

      {/* Batch Live Progression & Photos Modal */}
      <BatchLiveProgressModal
        isOpen={Boolean(liveProgressBatch)}
        onClose={() => {
          setLiveProgressBatch(null);
          loadData();
        }}
        batch={liveProgressBatch}
        candidates={candidates}
      />

      {/* End-of-Day Batch Final Report Modal */}
      <BatchEndOfDayReportModal
        isOpen={Boolean(endOfDayReportBatch)}
        onClose={() => {
          setEndOfDayReportBatch(null);
          loadData();
        }}
        batch={endOfDayReportBatch}
        candidates={candidates}
        center={centers.find(c => c.id === endOfDayReportBatch?.centerId) || centers[0] || null}
      />
    </div>
  );
};
