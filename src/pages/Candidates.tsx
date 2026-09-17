import React, { useState, useEffect } from 'react';
import { Eye, Plus, Search, Filter, UserCheck, Award, UserPlus, Save, User, Camera, Wrench, Lock, CheckCircle2 } from 'lucide-react';
import { Candidate, Center, Batch } from '../types';
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
import { Pagination } from '../components/ui/Pagination';

export interface CandidatesPageProps {
  onNavigate?: (path: string) => void;
}

export const CandidatesPage: React.FC<CandidatesPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF';
  const isCenterScoped = isCenterAdmin || isSupportStaff;

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullNameEn: '',
    fullNameAr: '',
    passportNumber: '',
    aproReference: '',
    nationalId: '',
    occupation: 'Electrical Installation',
    centerId: '',
    batchId: '',
    status: 'REGISTERED' as any,
  });

  const loadData = () => {
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const filtered = isCenterScoped 
      ? allCandidates.filter(c => c.centerId === userCenterId)
      : allCandidates;
    setCandidates(filtered);
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setBatches(StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []));
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, isCenterScoped]);

  const handleOpenAdd = () => {
    setFormData({
      fullNameEn: '',
      fullNameAr: '',
      passportNumber: `P${Math.floor(1000000 + Math.random() * 9000000)}`,
      aproReference: `APRO-SA-${Math.floor(10000 + Math.random() * 90000)}`,
      nationalId: `199${Math.floor(1000000 + Math.random() * 9000000)}`,
      occupation: 'Electrical Installation',
      centerId: centers[0]?.id || '',
      batchId: batches[0]?.id || '',
      status: 'REGISTERED',
    });
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullNameEn.trim() || !formData.passportNumber.trim()) {
      showToast('Please fill required candidate information', 'error');
      return;
    }

    const newCandidate: Candidate = {
      id: `can-${Date.now()}`,
      fullNameEn: formData.fullNameEn.trim(),
      fullNameAr: formData.fullNameAr.trim() || formData.fullNameEn.trim(),
      passportNumber: formData.passportNumber.trim().toUpperCase(),
      aproReference: formData.aproReference.trim().toUpperCase(),
      nationalId: formData.nationalId.trim(),
      occupation: formData.occupation,
      countryId: 'cnt-sa',
      centerId: isCenterAdmin ? userCenterId : formData.centerId,
      batchId: formData.batchId,
      status: formData.status,
      registeredAt: new Date().toISOString(),
    };

    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, newCandidate);
    AuditService.log('CREATE_CANDIDATE', 'CANDIDATE', `Enrolled candidate ${newCandidate.fullNameEn} (${newCandidate.aproReference})`, newCandidate.id);
    showToast(t.toasts.createdSuccess, 'success');
    setIsAddOpen(false);
    loadData();
  };

  const filtered = candidates.filter(c => {
    const matchesSearch =
      c.fullNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fullNameAr.includes(searchTerm) ||
      c.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.aproReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.occupation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Candidate>[] = [
    {
      key: 'name',
      header: t.candidatesModule.fullName,
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: t.candidatesModule.passport,
      render: c => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#2C2623] block">
            {c.passportNumber}
          </span>
          <span className="text-[11px] text-[#7C756D] font-mono">
            {c.aproReference}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => {
        const batch = batches.find(b => b.id === c.batchId);
        return (
          <span className="font-mono text-xs text-[#7A2E3A] font-semibold">
            {batch ? batch.batchNumber : c.batchId}
          </span>
        );
      },
    },
    {
      key: 'occupation',
      header: t.candidatesModule.occupation,
      render: c => (
        <span className="text-xs font-medium text-[#2C2623] truncate max-w-[160px] block">
          {c.occupation}
        </span>
      ),
    },
    {
      key: 'photoStatus',
      header: language === 'ar' ? 'الصورة' : 'Photo Status',
      render: c => (
        c.photoUrl ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Required
          </span>
        )
      ),
    },
    {
      key: 'status',
      header: t.candidatesModule.assessmentStatus,
      render: c => <StatusBadge status={c.status} />,
    },
    {
      key: 'result',
      header: t.candidatesModule.result,
      render: c => (
        c.resultStatus ? (
          <StatusBadge status={c.resultStatus} />
        ) : (
          <span className="text-[#7C756D] text-xs">—</span>
        )
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7C756D] hover:text-[#2C2623] hover:bg-[#FAF8F5] transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.common.view}</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.candidatesModule.title}
        subtitle={t.candidatesModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.candidatesModule.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('/candidate-photos')}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              {language === 'ar' ? 'معرض الصور' : 'Photo Gallery'}
            </Button>
            {isCenterAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate?.('/enrollment')}
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'التسجيل والبصمة' : 'Enrollment Desk'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAdd}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'إضافة مرشح' : 'Register Candidate'}
                </Button>
              </>
            )}
            {!isCenterAdmin && !isSupportStaff && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {language === 'ar' ? 'إضافة مرشح' : 'Register Candidate'}
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Search */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-borderlight rounded-lg shadow-soft">
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
            placeholder="Search passport, APRO ref, candidate name..."
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-borderlight rounded-md py-1.5 px-2.5 focus:outline-none focus:border-maroon-700 text-stone-700"
          >
            <option value="ALL">{t.common.all} {t.common.status}</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="IN_ASSESSMENT">IN ASSESSMENT</option>
            <option value="EVALUATED">EVALUATED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={c => c.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Candidate View Modal */}
      {viewCandidate && (
        <Modal
          isOpen={!!viewCandidate}
          onClose={() => setViewCandidate(null)}
          maxWidth="md"
          icon={<User className="w-6 h-6" />}
          title={language === 'ar' ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}
          subtitle={`APRO Ref: ${viewCandidate.aproReference}`}
          footer={
            <div className="flex items-center justify-between w-full">
              {isSupportStaff && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    AuditService.log(
                      'CANDIDATE_VERIFICATION',
                      'CANDIDATE',
                      `Support Staff verified identity match for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber})`,
                      viewCandidate.id
                    );
                    showToast(
                      language === 'ar'
                        ? 'تم التحقق من هوية المرشح ومطابقة الجواز بنجاح'
                        : 'Candidate identity verified against passport record.',
                      'success'
                    );
                  }}
                >
                  {language === 'ar' ? 'تأكيد مطابقة الهوية والجواز' : 'Verify Passport Match'}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setViewCandidate(null)} className="ms-auto">
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header with Photo & Key IDs */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
              <div className="w-16 h-16 rounded-xl border border-[#D5D0C7] overflow-hidden bg-white shrink-0">
                {viewCandidate.photoUrl ? (
                  <img src={viewCandidate.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center font-bold text-xl">
                    {viewCandidate.fullNameEn.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-base text-[#2C2623]">
                  {language === 'ar' ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}
                </div>
                <div className="text-xs text-[#7C756D] mt-0.5">
                  {viewCandidate.occupation}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={viewCandidate.status} />
                  {viewCandidate.resultLocked && (
                    <span className="text-[11px] font-bold text-[#7A2E3A] bg-[#7A2E3A]/10 px-2 py-0.5 rounded border border-[#7A2E3A]/30 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {language === 'ar' ? 'مقفل رسمياً' : 'Result Locked'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <ModalSectionTitle title={language === 'ar' ? 'بيانات الهوية والجواز' : 'Identity & Passport Details'} />
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC] text-xs">
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'رقم الجواز' : 'Passport Number'}</span>
                  <span className="font-mono font-semibold text-[#2C2623]">{viewCandidate.passportNumber}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'الهوية الوطنية' : 'National ID'}</span>
                  <span className="font-mono font-semibold text-[#2C2623]">{viewCandidate.nationalId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'المركز المعين' : 'Assigned Center'}</span>
                  <span className="font-mono font-medium text-[#2C2623]">{viewCandidate.centerId}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'الدفعة' : 'Assigned Batch'}</span>
                  <span className="font-mono font-medium text-[#2C2623]">{viewCandidate.batchId}</span>
                </div>
              </div>
            </div>

            {/* Practical Task Lottery & Assessment Progress */}
            <div>
              <ModalSectionTitle title={language === 'ar' ? 'القرعة العملية واختبار CBT' : 'Practical Task Lottery & CBT Telemetry'} />
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] text-xs">
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'المهمة العملية المقترعة' : 'Lottery Practical Task'}</span>
                  <div className="font-semibold text-[#2C2623]">
                    {viewCandidate.assignedTaskId || (language === 'ar' ? 'بانتظار السحب' : 'Pending Allocation')}
                  </div>
                  {viewCandidate.taskDifficulty && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                      {viewCandidate.taskDifficulty}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'المنصة / الورشة' : 'Workstation Bay'}</span>
                  <div className="font-mono font-bold text-[#2C2623]">
                    {viewCandidate.assignedBay || (language === 'ar' ? 'غير معين' : 'Unassigned')}
                  </div>
                  <span className="text-[10px] text-[#7C756D]">
                    {viewCandidate.practicalStatus || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'حالة اختبار CBT' : 'CBT Examination'}</span>
                  <div className="font-semibold text-[#2C2623]">
                    {viewCandidate.cbtScore ? `${viewCandidate.cbtScore}% (${viewCandidate.cbtStatus})` : (viewCandidate.cbtStatus || 'PENDING')}
                  </div>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'النتيجة النهائية' : 'Final Competency Result'}</span>
                  <span className="font-semibold text-[#7A2E3A]">
                    {viewCandidate.resultStatus || 'IN_PROGRESS'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#7C756D] px-1">
              {language === 'ar' ? 'تاريخ التسجيل بالمنظومة:' : 'Registered in system:'} {new Date(viewCandidate.registeredAt).toLocaleString()}
            </div>
          </div>
        </Modal>
      )}

      {/* Register Candidate Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="lg"
        icon={<UserPlus className="w-6 h-6" />}
        title="Register New Candidate"
        subtitle="Enroll a candidate into the digital assessment registry"
        infoNotice="Candidate data will be synchronized with biometric examination registry."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              Enroll Candidate
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <ModalSectionTitle title="Candidate Identification" />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Full Name (English)"
                  required
                  value={formData.fullNameEn}
                  onChange={e => setFormData({ ...formData, fullNameEn: e.target.value })}
                  placeholder="e.g. Tariq Mahmood"
                />
                <Input
                  label="Full Name (Arabic)"
                  dir="rtl"
                  value={formData.fullNameAr}
                  onChange={e => setFormData({ ...formData, fullNameAr: e.target.value })}
                  placeholder="مثال: طارق محمود"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  label="Passport Number"
                  required
                  value={formData.passportNumber}
                  onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                />
                <Input
                  label="APRO Reference"
                  required
                  value={formData.aproReference}
                  onChange={e => setFormData({ ...formData, aproReference: e.target.value })}
                />
                <Input
                  label="National ID"
                  value={formData.nationalId}
                  onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Assessment Scope & Assignment" />
            <div className="space-y-3.5">
              <Select
                label="Target Occupation"
                required
                value={formData.occupation}
                onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                options={[
                  { value: 'Electrical Installation', label: 'Electrical Installation' },
                  { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                  { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                  { value: 'BMS Automation', label: 'BMS Automation' },
                  { value: 'Plumbing', label: 'Plumbing' },
                ]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    required
                    value={formData.centerId}
                    onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                    options={centers.map(c => ({
                      value: c.id,
                      label: `${c.code} - ${language === 'ar' ? c.nameAr : c.nameEn}`,
                    }))}
                  />
                )}
                <Select
                  label="Candidate Batch"
                  required
                  value={formData.batchId}
                  onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                  options={batches.map(b => ({
                    value: b.id,
                    label: `${b.batchNumber} (${b.occupation})`,
                  }))}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
