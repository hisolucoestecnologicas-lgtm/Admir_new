import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Search,
  ChevronDown,
  Menu,
  X,
  Heart,
  Shield,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useSite, SupportedLanguage } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import { getProgramTitle, getProgramCategory, getProgramShortDesc } from '../../lib/i18nHelper';

export function Navbar() {
  const { currentView, navigateTo, openDonationModal, programs, language, setLanguage } = useSite();
  const { isAuthenticated, user } = useAuth();
  const { t, dict } = useTranslation();

  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mega menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMegaMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigateTo('stories');
    setSearchOpen(false);
  };

  const navItemClass = (viewName: string) => {
    const isActive = currentView === viewName;
    return `px-3.5 py-2 text-sm font-semibold tracking-wide transition-colors flex items-center gap-1 cursor-pointer select-none rounded-lg ${
      isActive
        ? 'text-amber-600 font-bold bg-amber-50/70'
        : 'text-slate-800 hover:text-amber-600 hover:bg-slate-100/70'
    }`;
  };

  return (
    <header ref={navRef} className="sticky top-0 z-40 w-full transition-all duration-200">
      {/* Top Utility Bar (Diplomatic Seal, Languages, Portal Login) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium tracking-wider uppercase text-[11px]">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {language === 'pt'
                ? 'Missão Diplomática Americana de Relações Internacionais'
                : language === 'es'
                ? 'Misión Diplomática Americana de Relaciones Internacionales'
                : 'American Diplomatic Mission of International Relations'}
            </span>
            <span className="sm:hidden font-bold">ADMIR</span>
          </div>
          <span className="text-slate-700 hidden md:inline">|</span>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            {t('nav.humanitarianDiplomacy')}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Language Selector */}
          <div
            className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700"
            role="group"
            aria-label="Language selector"
          >
            <Globe className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
            {[
              { code: 'en' as SupportedLanguage, label: 'EN', full: 'English' },
              { code: 'pt' as SupportedLanguage, label: 'PT', full: 'Português' },
              { code: 'es' as SupportedLanguage, label: 'ES', full: 'Español' },
            ].map(({ code, label, full }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                title={full}
                aria-label={`Switch language to ${full}`}
                aria-pressed={language === code}
                className={`px-1.5 py-0.5 rounded font-bold uppercase text-[11px] transition-all cursor-pointer ${
                  language === code
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-slate-400 hover:text-white p-1 transition-colors flex items-center gap-1 cursor-pointer"
            title={t('nav.search')}
            aria-label={t('nav.search')}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">{t('nav.search')}</span>
          </button>

          {/* Admin / Portal Login */}
          <button
            type="button"
            onClick={() => navigateTo('admin')}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              isAuthenticated
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3 h-3 text-amber-400" />
            {isAuthenticated ? (
              <span>{t('nav.cmsPanel')} ({user?.name.split(' ')[0]})</span>
            ) : (
              <span>{t('nav.portalLogin')}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div
        className={`w-full bg-white transition-shadow ${
          scrolled ? 'shadow-md border-b border-slate-200' : 'border-b border-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
          >
            {/* Visual Emblem */}
            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <img
                src="/media/branding/admir-logo-header.png"
                alt="Logotipo oficial da ADMIR - American Diplomatic Mission of International Relations"
                className="w-12 h-12 object-contain"
                loading="eager"
              />
            </div>

            {/* Typography */}
            <div>
              <div className="font-serif-heading font-black text-xl text-slate-900 tracking-tight leading-none group-hover:text-amber-700 transition-colors">
                ADMIR
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1 leading-none hidden sm:block">
                {t('nav.diplomaticMission')}
              </div>
              <div className="text-[9px] font-medium text-slate-400 tracking-widest uppercase leading-none hidden sm:block mt-0.5">
                {t('nav.ofInternationalRelations')}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {/* HOME */}
            <button type="button" onClick={() => navigateTo('home')} className={navItemClass('home')}>
              {t('nav.home')}
            </button>

            {/* ABOUT US (Mega Menu) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('about')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('about')}
                className={`${navItemClass('about')} ${activeMegaMenu === 'about' ? 'text-amber-600 bg-amber-50/50' : ''}`}
              >
                {t('nav.about')}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {activeMegaMenu === 'about' && (
                <div className="absolute top-full left-0 w-[580px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 grid grid-cols-5 gap-6 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="col-span-3 space-y-2">
                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                      {t('nav.institutionalHeritage')}
                    </div>
                    <a
                      onClick={() => {
                        navigateTo('about', 'who-we-are');
                        setActiveMegaMenu(null);
                      }}
                      className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-900">{t('nav.whoWeAre')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {language === 'pt'
                          ? 'Mandato fundamental e ponte diplomática entre nações.'
                          : language === 'es'
                          ? 'Mandato fundamental y puente diplomático entre naciones.'
                          : 'Core mandate and diplomatic bridge across sovereign borders.'}
                      </div>
                    </a>
                    <a
                      onClick={() => {
                        navigateTo('about', 'mission');
                        setActiveMegaMenu(null);
                      }}
                      className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-900">{t('nav.mission')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {language === 'pt'
                          ? 'Diplomacia humanitária promovendo dignidade e cooperação internacional.'
                          : language === 'es'
                          ? 'Diplomacia humanitaria promoviendo dignidad y cooperación internacional.'
                          : 'Humanitarian diplomacy fostering dignity and international cooperation.'}
                      </div>
                    </a>
                    <a
                      onClick={() => {
                        navigateTo('about', 'framework');
                        setActiveMegaMenu(null);
                      }}
                      className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-900">{t('nav.framework')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {language === 'pt'
                          ? 'Padrões estatutários, convenções e acreditação multilateral.'
                          : language === 'es'
                          ? 'Normas estatutarias, convenciones y acreditación multilateral.'
                          : 'Charter standards, conventions, and neutral multilateral accreditation.'}
                      </div>
                    </a>
                    <a
                      onClick={() => {
                        navigateTo('about', 'leadership');
                        setActiveMegaMenu(null);
                      }}
                      className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-900">{t('nav.leadership')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {language === 'pt'
                          ? 'Alta comissão diplomática e conselho diretor.'
                          : language === 'es'
                          ? 'Alta comisión diplomática y consejo directivo.'
                          : 'High diplomatic commission and directorate council.'}
                      </div>
                    </a>
                  </div>

                  {/* Spotlight Feature */}
                  <div className="col-span-2 bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {t('home.missionsLabel')}
                      </span>
                      <div className="font-serif-heading font-bold text-sm text-white mt-1">
                        {t('about.tabMissions')}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {language === 'pt'
                          ? 'Documentação oficial de missões bilaterais no Brasil, Dubai e fóruns internacionais.'
                          : language === 'es'
                          ? 'Documentación oficial de misiones bilaterales en Brasil, Dubái y foros internacionales.'
                          : 'Official field photographic archives documenting bilateral missions and summits.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('about', 'missions');
                        setActiveMegaMenu(null);
                      }}
                      className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {t('home.exploreMissions')} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PROGRAMS (Mega Menu) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('programs')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('programs')}
                className={`${navItemClass('programs')} ${activeMegaMenu === 'programs' ? 'text-amber-600 bg-amber-50/50' : ''}`}
              >
                {t('nav.programs')}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {activeMegaMenu === 'programs' && (
                <div className="absolute top-full left-0 w-[640px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 grid grid-cols-5 gap-6 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="col-span-3 space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        {t('programs.badge')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('programs');
                          setActiveMegaMenu(null);
                        }}
                        className="text-[11px] text-slate-500 hover:text-amber-700 underline"
                      >
                        {t('nav.allPrograms')} ({programs.length})
                      </button>
                    </div>
                    {programs.slice(0, 4).map((p) => (
                      <a
                        key={p.id}
                        onClick={() => {
                          navigateTo('program-detail', p.slug);
                          setActiveMegaMenu(null);
                        }}
                        className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                          <span>{getProgramTitle(p, language)}</span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {getProgramCategory(p, language)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{getProgramShortDesc(p, language)}</div>
                      </a>
                    ))}
                  </div>

                  {/* Featured Program Card */}
                  <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                    <img
                      src="/media/about/admir-about-humanitarian.jpg"
                      alt="ADMIR Peace Programs"
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                      }}
                    />
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{t('nav.featured')}</span>
                        <div className="font-bold text-xs text-slate-900 mt-0.5">
                          {language === 'pt' ? 'Embaixadores da Paz' : language === 'es' ? 'Embajadores de la Paz' : 'Peace Ambassadors'}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {language === 'pt'
                            ? 'Mediação comunitária, cúpulas de conciliação e proteção civil.'
                            : language === 'es'
                            ? 'Mediación comunitaria, cumbres de conciliación y protección civil.'
                            : 'Community-based conciliation and dialogue summits worldwide.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('program-detail', 'peace-ambassadors');
                          setActiveMegaMenu(null);
                        }}
                        className="mt-3 text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                      >
                        {t('nav.exploreProgram')} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AMBASSADORS */}
            <button
              type="button"
              onClick={() => navigateTo('ambassadors')}
              className={navItemClass('ambassadors')}
            >
              {t('nav.ambassadors')}
            </button>

            {/* GET INVOLVED (Mega Menu) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('get-involved')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('get-involved')}
                className={`${navItemClass('get-involved')} ${activeMegaMenu === 'get-involved' ? 'text-amber-600 bg-amber-50/50' : ''}`}
              >
                {t('nav.getInvolved')}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {activeMegaMenu === 'get-involved' && (
                <div className="absolute top-full left-0 w-[420px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 space-y-2 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                    {t('nav.takeAction')}
                  </div>
                  <a
                    onClick={() => {
                      navigateTo('get-involved', 'volunteer');
                      setActiveMegaMenu(null);
                    }}
                    className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-bold text-slate-900">{t('nav.volunteer')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {language === 'pt'
                        ? 'Participe de missões educativas, psicossociais ou de socorro emergencial.'
                        : language === 'es'
                        ? 'Únase a misiones educativas, psicosociales o de alivio de emergencias.'
                        : 'Join educational, psychosocial, or disaster relief missions.'}
                    </div>
                  </a>
                  <a
                    onClick={() => {
                      navigateTo('get-involved', 'ambassador');
                      setActiveMegaMenu(null);
                    }}
                    className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-bold text-slate-900">{t('nav.becomeAmbassador')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {language === 'pt'
                        ? 'Represente a diplomacia humanitária em seu país ou região.'
                        : language === 'es'
                        ? 'Represente la diplomacia humanitaria en su país o región.'
                        : 'Represent humanitarian diplomacy in your country or region.'}
                    </div>
                  </a>
                  <a
                    onClick={() => {
                      navigateTo('get-involved', 'partner');
                      setActiveMegaMenu(null);
                    }}
                    className="block p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-bold text-slate-900">{t('nav.partnerWithUs')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {language === 'pt'
                        ? 'Alianças multilaterais institucionais, acadêmicas e filantrópicas.'
                        : language === 'es'
                        ? 'Alianzas multilaterales institucionales, académicas y filantrópicas.'
                        : 'Institutional, academic, and philanthropic multilateral coalitions.'}
                    </div>
                  </a>
                  <a
                    onClick={() => {
                      openDonationModal();
                      setActiveMegaMenu(null);
                    }}
                    className="block p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                      {t('nav.supportMission')}
                    </div>
                    <div className="text-xs text-amber-800/80 mt-0.5">
                      {language === 'pt'
                        ? 'Contribuições diretas sustentam ações emergenciais e salvam vidas.'
                        : language === 'es'
                        ? 'Las contribuciones directas sostienen acciones de emergencia en primera línea.'
                        : 'Financial contributions directly sustain frontline deliveries.'}
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* NEWS & STORIES */}
            <button
              type="button"
              onClick={() => navigateTo('stories')}
              className={navItemClass('stories')}
            >
              {t('nav.stories')}
            </button>

            {/* CONTACT */}
            <button
              type="button"
              onClick={() => navigateTo('contact')}
              className={navItemClass('contact')}
            >
              {t('nav.contact')}
            </button>
          </nav>

          {/* Right Action: DONATE Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openDonationModal()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white/80 group-hover:scale-110 transition-transform" />
              <span>{t('nav.donate')}</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Search Bar Drawer */}
      {searchOpen && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 animate-in fade-in duration-150">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full bg-slate-800 text-white pl-11 pr-24 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {t('nav.search')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 top-[110px] z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col">
          <div className="bg-white flex-1 overflow-y-auto p-6 max-w-sm w-full shadow-2xl space-y-4">
            {/* Mobile Language Switcher */}
            <div className="pb-3 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span>Language / Idioma</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en' as SupportedLanguage, label: 'English' },
                  { code: 'pt' as SupportedLanguage, label: 'Português' },
                  { code: 'es' as SupportedLanguage, label: 'Español' },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                      language === code
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  navigateTo('home');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50"
              >
                {t('nav.home')}
              </button>

              {/* Mobile About */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'about' ? null : 'about')
                  }
                  className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50 flex justify-between items-center"
                >
                  <span>{t('nav.about')}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'about' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileExpandedSection === 'about' && (
                  <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50 rounded-lg text-sm">
                    <button
                      onClick={() => {
                        navigateTo('about', 'who-we-are');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 text-slate-700"
                    >
                      {t('nav.whoWeAre')}
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('about', 'mission');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 text-slate-700"
                    >
                      {t('nav.mission')}
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('about', 'framework');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 text-slate-700"
                    >
                      {t('nav.framework')}
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('about', 'leadership');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 text-slate-700"
                    >
                      {t('nav.leadership')}
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('about', 'missions');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 text-slate-700"
                    >
                      {t('about.tabMissions')}
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Programs */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'programs' ? null : 'programs')
                  }
                  className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50 flex justify-between items-center"
                >
                  <span>{t('nav.programs')}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'programs' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileExpandedSection === 'programs' && (
                  <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50 rounded-lg text-sm">
                    <button
                      onClick={() => {
                        navigateTo('programs');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-1.5 font-semibold text-amber-700"
                    >
                      {t('nav.allPrograms')}
                    </button>
                    {programs.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigateTo('program-detail', p.slug);
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full text-left py-1.5 text-slate-700 text-xs"
                      >
                        {getProgramTitle(p, language)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Ambassadors */}
              <button
                type="button"
                onClick={() => {
                  navigateTo('ambassadors');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50"
              >
                {t('nav.ambassadors')}
              </button>

              {/* Mobile Get Involved */}
              <button
                type="button"
                onClick={() => {
                  navigateTo('get-involved');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50"
              >
                {t('nav.getInvolved')}
              </button>

              {/* Mobile Stories */}
              <button
                type="button"
                onClick={() => {
                  navigateTo('stories');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50"
              >
                {t('nav.stories')}
              </button>

              {/* Mobile Contact */}
              <button
                type="button"
                onClick={() => {
                  navigateTo('contact');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-slate-900 rounded-lg hover:bg-slate-50"
              >
                {t('nav.contact')}
              </button>

              {/* Mobile Admin */}
              <button
                type="button"
                onClick={() => {
                  navigateTo('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 font-bold text-amber-700 rounded-lg hover:bg-amber-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {t('nav.cmsPanel')}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  openDonationModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-white" />
                {t('nav.donate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
