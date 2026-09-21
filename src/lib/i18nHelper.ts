import { SupportedLanguage } from '../i18n/types';
import { Program, Story, Ambassador, SiteSettings } from '../types';

/**
 * Retrieves a localized string field from an object with a `translations` dictionary.
 * Fallback order:
 * 1. item.translations[lang][field]
 * 2. item.translations['en'][field]
 * 3. item[field] (base record)
 * 4. fallback default
 */
export function getLocalizedField<T extends { translations?: Record<string, any> }>(
  item: T | null | undefined,
  field: string,
  lang: SupportedLanguage = 'en',
  fallback: string = ''
): string {
  if (!item) return fallback;

  // 1. Try specified language in translations
  const langTrans = item.translations?.[lang];
  if (langTrans && langTrans[field] !== undefined && langTrans[field] !== null && String(langTrans[field]).trim() !== '') {
    return String(langTrans[field]);
  }

  // 2. Try English fallback in translations
  const enTrans = item.translations?.en;
  if (enTrans && enTrans[field] !== undefined && enTrans[field] !== null && String(enTrans[field]).trim() !== '') {
    return String(enTrans[field]);
  }

  // 3. Try base field on the item
  const directValue = (item as any)[field];
  if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
    return String(directValue);
  }

  return fallback;
}

/**
 * Retrieves localized string array (e.g. objectives, tags)
 */
export function getLocalizedArray<T extends { translations?: Record<string, any> }>(
  item: T | null | undefined,
  field: string,
  lang: SupportedLanguage = 'en',
  fallback: string[] = []
): string[] {
  if (!item) return fallback;

  const langTrans = item.translations?.[lang];
  if (langTrans && Array.isArray(langTrans[field]) && langTrans[field].length > 0) {
    return langTrans[field];
  }

  const enTrans = item.translations?.en;
  if (enTrans && Array.isArray(enTrans[field]) && enTrans[field].length > 0) {
    return enTrans[field];
  }

  const directValue = (item as any)[field];
  if (Array.isArray(directValue) && directValue.length > 0) {
    return directValue;
  }

  return fallback;
}

/**
 * Localized getters for Programs
 */
export function getProgramTitle(program: Program, lang: SupportedLanguage): string {
  return getLocalizedField(program, 'title', lang, program?.title || '');
}

export function getProgramShortDesc(program: Program, lang: SupportedLanguage): string {
  return getLocalizedField(program, 'shortDescription', lang, program?.shortDescription || '');
}

export function getProgramFullDesc(program: Program, lang: SupportedLanguage): string {
  return getLocalizedField(program, 'fullDescription', lang, program?.fullDescription || '');
}

export function getProgramCategory(program: Program, lang: SupportedLanguage): string {
  return getLocalizedField(program, 'category', lang, program?.category || '');
}

export function getProgramObjectives(program: Program, lang: SupportedLanguage): string[] {
  return getLocalizedArray(program, 'objectives', lang, program?.objectives || []);
}

/**
 * Localized getters for Stories
 */
export function getStoryTitle(story: Story, lang: SupportedLanguage): string {
  return (
    getLocalizedField(story, 'title', lang) ||
    getLocalizedField(story, 'headline', lang) ||
    story?.title ||
    story?.headline ||
    ''
  );
}

export function getStoryExcerpt(story: Story, lang: SupportedLanguage): string {
  return (
    getLocalizedField(story, 'excerpt', lang) ||
    getLocalizedField(story, 'shortSummary', lang) ||
    story?.excerpt ||
    story?.shortSummary ||
    ''
  );
}

export function getStoryContent(story: Story, lang: SupportedLanguage): string {
  return (
    getLocalizedField(story, 'fullContent', lang) ||
    getLocalizedField(story, 'fullText', lang) ||
    story?.fullContent ||
    story?.fullText ||
    ''
  );
}

export const getStoryFullContent = getStoryContent;

export function getStoryCategory(story: Story, lang: SupportedLanguage): string {
  return getLocalizedField(story, 'category', lang, story?.category || '');
}

/**
 * Localized getters for Ambassadors
 */
export function getAmbassadorRole(ambassador: Ambassador, lang: SupportedLanguage): string {
  return getLocalizedField(ambassador, 'role', lang, ambassador?.role || '');
}

export function getAmbassadorCountry(ambassador: Ambassador, lang: SupportedLanguage): string {
  return getLocalizedField(ambassador, 'country', lang, ambassador?.country || '');
}

export function getAmbassadorBio(ambassador: Ambassador, lang: SupportedLanguage): string {
  return (
    getLocalizedField(ambassador, 'shortBiography', lang) ||
    getLocalizedField(ambassador, 'bio', lang) ||
    getLocalizedField(ambassador, 'fullBiography', lang) ||
    ambassador?.shortBiography ||
    ambassador?.bio ||
    ambassador?.fullBiography ||
    ''
  );
}

export function getAmbassadorSpecialty(ambassador: Ambassador, lang: SupportedLanguage): string {
  return getLocalizedField(ambassador, 'specialty', lang, ambassador?.specialty || '');
}

/**
 * Localized getters for SiteSettings
 */
export function getLocalizedSettings(settings: SiteSettings, lang: SupportedLanguage): SiteSettings {
  if (!settings) return settings;
  const trans = settings.translations?.[lang] || settings.translations?.en || {};
  return {
    ...settings,
    ...trans,
    hero: {
      ...settings.hero,
      ...(trans as any).hero,
    },
    impactCounters: {
      ...settings.impactCounters,
      ...(trans as any).impactCounters,
    },
    aboutSection: {
      ...settings.aboutSection,
      ...(trans as any).aboutSection,
    },
    impactStats: {
      ...settings.impactStats,
      ...(trans as any).impactStats,
    },
  };
}
