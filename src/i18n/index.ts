import { en } from './locales/en';
import { pt } from './locales/pt';
import { es } from './locales/es';
import { SupportedLanguage, TranslationDictionary } from './types';

export * from './types';

export const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  pt,
  es,
};

/**
 * Safely resolves a nested key from dictionary with fallback to English,
 * and if still missing, returns fallback or the last segment of the key.
 * Never returns undefined, never returns "[object Object]".
 */
export function getTranslationString(
  keyPath: string,
  lang: SupportedLanguage = 'en',
  params?: Record<string, string | number>
): string {
  const primaryDict = dictionaries[lang] || dictionaries.en;
  const fallbackDict = dictionaries.en;

  const resolve = (dict: any, path: string): any => {
    const parts = path.split('.');
    let current = dict;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  };

  let value = resolve(primaryDict, keyPath);
  if (value === undefined || typeof value !== 'string') {
    value = resolve(fallbackDict, keyPath);
  }

  if (value === undefined || typeof value !== 'string') {
    // Graceful fallback to readable label from key
    const parts = keyPath.split('.');
    return parts[parts.length - 1] || keyPath;
  }

  if (params) {
    let interpolated = value;
    for (const [k, v] of Object.entries(params)) {
      interpolated = interpolated.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
    return interpolated;
  }

  return value;
}
