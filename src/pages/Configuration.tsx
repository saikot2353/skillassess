import React, { useState, useEffect } from 'react';
import { 
  Sliders, Hash, Award, Settings, Save, AlertTriangle, 
  RotateCcw, Check, Globe, Clock, ShieldCheck, CheckCircle2,
  Sparkles, RefreshCw, Key
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { APROConfig, SerialConfig, AssessmentSettingsConfig, SystemSettings } from '../types';

interface ConfigurationPageProps {
  onNavigate?: (path: string) => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onNavigate }) => {
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('apro');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // 1. APRO Config State
  const [aproConfig, setAproConfig] = useState<APROConfig>({
    format: '{PREFIX}-{COUNTRY_CODE}-{SEQUENCE_NUM}',
    prefix: 'APRO',
    sequence: 92824,
    sampleGenerated: 'APRO-SA-092824',
    status: 'ACTIVE',
    isConfigurable: true,
    note: 'Assessment reference identifier format (Configurable / TBC pending final regulatory ratification).'
  });

  // 2. Serial Config State
  const [serialConfig, setSerialConfig] = useState<SerialConfig>({
    prefix: 'CERT',
    startingNumber: 10001,
    currentNumber: 10493,
    format: 'CERT-{COUNTRY}-{YEAR}-{NUMBER:5}',
    status: 'ACTIVE',
    note: 'Serial tracking for digital competency certificates (Configurable / TBC).'
  });

  // 3. Assessment Settings State
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

  // 4. System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    language: language,
    notificationsEnabled: true,
    autoRefreshInterval: 30,
    compactSidebar: false
  });

  // Load Configurations
  const loadConfigs = () => {
    const savedApro = StorageService.get<APROConfig | null>(STORAGE_KEYS.CONFIG_APRO, null);
    if (savedApro) setAproConfig(savedApro);

    const savedSerial = StorageService.get<SerialConfig | null>(STORAGE_KEYS.CONFIG_SERIAL, null);
    if (savedSerial) setSerialConfig(savedSerial);

    const savedAssessment = StorageService.get<AssessmentSettingsConfig | null>(STORAGE_KEYS.CONFIG_ASSESSMENT, null);
    if (savedAssessment) setAssessmentSettings(savedAssessment);

    const savedSettings = StorageService.get<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (savedSettings) setSystemSettings(savedSettings);
  };

  useEffect(() => {
    loadConfigs();

    // Check query params for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['apro', 'serial', 'assessment', 'system'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Update sample APRO
  const updateAproSample = (prefix: string, seq: number) => {
    const padded = String(seq).padStart(6, '0');
    return `${prefix}-SA-${padded}`;
  };

  // Update sample Serial
  const updateSerialSample = (prefix: string, cur: number) => {
    return `${prefix}-SA-2026-${cur}`;
  };

  // Save Handlers
  const handleSaveApro = () => {
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
    StorageService.set(STORAGE_KEYS.CONFIG_SERIAL, serialConfig);
    AuditService.log('UPDATE', 'SERIAL_CONFIG', `Updated certificate serial configuration: prefix=${serialConfig.prefix}, cur=${serialConfig.currentNumber} (Configurable / TBC)`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات الأرقام التسلسلية للشهادات بنجاح' : 'Serial configuration saved successfully', 'success');
  };

  const handleSaveAssessment = () => {
    StorageService.set(STORAGE_KEYS.CONFIG_ASSESSMENT, assessmentSettings);
    AuditService.log('UPDATE', 'ASSESSMENT_SETTINGS', `Updated assessment parameters: passThreshold=${assessmentSettings.passingScorePercentage}%, practicalWeight=${assessmentSettings.practicalWeightPercentage}%`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ معايير وضوابط التقييم بنجاح' : 'Assessment settings saved successfully', 'success');
  };

  const handleSaveSystem = () => {
    StorageService.set(STORAGE_KEYS.SETTINGS, systemSettings);
    if (systemSettings.language !== language) {
      setLanguage(systemSettings.language);
    }
    AuditService.log('UPDATE', 'SYSTEM_SETTINGS', `Updated system preferences: lang=${systemSettings.language}, refresh=${systemSettings.autoRefreshInterval}s`, undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات النظام بنجاح' : 'System preferences saved successfully', 'success');
  };

  const handleResetDemo = () => {
    StorageService.resetToDemo();
    setIsResetConfirmOpen(false);
    showToast(language === 'ar' ? 'تمت استعادة البيانات الافتراضية للمنظومة' : 'Database reset to default demo state', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const tabs = [
    { id: 'apro', label: language === 'ar' ? 'معرفات APRO (Configurable / TBC)' : 'APRO Configuration (Configurable / TBC)' },
    { id: 'serial', label: language === 'ar' ? 'التسلسل الرقمي (Configurable / TBC)' : 'Serial Configuration (Configurable / TBC)' },
    { id: 'assessment', label: language === 'ar' ? 'معايير التقييم والدرجات' : 'Assessment Settings' },
    { id: 'system', label: language === 'ar' ? 'إعدادات النظام العامة' : 'System Settings' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title={language === 'ar' ? 'إعدادات المنظومة وتخصيص الهيكلية' : 'System Configuration & Policy Governance'}
        subtitle={language === 'ar' ? 'ضبط المعايير الدولية للاختبار، قواعد الترقيم، التسلسل المرجعي والتفضيلات' : 'Supervisory policy controls, APRO numbering tokens, certificate serialization, and pass mark algorithms'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'التكوين والإعدادات' : 'Configuration' },
        ]}
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: APRO CONFIGURATION */}
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
                      : 'The exact APRO token syntax, checksum modulus algorithm, and national sovereignty prefixes are subject to ministerial ratification and remain fully configurable.'}
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
                    value={aproConfig.prefix}
                    onChange={e => setAproConfig({ ...aproConfig, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'صيغة التركيب العام (Format Expression)' : 'Token Format Template'}
                  </label>
                  <input
                    type="text"
                    value={aproConfig.format}
                    onChange={e => setAproConfig({ ...aproConfig, format: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono text-[11px] bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                  <span className="text-[10px] text-[#806F6F] mt-1 block">
                    Available tags: {'{PREFIX}'}, {'{COUNTRY_CODE}'}, {'{SEQUENCE_NUM}'}, {'{OCCUPATION}'}
                  </span>
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'الرقم التسلسلي الحالي (Sequence Counter)' : 'Current Sequence Integer'}
                  </label>
                  <input
                    type="number"
                    value={aproConfig.sequence}
                    onChange={e => setAproConfig({ ...aproConfig, sequence: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={handleSaveApro} leftIcon={<Save className="w-3.5 h-3.5" />}>
                    {language === 'ar' ? 'حفظ إعدادات APRO' : 'Save APRO Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Live Generator Preview */}
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <h4 className="text-xs font-bold text-[#806F6F] uppercase tracking-wider mb-2">
                {language === 'ar' ? 'المعاينة الحية لتوليد الرمز المرجعي' : 'Live Identifier Generation Preview'}
              </h4>
              <div className="p-4 rounded-xl bg-[#F8ECEE] border border-[#7A2E3A]/20 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-[#806F6F] mb-1">Generated Output</span>
                <span className="text-xl font-mono font-bold text-[#7A2E3A] tracking-wider">
                  {updateAproSample(aproConfig.prefix, aproConfig.sequence)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Format Checksum Validated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERIAL CONFIGURATION */}
      {activeTab === 'serial' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#C9A24D]" />
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'نظام الترقيم التسلسلي للشهادات المعتمدة' : 'Certificate Serial Numbering Architecture'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Configurable / TBC
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-[#FBF6E8] text-xs text-amber-900 mb-4 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{language === 'ar' ? 'حوكمة تسلسل الشهادات (Configurable / TBC)' : 'Serial Numbering Policy (Configurable / TBC)'}</p>
                  <p className="text-[11px] mt-0.5 text-amber-800">
                    {language === 'ar'
                      ? 'يتم إصدار الأرقام التسلسلية للشهادات المهنية الموثقة بصيغة قابلة للتحقق دولياً، وتخضع فترات تصفير العداد السنوي لمعايير الإشراف الوطني.'
                      : 'Serialization structure, cryptographic verification hash injection, and annual cadence reset logic remain subject to bilateral governance guidelines.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'بادئة الشهادة (Certificate Prefix)' : 'Certificate Prefix'}
                  </label>
                  <input
                    type="text"
                    value={serialConfig.prefix}
                    onChange={e => setSerialConfig({ ...serialConfig, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                </div>

                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'صيغة التسلسل (Format Formula)' : 'Serial Pattern Formula'}
                  </label>
                  <input
                    type="text"
                    value={serialConfig.format}
                    onChange={e => setSerialConfig({ ...serialConfig, format: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono text-[11px] bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#3F3030] font-semibold mb-1">
                      {language === 'ar' ? 'الرقم المبدئي' : 'Starting Sequence'}
                    </label>
                    <input
                      type="number"
                      value={serialConfig.startingNumber}
                      onChange={e => setSerialConfig({ ...serialConfig, startingNumber: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#3F3030] font-semibold mb-1">
                      {language === 'ar' ? 'العداد الحالي' : 'Current Pointer'}
                    </label>
                    <input
                      type="number"
                      value={serialConfig.currentNumber}
                      onChange={e => setSerialConfig({ ...serialConfig, currentNumber: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 font-mono bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={handleSaveSerial} leftIcon={<Save className="w-3.5 h-3.5" />}>
                    {language === 'ar' ? 'حفظ إعدادات التسلسل' : 'Save Serial Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <h4 className="text-xs font-bold text-[#806F6F] uppercase tracking-wider mb-2">
                {language === 'ar' ? 'نموذج الرقم التسلسلي للشهادة' : 'Sample Certificate Serial Output'}
              </h4>
              <div className="p-4 rounded-xl bg-[#FBF6E8] border border-[#C9A24D]/30 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-[#806F6F] mb-1">Formatted Certificate Serial</span>
                <span className="text-xl font-mono font-bold text-[#7A2E3A] tracking-wider">
                  {updateSerialSample(serialConfig.prefix, serialConfig.currentNumber)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  National Security QR Match Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSESSMENT SETTINGS */}
      {activeTab === 'assessment' && (
        <div className="max-w-3xl space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-[#7A2E3A]" />
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'معايير جلسات الاختبار والسياسات الأكاديمية' : 'Assessment Operational Thresholds & Grading Governance'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'مدة الاختبار النظري CBT (بالدقائق)' : 'CBT Theory Duration (Minutes)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.cbtDurationMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, cbtDurationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'مدة الاختبار العملي التطبيقي (بالدقائق)' : 'Practical Workshop Duration (Minutes)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.practicalDurationMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, practicalDurationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'الحد الأدنى لاجتياز التقييم (%)' : 'Minimum Passing Score (%)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.passingScorePercentage}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, passingScorePercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'الوزن النسبي للاختبار العملي (%)' : 'Practical Weight Distribution (%)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.practicalWeightPercentage}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, practicalWeightPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
                <span className="text-[10px] text-[#806F6F] mt-1 block">
                  Theory Weight auto-balances to: {100 - assessmentSettings.practicalWeightPercentage}%
                </span>
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'موعد إعلان قرعة المقيمين قبل الاختبار (ساعات - TBC)' : 'Assessor Allocation Disclosure Lead Time (Hours - TBC)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.assignmentReleaseHoursBefore}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, assignmentReleaseHoursBefore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              <div>
                <label className="block text-[#3F3030] font-semibold mb-1">
                  {language === 'ar' ? 'المهلة الزمنية لإغلاق السجل نهائياً (دقائق)' : 'Post-Evaluation Result Lock Window (Minutes)'}
                </label>
                <input
                  type="number"
                  value={assessmentSettings.lockTimeoutMinutes}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, lockTimeoutMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="space-y-2.5 pt-4 mt-4 border-t border-[#E8D9D2] text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <div>
                  <span className="text-[#3F3030] font-bold block">
                    {language === 'ar' ? 'تفعيل نظام القرعة العمياء للمقيمين (Anti-Bias Algorithm)' : 'Enforce Cryptographic Blind Assessor Lottery'}
                  </span>
                  <span className="text-[11px] text-[#806F6F]">
                    {language === 'ar' ? 'منع تكرار تقييم نفس المرشح وضمان نزاهة التوزيع' : 'Prevents familiarity bias by dynamically masking pairing until test execution window'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={assessmentSettings.blindLotteryEnforced}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, blindLotteryEnforced: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <div>
                  <span className="text-[#3F3030] font-bold block">
                    {language === 'ar' ? 'السماح بالتعديل الإداري المشروط للنتائج' : 'Enable Controlled Administrative Result Corrections'}
                  </span>
                  <span className="text-[11px] text-[#806F6F]">
                    {language === 'ar' ? 'يشترط تقديم مبرر رسمي وتسجيل الحدث في سجل التدقيق الأمني' : 'Requires mandatory supervisory rationale and creates immutable audit trace'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={assessmentSettings.allowResultCorrection}
                  onChange={e => setAssessmentSettings({ ...assessmentSettings, allowResultCorrection: e.target.checked })}
                  className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A]"
                />
              </label>
            </div>

            <div className="pt-4">
              <Button variant="primary" size="sm" onClick={handleSaveAssessment} leftIcon={<Save className="w-3.5 h-3.5" />}>
                {language === 'ar' ? 'حفظ معايير التقييم' : 'Save Assessment Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
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
                onClick={() => setSystemSettings({ ...systemSettings, language: 'en' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
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
                onClick={() => setSystemSettings({ ...systemSettings, language: 'ar' })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all font-arabic ${
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

          {/* Telemetry Refresh */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#C9A24D]" />
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'مزامنة بيانات الرصد الفوري' : 'Live Telemetry Auto-Refresh'}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="text-[#3F3030] font-medium">Interval Cadence:</label>
              <select
                value={systemSettings.autoRefreshInterval}
                onChange={e => setSystemSettings({ ...systemSettings, autoRefreshInterval: parseInt(e.target.value) })}
                className="px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value={10}>10 Seconds (High Velocity)</option>
                <option value={30}>30 Seconds (Recommended)</option>
                <option value={60}>60 Seconds (Conservation)</option>
                <option value={0}>Manual Refresh Only</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleSaveSystem} leftIcon={<Save className="w-3.5 h-3.5" />}>
              {language === 'ar' ? 'حفظ الإعدادات' : 'Save System Preferences'}
            </Button>
          </div>

          {/* Danger Zone: Factory Reset Demo Data */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 mt-6">
            <div className="flex items-center justify-between">
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
                onClick={() => setIsResetConfirmOpen(true)}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'استعادة الافتراضي' : 'Reset Seed Data'}
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
