import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Center, Country, User } from '../types';
import {
  UserCircle,
  Building2,
  Globe2,
  Shield,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  Save,
  KeyRound,
  ShieldAlert,
  Award,
  Layers,
  Check
} from 'lucide-react';

export interface UserProfilePageProps {
  onNavigate?: (path: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const centers = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
  const countries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);

  const userCenter = user?.centerId ? centers.find(c => c.id === user.centerId) : null;
  const userCountry = user?.countryId 
    ? countries.find(c => c.id === user.countryId)
    : (userCenter ? countries.find(c => c.id === userCenter.countryId) : null);

  const [phone, setPhone] = useState(user?.phone || '+966 50 123 4567');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedUser: User = {
      ...user,
      phone: phone.trim(),
    };

    StorageService.set(STORAGE_KEYS.AUTH, updatedUser);
    StorageService.updateItem(STORAGE_KEYS.USERS, updatedUser);
    AuditService.log('UPDATE', 'USER', `User ${user.name} (${user.role}) updated contact telephone to ${phone.trim()}`, user.id, 'SUCCESS');
    showToast(isRTL ? 'تم حفظ تفضيلات الاتصال بنجاح' : 'Contact preferences saved successfully', 'success');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast(isRTL ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف' : 'New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', 'error');
      return;
    }

    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    AuditService.log('UPDATE', 'USER', `User ${user?.name} (${user?.role}) updated authentication password credentials`, user?.id, 'SUCCESS');
    showToast(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully', 'success');
  };

  const roleNameDisplay = user?.role ? t.roles[user.role] : 'Authorized User';

  const rolePermissionsMap: Record<string, string[]> = {
    SUPER_ADMIN: [
      'Global Jurisdiction Management',
      'Country & Center Administration',
      'System-Wide User Provisioning',
      'Lottery & Assessment Oversight',
      'Security Configuration & Audit Control',
      'Comprehensive Master Reporting & Exports'
    ],
    COUNTRY_ACCOUNT: [
      'National Jurisdiction Monitoring',
      'Country Center Compliance',
      'Batch & Schedule Inspection',
      'National Analytics & Reporting',
      'ID Card Regulatory Review'
    ],
    CENTER_ADMIN: [
      'Center Operational Management',
      'Schedule & Batch Lifecycle',
      'Reservation Import & Candidate Intake',
      'Practical & Assessor Lottery Execution',
      'Operational Result Audits & Corrections',
      'Center-Level Reports & Daily Logs'
    ],
    ASSESSOR: [
      'Candidate Identity Verification',
      'Practical Examination Workspace Execution',
      'Workpiece & Safety Evidence Ingestion',
      'Physical Evaluation Sheet Upload',
      'Rubric Scoring & Regulatory Result Lock'
    ],
    SUPPORT_STAFF: [
      'Candidate Reception Desk Support',
      'Biometric & Photo Matching Verification',
      'Batch Candidate Intake Assistance',
      'Operational Notification Monitoring'
    ]
  };

