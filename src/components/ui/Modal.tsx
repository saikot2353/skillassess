import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  infoNotice?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  infoNotice,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-[620px]',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Light transparent neutral overlay - NO blur, NO backdrop filter, page remains crisp and sharp */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(63, 48, 48, 0.18)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering container: clicking outside the modal dialog closes it */}
      <div 
        className="relative flex min-h-full items-center justify-center p-3 sm:p-6 text-center z-10"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Modal Card: stopPropagation prevents clicks inside from closing */}
        <div 
          className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto transform rounded-2xl bg-[#FFFFFF] border border-[#E8D9D2] text-start align-middle shadow-[0_8px_30px_rgba(63,48,48,0.08)] transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header: accessible and pinned at top */}
          {(title || subtitle || icon) && (
            <div className="flex items-start justify-between px-7 pt-6 pb-4 bg-[#FFFFFF] shrink-0 border-b border-[#E8D9D2]/60 z-10">
              <div className="flex items-center gap-3.5 pe-4">
                {icon && (
                  <div className="w-12 h-12 rounded-full bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center shrink-0 border border-[#E8D9D2]">
                    {icon}
                  </div>
                )}
                <div>
                  {title && (
                    <h3 className="text-lg font-bold text-[#7A2E3A] tracking-tight leading-snug">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[#806F6F] mt-0.5 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#806F6F] hover:text-[#3F3030] hover:bg-[#F8ECEE] transition-colors shrink-0 -me-1 focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20"
                aria-label="Close modal"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          {/* Modal Body: independently scrolls when content is taller than viewport */}
          <div className="px-7 py-5 text-sm text-[#3F3030] flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#FFFFFF]">
            {children}
          </div>

          {/* Modal Footer: accessible and pinned at bottom */}
          {(footer || infoNotice) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 px-7 py-4 bg-[#FFFFFF] border-t border-[#E8D9D2] shrink-0 z-10">
              {infoNotice ? (
                <div className="flex items-center gap-2 text-[11px] text-[#806F6F] flex-1 leading-snug">
                  <div className="w-4 h-4 rounded-full bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2] flex items-center justify-center shrink-0 text-[10px] font-bold">
                    !
                  </div>
                  <span>{infoNotice}</span>
                </div>
              ) : <div />}

              {footer && (
                <div className="flex items-center justify-end gap-2.5 shrink-0">
                  {footer}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ModalSectionTitle: React.FC<{ title: string; className?: string }> = ({ title, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 border-b border-[#E8D9D2] pb-2 mb-3.5 ${className}`}>
      <span className="w-1 h-3.5 bg-[#C9A24D] rounded-full shrink-0" />
      <h4 className="text-xs font-bold text-[#7A2E3A] tracking-wide">
        {title}
      </h4>
    </div>
  );
};
