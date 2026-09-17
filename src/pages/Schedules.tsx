import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Trash2, Search, CalendarCheck, Save, Eye, Building2 } from 'lucide-react';
import { Schedule, Center } from '../types';
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

export const SchedulesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: `SCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    centerId: '',
    occupation: 'Electrical Installation',
    date: '2026-09-22',
    timeSlot: '09:00 - 13:00',
    totalSeats: 25,
    status: 'SCHEDULED' as any,
  });

  const loadData = () => {
    const allSchedules = StorageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    const filtered = isCenterAdmin 
      ? allSchedules.filter(s => s.centerId === userCenterId)
      : allSchedules;
    setSchedules(filtered);
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, isCenterAdmin]);

  const handleOpenAdd = () => {
    setFormData({
      code: `SCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      centerId: isCenterAdmin ? userCenterId : (centers[0]?.id || ''),
      occupation: 'Electrical Installation',
      date: '2026-09-22',
      timeSlot: '09:00 - 13:00',
      totalSeats: 25,
      status: 'SCHEDULED',
    });
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: Schedule = {
      id: `sch-${Date.now()}`,
      code: formData.code.trim(),
      centerId: isCenterAdmin ? userCenterId : formData.centerId,
      countryId: 'cnt-sa',
      occupation: formData.occupation,
      date: formData.date,
      timeSlot: formData.timeSlot,
      totalSeats: Number(formData.totalSeats) || 20,
      assignedCandidates: 0,
      status: formData.status,
      createdAt: new Date().toISOString(),
    };

    StorageService.updateItem(STORAGE_KEYS.SCHEDULES, newSchedule);
    AuditService.log('CREATE_SCHEDULE', 'SCHEDULE', `Created assessment schedule ${newSchedule.code} for ${newSchedule.occupation}`, newSchedule.id);
    showToast(t.toasts.createdSuccess, 'success');
    setIsAddOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    StorageService.removeItem(STORAGE_KEYS.SCHEDULES, deleteId);
    AuditService.log('DELETE', 'SCHEDULE', `Deleted schedule record ${deleteId}`, deleteId);
    setDeleteId(null);
    showToast(t.toasts.deletedSuccess, 'success');
    loadData();
  };

  const filtered = schedules.filter(s =>
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.date.includes(searchTerm)
  );

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Schedule>[] = [
    {
      key: 'code',
      header: language === 'ar' ? 'رمز الموعد' : 'Schedule Code',
      render: s => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7A2E3A]" />
          <span className="font-mono font-semibold text-[#2C2623]">{s.code}</span>
        </div>
      ),
    },
    {
      key: 'occupation',
      header: language === 'ar' ? 'المهنة' : 'Occupation',
      render: s => <span className="font-medium text-[#2C2623]">{s.occupation}</span>,
    },
    {
      key: 'date',
      header: language === 'ar' ? 'التاريخ والفترة' : 'Date & Time Slot',
      render: s => (
        <div>
          <span className="font-medium text-[#2C2623] block">{s.date}</span>
          <span className="text-[11px] text-[#7C756D] font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" /> {s.timeSlot}
          </span>
        </div>
      ),
    },
    {
      key: 'seats',
      header: language === 'ar' ? 'المعينون / السعة' : 'Assigned / Capacity',
      render: s => (
        <span className="text-xs font-semibold text-[#2C2623]">
          {s.assignedCandidates} / {s.totalSeats} {language === 'ar' ? 'مقعد' : 'seats'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.common.status,
      render: s => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: s => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewingSchedule(s)}
            className="p-1.5 rounded text-[#7C756D] hover:text-[#2C2623] hover:bg-[#FAF8F5] transition-colors"
            title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(s.id)}
            className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title={t.common.delete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.nav.schedules}
        subtitle="Manage testing day capacity, occupation shifts, and candidate allocations"
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.nav.schedules },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Schedule Slot
          </Button>
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
            placeholder="Search schedule code or occupation..."
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={s => s.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Add Schedule Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="lg"
        title="Create Schedule Slot"
        subtitle="Reserve assessment capacity and time window"
        icon={<CalendarCheck className="w-6 h-6" />}
        infoNotice="Assessor allocation will be scheduled according to lottery integrity rules."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setIsAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
              Save Schedule
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-6">
          <ModalSectionTitle title={language === 'ar' ? 'بيانات الموعد والمركز' : 'Slot Identification'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={language === 'ar' ? 'رمز الموعد' : 'Schedule Code'}
              required
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
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

          <ModalSectionTitle title="Session Time & Occupation" />
          <Select
            label="Occupation"
            value={formData.occupation}
            onChange={e => setFormData({ ...formData, occupation: e.target.value })}
            options={[
              { value: 'Electrical Installation', label: 'Electrical Installation' },
              { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
              { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
              { value: 'BMS Automation', label: 'BMS Automation' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
            <Input
              label="Time Slot"
              required
              value={formData.timeSlot}
              onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
              placeholder="09:00 - 13:00"
            />
          </div>

          <ModalSectionTitle title="Capacity Allocation" />
          <Input
            label="Total Capacity Seats"
            type="number"
            value={formData.totalSeats}
            onChange={e => setFormData({ ...formData, totalSeats: Number(e.target.value) })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Schedule?"
        message="Are you sure you want to remove this assessment schedule slot?"
      />

      {/* View Schedule Modal */}
      {viewingSchedule && (
        <Modal
          isOpen={true}
          onClose={() => setViewingSchedule(null)}
          title={language === 'ar' ? 'تفاصيل موعد التقييم' : 'Assessment Schedule Dossier'}
          maxWidth="md"
          footer={
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingSchedule(null)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2C2623]">{viewingSchedule.code}</h4>
                  <p className="text-xs text-[#7C756D]">{viewingSchedule.occupation}</p>
                </div>
              </div>
              <StatusBadge status={viewingSchedule.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'التاريخ المحدد' : 'Assessment Date'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingSchedule.date}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'الفترة الزمنية' : 'Time Window'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingSchedule.timeSlot}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'السعة الكلية' : 'Total Capacity'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingSchedule.totalSeats} candidates</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'المسجلون فعلياً' : 'Assigned Seats'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingSchedule.assignedCandidates} candidates</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC] col-span-2">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'المركز المعين' : 'Assigned Center'}</div>
                <div className="font-semibold text-[#2C2623]">
                  {centers.find(c => c.id === viewingSchedule.centerId)?.nameEn || viewingSchedule.centerId}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
