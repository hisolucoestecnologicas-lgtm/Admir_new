import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings, Program, Story, Ambassador, MaintenanceSettings, MaintenanceConfig } from '../types';
import { INITIAL_SITE_SETTINGS, INITIAL_PROGRAMS, INITIAL_STORIES, INITIAL_AMBASSADORS, INITIAL_MAINTENANCE_SETTINGS } from '../data/initialData';
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
  maintenanceSettings: MaintenanceSettings;
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
  getMaintenanceForView: (view?: AppView) => { inMaintenance: boolean; config: MaintenanceConfig; pageTitle?: string };
  isPageUnderMaintenance: (pageKeyOrView: string) => boolean;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>(INITIAL_AMBASSADORS);
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>(INITIAL_MAINTENANCE_SETTINGS);
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
      const [s, p, st, a, m] = await Promise.all([
        api.getSettings().catch(() => INITIAL_SITE_SETTINGS),
        api.getPrograms().catch(() => INITIAL_PROGRAMS),
        api.getStories().catch(() => INITIAL_STORIES),
        api.getAmbassadors().catch(() => INITIAL_AMBASSADORS),
        api.getPublicMaintenanceStatus().catch(() => INITIAL_MAINTENANCE_SETTINGS),
      ]);
      setSettings(s);
      setPrograms(p);
      setStories(st);
      setAmbassadors(a);
      if (m && m.global) {
        setMaintenanceSettings({
          global: m.global,
          pages: m.pages || {},
          updatedAt: m.updatedAt || new Date().toISOString(),
          updatedBy: 'Sistema',
        });
      }
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
        setSelectedParam(parts.slice(1).join('/') || null);
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
    else if (view === 'admin' && param) newHash = `admin/${param}`;
    else if (view === 'admin') newHash = 'admin';

    window.location.hash = newHash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateLocalSettings = useCallback((updates: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const getMaintenanceForView = useCallback(
    (view?: AppView): { inMaintenance: boolean; config: MaintenanceConfig; pageTitle?: string } => {
      const targetView = view || currentView;

      // Standalone & Admin views NEVER blocked by maintenance
      if (['admin', 'accept-invite', 'ambassador-onboarding'].includes(targetView)) {
        return { inMaintenance: false, config: maintenanceSettings.global };
      }

      // Check Global Maintenance first (Global ON takes priority over all individual pages)
      if (maintenanceSettings.global?.enabled) {
        return {
          inMaintenance: true,
          config: maintenanceSettings.global,
          pageTitle: 'Site Global',
        };
      }

      // Page-specific mapping
      const pageKeyMap: Record<string, { key: string; name: string }> = {
        home: { key: 'home', name: 'Início' },
        about: { key: 'about', name: 'Sobre Nós' },
        programs: { key: 'programs', name: 'Programas Humanitários' },
        'program-detail': { key: 'programs', name: 'Programas Humanitários' },
        stories: { key: 'stories', name: 'Notícias & Histórias' },
        'story-detail': { key: 'stories', name: 'Notícias & Histórias' },
        ambassadors: { key: 'ambassadors', name: 'Corpo Diplomático' },
        'ambassador-detail': { key: 'ambassadors', name: 'Corpo Diplomático' },
        'get-involved': { key: 'get-involved', name: 'Como Participar' },
        donate: { key: 'donate', name: 'Doações & Apoio' },
        contact: { key: 'contact', name: 'Contato Oficial' },
      };

      const mapped = pageKeyMap[targetView];
      if (mapped && maintenanceSettings.pages?.[mapped.key]?.enabled) {
        return {
          inMaintenance: true,
          config: maintenanceSettings.pages[mapped.key],
          pageTitle: mapped.name,
        };
      }

      return { inMaintenance: false, config: maintenanceSettings.global };
    },
    [currentView, maintenanceSettings]
  );

  const isPageUnderMaintenance = useCallback(
    (pageKeyOrView: string): boolean => {
      const res = getMaintenanceForView(pageKeyOrView as AppView);
      return res.inMaintenance;
    },
    [getMaintenanceForView]
  );

  // Central Gate for Donation Flow
  const openDonationModal = useCallback(
    (amount?: number, cause?: string) => {
      // 1. Preserve donation presets without data loss or corruption
      if (amount !== undefined || cause !== undefined) {
        setDonationPreset({ amount, cause });
      }

      // 2. Central Gate: Check maintenance state (Global first, then Donate page)
      const maintenanceStatus = getMaintenanceForView('donate');
      if (maintenanceStatus.inMaintenance) {
        // Donate (or Global) is in maintenance: block DonationModal and direct to donate maintenance experience
        setIsDonationModalOpen(false);
        navigateTo('donate');
        return;
      }

      // 3. Normal flow: Donate is online
      setIsDonationModalOpen(true);
    },
    [getMaintenanceForView, navigateTo]
  );

  const closeDonationModal = useCallback(() => {
    setIsDonationModalOpen(false);
  }, []);

  return (
    <SiteContext.Provider
      value={{
        settings,
        programs,
        stories,
        ambassadors,
        maintenanceSettings,
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
        getMaintenanceForView,
        isPageUnderMaintenance,
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
