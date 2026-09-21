import React, { useState } from 'react';
import { Shield, Globe2, ArrowRight, Search } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getAmbassadorRole,
  getAmbassadorCountry,
  getAmbassadorBio,
} from '../../lib/i18nHelper';

export function AmbassadorsView() {
  const { ambassadors, navigateTo, language } = useSite();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = ambassadors.filter((a) => {
    const name = (a.fullName || a.name || '').toLowerCase();
    const country = getAmbassadorCountry(a, language).toLowerCase();
    const role = getAmbassadorRole(a, language).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || country.includes(q) || role.includes(q);
  });

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src="https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop"
            alt="ADMIR Diplomatic Corps"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            {t('ambassadors.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('ambassadors.title')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('ambassadors.subtitle')}
          </p>
        </div>
      </section>

      {/* Filter / Search Bar */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-sm sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t('ambassadors.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={() => navigateTo('get-involved', 'ambassador')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            {t('ambassadors.applyForAccreditation')}
          </button>
        </div>
      </div>

      {/* Ambassadors Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((amb) => {
            const role = getAmbassadorRole(amb, language);
            const country = getAmbassadorCountry(amb, language);
            const bio = getAmbassadorBio(amb, language);

            return (
              <div
                key={amb.id}
                onClick={() => navigateTo('ambassador-detail', amb.id)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-200 p-6 flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-amber-500/40 mb-4 group-hover:border-amber-600 transition-colors shadow-sm">
                  <img
                    src={amb.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop'}
                    alt={amb.fullName || amb.name || ''}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>

                <h3 className="font-serif-heading font-bold text-lg text-slate-900 group-hover:text-amber-700 transition-colors">
                  {amb.fullName || amb.name}
                </h3>

                <div className="text-xs font-semibold text-amber-700 mt-1">
                  {role}
                </div>

                <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{country}</span>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                  {bio}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 w-full flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-amber-700">
                  <span>{t('ambassadors.viewCredentials')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
