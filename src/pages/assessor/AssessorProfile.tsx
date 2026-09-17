import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  UserCircle,
  ShieldCheck,
  Award,
  Building2,
  Phone,
  Mail,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound
} from 'lucide-react';

export const AssessorProfile: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [phone, setPhone] = useState(user?.phone || '+966 55 444 5566');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(isRTL ? 'تم حفظ بيانات الاتصال بنجاح' : 'Contact preferences saved successfully', 'success');
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
    showToast(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Security credentials updated successfully', 'success');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <UserCircle className="w-4 h-4 text-[#7A2E3A]" />
          <span>{isRTL ? 'ملف المقيم والاعتمادات' : 'Assessor Profile & Credentials'}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#3F3030]">
          {isRTL ? 'الملف الشخصي ورخصة التقييم المهني' : 'Accredited Assessor Profile & License'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isRTL
            ? 'استعراض بيانات الاعتماد المهني، المهن المرخصة، وتحديث تفضيلات التواصل الشخصية.'
            : 'View official assessment accreditation, authorized occupation scope, and update contact settings.'}
        </p>
      </div>

      {/* Main Credentials Card */}
      <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7A2E3A] to-[#5C1D24] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-[#C9A24D]">
              YM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{user?.name || 'Eng. Yasir Mahmood'}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {isRTL ? 'مقيم نشط معتمد' : 'Certified Active'}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                ID: {user?.id || 'usr-4'} • username: {user?.username || 'assessor.yasir'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</span>
          </button>
        </div>

        {/* Locked Institutional Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">
              {isRTL ? 'المركز التابع له' : 'Affiliated Center'}
            </span>
            <div className="text-xs font-bold text-gray-900 mt-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#7A2E3A]" />
              <span>Riyadh Vocational Center #1</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">
              {isRTL ? 'رقم رخصة التقييم' : 'Accreditation License'}
            </span>
            <div className="text-xs font-bold text-gray-900 font-mono mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SA-ACC-2026-0982</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">
              {isRTL ? 'تاريخ صلاحية الاعتماد' : 'Valid Through'}
            </span>
            <div className="text-xs font-bold text-gray-900 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>31 Dec 2027</span>
            </div>
          </div>
        </div>

        {/* Certified Occupations */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C9A24D]" />
            <span>{isRTL ? 'المهن الفنية المعتمدة للتقييم' : 'Accredited Practical Evaluation Scope'}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24D]" />
              <span>Electrical Installation (Level 3 - Lead)</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A24D]" />
              <span>HVAC Maintenance & Commissioning</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
              <span>Industrial Automation (Junior Assessor)</span>
            </span>
          </div>

          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              {isRTL
                ? 'ملاحظة: نطاق المهن المرخصة والمركز التابع له يخضعان لإدارة حساب المركز (Center Admin). لتحديث المهن أو تجديد الرخصة يرجى مراجعة إدارة الاعتماد.'
                : 'Administrative Notice: Accredited occupational scope and center allocation are managed centrally by the Center Admin. Contact the accreditation office to amend qualification records.'}
            </span>
          </div>
        </div>
      </div>

      {/* Editable Contact Preferences Form */}
      <div className="bg-white rounded-2xl border border-[#E8D9D2] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#7A2E3A]" />
          <span>{isRTL ? 'بيانات الاتصال وتفضيلات الإشعارات' : 'Contact Preferences & Alert Notifications'}</span>
        </h3>

        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRTL ? 'البريد الإلكتروني المعتمد:' : 'Official Email Address:'}
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'assessor.lead@skillassess360.com'}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRTL ? 'رقم الهاتف المباشر:' : 'Mobile Contact Number:'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={e => setEmailNotifs(e.target.checked)}
                className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
              />
              <span className="text-xs text-gray-700 font-medium">
                {isRTL ? 'استلام إشعارات الجدول وتحديثات المرشحين عبر البريد الإلكتروني' : 'Receive automated schedule updates and candidate arrival alerts via email'}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsNotifs}
                onChange={e => setSmsNotifs(e.target.checked)}
                className="rounded text-[#7A2E3A] focus:ring-[#7A2E3A] w-4 h-4 border-gray-300"
              />
              <span className="text-xs text-gray-700 font-medium">
                {isRTL ? 'استلام تنبيهات الرسائل النصية القصيرة SMS للحالات العاجلة' : 'Receive urgent SMS alerts for schedule shifts or incident notices'}
              </span>
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-[#C9A24D]" />
              <span>{isRTL ? 'حفظ التفضيلات' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8D9D2]">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#7A2E3A]" />
              <span>{isRTL ? 'تغيير كلمة المرور' : 'Update Assessor Credentials'}</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {isRTL ? 'أدخل كلمة المرور الحالية وكلمة المرور الجديدة لتأمين حسابك.' : 'Enter your current password and choose a secure new password.'}
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isRTL ? 'كلمة المرور الحالية:' : 'Current Password:'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isRTL ? 'كلمة المرور الجديدة:' : 'New Password:'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold shadow-sm"
                >
                  {isRTL ? 'تحديث كلمة المرور' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
