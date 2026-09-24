import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  const { isRTL, t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize) {
    return (
      <div className={`flex items-center justify-between text-xs text-stone-500 py-3 px-1 ${className}`}>
        <span>
          {t.common.showing} <strong className="text-stone-800">{startItem}</strong> {t.common.to}{' '}
          <strong className="text-stone-800">{endItem}</strong> {t.common.of}{' '}
          <strong className="text-stone-800">{totalItems}</strong> {t.common.results}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 py-3 px-1 ${className}`}>
      <span>
        {t.common.showing} <strong className="text-stone-800">{startItem}</strong> {t.common.to}{' '}
        <strong className="text-stone-800">{endItem}</strong> {t.common.of}{' '}
        <strong className="text-stone-800">{totalItems}</strong> {t.common.results}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded border border-borderlight bg-white text-stone-600 hover:text-[#A43950] hover:border-[#A43950]/40 hover:bg-[#FDF2F4]/40 active:bg-[#FDF2F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={t.common.previous}
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <span className="px-3 py-1 font-medium text-stone-800">
          {t.common.page} {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded border border-borderlight bg-white text-stone-600 hover:text-[#A43950] hover:border-[#A43950]/40 hover:bg-[#FDF2F4]/40 active:bg-[#FDF2F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={t.common.next}
        >
          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
