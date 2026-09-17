import { en } from './en';
import { ar } from './ar';
import { Language } from '../types';

export const translations = { en, ar };

export type TranslationKey = typeof en;

export function getTranslation(lang: Language): typeof en {
  return translations[lang] || translations.en;
}
