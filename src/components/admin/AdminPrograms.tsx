import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  Languages,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Program, Language } from '../../types';
import { RichTextEditor } from '../common/RichTextEditor';

export function AdminPrograms() {
  const { programs, refreshPrograms, navigateTo, language } = useSite();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canCreate = hasPermission('programs.create');
  const canEdit = hasPermission('programs.edit');
  const canDelete = hasPermission('programs.delete');
  const canToggle = hasPermission('programs.publish');

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab for active language in the editor modal
  const [activeLangTab, setActiveLangTab] = useState<Language>('en');

  // Form states per language
  const [formEn, setFormEn] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    objectivesText: '',
  });

  const [formPt, setFormPt] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    objectivesText: '',
  });

  const [formEs, setFormEs] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    objectivesText: '',
  });

  // Global fields (shared)
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Peace & Diplomacy');
  const [heroImage, setHeroImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  const openNewModal = () => {
    setIsNew(true);
    setEditingProgram({} as any);
    setActiveLangTab('en');

    setFormEn({
      title: '',
      shortDescription: '',
      fullDescription: '<p>Describe in detail the mission and impact of this humanitarian program...</p>',
      objectivesText: 'Establish humanitarian support corridors\nTrain frontline volunteers',
    });

    setFormPt({
      title: '',
      shortDescription: '',
      fullDescription: '<p>Descreva detalhadamente a missão deste programa humanitário...</p>',
      objectivesText: 'Estabelecer protocolos de apoio à comunidade\nCapacitar voluntários de linha de frente',
    });

    setFormEs({
      title: '',
      shortDescription: '',
      fullDescription: '<p>Describa en detalle la misión y el alcance de este programa humanitario...</p>',
      objectivesText: 'Establecer protocolos de apoyo a la comunidad\nCapacitar voluntarios de primera línea',
    });

    setSlug('');
    setCategory('Peace & Diplomacy');
    setHeroImage('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200');
    setFeatured(false);
    setStatus('published');
  };

  const openEditModal = (prog: Program) => {
    setIsNew(false);
    setEditingProgram(prog);
    setActiveLangTab('en');

    const tr = prog.translations || {};

    setFormEn({
      title: tr.en?.title || prog.title || '',
      shortDescription: tr.en?.shortDescription || prog.shortDescription || '',
      fullDescription: tr.en?.fullDescription || prog.fullDescription || '',
      objectivesText: ((tr.en?.objectives || prog.objectives || []).join('\n')),
    });

    setFormPt({
      title: tr.pt?.title || ((prog as any).titlePt || ''),
      shortDescription: tr.pt?.shortDescription || ((prog as any).shortDescriptionPt || ''),
      fullDescription: tr.pt?.fullDescription || ((prog as any).fullDescriptionPt || ''),
      objectivesText: ((tr.pt?.objectives || []).join('\n')),
    });

    setFormEs({
      title: tr.es?.title || ((prog as any).titleEs || ''),
      shortDescription: tr.es?.shortDescription || ((prog as any).shortDescriptionEs || ''),
      fullDescription: tr.es?.fullDescription || ((prog as any).fullDescriptionEs || ''),
      objectivesText: ((tr.es?.objectives || []).join('\n')),
    });

    setSlug(prog.slug);
    setCategory(prog.category);
    setHeroImage(prog.heroImage || prog.featuredImage || '');
    setFeatured(prog.featured || false);
    setStatus(prog.status === 'draft' ? 'draft' : 'published');
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
    const primaryDesc = formEn.shortDescription.trim() || formPt.shortDescription.trim() || formEs.shortDescription.trim();

    if (!primaryTitle || !primaryDesc) {
      error('Por favor preencha o título e o resumo do programa (em pelo menos um idioma).');
      return;
    }

    const objEn = formEn.objectivesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const objPt = formPt.objectivesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const objEs = formEs.objectivesText.split('\n').map((s) => s.trim()).filter(Boolean);

    const translations = {
      en: {
        title: formEn.title.trim() || primaryTitle,
        shortDescription: formEn.shortDescription.trim() || primaryDesc,
        fullDescription: formEn.fullDescription.trim(),
        objectives: objEn.length > 0 ? objEn : undefined,
      },
      pt: {
        title: formPt.title.trim() || formEn.title.trim() || primaryTitle,
        shortDescription: formPt.shortDescription.trim() || formEn.shortDescription.trim() || primaryDesc,
        fullDescription: formPt.fullDescription.trim() || formEn.fullDescription.trim(),
        objectives: objPt.length > 0 ? objPt : objEn,
      },
      es: {
        title: formEs.title.trim() || formEn.title.trim() || primaryTitle,
        shortDescription: formEs.shortDescription.trim() || formEn.shortDescription.trim() || primaryDesc,
        fullDescription: formEs.fullDescription.trim() || formEn.fullDescription.trim(),
        objectives: objEs.length > 0 ? objEs : objEn,
      },
    };

    const payload = {
      title: formEn.title.trim() || primaryTitle,
      slug: slug.trim() || primaryTitle.toLowerCase().replace(/\s+/g, '-'),
      category,
      shortDescription: formEn.shortDescription.trim() || primaryDesc,
      fullDescription: formEn.fullDescription.trim(),
      heroImage: heroImage.trim() || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200',
      objectives: objEn,
      featured,
      status,
      translations,
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.createProgram(payload);
        success('Programa Criado!', `O programa "${primaryTitle}" foi registrado com sucesso em múltiplos idiomas.`);
      } else if (editingProgram) {
        await api.updateProgram(editingProgram.id, payload);
        success('Programa Atualizado!', `As alterações em "${primaryTitle}" foram gravadas.`);
      }
      await refreshPrograms();
      setEditingProgram(null);
    } catch (err: any) {
      error('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prog: Program) => {
    if (!canDelete) {
      error('Acesso Negado', 'Você não tem permissão para excluir programas.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o programa "${prog.title}"? Esta ação será registrada no histórico de auditoria.`)) {
      return;
    }

    try {
      await api.deleteProgram(prog.id);
      success('Programa Removido', `O programa "${prog.title}" foi excluído.`);
      await refreshPrograms();
    } catch (err: any) {
      error('Erro ao excluir', err.message);
    }
  };

  const handleToggleStatus = async (prog: Program) => {
    if (!canToggle) {
      error('Acesso Negado', 'Você não tem permissão para alterar o status de programas.');
      return;
    }
    const nextStatus = prog.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateProgram(prog.id, { status: nextStatus });
      success('Status Atualizado', `Programa marcado como ${nextStatus.toUpperCase()}.`);
      await refreshPrograms();
    } catch (err: any) {
      error('Erro ao atualizar status', err.message);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (!canEdit) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= programs.length) return;

    const newOrder = [...programs];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    try {
      await api.reorderPrograms(newOrder.map((p) => p.id));
      await refreshPrograms();
    } catch (e: any) {
      error('Erro ao reordenar', e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Gerenciamento de Programas Humanitários
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie, edite e organize os programas diplomáticos e frentes de atuação humanitária (suporte EN / PT / ES).
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openNewModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Programa</span>
          </button>
        )}
      </div>

      {/* Programs List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Ordem</th>
                <th className="py-3.5 px-4">Programa / Título</th>
                <th className="py-3.5 px-4">Setor</th>
                <th className="py-3.5 px-4 text-center">Idiomas</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Destaque</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((prog, index) => (
                <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0 || !canEdit}
                        onClick={() => handleReorder(index, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{index + 1}</span>
                      <button
                        type="button"
                        disabled={index === programs.length - 1 || !canEdit}
                        onClick={() => handleReorder(index, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={prog.heroImage || prog.featuredImage}
                        alt={prog.title}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-2.jpg';
                        }}
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-serif-heading">
                          {prog.title}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {prog.shortDescription}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {prog.category}
                    </span>
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
                      onClick={() => handleToggleStatus(prog)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        prog.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {prog.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </button>
                  </td>

                  <td className="py-4 px-4 text-center">
                    {prog.featured ? (
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
                        onClick={() => navigateTo('program-detail', prog.slug)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Ver no site público"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(prog)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar programa (EN/PT/ES)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(prog)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Excluir programa"
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

      {/* Program Add / Edit Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  {isNew ? 'Criar Novo Programa' : 'Editar Programa'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha as diretrizes nos três idiomas oficiais da ADMIR (English, Português, Español).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switch Tabs for Editor */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 pl-2">
                <Languages className="w-4 h-4 text-amber-600" />
                <span>Idioma de Edição:</span>
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
                    <strong>English Version</strong> — Main baseline for international diplomatic dispatches.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Program Title (EN) *</label>
                    <input
                      type="text"
                      required
                      value={formEn.title}
                      onChange={(e) => handleTitleChangeEn(e.target.value)}
                      placeholder="e.g. Humanitarian Peace Ambassador Corps"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description / Card Summary (EN) *</label>
                    <textarea
                      required
                      rows={2}
                      value={formEn.shortDescription}
                      onChange={(e) => setFormEn({ ...formEn, shortDescription: e.target.value })}
                      placeholder="Brief overview visible on program cards..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Mission Description (EN)</label>
                    <RichTextEditor
                      value={formEn.fullDescription}
                      onChange={(v) => setFormEn({ ...formEn, fullDescription: v })}
                      placeholder="Detail the complete operational structure..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Strategic Objectives (EN, one per line)</label>
                    <textarea
                      rows={3}
                      value={formEn.objectivesText}
                      onChange={(e) => setFormEn({ ...formEn, objectivesText: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      placeholder="Objective 1&#10;Objective 2&#10;Objective 3"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Portuguese */}
              {activeLangTab === 'pt' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-xs text-blue-900">
                    <strong>Versão em Português</strong> — Exibida para usuários do Brasil e lusófonos.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Programa (PT)</label>
                    <input
                      type="text"
                      value={formPt.title}
                      onChange={(e) => setFormPt({ ...formPt, title: e.target.value })}
                      placeholder="Ex: Corpo de Embaixadores da Paz Humanitária"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resumo Curto (PT)</label>
                    <textarea
                      rows={2}
                      value={formPt.shortDescription}
                      onChange={(e) => setFormPt({ ...formPt, shortDescription: e.target.value })}
                      placeholder="Resumo exibido nos cards..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Completa da Operação (PT)</label>
                    <RichTextEditor
                      value={formPt.fullDescription}
                      onChange={(v) => setFormPt({ ...formPt, fullDescription: v })}
                      placeholder="Elabore os objetivos e a estrutura deste programa..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos Principais (PT, um por linha)</label>
                    <textarea
                      rows={3}
                      value={formPt.objectivesText}
                      onChange={(e) => setFormPt({ ...formPt, objectivesText: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      placeholder="Objetivo 1&#10;Objetivo 2&#10;Objetivo 3"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Spanish */}
              {activeLangTab === 'es' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                    <strong>Versión en Español</strong> — Mostrada para usuarios de América Latina y España.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Programa (ES)</label>
                    <input
                      type="text"
                      value={formEs.title}
                      onChange={(e) => setFormEs({ ...formEs, title: e.target.value })}
                      placeholder="Ej: Cuerpo de Embajadores de la Paz Humanitaria"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resumen Corto (ES)</label>
                    <textarea
                      rows={2}
                      value={formEs.shortDescription}
                      onChange={(e) => setFormEs({ ...formEs, shortDescription: e.target.value })}
                      placeholder="Resumen visible en las tarjetas..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción Completa (ES)</label>
                    <RichTextEditor
                      value={formEs.fullDescription}
                      onChange={(v) => setFormEs({ ...formEs, fullDescription: v })}
                      placeholder="Describa la estructura y metas de este programa..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos Estratégicos (ES, uno por línea)</label>
                    <textarea
                      rows={3}
                      value={formEs.objectivesText}
                      onChange={(e) => setFormEs({ ...formEs, objectivesText: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      placeholder="Objetivo 1&#10;Objetivo 2&#10;Objetivo 3"
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
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria / Setor</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Peace & Diplomacy">Peace & Diplomacy</option>
                      <option value="Education & Youth">Education & Youth</option>
                      <option value="Social Care">Social Care</option>
                      <option value="Disaster Relief">Disaster Relief</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL da Imagem Hero</label>
                  <input
                    type="url"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                  onClick={() => setEditingProgram(null)}
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
                  <span>{saving ? 'Gravando...' : 'Salvar Programa (Todos os Idiomas)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
