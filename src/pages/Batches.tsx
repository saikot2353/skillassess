import React, { useState, useEffect } from 'react';
import { Plus, Layers, Calendar, Trash2, Search, Save, Eye, CheckCircle2 } from 'lucide-react';
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

export const BatchesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF';
  const isCenterScoped = isCenterAdmin || isSupportStaff;

  const [batches, setBatches] = useState<Batch[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    batchNumber: `BATCH-2026-0${Math.floor(10 + Math.random() * 90)}`,
    centerId: '',
    occupation: 'Electrical Installation',
    candidateCount: 25,
    startDate: '2026-09-20',
    endDate: '2026-09-30',
    status: 'ACTIVE' as any,
  });

  const loadData = () => {
    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const filtered = isCenterScoped 
      ? allBatches.filter(b => b.centerId === userCenterId)
      : allBatches;
    setBatches(filtered);
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, isCenterScoped]);

  const handleOpenAdd = () => {
    setFormData({
      batchNumber: `BATCH-2026-0${Math.floor(10 + Math.random() * 90)}`,
      centerId: isCenterAdmin ? userCenterId : (centers[0]?.id || ''),
      occupation: 'Electrical Installation',
      candidateCount: 25,
      startDate: '2026-09-20',
      endDate: '2026-09-30',
      status: 'ACTIVE',
    });
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newBatch: Batch = {
      id: `bat-${Date.now()}`,
      batchNumber: formData.batchNumber.trim(),
      centerId: isCenterAdmin ? userCenterId : formData.centerId,
      occupation: formData.occupation,
      candidateCount: Number(formData.candidateCount) || 20,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status,
    };

    StorageService.updateItem(STORAGE_KEYS.BATCHES, newBatch);
    AuditService.log('CREATE_BATCH', 'BATCH', `Created batch ${newBatch.batchNumber} (${newBatch.occupation})`, newBatch.id);
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
      render: b => (
        <span className="text-xs font-semibold text-[#2C2623]">
          {b.candidateCount} {language === 'ar' ? 'مرشح' : 'candidates'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: language === 'ar' ? 'الفترة' : 'Window Dates',
      render: b => (
        <span className="text-xs text-[#7C756D] font-mono">
          {b.startDate} → {b.endDate}
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
        <div className="flex items-center justify-end gap-1">
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
        subtitle="Group candidate cohorts for assessment execution"
        icon={<Layers className="w-6 h-6" />}
        infoNotice="Candidates in this batch will be assigned to testing shifts sequentially."
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

          <ModalSectionTitle title={language === 'ar' ? 'المهنة وسعة الدفعة' : 'Occupation & Capacity'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={language === 'ar' ? 'المهنة' : 'Occupation'}
              value={formData.occupation}
              onChange={e => setFormData({ ...formData, occupation: e.target.value })}
              options={[
                { value: 'Electrical Installation', label: 'Electrical Installation' },
                { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                { value: 'BMS Automation', label: 'BMS Automation' },
              ]}
            />
            <Input
              label={language === 'ar' ? 'عدد المرشحين' : 'Candidate Count'}
              type="number"
              value={formData.candidateCount}
              onChange={e => setFormData({ ...formData, candidateCount: Number(e.target.value) })}
            />
          </div>

          <ModalSectionTitle title={language === 'ar' ? 'الجدول الزمني للدفعة' : 'Cohort Timeline'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label={language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            />
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
                      <div className="font-semibold text-[#2C2623]">{batchCandidates.length} / {viewingBatch.candidateCount}</div>
                    </div>
                    <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                      <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'الفترة الزمنية' : 'Testing Window'}</div>
                      <div className="font-semibold text-[#2C2623] font-mono">{viewingBatch.startDate} → {viewingBatch.endDate}</div>
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
                                {c.passportNumber} • {c.aproReference}
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
    </div>
  );
};
