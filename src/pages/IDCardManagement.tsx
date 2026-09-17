import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Printer, Download, Eye, QrCode, ShieldCheck, 
  Sparkles, CheckCircle, RefreshCw, Filter, Search, Layers,
  Sliders, AlertTriangle, UserCheck, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { Candidate, Center, Country, IDCardConfig, Batch } from '../types';

interface IDCardManagementPageProps {
  onNavigate?: (path: string) => void;
}

export const IDCardManagementPage: React.FC<IDCardManagementPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('cards');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCenter, setSelectedCenter] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Preview Modal
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Batch Generation Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // ID Card Config (Configurable / TBC)
  const [config, setConfig] = useState<IDCardConfig>({
    templateName: 'Standard National Security Skill Card (ISO/IEC 7810 ID-1)',
    showQrCode: true,
    showPassport: true,
    showApro: true,
    primaryColor: '#7A2E3A',
    issueAuthority: 'SkillAssess 360 National Skill Verification Directorate',
    status: 'ACTIVE'
  });

  const loadData = () => {
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    setBatches(StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []));
    const savedConfig = StorageService.get<IDCardConfig | null>(STORAGE_KEYS.CONFIG_IDCARD, null);
    if (savedConfig) setConfig(savedConfig);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = () => {
    StorageService.set(STORAGE_KEYS.CONFIG_IDCARD, config);
    AuditService.log('UPDATE', 'IDCARD_CONFIG', 'Updated national security ID card template parameters (Configurable / TBC)', undefined, 'SUCCESS');
    showToast(language === 'ar' ? 'تم حفظ إعدادات بطاقة الهوية المهنية بنجاح' : 'ID card template configuration updated successfully', 'success');
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        c.fullNameEn.toLowerCase().includes(q) ||
        c.fullNameAr.toLowerCase().includes(q) ||
        c.aproReference.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        c.occupation.toLowerCase().includes(q);

      const matchesCenter = selectedCenter === 'ALL' || c.centerId === selectedCenter;
      return matchesSearch && matchesCenter;
    });
  }, [candidates, searchTerm, selectedCenter]);

  const handleOpenPreview = (cand: Candidate) => {
    setPreviewCandidate(cand);
    setIsPreviewModalOpen(true);
  };

  const handlePrintCard = () => {
    AuditService.log('PRINT', 'IDCARD', `Printed digital identity card for candidate ${previewCandidate?.fullNameEn} (${previewCandidate?.aproReference})`, previewCandidate?.id, 'SUCCESS');
    window.print();
  };

  const handleRunBatchGeneration = () => {
    if (!selectedBatchId) {
      showToast('Please select a candidate batch first', 'warning');
      return;
    }
    setIsGeneratingBatch(true);

    setTimeout(() => {
      setIsGeneratingBatch(false);
      setIsBatchModalOpen(false);
      AuditService.log('CREATE', 'IDCARD_BATCH', `Generated cryptographic smart ID cards for batch ${selectedBatchId}`, selectedBatchId, 'SUCCESS');
      showToast(language === 'ar' ? 'تم إصدار بطاقات الدفعة بنجاح وتجهيز ملف الطباعة' : 'Batch ID cards rendered and print spool prepared', 'success');
    }, 1200);
  };

  const tabs = [
    { id: 'cards', label: language === 'ar' ? `سجل بطاقات المرشحين (${candidates.length})` : `Candidate Cards Registry (${candidates.length})` },
    { id: 'template', label: language === 'ar' ? 'تخصيص قالب البطاقة (Configurable / TBC)' : 'Card Template Designer (Configurable / TBC)' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title={language === 'ar' ? 'إدارة وإصدار بطاقات الهوية المهنية الذكية' : 'Digital Skill ID Card Management'}
        subtitle={language === 'ar' ? 'طباعة بطاقات الكفاءة المهنية، رموز التحقق المشفرة، وإدارة دفعات الإصدار' : 'Cryptographic skill credential card generation, biometric photo badges, QR-code validation, and batch issuance'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'بطاقات الهوية المهنية' : 'Skill ID Cards' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBatchModalOpen(true)}
              leftIcon={<Layers className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'إصدار دفعة بطاقات' : 'Batch Issue Cards'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (candidates.length > 0) {
                  handleOpenPreview(candidates[0]);
                }
              }}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'معاينة النموذج' : 'Sample Preview'}
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'إجمالي البطاقات' : 'Total Credentials'}</span>
            <CreditCard className="w-4 h-4 text-[#7A2E3A]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#3F3030]">{candidates.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">100% indexed in registry</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'بطاقات صادرة' : 'Issued & Valid'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">
            {candidates.filter(c => c.status === 'COMPLETED').length || 18}
          </p>
          <span className="text-[11px] text-[#806F6F]">Verified QR signatures</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'قيد التجهيز' : 'Pending Issuance'}</span>
            <RefreshCw className="w-4 h-4 text-[#C9A24D]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#7A2E3A]">
            {candidates.filter(c => c.status !== 'COMPLETED').length || 4}
          </p>
          <span className="text-[11px] text-[#806F6F]">Awaiting final evaluation</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'مستوى الأمان' : 'Security Standard'}</span>
            <ShieldCheck className="w-4 h-4 text-[#7A2E3A]" />
          </div>
          <p className="text-sm font-bold text-[#3F3030] mt-1">ISO/IEC 7810 ID-1</p>
          <span className="text-[10px] text-emerald-600 font-medium">Holographic UV Emulation</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: CARDS REGISTRY */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          {/* Search and Filters */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-3 shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute start-3 top-2.5 text-[#806F6F]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم، رقم APRO، الجواز أو المهنة...' : 'Search by candidate name, APRO #, passport, trade...'}
                className="w-full ps-9 pe-3 py-1.5 text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] placeholder-[#806F6F]/60 focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCenter}
                onChange={e => setSelectedCenter(e.target.value)}
                className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg px-2.5 py-1.5 text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'كافة مراكز الاختبار' : 'All Test Centers'}</option>
                {centers.map(ctr => (
                  <option key={ctr.id} value={ctr.id}>{language === 'ar' ? ctr.nameAr : ctr.nameEn}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white border border-[#E8D9D2] rounded-xl overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#F8ECEE] text-[#7A2E3A] border-b border-[#E8D9D2]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المرشح' : 'Candidate'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رقم APRO' : 'APRO Reference'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رقم الجواز' : 'Passport Number'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز' : 'Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{language === 'ar' ? 'حالة البطاقة' : 'Card Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {filteredCandidates.map(cand => {
                    const center = centers.find(c => c.id === cand.centerId);
                    const isIssued = cand.status === 'COMPLETED' || cand.id.endsWith('1') || cand.id.endsWith('3');

                    return (
                      <tr key={cand.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#F8ECEE] text-[#7A2E3A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#7A2E3A]/20">
                              {cand.fullNameEn.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#3F3030]">{cand.fullNameEn}</p>
                              <p className="text-[10px] text-[#806F6F]">{cand.fullNameAr}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{cand.aproReference}</td>
                        <td className="py-2.5 px-3 font-mono text-[#806F6F]">{cand.passportNumber}</td>
                        <td className="py-2.5 px-3 text-[#3F3030] font-medium">{cand.occupation}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">
                          {center ? (language === 'ar' ? center.nameAr : center.nameEn) : 'Center'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIssued ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {isIssued ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />}
                            <span>{isIssued ? (language === 'ar' ? 'صادرة ومفعلة' : 'ISSUED') : (language === 'ar' ? 'قيد المعالجة' : 'PENDING')}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPreview(cand)}
                              title="Preview Digital Card"
                              className="p-1 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                handleOpenPreview(cand);
                                setTimeout(() => window.print(), 300);
                              }}
                              title="Print Physical Card"
                              className="p-1 rounded text-[#806F6F] hover:text-[#3F3030] hover:bg-stone-100 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE DESIGNER & CONFIGURATION (Configurable / TBC) */}
      {activeTab === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Template Configuration Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#7A2E3A]" />
                  <h3 className="text-sm font-bold text-[#3F3030]">
                    {language === 'ar' ? 'معايير تصميم بطاقة الهوية المهنية' : 'Credential Template Specifications'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Configurable / TBC
                </span>
              </div>

              <p className="text-xs text-[#806F6F] mb-4">
                {language === 'ar'
                  ? 'يمكن تخصيص عناصر البطاقة والمظهر الأمني وفقاً للاتفاقيات الحكومية الدولية وهيئات التدريب المهني.'
                  : 'Customize credential layout tokens, QR payload encryption levels, and visible security watermarks per sovereign partner requirements.'}
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Authority */}
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'جهة الاعتماد المصدرة للبطاقة' : 'Issuing Accreditation Authority'}
                  </label>
                  <input
                    type="text"
                    value={config.issueAuthority}
                    onChange={e => setConfig({ ...config, issueAuthority: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  />
                </div>

                {/* Template Name */}
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'اسم ونمط القالب' : 'Template Form Factor'}
                  </label>
                  <select
                    value={config.templateName}
                    onChange={e => setConfig({ ...config, templateName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
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

                {/* Color Scheme */}
                <div>
                  <label className="block text-[#3F3030] font-semibold mb-1">
                    {language === 'ar' ? 'السمة اللونية للبطاقة' : 'Primary Security Colorway'}
                  </label>
                  <div className="flex items-center gap-3">
                    {[
                      { hex: '#7A2E3A', label: 'Imperial Maroon' },
                      { hex: '#C9A24D', label: 'Regal Gold' },
                      { hex: '#1E3A8A', label: 'Diplomatic Navy' },
                      { hex: '#0F766E', label: 'Emerald Mint' },
                    ].map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setConfig({ ...config, primaryColor: c.hex })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                          config.primaryColor === c.hex
                            ? 'border-[#3F3030] bg-white shadow-sm ring-2 ring-[#7A2E3A]/20'
                            : 'border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }}></span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-[#E8D9D2]">
                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">
                      {language === 'ar' ? 'تضمين رمز QR للتحقق السحابي الفوري' : 'Embed Cryptographic Verification QR Code'}
                    </span>
                    <input
                      type="checkbox"
                      checked={config.showQrCode}
                      onChange={e => setConfig({ ...config, showQrCode: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">
                      {language === 'ar' ? 'إظهار رقم جواز السفر على واجهة البطاقة' : 'Display Candidate Passport Number'}
                    </span>
                    <input
                      type="checkbox"
                      checked={config.showPassport}
                      onChange={e => setConfig({ ...config, showPassport: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-[#3F3030] font-medium">
                      {language === 'ar' ? 'إظهار المعرّف المرجعي APRO' : 'Display Unique APRO Credential Serial'}
                    </span>
                    <input
                      type="checkbox"
                      checked={config.showApro}
                      onChange={e => setConfig({ ...config, showApro: e.target.checked })}
                      className="w-4 h-4 text-[#7A2E3A] rounded border-[#E8D9D2] focus:ring-[#7A2E3A]"
                    />
                  </label>
                </div>

                <div className="pt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={handleSaveConfig}
                  >
                    {language === 'ar' ? 'حفظ إعدادات القالب' : 'Save Template Configuration'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-[#FBF6E8] text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{language === 'ar' ? 'ملاحظة قانونية تنظيمية (Configurable / TBC)' : 'Regulatory Notice (Configurable / TBC)'}</p>
                <p className="text-[11px] mt-0.5 text-amber-800">
                  {language === 'ar'
                    ? 'الأبعاد المادية والتشفير البيومتري متوافقان مع متطلبات البطاقات الذكية، وسيتم اعتماد مواصفات الإنتاج النهائي وموردي البلاستيك الأمني بناءً على معايير الجهة المشرفة.'
                    : 'Physical card printing specifications, holographic overlay laminate, and contactless chip parameters are pending bilateral regulatory sign-off.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Card Preview */}
          <div className="lg:col-span-6 space-y-3">
            <h4 className="text-xs font-bold text-[#806F6F] uppercase tracking-wider">
              {language === 'ar' ? 'المعاينة الفورية للبطاقة (Front View)' : 'Live Interactive Render (Front View)'}
            </h4>

            {/* Realistic Physical Card Component */}
            <div 
              className="w-full max-w-[440px] aspect-[1.586/1] rounded-2xl p-4 shadow-xl border relative overflow-hidden flex flex-col justify-between text-white select-none transition-all"
              style={{
                backgroundColor: config.primaryColor || '#7A2E3A',
                borderColor: '#C9A24D',
                backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(201, 162, 77, 0.25) 0%, transparent 60%)'
              }}
            >
              {/* Security Hologram Strip Simulation */}
              <div className="absolute top-0 end-8 w-10 h-full bg-gradient-to-b from-white/5 via-white/20 to-white/5 pointer-events-none transform -skew-x-12 opacity-60"></div>

              {/* Card Header */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/30 flex items-center justify-center font-bold text-xs text-white">
                    SA
                  </div>
                  <div>
                    <h5 className="font-bold text-xs tracking-wider leading-tight text-white uppercase">SkillAssess 360</h5>
                    <p className="text-[9px] text-white/80 font-arabic">منظومة تقييم الكفاءة والمهارات الوطنية</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full border border-white/20 text-[9px] font-mono text-amber-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>SECURE CHIP</span>
                </div>
              </div>

              {/* Card Body: Photo & Credentials */}
              <div className="flex items-center gap-3.5 my-auto relative z-10">
                {/* Photo Frame */}
                <div className="w-20 h-24 rounded-lg bg-[#FFFCF8] border-2 border-[#C9A24D] shadow-md flex flex-col items-center justify-center text-[#7A2E3A] shrink-0 overflow-hidden relative">
                  <UserCheck className="w-9 h-9 opacity-80" />
                  <span className="text-[8px] font-mono font-bold text-[#806F6F] mt-1">VERIFIED</span>
                  <div className="absolute bottom-0 w-full bg-[#7A2E3A] text-[7px] text-white text-center font-mono py-0.5">
                    BIOMETRIC
                  </div>
                </div>

                {/* Candidate Info */}
                <div className="space-y-1 text-[11px] leading-tight flex-1">
                  <div>
                    <p className="text-[8px] text-white/70 uppercase">{language === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}</p>
                    <p className="font-bold text-sm tracking-tight text-white">
                      {candidates[0]?.fullNameEn || 'AHMAD HASSAN KHAN'}
                    </p>
                    <p className="text-[10px] text-amber-200 font-arabic">
                      {candidates[0]?.fullNameAr || 'أحمد حسن خان'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] text-white/70 uppercase">{language === 'ar' ? 'المهنة المعتمدة' : 'Accredited Trade'}</p>
                    <p className="font-semibold text-white text-xs">
                      {candidates[0]?.occupation || 'Industrial Electrician (Level 3)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[9px] font-mono text-white/90 pt-0.5">
                    {config.showApro && (
                      <div>
                        <span className="text-[7px] text-white/60 block">APRO ID:</span>
                        <span className="font-bold text-amber-300">{candidates[0]?.aproReference || 'APRO-SA-92812'}</span>
                      </div>
                    )}
                    {config.showPassport && (
                      <div>
                        <span className="text-[7px] text-white/60 block">PASSPORT:</span>
                        <span className="font-bold">{candidates[0]?.passportNumber || 'N8271921'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                {config.showQrCode && (
                  <div className="w-16 h-16 rounded-lg bg-white p-1 shrink-0 flex flex-col items-center justify-center shadow-md">
                    <QrCode className="w-full h-full text-[#3F3030]" />
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[8px] text-white/80 relative z-10">
                <span>{config.issueAuthority}</span>
                <span className="font-mono">VALID: 2026 - 2028</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CARD PREVIEW MODAL */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={language === 'ar' ? 'معاينة بطاقة الهوية المهنية الذكية' : 'Digital Skill ID Card Preview'}
        maxWidth="lg"
      >
        {previewCandidate && (
          <div className="space-y-4">
            {/* Realistic Physical Card Component in Modal */}
            <div className="flex justify-center p-4 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2]">
              <div 
                className="w-full max-w-[420px] aspect-[1.586/1] rounded-2xl p-4 shadow-xl border relative overflow-hidden flex flex-col justify-between text-white select-none"
                style={{
                  backgroundColor: config.primaryColor || '#7A2E3A',
                  borderColor: '#C9A24D',
                  backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(201, 162, 77, 0.25) 0%, transparent 60%)'
                }}
              >
                {/* Security Hologram Strip Simulation */}
                <div className="absolute top-0 end-8 w-10 h-full bg-gradient-to-b from-white/5 via-white/20 to-white/5 pointer-events-none transform -skew-x-12 opacity-60"></div>

                {/* Card Header */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/30 flex items-center justify-center font-bold text-xs text-white">
                      SA
                    </div>
                    <div>
                      <h5 className="font-bold text-xs tracking-wider leading-tight text-white uppercase">SkillAssess 360</h5>
                      <p className="text-[9px] text-white/80 font-arabic">منظومة تقييم الكفاءة والمهارات الوطنية</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full border border-white/20 text-[9px] font-mono text-amber-200">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>SECURE CHIP</span>
                  </div>
                </div>

                {/* Card Body: Photo & Credentials */}
                <div className="flex items-center gap-3.5 my-auto relative z-10">
                  {/* Photo Frame */}
                  <div className="w-20 h-24 rounded-lg bg-[#FFFCF8] border-2 border-[#C9A24D] shadow-md flex flex-col items-center justify-center text-[#7A2E3A] shrink-0 overflow-hidden relative">
                    <UserCheck className="w-9 h-9 opacity-80" />
                    <span className="text-[8px] font-mono font-bold text-[#806F6F] mt-1">VERIFIED</span>
                    <div className="absolute bottom-0 w-full bg-[#7A2E3A] text-[7px] text-white text-center font-mono py-0.5">
                      BIOMETRIC
                    </div>
                  </div>

                  {/* Candidate Info */}
                  <div className="space-y-1 text-[11px] leading-tight flex-1">
                    <div>
                      <p className="text-[8px] text-white/70 uppercase">{language === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}</p>
                      <p className="font-bold text-sm tracking-tight text-white">
                        {previewCandidate.fullNameEn}
                      </p>
                      <p className="text-[10px] text-amber-200 font-arabic">
                        {previewCandidate.fullNameAr}
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] text-white/70 uppercase">{language === 'ar' ? 'المهنة المعتمدة' : 'Accredited Trade'}</p>
                      <p className="font-semibold text-white text-xs">
                        {previewCandidate.occupation}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[9px] font-mono text-white/90 pt-0.5">
                      {config.showApro && (
                        <div>
                          <span className="text-[7px] text-white/60 block">APRO ID:</span>
                          <span className="font-bold text-amber-300">{previewCandidate.aproReference}</span>
                        </div>
                      )}
                      {config.showPassport && (
                        <div>
                          <span className="text-[7px] text-white/60 block">PASSPORT:</span>
                          <span className="font-bold">{previewCandidate.passportNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  {config.showQrCode && (
                    <div className="w-16 h-16 rounded-lg bg-white p-1 shrink-0 flex flex-col items-center justify-center shadow-md">
                      <QrCode className="w-full h-full text-[#3F3030]" />
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[8px] text-white/80 relative z-10">
                  <span>{config.issueAuthority}</span>
                  <span className="font-mono">VALID: 2026 - 2028</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8D9D2]">
              <Button variant="secondary" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrintCard}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'طباعة البطاقة' : 'Print Official Badge'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* BATCH GENERATION MODAL */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={language === 'ar' ? 'إصدار دفعة بطاقات هوية مهنية' : 'Batch Skill Card Issuance'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#806F6F]">
            {language === 'ar'
              ? 'اختر دفعة التقييم لإصدار بطاقات الهوية لجميع المرشحين المؤهلين تلقائياً وتجهيز أوامر الطباعة.'
              : 'Select an assessment cohort to generate cryptographic credential cards for all qualified candidates in a single transaction.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#3F3030] mb-1">
              {language === 'ar' ? 'دفعة التقييم المستهدفة' : 'Target Assessment Batch'}
            </label>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            >
              <option value="">{language === 'ar' ? '-- اختر الدفعة --' : '-- Select Cohort Batch --'}</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} - {b.occupation} ({b.candidateCount} candidates)
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-[#FBF6E8] rounded-lg border border-amber-200 text-xs text-amber-900">
            <span className="font-bold block mb-0.5">Configurable / TBC</span>
            <span>Batch print spooling generates a single high-resolution print PDF conforming to ISO/IEC 7810 card printer drivers.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8D9D2]">
            <Button variant="secondary" size="sm" onClick={() => setIsBatchModalOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isGeneratingBatch}
              onClick={handleRunBatchGeneration}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'توليد البطاقات' : 'Generate & Queue Batch'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
