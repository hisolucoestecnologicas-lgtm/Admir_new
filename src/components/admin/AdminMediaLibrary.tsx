import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Check,
  AlertTriangle,
  X,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { MediaAsset } from '../../types';

export function AdminMediaLibrary() {
  const { hasPermission } = useAuth();
  const { programs, stories } = useSite();
  const { success, error, warning } = useToast();

  const canUpload = hasPermission('media.upload');
  const canDelete = hasPermission('media.delete');

  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMedia = async () => {
    try {
      const data = await api.getMedia();
      setMediaList(data);
    } catch (e: any) {
      error('Falha ao carregar mídia', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCopyUrl = (item: MediaAsset) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      success('URL Copiada!', 'Link da imagem copiado para sua área de transferência.');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      error('Preencha título e URL da imagem.');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.uploadMedia({
        title: title.trim(),
        url: url.trim(),
        altText: altText.trim() || title.trim(),
        tags,
        dimensions: '1600x900',
        fileSize: '450 KB',
      });

      success('Mídia Adicionada!', 'O ativo foi inserido na biblioteca institucional.');
      setShowUpload(false);
      setTitle('');
      setUrl('');
      setAltText('');
      setTagsInput('');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao adicionar', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: MediaAsset) => {
    if (!canDelete) {
      error('Acesso Negado', 'Permissão insuficiente para remover mídias.');
      return;
    }

    // Safety check: is this image referenced in programs or stories?
    const inPrograms = programs.some((p) => p.heroImage === item.url || (p.gallery && p.gallery.includes(item.url)));
    const inStories = stories.some((s) => s.heroImage === item.url);

    if (inPrograms || inStories) {
      const proceed = window.confirm(
        `AVISO DE SEGURANÇA:\nEsta imagem está atualmente em uso em programas ou notícias do site!\n\nTem certeza absoluta de que deseja excluí-la da biblioteca? Isso pode gerar links quebrados.`
      );
      if (!proceed) return;
    } else {
      if (!window.confirm(`Excluir o ativo "${item.title}" da biblioteca?`)) return;
    }

    try {
      await api.deleteMedia(item.id);
      success('Mídia Excluída', 'Ativo removido da biblioteca.');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao excluir mídia', err.message);
    }
  };

  const filtered = mediaList.filter(
    (m) =>
      (m.title || m.originalName || m.altText || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Biblioteca de Mídia & Fotografias
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Repositório de ativos visuais, fotografias de campo e logotipos com checagem de uso e cópia rápida de URL.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Foto / Mídia</span>
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filtrar por nome ou tag (ex: diplomacy, emergency)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
        />
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="relative h-44 bg-slate-100 overflow-hidden">
              <img
                src={item.url}
                alt={item.altText || item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(item)}
                  className="bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg text-xs backdrop-blur-sm transition-colors"
                  title="Copiar URL"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="bg-slate-900/80 hover:bg-rose-600 text-white p-1.5 rounded-lg text-xs backdrop-blur-sm transition-colors"
                    title="Excluir imagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2">
              <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.title}</h4>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{item.dimensions || 'HD'}</span>
                <span>{item.fileSize || 'Web'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold font-serif-heading text-slate-900">
                Inserir Ativo na Biblioteca
              </h3>
              <button type="button" onClick={() => setShowUpload(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Ativo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cerimônia de Acreditação em Genebra"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Pública da Imagem *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Texto Alternativo (Acessibilidade Alt)</label>
                <input
                  type="text"
                  placeholder="Descreva visualmente para leitores de tela"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="diplomacia, genebra, cúpula"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{submitting ? 'Inserindo...' : 'Salvar Ativo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
