import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`border-b border-borderlight flex items-center gap-1 overflow-x-auto ${className}`}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-[1px] ${
              isActive
                ? 'border-maroon-800 text-maroon-900 bg-maroon-50/40'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-maroon-100 text-maroon-900' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
