import React, { useState, useEffect } from 'react';
import { Search, X, User, Building, Users, Calendar, ArrowRight, Globe, BookOpen, Award, MessageSquareWarning } from 'lucide-react';
import { SearchService, SearchResultItem } from '../../services/searchService';
import { StatusBadge } from '../ui/StatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setResults(SearchService.search(query, user));
    }, 150);
    return () => clearTimeout(timer);
  }, [query, user]);

  if (!isOpen) return null;

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'candidate':
        return <User className="w-4 h-4 text-[#7A2E3A]" />;
      case 'center':
        return <Building className="w-4 h-4 text-[#C9A24D]" />;
      case 'user':
        return <Users className="w-4 h-4 text-[#7A2E3A]" />;
      case 'batch':
      case 'schedule':
        return <Calendar className="w-4 h-4 text-[#C9A24D]" />;
      case 'country':
        return <Globe className="w-4 h-4 text-[#7A2E3A]" />;
      case 'task':
        return <BookOpen className="w-4 h-4 text-[#C9A24D]" />;
      case 'result':
        return <Award className="w-4 h-4 text-[#7A2E3A]" />;
      case 'complaint':
        return <MessageSquareWarning className="w-4 h-4 text-amber-600" />;
      default:
        return <Search className="w-4 h-4 text-[#806F6F]" />;
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    onNavigate(item.link);
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
      <div 
        className="relative flex min-h-full items-start justify-center p-3 pt-14 sm:p-6 sm:pt-20 z-10"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="relative w-full max-w-xl max-h-[calc(100vh-5rem)] rounded-xl bg-[#FFFFFF] border border-[#E8D9D2] shadow-[0_8px_30px_rgba(63,48,48,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Elegant Gold Accent Top Strip */}
          <div className="h-[2.5px] w-full bg-[#C9A24D] shrink-0" />

          {/* Search Header Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#E8D9D2] bg-[#FFFFFF] shrink-0">
            <Search className="w-4.5 h-4.5 text-[#806F6F] shrink-0 me-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.common.globalSearchPlaceholder}
              className="w-full text-sm bg-transparent border-none focus:outline-none placeholder:text-[#A89595] text-[#3F3030]"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="p-1 text-[#806F6F] hover:text-[#3F3030] me-2 transition-colors"
                aria-label="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-[#806F6F] bg-[#FFFFFF] border border-[#E8D9D2] rounded">
              ESC
            </kbd>
          </div>

          {/* Search Results List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#E8D9D2] bg-[#FFFFFF] flex-1 min-h-0 overscroll-contain">
            {query.trim().length >= 2 && results.length === 0 && (
              <div className="py-10 text-center text-xs text-[#806F6F]">
                {t.common.noRecords} for "{query}"
              </div>
            )}

            {query.trim().length < 2 && (
              <div className="py-8 px-4 text-xs text-[#806F6F] text-center leading-relaxed">
                Type at least 2 characters to search across Candidates, Centers, Batches, and Users.
              </div>
            )}

            {results.map(item => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between p-3.5 text-start hover:bg-[#F8ECEE] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#F8ECEE] group-hover:bg-[#FFFFFF] border border-[#E8D9D2] shrink-0 transition-colors">
                    {getEntityIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-[#806F6F] tracking-wider">
                        {item.type}
                      </span>
                      {item.badge && <StatusBadge status={item.badge} />}
                    </div>
                    <p className="text-sm font-medium text-[#3F3030] truncate mt-0.5">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#806F6F] truncate">{item.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#806F6F] group-hover:text-[#7A2E3A] transition-colors shrink-0 ms-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
