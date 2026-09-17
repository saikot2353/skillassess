import React from 'react';
import { Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

export interface GenericModulePlaceholderProps {
  title: string;
  moduleKey: string;
  description: string;
  phase?: string;
  onNavigate: (path: string) => void;
}

export const GenericModulePlaceholder: React.FC<GenericModulePlaceholderProps> = ({
  title,
  moduleKey,
  description,
  phase = 'Phase 02 / Subsequent Release',
  onNavigate,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={description}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: title },
        ]}
      />

      <div className="p-8 sm:p-12 text-center rounded-lg border border-borderlight bg-white shadow-soft max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-maroon-50 text-maroon-800 border border-maroon-200 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-gold-50 border border-gold-200 text-gold-900 text-[11px] font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
          <span>Foundation Shell Prepared • {phase}</span>
        </div>
        <h3 className="text-base font-bold text-stone-900 mb-2">
          {title} Module Gateway
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed max-w-md mx-auto mb-6">
          {description}. The underlying routing, permission guard, translation dictionaries, and browser storage models for this module are active in the foundation shell.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/candidates')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Inspect Candidate Registry
          </Button>
        </div>
      </div>
    </div>
  );
};
