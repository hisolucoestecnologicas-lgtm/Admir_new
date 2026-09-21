import React, { useState } from 'react';
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Sparkles,
  X,
  Save,
  Search,
  Languages,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { NewsStory, Language } from '../../types';
import { RichTextEditor } from '../common/RichTextEditor';

export function AdminNews() {
  const { stories, refreshStories, navigateTo } = useSite();
  const { hasPermission, user } = useAuth();
  const { success, error } = useToast();

  const canCreate = hasPermission('news.create');
  const canEdit = hasPermission('news.edit');
  const canDelete = hasPermission('news.delete');
  const canToggle = hasPermission('news.publish');

  const [search, setSearch] = useState('');
  const [editingStory, setEditingStory] = useState<NewsStory | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab for active language in the editor modal
  const [activeLangTab, setActiveLangTab] = useState<Language>('en');

  // Form states per language
  const [formEn, setFormEn] = useState({
    title: '',
    excerpt: '',
    fullContent: '',
    tagsInput: '',
  });

  const [formPt, setFormPt] = useState({
    title: '',
    excerpt: '',
    fullContent: '',
    tagsInput: '',
  });

  const [formEs, setFormEs] = useState({
    title: '',
    excerpt: '',
    fullContent: '',
    tagsInput: '',
  });

  // Shared metadata
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Humanitarian Action');
  const [heroImage, setHeroImage] = useState('');
  const [author, setAuthor] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(4);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  const openNewModal = () => {
    setIsNew(true);
    setEditingStory({} as any);
    setActiveLangTab('en');

    setFormEn({
      title: '',
      excerpt: '',
      fullContent: '<p>Draft here the complete editorial report or diplomatic dispatch...</p>',
      tagsInput: 'humanitarian, diplomacy, field',
    });

    setFormPt({
      title: '',
      excerpt: '',
      fullContent: '<p>Redija aqui o conteúdo completo desta reportagem institucional...</p>',
      tagsInput: 'humanitário, diplomacia, campo',
    });

    setFormEs({
      title: '',
      excerpt: '',
      fullContent: '<p>Redacte aquí el contenido completo de este informe editorial...</p>',
      tagsInput: 'humanitario, diplomacia, campo',
    });

    setSlug('');
    setCategory('Humanitarian Action');
    setHeroImage('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200');
    setAuthor(user?.name || 'ADMIR Diplomatic Dispatch');
    setReadTimeMinutes(4);
    setFeatured(false);
    setStatus('published');
  };

  const openEditModal = (story: NewsStory) => {
    setIsNew(false);
    setEditingStory(story);
    setActiveLangTab('en');

    const tr = story.translations || {};

    setFormEn({
      title: tr.en?.title || story.title || story.headline || '',
      excerpt: tr.en?.excerpt || story.excerpt || story.shortSummary || '',
      fullContent: tr.en?.fullContent || story.fullContent || story.fullText || '',
      tagsInput: (tr.en?.tags || story.tags || []).join(', '),
    });

    setFormPt({
      title: tr.pt?.title || (story as any).titlePt || '',
      excerpt: tr.pt?.excerpt || (story as any).excerptPt || '',
      fullContent: tr.pt?.fullContent || (story as any).fullContentPt || '',
      tagsInput: (tr.pt?.tags || []).join(', '),
    });

    setFormEs({
      title: tr.es?.title || (story as any).titleEs || '',
      excerpt: tr.es?.excerpt || (story as any).excerptEs || '',
      fullContent: tr.es?.fullContent || (story as any).fullContentEs || '',
      tagsInput: (tr.es?.tags || []).join(', '),
    });

    setSlug(story.slug || '');
    setCategory(story.category || 'Humanitarian Action');
    setHeroImage(story.heroImage || story.featuredPhoto || '');
    setAuthor(story.author || '');
    setReadTimeMinutes(story.readTimeMinutes || 4);
    setFeatured(story.featured || false);
    setStatus(story.status === 'draft' ? 'draft' : 'published');
  };

  const handleTitleChangeEn = (val: string) => {
    setFormEn((prev) => ({ ...prev, title: val }));
    if (isNew && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryTitle = formEn.title.trim() || formPt.title.trim() || formEs.title.trim();
    const primaryExcerpt = formEn.excerpt.trim() || formPt.excerpt.trim() || formEs.excerpt.trim();

    if (!primaryTitle || !primaryExcerpt) {
      error('Preencha os campos obrigatórios (título e resumo).');
      return;
    }

    const parseTags = (str: string) => str.split(',').map((t) => t.trim()).filter(Boolean);
    const tagsEn = parseTags(formEn.tagsInput);
    const tagsPt = parseTags(formPt.tagsInput);
    const tagsEs = parseTags(formEs.tagsInput);

    const translations = {
      en: {
        title: formEn.title.trim() || primaryTitle,
        excerpt: formEn.excerpt.trim() || primaryExcerpt,
        fullContent: formEn.fullContent.trim(),
        tags: tagsEn.length > 0 ? tagsEn : undefined,
      },
      pt: {
        title: formPt.title.trim() || formEn.title.trim() || primaryTitle,
        excerpt: formPt.excerpt.trim() || formEn.excerpt.trim() || primaryExcerpt,
        fullContent: formPt.fullContent.trim() || formEn.fullContent.trim(),
        tags: tagsPt.length > 0 ? tagsPt : tagsEn,
      },
      es: {
        title: formEs.title.trim() || formEn.title.trim() || primaryTitle,
        excerpt: formEs.excerpt.trim() || formEn.excerpt.trim() || primaryExcerpt,
        fullContent: formEs.fullContent.trim() || formEn.fullContent.trim(),
        tags: tagsEs.length > 0 ? tagsEs : tagsEn,
      },
    };

    const payload = {
      title: formEn.title.trim() || primaryTitle,
      slug: slug.trim() || primaryTitle.toLowerCase().replace(/\s+/g, '-'),
      category,
      excerpt: formEn.excerpt.trim() || primaryExcerpt,
      fullContent: formEn.fullContent.trim(),
      heroImage: heroImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200',
      author: author.trim() || 'ADMIR Press Office',
      readTimeMinutes: Number(readTimeMinutes) || 3,
      tags: tagsEn,
      featured,
      status,
      translations,
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.createStory(payload);
        success('Notícia Criada!', `A matéria "${primaryTitle}" foi publicada em múltiplos idiomas.`);
      } else if (editingStory) {
        await api.updateStory(editingStory.id, payload);
        success('Notícia Atualizada!', `As alterações foram salvas.`);
      }
      await refreshStories();
      setEditingStory(null);
    } catch (err: any) {
      error('Erro ao salvar notícia', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (story: NewsStory) => {
    if (!canCreate) return;
    try {
      await api.createStory({
        ...story,
        title: `${story.title} (Cópia)`,
        slug: `${story.slug}-copia-${Date.now()}`,
        status: 'draft',
      });
      success('Matéria Duplicada', 'Um rascunho duplicado foi criado com sucesso.');
      await refreshStories();
    } catch (err: any) {
      error('Erro ao duplicar', err.message);
    }
  };

  const handleDelete = async (story: NewsStory) => {
    if (!canDelete) {
      error('Acesso Negado', 'Você não tem permissão para excluir reportagens.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir "${story.title}"?`)) return;

    try {
      await api.deleteStory(story.id);
      success('Notícia Excluída', `A matéria foi removida do sistema.`);
      await refreshStories();
    } catch (err: any) {
      error('Erro ao excluir', err.message);
    }
  };

  const handleToggleStatus = async (story: NewsStory) => {
    if (!canToggle) {
      error('Acesso Negado', 'Permissão insuficiente para alterar status.');
      return;
    }
    const nextStatus = story.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateStory(story.id, { status: nextStatus });
      success('Status Atualizado', `Notícia definida como ${nextStatus.toUpperCase()}.`);
      await refreshStories();
    } catch (err: any) {
      error('Erro ao atualizar status', err.message);
    }
  };

  const filtered = stories.filter(
    (s) =>
      (s.title || s.headline || '').toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Notícias & Relatórios de Campo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Publicações editoriais, comunicados da chancelaria e artigos de impacto humanitário (suporte EN / PT / ES).
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openNewModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Matéria</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar notícias por título, setor ou autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
        />
      </div>

      {/* Stories Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Notícia / Manchete</th>
                <th className="py-3.5 px-4">Setor</th>
                <th className="py-3.5 px-4">Autor</th>
                <th className="py-3.5 px-4 text-center">Idiomas</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Destaque</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={story.heroImage || story.featuredPhoto}
                        alt={story.title}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                        }}
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-serif-heading">
                          {story.title}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {story.excerpt}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {story.category}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-800">{story.author}</span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        EN
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        PT
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        ES
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <button
                      type="button"
                      disabled={!canToggle}
                      onClick={() => handleToggleStatus(story)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        story.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {story.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </button>
                  </td>

                  <td className="py-4 px-4 text-center">
                    {story.featured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-600" /> Sim
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigateTo('story-detail', story.slug)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Ver no site público"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(story)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Duplicar como rascunho"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(story)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar matéria (EN/PT/ES)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(story)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Excluir matéria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Story Modal */}
      {editingStory && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  {isNew ? 'Redigir Nova Notícia' : 'Editar Notícia'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publique relatórios de campo nos três idiomas oficiais da ADMIR (English, Português, Español).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switch Tabs for Editor */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 pl-2">
                <Languages className="w-4 h-4 text-amber-600" />
                <span>Idioma do Texto:</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('en')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLangTab === 'en'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🇬🇧 English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('pt')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLangTab === 'pt'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🇧🇷 Português (PT)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('es')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeLangTab === 'es'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🇪🇸 Español (ES)
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Tab: English */}
              {activeLangTab === 'en' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                    <strong>English Version</strong> — International press release and diplomatic report.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Article Headline (EN) *</label>
                    <input
                      type="text"
                      required
                      value={formEn.title}
                      onChange={(e) => handleTitleChangeEn(e.target.value)}
                      placeholder="e.g. ADMIR Launches Emergency Assistance Mission"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lead / Excerpt (EN) *</label>
                    <textarea
                      required
                      rows={2}
                      value={formEn.excerpt}
                      onChange={(e) => setFormEn({ ...formEn, excerpt: e.target.value })}
                      placeholder="Brief overview summary shown in news lists..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Article Body (EN)</label>
                    <RichTextEditor
                      value={formEn.fullContent}
                      onChange={(v) => setFormEn({ ...formEn, fullContent: v })}
                      placeholder="Write the full report in English..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (EN, comma-separated)</label>
                    <input
                      type="text"
                      value={formEn.tagsInput}
                      onChange={(e) => setFormEn({ ...formEn, tagsInput: e.target.value })}
                      placeholder="peace, diplomacy, education"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Portuguese */}
              {activeLangTab === 'pt' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-xs text-blue-900">
                    <strong>Versão em Português</strong> — Reportagem editorial para a comunidade lusófona.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Matéria (PT)</label>
                    <input
                      type="text"
                      value={formPt.title}
                      onChange={(e) => setFormPt({ ...formPt, title: e.target.value })}
                      placeholder="Ex: ADMIR Lança Missão Emergencial de Apoio"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resumo / Lead Editorial (PT)</label>
                    <textarea
                      rows={2}
                      value={formPt.excerpt}
                      onChange={(e) => setFormPt({ ...formPt, excerpt: e.target.value })}
                      placeholder="Resumo exibido nas listas de notícias..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Corpo Completo da Matéria (PT)</label>
                    <RichTextEditor
                      value={formPt.fullContent}
                      onChange={(v) => setFormPt({ ...formPt, fullContent: v })}
                      placeholder="Redija o texto completo da matéria em português..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (PT, separadas por vírgula)</label>
                    <input
                      type="text"
                      value={formPt.tagsInput}
                      onChange={(e) => setFormPt({ ...formPt, tagsInput: e.target.value })}
                      placeholder="paz, diplomacia, educacao"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Spanish */}
              {activeLangTab === 'es' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                    <strong>Versión en Español</strong> — Reporte editorial para la comunidad hispanohablante.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Artículo (ES)</label>
                    <input
                      type="text"
                      value={formEs.title}
                      onChange={(e) => setFormEs({ ...formEs, title: e.target.value })}
                      placeholder="Ej: ADMIR Lanza Misión de Ayuda de Emergencia"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resumen / Lead Editorial (ES)</label>
                    <textarea
                      rows={2}
                      value={formEs.excerpt}
                      onChange={(e) => setFormEs({ ...formEs, excerpt: e.target.value })}
                      placeholder="Resumen visible en el listado de noticias..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cuerpo Completo del Artículo (ES)</label>
                    <RichTextEditor
                      value={formEs.fullContent}
                      onChange={(v) => setFormEs({ ...formEs, fullContent: v })}
                      placeholder="Redacte el texto completo del artículo en español..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (ES, separadas por comas)</label>
                    <input
                      type="text"
                      value={formEs.tagsInput}
                      onChange={(e) => setFormEs({ ...formEs, tagsInput: e.target.value })}
                      placeholder="paz, diplomacia, educacion"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Shared Metadata */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Slug de URL (Identificador) *</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Setor / Tema</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Humanitarian Action">Humanitarian Action</option>
                      <option value="Diplomacy">Diplomacy</option>
                      <option value="Education">Education</option>
                      <option value="Community Care">Community Care</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Autor / Chancelaria</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tempo de Leitura (minutos)</label>
                    <input
                      type="number"
                      min="1"
                      value={readTimeMinutes}
                      onChange={(e) => setReadTimeMinutes(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL da Fotografia Hero</label>
                  <input
                    type="url"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span>Destacar na Página Inicial</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span>Status:</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="published">Publicado</option>
                      <option value="draft">Rascunho</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Gravando...' : 'Salvar Notícia (Todos os Idiomas)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
