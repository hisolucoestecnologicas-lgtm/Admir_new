import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Award,
  Globe2,
  Calendar,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';

export function AboutView() {
  const { selectedParam, navigateTo, language } = useSite();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'who-we-are' | 'mission' | 'framework' | 'leadership' | 'missions'>('who-we-are');
  const [lightboxState, setLightboxState] = useState<{ missionIdx: number; imageIdx: number } | null>(null);
  const [diplomaLightboxIdx, setDiplomaLightboxIdx] = useState<number | null>(null);

  const diplomasData = [
    { img: '/media/about/admir-diploma-1.png', titleKey: 'about.diploma1Title', alt: 'Official Diplomatic Accreditation Certificate I - ADMIR' },
    { img: '/media/about/admir-diploma-2.png', titleKey: 'about.diploma2Title', alt: 'International Relations Credentials II - ADMIR' },
    { img: '/media/about/admir-diploma-3.png', titleKey: 'about.diploma3Title', alt: 'Peace Ambassador Diplomatic Charter - ADMIR' },
  ];

  useEffect(() => {
    if (selectedParam && ['who-we-are', 'mission', 'framework', 'leadership', 'missions'].includes(selectedParam)) {
      setActiveTab(selectedParam as any);
    }
  }, [selectedParam]);

  useEffect(() => {
    if (lightboxState !== null || diplomaLightboxIdx !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [lightboxState, diplomaLightboxIdx]);

  useEffect(() => {
    if (diplomaLightboxIdx !== null) {
      const handleDiplomaKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDiplomaLightboxIdx(null);
        } else if (e.key === 'ArrowRight') {
          setDiplomaLightboxIdx((prev) => (prev !== null ? (prev + 1) % diplomasData.length : null));
        } else if (e.key === 'ArrowLeft') {
          setDiplomaLightboxIdx((prev) => (prev !== null ? (prev - 1 + diplomasData.length) % diplomasData.length : null));
        }
      };
      window.addEventListener('keydown', handleDiplomaKeyDown);
      return () => window.removeEventListener('keydown', handleDiplomaKeyDown);
    }
  }, [diplomaLightboxIdx]);

  useEffect(() => {
    if (!lightboxState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowRight') {
        const mission = missionsData[lightboxState.missionIdx];
        if (mission) {
          setLightboxState({
            missionIdx: lightboxState.missionIdx,
            imageIdx: (lightboxState.imageIdx + 1) % mission.images.length,
          });
        }
      } else if (e.key === 'ArrowLeft') {
        const mission = missionsData[lightboxState.missionIdx];
        if (mission) {
          setLightboxState({
            missionIdx: lightboxState.missionIdx,
            imageIdx: (lightboxState.imageIdx - 1 + mission.images.length) % mission.images.length,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

  const missionsData = [
    {
      title: 'Brasília & São Paulo, Brazil — 2025',
      location: 'Brasília & São Paulo, Brazil',
      date: '2025',
      desc: 'Official high-level bilateral diplomatic mission, bilateral institutional agreements, and accredited diplomatic delegations.',
      images: [
        '/media/events/brazil-2025-mission-1.jpg',
        '/media/events/brazil-2025-mission-2.jpg',
        '/media/events/brazil-2025-mission-3.jpg',
        '/media/events/brazil-2025-mission-4.jpg',
        '/media/events/brazil-2025-mission-5.jpg',
        '/media/events/brazil-2025-mission-6.jpg',
      ],
    },
    {
      title: 'Dubai, United Arab Emirates — 2024',
      location: 'Dubai, United Arab Emirates',
      date: '2024',
      desc: 'International summit convening peace envoys, humanitarian leaders, and multilateral delegates on international relations and humanitarian action.',
      images: [
        '/media/events/dubai-2024-summit-1.png',
        '/media/events/dubai-2024-summit-2.png',
        '/media/events/dubai-2024-summit-3.png',
        '/media/events/dubai-2024-summit-4.png',
        '/media/events/dubai-2024-summit-5.png',
        '/media/events/dubai-2024-summit-6.png',
      ],
    },
    {
      title: 'Brasil — 2023',
      location: 'Brasil',
      date: '2023',
      desc: 'Humanitarian field actions, community relief, and diplomatic credentialing ceremonies.',
      images: [
        '/media/events/brazil-2023-mission-1.png',
        '/media/events/brazil-2023-mission-2.png',
        '/media/events/brazil-2023-mission-3.png',
        '/media/events/brazil-2023-mission-4.png',
        '/media/events/brazil-2023-mission-5.png',
        '/media/events/brazil-2023-mission-6.png',
      ],
    },
    {
      title: 'Brasil — 2021',
      location: 'Brasil',
      date: '2021',
      desc: 'Official ceremonial gathering and appointment of regional peace ambassadors and social leaders.',
      images: [
        '/media/events/brazil-2021-mission-1.png',
        '/media/events/brazil-2021-mission-2.png',
        '/media/events/brazil-2021-mission-3.png',
        '/media/events/brazil-2021-mission-4.png',
        '/media/events/brazil-2021-mission-5.png',
        '/media/events/brazil-2021-mission-6.png',
      ],
    },
  ];

  const partners = [
    { name: 'America First', logo: '/media/partners/partner-america-first.jpg' },
    { name: 'AUSA - Association of the United States Army', logo: '/media/partners/partner-ausa.jpg' },
    { name: 'IICI - International Institute', logo: '/media/partners/partner-iici.jpg' },
    { name: 'UNA-USA - United Nations Association', logo: '/media/partners/partner-una-usa.jpg' },
    { name: 'UNA-UE - European Union Association', logo: '/media/partners/partner-una-ue.jpg' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Editorial Header Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src="/media/events/dubai-2024-summit-1.png"
            alt="ADMIR Institutional Diplomacy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            {t('about.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('about.heroTitle')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('about.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="sticky top-20 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-3">
          {[
            { id: 'who-we-are', label: t('about.tabWhoWeAre') },
            { id: 'mission', label: t('about.tabMission') },
            { id: 'framework', label: t('about.tabFramework') },
            { id: 'leadership', label: t('about.tabLeadership') },
            { id: 'missions', label: t('about.tabMissions') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* WHO WE ARE */}
        {activeTab === 'who-we-are' && (
          <div className="space-y-10 animate-in fade-in duration-200">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase">
                {t('about.badge')}
              </span>
              <h2 className="text-3xl font-bold font-serif-heading text-slate-900">
                {t('about.whoWeAreTitle')}
              </h2>
              <p className="text-lg text-slate-700 leading-relaxed font-normal">
                {t('about.whoWeAreBody1')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900 mb-3">
                  {language === 'pt' ? 'Nossa Identidade e Convicção' : language === 'es' ? 'Nuestra Identidad y Convicción' : 'Our Identity & Conviction'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {t('about.whoWeAreBody2')}
                </p>
                <div className="space-y-2 text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'pt' ? 'Ação humanitária neutra e independente' : language === 'es' ? 'Acción humanitaria neutral e independiente' : 'Neutral and independent humanitarian action'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'pt' ? 'Coordenação diplomática transfronteiriça' : language === 'es' ? 'Coordinación diplomática transfronteriza' : 'Cross-border diplomatic coordination'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'pt' ? 'Empoderamento comunitário direto' : language === 'es' ? 'Empoderamiento comunitario directo' : 'Direct community empowerment'}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden shadow-md">
                <img
                  src="/media/about/admir-about-humanitarian.jpg"
                  alt="ADMIR Humanitarian and Diplomatic Mission"
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                  }}
                />
              </div>
            </div>

            {/* Impact Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="text-3xl font-black font-serif-heading text-amber-700">{t('about.stat1')}</div>
                <div className="text-xs text-slate-600 mt-1 font-medium">{t('about.stat1Desc')}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="text-3xl font-black font-serif-heading text-amber-700">{t('about.stat2')}</div>
                <div className="text-xs text-slate-600 mt-1 font-medium">{t('about.stat2Desc')}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="text-3xl font-black font-serif-heading text-amber-700">{t('about.stat3')}</div>
                <div className="text-xs text-slate-600 mt-1 font-medium">{t('about.stat3Desc')}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="text-3xl font-black font-serif-heading text-amber-700">{t('about.stat4')}</div>
                <div className="text-xs text-slate-600 mt-1 font-medium">{t('about.stat4Desc')}</div>
              </div>
            </div>

            {/* Institutional Affiliations */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('about.partnersTitle')}</span>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900 mt-1">
                  {t('about.partnersSubtitle')}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 items-center">
                {partners.map((p, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-amber-300 transition-colors bg-slate-50/50">
                    <img src={p.logo} alt={p.name} className="h-14 object-contain" />
                    <span className="text-[11px] font-semibold text-slate-600 text-center mt-2">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MISSION & PRINCIPLES */}
        {activeTab === 'mission' && (
          <div className="space-y-10 animate-in fade-in duration-200">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase">
                {language === 'pt' ? 'Estatuto' : language === 'es' ? 'Estatuto' : 'Charter'}
              </span>
              <h2 className="text-3xl font-bold font-serif-heading text-slate-900">
                {t('about.missionTitle')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Globe2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  {language === 'pt' ? 'Nossa Missão' : language === 'es' ? 'Nuestra Misión' : 'Our Mission'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('about.missionBody')}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  {language === 'pt' ? 'Nossa Visão' : language === 'es' ? 'Nuestra Visión' : 'Our Vision'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {language === 'pt'
                    ? 'Um mundo onde os direitos humanos e a dignidade sejam universalmente defendidos por meio da diplomacia construtiva, parcerias colaborativas e ação humanitária transparente.'
                    : language === 'es'
                    ? 'Un mundo donde los derechos humanos y la dignidad se defiendan universalmente a través de la diplomacia constructiva y la acción humanitaria transparente.'
                    : 'A world where human rights and dignity are universally upheld through constructive diplomacy, collaborative partnerships, and effective, transparent humanitarian action.'}
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                {t('about.principlesTitle')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="font-bold text-slate-900 text-sm">{t('about.principle1Title')}</div>
                  <p className="text-xs text-slate-600 mt-1">{t('about.principle1Desc')}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="font-bold text-slate-900 text-sm">{t('about.principle2Title')}</div>
                  <p className="text-xs text-slate-600 mt-1">{t('about.principle2Desc')}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="font-bold text-slate-900 text-sm">{t('about.principle3Title')}</div>
                  <p className="text-xs text-slate-600 mt-1">{t('about.principle3Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DIPLOMAS & CREDENTIALS (FRAMEWORK) */}
        {activeTab === 'framework' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase">
                {t('about.frameworkSubtitle')}
              </span>
              <h2 className="text-3xl font-bold font-serif-heading text-slate-900">
                {t('about.frameworkTitle')}
              </h2>
              <p className="text-base text-slate-700 leading-relaxed">
                {t('about.frameworkBody')}
              </p>
            </div>

            {/* Official Diplomas Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {diplomasData.map((diploma, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDiplomaLightboxIdx(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDiplomaLightboxIdx(idx);
                    }
                  }}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col items-center cursor-pointer group hover:border-amber-500/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  style={{ cursor: 'zoom-in' }}
                >
                  <div className="relative overflow-hidden rounded-lg border border-slate-100 shadow-sm w-full bg-slate-50 flex items-center justify-center">
                    <img
                      src={diploma.img}
                      alt={diploma.alt}
                      className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm backdrop-blur-sm">
                        {t('about.viewImage') || 'Click to view official document'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center group-hover:text-amber-700 transition-colors">
                    {t(diploma.titleKey)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-900 p-2 flex items-center justify-center shrink-0">
                  <img src="/media/about/admir-diploma-seal.png" alt="ADMIR Official Diplomatic Seal" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif-heading">
                    {t('about.headquartersTitle')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('about.headquartersAddress')}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {language === 'pt' ? 'Alinhamento com Convenções Internacionais' : language === 'es' ? 'Alineación con Convenciones Internacionales' : 'Treaty & Convention Alignment'}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {language === 'pt'
                    ? 'A ADMIR alinha seus protocolos operacionais com as Convenções de Genebra, a Declaração Universal dos Direitos Humanos e os Objetivos de Desenvolvimento Sustentável da ONU (ODS 16 e 17).'
                    : language === 'es'
                    ? 'ADMIR alinea sus protocolos operativos con los Convenios de Ginebra, la Declaración Universal de los Derechos Humanos y los Objetivos de Desarrollo Sostenible de la ONU (ODS 16 y 17).'
                    : 'ADMIR aligns its operational protocols with the Geneva Conventions, the Universal Declaration of Human Rights, and the United Nations Sustainable Development Goals (SDGs), notably SDG 16 (Peace, Justice, and Strong Institutions) and SDG 17 (Partnerships for the Goals).'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => navigateTo('contact')}
                  className="text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('about.requestCredentials')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEADERSHIP & GOVERNANCE */}
        {activeTab === 'leadership' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase">
                {t('about.leadershipTitle')}
              </span>
              <h2 className="text-3xl font-bold font-serif-heading text-slate-900">
                {t('about.leadershipTitle')}
              </h2>
              <p className="text-base text-slate-700 leading-relaxed">
                {t('about.leadershipSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Dr. Fernando Navarro Marques */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-amber-600/40 shrink-0 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop"
                    alt="Dr. Fernando Navarro Marques - Presidente & Alto Comissário ADMIR"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 font-serif-heading text-xl">
                    {t('about.presTitle')}
                  </h3>
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                    {t('about.presRole')}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {t('about.presBio')}
                  </p>
                </div>
              </div>

              {/* Fernando Simões Ferreira */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-amber-600/40 shrink-0 shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop"
                    alt="Fernando Simões Ferreira - Diretor Executivo ADMIR"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 font-serif-heading text-xl">
                    {t('about.execTitle')}
                  </h3>
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                    {t('about.execRole')}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {t('about.execBio')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DIPLOMATIC MISSIONS & SUMMITS */}
        {activeTab === 'missions' && (
          <div className="space-y-12 animate-in fade-in duration-200">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-700 tracking-widest uppercase">
                {t('home.missionsLabel')}
              </span>
              <h2 className="text-3xl font-bold font-serif-heading text-slate-900">
                {t('about.missionsArchiveTitle')}
              </h2>
              <p className="text-base text-slate-700 leading-relaxed">
                {t('about.missionsArchiveSubtitle')}
              </p>
            </div>

            <div className="space-y-10">
              {missionsData.map((mission, idx) => (
                <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{mission.date} • {mission.location}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold font-serif-heading text-slate-900">
                        {mission.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{mission.desc}</p>
                  
                  {/* Photo Gallery */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {mission.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setLightboxState({ missionIdx: idx, imageIdx: imgIdx })}
                        className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 flex items-center justify-center group relative cursor-pointer"
                        style={{ cursor: 'zoom-in' }}
                      >
                        <img
                          src={imgUrl}
                          alt={`${mission.title} - Registro fotográfico oficial ${imgIdx + 1}`}
                          className="w-full h-auto sm:h-48 object-contain sm:object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxState !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxState(null)}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxState(null);
            }}
            aria-label={t('about.lightboxClose') || 'Close image viewer'}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/90 text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
            {lightboxState.imageIdx + 1} / {missionsData[lightboxState.missionIdx].images.length}
          </div>

          {/* Previous button */}
          {missionsData[lightboxState.missionIdx].images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentMission = missionsData[lightboxState.missionIdx];
                setLightboxState({
                  missionIdx: lightboxState.missionIdx,
                  imageIdx: (lightboxState.imageIdx - 1 + currentMission.images.length) % currentMission.images.length,
                });
              }}
              aria-label={t('about.lightboxPrev') || 'Previous image'}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Next button */}
          {missionsData[lightboxState.missionIdx].images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentMission = missionsData[lightboxState.missionIdx];
                setLightboxState({
                  missionIdx: lightboxState.missionIdx,
                  imageIdx: (lightboxState.imageIdx + 1) % currentMission.images.length,
                });
              }}
              aria-label={t('about.lightboxNext') || 'Next image'}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Main image container */}
          <div
            className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={missionsData[lightboxState.missionIdx].images[lightboxState.imageIdx]}
              alt={`${missionsData[lightboxState.missionIdx].title} - Ampliada ${lightboxState.imageIdx + 1}`}
              className="max-w-[95vw] max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-3 text-center text-white/80 text-xs sm:text-sm font-medium tracking-wide">
              {missionsData[lightboxState.missionIdx].title} — {missionsData[lightboxState.missionIdx].location} ({missionsData[lightboxState.missionIdx].date})
            </div>
          </div>
        </div>
      )}

      {/* Diploma Lightbox Modal */}
      {diplomaLightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official document viewer"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setDiplomaLightboxIdx(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDiplomaLightboxIdx(null);
            }}
            aria-label={t('about.lightboxClose') || 'Close image viewer'}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/90 text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
            {diplomaLightboxIdx + 1} / {diplomasData.length}
          </div>

          {/* Previous button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDiplomaLightboxIdx((prev) => (prev !== null ? (prev - 1 + diplomasData.length) % diplomasData.length : null));
            }}
            aria-label={t('about.lightboxPrev') || 'Previous image'}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-10 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDiplomaLightboxIdx((prev) => (prev !== null ? (prev + 1) % diplomasData.length : null));
            }}
            aria-label={t('about.lightboxNext') || 'Next image'}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-10 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Main image container */}
          <div
            className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={diplomasData[diplomaLightboxIdx].img}
              alt={diplomasData[diplomaLightboxIdx].alt}
              className="max-w-[95vw] max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl bg-white p-2"
            />
            <div className="mt-3 text-center text-white/90 text-sm sm:text-base font-semibold tracking-wide">
              {t(diplomasData[diplomaLightboxIdx].titleKey)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
