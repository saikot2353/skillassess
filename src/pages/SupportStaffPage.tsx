import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, Plus, Search, Filter, Eye, Shield, 
  Mail, Phone, ArrowRight, UserPlus, Save, AlertCircle, Wrench, Laptop, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { User, Center } from '../types';

export interface SupportStaffPageProps {
  onNavigate?: (path: string) => void;
}

const SUPPORT_FUNCTIONS = [
  'Reception & Biometric Verification',
  'CBT Lab Technical Operations',
  'Practical Workshop & Tool Custodian',
  'Invigilation & Escort Support',
  'General Operational Support',
];

export const SupportStaffPage: React.FC<SupportStaffPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCountryAccount = user?.role === 'COUNTRY_ACCOUNT';
  const canSwitchCenter = isSuperAdmin || isCountryAccount;

  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>(
    user?.centerId || 'ALL'
  );

  const userCenterId = user?.centerId || (selectedCenterId !== 'ALL' ? selectedCenterId : 'ctr-sa-1');

  const [staffList, setStaffList] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [functionFilter, setFunctionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add Staff Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    assignedFunction: SUPPORT_FUNCTIONS[0],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    centerId: user?.centerId || 'ctr-sa-1',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Staff Modal
  const [viewingStaff, setViewingStaff] = useState<User | null>(null);

  const loadData = () => {
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    setCenters(allCenters);

    const effectiveCenter = user?.centerId || selectedCenterId;

    const centerStaff = allUsers.filter(u => {
      if (u.role !== 'SUPPORT_STAFF') return false;
      if (effectiveCenter === 'ALL') {
        if (isCountryAccount && user?.countryId) {
          return u.countryId === user.countryId;
        }
        return true;
      }
      return u.centerId === effectiveCenter;
    });
    setStaffList(centerStaff);
  };

  useEffect(() => {
    loadData();
  }, [selectedCenterId, user?.centerId]);

  const handleOpenAdd = () => {
    const autoUsername = `staff.${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      name: '',
      email: '',
      phone: '+966 5',
      username: autoUsername,
      assignedFunction: SUPPORT_FUNCTIONS[0],
      status: 'ACTIVE',
      centerId: userCenterId,
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = language === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = language === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Valid email is required';
    }
    if (!formData.username.trim()) {
      errs.username = language === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required';
    }
    if (!formData.phone.trim()) {
      errs.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveStaff = () => {
    if (!validateForm()) return;

    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    
    // Check if username already exists
    if (allUsers.some(u => u.username?.toLowerCase() === formData.username.trim().toLowerCase())) {
      setFormErrors(prev => ({ 
        ...prev, 
        username: language === 'ar' ? 'اسم المستخدم موجود بالفعل' : 'Username already exists' 
      }));
      return;
    }

    const newStaff: User = {
      id: `usr-staff-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      phone: formData.phone.trim(),
      role: 'SUPPORT_STAFF',
      centerId: userCenterId,
      countryId: user?.countryId || 'cnt-sa',
      assignedFunction: formData.assignedFunction,
      status: formData.status,
      createdAt: new Date().toISOString(),
      lastLogin: undefined,
    };

    const updated = [newStaff, ...allUsers];
    StorageService.set(STORAGE_KEYS.USERS, updated);
    setStaffList(updated.filter(u => u.role === 'SUPPORT_STAFF' && u.centerId === userCenterId));

    AuditService.log(
      'CREATE_SUPPORT_STAFF',
      'USER',
      `Registered support staff ${newStaff.name} (${newStaff.assignedFunction})`,
      newStaff.id,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? 'تمت إضافة موظف الدعم بنجاح' : 'Support staff member registered successfully',
      'success'
    );
    setIsAddOpen(false);
  };

  const handleToggleStatus = (targetUser: User) => {
    const nextStatus: 'ACTIVE' | 'INACTIVE' = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const updated = allUsers.map(u => u.id === targetUser.id ? { ...u, status: nextStatus } : u);
    StorageService.set(STORAGE_KEYS.USERS, updated);
    setStaffList(updated.filter(u => u.role === 'SUPPORT_STAFF' && u.centerId === userCenterId));

    AuditService.log(
      'UPDATE_USER',
      'USER',
      `Toggled status for support staff ${targetUser.name} to ${nextStatus}`,
      targetUser.id,
      'SUCCESS'
    );

    showToast(
      language === 'ar' ? `تم تغيير حالة ${targetUser.name} إلى ${nextStatus}` : `Status updated for ${targetUser.name}`,
      'info'
    );
  };

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFunc = functionFilter === 'ALL' || s.assignedFunction === functionFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesSearch && matchesFunc && matchesStatus;
    });
  }, [staffList, searchTerm, functionFilter, statusFilter]);

  // Statistics
  const activeCount = staffList.filter(s => s.status === 'ACTIVE').length;
  const receptionCount = staffList.filter(s => s.assignedFunction?.includes('Reception')).length;
  const labCount = staffList.filter(s => s.assignedFunction?.includes('CBT')).length;
  const workshopCount = staffList.filter(s => s.assignedFunction?.includes('Workshop')).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'إدارة موظفي الدعم' : 'Support Staff Management'}
        subtitle={language === 'ar' ? 'إدارة وتعيين كوادر الدعم الفني والإداري بالمركز' : 'Manage and deploy operational, biometric, and lab support personnel'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'موظفو الدعم' : 'Support Staff' }
        ]}
        actions={
          <Button 
            variant="primary" 
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            {language === 'ar' ? 'إضافة موظف دعم' : 'Add Support Staff'}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFCF8] p-5 rounded-xl border border-[#D5D0C7] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#7C756D] uppercase tracking-wider">
              {language === 'ar' ? 'إجمالي الموظفين' : 'Total Staff'}
            </p>
            <p className="text-2xl font-bold text-[#2C2623] mt-1">{staffList.length}</p>
            <p className="text-xs text-[#5C554E] mt-0.5">
              {language === 'ar' ? `${activeCount} نشط بالمركز` : `${activeCount} active in center`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#FFFCF8] p-5 rounded-xl border border-[#D5D0C7] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#7C756D] uppercase tracking-wider">
              {language === 'ar' ? 'الاستقبال والبصمة' : 'Reception & Biometrics'}
            </p>
            <p className="text-2xl font-bold text-[#2C2623] mt-1">{receptionCount}</p>
            <p className="text-xs text-[#5C554E] mt-0.5">
              {language === 'ar' ? 'التسجيل والتحقق' : 'Registration & Intake'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#C9A24D]/15 text-[#8F6F24] flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#FFFCF8] p-5 rounded-xl border border-[#D5D0C7] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#7C756D] uppercase tracking-wider">
              {language === 'ar' ? 'دعم معامل CBT' : 'CBT Lab Techs'}
            </p>
            <p className="text-2xl font-bold text-[#2C2623] mt-1">{labCount}</p>
            <p className="text-xs text-[#5C554E] mt-0.5">
              {language === 'ar' ? 'الشبكة والأجهزة' : 'Terminals & Network'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
            <Laptop className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#FFFCF8] p-5 rounded-xl border border-[#D5D0C7] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#7C756D] uppercase tracking-wider">
              {language === 'ar' ? 'مسؤولو الورش والأدوات' : 'Workshop Custodians'}
            </p>
            <p className="text-2xl font-bold text-[#2C2623] mt-1">{workshopCount}</p>
            <p className="text-xs text-[#5C554E] mt-0.5">
              {language === 'ar' ? 'تجهيز منصات العمل' : 'Station Calibration'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#FFFCF8] rounded-xl border border-[#D5D0C7] shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FAF8F5]/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[#7C756D]" />
            <input 
              type="text" 
              placeholder={language === 'ar' ? 'بحث بالاسم، المعرّف أو البريد...' : 'Search staff by name, ID or email...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg focus:outline-none focus:border-[#7A2E3A] text-[#2C2623]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {canSwitchCenter && (
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg text-[#2C2623] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">All Centers ({centers.length})</option>
                {centers
                  .filter(c => !isCountryAccount || !user?.countryId || c.countryId === user.countryId)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.countryId === 'cnt-bd' ? '🇧🇩 ' : c.countryId === 'cnt-sa' ? '🇸🇦 ' : '🇦🇪 '}
                      {c.nameEn} ({c.code})
                    </option>
                  ))}
              </select>
            )}

            <select
              value={functionFilter}
              onChange={(e) => setFunctionFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg text-[#2C2623] focus:outline-none focus:border-[#7A2E3A]"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الوظائف والمهام' : 'All Functions'}</option>
              {SUPPORT_FUNCTIONS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-[#FFFCF8] border border-[#D5D0C7] rounded-lg text-[#2C2623] focus:outline-none focus:border-[#7A2E3A]"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
              <option value="ACTIVE">{language === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E4DC] text-[#7C756D] text-xs font-medium uppercase">
                <th className="py-3.5 px-4">{language === 'ar' ? 'الموظف' : 'Staff Member'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'المركز' : 'Center'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'الوظيفة الموكلة' : 'Assigned Function'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'بيانات الاتصال' : 'Contact'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'تاريخ التسجيل' : 'Registered'}</th>
                <th className="py-3.5 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7C756D]">
                    <Users className="w-10 h-10 mx-auto text-[#D5D0C7] mb-2" />
                    <p className="font-medium">
                      {language === 'ar' ? 'لم يتم العثور على موظفي دعم مطابقين' : 'No support staff found for this center'}
                    </p>
                    <p className="text-xs mt-1">
                      {language === 'ar' ? 'يمكنك إضافة موظف جديد أو تعديل معايير البحث' : 'Try adjusting your search criteria or register a new staff member'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const ctr = centers.find(c => c.id === staff.centerId);
                  return (
                  <tr key={staff.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] font-bold flex items-center justify-center text-xs">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#2C2623]">{staff.name}</div>
                          <div className="text-xs text-[#7C756D] flex items-center gap-1">
                            <span>@{staff.username || 'unassigned'}</span>
                            <span className="text-[#D5D0C7]">•</span>
                            <span className="font-mono text-[11px]">{staff.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-[#2C2623]">{ctr ? ctr.nameEn : (staff.centerId || '—')}</div>
                      {ctr && <div className="text-[10px] font-mono text-[#7C756D]">{ctr.code}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#FAF8F5] text-[#2C2623] border border-[#E8E4DC]">
                        {staff.assignedFunction?.includes('Biometric') && <UserCheck className="w-3.5 h-3.5 text-[#C9A24D]" />}
                        {staff.assignedFunction?.includes('CBT') && <Laptop className="w-3.5 h-3.5 text-blue-600" />}
                        {staff.assignedFunction?.includes('Workshop') && <Wrench className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{staff.assignedFunction || (language === 'ar' ? 'دعم تشغيلي عام' : 'General Operations')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-xs text-[#5C554E]">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#7C756D]" />
                          <span>{staff.email}</span>
                        </div>
                        {staff.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#7C756D]" />
                            <span dir="ltr">{staff.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#7C756D]">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={staff.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingStaff(staff)}
                          title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                        >
                          <Eye className="w-4 h-4 text-[#7C756D] hover:text-[#2C2623]" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(staff)}
                          className={staff.status === 'ACTIVE' ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                        >
                          {staff.status === 'ACTIVE' 
                            ? (language === 'ar' ? 'تعطيل' : 'Deactivate') 
                            : (language === 'ar' ? 'تفعيل' : 'Activate')}
                        </Button>
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

      {/* Add Support Staff Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={language === 'ar' ? 'تسجيل موظف دعم جديد' : 'Register Support Staff'}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveStaff}>
              {language === 'ar' ? 'حفظ الموظف' : 'Save Staff Member'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#7C756D]">
            {language === 'ar' 
              ? 'سيتم تقييد حساب الموظف تلقائياً بمركزك الحالي وسينعكس في سجلات التدقيق.'
              : 'The account will be automatically constrained to your current center and recorded in audit trails.'}
          </p>

          <Input
            label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
            placeholder="e.g. Abdullah Al-Fahad"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={language === 'ar' ? 'اسم المستخدم' : 'Username'}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={formErrors.username}
              required
            />
            <Input
              label={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              required
            />

            <Select
              label={language === 'ar' ? 'الوظيفة الموكلة' : 'Assigned Function'}
              value={formData.assignedFunction}
              onChange={(e) => setFormData({ ...formData, assignedFunction: e.target.value })}
              options={SUPPORT_FUNCTIONS.map(f => ({ value: f, label: f }))}
            />
          </div>

          <Select
            label={language === 'ar' ? 'الحالة المبدئية' : 'Initial Status'}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={[
              { value: 'ACTIVE', label: language === 'ar' ? 'نشط (مفوّض للعمل)' : 'Active (Authorized)' },
              { value: 'INACTIVE', label: language === 'ar' ? 'غير نشط (معلق مؤقتاً)' : 'Inactive (Suspended)' },
            ]}
          />
        </div>
      </Modal>

      {/* View Staff Modal */}
      {viewingStaff && (
        <Modal
          isOpen={true}
          onClose={() => setViewingStaff(null)}
          title={language === 'ar' ? 'بيانات موظف الدعم' : 'Support Staff Dossier'}
          maxWidth="md"
          footer={
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingStaff(null)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
              <div className="w-14 h-14 rounded-xl bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center font-bold text-xl">
                {viewingStaff.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#2C2623]">{viewingStaff.name}</h4>
                <p className="text-xs text-[#7C756D]">@{viewingStaff.username || 'unassigned'} • ID: {viewingStaff.id}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={viewingStaff.status} />
                  <Badge variant="neutral" size="sm">{viewingStaff.role}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'الوظيفة الموكلة' : 'Assigned Function'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingStaff.assignedFunction || 'General Support'}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'المركز المعين' : 'Assigned Center'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingStaff.centerId || userCenterId}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</div>
                <div className="font-semibold text-[#2C2623]">{viewingStaff.email}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</div>
                <div className="font-semibold text-[#2C2623]" dir="ltr">{viewingStaff.phone || 'N/A'}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</div>
                <div className="font-semibold text-[#2C2623]">{new Date(viewingStaff.createdAt).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8E4DC]">
                <div className="text-[#7C756D] font-medium mb-1">{language === 'ar' ? 'آخر تسجيل دخول' : 'Last Login'}</div>
                <div className="font-semibold text-[#2C2623]">
                  {viewingStaff.lastLogin ? new Date(viewingStaff.lastLogin).toLocaleString() : (language === 'ar' ? 'لم يسجل دخول بعد' : 'Never')}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupportStaffPage;
