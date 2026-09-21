import React from 'react';
import {
  ArrowLeft,
  Calendar,
  User,
  Share2,
  Tag,
  ArrowRight,
  Heart,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getStoryTitle,
  getStoryCategory,
  getStoryExcerpt,
  getStoryFullContent,
} from '../../lib/i18nHelper';

export function StoryDetailView() {
  const { selectedParam, stories, navigateTo, openDonationModal, language } = useSite();
  const { success } = useToast();
  const { t } = useTranslation();

  const story = stories.find((s) => s.slug === selectedParam || s.id === selectedParam);

  if (!story) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-900 font-serif-heading">{t('stories.notFound')}</h2>
        <p className="text-slate-600 mt-2">{t('stories.notFoundDesc')}</p>
        <button
          type="button"
          onClick={() => navigateTo('stories')}
          className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('stories.backToStories')}
        </button>
      </div>
    );
  }

  const title = getStoryTitle(story, language);
  const category = getStoryCategory(story, language);
  const excerpt = getStoryExcerpt(story, language);
  const fullContent = getStoryFullContent(story, language);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      success(
        language === 'pt' ? 'Link Copiado!' : language === 'es' ? '¡Enlace Copiado!' : 'Link Copied!',
        language === 'pt'
          ? 'Link da reportagem copiado com sucesso.'
          : language === 'es'
          ? 'Enlace del reporte copiado con éxito.'
          : 'Report link copied successfully.'
      );
    }
  };

  const relatedStories = stories.filter((s) => s.id !== story.id).slice(0, 3);

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Top Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('stories')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('stories.backToStories')}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('common.share')}</span>
          </button>
        </div>
      </div>

      {/* Main Editorial Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-12 space-y-8">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>{category}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-serif-heading text-slate-900 leading-tight">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <User className="w-4 h-4 text-amber-600" />
                <span>{t('stories.byAuthor')} {story.author}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  {new Date(story.publishDate || story.publicationDate || Date.now()).toLocaleDateString(
                    language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US',
                    { dateStyle: 'long' }
                  )}
                </span>
              </div>
              <span>•</span>
              <div>{story.readTimeMinutes || 4} {t('stories.minutes')}</div>
            </div>
          </div>

          {/* Lead Hero Image */}
          <div className="rounded-2xl overflow-hidden shadow-sm h-[360px] sm:h-[460px] bg-slate-100">
            <img
              src={story.heroImage || story.featuredPhoto}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
              }}
            />
          </div>

          {/* Lead Quote */}
          <div className="p-6 bg-slate-50 border-l-4 border-amber-600 rounded-r-2xl">
            <p className="text-lg sm:text-xl font-serif-heading text-slate-800 italic leading-relaxed">
              "{excerpt}"
            </p>
          </div>

          {/* Full Narrative Rich Text */}
          <div
            className="prose-editorial text-slate-800 leading-relaxed text-base sm:text-lg space-y-4"
            dangerouslySetInnerHTML={{
              __html: fullContent.startsWith('<')
                ? fullContent
                : `<p>${fullContent.replace(/\n\n/g, '</p><p>')}</p>`,
            }}
          />

          {/* Tags */}
          {story.tags && story.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-slate-400" />
              {story.tags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Direct Support Callout */}
          <div className="bg-slate-900 text-white p-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                {t('stories.takeAction')}
              </div>
              <h3 className="text-xl font-bold font-serif-heading">
                {t('stories.supportMissions')}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                {t('stories.supportMissionsDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDonationModal(50, title)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>{t('donate.donateButton')} $50 USD</span>
            </button>
          </div>
        </div>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <div className="mt-16 space-y-6">
            <h3 className="text-2xl font-bold font-serif-heading text-slate-900">
              {t('stories.relatedDispatches')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedStories.map((rel) => {
                const relTitle = getStoryTitle(rel, language);
                return (
                  <div
                    key={rel.id}
                    onClick={() => navigateTo('story-detail', rel.slug)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer space-y-3"
                  >
                    <img
                      src={rel.heroImage || rel.featuredPhoto}
                      alt={relTitle}
                      className="w-full h-36 object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                      }}
                    />
                    <h4 className="font-bold text-slate-900 text-sm font-serif-heading line-clamp-2">
                      {relTitle}
                    </h4>
                    <div className="text-xs text-amber-700 font-bold flex items-center gap-1">
                      {t('stories.readFullStory')} <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
