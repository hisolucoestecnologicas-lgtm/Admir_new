import React from 'react';
import {
  ArrowLeft,
  Shield,
  Globe2,
  Calendar,
  Award,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getAmbassadorRole,
  getAmbassadorCountry,
  getAmbassadorBio,
  getAmbassadorSpecialty,
} from '../../lib/i18nHelper';

export function AmbassadorDetailView() {
  const { selectedParam, ambassadors, navigateTo, language } = useSite();
  const { t } = useTranslation();

  const ambassador = ambassadors.find((a) => a.id === selectedParam);

  if (!ambassador) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-900 font-serif-heading">{t('ambassadors.notFound')}</h2>
        <p className="text-slate-600 mt-2">{t('ambassadors.notFoundDesc')}</p>
        <button
          type="button"
          onClick={() => navigateTo('ambassadors')}
          className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('ambassadors.backToAmbassadors')}
        </button>
      </div>
    );
  }

  const name = ambassador.fullName || ambassador.name;
  const role = getAmbassadorRole(ambassador, language);
  const country = getAmbassadorCountry(ambassador, language);
  const bio = getAmbassadorBio(ambassador, language);
  const specialty = getAmbassadorSpecialty(ambassador, language);

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            type="button"
            onClick={() => navigateTo('ambassadors')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('ambassadors.backToAmbassadors')}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 border-b border-slate-100 pb-8">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-amber-600/40 shrink-0 shadow-md">
              <img
                src={ambassador.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop'}
                alt={name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop';
                }}
              />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('ambassadors.accreditedEnvoy')}</span>
              </div>
              <h1 className="text-3xl font-black font-serif-heading text-slate-900">
                {name}
              </h1>
              <div className="text-base font-semibold text-amber-700">{role}</div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1">
                  <Globe2 className="w-4 h-4 text-slate-400" />
                  <span>{language === 'pt' ? 'País:' : language === 'es' ? 'País:' : 'Country:'} {country}</span>
                </div>
                {specialty && (
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>{language === 'pt' ? 'Especialidade:' : language === 'es' ? 'Especialidad:' : 'Specialty:'} {specialty}</span>
                  </div>
                )}
                {ambassador.appointedDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{language === 'pt' ? 'Nomeação:' : language === 'es' ? 'Nombramiento:' : 'Appointed:'} {ambassador.appointedDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-6">
            <h2 className="text-xl font-bold font-serif-heading text-slate-900">
              {t('ambassadors.diplomaticMission')}
            </h2>
            <div className="prose-editorial text-slate-700 leading-relaxed text-base space-y-4">
              <p>{bio}</p>
              <p>
                {language === 'pt'
                  ? `Representando a Missão Diplomática Americana de Relações Internacionais (ADMIR), ${name} atua na mediação de diálogos humanitários, articulação institucional e fortalecimento de projetos sociais e de paz em ${country} e organismos multilaterais.`
                  : language === 'es'
                  ? `Representando a la Misión Diplomática Americana de Relaciones Internacionales (ADMIR), ${name} facilita el diálogo humanitario, la articulación institucional y el fortalecimiento de programas comunitarios en ${country} y foros multilaterales.`
                  : `Representing the American Diplomatic Mission of International Relations, ${name} facilitates cross-sector dialogues, strengthens community peace infrastructures, and mobilizes emergency resources for families facing adversity in ${country} and surrounding multilateral forums.`}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigateTo('contact')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>{t('ambassadors.contactOffice')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('get-involved', 'ambassador')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-6 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('ambassadors.nominateOrApply')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
