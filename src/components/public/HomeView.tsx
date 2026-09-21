import React, { useState } from 'react';
import {
  ArrowRight,
  Heart,
  Shield,
  Globe2,
  Calendar,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getProgramTitle,
  getProgramCategory,
  getProgramShortDesc,
  getStoryTitle,
  getStoryCategory,
  getStoryExcerpt,
  getAmbassadorRole,
  getAmbassadorCountry,
  getAmbassadorBio,
  getLocalizedSettings,
} from '../../lib/i18nHelper';

export function HomeView() {
  const { settings: rawSettings, programs, stories, ambassadors, navigateTo, openDonationModal, language } = useSite();
  const { t, dict } = useTranslation();
  const [activeFrequency, setActiveFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [selectedDonationAmount, setSelectedDonationAmount] = useState<number>(100);

  const settings = getLocalizedSettings(rawSettings, language);

  const heroTexts = settings.hero || {
    eyebrow: settings.heroEyebrow || t('home.heroEyebrow'),
    titleLine1: settings.heroTitleLine1 || t('home.heroTitleLine1'),
    titleLine2: settings.heroTitleLine2 || t('home.heroTitleLine2'),
    paragraph: settings.heroParagraph || t('home.heroParagraph'),
    primaryCtaText: settings.heroCtaPrimary || t('home.heroCtaPrimary'),
    secondaryCtaText: settings.heroCtaSecondary || t('home.heroCtaSecondary'),
    backgroundImage: settings.heroBgImage,
  };

  const counterTexts = settings.impactCounters || {
    counter1Value: `${settings.communitiesServed || 120}+`,
    counter1Label: settings.communitiesServedLabel || t('home.communitiesServed'),
    counter2Value: `${((settings.reliefsDelivered || 48000) / 1000).toFixed(0)}k+`,
    counter2Label: settings.reliefsDeliveredLabel || t('home.reliefsDelivered'),
    counter3Value: `${settings.volunteersEngaged || 1500}+`,
    counter3Label: settings.volunteersEngagedLabel || t('home.volunteersEngaged'),
  };

  const aboutTexts = settings.aboutSection || {
    smallLabel: settings.aboutSmallLabel || t('home.aboutLabel'),
    title: settings.aboutTitle || t('home.aboutTitle'),
    highlightedSentence: settings.aboutHighlightedSentence || t('home.aboutHighlight'),
    paragraph: settings.aboutParagraph || t('home.aboutBody'),
    ctaText: settings.aboutCtaText || t('home.aboutCta'),
  };

  const statsTexts = settings.impactStats || {
    stat1Number: settings.impact1Number || '30+',
    stat1Text: settings.impact1Text || (language === 'pt' ? 'Anos desenvolvendo projetos humanitários no mundo' : language === 'es' ? 'Años desarrollando proyectos humanitarios en el mundo' : 'Years developing humanitarian projects worldwide'),
    stat2Number: settings.impact2Number || '190+',
    stat2Text: settings.impact2Text || (language === 'pt' ? 'Países alcançados por esforços de cooperação da ADMIR' : language === 'es' ? 'Países alcanzados por iniciativas de cooperación de ADMIR' : 'Countries reached by ADMIR cooperation and outreach efforts'),
    stat3Number: settings.impact3Number || '6',
    stat3Text: settings.impact3Text || (language === 'pt' ? 'Caminhos de voluntariado e ação no terreno' : language === 'es' ? 'Vías de voluntariado y acción en el terreno' : 'Specialized pathways to volunteer, advocate, and serve'),
  };

  return (
    <div className="space-y-0">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center bg-slate-950 overflow-hidden">
        {/* Background Image with Optical Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroTexts.backgroundImage || '/media/home/admir-home.jpg'}
            alt="ADMIR Humanitarian Mission"
            className="w-full h-full object-cover object-center opacity-30"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/media/events/dubai-2024-summit-1.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-900/60" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-slate-950/90" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-left">
          <div className="max-w-3xl space-y-6">
            {/* Diplomatic Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{heroTexts.eyebrow || t('home.heroEyebrow')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-serif-heading text-white tracking-tight leading-[1.15]">
              {heroTexts.titleLine1 || t('home.heroTitleLine1')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 block sm:inline">
                {heroTexts.titleLine2 || t('home.heroTitleLine2')}
              </span>
            </h1>

            {/* Paragraph */}
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
              {heroTexts.paragraph || t('home.heroParagraph')}
            </p>

            {/* Call to Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => openDonationModal()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-amber-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer text-base"
              >
                <Heart className="w-5 h-5 fill-white/80 group-hover:scale-110 transition-transform" />
                <span>{heroTexts.primaryCtaText || t('home.heroCtaPrimary')}</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('programs')}
                className="bg-slate-900/80 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-base backdrop-blur-sm"
              >
                <span>{heroTexts.secondaryCtaText || t('home.heroCtaSecondary')}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMPACT COUNTERS BAR */}
      <section className="bg-slate-900 text-white border-y border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="pt-4 md:pt-0 flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-black text-amber-400 font-serif-heading">
                {counterTexts.counter1Value || '120+'}
              </span>
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider mt-2">
                {counterTexts.counter1Label || t('home.communitiesServed')}
              </span>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8 flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-black text-amber-400 font-serif-heading">
                {counterTexts.counter2Value || '48k+'}
              </span>
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider mt-2">
                {counterTexts.counter2Label || t('home.reliefsDelivered')}
              </span>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8 flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-black text-amber-400 font-serif-heading">
                {counterTexts.counter3Value || '1,500+'}
              </span>
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider mt-2">
                {counterTexts.counter3Label || t('home.volunteersEngaged')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT SECTION: LOOKING INWARD, ACTING OUTWARD */}
      <section className="py-20 lg:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Image Column - Displays full uncropped official photo */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                <img
                  src={(aboutTexts as any)?.aboutImage || '/media/about/admir-about-humanitarian.jpg'}
                  alt="ADMIR Institutional Leadership"
                  className="w-full h-auto object-cover block"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                  }}
                />
                <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-t border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                      {t('about.badge')}
                    </div>
                    <div className="font-serif-heading font-semibold text-sm sm:text-base text-slate-100">
                      {language === 'pt'
                        ? 'Missão Diplomática Americana de Relações Internacionais'
                        : language === 'es'
                        ? 'Misión Diplomática Americana de Relaciones Internacionales'
                        : 'American Diplomatic Mission of International Relations'}
                    </div>
                  </div>
                  <Shield className="w-5 h-5 text-amber-400 shrink-0 opacity-90 hidden sm:block" />
                </div>
              </div>
            </div>

            {/* Text Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold tracking-wider uppercase border border-amber-200">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>{aboutTexts.smallLabel || t('home.aboutLabel')}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black font-serif-heading text-slate-900 tracking-tight leading-tight">
                {aboutTexts.title || t('home.aboutTitle')}
              </h2>

              <div className="p-4 bg-amber-50 border-l-4 border-amber-600 rounded-r-xl">
                <p className="text-base sm:text-lg font-bold text-amber-950 leading-relaxed font-serif-heading">
                  "{aboutTexts.highlightedSentence || t('home.aboutHighlight')}"
                </p>
              </div>

              <p className="text-base text-slate-700 leading-relaxed">
                {aboutTexts.paragraph || t('home.aboutBody')}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">
                    {language === 'pt' ? 'Mediação diplomática multilateral' : language === 'es' ? 'Mediación diplomática multilateral' : 'Multilateral diplomatic mediation'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">
                    {language === 'pt' ? 'Logística de socorro rápido' : language === 'es' ? 'Logística de socorro rápido' : 'Rapid relief logistics'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">
                    {language === 'pt' ? 'Voluntariado educacional' : language === 'es' ? 'Voluntariado educativo' : 'Educational volunteerism'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium">
                    {language === 'pt' ? 'Apoio e cuidado psicossocial' : language === 'es' ? 'Apoyo y cuidado psicosocial' : 'Social worker deployment'}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigateTo('about')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition-colors flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                >
                  <span>{aboutTexts.ctaText || t('home.aboutCta')}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNER ORGANIZATIONS & INSTITUTIONAL ALLIANCES */}
      <section className="py-12 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest block">
              {t('home.partnersLabel')}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-serif-heading text-slate-900 mt-1">
              {t('home.partnersTitle')}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 items-center">
            {[
              { name: 'America First', logo: '/media/partners/partner-america-first.jpg' },
              { name: 'AUSA - Association of the United States Army', logo: '/media/partners/partner-ausa.jpg' },
              { name: 'IICI - International Institute', logo: '/media/partners/partner-iici.jpg' },
              { name: 'UNA-USA - United Nations Association', logo: '/media/partners/partner-una-usa.jpg' },
              { name: 'UNA-UE - European Union Association', logo: '/media/partners/partner-una-ue.jpg' },
            ].map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center hover:border-amber-400 transition-colors">
                <img src={p.logo} alt={p.name} className="h-12 object-contain" />
                <span className="text-[11px] font-semibold text-slate-700 text-center mt-2">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ACTION WHERE IT MATTERS (PROGRAMS SECTION) */}
      <section className="py-20 lg:py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase block mb-1">
                {t('home.programsLabel')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-serif-heading text-slate-900">
                {t('home.programsTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('programs')}
              className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start md:self-auto cursor-pointer"
            >
              <span>{t('home.viewAllPrograms')} ({programs.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.slice(0, 6).map((prog) => (
              <div
                key={prog.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={prog.heroImage || prog.featuredImage}
                    alt={getProgramTitle(prog, language)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    {getProgramCategory(prog, language)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold font-serif-heading text-slate-900 group-hover:text-amber-700 transition-colors">
                      {getProgramTitle(prog, language)}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {getProgramShortDesc(prog, language)}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigateTo('program-detail', prog.slug)}
                      className="text-sm font-bold text-slate-900 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{t('programs.exploreBtn')}</span>
                      <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDonationModal(50, getProgramTitle(prog, language))}
                      className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {language === 'pt' ? 'Apoiar' : language === 'es' ? 'Financiar' : 'Fund This'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. IMPACT STATS SECTION */}
      <section className="py-16 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="pt-4 md:pt-0">
              <div className="text-5xl font-black text-amber-400 font-serif-heading">
                {statsTexts.stat1Number || '30+'}
              </div>
              <div className="text-base font-bold text-white mt-2">
                {statsTexts.stat1Text}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'pt'
                  ? 'Décadas de operações diplomáticas no terreno e entrega direta de auxílio.'
                  : language === 'es'
                  ? 'Décadas de operaciones diplomáticas de campo y entrega directa de ayuda.'
                  : 'Decades of diplomatic field operations and direct aid delivery.'}
              </p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8">
              <div className="text-5xl font-black text-amber-400 font-serif-heading">
                {statsTexts.stat2Number || '190+'}
              </div>
              <div className="text-base font-bold text-white mt-2">
                {statsTexts.stat2Text}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'pt'
                  ? 'Coordenação multilateral através de nações soberanas e regiões.'
                  : language === 'es'
                  ? 'Coordinación multilateral a través de naciones soberanas y regiones.'
                  : 'Multilateral coordination across sovereign nations and regions.'}
              </p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8">
              <div className="text-5xl font-black text-amber-400 font-serif-heading">
                {statsTexts.stat3Number || '6'}
              </div>
              <div className="text-base font-bold text-white mt-2">
                {statsTexts.stat3Text}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'pt'
                  ? 'Da logística de socorro à mediação comunitária e mentoria educacional.'
                  : language === 'es'
                  ? 'De la logística de socorro a la mediación comunitaria y mentoría educativa.'
                  : 'From emergency relief logistics to educational coaching.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DIPLOMATIC MISSIONS & GLOBAL SUMMITS SPOTLIGHT */}
      <section className="py-20 lg:py-28 bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-amber-400 tracking-widest uppercase block mb-1">
                {t('home.missionsLabel')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-serif-heading text-white">
                {t('home.missionsTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('about', 'missions')}
              className="text-sm font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start md:self-auto cursor-pointer"
            >
              <span>{t('home.exploreMissions')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: language === 'pt' ? 'Missão Brasil 2025' : language === 'es' ? 'Misión Brasil 2025' : 'Brazil 2025 Mission',
                subtitle: 'Brasília & São Paulo',
                image: '/media/events/brazil-2025-mission-1.jpg',
                tag: language === 'pt' ? 'Fórum Bilateral' : language === 'es' ? 'Foro Bilateral' : 'Bilateral Forum',
              },
              {
                title: language === 'pt' ? 'Cúpula Dubai 2024' : language === 'es' ? 'Cumbre Dubái 2024' : 'Dubai 2024 Summit',
                subtitle: 'United Arab Emirates',
                image: '/media/events/dubai-2024-summit-1.png',
                tag: language === 'pt' ? 'Cúpula Global da Paz' : language === 'es' ? 'Cumbre Global de la Paz' : 'Global Peace Summit',
              },
              {
                title: language === 'pt' ? 'Missão Brasil 2023' : language === 'es' ? 'Misión Brasil 2023' : 'Brazil 2023 Mission',
                subtitle: language === 'pt' ? 'Proteção Civil' : language === 'es' ? 'Protección Civil' : 'Civilian Protection',
                image: '/media/events/brazil-2023-mission-1.png',
                tag: language === 'pt' ? 'Ação Humanitária' : language === 'es' ? 'Acción Humanitaria' : 'Humanitarian Action',
              },
              {
                title: language === 'pt' ? 'Missão Brasil 2021' : language === 'es' ? 'Misión Brasil 2021' : 'Brazil 2021 Mission',
                subtitle: language === 'pt' ? 'Delegação Inaugural' : language === 'es' ? 'Delegación Inaugural' : 'Inaugural Delegation',
                image: '/media/events/brazil-2021-mission-1.png',
                tag: language === 'pt' ? 'Acreditações Diplomáticas' : language === 'es' ? 'Acreditaciones Diplomáticas' : 'Diplomatic Accreditations',
              },
            ].map((ev, idx) => (
              <div
                key={idx}
                onClick={() => navigateTo('about', 'missions')}
                className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/50 shadow-lg transition-all duration-300 group cursor-pointer flex flex-col"
              >
                <div className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={ev.image}
                    alt={ev.title}
                    className="w-full h-auto sm:h-52 object-contain sm:object-cover transition-transform duration-500 group-hover:scale-102"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    {ev.tag}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold font-serif-heading text-white group-hover:text-amber-400 transition-colors">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{ev.subtitle}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>{t('home.viewMissionGallery')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. STORIES THAT MATTER (NEWS & FIELD REPORTS) */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase block mb-1">
                {t('home.storiesLabel')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-serif-heading text-slate-900">
                {t('home.storiesTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('stories')}
              className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start md:self-auto cursor-pointer"
            >
              <span>{t('home.viewAllStories')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stories.slice(0, 3).map((story) => (
              <article
                key={story.id}
                onClick={() => navigateTo('story-detail', story.slug)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img
                    src={story.heroImage || story.featuredPhoto}
                    alt={getStoryTitle(story, language)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {getStoryCategory(story, language)}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(story.publishDate || story.publicationDate || Date.now()).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US')}</span>
                      <span>•</span>
                      <span>{story.readTimeMinutes || 4} {t('stories.minutes')}</span>
                    </div>
                    <h3 className="text-lg font-bold font-serif-heading text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                      {getStoryTitle(story, language)}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {getStoryExcerpt(story, language)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                    <span>{t('stories.readFullStory')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. AMBASSADORS SECTION */}
      <section className="py-20 lg:py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase block mb-1">
                {t('home.ambassadorsLabel')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-serif-heading text-slate-900">
                {t('home.ambassadorsTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('ambassadors')}
              className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start md:self-auto cursor-pointer"
            >
              <span>{t('home.viewAllAmbassadors')} ({ambassadors.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ambassadors.slice(0, 4).map((amb) => (
              <div
                key={amb.id}
                onClick={() => navigateTo('ambassador-detail', amb.id)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all p-5 flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-600/30 mb-4 group-hover:border-amber-600 transition-colors">
                  <img
                    src={amb.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop'}
                    alt={amb.fullName || amb.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>
                <div className="font-serif-heading font-bold text-base text-slate-900 group-hover:text-amber-700 transition-colors">
                  {amb.fullName || amb.name}
                </div>
                <div className="text-xs font-semibold text-amber-700 mt-0.5">{getAmbassadorRole(amb, language)}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-slate-400" />
                  <span>{getAmbassadorCountry(amb, language)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {getAmbassadorBio(amb, language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. DONATION SECTION */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current" />
            {t('home.donationTitle')}
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-serif-heading tracking-tight text-white">
            {language === 'pt'
              ? 'Sua generosidade move a esperança.'
              : language === 'es'
              ? 'Su generosidad impulsa la esperanza.'
              : 'Your generosity moves hope forward.'}
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('home.donationBody')}
          </p>

          {/* Interactive Gift Calculator */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl backdrop-blur-sm space-y-6">
            {/* Frequency */}
            <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveFrequency('one-time')}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeFrequency === 'one-time'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('donate.oneTime')}
              </button>
              <button
                type="button"
                onClick={() => setActiveFrequency('monthly')}
                className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeFrequency === 'monthly'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                {t('donate.monthly')}
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSelectedDonationAmount(amt)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                    selectedDonationAmount === amt
                      ? 'bg-amber-600 border-amber-500 text-white ring-2 ring-amber-400/40'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Direct CTA */}
            <button
              type="button"
              onClick={() => openDonationModal(selectedDonationAmount)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl text-base shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Heart className="w-5 h-5 fill-white/90 group-hover:scale-110 transition-transform" />
              <span>
                {t('donate.donateButton')} (${selectedDonationAmount} USD {activeFrequency === 'monthly' ? '/ Mo' : ''})
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