  const permissionsList = user?.role ? (rolePermissionsMap[user.role] || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl mx-auto">
      <PageHeader
        title={isRTL ? 'الملف التعريفي والأمان' : 'User Profile & Security Mandate'}
        subtitle={
          isRTL
            ? 'بيانات الحساب التشغيلي، الصلاحيات الممنوحة، النطاق الجغرافي، وإعدادات الأمان.'
            : 'Operational credentials, granted administrative privileges, geographic scope, and security settings.'
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: isRTL ? 'الملف الشخصي' : 'Profile' },
        ]}
      />

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E8D9D2]/70">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7A2E3A] to-[#5C1D24] text-white flex items-center justify-center font-bold text-xl shadow-xs border-2 border-[#C9A24D]">
              {user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'SA'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#3F3030]">{user?.name || 'Administrator'}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {user?.status || 'ACTIVE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                  {user?.role || 'AUTHORIZED'}
                </span>
              </div>
              <p className="text-xs text-[#806F6F] mt-1 flex items-center gap-2">
                <span>{roleNameDisplay}</span>
                <span>•</span>
                <span className="font-mono">{user?.email || 'admin@skillassess360.gov.sa'}</span>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            leftIcon={<KeyRound className="w-4 h-4 text-[#7A2E3A]" />}
          >
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </Button>
        </div>

        {/* Mandate & Scope Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D9D2]/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8D9D2] flex items-center justify-center text-[#7A2E3A] shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block font-medium uppercase tracking-wider">
                {isRTL ? 'الدولة / الولاية' : 'Country Jurisdiction'}
              </span>
              <span className="font-bold text-[#3F3030] block mt-0.5">
                {user?.role === 'SUPER_ADMIN' 
                  ? (isRTL ? 'نطاق عالمي غير مقيد' : 'Global (All Countries)')
                  : (userCountry ? (isRTL ? userCountry.nameAr : userCountry.nameEn) : 'Kingdom of Saudi Arabia')}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D9D2]/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8D9D2] flex items-center justify-center text-[#C9A24D] shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block font-medium uppercase tracking-wider">
                {isRTL ? 'المركز المعتمد' : 'Assigned Center'}
              </span>
              <span className="font-bold text-[#3F3030] block mt-0.5">
                {user?.role === 'SUPER_ADMIN'
                  ? (isRTL ? 'جميع المراكز المعتمدة' : 'All Accredited Centers')
                  : (userCenter ? (isRTL ? userCenter.nameAr : userCenter.nameEn) : 'Riyadh Center (CTR-SA-1)')}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8D9D2]/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8D9D2] flex items-center justify-center text-emerald-700 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block font-medium uppercase tracking-wider">
                {isRTL ? 'مستوى الصلاحيات' : 'Security Level'}
              </span>
              <span className="font-bold text-[#3F3030] block mt-0.5">
                {user?.role === 'SUPER_ADMIN' ? 'Level 1 — Full Governance' : 'Level 2 — Delegated Mandate'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Permissions Card */}
        <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-[#7A2E3A]" />
              <h3 className="text-sm font-bold text-[#3F3030]">
                {isRTL ? 'الصلاحيات المعتمدة للحساب' : 'Granted RBAC Privileges'}
              </h3>
            </div>
            <p className="text-xs text-[#806F6F] mb-4">
              {isRTL
                ? 'الصلاحيات المعرفة في مصفوفة الأدوار الرقابية الصارمة للنظام.'
                : 'Active capabilities granted in accordance with SkillAssess 360 RBAC specifications.'}
            </p>

            <div className="space-y-2.5">
              {permissionsList.map((perm, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-[#3F3030]">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8D9D2]/70 text-[11px] text-[#806F6F]">
            {isRTL
              ? 'تتم مراجعة وتدقيق هذه الصلاحيات دورياً من قِبل مدراء أمن المعلومات.'
              : 'Privileges are subject to continuous audit logging and supervisory governance.'}
          </div>
        </div>

        {/* Contact Preferences Form */}
        <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-5 h-5 text-[#C9A24D]" />
            <h3 className="text-sm font-bold text-[#3F3030]">
              {isRTL ? 'بيانات الاتصال والتنبيهات' : 'Contact & Alert Preferences'}
            </h3>
          </div>
          <p className="text-xs text-[#806F6F] mb-4">
            {isRTL
              ? 'تحديث رقم الهاتف لتلقي رسائل التحقق والإشعارات التشغيلية الطارئة.'
              : 'Keep operational contact numbers updated for multi-factor alerts and emergency dispatch.'}
          </p>

          <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#3F3030] mb-1">
                {isRTL ? 'البريد الإلكتروني الرسمي' : 'Official Email Address'}
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#E8D9D2] rounded-lg text-[#806F6F]">
                <Mail className="w-4 h-4 text-[#A89595]" />
                <span className="font-mono">{user?.email || 'admin@skillassess360.gov.sa'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#3F3030] mb-1">
                {isRTL ? 'رقم الهاتف المعتمد' : 'Registered Mobile Number'}
              </label>
              <div className="flex items-center gap-2 p-1.5 bg-white border border-[#E8D9D2] rounded-lg focus-within:border-[#7A2E3A] focus-within:ring-1 focus-within:ring-[#7A2E3A]">
                <Phone className="w-4 h-4 text-[#A89595] ms-1.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-transparent focus:outline-none text-[#3F3030] font-mono text-xs px-1"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={e => setEmailNotifs(e.target.checked)}
                  className="rounded border-[#E8D9D2] text-[#7A2E3A] focus:ring-[#7A2E3A]"
                />
                <span className="text-[#3F3030]">
                  {isRTL ? 'تلقي ملخص الإشعارات عبر البريد الإلكتروني' : 'Receive daily operational email digest'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsNotifs}
                  onChange={e => setSmsNotifs(e.target.checked)}
                  className="rounded border-[#E8D9D2] text-[#7A2E3A] focus:ring-[#7A2E3A]"
                />
                <span className="text-[#3F3030]">
                  {isRTL ? 'تلقي تنبيهات التحقق ورسائل SMS العاجلة' : 'Enable urgent SMS anomaly dispatches'}
                </span>
              </label>
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isRTL ? 'حفظ التعديلات' : 'Save Contact Preferences'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <Modal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          title={isRTL ? 'تحديث كلمة المرور' : 'Update Security Password'}
          subtitle={
            isRTL
              ? 'أدخل كلمة المرور الحالية والجديدة لتحديث بيانات الدخول.'
              : 'Enter current and new authentication credentials for your account.'
          }
          icon={<Lock className="w-5 h-5 text-[#7A2E3A]" />}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordModal(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdatePassword}
              >
                {isRTL ? 'تأكيد التغيير' : 'Update Password'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#3F3030] mb-1">
                {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#3F3030] mb-1">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              />
              <span className="text-[10px] text-[#806F6F] mt-1 block">
                {isRTL ? 'الحد الأدنى 6 أحرف' : 'Minimum 6 alphanumeric characters required.'}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#3F3030] mb-1">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
