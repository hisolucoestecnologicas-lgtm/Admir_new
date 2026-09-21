import React from 'react';
import {
  ArrowLeft,
  Heart,
  CheckCircle2,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getProgramTitle,
  getProgramCategory,
  getProgramShortDesc,
  getProgramFullDesc,
  getProgramObjectives,
} from '../../lib/i18nHelper';

export function ProgramDetailView() {
  const { selectedParam, programs, navigateTo, openDonationModal, language } = useSite();
  const { success } = useToast();
  const { t } = useTranslation();

  const program = programs.find((p) => p.slug === selectedParam || p.id === selectedParam);

  if (!program) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-900 font-serif-heading">{t('programs.notFound')}</h2>
        <p className="text-slate-600 mt-2">{t('programs.notFoundDesc')}</p>
        <button
          type="button"
          onClick={() => navigateTo('programs')}
          className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('programs.backToPrograms')}
        </button>
      </div>
    );
  }

  const title = getProgramTitle(program, language);
  const category = getProgramCategory(program, language);
  const shortDesc = getProgramShortDesc(program, language);
  const fullDesc = getProgramFullDesc(program, language);
  const objectives = getProgramObjectives(program, language);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      success(
        language === 'pt' ? 'Link Copiado!' : language === 'es' ? '¡Enlace Copiado!' : 'Link Copied!',
        language === 'pt'
          ? 'Link do programa copiado para a área de transferência.'
          : language === 'es'
          ? 'Enlace del programa copiado al portapapeles.'
          : 'Program link copied to your clipboard.'
      );
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('programs')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('programs.backToPrograms')}</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title={t('common.share')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('common.share')}</span>
            </button>
            <button
              type="button"
              onClick={() => openDonationModal(100, title)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              {t('programs.donateToProgram')}
            </button>
          </div>
        </div>
      </div>

      {/* Program Hero */}
      <div className="relative bg-slate-950 text-white min-h-[380px] flex items-end">
        <div className="absolute inset-0">
          <img
            src={program.heroImage || program.featuredImage}
            alt={title}
            className="w-full h-full object-cover opacity-35"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>{category}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-serif-heading text-white">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            {shortDesc}
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Editorial Narrative */}
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
              {t('programs.operationalOverview')}
            </h2>
            <div
              className="prose-editorial text-slate-700 text-base leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{
                __html: fullDesc.startsWith('<')
                  ? fullDesc
                  : `<p>${fullDesc.replace(/\n\n/g, '</p><p>')}</p>`,
              }}
            />
          </div>

          {/* Strategic Objectives */}
          {objectives && objectives.length > 0 && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                {t('programs.keyObjectives')}
              </h3>
              <div className="space-y-3">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-800 font-medium">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {program.gallery && program.gallery.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                {t('programs.fieldImagery')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {program.gallery.map((img, i) => (
                  <div key={i} className="rounded-xl overflow-hidden shadow-sm h-52 bg-slate-100">
                    <img
                      src={img}
                      alt={`${title} gallery ${i}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Donation Support Box */}
          <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-lg shadow-amber-900/5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <h3 className="text-xl font-bold font-serif-heading text-slate-900">
              {t('programs.supportThis')}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'pt'
                ? `100% dos recursos destinados a "${title}" financiam diretamente suprimentos de campo, equipes voluntárias e apoio comunitário.`
                : language === 'es'
                ? `El 100% de las donaciones dirigidas a "${title}" financian directamente insumos de campo, voluntarios y apoyo comunitario.`
                : `100% of earmarked gifts for "${title}" directly supply field equipment, volunteer deployment, and community resources.`}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => openDonationModal(amt, title)}
                  className="py-2.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-amber-600 hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer"
                >
                  ${amt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openDonationModal(100, title)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>{t('programs.donateToProgram')}</span>
            </button>
          </div>

          {/* Volunteer Call to Action */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {t('programs.volunteerBadge')}
            </div>
            <h4 className="text-lg font-bold font-serif-heading">
              {t('programs.volunteerTitle')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('programs.volunteerDesc')}
            </p>
            <button
              type="button"
              onClick={() => navigateTo('get-involved', 'volunteer')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t('programs.volunteerCta')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
