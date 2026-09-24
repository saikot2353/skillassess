import React, { useState, useEffect } from 'react';
import { 
  Sliders, Hash, Award, Settings, Save, AlertTriangle, 
  RotateCcw, Check, Globe, Clock, ShieldCheck, CheckCircle2,
  Sparkles, RefreshCw, Key, CreditCard, Wrench, Bell, CheckCircle,
  FileSpreadsheet, Lock, ShieldAlert, Mail, MessageSquare, AlertOctagon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { 
  APROConfig, SerialConfig, AssessmentSettingsConfig, SystemSettings,
  IDCardConfig, PracticalTaskConfig, NotificationConfig 
} from '../types';

interface ConfigurationPageProps {
  onNavigate?: (path: string) => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onNavigate }) => {
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<string>('general');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // 1. General System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    language: language,
    notificationsEnabled: true,
    autoRefreshInterval: 30,
    compactSidebar: false
  });

  // 2. Assessment Settings State
  const [assessmentSettings, setAssessmentSettings] = useState<AssessmentSettingsConfig>({
    cbtDurationMinutes: 60,
    practicalDurationMinutes: 120,
    assignmentReleaseHoursBefore: 2,
    passingScorePercentage: 70,
    practicalWeightPercentage: 60,
    allowResultCorrection: true,
    lockTimeoutMinutes: 1440,
    blindLotteryEnforced: true
  });

  // 3. APRO Config State
  const [aproConfig, setAproConfig] = useState<APROConfig>({
    format: '{PREFIX}-{COUNTRY_CODE}-{SEQUENCE_NUM}',
    prefix: 'APRO',
    sequence: 92824,
    sampleGenerated: 'APRO-SA-092824',
    status: 'ACTIVE',
    isConfigurable: true,
    note: 'Assessment reference identifier format (Configurable / TBC pending final regulatory ratification).'
  });

  // 4. Serial Config State
  const [serialConfig, setSerialConfig] = useState<SerialConfig>({
    prefix: 'CERT',
    startingNumber: 10001,
    currentNumber: 10493,
    format: 'CERT-{COUNTRY}-{YEAR}-{NUMBER:5}',
    status: 'ACTIVE',
    note: 'Serial tracking for digital competency certificates (Configurable / TBC).'
  });

  // 5. ID Card Config State
  const [idCardConfig, setIdCardConfig] = useState<IDCardConfig>({
    templateName: 'Standard National Security Skill Card (ISO/IEC 7810 ID-1)',
    showQrCode: true,
    showPassport: true,
    showApro: true,
    primaryColor: '#7A2E3A',
    issueAuthority: 'SkillAssess 360 National Skill Verification Directorate',
    status: 'ACTIVE'
  });

  // 6. Practical Tasks Config State
  const [taskConfig, setTaskConfig] = useState<PracticalTaskConfig>({
    defaultDurationMinutes: 45,
    defaultPassingScore: 60,
    defaultMaxScore: 100,
    allowAssessorOverride: true,
    requireToolsChecklist: true,
    status: 'ACTIVE'
  });

  // 7. Notifications Config State
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    channels: {
      inApp: true,
      email: true,
      sms: false
    },
    notifyOnComplaintSubmitted: true,
    notifyOnResultLocked: true,
    notifyOnIdCardApproved: true,
    notifyOnLotteryExecution: true,
    adminAlertEmail: 'superadmin@skillassess360.gov.sa'
  });

  // Load Configurations from Storage
  const loadConfigs = () => {
    const savedSettings = StorageService.get<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (savedSettings) setSystemSettings(savedSettings);

    const savedAssessment = StorageService.get<AssessmentSettingsConfig | null>(STORAGE_KEYS.CONFIG_ASSESSMENT, null);
    if (savedAssessment) setAssessmentSettings(savedAssessment);

    const savedApro = StorageService.get<APROConfig | null>(STORAGE_KEYS.CONFIG_APRO, null);
    if (savedApro) setAproConfig(savedApro);

    const savedSerial = StorageService.get<SerialConfig | null>(STORAGE_KEYS.CONFIG_SERIAL, null);
    if (savedSerial) setSerialConfig(savedSerial);

    const savedIdCard = StorageService.get<IDCardConfig | null>(STORAGE_KEYS.CONFIG_IDCARD, null);
    if (savedIdCard) setIdCardConfig(savedIdCard);

    const savedTasks = StorageService.get<PracticalTaskConfig | null>(STORAGE_KEYS.CONFIG_TASKS, null);
    if (savedTasks) setTaskConfig(savedTasks);

    const savedNotifications = StorageService.get<NotificationConfig | null>(STORAGE_KEYS.CONFIG_NOTIFICATIONS, null);
    if (savedNotifications) setNotificationConfig(savedNotifications);
  };

  useEffect(() => {
    loadConfigs();

    // Check query params for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['general', 'assessment', 'apro', 'serial', 'idcard', 'tasks', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Format Helper Previews
  const updateAproSample = (prefix: string, seq: number) => {
    const padded = String(seq).padStart(6, '0');
    return `${prefix}-SA-${padded}`;
  };

  const updateSerialSample = (prefix: string, cur: number) => {
    return `${prefix}-SA-2026-${cur}`;
  };

  // Save Handlers
  const handleSaveSystem = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.SETTINGS, systemSettings);
    if (systemSettings.language !== language) {
      setLanguage(systemSettings.language);
    }
    AuditService.log('UPDATE', 'SYSTEM_SETTINGS', `Updated system preferences: lang=${systemSettings.language}, refresh=${systemSettings.autoRefreshInterval}s`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات النظام بنجاح' : 'System preferences saved successfully', 'success');
  };

  const handleSaveAssessment = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.CONFIG_ASSESSMENT, assessmentSettings);
    AuditService.log('UPDATE', 'ASSESSMENT_SETTINGS', `Updated assessment parameters: passThreshold=${assessmentSettings.passingScorePercentage}%, practicalWeight=${assessmentSettings.practicalWeightPercentage}%`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ معايير وضوابط التقييم بنجاح' : 'Assessment settings saved successfully', 'success');
  };

  const handleSaveApro = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    const updated = {
      ...aproConfig,
      sampleGenerated: updateAproSample(aproConfig.prefix, aproConfig.sequence)
    };
    StorageService.set(STORAGE_KEYS.CONFIG_APRO, updated);
    setAproConfig(updated);
    AuditService.log('UPDATE', 'APRO_CONFIG', `Updated APRO numbering configuration: prefix=${updated.prefix}, seq=${updated.sequence} (Configurable / TBC)`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات معرّف APRO بنجاح' : 'APRO configuration saved successfully', 'success');
  };

  const handleSaveSerial = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.CONFIG_SERIAL, serialConfig);
    AuditService.log('UPDATE', 'SERIAL_CONFIG', `Updated certificate serial configuration: prefix=${serialConfig.prefix}, cur=${serialConfig.currentNumber} (Configurable / TBC)`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات الأرقام التسلسلية للشهادات بنجاح' : 'Serial configuration saved successfully', 'success');
  };

  const handleSaveIdCard = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.CONFIG_IDCARD, idCardConfig);
    AuditService.log('UPDATE', 'IDCARD_CONFIG', `Updated ID card template configuration: template=${idCardConfig.templateName}, color=${idCardConfig.primaryColor}`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات بطاقة الهوية بنجاح' : 'ID card configuration saved successfully', 'success');
  };

  const handleSaveTasks = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.CONFIG_TASKS, taskConfig);
    AuditService.log('UPDATE', 'TASK_CONFIG', `Updated practical tasks blueprint config: duration=${taskConfig.defaultDurationMinutes}m, passScore=${taskConfig.defaultPassingScore}`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ معايير المهام العملية بنجاح' : 'Practical task settings saved successfully', 'success');
  };

  const handleSaveNotifications = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.set(STORAGE_KEYS.CONFIG_NOTIFICATIONS, notificationConfig);
    AuditService.log('UPDATE', 'NOTIFICATION_CONFIG', `Updated notification routing policies: email=${notificationConfig.adminAlertEmail}`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات قنوات التنبيه بنجاح' : 'Notification configuration saved successfully', 'success');
  };

  const handleResetDemo = () => {
    if (!isSuperAdmin) {
      showToast('Super Admin authorization required', 'error');
      return;
    }
    StorageService.resetToDemo();
    setIsResetConfirmOpen(false);
    showToast(language === 'ar' ? 'تمت استعادة البيانات الافتراضية للمنظومة' : 'Database reset to default demo state', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const tabs = [
    { id: 'general', label: language === 'ar' ? 'الإعدادات العامة' : 'General (System)' },
    { id: 'assessment', label: language === 'ar' ? 'معايير التقييم' : 'Assessment' },
    { id: 'serial', label: language === 'ar' ? 'التسلسل الرقمي' : 'Serial' },
    { id: 'idcard', label: language === 'ar' ? 'بطاقة الهوية' : 'ID Card' },
    { id: 'tasks', label: language === 'ar' ? 'المهام العملية' : 'Practical Tasks' },
    { id: 'notifications', label: language === 'ar' ? 'التنبيهات والإشعارات' : 'Notifications' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title={language === 'ar' ? 'إعدادات المنظومة وتخصيص الهيكلية' : 'System Configuration & Policy Governance'}
        subtitle={language === 'ar' ? 'ضبط المعايير الدولية للاختبار، قواعد الترقيم، التسلسل المرجعي والتفضيلات' : 'Supervisory policy controls, certificate serialization, ID card templates, and alerts'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'التكوين والإعدادات' : 'Configuration' },
        ]}
      />

      {/* Role Protection Banner */}
      {!isSuperAdmin && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 flex items-center gap-2.5 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <span className="font-bold">Role Protection Active: </span>
            <span>You are viewing configuration as <strong>{user?.role || 'Guest'}</strong>. Global system policies can only be modified by Super Admin. All configuration domains are presented in read-only mode.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. GENERAL SYSTEM SETTINGS TAB */}
      {activeTab === 'general' && (
        <div className="max-w-3xl space-y-4">
          {/* Language Selection */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[#7A2E3A]" />
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'لغة الواجهة وتنسيق الاتجاه' : 'Interface Language & Layout Direction'}
              </h3>
            </div>
            <p className="text-xs text-[#806F6F] mb-3">
              {language === 'ar'
                ? 'تدعم المنظومة التحول السلس بين اللغتين العربية (RTL) والإنجليزية (LTR).'
                : 'Toggle bilingual runtime environment with full bidirectional layout and typographic support.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => isSuperAdmin && setSystemSettings({ ...systemSettings, language: 'en' })}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSuperAdmin ? 'cursor-pointer' : 'cursor-default'
                } ${
                  systemSettings.language === 'en'
                    ? 'border-[#7A2E3A] bg-[#F8ECEE]/50 ring-1 ring-[#7A2E3A]'
                    : 'border-[#E8D9D2] hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#3F3030]">English (LTR)</span>
                  {systemSettings.language === 'en' && <Check className="w-4 h-4 text-[#7A2E3A]" />}
                </div>
                <p className="text-[11px] text-[#806F6F]">
                  Left-to-Right layout, Western numeric alignment, Left-anchored sidebar.
                </p>
              </div>

              <div
                onClick={() => isSuperAdmin && setSystemSettings({ ...systemSettings, language: 'ar' })}
                className={`p-3.5 rounded-xl border transition-all font-arabic ${
                  isSuperAdmin ? 'cursor-pointer' : 'cursor-default'
                } ${
                  systemSettings.language === 'ar'
                    ? 'border-[#7A2E3A] bg-[#F8ECEE]/50 ring-1 ring-[#7A2E3A]'
                    : 'border-[#E8D9D2] hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#3F3030]">العربية (RTL)</span>
                  {systemSettings.language === 'ar' && <Check className="w-4 h-4 text-[#7A2E3A]" />}
                </div>
                <p className="text-[11px] text-[#806F6F]">
                  تخطيط كامل من اليمين إلى اليسار، خطوط عربية واضحة، محاذاة ديناميكية للشريط الجانبي.
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Refresh & UX Options */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#C9A24D]" />
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'مزامنة بيانات الرصد وتفضيلات الواجهة' : 'Telemetry Auto-Refresh & Display Options'}
              </h3>
            </div>
            
            <div className="flex items-center justify-between text-xs py-1 border-b border-stone-100">
              <label className="text-[#3F3030] font-medium">Live Telemetry Cadence:</label>
              <select
                disabled={!isSuperAdmin}
                value={systemSettings.autoRefreshInterval}
                onChange={e => setSystemSettings({ ...systemSettings, autoRefreshInterval: parseInt(e.target.value) })}
                className="px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
              >
                <option value={10}>10 Seconds (High Velocity)</option>
                <option value={30}>30 Seconds (Standard / Recommended)</option>
                <option value={60}>60 Seconds (Conservation)</option>
                <option value={0}>Manual Refresh Only</option>
              </select>
            </div>

            <label className="flex items-center justify-between cursor-pointer text-xs py-1">
              <span className="text-[#3F3030] font-medium">
                {language === 'ar' ? 'تفعيل الإشعارات الصوتية والمرئية في الواجهة' : 'Enable Audible & Visual Toast Notifications'}
              </span>
              <input
                type="checkbox"
                disabled={!isSuperAdmin}
                checked={systemSettings.notificationsEnabled}
                onChange={e => setSystemSettings({ ...systemSettings, notificationsEnabled: e.target.checked })}
                className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
              />
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              disabled={!isSuperAdmin}
              onClick={handleSaveSystem}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'حفظ إعدادات النظام' : 'Save System Preferences'}
            </Button>
          </div>

          {/* Factory Reset Demo Data */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-800">
                  {language === 'ar' ? 'استعادة ضبط المصنع للبيانات التجريبية' : 'Restore Factory Demo Database'}
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  {language === 'ar'
                    ? 'إعادة تعيين كافة السجلات والمراكز والنتائج إلى البيانات الأصلية لنموذج العمل.'
                    : 'Reinitializes localStorage to default seed dataset with 5 roles, 3 countries, 7 centers, and fresh telemetry.'}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={!isSuperAdmin}
                onClick={() => setIsResetConfirmOpen(true)}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'استعادة الافتراضي' : 'Reset Seed Data'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ASSESSMENT SETTINGS TAB */}
      {activeTab === 'assessment' && (
        <div className="max-w-3xl space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7A2E3A]" />
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'معايير التقييم والمدد الزمنية' : 'Assessment Thresholds & Durations'}
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-[#806F6F]">
                Standard Rulebook v2.4
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'مدة الاختبار النظري (دقيقة)' : 'CBT Exam Duration (Minutes)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.cbtDurationMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, cbtDurationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'مدة الاختبار العملي (دقيقة)' : 'Practical Assessment Duration (Minutes)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.practicalDurationMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, practicalDurationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'نسبة النجاح العامة (%)' : 'Passing Threshold (%)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.passingScorePercentage}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, passingScorePercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'وزن الاختبار العملي (%)' : 'Practical Exam Weight (%)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.practicalWeightPercentage}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, practicalWeightPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'ساعات الكشف المسبق عن المهمة (Hours)' : 'Assignment Release Window (Hours Before)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.assignmentReleaseHoursBefore}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, assignmentReleaseHoursBefore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'مهلة قفل النتائج والدرجات (Minutes)' : 'Result Finalization Lockout (Minutes)'}
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={assessmentSettings.lockTimeoutMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, lockTimeoutMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">
                  {language === 'ar' ? 'إلزامية القرعة العشوائية غير القابلة للتنبؤ (Blind Lottery)' : 'Enforce Cryptographic Blind Lottery for Assessor Allocation'}
                </span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={assessmentSettings.blindLotteryEnforced}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, blindLotteryEnforced: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">
                  {language === 'ar' ? 'السماح بتصحيح النتائج قبل الإغلاق النهائي' : 'Allow Score Correction with Mandatory Audit Reason'}
                </span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={assessmentSettings.allowResultCorrection}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, allowResultCorrection: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!isSuperAdmin}
                onClick={handleSaveAssessment}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'حفظ معايير التقييم' : 'Save Assessment Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. APRO CONFIGURATION TAB */}
      {activeTab === 'apro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#7A2E3A]" />
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'إعدادات معرّف المرشح المرجعي APRO' : 'APRO Candidate Identifier Scheme'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Configurable / TBC
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-[#FBF6E8] text-xs text-amber-900 mb-4 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{language === 'ar' ? 'قاعدة مرنة غير نهائية (Configurable / TBC)' : 'Flexible Specification (Configurable / TBC)'}</p>
                  <p className="text-[11px] mt-0.5 text-amber-800">
                    {language === 'ar'
                      ? 'صيغة معرّف APRO وقواعد خانات التحقق الرقمية قابلة للتعديل والتهيئة، حيث تخضع للاتفاقيات التنظيمية بين الجهات الحكومية ومراكز التقييم دون فرض منطق جامد.'
                      : 'The exact APRO token syntax, sequence counters, and national sovereignty prefixes are managed via central SerialService and remain fully configurable.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'البادئة الرسمية (Prefix)' : 'Identifier Prefix'}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={aproConfig.prefix}
                    onChange={e => setAproConfig({ ...aproConfig, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'صيغة التركيب العام (Format Expression)' : 'Token Format Template'}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={aproConfig.format}
                    onChange={e => setAproConfig({ ...aproConfig, format: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'الرقم التسلسلي الحالي (Sequence Counter)' : 'Current Sequence Index'}
                  </label>
                  <input
                    type="number"
                    disabled={!isSuperAdmin}
                    value={aproConfig.sequence}
                    onChange={e => setAproConfig({ ...aproConfig, sequence: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isSuperAdmin}
                    onClick={handleSaveApro}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'حفظ إعدادات APRO' : 'Save APRO Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: APRO Visual Preview Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <h4 className="text-xs font-bold text-[#3F3030] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A24D]" />
                {language === 'ar' ? 'معاينة توليد معرّف APRO الفوري' : 'Live APRO Serial Preview'}
              </h4>
              <div className="p-4 rounded-xl bg-[#F8ECEE] border border-[#7A2E3A]/20 text-center space-y-1">
                <span className="text-[10px] text-[#806F6F] uppercase tracking-wider block">Generated Token Output</span>
                <span className="text-xl font-bold font-mono text-[#7A2E3A] block">
                  {updateAproSample(aproConfig.prefix, aproConfig.sequence)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Syntax Verified & Collision Free
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SERIAL CONFIGURATION TAB */}
      {activeTab === 'serial' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#7A2E3A]" />
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'تخصيص الأرقام التسلسلية للشهادات' : 'Certificate Serial Numbering Policy'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Configurable / TBC
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'بادئة الشهادة (Certificate Prefix)' : 'Certificate Prefix'}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={serialConfig.prefix}
                    onChange={e => setSerialConfig({ ...serialConfig, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'صيغة التسلسل العام' : 'Serialization Expression Pattern'}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={serialConfig.format}
                    onChange={e => setSerialConfig({ ...serialConfig, format: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#3F3030] font-semibold mb-1">
                      {language === 'ar' ? 'الرقم الابتدائي' : 'Starting Sequence'}
                    </label>
                    <input
                      type="number"
                      disabled={!isSuperAdmin}
                      value={serialConfig.startingNumber}
                      onChange={e => setSerialConfig({ ...serialConfig, startingNumber: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[#3F3030] font-semibold mb-1">
                      {language === 'ar' ? 'الرقم التسلسلي الحالي' : 'Current Number Index'}
                    </label>
                    <input
                      type="number"
                      disabled={!isSuperAdmin}
                      value={serialConfig.currentNumber}
                      onChange={e => setSerialConfig({ ...serialConfig, currentNumber: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isSuperAdmin}
                    onClick={handleSaveSerial}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'حفظ إعدادات التسلسل' : 'Save Serial Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <h4 className="text-xs font-bold text-[#3F3030] mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#C9A24D]" />
                {language === 'ar' ? 'معاينة رقم الشهادة القادمة' : 'Next Certificate Serial'}
              </h4>
              <div className="p-4 rounded-xl bg-[#FBF6E8] border border-[#C9A24D]/30 text-center space-y-1">
                <span className="text-[10px] text-[#806F6F] uppercase tracking-wider block">Official Accredited Output</span>
                <span className="text-xl font-bold font-mono text-[#91702C] block">
                  {updateSerialSample(serialConfig.prefix, serialConfig.currentNumber + 1)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Encrypted QR Verification Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ID CARD CONFIGURATION TAB */}
      {activeTab === 'idcard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#7A2E3A]" />
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'إعدادات بطاقة الهوية المهنية الذكية' : 'Digital Skill ID Card Parameters'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ISO/IEC 7810 ID-1 Standard
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'هيكل ونمط القالب المعتمد' : 'Form Factor Specification'}
                  </label>
                  <select
                    disabled={!isSuperAdmin}
                    value={idCardConfig.templateName}
                    onChange={e => setIdCardConfig({ ...idCardConfig, templateName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  >
                    <option value="Standard National Security Skill Card (ISO/IEC 7810 ID-1)">
                      Standard CR80 / ISO/IEC 7810 ID-1 (85.60 × 53.98 mm)
                    </option>
                    <option value="High-Security Diplomatic Trade Credential">
                      High-Security Diplomatic Trade Credential (UV Watermarked)
                    </option>
                    <option value="Center Lanyard Workshop Pass Form">
                      Center Lanyard Workshop Pass Form (Vertical 70 × 100 mm)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'السمة اللونية للبطاقة' : 'Primary Security Colorway'}
                  </label>
                  <div className="flex items-center gap-2.5">
                    {[
                      { hex: '#7A2E3A', label: 'Imperial Maroon' },
                      { hex: '#C9A24D', label: 'Regal Gold' },
                      { hex: '#1E3A8A', label: 'Diplomatic Navy' },
                      { hex: '#0F766E', label: 'Emerald Mint' },
                    ].map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        disabled={!isSuperAdmin}
                        onClick={() => setIdCardConfig({ ...idCardConfig, primaryColor: c.hex })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                          idCardConfig.primaryColor === c.hex
                            ? 'border-[#3F3030] bg-white shadow-xs ring-2 ring-[#7A2E3A]/20'
                            : 'border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'جهة الإصدار المعتمدة المطبوعة' : 'Accredited Issuing Authority'}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={idCardConfig.issueAuthority}
                    onChange={e => setIdCardConfig({ ...idCardConfig, issueAuthority: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                  />
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">Embed Cryptographic Verification QR Code</span>
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={idCardConfig.showQrCode}
                      onChange={e => setIdCardConfig({ ...idCardConfig, showQrCode: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">Display Candidate Passport Number on Card Face</span>
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={idCardConfig.showPassport}
                      onChange={e => setIdCardConfig({ ...idCardConfig, showPassport: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">Display Unique APRO Credential Serial</span>
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={idCardConfig.showApro}
                      onChange={e => setIdCardConfig({ ...idCardConfig, showApro: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isSuperAdmin}
                    onClick={handleSaveIdCard}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'حفظ إعدادات البطاقة' : 'Save ID Card Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <h4 className="text-xs font-bold text-[#3F3030] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A24D]" />
                Card Mockup Preview
              </h4>
              <div 
                className="aspect-[1.586/1] rounded-xl p-3.5 shadow-md border relative overflow-hidden flex flex-col justify-between text-white select-none"
                style={{
                  backgroundColor: idCardConfig.primaryColor,
                  borderColor: '#C9A24D',
                }}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold tracking-wider uppercase">SkillAssess 360</span>
                  <span className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-[8px] text-amber-200">ISO 7810</span>
                </div>
                <div className="flex items-center gap-2.5 my-auto">
                  <div className="w-12 h-14 rounded bg-white/20 border border-white/40 flex items-center justify-center text-white text-[8px] font-bold">
                    PHOTO
                  </div>
                  <div className="text-[10px] space-y-0.5">
                    <p className="font-bold">AHMAD AL-MANSOOR</p>
                    <p className="text-amber-200 text-[9px]">Electrical Installation</p>
                    <p className="font-mono text-[8px] text-white/80">APRO-SA-92824</p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-white/20 flex items-center justify-between text-[7px] text-white/80">
                  <span className="truncate max-w-[150px]">{idCardConfig.issueAuthority}</span>
                  <span className="font-mono">VALID: 2026-2028</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRACTICAL TASKS BLUEPRINT POLICY TAB */}
      {activeTab === 'tasks' && (
        <div className="max-w-3xl space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#7A2E3A]" />
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'سياسات ومعايير بنك المهام العملية' : 'Practical Task Blueprint Policy'}
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Rubric Governance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  Default Duration (Minutes)
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={taskConfig.defaultDurationMinutes}
                  onChange={e => setTaskConfig({ ...taskConfig, defaultDurationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  Default Passing Mark
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={taskConfig.defaultPassingScore}
                  onChange={e => setTaskConfig({ ...taskConfig, defaultPassingScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  Default Maximum Mark
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={taskConfig.defaultMaxScore}
                  onChange={e => setTaskConfig({ ...taskConfig, defaultMaxScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">
                  Require Tools & Equipment Safety Checklist Verification prior to task initiation
                </span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={taskConfig.requireToolsChecklist}
                  onChange={e => setTaskConfig({ ...taskConfig, requireToolsChecklist: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">
                  Allow Lead Assessor rubric variance adjustment with mandatory justification note
                </span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={taskConfig.allowAssessorOverride}
                  onChange={e => setTaskConfig({ ...taskConfig, allowAssessorOverride: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!isSuperAdmin}
                onClick={handleSaveTasks}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'حفظ سياسات المهام' : 'Save Task Blueprint Policy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. NOTIFICATIONS & ALERTS TAB */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#7A2E3A]" />
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'إعدادات قنوات الإشعار والتنبيهات' : 'System Notification Channels & Alert Triggers'}
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Multi-Channel Dispatch
              </span>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-[#3F3030] font-semibold text-xs mb-2">
                Enabled Delivery Gateways:
              </label>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={notificationConfig.channels.inApp}
                    onChange={e => setNotificationConfig({
                      ...notificationConfig,
                      channels: { ...notificationConfig.channels, inApp: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                  />
                  <span className="font-medium text-[#3F3030]">In-App Drawer</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={notificationConfig.channels.email}
                    onChange={e => setNotificationConfig({
                      ...notificationConfig,
                      channels: { ...notificationConfig.channels, email: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                  />
                  <span className="font-medium text-[#3F3030]">Email / SMTP</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={notificationConfig.channels.sms}
                    onChange={e => setNotificationConfig({
                      ...notificationConfig,
                      channels: { ...notificationConfig.channels, sms: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                  />
                  <span className="font-medium text-[#3F3030]">SMS Gateway</span>
                </label>
              </div>
            </div>

            {/* Email Dispatch Input */}
            <div className="text-xs">
              <label className="block text-[#3F3030] font-semibold mb-1">
                Primary Super Admin Incident Alert Email
              </label>
              <input
                type="email"
                disabled={!isSuperAdmin}
                value={notificationConfig.adminAlertEmail}
                onChange={e => setNotificationConfig({ ...notificationConfig, adminAlertEmail: e.target.value })}
                className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A] disabled:opacity-60"
              />
            </div>

            {/* Event Triggers */}
            <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">Alert on Candidate Complaint / Dispute Submission</span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={notificationConfig.notifyOnComplaintSubmitted}
                  onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnComplaintSubmitted: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">Alert on Assessment Session Finalized & Locked</span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={notificationConfig.notifyOnResultLocked}
                  onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnResultLocked: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">Alert on Cryptographic ID Card Approval & Issue</span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={notificationConfig.notifyOnIdCardApproved}
                  onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnIdCardApproved: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-[#3F3030] font-medium">Alert on Blind Assessor Lottery Execution</span>
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={notificationConfig.notifyOnLotteryExecution}
                  onChange={e => setNotificationConfig({ ...notificationConfig, notifyOnLotteryExecution: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A] disabled:opacity-60"
                />
              </label>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!isSuperAdmin}
                onClick={handleSaveNotifications}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'حفظ إعدادات التنبيهات' : 'Save Notification Configuration'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDemo}
        title={language === 'ar' ? 'تأكيد إعادة تعيين البيانات' : 'Confirm Demo Database Reset'}
        message={
          language === 'ar'
            ? 'هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة الافتراضية؟ سيتم مسح أي تعديلات محلية قمت بها.'
            : 'Are you sure you want to restore the prototype database to initial demo seed state? All locally added records will be replaced.'
        }
        confirmText={language === 'ar' ? 'نعم، استعد البيانات' : 'Yes, Reset Data'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
      />
    </div>
  );
};
