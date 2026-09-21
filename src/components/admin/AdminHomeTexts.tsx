import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Image as ImageIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';

export function AdminHomeTexts() {
  const { settings, updateLocalSettings, loading: siteLoading } = useSite();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canEdit = hasPermission('home.edit_texts');

  const [formData, setFormData] = useState({
    hero: { ...settings.hero },
    impactCounters: { ...settings.impactCounters },
    aboutSection: { ...settings.aboutSection },
    impactStats: { ...settings.impactStats },
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
  });
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (settings && settings.hero) {
      setFormData({
        hero: { ...settings.hero },
        impactCounters: { ...settings.impactCounters },
        aboutSection: { ...settings.aboutSection },
        impactStats: { ...settings.impactStats },
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
      });
      setDataLoaded(true);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !dataLoaded) {
      error('Operação bloqueada', 'Os dados ainda estão carregando ou você não possui permissão.');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateSettings(formData);
      updateLocalSettings(updated);
      success('Textos Atualizados!', 'As alterações foram salvas e já estão visíveis no site público.');
    } catch (err: any) {
      error('Falha ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Gerenciamento de Textos da Homepage
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atualize instantaneamente todos os cabeçalhos, chamadas para ação e números de impacto exibidos na página principal.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Modo Somente Leitura: Seu perfil de permissões permite apenas visualizar os textos.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. HERO SECTION */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif-heading text-slate-900">
              1. Hero Principal (Cabeçalho de Impacto)
            </h2>
            <p className="text-xs text-slate-500">Texto principal de abertura do website institucional.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Selo / Rótulo Superior (Eyebrow)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.hero.eyebrow}
                onChange={(e) =>
                  setFormData({ ...formData, hero: { ...formData.hero, eyebrow: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título Linha 1
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.hero.titleLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, hero: { ...formData.hero, titleLine1: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título Linha 2 (Destaque Dourado)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.hero.titleLine2}
                  onChange={(e) =>
                    setFormData({ ...formData, hero: { ...formData.hero, titleLine2: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parágrafo de Contexto
              </label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={formData.hero.paragraph}
                onChange={(e) =>
                  setFormData({ ...formData, hero: { ...formData.hero, paragraph: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Texto do Botão Principal (CTA 1)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.hero.primaryCtaText}
                  onChange={(e) =>
                    setFormData({ ...formData, hero: { ...formData.hero, primaryCtaText: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Texto do Botão Secundário (CTA 2)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.hero.secondaryCtaText}
                  onChange={(e) =>
                    setFormData({ ...formData, hero: { ...formData.hero, secondaryCtaText: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                URL da Fotografia de Fundo (Hero Background)
              </label>
              <input
                type="url"
                disabled={!canEdit}
                value={formData.hero.backgroundImage}
                onChange={(e) =>
                  setFormData({ ...formData, hero: { ...formData.hero, backgroundImage: e.target.value } })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 2. IMPACT COUNTERS */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif-heading text-slate-900">
              2. Faixa de Contadores de Impacto
            </h2>
            <p className="text-xs text-slate-500">Estatísticas em destaque logo abaixo do Hero.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Contador 1</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Valor (ex: 120+)"
                value={formData.impactCounters.counter1Value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter1Value: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Rótulo (ex: Comunidades Atendidas)"
                value={formData.impactCounters.counter1Label}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter1Label: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Contador 2</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Valor (ex: 48,000+)"
                value={formData.impactCounters.counter2Value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter2Value: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Rótulo (ex: Ações Humanitárias)"
                value={formData.impactCounters.counter2Label}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter2Label: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Contador 3</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Valor (ex: 1,500+)"
                value={formData.impactCounters.counter3Value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter3Value: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Rótulo (ex: Voluntários Engajados)"
                value={formData.impactCounters.counter3Label}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impactCounters: { ...formData.impactCounters, counter3Label: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>

        {/* 3. ABOUT ADMIR SECTION */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif-heading text-slate-900">
              3. Seção "Sobre a ADMIR"
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Título da Seção
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.aboutSection.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aboutSection: { ...formData.aboutSection, title: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Frase de Destaque (Citação de Impacto)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.aboutSection.highlightSentence}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aboutSection: { ...formData.aboutSection, highlightSentence: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white font-medium text-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Parágrafo Completo
              </label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={formData.aboutSection.bodyParagraph}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aboutSection: { ...formData.aboutSection, bodyParagraph: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
              />
            </div>
          </div>
        </div>

        {/* 4. INSTITUTIONAL CONTACT */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif-heading text-slate-900">
              4. Dados de Contato e Chancelaria Oficial
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Endereço da Sede
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Telefone Oficial
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                disabled={!canEdit}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-xl text-sm flex items-center gap-2 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Gravando dados...' : 'Salvar Todos os Textos'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
