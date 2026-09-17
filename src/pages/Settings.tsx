import React, { useState } from 'react';
import { Globe, RotateCcw, ShieldAlert, Palette, Check } from 'lucide-react';
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

        {/* Brand Theme Specification Panel */}
        <div className="p-5 rounded-lg border border-borderlight bg-white shadow-soft">
          <div className="flex items-center gap-2.5 mb-2">
            <Palette className="w-5 h-5 text-gold-700" />
            <h3 className="text-sm font-bold text-stone-900">Corporate Visual Identity</h3>
          </div>
          <p className="text-xs text-stone-500 mb-4">
            SkillAssess 360 uses an ultra-light corporate palette engineered for readability and international accreditation standards.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded border border-borderlight bg-canvas-base">
              <div className="w-5 h-5 rounded bg-canvas-base border border-borderlight mb-2" />
              <span className="font-bold text-stone-800 block">Warm Ivory</span>
              <span className="text-[10px] text-stone-400 font-mono">#FAF8F5</span>
            </div>

            <div className="p-3 rounded border border-borderlight bg-white">
              <div className="w-5 h-5 rounded bg-maroon-800 mb-2" />
              <span className="font-bold text-stone-800 block">Deep Maroon</span>
              <span className="text-[10px] text-stone-400 font-mono">#6E2535</span>
            </div>

            <div className="p-3 rounded border border-borderlight bg-white">
              <div className="w-5 h-5 rounded bg-gold-500 mb-2" />
              <span className="font-bold text-stone-800 block">Refined Gold</span>
              <span className="text-[10px] text-stone-400 font-mono">#D4AF37</span>
            </div>

            <div className="p-3 rounded border border-borderlight bg-white">
              <div className="w-5 h-5 rounded bg-emerald-500 mb-2" />
              <span className="font-bold text-stone-800 block">Soft Status</span>
              <span className="text-[10px] text-stone-400 font-mono">Light Green</span>
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
