import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Search, Filter, Save, Mail, Phone, Eye, Power, CheckCircle2 } from 'lucide-react';
import { Center, Country, User, Candidate, Batch } from '../types';
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
import { CenterDetails } from './CenterDetails';

export interface CentersProps {
  onNavigate?: (path: string) => void;
}

export const Centers: React.FC<CentersProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isCountryAdmin = user?.role === 'COUNTRY_ADMIN' || user?.role === 'COUNTRY_ACCOUNT';
  const userCountryId = user?.countryId || 'cnt-sa';

  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Selected Center for Details View
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    countryId: '',
    city: '',
    address: '',
    capacity: 100,
    occupations: 'Electrical Installation, HVAC Maintenance',
    contactEmail: '',
    contactPhone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'PENDING_AUDIT',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = () => {
    const loadedCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const loadedCountries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
    const filteredCenters = isCountryAdmin 
      ? loadedCenters.filter(c => c.countryId === userCountryId)
      : loadedCenters;
    const scopedCountries = isCountryAdmin
      ? loadedCountries.filter(c => c.id === userCountryId)
      : loadedCountries;
    setCenters(filteredCenters);
    setCountries(scopedCountries);
    setUsers(StorageService.get<User[]>(STORAGE_KEYS.USERS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
    setBatches(StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []));
  };

  useEffect(() => {
    const syncFromUrl = () => {
      loadData();

      // Check URL query parameters for action or details
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('action') === 'create') {
        handleOpenAdd();
      }
      const paramId = searchParams.get('id');
      if (paramId) {
        setSelectedCenterId(paramId);
      } else if (searchParams.get('view') === 'details') {
        const all = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
        const filteredAll = isCountryAdmin ? all.filter(c => c.countryId === userCountryId) : all;
        if (filteredAll.length > 0) setSelectedCenterId(filteredAll[0].id);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [isCountryAdmin, userCountryId]);

  const handleOpenAdd = () => {
    setEditingCenter(null);
    setFormData({
      code: `CTR-${Date.now().toString().slice(-4)}`,
      nameEn: '',
      nameAr: '',
      countryId: isCountryAdmin ? userCountryId : (countries[0]?.id || ''),
      city: '',
      address: '',
      capacity: 100,
      occupations: 'Electrical Installation, HVAC Maintenance',
      contactEmail: '',
      contactPhone: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (center: Center) => {
    setEditingCenter(center);
    setFormData({
      code: center.code,
      nameEn: center.nameEn,
      nameAr: center.nameAr,
      countryId: center.countryId,
      city: center.city,
      address: center.address,
      capacity: center.capacity,
      occupations: center.occupationsSupported.join(', '),
      contactEmail: center.contactEmail,
      contactPhone: center.contactPhone,
      status: center.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Center code is required.';
    if (!formData.nameEn.trim()) errors.nameEn = 'English name is required.';
    if (!formData.nameAr.trim()) errors.nameAr = 'Arabic name is required.';
    if (!formData.city.trim()) errors.city = 'City is required.';
    if (!formData.countryId) errors.countryId = 'Affiliated country is required.';
    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      errors.contactEmail = 'Valid email is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const occupationsArray = formData.occupations
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingCenter) {
      const updated: Center = {
        ...editingCenter,
        code: formData.code.trim().toUpperCase(),
        nameEn: formData.nameEn.trim(),
        nameAr: formData.nameAr.trim(),
        countryId: formData.countryId,
        city: formData.city.trim(),
        address: formData.address.trim(),
        capacity: Number(formData.capacity) || 50,
        occupationsSupported: occupationsArray,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        status: formData.status,
      };
      StorageService.updateItem(STORAGE_KEYS.CENTERS, updated);
      AuditService.log('UPDATE', 'CENTER', `Updated center ${updated.nameEn} (${updated.code})`, updated.id);
      showToast(t.toasts.updatedSuccess, 'success');
    } else {
      const newCenter: Center = {
        id: `ctr-${Date.now()}`,
        code: formData.code.trim().toUpperCase(),
        nameEn: formData.nameEn.trim(),
        nameAr: formData.nameAr.trim(),
        countryId: formData.countryId,
        city: formData.city.trim(),
        address: formData.address.trim(),
        capacity: Number(formData.capacity) || 50,
        occupationsSupported: occupationsArray,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      StorageService.updateItem(STORAGE_KEYS.CENTERS, newCenter);
      AuditService.log('CREATE', 'CENTER', `Created assessment center ${newCenter.nameEn} (${newCenter.code})`, newCenter.id);
      showToast(t.toasts.createdSuccess, 'success');
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleToggleStatus = (c: Center) => {
    const nextStatus: 'ACTIVE' | 'INACTIVE' = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: Center = { ...c, status: nextStatus };
    StorageService.updateItem(STORAGE_KEYS.CENTERS, updated);
    AuditService.log('UPDATE', 'CENTER', `Toggled center ${c.nameEn} status to ${nextStatus}`, c.id, 'SUCCESS');
    loadData();
    showToast(nextStatus === 'ACTIVE' ? 'Center activated' : 'Center deactivated', 'success');
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const center = centers.find(c => c.id === deleteId);
    StorageService.removeItem(STORAGE_KEYS.CENTERS, deleteId);
    AuditService.log('DELETE', 'CENTER', `Deleted assessment center ${center?.nameEn || deleteId}`, deleteId);
    setDeleteId(null);
    showToast(t.toasts.deletedSuccess, 'success');
    loadData();
  };

  const getCountryName = (countryId: string) => {
    const c = countries.find(item => item.id === countryId);
    if (!c) return countryId;
    return `${c.flagEmoji} ${language === 'ar' ? c.nameAr : c.nameEn}`;
  };

  const filtered = centers.filter(c => {
    const matchesSearch =
      c.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nameAr.includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCountry = countryFilter === 'ALL' || c.countryId === countryFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesCountry && matchesStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Center>[] = [
    {
      key: 'name',
      header: t.centersModule.centerName,
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-stone-100 text-stone-600 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <button
              onClick={() => setSelectedCenterId(c.id)}
              className="font-semibold text-stone-900 hover:text-[#7A2E3A] block text-start transition-colors"
            >
              {language === 'ar' ? c.nameAr : c.nameEn}
            </button>
            <span className="text-[11px] text-stone-400 font-mono">
              {c.code} • {c.city}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'country',
      header: t.centersModule.country,
      render: c => (
        <span className="text-xs font-medium text-stone-700">
          {getCountryName(c.countryId)}
        </span>
      ),
    },
    {
      key: 'admin',
      header: language === 'ar' ? 'مدير المركز' : 'Center Admin',
      render: c => {
        const admin = users.find(u => u.centerId === c.id && u.role === 'CENTER_ADMIN');
        return admin ? (
          <span className="text-xs font-medium text-stone-800 truncate block max-w-[130px]" title={admin.name}>
            {admin.name}
          </span>
        ) : (
          <span className="text-xs text-stone-400 italic">
            {language === 'ar' ? 'غير معين' : 'Unassigned'}
          </span>
        );
      },
    },
    {
      key: 'assessors',
      header: language === 'ar' ? 'المقيمون' : 'Assessors',
      render: c => {
        const count = users.filter(u => u.centerId === c.id && u.role === 'ASSESSOR').length;
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FBF6E8] text-[#91702C] border border-[#C9A24D]/30">
            {count}
          </span>
        );
      },
    },
    {
      key: 'candidates',
      header: language === 'ar' ? 'المترشحون' : 'Candidates',
      render: c => {
        const count = candidates.filter(cand => cand.centerId === c.id).length;
        return <span className="text-xs font-semibold text-stone-700">{count}</span>;
      },
    },
    {
      key: 'batches',
      header: language === 'ar' ? 'الدفعات النشطة' : 'Active Batches',
      render: c => {
        const count = batches.filter(b => b.centerId === c.id && b.status !== 'COMPLETED').length;
        return <span className="text-xs font-semibold text-stone-700">{count}</span>;
      },
    },
    {
      key: 'status',
      header: t.common.status,
      render: c => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCenterId(c.id)}
            className="p-1.5 rounded text-[#7A2E3A] hover:text-[#5A222B] hover:bg-[#F8ECEE] transition-colors"
            title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(c)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={t.common.edit}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(c)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={c.status === 'ACTIVE' ? (language === 'ar' ? 'تعطيل' : 'Deactivate') : (language === 'ar' ? 'تفعيل' : 'Activate')}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(c.id)}
            className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title={t.common.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  if (selectedCenterId) {
    return (
      <CenterDetails
        centerId={selectedCenterId}
        onBack={() => {
          setSelectedCenterId(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('view');
          url.searchParams.delete('id');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          loadData();
        }}
        onNavigate={onNavigate || (() => {})}
        onEdit={(center) => {
          setSelectedCenterId(null);
          handleOpenEdit(center);
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t.centersModule.title}
        subtitle={t.centersModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.centersModule.title },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t.centersModule.addNew}
          </Button>
        }
      />

      {/* Filter and Search */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-borderlight rounded-lg shadow-soft">
        <div className="relative w-full sm:w-72">
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
            placeholder={t.common.search}
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
          {!isCountryAdmin ? (
            <select
              value={countryFilter}
              onChange={e => {
                setCountryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-borderlight rounded-md py-1.5 px-2.5 focus:outline-none focus:border-maroon-700 text-stone-700"
            >
              <option value="ALL">{t.common.all} {t.countriesModule.title}</option>
              {countries.map(cnt => (
                <option key={cnt.id} value={cnt.id}>
                  {cnt.flagEmoji} {language === 'ar' ? cnt.nameAr : cnt.nameEn}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs bg-stone-50 border border-stone-200 rounded-md py-1.5 px-2.5 font-medium text-stone-700 flex items-center gap-1.5">
              <span>{countries[0]?.flagEmoji}</span>
              <span>{language === 'ar' ? countries[0]?.nameAr : countries[0]?.nameEn}</span>
            </div>
          )}

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-borderlight rounded-md py-1.5 px-2.5 focus:outline-none focus:border-maroon-700 text-stone-700"
          >
            <option value="ALL">{t.common.all} {t.common.status}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="PENDING_AUDIT">PENDING AUDIT</option>
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

      {/* Add / Edit Center Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        icon={<Building2 className="w-6 h-6" />}
        title={editingCenter ? t.centersModule.editCenter : "Register Assessment Center"}
        subtitle="Manage technical facility specifications, capacity, and accreditation details"
        infoNotice="This assessment center will operate under accredited technical inspection standards."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <ModalSectionTitle title="Center Information" />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label={t.centersModule.nameEn}
                  required
                  value={formData.nameEn}
                  onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                  error={formErrors.nameEn}
                  placeholder="e.g. Riyadh Central Technical Hub"
                />
                <Input
                  label={t.centersModule.nameAr}
                  required
                  dir="rtl"
                  value={formData.nameAr}
                  onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                  error={formErrors.nameAr}
                  placeholder="مثال: مركز الرياض الرئيسي للتقييم التقني"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  label={t.centersModule.centerCode}
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  error={formErrors.code}
                  placeholder="CTR-SA-001"
                />
                <Select
                  label={t.centersModule.country}
                  required
                  value={formData.countryId}
                  onChange={e => setFormData({ ...formData, countryId: e.target.value })}
                  options={countries.map(c => ({
                    value: c.id,
                    label: `${c.flagEmoji} ${language === 'ar' ? c.nameAr : c.nameEn}`,
                  }))}
                />
                <Input
                  label={t.centersModule.city}
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  error={formErrors.city}
                  placeholder="e.g. Riyadh"
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Facility & Operational Scope" />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label={t.centersModule.capacity}
                  required
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
                <Input
                  label={t.centersModule.phone}
                  value={formData.contactPhone}
                  onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                  leftIcon={<Phone className="w-4 h-4" />}
                  placeholder="+966 11 456 7890"
                />
              </div>

              <Input
                label={t.centersModule.occupations}
                value={formData.occupations}
                onChange={e => setFormData({ ...formData, occupations: e.target.value })}
                helperText="Separate multiple occupations with commas"
              />

              <Input
                label={t.centersModule.address}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street name, Industrial district"
              />
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Contact & Governance" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Contact Email"
                type="email"
                required
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                error={formErrors.contactEmail}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="center@domain.com"
              />
              <Select
                label={t.common.status}
                required
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                options={[
                  { value: 'ACTIVE', label: '● ACTIVE' },
                  { value: 'INACTIVE', label: '○ INACTIVE' },
                  { value: 'PENDING_AUDIT', label: '◌ PENDING AUDIT' },
                ]}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.dialogs.confirmDeleteTitle}
        message={t.dialogs.confirmDeleteMessage}
        confirmText={t.dialogs.confirmDeleteButton}
        cancelText={t.common.cancel}
      />
    </div>
  );
};
