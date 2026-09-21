import React, { useState, useEffect } from 'react';
import {
  Bot,
  Settings,
  HelpCircle,
  Inbox,
  BarChart2,
  Mail,
  MessageSquare,
  Send,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  Phone,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AssistantSettings, AssistantFaqItem, ContactRequest } from '../../types';

export function AdminAssistant() {
  const { hasPermission, isOwner } = useAuth();
  const { success, error, info } = useToast();

  const canView = isOwner || hasPermission('assistant.view');
  const canEdit = isOwner || hasPermission('assistant.edit');
  const canManageRequests = isOwner || hasPermission('assistant.manage_requests');

  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'faqs' | 'requests'>('analytics');
  const [loading, setLoading] = useState(true);

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);

  // Settings State
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // FAQs State
  const [faqs, setFaqs] = useState<AssistantFaqItem[]>([]);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('all');
  const [faqStatusFilter, setFaqStatusFilter] = useState('all');
  const [editingFaq, setEditingFaq] = useState<AssistantFaqItem | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  // FAQ Form State
  const [faqForm, setFaqForm] = useState({
    questionPt: '',
    answerPt: '',
    questionEn: '',
    answerEn: '',
    questionEs: '',
    answerEs: '',
    category: 'Geral',
    status: 'published' as 'draft' | 'published',
  });

  // Requests State
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (canView) {
        const [aData, sData] = await Promise.all([
          api.getAssistantAnalytics(),
          api.getAdminAssistantSettings(),
        ]);
        setAnalytics(aData);
        setSettings(sData);
      }

      if (canView) {
        const faqsData = await api.getAssistantFaqs(true); // include drafts
        setFaqs(faqsData);
      }

      if (canManageRequests) {
        const reqsData = await api.getContactRequests();
        setRequests(reqsData);
      }
    } catch (err: any) {
      error(err.message || 'Erro ao carregar dados do Assistente Virtual');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canView, canManageRequests]);

  if (!canView) {
    return (
      <div className="p-8 text-center text-slate-600 bg-white rounded-xl shadow-sm border border-slate-200">
        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Acesso Restrito ao Assistente Virtual</h2>
        <p className="text-sm mt-1">Você não possui permissão RBAC para visualizar ou gerenciar o Assistente Virtual.</p>
      </div>
    );
  }

  // --- SETTINGS HANDLERS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !canEdit) return;

    setSavingSettings(true);
    try {
      const updated = await api.updateAdminAssistantSettings(settings);
      setSettings(updated);
      success('Configurações do Assistente Virtual salvas com sucesso!');
    } catch (err: any) {
      error(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- FAQ HANDLERS ---
  const handleOpenNewFaqModal = () => {
    setEditingFaq(null);
    setFaqForm({
      questionPt: '',
      answerPt: '',
      questionEn: '',
      answerEn: '',
      questionEs: '',
      answerEs: '',
      category: 'Geral',
      status: 'published',
    });
    setIsFaqModalOpen(true);
  };

  const handleOpenEditFaqModal = (faq: AssistantFaqItem) => {
    setEditingFaq(faq);
    setFaqForm({
      questionPt: faq.questionPt || '',
      answerPt: faq.answerPt || '',
      questionEn: faq.questionEn || '',
      answerEn: faq.answerEn || '',
      questionEs: faq.questionEs || '',
      answerEs: faq.answerEs || '',
      category: faq.category || 'Geral',
      status: faq.status || 'published',
    });
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!faqForm.questionPt.trim() || !faqForm.answerPt.trim()) {
      error('Pergunta e resposta em Português são obrigatórias.');
      return;
    }

    try {
      if (editingFaq) {
        const updated = await api.updateAssistantFaq(editingFaq.id, faqForm);
        setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        success('FAQ atualizada com sucesso!');
      } else {
        const created = await api.createAssistantFaq(faqForm);
        setFaqs((prev) => [created, ...prev]);
        success('FAQ criada com sucesso!');
      }
      setIsFaqModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Erro ao salvar FAQ.');
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm('Tem certeza que deseja excluir esta FAQ?')) return;

    try {
      await api.deleteAssistantFaq(id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      info('FAQ excluída com sucesso.');
    } catch (err: any) {
      error(err.message || 'Erro ao excluir FAQ.');
    }
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter((f) => {
    if (faqCategoryFilter !== 'all' && f.category !== faqCategoryFilter) return false;
    if (faqStatusFilter !== 'all' && f.status !== faqStatusFilter) return false;
    return true;
  });

  // --- REQUEST HANDLERS ---
  const handleSelectRequest = (req: ContactRequest) => {
    setSelectedRequest(req);
    setRequestNotes(req.notes || '');
  };

  const handleUpdateRequestStatus = async (newStatus: 'novo' | 'em_atendimento' | 'respondido' | 'encerrado') => {
    if (!selectedRequest || !canManageRequests) return;

    setUpdatingRequest(true);
    try {
      const updated = await api.updateContactRequestStatus(selectedRequest.id, newStatus, requestNotes);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedRequest(updated);
      success(`Status do protocolo ${updated.protocol} atualizado para "${newStatus}".`);
    } catch (err: any) {
      error(err.message || 'Erro ao atualizar solicitação.');
    } finally {
      setUpdatingRequest(false);
    }
  };

  // Filter Requests
  const filteredRequests = requests.filter((r) => {
    if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      return (
        r.protocol.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assistente Virtual & Canais</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de inteligência artificial institucional, FAQs curadas e encaminhamento de chamados.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Visão Geral & Métricas
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configurações & Canais
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'faqs'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Base de Conhecimento (FAQs) ({faqs.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'requests'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Solicitações de Atendimento ({requests.length})
        </button>
      </div>

      {/* --- TAB 1: ANALYTICS --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Solicitações Registradas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{analytics?.totalRequests || 0}</h3>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                  {analytics?.newRequests || 0} pendentes de resposta
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">FAQs Curadas na IA</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{analytics?.publishedFaqs || 0}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {analytics?.draftFaqs || 0} em rascunho
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Taxa de Satisfação</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{analytics?.satisfactionRate || 100}%</h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  Baseada em {analytics?.totalFeedbacks || 0} avaliações reais
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Status do Assistente</p>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {settings?.enabled ? 'Ativo em Produção' : 'Inativo'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {settings?.emailChannel?.active ? 'Canal E-mail Ativo' : 'E-mail Pendente'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Visão Geral de Desempenho e Governança da IA</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O Assistente Virtual da ADMIR utiliza o modelo <strong>Gemini 3.8 Flash</strong> da Google com regramento estrito contra alucinações. As respostas são limitadas aos registros institucionais contidos na base de dados (Notícias, Programas, Embaixadores e FAQs). Caso o usuário questione sobre temas não documentados, o sistema ativa a opção de encaminhamento direto via e-mail.
            </p>
          </div>
        </div>
      )}

      {/* --- TAB 2: SETTINGS & CHANNELS --- */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-600" />
              Parâmetros do Assistente Virtual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ativar Assistente Virtual *</label>
                <select
                  disabled={!canEdit}
                  value={settings.enabled ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.value === 'true' })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  <option value="true">Ativo (Visível no site público)</option>
                  <option value="false">Desativado (Ocultar botão flutuante)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome de Exibição do Bot *</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.displayName || ''}
                  onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Permitir Escalonamento Humano *</label>
                <select
                  disabled={!canEdit}
                  value={settings.allowHumanEscalation ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, allowHumanEscalation: e.target.value === 'true' })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  <option value="true">Sim (Permitir envio de e-mail direto)</option>
                  <option value="false">Não (Apenas respostas automatizadas da IA)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700">Mensagens de Boas-Vindas (i18n)</label>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Português (PT-BR)</span>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.welcomeMessagePt || ''}
                  onChange={(e) => setSettings({ ...settings, welcomeMessagePt: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Inglês (EN)</span>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.welcomeMessageEn || ''}
                  onChange={(e) => setSettings({ ...settings, welcomeMessageEn: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Espanhol (ES)</span>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={settings.welcomeMessageEs || ''}
                  onChange={(e) => setSettings({ ...settings, welcomeMessageEs: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Multichannel Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600" />
              Canais de Atendimento Humanizado (Multicanal)
            </h3>

            {/* Email Channel */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-xs text-slate-900">Canal de E-mail (Ativo)</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    settings.emailChannel?.active && settings.emailChannel?.recipientEmail
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {settings.emailChannel?.active && settings.emailChannel?.recipientEmail
                    ? 'CONFIGURADO'
                    : 'CONFIGURAÇÃO PENDENTE'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status do Canal E-mail</label>
                  <select
                    disabled={!canEdit}
                    value={settings.emailChannel?.active ? 'true' : 'false'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailChannel: { ...settings.emailChannel, active: e.target.value === 'true' },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">E-mail do Destinatário *</label>
                  <input
                    type="email"
                    disabled={!canEdit}
                    value={settings.emailChannel?.recipientEmail || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailChannel: { ...settings.emailChannel, recipientEmail: e.target.value },
                      })
                    }
                    placeholder="contact@admiramerican.org"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome de Exibição da Equipe</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={settings.emailChannel?.displayName || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailChannel: { ...settings.emailChannel, displayName: e.target.value },
                      })
                    }
                    placeholder="Atendimento Diplomático ADMIR"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Channel (Future / Inactive Stub) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 opacity-75 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-xs text-slate-700">Canal WhatsApp (Futuro)</span>
                </div>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  INATIVO (EM DESENVOLVIMENTO)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                A arquitetura multicanal está preparada para receber integração com API do WhatsApp Business em fases futuras.
              </p>
            </div>

            {/* Telegram Channel (Future / Inactive Stub) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 opacity-75 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-xs text-slate-700">Canal Telegram (Futuro)</span>
                </div>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  INATIVO (EM DESENVOLVIMENTO)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                A arquitetura multicanal está preparada para receber integração com Bot API do Telegram em fases futuras.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings && <RefreshCw className="w-4 h-4 animate-spin" />}
                Salvar Alterações de Configuração
              </button>
            </div>
          )}
        </form>
      )}

      {/* --- TAB 3: FAQs BASE DE CONHECIMENTO --- */}
      {activeTab === 'faqs' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <select
                value={faqCategoryFilter}
                onChange={(e) => setFaqCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="all">Todas as Categorias</option>
                <option value="Institucional">Institucional</option>
                <option value="Programas">Programas</option>
                <option value="Corpo Diplomático">Corpo Diplomático</option>
                <option value="Geral">Geral</option>
              </select>

              <select
                value={faqStatusFilter}
                onChange={(e) => setFaqStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="all">Todos os Status</option>
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
              </select>
            </div>

            {canEdit && (
              <button
                onClick={handleOpenNewFaqModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nova FAQ
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Pergunta (PT)</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Última Atualização</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFaqs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Nenhuma FAQ encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredFaqs.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{f.questionPt}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{f.answerPt}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {f.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              f.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {f.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px]">
                          {new Date(f.updatedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditFaqModal(f)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                            title="Editar FAQ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteFaq(f.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                              title="Excluir FAQ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: SOLICITAÇÕES DE ATENDIMENTO --- */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Buscar por protocolo, nome, e-mail..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="all">Todos os Status</option>
                <option value="novo">Novo</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="respondido">Respondido</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Protocolo</th>
                      <th className="p-4">Solicitante</th>
                      <th className="p-4">Assunto</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          Nenhuma solicitação de atendimento encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => handleSelectRequest(r)}
                          className={`cursor-pointer transition-colors ${
                            selectedRequest?.id === r.id ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-slate-900">{r.protocol}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-800">{r.name}</p>
                            <p className="text-[11px] text-slate-500">{r.email}</p>
                          </td>
                          <td className="p-4 text-slate-700 font-semibold">{r.subject}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'novo'
                                  ? 'bg-rose-100 text-rose-800'
                                  : r.status === 'em_atendimento'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="text-amber-600 font-bold hover:underline text-xs">
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {selectedRequest ? (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Protocolo Oficial</span>
                    <h3 className="text-base font-black text-slate-900 font-mono">{selectedRequest.protocol}</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(selectedRequest.timestamp).toLocaleString('pt-BR')}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Solicitante:</span>
                  <p className="font-bold text-slate-900">{selectedRequest.name}</p>
                  <p className="text-slate-600">{selectedRequest.email}</p>
                  {selectedRequest.phone && <p className="text-slate-500">{selectedRequest.phone}</p>}
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Assunto:</span>
                  <p className="font-bold text-slate-800">{selectedRequest.subject}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Mensagem do Cidadão:</span>
                  <div className="bg-slate-50 p-3 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200">
                    {selectedRequest.message}
                  </div>
                </div>

                {selectedRequest.conversationSummary && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Histórico do Chat da IA Anexado:</span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-800">
                      {selectedRequest.conversationSummary}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <label className="block text-slate-700 font-bold">Atualizar Status de Atendimento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={updatingRequest}
                      onClick={() => handleUpdateRequestStatus('em_atendimento')}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px]"
                    >
                      Em Atendimento
                    </button>
                    <button
                      type="button"
                      disabled={updatingRequest}
                      onClick={() => handleUpdateRequestStatus('respondido')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                    >
                      Respondido
                    </button>
                    <button
                      type="button"
                      disabled={updatingRequest}
                      onClick={() => handleUpdateRequestStatus('encerrado')}
                      className="col-span-2 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px]"
                    >
                      Encerrar Chamado
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Notas Internas do Atendente</label>
                    <textarea
                      rows={3}
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      placeholder="Anotações privadas da equipe sobre este chamado..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Selecione uma solicitação da lista para visualizar os detalhes e atualizar o atendimento.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FAQ MODAL --- */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingFaq ? 'Editar Pergunta Frequente (FAQ)' : 'Cadastrar Nova Pergunta Frequente'}
              </h3>
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Categoria *</label>
                  <select
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Institucional">Institucional</option>
                    <option value="Programas">Programas</option>
                    <option value="Corpo Diplomático">Corpo Diplomático</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status Editorial *</label>
                  <select
                    value={faqForm.status}
                    onChange={(e) => setFaqForm({ ...faqForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="published">Publicado (Treina a IA)</option>
                    <option value="draft">Rascunho (Oculto da IA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pergunta em Português *</label>
                <input
                  type="text"
                  required
                  value={faqForm.questionPt}
                  onChange={(e) => setFaqForm({ ...faqForm, questionPt: e.target.value })}
                  placeholder="Ex: Qual o objetivo da ADMIR?"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Resposta em Português *</label>
                <textarea
                  required
                  rows={3}
                  value={faqForm.answerPt}
                  onChange={(e) => setFaqForm({ ...faqForm, answerPt: e.target.value })}
                  placeholder="Resposta oficial detalhada..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="font-bold text-slate-800 text-[11px] block">Traduções Opcionais (Inglês / Espanhol)</span>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1">Pergunta em Inglês (EN)</label>
                  <input
                    type="text"
                    value={faqForm.questionEn}
                    onChange={(e) => setFaqForm({ ...faqForm, questionEn: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1">Resposta em Inglês (EN)</label>
                  <textarea
                    rows={2}
                    value={faqForm.answerEn}
                    onChange={(e) => setFaqForm({ ...faqForm, answerEn: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1">Pergunta em Espanhol (ES)</label>
                  <input
                    type="text"
                    value={faqForm.questionEs}
                    onChange={(e) => setFaqForm({ ...faqForm, questionEs: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1">Resposta em Espanhol (ES)</label>
                  <textarea
                    rows={2}
                    value={faqForm.answerEs}
                    onChange={(e) => setFaqForm({ ...faqForm, answerEs: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
                >
                  Salvar FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
