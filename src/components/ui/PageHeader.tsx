import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
}) => {
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex items-center gap-1.5 text-xs text-stone-400">
              {breadcrumbs.map((b, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <span>/</span>}
                  {b.href ? (
                    <a href={b.href} className="hover:text-maroon-800 transition-colors">
                      {b.label}
                    </a>
                  ) : (
                    <span className="text-stone-600 font-medium">{b.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
