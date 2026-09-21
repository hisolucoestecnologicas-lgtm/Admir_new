import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings, Program, Story, Ambassador } from '../types';
import { INITIAL_SITE_SETTINGS, INITIAL_PROGRAMS, INITIAL_STORIES, INITIAL_AMBASSADORS } from '../data/initialData';
import { api } from '../lib/api';

export type AppView =
  | 'home'
  | 'about'
  | 'programs'
  | 'program-detail'
  | 'ambassadors'
  | 'ambassador-detail'
  | 'stories'
  | 'story-detail'
  | 'get-involved'
  | 'donate'
  | 'contact'
  | 'admin'
  | 'accept-invite'
  | 'ambassador-onboarding';

export type SupportedLanguage = 'en' | 'pt' | 'es';

interface SiteContextValue {
  settings: SiteSettings;
  programs: Program[];
  stories: Story[];
  ambassadors: Ambassador[];
  loading: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentView: AppView;
  selectedParam: string | null;
  navigateTo: (view: AppView, param?: string | null) => void;
  isDonationModalOpen: boolean;
  donationPreset: { amount?: number; cause?: string };
  openDonationModal: (amount?: number, cause?: string) => void;
  closeDonationModal: () => void;
  refetchAll: () => Promise<void>;
  refreshAmbassadors: () => Promise<void>;
  refreshStories: () => Promise<void>;
  refreshPrograms: () => Promise<void>;
  updateLocalSettings: (updates: Partial<SiteSettings>) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>(INITIAL_AMBASSADORS);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('admir_lang') as SupportedLanguage;
      if (saved && ['en', 'pt', 'es'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('admir_lang', lang);
      document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'pt' ? 'pt-BR' : language;
    } catch {
      // ignore
    }
  }, [language]);

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedParam, setSelectedParam] = useState<string | null>(null);

  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationPreset, setDonationPreset] = useState<{ amount?: number; cause?: string }>({});

  const refetchAll = useCallback(async () => {
    try {
      const [s, p, st, a] = await Promise.all([
        api.getSettings().catch(() => INITIAL_SITE_SETTINGS),
        api.getPrograms().catch(() => INITIAL_PROGRAMS),
        api.getStories().catch(() => INITIAL_STORIES),
        api.getAmbassadors().catch(() => INITIAL_AMBASSADORS),
      ]);
      setSettings(s);
      setPrograms(p);
      setStories(st);
      setAmbassadors(a);
    } catch (e) {
      console.error('Failed to fetch site data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  // Handle URL hash navigation for clean browser back/forward and direct links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setCurrentView('home');
        setSelectedParam(null);
        return;
      }

      const parts = hash.split('/');
      const view = parts[0] as AppView;
      const param = parts[1] || null;

      if (view === 'programs' && param) {
        setCurrentView('program-detail');
        setSelectedParam(param);
      } else if (view === 'stories' && param) {
        setCurrentView('story-detail');
        setSelectedParam(param);
      } else if (view === 'ambassadors' && param) {
        setCurrentView('ambassador-detail');
        setSelectedParam(param);
      } else if (view === 'accept-invite' && param) {
        setCurrentView('accept-invite');
        setSelectedParam(param);
      } else if (view === 'ambassador-onboarding' || hash.startsWith('ambassador-onboarding')) {
        setCurrentView('ambassador-onboarding');
        const token = param || hash.split('token=')[1] || hash.split('/')[1] || null;
        setSelectedParam(token);
      } else if (
        [
          'home',
          'about',
          'programs',
          'ambassadors',
          'stories',
          'get-involved',
          'donate',
          'contact',
          'admin',
        ].includes(view)
      ) {
        setCurrentView(view);
        setSelectedParam(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = useCallback((view: AppView, param?: string | null) => {
    setCurrentView(view);
    setSelectedParam(param || null);

    let newHash: string = view;
    if (view === 'program-detail' && param) newHash = `programs/${param}`;
    else if (view === 'story-detail' && param) newHash = `stories/${param}`;
    else if (view === 'ambassador-detail' && param) newHash = `ambassadors/${param}`;
    else if (view === 'accept-invite' && param) newHash = `accept-invite/${param}`;

    window.location.hash = newHash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openDonationModal = useCallback((amount?: number, cause?: string) => {
    setDonationPreset({ amount, cause });
    setIsDonationModalOpen(true);
  }, []);

  const closeDonationModal = useCallback(() => {
    setIsDonationModalOpen(false);
  }, []);

  const updateLocalSettings = useCallback((updates: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <SiteContext.Provider
      value={{
        settings,
        programs,
        stories,
        ambassadors,
        loading,
        language,
        setLanguage,
        currentView,
        selectedParam,
        navigateTo,
        isDonationModalOpen,
        donationPreset,
        openDonationModal,
        closeDonationModal,
        refetchAll,
        refreshAmbassadors: refetchAll,
        refreshStories: refetchAll,
        refreshPrograms: refetchAll,
        updateLocalSettings,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
