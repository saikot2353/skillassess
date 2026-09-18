import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Shield, Search, Filter, UserCheck, Save, Mail, Phone,
  Eye, Key, Power, Building2, Globe, CheckCircle2, ShieldCheck, RefreshCw, Copy, Check
} from 'lucide-react';
import { User, Role, Country, Center, AuditLog } from '../types';
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
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';

export interface UsersPageProps {
  onNavigate?: (path: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const userCenterId = currentUser?.centerId || 'ctr-sa-1';
  const isCenterAdmin = currentUser?.role === 'CENTER_ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: (isCenterAdmin ? 'ASSESSOR' : 'CENTER_ADMIN') as Role,
    countryId: '',
    centerId: '',
    phone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = () => {
    const loadedUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const loadedCountries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
    const loadedCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);

    const filteredUsers = isCenterAdmin 
      ? loadedUsers.filter(u => u.id === currentUser?.id || ((u.role === 'ASSESSOR' || u.role === 'SUPPORT_STAFF') && u.centerId === userCenterId))
      : loadedUsers;

    setUsers(filteredUsers);
    setCountries(loadedCountries);
    setCenters(loadedCenters);
  };

  useEffect(() => {
    loadData();

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam && ['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ASSESSOR', 'SUPPORT_STAFF'].includes(roleParam)) {
      setActiveRoleTab(roleParam as Role);
    }

    const actionParam = params.get('action');
    if (actionParam === 'create') {
      const targetRole = (roleParam as Role) || 'CENTER_ADMIN';
      const targetCountryId = params.get('countryId') || '';
      const targetCenterId = params.get('centerId') || '';
      handleOpenAdd(targetRole, targetCountryId, targetCenterId);
    }

    const idParam = params.get('id');
    if (idParam) {
      const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
      const found = allUsers.find(u => u.id === idParam);
      if (found) setViewingUser(found);
    }
  }, []);

  const handleOpenAdd = (defaultRole: Role = 'CENTER_ADMIN', preCountryId?: string, preCenterId?: string) => {
    setEditingUser(null);
    const initialCountry = preCountryId || countries[0]?.id || '';
    const validCenters = centers.filter(c => c.countryId === initialCountry);
    const initialCenter = preCenterId || validCenters[0]?.id || '';

    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      role: defaultRole,
      countryId: initialCountry,
      centerId: initialCenter,
      phone: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.email.split('@')[0],
      password: '',
      role: user.role,
      countryId: user.countryId || '',
      centerId: user.centerId || '',
      phone: user.phone || '',
      status: user.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCountryChangeInForm = (newCountryId: string) => {
    const validCenters = centers.filter(c => c.countryId === newCountryId);
    setFormData({
      ...formData,
      countryId: newCountryId,
      centerId: validCenters[0]?.id || '',
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required.';
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'Valid email address is required.';
    }

    // Check duplicate email
    const duplicate = users.find(u => u.email.toLowerCase() === formData.email.trim().toLowerCase() && u.id !== editingUser?.id);
    if (duplicate) {
      errors.email = 'An account with this email address already exists.';
    }

    if (formData.role === 'COUNTRY_ACCOUNT' && !formData.countryId) {
      errors.countryId = 'Country allocation is mandatory for this role';
    }
    if (['CENTER_ADMIN', 'ASSESSOR', 'SUPPORT_STAFF'].includes(formData.role) && !isCenterAdmin && !formData.centerId) {
      errors.centerId = 'Center allocation is mandatory for this role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingUser) {
      const updated: User = {
        ...editingUser,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        countryId: formData.role === 'SUPER_ADMIN' ? undefined : (isCenterAdmin ? (currentUser?.countryId || 'cnt-sa') : (formData.countryId || undefined)),
        centerId: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'].includes(formData.role) ? undefined : (isCenterAdmin ? userCenterId : (formData.centerId || undefined)),
        phone: formData.phone.trim(),
        status: formData.status,
      };
      StorageService.updateItem(STORAGE_KEYS.USERS, updated);
      AuditService.log('UPDATE', 'USER', `Updated user account ${updated.name} (${updated.role})`, updated.id, 'SUCCESS');
      showToast(t.toasts.updatedSuccess, 'success');
      if (viewingUser?.id === updated.id) setViewingUser(updated);
    } else {
      const targetRole = isCenterAdmin ? (formData.role === 'SUPPORT_STAFF' ? 'SUPPORT_STAFF' : 'ASSESSOR') : formData.role;
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: targetRole,
        countryId: targetRole === 'SUPER_ADMIN' ? undefined : (isCenterAdmin ? (currentUser?.countryId || 'cnt-sa') : (formData.countryId || undefined)),
        centerId: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'].includes(targetRole) ? undefined : (isCenterAdmin ? userCenterId : (formData.centerId || undefined)),
        phone: formData.phone.trim(),
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      StorageService.updateItem(STORAGE_KEYS.USERS, newUser);
      AuditService.log('CREATE', 'USER', `Created ${newUser.role} account ${newUser.name} (${newUser.email})`, newUser.id, 'SUCCESS');
      showToast(t.toasts.createdSuccess, 'success');
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleToggleStatus = (user: User) => {
    const nextStatus: 'ACTIVE' | 'INACTIVE' = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: User = { ...user, status: nextStatus };
    StorageService.updateItem(STORAGE_KEYS.USERS, updated);
    AuditService.log(
      'UPDATE', 
      'USER', 
      `Toggled user ${user.name} status to ${nextStatus}`, 
      user.id,
      'SUCCESS'
    );
    loadData();
    if (viewingUser?.id === user.id) setViewingUser(updated);
    showToast(
      nextStatus === 'ACTIVE' ? 'User activated successfully' : 'User deactivated successfully',
      'success'
    );
  };

  const handleOpenResetPassword = (user: User) => {
    const tempPass = `SA360-${Math.random().toString(36).substring(2, 6).toUpperCase()}#${Math.floor(100 + Math.random() * 900)}`;
    setResetPasswordUser(user);
    setGeneratedTempPassword(tempPass);
    setHasCopiedPassword(false);
  };

  const handleConfirmResetPassword = () => {
    if (!resetPasswordUser) return;
    AuditService.log(
      'UPDATE',
      'USER',
      `Simulated password reset for user ${resetPasswordUser.email}`,
      resetPasswordUser.id,
      'SUCCESS'
    );
    showToast(`Temporary password generated for ${resetPasswordUser.name}`, 'success');
    setResetPasswordUser(null);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedTempPassword);
    setHasCopiedPassword(true);
    showToast('Temporary password copied to clipboard', 'info');
    setTimeout(() => setHasCopiedPassword(false), 2500);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const userToDelete = users.find(u => u.id === deleteId);
    StorageService.removeItem(STORAGE_KEYS.USERS, deleteId);
    AuditService.log('DELETE', 'USER', `Deleted user account ${userToDelete?.name || deleteId}`, deleteId, 'SUCCESS');
    setDeleteId(null);
    if (viewingUser?.id === deleteId) setViewingUser(null);
    showToast(t.toasts.deletedSuccess, 'success');
    loadData();
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'maroon';
      case 'COUNTRY_ACCOUNT':
        return 'gold';
      case 'CENTER_ADMIN':
        return 'info';
      case 'ASSESSOR':
        return 'success';
      case 'SUPPORT_STAFF':
      default:
        return 'neutral';
    }
  };

  const getScopeCountry = (u: User) => {
    if (!u.countryId) return null;
    return countries.find(c => c.id === u.countryId) || null;
  };

  const getScopeCenter = (u: User) => {
    if (!u.centerId) return null;
    return centers.find(c => c.id === u.centerId) || null;
  };

  const getScopeName = (u: User) => {
    if (u.role === 'SUPER_ADMIN') {
      return language === 'ar' ? 'إشراف وحوكمة عامة للنظام' : 'Global System Governance';
    }
    const cnt = getScopeCountry(u);
    const ctr = getScopeCenter(u);

    if (ctr) {
      return `${language === 'ar' ? ctr.nameAr : ctr.nameEn} (${ctr.code})`;
    }
    if (cnt) {
      return `${cnt.flagEmoji} ${language === 'ar' ? cnt.nameAr : cnt.nameEn}`;
    }
    return language === 'ar' ? 'غير محدد' : 'Unspecified';
  };

  // Filter centers available in modal based on selected country
  const modalAvailableCenters = centers.filter(c => !formData.countryId || c.countryId === formData.countryId);

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm));

    const matchesRole = activeRoleTab === 'ALL' || u.role === activeRoleTab;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesCountry = countryFilter === 'ALL' || u.countryId === countryFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesCountry;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const roleTabCounts = {
    ALL: users.length,
    SUPER_ADMIN: users.filter(u => u.role === 'SUPER_ADMIN').length,
    COUNTRY_ACCOUNT: users.filter(u => u.role === 'COUNTRY_ACCOUNT').length,
    CENTER_ADMIN: users.filter(u => u.role === 'CENTER_ADMIN').length,
    ASSESSOR: users.filter(u => u.role === 'ASSESSOR').length,
    SUPPORT_STAFF: users.filter(u => u.role === 'SUPPORT_STAFF').length,
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t.usersModule.fullName,
      render: u => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F8ECEE] border border-[#E8D9D2] flex items-center justify-center font-bold text-xs text-[#7A2E3A] shrink-0">
            {u.name.charAt(0)}
          </div>
          <div>
            <button
              onClick={() => setViewingUser(u)}
              className="font-semibold text-[#3F3030] hover:text-[#7A2E3A] block text-start transition-colors"
            >
              {u.name}
            </button>
            <span className="text-[11px] text-[#806F6F] font-mono">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t.usersModule.role,
      render: u => (
        <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
          {t.roles[u.role] || u.role}
        </Badge>
      ),
    },
    {
      key: 'scope',
      header: t.usersModule.assignedScope,
      render: u => {
        const cnt = getScopeCountry(u);
        return (
          <div className="text-xs text-[#3F3030] max-w-[210px] truncate" title={getScopeName(u)}>
            {cnt && <span className="me-1">{cnt.flagEmoji}</span>}
            <span>{getScopeName(u)}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: t.common.status,
      render: u => <StatusBadge status={u.status} />,
    },
    {
      key: 'lastLogin',
      header: t.usersModule.lastLogin,
      render: u => (
        <span className="text-[11px] text-[#806F6F] font-mono">
          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: u => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewingUser(u)}
            className="p-1.5 rounded text-[#7A2E3A] hover:text-[#5A222B] hover:bg-[#F8ECEE] transition-colors"
            title={language === 'ar' ? 'عرض تفاصيل الحساب' : 'View Profile'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenResetPassword(u)}
            className="p-1.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
            title={language === 'ar' ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(u)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={t.common.edit}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(u)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title={u.status === 'ACTIVE' ? (language === 'ar' ? 'تعطيل الحساب' : 'Deactivate') : (language === 'ar' ? 'تفعيل الحساب' : 'Activate')}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          {u.role !== 'SUPER_ADMIN' && (
            <button
              type="button"
              onClick={() => setDeleteId(u.id)}
              className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title={t.common.delete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={t.usersModule.title}
        subtitle={t.usersModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.usersModule.title },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdd(activeRoleTab === 'ALL' ? 'CENTER_ADMIN' : activeRoleTab)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t.usersModule.addNew}
          </Button>
        }
      />

      {/* Role Tabs (Hierarchy-aligned) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#FFFCF8] border border-[#E8D9D2] rounded-xl">
        <button
          onClick={() => { setActiveRoleTab('ALL'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeRoleTab === 'ALL'
              ? 'bg-[#7A2E3A] text-white shadow-xs'
              : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-white'
          }`}
        >
          {language === 'ar' ? 'جميع حسابات المركز' : 'All Center Staff'} ({roleTabCounts.ALL})
        </button>

        {!isCenterAdmin && (
          <>
            <button
              onClick={() => { setActiveRoleTab('COUNTRY_ACCOUNT'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRoleTab === 'COUNTRY_ACCOUNT'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-white'
              }`}
            >
              {t.roles.COUNTRY_ACCOUNT} ({roleTabCounts.COUNTRY_ACCOUNT})
            </button>

            <button
              onClick={() => { setActiveRoleTab('CENTER_ADMIN'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRoleTab === 'CENTER_ADMIN'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-white'
              }`}
            >
              {t.roles.CENTER_ADMIN} ({roleTabCounts.CENTER_ADMIN})
            </button>
          </>
        )}

        <button
          onClick={() => { setActiveRoleTab('ASSESSOR'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeRoleTab === 'ASSESSOR'
              ? 'bg-[#7A2E3A] text-white shadow-xs'
              : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-white'
          }`}
        >
          {t.roles.ASSESSOR} ({roleTabCounts.ASSESSOR})
        </button>

        <button
          onClick={() => { setActiveRoleTab('SUPPORT_STAFF'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeRoleTab === 'SUPPORT_STAFF'
              ? 'bg-[#7A2E3A] text-white shadow-xs'
              : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-white'
          }`}
        >
          {t.roles.SUPPORT_STAFF} ({roleTabCounts.SUPPORT_STAFF})
        </button>
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
            placeholder={language === 'ar' ? 'بحث بالاسم، البريد أو الهاتف...' : 'Search by name, email, phone...'}
            className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
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

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
          >
            <option value="ALL">{t.common.all} {t.common.status}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={u => u.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        icon={<UserCheck className="w-6 h-6" />}
        title={editingUser ? t.usersModule.editUser : t.usersModule.createUser}
        subtitle={language === 'ar' ? 'إدارة الهرمية وصلاحيات الوصول والربط الإداري' : 'Manage hierarchical role access control and jurisdictional authority'}
        infoNotice={t.usersModule.userRoleRuleNotice}
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
            <ModalSectionTitle title={language === 'ar' ? 'البيانات الشخصية والاعتماد' : 'Personal & Contact Details'} />
            <div className="space-y-3.5">
              <Input
                label={t.usersModule.fullName}
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g. Abdullah Al-Harbi"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label={t.usersModule.email}
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  error={formErrors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="user@skillassess360.com"
                />
                <Input
                  label={t.usersModule.phone}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  leftIcon={<Phone className="w-4 h-4" />}
                  placeholder="+966 50 123 4567"
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title={language === 'ar' ? 'الدور الوظيفي والنطاق الإداري' : 'Role & Jurisdiction Hierarchy'} />
            <div className="space-y-3.5">
              <Select
                label={t.usersModule.role}
                required
                value={formData.role}
                onChange={e => {
                  const newRole = e.target.value as Role;
                  setFormData({ ...formData, role: newRole });
                }}
                options={
                  isCenterAdmin
                    ? [
                        { value: 'ASSESSOR', label: `1. ${t.roles.ASSESSOR}` },
                        { value: 'SUPPORT_STAFF', label: `2. ${t.roles.SUPPORT_STAFF}` },
                      ]
                    : [
                        { value: 'SUPER_ADMIN', label: `1. ${t.roles.SUPER_ADMIN}` },
                        { value: 'COUNTRY_ACCOUNT', label: `2. ${t.roles.COUNTRY_ACCOUNT}` },
                        { value: 'CENTER_ADMIN', label: `3. ${t.roles.CENTER_ADMIN}` },
                        { value: 'ASSESSOR', label: `4. ${t.roles.ASSESSOR}` },
                        { value: 'SUPPORT_STAFF', label: `5. ${t.roles.SUPPORT_STAFF}` },
                      ]
                }
              />

              {isCenterAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                    {t.usersModule.linkCenter}
                  </label>
                  <div className="px-3 py-2 text-sm bg-[#FAF8F5] border border-[#D5D0C7] rounded-lg text-[#5C554E] font-medium">
                    {centers.find(c => c.id === userCenterId)?.nameEn || 'Riyadh Central Technical Hub'}
                  </div>
                </div>
              ) : (
                <>
                  {formData.role !== 'SUPER_ADMIN' && (
                    <Select
                      label={t.usersModule.linkCountry}
                      required
                      value={formData.countryId}
                      onChange={e => handleCountryChangeInForm(e.target.value)}
                      error={formErrors.countryId}
                      options={countries.map(c => ({
                        value: c.id,
                        label: `${c.flagEmoji} ${language === 'ar' ? c.nameAr : c.nameEn}`,
                      }))}
                    />
                  )}

                  {['CENTER_ADMIN', 'ASSESSOR', 'SUPPORT_STAFF'].includes(formData.role) && (
                    <Select
                      label={t.usersModule.linkCenter}
                      required
                      value={formData.centerId}
                      onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                      error={formErrors.centerId}
                      options={
                        modalAvailableCenters.length > 0
                          ? modalAvailableCenters.map(c => ({
                              value: c.id,
                              label: `${c.code} - ${language === 'ar' ? c.nameAr : c.nameEn}`,
                            }))
                          : [{ value: '', label: language === 'ar' ? 'لا توجد مراكز مسجلة لهذه الدولة بعد' : 'No centers registered in this country yet' }]
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title={language === 'ar' ? 'حالة الحساب' : 'Account Status'} />
            <Select
              label={t.common.status}
              required
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'ACTIVE', label: '● ACTIVE' },
                { value: 'INACTIVE', label: '○ INACTIVE' },
                { value: 'SUSPENDED', label: '◌ SUSPENDED' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* User Details Modal */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          maxWidth="md"
          icon={<UserCheck className="w-6 h-6" />}
          title={viewingUser.name}
          subtitle={t.roles[viewingUser.role] || viewingUser.role}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={viewingUser.status === 'ACTIVE' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleToggleStatus(viewingUser)}
                leftIcon={<Power className="w-3.5 h-3.5" />}
              >
                {viewingUser.status === 'ACTIVE' ? (language === 'ar' ? 'تعطيل الحساب' : 'Deactivate') : (language === 'ar' ? 'تفعيل الحساب' : 'Activate')}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    handleOpenResetPassword(u);
                  }}
                  leftIcon={<Key className="w-3.5 h-3.5 text-amber-600" />}
                >
                  {language === 'ar' ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    handleOpenEdit(u);
                  }}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  {t.common.edit}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2]">
              <div className="w-12 h-12 rounded-full bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center font-bold text-lg border border-[#E8D9D2] shrink-0">
                {viewingUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[#3F3030]">{viewingUser.name}</span>
                  <Badge variant={getRoleBadgeVariant(viewingUser.role)} size="sm">
                    {t.roles[viewingUser.role] || viewingUser.role}
                  </Badge>
                  <StatusBadge status={viewingUser.status} />
                </div>
                <span className="text-xs text-[#806F6F] font-mono block mt-0.5">{viewingUser.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] space-y-1">
                <span className="text-[#806F6F] block">{language === 'ar' ? 'الدولة التابعة' : 'Affiliated Country'}</span>
                <span className="font-semibold text-[#3F3030]">
                  {getScopeCountry(viewingUser) ? `${getScopeCountry(viewingUser)?.flagEmoji} ${getScopeCountry(viewingUser)?.nameEn}` : (language === 'ar' ? 'عام / دولي' : 'Global Authority')}
                </span>
              </div>

              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] space-y-1">
                <span className="text-[#806F6F] block">{language === 'ar' ? 'المركز المخصص' : 'Allocated Center'}</span>
                <span className="font-semibold text-[#3F3030]">
                  {getScopeCenter(viewingUser) ? `${getScopeCenter(viewingUser)?.nameEn} (${getScopeCenter(viewingUser)?.code})` : (language === 'ar' ? 'غير مخصص لمركز واحد' : 'Not Restricted to Center')}
                </span>
              </div>

              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] space-y-1">
                <span className="text-[#806F6F] block">{language === 'ar' ? 'رقم الهاتف' : 'Contact Phone'}</span>
                <span className="font-mono text-[#3F3030]">{viewingUser.phone || '—'}</span>
              </div>

              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] space-y-1">
                <span className="text-[#806F6F] block">{language === 'ar' ? 'آخر نشاط / تسجيل دخول' : 'Last Login / Activity'}</span>
                <span className="font-mono text-[#3F3030]">
                  {viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleString() : (language === 'ar' ? 'لم يسجل دخول بعد' : 'Never logged in')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F8ECEE]/60 border border-[#E8D9D2] text-xs text-[#3F3030] space-y-1">
              <span className="font-semibold block">{language === 'ar' ? 'الصلاحيات والوظائف التنفيذية' : 'Executive Role Governance'}</span>
              <p className="text-[#806F6F] leading-relaxed">
                {viewingUser.role === 'SUPER_ADMIN' && 'Full omniscient oversight of all countries, centers, candidate registries, results validation, and lottery triggers.'}
                {viewingUser.role === 'COUNTRY_ACCOUNT' && 'National jurisdiction authority over assessment centers, center administrative appointments, and country reports.'}
                {viewingUser.role === 'CENTER_ADMIN' && 'Direct center operational management, daily batch assignments, local assessor scheduling, and facility readiness.'}
                {viewingUser.role === 'ASSESSOR' && 'Authorized practical task scoring, technical rubric evaluation, and blind candidate evaluation.'}
                {viewingUser.role === 'SUPPORT_STAFF' && 'Candidate reception, biometric verification assistance, and technical workshop support.'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Password Reset Modal Simulation */}
      {resetPasswordUser && (
        <Modal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          maxWidth="sm"
          icon={<Key className="w-6 h-6 text-amber-600" />}
          title={language === 'ar' ? 'إعادة ضبط كلمة المرور' : 'Reset User Password'}
          subtitle={`Simulated credential reset for ${resetPasswordUser.name}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setResetPasswordUser(null)}>
                {t.common.close}
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmResetPassword}>
                {language === 'ar' ? 'تأكيد وحفظ' : 'Confirm Reset'}
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <p className="text-xs text-[#806F6F]">
              {language === 'ar'
                ? 'تم إنشاء كلمة مرور مؤقتة صالحة لأول تسجيل دخول. يرجى مشاركتها مع المستخدم بأمان:'
                : 'A secure temporary password has been generated. The user will be prompted to change it on their next sign-in:'}
            </p>

            <div className="p-3 bg-[#FBF6E8] border border-[#C9A24D]/40 rounded-lg flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-[#91702C]">{generatedTempPassword}</span>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="p-1.5 rounded bg-white text-[#91702C] hover:bg-[#F8ECEE] transition-colors border border-[#C9A24D]/30"
                title="Copy Password"
              >
                {hasCopiedPassword ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-[11px] text-[#806F6F] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{language === 'ar' ? 'تم تسجيل هذه العملية في سجل التدقيق الرقابي' : 'This action is immutably logged in the audit trail.'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
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

