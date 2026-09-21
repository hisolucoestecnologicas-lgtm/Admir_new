import React, { useState } from 'react';
import { BookOpen, Calendar, Search, ArrowRight } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getStoryTitle,
  getStoryCategory,
  getStoryExcerpt,
} from '../../lib/i18nHelper';

export function StoriesView() {
  const { stories, navigateTo, language } = useSite();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = [
    { key: 'All', label: t('stories.filterAll') },
    { key: 'Humanitarian Action', label: t('stories.filterHumanitarian') },
    { key: 'Diplomacy', label: t('stories.filterDiplomacy') },
    { key: 'Education', label: t('stories.filterEducation') },
    { key: 'Community Care', label: t('stories.filterCommunity') },
  ];

  const filtered = stories.filter((s) => {
    const storyCat = getStoryCategory(s, language).toLowerCase();
    const matchesCat =
      category === 'All' ||
      storyCat.includes(category.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(category.toLowerCase()));

    const title = getStoryTitle(s, language).toLowerCase();
    const excerpt = getStoryExcerpt(s, language).toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      title.includes(q) ||
      excerpt.includes(q) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop"
            alt="ADMIR Field Reports Banner"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop';
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            {t('stories.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('stories.title')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('stories.subtitle')}
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-sm sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex overflow-x-auto gap-2 w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  category === cat.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('stories.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((story) => {
            const title = getStoryTitle(story, language);
            const storyCategory = getStoryCategory(story, language);
            const excerpt = getStoryExcerpt(story, language);

            return (
              <article
                key={story.id}
                onClick={() => navigateTo('story-detail', story.slug)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={story.heroImage || story.featuredPhoto}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-900/90 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    {storyCategory}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(story.publishDate || story.publicationDate || Date.now()).toLocaleDateString(
                          language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US'
                        )}
                      </span>
                      <span>•</span>
                      <span>{story.readTimeMinutes || 4} {t('stories.minutes')}</span>
                    </div>

                    <h2 className="text-xl font-bold font-serif-heading text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                      {title}
                    </h2>

                    <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-amber-700">
                    <span className="text-slate-500 font-medium">
                      {t('stories.byAuthor')} {story.author}
                    </span>
                    <span className="flex items-center gap-1">
                      {t('stories.readFullStory')} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
