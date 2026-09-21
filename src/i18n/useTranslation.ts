import { useCallback } from 'react';
import { useSite, SupportedLanguage } from '../context/SiteContext';
import { dictionaries, getTranslationString, TranslationDictionary } from './index';

export function useTranslation() {
  const { language, setLanguage } = useSite();

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      return getTranslationString(keyPath, language, params);
    },
    [language]
  );

  const dict: TranslationDictionary = dictionaries[language] || dictionaries.en;

  return {
    t,
    dict,
    language,
    setLanguage,
    supportedLanguages: ['en', 'pt', 'es'] as SupportedLanguage[],
  };
}
