import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { AuditService } from '../../services/auditService';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Center, User } from '../../types';
import {
  UserCircle,
  Building2,
  Shield,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Wrench,
  Calendar,
  Save
} from 'lucide-react';

export const SupportStaffProfile: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const center = user?.centerId
    ? StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []).find(c => c.id === user.centerId)
    : null;

  const [phone, setPhone] = useState(user?.phone || '+966 53 555 6677');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedUser: User = {
        ...user,
        phone: phone.trim()
      };
      StorageService.set(STORAGE_KEYS.AUTH, updatedUser);
      StorageService.updateItem(STORAGE_KEYS.USERS, updatedUser);
      AuditService.log('UPDATE', 'USER', `Support Staff updated contact phone number to ${phone.trim()}`, user.id);
    }
    showToast(isRTL ? 'تم حفظ تفضيلات الاتصال بنجاح' : 'Contact details saved successfully', 'success');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast(isRTL ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف' : 'Password must be at least 6 characters', 'error');
      return;
    }
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    AuditService.log('UPDATE', 'USER', 'Support Staff updated security password', user?.id);
    showToast(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto">
      <PageHeader
        title={isRTL ? 'الملف الشخصي لموظف الدعم' : 'Support Staff Profile & Center Mandate'}
        subtitle={
          isRTL
            ? 'بيانات الحساب التشغيلي، المركز المخصص، الوظيفة الموكلة، وإعدادات الاتصال.'
            : 'Center association, assigned operational function, account status, and contact preferences.'
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
              {user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'SS'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#3F3030]">{user?.name || 'Maryam Al-Shehri'}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {user?.status || 'ACTIVE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
                  {isRTL ? 'فريق الدعم التشغيلي' : 'Support Staff'}
                </span>
              </div>
              <div className="text-xs text-[#806F6F] font-mono mt-0.5">
                ID: {user?.id || 'usr-5'} • Username: {user?.username || 'support01'}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            leftIcon={<KeyRound className="w-3.5 h-3.5 text-[#7A2E3A]" />}
          >
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </Button>
        </div>

        {/* Locked Institutional Credentials Grid (Section 29: Support Staff must NOT be able to change Role, Center, User ID) */}
        <div className="pt-5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A2E3A]">
            <Lock className="w-3.5 h-3.5" />
            <span>{isRTL ? 'البيانات التشغيلية المعتمدة (للقراءة فقط)' : 'Institutional Governance Mandate (Locked)'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2] space-y-1">
              <span className="text-[11px] text-[#806F6F] block">{isRTL ? 'الدور الوظيفي' : 'System Role'}</span>
              <div className="font-semibold text-xs text-[#3F3030] flex items-center justify-between">
                <span>SUPPORT_STAFF</span>
                <Lock className="w-3 h-3 text-[#806F6F]" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2] space-y-1">
              <span className="text-[11px] text-[#806F6F] block">{isRTL ? 'المركز المخصص' : 'Assigned Center'}</span>
              <div className="font-semibold text-xs text-[#3F3030] flex items-center justify-between">
                <span className="truncate">{center ? (isRTL ? center.nameAr : center.nameEn) : 'Riyadh Central Technical Hub'}</span>
                <Lock className="w-3 h-3 text-[#806F6F]" />
              </div>
              <span className="text-[10px] font-mono text-[#7A2E3A] block">{center?.code || 'CTR-SA-001'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2] space-y-1">
              <span className="text-[11px] text-[#806F6F] block">{isRTL ? 'الوظيفة التشغيلية الموكلة' : 'Assigned Operation'}</span>
              <div className="font-semibold text-xs text-[#3F3030] flex items-center justify-between">
                <span className="truncate">{user?.assignedFunction || 'Reception & Biometric Verification'}</span>
                <Wrench className="w-3 h-3 text-[#C9A24D]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Contact Preferences */}
      <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-xs">
        <h3 className="text-sm font-bold text-[#3F3030] mb-4">
          {isRTL ? 'تفضيلات الاتصال والتواصل' : 'Contact & Alert Preferences'}
        </h3>

        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#3F3030] block mb-1">
                {isRTL ? 'البريد الإلكتروني' : 'Official Email Address'}
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-xs text-[#806F6F]">
                <Mail className="w-4 h-4 text-[#7A2E3A]" />
                <span title="Email locked to center domain" className="ms-auto">
                  <Lock className="w-3 h-3 text-[#806F6F]" />
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3F3030] block mb-1">
                {isRTL ? 'رقم الهاتف المباشر' : 'Direct Mobile Phone'}
              </label>
              <div className="flex items-center gap-2 bg-white border border-[#E8D9D2] rounded-lg focus-within:border-[#7A2E3A] p-2">
                <Phone className="w-4 h-4 text-[#806F6F]" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none text-[#3F3030]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isRTL ? 'حفظ التغييرات' : 'Save Contact Details'}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <Modal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          maxWidth="sm"
          title={isRTL ? 'تحديث كلمة المرور' : 'Update Security Password'}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="primary" size="sm" onClick={handleUpdatePassword}>
                {t.common.save}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
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
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password (min. 6 characters)'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
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
