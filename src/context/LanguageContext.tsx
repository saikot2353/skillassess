import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { getTranslation, translations } from '../i18n';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  t: typeof translations.en;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return StorageService.get<Language>(STORAGE_KEYS.LANG, 'en');
  });

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    StorageService.set(STORAGE_KEYS.LANG, language);
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, isRTL, dir, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
