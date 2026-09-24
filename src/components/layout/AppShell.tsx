import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useLanguage } from '../../context/LanguageContext';

export interface AppShellProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentPath,
  onNavigate,
}) => {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isRTL } = useLanguage();

  // Keyboard shortcut Ctrl+K / Cmd+K to trigger global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`min-h-screen bg-white flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sidebar: Anchored Left in LTR, Right in RTL */}
      <Sidebar
        isOpen={isSidebarOpenMobile}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigate={onNavigate}
          currentPath={currentPath}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          {children}
        </main>
      </div>

      {/* Global Cross-Entity Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
