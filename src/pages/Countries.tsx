import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Globe, Search, Filter, Save, Mail, Eye, Power, CheckCircle2 } from 'lucide-react';
import { Country, Center, User } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { CountryDetails } from './CountryDetails';

export interface CountriesProps {
  onNavigate?: (path: string) => void;
}

export const Countries: React.FC<CountriesProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [countries, setCountries] = useState<Country[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Selected Country for Details View
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    code: '',
    flagEmoji: '🌐',
    region: 'Middle East',
    contactPerson: '',
    contactEmail: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirm Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = () => {
    const list = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
    setCountries(list);
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setUsers(StorageService.get<User[]>(STORAGE_KEYS.USERS, []));
  };

  useEffect(() => {
    loadData();

    // Check URL query parameters for action or details
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('action') === 'create') {
      handleOpenAdd();
    }
    const paramId = searchParams.get('id');
    if (paramId) {
      setSelectedCountryId(paramId);
    } else if (searchParams.get('view') === 'details') {
      const all = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
      if (all.length > 0) setSelectedCountryId(all[0].id);
    }
  }, []);

  const handleOpenAdd = () => {
    setEditingCountry(null);
    setFormData({
      nameEn: '',
      nameAr: '',
      code: '',
      flagEmoji: '🌐',
      region: 'Middle East',
      contactPerson: '',
      contactEmail: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      nameEn: country.nameEn,
      nameAr: country.nameAr,
      code: country.code,
      flagEmoji: country.flagEmoji,
      region: country.region,
      contactPerson: country.contactPerson,
      contactEmail: country.contactEmail,
      status: country.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = (country: Country) => {
    const newStatus: 'ACTIVE' | 'INACTIVE' = country.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: Country = { ...country, status: newStatus };
    StorageService.updateItem(STORAGE_KEYS.COUNTRIES, updated);
    AuditService.log(
      newStatus === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'COUNTRY',
      `Toggled status of ${country.nameEn} to ${newStatus}`,
      country.id
    );
    showToast(t.toasts.updatedSuccess, 'success');
    loadData();
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nameEn.trim()) errors.nameEn = 'English name is required.';
    if (!formData.nameAr.trim()) errors.nameAr = 'Arabic name is required.';
    if (!formData.code.trim()) errors.code = 'ISO code is required.';
    if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact official is required.';
    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      errors.contactEmail = 'Valid contact email is required.';
    }

    // Duplicate checks
    const normalizedCode = formData.code.trim().toUpperCase();
    const isCodeDuplicate = countries.some(
      c => c.code === normalizedCode && (!editingCountry || c.id !== editingCountry.id)
    );
    if (isCodeDuplicate) {
      errors.code = `ISO code "${normalizedCode}" is already registered.`;
    }

    const normalizedName = formData.nameEn.trim().toLowerCase();
    const isNameDuplicate = countries.some(
      c => c.nameEn.toLowerCase() === normalizedName && (!editingCountry || c.id !== editingCountry.id)
    );
    if (isNameDuplicate) {
      errors.nameEn = `Country "${formData.nameEn.trim()}" is already registered.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingCountry) {
      const updated: Country = {
        ...editingCountry,
        nameEn: formData.nameEn.trim(),
        nameAr: formData.nameAr.trim(),
        code: formData.code.trim().toUpperCase(),
        flagEmoji: formData.flagEmoji,
        region: formData.region,
        contactPerson: formData.contactPerson.trim(),
        contactEmail: formData.contactEmail.trim(),
        status: formData.status,
      };
      StorageService.updateItem(STORAGE_KEYS.COUNTRIES, updated);
      AuditService.log(
        'UPDATE_COUNTRY',
        'COUNTRY',
        `Updated country account ${updated.nameEn} (${updated.code})`,
        updated.id
      );
      showToast(t.toasts.updatedSuccess, 'success');
    } else {
      const newCountry: Country = {
        id: `cnt-${Date.now()}`,
        nameEn: formData.nameEn.trim(),
        nameAr: formData.nameAr.trim(),
        code: formData.code.trim().toUpperCase(),
        flagEmoji: formData.flagEmoji || '🌐',
        region: formData.region,
        status: formData.status,
        totalCenters: 0,
        contactPerson: formData.contactPerson.trim(),
        contactEmail: formData.contactEmail.trim(),
        createdAt: new Date().toISOString(),
      };
      StorageService.updateItem(STORAGE_KEYS.COUNTRIES, newCountry);
      AuditService.log(
        'CREATE_COUNTRY',
        'COUNTRY',
        `Created country authority ${newCountry.nameEn} (${newCountry.code})`,
        newCountry.id
      );
      showToast(t.toasts.createdSuccess, 'success');
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const country = countries.find(c => c.id === deleteId);
    StorageService.removeItem(STORAGE_KEYS.COUNTRIES, deleteId);
    AuditService.log('DELETE', 'COUNTRY', `Deleted country record ${country?.nameEn || deleteId}`, deleteId);
    setDeleteId(null);
    showToast(t.toasts.deletedSuccess, 'success');
    loadData();
  };

  if (selectedCountryId) {
    return (
      <CountryDetails
        countryId={selectedCountryId}
        onBack={() => setSelectedCountryId(null)}
        onNavigate={path => onNavigate ? onNavigate(path) : undefined}
        onEdit={handleOpenEdit}
      />
    );
  }

  // Filter & search
  const filtered = countries.filter(c => {
    const matchesSearch =
      c.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nameAr.includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesRegion = regionFilter === 'ALL' || c.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Columns for Section 11
  const columns: Column<Country>[] = [
    {
      key: 'name',
      header: t.countriesModule.countryName,
      render: c => (
        <div 
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setSelectedCountryId(c.id)}
        >
          <span className="text-xl leading-none">{c.flagEmoji}</span>
          <div>
            <span className="font-semibold text-[#3F3030] group-hover:text-[#7A2E3A] transition-colors block">
              {language === 'ar' ? c.nameAr : c.nameEn}
            </span>
            <span className="text-[10px] text-[#806F6F] font-mono">
              ISO: {c.code}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: t.countriesModule.countryCode,
      render: c => <span className="font-mono font-bold text-[#7A2E3A]">{c.code}</span>,
    },
    {
      key: 'region',
      header: t.countriesModule.region,
      render: c => <span className="text-xs text-[#3F3030]">{c.region}</span>,
    },
    {
      key: 'countryAccount',
      header: 'Country Account',
      render: c => {
        const acc = users.find(u => u.role === 'COUNTRY_ACCOUNT' && u.countryId === c.id);
        return acc ? (
          <div>
            <span className="font-medium text-[#3F3030] text-xs block">{acc.name}</span>
            <span className="text-[10px] text-[#806F6F] font-mono">{acc.email}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#806F6F] italic">Not Assigned</span>
        );
      },
    },
    {
      key: 'centers',
      header: t.countriesModule.centersCount,
      render: c => {
        const countryCenters = centers.filter(ctr => ctr.countryId === c.id);
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-[#3F3030]">
            <Globe className="w-3.5 h-3.5 text-[#C9A24D]" />
            {countryCenters.length} Hubs
          </span>
        );
      },
    },
    {
      key: 'centerAdmins',
      header: t.countriesModule.centerAdminsCount,
      render: c => {
        const countryCenters = centers.filter(ctr => ctr.countryId === c.id).map(ctr => ctr.id);
        const count = users.filter(u => u.role === 'CENTER_ADMIN' && countryCenters.includes(u.centerId || '')).length;
        return <span className="font-medium text-[#3F3030]">{count}</span>;
      },
    },
    {
      key: 'assessors',
      header: t.countriesModule.assessorsCount,
      render: c => {
        const countryCenters = centers.filter(ctr => ctr.countryId === c.id).map(ctr => ctr.id);
        const count = users.filter(u => u.role === 'ASSESSOR' && countryCenters.includes(u.centerId || '')).length;
        return <span className="font-medium text-[#3F3030]">{count}</span>;
      },
    },
    {
      key: 'status',
      header: t.common.status,
      render: c => <StatusBadge status={c.status} />,
    },
    {
      key: 'createdAt',
      header: t.common.createdAt,
      render: c => (
        <span className="font-mono text-[11px] text-[#806F6F]">
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setSelectedCountryId(c.id)}
            className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
            title={t.common.view}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(c)}
            className="p-1.5 rounded text-stone-600 hover:bg-stone-100 transition-colors"
            title={t.common.edit}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(c)}
            className={`p-1.5 rounded transition-colors ${
              c.status === 'ACTIVE' 
                ? 'text-amber-600 hover:bg-amber-50' 
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
            title={c.status === 'ACTIVE' ? t.common.deactivate : t.common.activate}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(c.id)}
            className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
            title={t.common.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.countriesModule.title}
        subtitle={t.countriesModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.countriesModule.title },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t.countriesModule.addNew}
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-[#E8D9D2] rounded-lg shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-[#806F6F]">
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
            className="w-full text-xs bg-white border border-[#E8D9D2] rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#806F6F]" />
          <select
            value={regionFilter}
            onChange={e => {
              setRegionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-md py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
          >
            <option value="ALL">All Regions</option>
            <option value="Middle East">Middle East</option>
            <option value="South Asia">South Asia</option>
            <option value="North Africa">North Africa</option>
            <option value="Southeast Asia">Southeast Asia</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-md py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
          >
            <option value="ALL">{t.common.all} {t.common.status}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || regionFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setRegionFilter('ALL');
                setCurrentPage(1);
              }}
            >
              {t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginated}
        keyExtractor={c => c.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Section 12: Add / Edit Country Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        icon={<Globe className="w-6 h-6" />}
        title={editingCountry ? t.countriesModule.editCountry : t.countriesModule.createCountry}
        subtitle="Specify official ISO codes and jurisdiction details"
        infoNotice="This country authority will be created and governed globally under your Super Admin mandate."
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
            <ModalSectionTitle title="Country Information" />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label={t.countriesModule.nameEn}
                  required
                  value={formData.nameEn}
                  onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                  error={formErrors.nameEn}
                  placeholder="e.g. Saudi Arabia"
                />
                <Input
                  label={t.countriesModule.nameAr}
                  required
                  dir="rtl"
                  value={formData.nameAr}
                  onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                  error={formErrors.nameAr}
                  placeholder="مثال: المملكة العربية السعودية"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  label={t.countriesModule.countryCode}
                  required
                  maxLength={3}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  error={formErrors.code}
                  placeholder="e.g. SA"
                />
                <Input
                  label="Flag Emoji"
                  value={formData.flagEmoji}
                  onChange={e => setFormData({ ...formData, flagEmoji: e.target.value })}
                  placeholder="e.g. 🇸🇦"
                  leftIcon={<Globe className="w-4 h-4" />}
                />
                <Select
                  label={t.countriesModule.region}
                  required
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value })}
                  options={[
                    { value: 'Middle East', label: 'Middle East' },
                    { value: 'South Asia', label: 'South Asia' },
                    { value: 'North Africa', label: 'North Africa' },
                    { value: 'Southeast Asia', label: 'Southeast Asia' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Official Contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label={t.countriesModule.contactPerson}
                required
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                error={formErrors.contactPerson}
                placeholder="Official representative name"
              />
              <Input
                label={t.countriesModule.contactEmail}
                type="email"
                required
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                error={formErrors.contactEmail}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="representative@domain.gov"
              />
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Account Status" />
            <Select
              label={t.common.status}
              required
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
              options={[
                { value: 'ACTIVE', label: '● ACTIVE' },
                { value: 'INACTIVE', label: '○ INACTIVE' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Delete */}
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

