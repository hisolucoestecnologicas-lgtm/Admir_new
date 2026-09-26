import React, { useState, useEffect } from 'react';
import {
  X,
  Globe2,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
  Shield,
  ShieldAlert,
  Search,
  Languages,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { CountryDocumentRule, DocumentCategory, RuleSourceType } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRulesChanged?: () => void;
}

export function CountryDocumentRulesModal({ isOpen, onClose, onRulesChanged }: Props) {
  const { success, error } = useToast();

  const [rules, setRules] = useState<CountryDocumentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIso, setFilterIso] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Rule Editor Submodal State
  const [editingRule, setEditingRule] = useState<CountryDocumentRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<'pt' | 'en' | 'es'>('pt');

  // Rule Form State
  const [formCountry, setFormCountry] = useState('');
  const [formCountryIso, setFormCountryIso] = useState('');
  const [formDocName, setFormDocName] = useState('');
  const [formDocCode, setFormDocCode] = useState('');
  const [formCategory, setFormCategory] = useState<DocumentCategory>('identification');
  const [formIsRequired, setFormIsRequired] = useState(true);
  const [formValidityRequired, setFormValidityRequired] = useState(false);
  const [formAllowedFormats, setFormAllowedFormats] = useState<string[]>([
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrderIndex, setFormOrderIndex] = useState(1);
  const [formDescription, setFormDescription] = useState('');
  const [formCandidateInstructions, setFormCandidateInstructions] = useState('');
  const [formSourceType, setFormSourceType] = useState<RuleSourceType>('UNKNOWN');
  const [formSourceReference, setFormSourceReference] = useState('');
  const [formAdministrativeNotes, setFormAdministrativeNotes] = useState('');

  // Translations Form State
  const [transPt, setTransPt] = useState({ name: '', description: '', candidateInstructions: '' });
  const [transEn, setTransEn] = useState({ name: '', description: '', candidateInstructions: '' });
  const [transEs, setTransEs] = useState({ name: '', description: '', candidateInstructions: '' });

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await api.getCountryDocumentRules('', true);
      setRules(data);
    } catch (err: any) {
      error('Erro ao Carregar Regras', err.message || 'Falha ao buscar regras documentais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Open editor for new rule
  const handleOpenNew = () => {
    setEditingRule(null);
    setIsCreating(true);
    setFormCountry(filterIso === 'DEFAULT' ? 'Padrão Internacional / Global' : filterIso === 'BR' ? 'Brasil' : filterIso === 'US' ? 'Estados Unidos' : '');
    setFormCountryIso(filterIso !== 'all' ? filterIso : 'DEFAULT');
    setFormDocName('');
    setFormDocCode('');
    setFormCategory('identification');
    setFormIsRequired(true);
    setFormValidityRequired(false);
    setFormAllowedFormats(['application/pdf', 'image/jpeg', 'image/png']);
    setFormIsActive(true);
    setFormOrderIndex(rules.length + 1);
    setFormDescription('');
    setFormCandidateInstructions('');
    setFormSourceType('UNKNOWN');
    setFormSourceReference('');
    setFormAdministrativeNotes('');
    setTransPt({ name: '', description: '', candidateInstructions: '' });
    setTransEn({ name: '', description: '', candidateInstructions: '' });
    setTransEs({ name: '', description: '', candidateInstructions: '' });
  };

  // Open editor to modify rule
  const handleOpenEdit = (rule: CountryDocumentRule) => {
    setEditingRule(rule);
    setIsCreating(false);
    setFormCountry(rule.country);
    setFormCountryIso(rule.countryIso);
    setFormDocName(rule.documentName);
    setFormDocCode(rule.documentCode);
    setFormCategory(rule.category);
    setFormIsRequired(rule.isRequired);
    setFormValidityRequired(Boolean(rule.validityRequired));
    setFormAllowedFormats(rule.allowedFormats || ['application/pdf', 'image/jpeg', 'image/png']);
    setFormIsActive(rule.isActive);
    setFormOrderIndex(rule.orderIndex || 1);
    setFormDescription(rule.description || '');
    setFormCandidateInstructions(rule.candidateInstructions || '');
    setFormSourceType(rule.sourceType || 'UNKNOWN');
    setFormSourceReference(rule.sourceReference || '');
    setFormAdministrativeNotes(rule.administrativeNotes || '');

    setTransPt({
      name: rule.translations?.pt?.name || rule.documentName,
      description: rule.translations?.pt?.description || rule.description || '',
      candidateInstructions: rule.translations?.pt?.candidateInstructions || rule.candidateInstructions || '',
    });
    setTransEn({
      name: rule.translations?.en?.name || '',
      description: rule.translations?.en?.description || '',
      candidateInstructions: rule.translations?.en?.candidateInstructions || '',
    });
    setTransEs({
      name: rule.translations?.es?.name || '',
      description: rule.translations?.es?.description || '',
      candidateInstructions: rule.translations?.es?.candidateInstructions || '',
    });
  };

  // Save rule (Create or Update)
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCountry.trim() || !formDocName.trim() || !formDocCode.trim()) {
      error('Campos Obrigatórios', 'País, nome do documento e código interno são obrigatórios.');
      return;
    }

    setSavingRule(true);
    try {
      const payload: Partial<CountryDocumentRule> = {
        country: formCountry.trim(),
        countryIso: (formCountryIso.trim() || 'DEFAULT').toUpperCase(),
        documentName: formDocName.trim(),
        documentCode: formDocCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: formCategory,
        isRequired: formIsRequired,
        validityRequired: formValidityRequired,
        allowedFormats: formAllowedFormats,
        isActive: formIsActive,
        orderIndex: Number(formOrderIndex) || 1,
        description: formDescription.trim(),
        candidateInstructions: formCandidateInstructions.trim(),
        sourceType: formSourceType,
        sourceReference: formSourceReference.trim() || undefined,
        administrativeNotes: formAdministrativeNotes.trim() || undefined,
        translations: {
          pt: {
            name: transPt.name.trim() || formDocName.trim(),
            description: transPt.description.trim() || formDescription.trim(),
            candidateInstructions: transPt.candidateInstructions.trim() || formCandidateInstructions.trim(),
          },
          en: {
            name: transEn.name.trim() || formDocName.trim(),
            description: transEn.description.trim() || formDescription.trim(),
            candidateInstructions: transEn.candidateInstructions.trim() || formCandidateInstructions.trim(),
          },
          es: {
            name: transEs.name.trim() || formDocName.trim(),
            description: transEs.description.trim() || formDescription.trim(),
            candidateInstructions: transEs.candidateInstructions.trim() || formCandidateInstructions.trim(),
          },
        },
      };

      if (isCreating) {
        await api.createCountryDocumentRule(payload);
        success('Regra Criada!', `Requisito "${payload.documentName}" adicionado com sucesso.`);
      } else if (editingRule) {
        await api.updateCountryDocumentRule(editingRule.id, payload);
        success('Regra Atualizada!', `Requisito "${payload.documentName}" atualizado com sucesso.`);
      }

      setEditingRule(null);
      setIsCreating(false);
      await loadRules();
      if (onRulesChanged) onRulesChanged();
    } catch (err: any) {
      error('Erro ao Salvar', err.message || 'Falha ao gravar regra documental.');
    } finally {
      setSavingRule(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (rule: CountryDocumentRule) => {
    try {
      await api.updateCountryDocumentRule(rule.id, { isActive: !rule.isActive });
      success(
        rule.isActive ? 'Regra Desativada' : 'Regra Ativada',
        `A regra "${rule.documentName}" agora está ${!rule.isActive ? 'ativa' : 'inativa'}.`
      );
      await loadRules();
      if (onRulesChanged) onRulesChanged();
    } catch (err: any) {
      error('Erro ao Atualizar', err.message);
    }
  };

  // Delete rule
  const handleDeleteRule = async (rule: CountryDocumentRule) => {
    if (!window.confirm(`Tem certeza que deseja excluir a regra "${rule.documentName}" para ${rule.country}?`)) {
      return;
    }
    try {
      await api.deleteCountryDocumentRule(rule.id);
      success('Regra Excluída', `O requisito documental foi removido.`);
      await loadRules();
      if (onRulesChanged) onRulesChanged();
    } catch (err: any) {
      error('Erro ao Excluir', err.message);
    }
  };

  // Unique country ISOs present
  const availableIsos = Array.from(new Set(rules.map((r) => r.countryIso.toUpperCase())));

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    const matchesIso = filterIso === 'all' || r.countryIso.toUpperCase() === filterIso.toUpperCase();
    const matchesSource = filterSource === 'all' || (r.sourceType || 'UNKNOWN') === filterSource;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      r.documentName.toLowerCase().includes(query) ||
      r.country.toLowerCase().includes(query) ||
      r.documentCode.toLowerCase().includes(query) ||
      (r.sourceReference && r.sourceReference.toLowerCase().includes(query));
    return matchesIso && matchesSource && matchesSearch;
  });

  const renderSourceBadge = (sourceType?: RuleSourceType, sourceReference?: string) => {
    const type = sourceType || 'UNKNOWN';
    const config: Record<RuleSourceType, { label: string; bg: string; text: string; border: string; title: string }> = {
      DEMO: { label: '[DEMO] Protótipo', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', title: 'Regra de demonstração técnica para homologação de arquitetura' },
      TEST: { label: '[TESTE] QA', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', title: 'Regra cadastrada para suíte de testes de software' },
      ADMIR_INTERNAL: { label: '[ADMIR] Oficial', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', title: 'Deliberação interna da diretoria da ADMIR' },
      ADMIN_DECISION: { label: '[PORTARIA] Decisão', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', title: 'Decisão administrativa ou portaria formal' },
      LEGAL_REFERENCE: { label: '[NORMA] Ref. Legal', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', title: 'Referência legal com citação e respaldo jurídico' },
      IMPORTED: { label: '[IMPORTADO]', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', title: 'Importado de cadastro/sistema prévio' },
      UNKNOWN: { label: '[INCERTO]', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', title: 'Origem incerta / sem ata administrativa' },
    };
    const c = config[type] || config.UNKNOWN;
    return (
      <div className="space-y-0.5">
        <span
          title={c.title}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${c.bg} ${c.text} ${c.border}`}
        >
          {c.label}
        </span>
        {sourceReference && (
          <p className="text-[9px] text-slate-500 font-mono truncate max-w-[130px]" title={sourceReference}>
            ref: {sourceReference}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  ADMIR — Compliance Internacional
                </span>
                <span className="text-[10px] text-slate-400">Total: {rules.length} regras</span>
              </div>
              <h2 className="text-xl font-bold font-serif-heading text-white mt-1">
                Regras Documentais de Embaixadores por País
              </h2>
              <p className="text-xs text-slate-300">
                Gerencie exigências diplomáticas personalizadas conforme o país de atuação, com fallback global transparente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNew}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Regra</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Institutional Compliance Disclaimer Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 flex items-start gap-3 shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                Aviso Institucional de Procedência & Limite Normativo
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 font-bold">
                Anti-Invenção de Leis
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              As regras documentais definem os requisitos administrativos da ADMIR para instrução cadastral de Embaixadores. A obrigatoriedade restringe-se ao processo interno da missão e <strong>não representa imposição legal de Estado soberano</strong> sem ato normativo com referência formal. Regras assinaladas como <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">[DEMO]</span> ou <span className="font-mono font-bold text-blue-800 bg-blue-100 px-1 py-0.2 rounded border border-blue-300">[TESTE]</span> são protótipos de desenvolvimento técnico para testes de integridade e homologação.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">País:</span>
            <button
              type="button"
              onClick={() => setFilterIso('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterIso === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos ({rules.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterIso('DEFAULT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                filterIso === 'DEFAULT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Globe2 className="w-3 h-3" />
              Global / Fallback ({rules.filter((r) => r.countryIso === 'DEFAULT').length})
            </button>
            {availableIsos
              .filter((iso) => iso !== 'DEFAULT')
              .map((iso) => {
                const count = rules.filter((r) => r.countryIso.toUpperCase() === iso).length;
                const countrySample = rules.find((r) => r.countryIso.toUpperCase() === iso)?.country || iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setFilterIso(iso)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      filterIso === iso
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{countrySample}</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                      {iso} ({count})
                    </span>
                  </button>
                );
              })}

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

            <span className="text-xs font-semibold text-slate-600">Origem:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">Todas as Origens</option>
              <option value="DEMO">Demo / Scaffolding</option>
              <option value="TEST">Teste / QA</option>
              <option value="ADMIR_INTERNAL">ADMIR Oficial</option>
              <option value="ADMIN_DECISION">Decisão Administrativa</option>
              <option value="LEGAL_REFERENCE">Referência Legal</option>
              <option value="UNKNOWN">Origem Incerta</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar regra ou código..."
              className="w-full bg-white border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Carregando catálogo de regras documentais...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-3">
              <Shield className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Nenhuma regra documental encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não existem regras cadastradas para o filtro selecionado. Você pode criar novas regras clicando em &quot;Nova Regra&quot;.
              </p>
              <button
                type="button"
                onClick={handleOpenNew}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Regra Documental</span>
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ordem</th>
                    <th className="py-3 px-4">País / Escopo</th>
                    <th className="py-3 px-4">Documento Exigido</th>
                    <th className="py-3 px-4">Procedência / Fonte</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Obrigatoriedade (ADMIR)</th>
                    <th className="py-3 px-4">Formatos</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">#{rule.orderIndex}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              rule.countryIso === 'DEFAULT'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {rule.countryIso}
                          </span>
                          <span className="font-semibold text-slate-900">{rule.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{rule.documentName}</p>
                          <p className="text-[10px] font-mono text-slate-500">código: {rule.documentCode}</p>
                          {rule.candidateInstructions && (
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{rule.candidateInstructions}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {renderSourceBadge(rule.sourceType, rule.sourceReference)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {rule.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rule.isRequired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Check className="w-3 h-3" /> Obrigatório (ADMIR)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Opcional
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-600">
                        {rule.allowedFormats?.map((f) => f.split('/').pop()?.toUpperCase()).join(', ') || 'PDF, JPG'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {rule.isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Editar Regra"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule)}
                            className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Excluir Regra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submodal for Create / Edit Rule */}
        {(isCreating || editingRule) && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
              <form onSubmit={handleSaveRule}>
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-base font-bold font-serif-heading text-white">
                        {isCreating ? 'Cadastrar Nova Regra Documental' : `Editar Regra: ${editingRule?.documentName}`}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Defina país, código do documento, requisitos e instruções diplomáticas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRule(null);
                      setIsCreating(false);
                    }}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Language Selector for Translations */}
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-amber-600" /> Idioma do Formulário:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveLangTab('pt')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          activeLangTab === 'pt' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Português (BR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLangTab('en')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          activeLangTab === 'en' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        English (EN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLangTab('es')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          activeLangTab === 'es' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Español (ES)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">País de Atuação</label>
                      <input
                        type="text"
                        value={formCountry}
                        onChange={(e) => setFormCountry(e.target.value)}
                        placeholder="Ex: Brasil, United States, ou Padrão Internacional"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Código ISO</label>
                      <input
                        type="text"
                        value={formCountryIso}
                        onChange={(e) => setFormCountryIso(e.target.value.toUpperCase())}
                        placeholder="Ex: BR, US, DEFAULT"
                        maxLength={10}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Nome Oficial do Documento</label>
                      <input
                        type="text"
                        value={formDocName}
                        onChange={(e) => {
                          setFormDocName(e.target.value);
                          if (activeLangTab === 'pt') setTransPt((prev) => ({ ...prev, name: e.target.value }));
                        }}
                        placeholder="Ex: Cópia do Passaporte ou RG"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Código Técnico / Identificador</label>
                      <input
                        type="text"
                        value={formDocCode}
                        onChange={(e) => setFormDocCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        placeholder="Ex: passport, cpf, national_id, photo"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Categoria</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as DocumentCategory)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="identification">Identificação Oficial</option>
                        <option value="residence">Comprovante Residencial</option>
                        <option value="professional">Histórico / Profissional</option>
                        <option value="legal">Legal / Certidões</option>
                        <option value="health">Saúde / Tipagem</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Ordem de Exibição</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={formOrderIndex}
                        onChange={(e) => setFormOrderIndex(Number(e.target.value) || 1)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col justify-end space-y-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formIsRequired}
                          onChange={(e) => setFormIsRequired(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>Obrigatório no Fluxo ADMIR</span>
                      </label>
                      <span className="text-[10px] text-slate-500 -mt-1 pl-6">
                        Exigido no checklist interno da missão
                      </span>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>Regra Ativa</span>
                      </label>
                    </div>
                  </div>

                  {/* Provenance & Source Justification */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Procedência & Justificativa Institucional (Não Invenção de Exigências)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Classificação da Origem</label>
                        <select
                          value={formSourceType}
                          onChange={(e) => setFormSourceType(e.target.value as RuleSourceType)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="ADMIR_INTERNAL">ADMIR_INTERNAL — Deliberação Interna da ADMIR</option>
                          <option value="ADMIN_DECISION">ADMIN_DECISION — Decisão Administrativa / Portaria</option>
                          <option value="LEGAL_REFERENCE">LEGAL_REFERENCE — Referência Legal Externa (comprovada)</option>
                          <option value="IMPORTED">IMPORTED — Importado de Sistema Legado</option>
                          <option value="DEMO">DEMO — Demonstração Técnica (Homologação / Scaffolding)</option>
                          <option value="TEST">TEST — Regra de Teste / QA</option>
                          <option value="UNKNOWN">UNKNOWN — Origem Incerta / Não Homologada</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Ato Normativo / Referência Formal (Opcional)
                        </label>
                        <input
                          type="text"
                          value={formSourceReference}
                          onChange={(e) => setFormSourceReference(e.target.value)}
                          placeholder="Ex: Resolução Executiva 2026/01, Ata nº 14"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Notas Administrativas / Justificativa Interna
                      </label>
                      <textarea
                        rows={2}
                        value={formAdministrativeNotes}
                        onChange={(e) => setFormAdministrativeNotes(e.target.value)}
                        placeholder="Descreva a finalidade administrativa ou base institucional para este requisito..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Instruções Claras para o Candidato (Exibidas no Onboarding)
                    </label>
                    <textarea
                      rows={2}
                      value={
                        activeLangTab === 'pt'
                          ? transPt.candidateInstructions || formCandidateInstructions
                          : activeLangTab === 'en'
                          ? transEn.candidateInstructions
                          : transEs.candidateInstructions
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeLangTab === 'pt') {
                          setFormCandidateInstructions(val);
                          setTransPt((prev) => ({ ...prev, candidateInstructions: val }));
                        } else if (activeLangTab === 'en') {
                          setTransEn((prev) => ({ ...prev, candidateInstructions: val }));
                        } else {
                          setTransEs((prev) => ({ ...prev, candidateInstructions: val }));
                        }
                      }}
                      placeholder="Ex: Envie cópia colorida nítida do documento oficial válido..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Descrição / Finalidade Diplomática Interna
                    </label>
                    <textarea
                      rows={2}
                      value={
                        activeLangTab === 'pt'
                          ? transPt.description || formDescription
                          : activeLangTab === 'en'
                          ? transEn.description
                          : transEs.description
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeLangTab === 'pt') {
                          setFormDescription(val);
                          setTransPt((prev) => ({ ...prev, description: val }));
                        } else if (activeLangTab === 'en') {
                          setTransEn((prev) => ({ ...prev, description: val }));
                        } else {
                          setTransEs((prev) => ({ ...prev, description: val }));
                        }
                      }}
                      placeholder="Descrição técnica da regra e base de conferência..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRule(null);
                      setIsCreating(false);
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingRule ? 'Gravando...' : 'Salvar Regra'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
