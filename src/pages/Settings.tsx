import React, { useState } from 'react';
import { Globe, RotateCcw, ShieldAlert, Palette, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storageService';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { showToast } = useToast();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleApplyCorporateTheme = () => {
    localStorage.setItem('skillassess_palette', 'corporate_ultra_light');
    showToast('Corporate visual identity verified & enforced: Pure White (#FFFFFF), Light Maroon (#A43950), Refined Gold (#D4AF37), Soft Green.', 'success');
  };

  const handleCopyColor = (hex: string, label: string) => {
    navigator.clipboard?.writeText(hex);
    showToast(`Copied ${label} (${hex}) to clipboard!`, 'info');
  };

  const handleResetDemoData = () => {
    StorageService.resetToDemo();
    setIsResetConfirmOpen(false);
    showToast(t.toasts.demoDataReset, 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div>
      <PageHeader
        title={t.settingsModule.title}
        subtitle={t.settingsModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.settingsModule.title },
        ]}
      />

      <div className="space-y-6 max-w-3xl">
        {/* Language & Bidirectional Direction Section */}
        <div className="p-5 rounded-lg border border-borderlight bg-white shadow-soft">
          <div className="flex items-center gap-2.5 mb-2">
            <Globe className="w-5 h-5 text-maroon-800" />
            <h3 className="text-sm font-bold text-stone-900">{t.settingsModule.interfaceLanguage}</h3>
          </div>
          <p className="text-xs text-stone-500 mb-4">{t.settingsModule.interfaceLanguageDesc}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* English LTR Card */}
            <div
              onClick={() => setLanguage('en')}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                language === 'en'
                  ? 'border-maroon-700 bg-maroon-50/50 ring-1 ring-maroon-700'
                  : 'border-borderlight hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs sm:text-sm text-stone-900">English (LTR)</span>
                {language === 'en' && <Check className="w-4 h-4 text-maroon-800" />}
              </div>
              <p className="text-xs text-stone-500">
                Left-to-Right layout direction, Western numeric alignment, English terminology.
              </p>
            </div>

            {/* Arabic RTL Card */}
            <div
              onClick={() => setLanguage('ar')}
              className={`p-4 rounded-lg border cursor-pointer transition-all font-arabic ${
                language === 'ar'
                  ? 'border-maroon-700 bg-maroon-50/50 ring-1 ring-maroon-700'
                  : 'border-borderlight hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs sm:text-sm text-stone-900">العربية (RTL)</span>
                {language === 'ar' && <Check className="w-4 h-4 text-maroon-800" />}
              </div>
              <p className="text-xs text-stone-500">
                تخطيط كامل من اليمين إلى اليسار، خطوط عربية واضحة، محاذاة ديناميكية للشريط الجانبي.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Theme Specification & Corporate Visual Identity Panel */}
        <div className="p-5 rounded-lg border border-borderlight bg-white shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-borderlight">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">Corporate Visual Identity</h3>
                <p className="text-xs text-stone-500">
                  SkillAssess 360 uses an ultra-light corporate palette engineered for readability and international accreditation standards.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                <Check className="w-3.5 h-3.5" />
                <span>Identity Active</span>
              </span>
              <Button
                variant="primary"
                size="xs"
                onClick={handleApplyCorporateTheme}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Apply & Enforce Palette
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Pure White Canvas */}
            <div 
              onClick={() => handleCopyColor('#FFFFFF', 'Pure White Canvas')}
              className="p-3.5 rounded-lg border border-borderlight bg-white hover:border-[#A43950]/40 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-white border-2 border-stone-200 shadow-2xs flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <span className="text-[10px] text-stone-400 group-hover:text-[#A43950] font-mono transition-colors">Click to copy</span>
              </div>
              <span className="font-bold text-stone-900 block text-xs">Pure White Canvas</span>
              <span className="text-[11px] text-stone-500 font-mono">#FFFFFF</span>
              <p className="text-[10px] text-stone-400 mt-1">Ultra-light background across all pages</p>
            </div>

            {/* Light Maroon (Interactive) */}
            <div 
              onClick={() => handleCopyColor('#A43950', 'Light Maroon')}
              className="p-3.5 rounded-lg border border-borderlight bg-white hover:border-[#A43950]/40 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-[#A43950] shadow-2xs flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] text-stone-400 group-hover:text-[#A43950] font-mono transition-colors">Click to copy</span>
              </div>
              <span className="font-bold text-stone-900 block text-xs">Light Maroon</span>
              <span className="text-[11px] text-[#A43950] font-mono font-semibold">#A43950 (Interactive)</span>
              <p className="text-[10px] text-stone-400 mt-1">Action buttons, focus, and menu active states</p>
            </div>

            {/* Refined Gold */}
            <div 
              onClick={() => handleCopyColor('#D4AF37', 'Refined Gold')}
              className="p-3.5 rounded-lg border border-borderlight bg-white hover:border-[#A43950]/40 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-[#D4AF37] shadow-2xs flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] text-stone-400 group-hover:text-[#A43950] font-mono transition-colors">Click to copy</span>
              </div>
              <span className="font-bold text-stone-900 block text-xs">Refined Gold</span>
              <span className="text-[11px] text-[#946E20] font-mono font-semibold">#D4AF37</span>
              <p className="text-[10px] text-stone-400 mt-1">Accreditation badges and premium highlights</p>
            </div>

            {/* Soft Status */}
            <div 
              onClick={() => handleCopyColor('#ECFDF5', 'Soft Status Light Green')}
              className="p-3.5 rounded-lg border border-borderlight bg-white hover:border-[#A43950]/40 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] shadow-2xs flex items-center justify-center text-[#065F46]">
                  <Check className="w-3.5 h-3.5 text-[#065F46]" />
                </div>
                <span className="text-[10px] text-stone-400 group-hover:text-[#A43950] font-mono transition-colors">Click to copy</span>
              </div>
              <span className="font-bold text-stone-900 block text-xs">Soft Status</span>
              <span className="text-[11px] text-[#065F46] font-mono font-semibold">Light Green</span>
              <p className="text-[10px] text-stone-400 mt-1">Soft pastel green for verified/active states</p>
            </div>
          </div>

          {/* Interactive Live Sample Widget */}
          <div className="p-3.5 rounded-lg bg-white border border-borderlight flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-stone-500 font-medium">Interactive Palette Live Preview:</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="xs">
                Light Maroon Interactive (#A43950)
              </Button>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#FDFBF5] text-[#946E20] border border-[#D4AF37]/40 shadow-2xs">
                Refined Gold (#D4AF37)
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                Soft Status (Light Green)
              </span>
            </div>
          </div>
        </div>

        {/* Prototype Storage & Demo Management */}
        <div className="p-5 rounded-lg border border-borderlight bg-white shadow-soft">
          <div className="flex items-center gap-2.5 mb-2">
            <RotateCcw className="w-5 h-5 text-stone-600" />
            <h3 className="text-sm font-bold text-stone-900">{t.settingsModule.demoDataControls}</h3>
          </div>
          <p className="text-xs text-stone-500 mb-4">{t.settingsModule.demoDataDesc}</p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-stone-700 hover:text-stone-900 border-stone-300 hover:bg-stone-50"
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {t.settingsModule.resetDataBtn}
          </Button>
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDemoData}
        title={t.settingsModule.resetConfirmTitle}
        message={t.settingsModule.resetConfirmMsg}
        confirmText="Reset Storage"
        cancelText={t.common.cancel}
      />
    </div>
  );
};
