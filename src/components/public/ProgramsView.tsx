import React, { useState } from 'react';
import { ArrowRight, Heart, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getProgramTitle,
  getProgramCategory,
  getProgramShortDesc,
  getProgramObjectives,
} from '../../lib/i18nHelper';

export function ProgramsView() {
  const { programs, navigateTo, openDonationModal, language } = useSite();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    { key: 'All', label: t('programs.filterAll') },
    { key: 'Peace & Diplomacy', label: t('programs.filterPeace') },
    { key: 'Education & Youth', label: t('programs.filterEducation') },
    { key: 'Social Care', label: t('programs.filterSocial') },
    { key: 'Disaster Relief', label: t('programs.filterRelief') },
  ];

  const filteredPrograms =
    selectedCategory === 'All'
      ? programs
      : programs.filter((p) => {
          const rawCat = (p.category || '').toLowerCase();
          const target = selectedCategory.toLowerCase();
          if (target === 'peace & diplomacy') return rawCat.includes('peace') || rawCat.includes('diplom') || rawCat.includes('paz');
          if (target === 'education & youth') return rawCat.includes('educ') || rawCat.includes('youth') || rawCat.includes('joven') || rawCat.includes('jovem');
          if (target === 'social care') return rawCat.includes('social') || rawCat.includes('cuidado') || rawCat.includes('health') || rawCat.includes('saúde') || rawCat.includes('salud');
          if (target === 'disaster relief') return rawCat.includes('relief') || rawCat.includes('disaster') || rawCat.includes('desastre') || rawCat.includes('socorro') || rawCat.includes('emerg');
          return true;
        });

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2000&auto=format&fit=crop"
            alt="ADMIR Humanitarian Programs"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop';
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            {t('programs.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('programs.title')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('programs.subtitle')}
          </p>
        </div>
      </section>

      {/* Category Filter Bar */}
      <div className="sticky top-20 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-3 items-center">
          <span className="text-xs font-bold text-slate-500 uppercase mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> {language === 'pt' ? 'Setor:' : language === 'es' ? 'Sector:' : 'Sector:'}
          </span>
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Programs Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPrograms.map((prog) => {
            const title = getProgramTitle(prog, language);
            const category = getProgramCategory(prog, language);
            const shortDesc = getProgramShortDesc(prog, language);
            const objectives = getProgramObjectives(prog, language);

            return (
              <div
                key={prog.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-60 overflow-hidden bg-slate-100">
                  <img
                    src={prog.heroImage || prog.featuredImage}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    {category}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold font-serif-heading text-slate-900 group-hover:text-amber-700 transition-colors">
                      {title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {shortDesc}
                    </p>

                    {/* Key Objectives preview */}
                    {objectives && objectives.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {t('programs.coreObjectives')}
                        </div>
                        {objectives.slice(0, 2).map((obj, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{obj}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                      onClick={() => openDonationModal(100, title)}
                      className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Heart className="w-3 h-3 fill-current" />
                      {t('programs.donate')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
