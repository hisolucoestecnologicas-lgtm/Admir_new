import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';
import {
  MaintenanceSettings,
  MaintenanceConfig,
  MaintenancePageRegistryItem,
} from '../../types';
import {
  MAINTENANCE_THEMES,
  MAINTENANCE_PAGES_REGISTRY,
  DEFAULT_MAINTENANCE_CONFIG,
  getMaintenanceThemeById,
} from '../../data/maintenanceThemes';
import { MaintenanceDisplay } from '../maintenance/MaintenanceDisplay';
import { RichTextEditor } from '../common/RichTextEditor';
import {
  Wrench,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Palette,
  Layers,
  Sparkles,
  Clock,
  Save,
  RefreshCw,
  Power,
  ExternalLink,
  Code,
  Info,
  Lock,
  Search,
  Sliders,
  Check,
  Globe,
  FileText,
  Calendar,
  AlertCircle,
  X,
} from 'lucide-react';

export function AdminMaintenance() {
  const { user, hasPermission, isOwner } = useAuth();
  const { showToast } = useToast();
  const { refetchAll } = useSite();

  const canEdit = hasPermission('maintenance.edit') || isOwner || user?.role === 'owner';
  const canToggle = hasPermission('maintenance.toggle') || isOwner || user?.role === 'owner';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'pages' | 'themes'>('global');

  // Master settings
  const [settings, setSettings] = useState<MaintenanceSettings>({
    global: { ...DEFAULT_MAINTENANCE_CONFIG },
    pages: {},
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistema',
  });

  // Selected page for granular config editing
  const [selectedPageKey, setSelectedPageKey] = useState<string>('home');
  const [pageSearchQuery, setPageSearchQuery] = useState('');

  // Device Preview State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE_CONFIG);
  const [previewPageTitle, setPreviewPageTitle] = useState<string>('Site Global');

  // Confirmation modal for global toggle
  const [showGlobalConfirmModal, setShowGlobalConfirmModal] = useState(false);

  // Fetch settings from server
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getMaintenanceSettings();
      setSettings(data);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar configurações de manutenção', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Filtered pages registry
  const filteredPages = useMemo(() => {
    return MAINTENANCE_PAGES_REGISTRY.filter(
      (p: MaintenancePageRegistryItem) =>
        p.name.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
        p.route.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(pageSearchQuery.toLowerCase())
    );
  }, [pageSearchQuery]);

  // Active pages count
  const activePagesCount = useMemo(() => {
    if (!settings.pages) return 0;
    return Object.values(settings.pages).filter((p) => (p as MaintenanceConfig)?.enabled).length;
  }, [settings.pages]);

  // Save full maintenance configuration
  const handleSaveGlobal = async () => {
    if (!canEdit) {
      showToast('Permissão insuficiente para alterar configurações.', undefined, 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await api.updateMaintenanceSettings(settings);
      setSettings(updated);
      showToast('Configurações de manutenção salvas com sucesso!', undefined, 'success');
      refetchAll();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar configurações.', undefined, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Global Maintenance
  const handleToggleGlobal = async () => {
    if (!canToggle) {
      showToast('Permissão insuficiente para alterar o status de manutenção.', undefined, 'error');
      return;
    }
    const newStatus = !settings.global.enabled;
    try {
      setTogglingGlobal(true);
      const updated = await api.toggleGlobalMaintenance(newStatus);
      setSettings(updated);
      setShowGlobalConfirmModal(false);
      showToast(
        newStatus
          ? 'Manutenção Global ATIVADA com sucesso!'
          : 'Manutenção Global DESATIVADA. Site público normalizado!',
        undefined,
        newStatus ? 'info' : 'success'
      );
      refetchAll();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alternar status global.', undefined, 'error');
    } finally {
      setTogglingGlobal(false);
    }
  };

  // Toggle Individual Page Maintenance
  const handleTogglePage = async (pageKey: string, currentStatus: boolean) => {
    if (!canToggle) {
      showToast('Permissão insuficiente para alterar status de página.', undefined, 'error');
      return;
    }
    const newStatus = !currentStatus;
    try {
      const updated = await api.togglePageMaintenance(pageKey, newStatus);
      setSettings(updated);
      showToast(
        `Página ${pageKey} agora está ${newStatus ? 'EM MANUTENÇÃO' : 'PUBLICADA E ATIVA'}.`,
        undefined,
        newStatus ? 'info' : 'success'
      );
      refetchAll();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar manutenção da página.', undefined, 'error');
    }
  };

  // Save single page config
  const handleSavePageConfig = async (pageKey: string, config: MaintenanceConfig) => {
    if (!canEdit) {
      showToast('Permissão insuficiente para editar página.', undefined, 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await api.updatePageMaintenance(pageKey, config);
      setSettings(updated);
      showToast(`Configurações da página "${pageKey}" salvas com sucesso!`, undefined, 'success');
      refetchAll();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar página.', undefined, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open preview
  const handleOpenPreview = (config: MaintenanceConfig, title: string) => {
    setPreviewConfig(config);
    setPreviewPageTitle(title);
    setIsPreviewModalOpen(true);
  };

  // Selected page configuration helper
  const currentPageItem = useMemo(() => {
    return MAINTENANCE_PAGES_REGISTRY.find((p) => p.key === selectedPageKey) || MAINTENANCE_PAGES_REGISTRY[0];
  }, [selectedPageKey]);

  const currentPageConfig: MaintenanceConfig = useMemo(() => {
    return (
      settings.pages[selectedPageKey] || {
        ...DEFAULT_MAINTENANCE_CONFIG,
        title: `Página ${currentPageItem.name} em Manutenção`,
        enabled: false,
      }
    );
  }, [settings.pages, selectedPageKey, currentPageItem]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" />
        <p className="text-sm font-medium">Carregando Central de Manutenção...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl flex-shrink-0">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Central de Manutenção
                </h1>
                {settings.global.enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Manutenção Global ATIVA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Site Público Online
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Controle o modo de manutenção para todo o website ou individualmente por seção, escolhendo entre 12 temas visuais diplomáticos.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Global Action */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenPreview(settings.global, 'Site Global')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Pré-visualizar Global</span>
            </button>

            {canToggle ? (
              <button
                onClick={() => setShowGlobalConfirmModal(true)}
                disabled={togglingGlobal}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  settings.global.enabled
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>
                  {settings.global.enabled ? 'Desativar Manutenção Global' : 'Ativar Manutenção Global'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Somente Leitura</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Status Global</span>
            <span
              className={`font-semibold ${
                settings.global.enabled ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {settings.global.enabled ? 'Ativado (Site Fechado)' : 'Desativado (Site Aberto)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Páginas em Manutenção</span>
            <span className="font-semibold text-slate-800">
              {activePagesCount} de {MAINTENANCE_PAGES_REGISTRY.length} páginas
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Tema Global Ativo</span>
            <span className="font-semibold text-amber-600">
              {getMaintenanceThemeById(settings.global.themeId).name}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Última Atualização</span>
            <span className="font-semibold text-slate-700 truncate block">
              {settings.updatedBy || 'Sistema'} (
              {new Date(settings.updatedAt).toLocaleDateString('pt-BR')})
            </span>
          </div>
        </div>

        {/* Security / Admin Protection Notice */}
        <div className="mt-4 p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center gap-2.5 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Garantia de Acesso:</strong> O painel administrativo (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/#admin</code>) e endpoints internos de autenticação nunca são bloqueados pela manutenção.
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('global')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs sm:text-sm border-b-2 transition-colors ${
            activeTab === 'global'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Manutenção Global</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs sm:text-sm border-b-2 transition-colors ${
            activeTab === 'pages'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Manutenção por Página</span>
          {activePagesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {activePagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('themes')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs sm:text-sm border-b-2 transition-colors ${
            activeTab === 'themes'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Galeria de 12 Temas</span>
        </button>
      </div>

      {/* ================= TAB 1: MANUTENÇÃO GLOBAL ================= */}
      {activeTab === 'global' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>Configurações do Modo Global</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Status Global:</span>
                  <button
                    onClick={() => canToggle && setShowGlobalConfirmModal(true)}
                    disabled={!canToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.global.enabled ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.global.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tema Visual da Página Global
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {MAINTENANCE_THEMES.map((th) => {
                    const isSelected = settings.global.themeId === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            global: { ...prev.global, themeId: th.id },
                          }))
                        }
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {th.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: th.previewColors?.bg || '#F8FAFC' }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: th.previewColors?.accent || '#0F2042' }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: th.previewColors?.card || '#FFFFFF' }}
                          />
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            {th.fontFamily || 'font-sans'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Título Principal da Página
                </label>
                <input
                  type="text"
                  value={settings.global.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      global: { ...prev.global, title: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Website em Manutenção Programada"
                />
              </div>

              {/* Rich Text Editor for Custom Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mensagem / Comunicado Oficial (Rich Text)
                </label>
                <RichTextEditor
                  value={settings.global.message}
                  onChange={(val: string) =>
                    setSettings((prev) => ({
                      ...prev,
                      global: { ...prev.global, message: val },
                    }))
                  }
                  placeholder="Digite o comunicado oficial da ADMIR sobre a manutenção..."
                />
              </div>

              {/* Return Date & Countdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Previsão de Retorno
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.global.showEstimatedReturn}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          global: { ...prev.global, showEstimatedReturn: e.target.checked },
                        }))
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <input
                    type="datetime-local"
                    value={
                      settings.global.estimatedReturnDate
                        ? new Date(settings.global.estimatedReturnDate).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        global: {
                          ...prev.global,
                          estimatedReturnDate: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        },
                      }))
                    }
                    disabled={!settings.global.showEstimatedReturn}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Contador Regressivo
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.global.showCountdown}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          global: { ...prev.global, showCountdown: e.target.checked },
                        }))
                      }
                      disabled={!settings.global.showEstimatedReturn}
                      className="rounded text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Exibe dias, horas e minutos restantes até a reabertura do site.
                  </p>
                </div>
              </div>

              {/* Action Button Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Botão de Ação
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.global.showButton}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          global: { ...prev.global, showButton: e.target.checked },
                        }))
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={settings.global.buttonLabel || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        global: { ...prev.global, buttonLabel: e.target.value },
                      }))
                    }
                    disabled={!settings.global.showButton}
                    placeholder="Rótulo (ex: Voltar ao Início)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Destino do Botão (URL ou Hash)
                  </label>
                  <input
                    type="text"
                    value={settings.global.buttonUrl || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        global: { ...prev.global, buttonUrl: e.target.value },
                      }))
                    }
                    disabled={!settings.global.showButton}
                    placeholder="Ex: /#home ou https://..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Logo & Contact Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.global.showLogo}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        global: { ...prev.global, showLogo: e.target.checked },
                      }))
                    }
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-medium text-slate-700">Exibir Brasão ADMIR</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.global.showContact}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        global: { ...prev.global, showContact: e.target.checked },
                      }))
                    }
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Exibir Contatos Oficiais
                  </span>
                </label>
              </div>

              {/* Custom CSS overrides */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom CSS (Opcional para estilos avançados)</span>
                </label>
                <textarea
                  value={settings.global.customCss || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      global: { ...prev.global, customCss: e.target.value },
                    }))
                  }
                  rows={2}
                  placeholder="/* CSS customizado injetado apenas nesta tela */"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={loadSettings}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Descartar Alterações
                </button>
                <button
                  type="button"
                  onClick={handleSaveGlobal}
                  disabled={saving || !canEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Configurações Globais</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Interactive Preview Box (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Preview da Tela Global
                  </span>
                </div>
                {/* Device switchers */}
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      previewDevice === 'desktop' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      previewDevice === 'tablet' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md text-xs transition-colors ${
                      previewDevice === 'mobile' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Render Preview Frame */}
              <div className="mt-3 bg-black/40 rounded-xl overflow-hidden border border-slate-800">
                <MaintenanceDisplay
                  config={settings.global}
                  pageTitle="Site Global"
                  isPreview={true}
                  previewDevice={previewDevice}
                />
              </div>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Tema: {getMaintenanceThemeById(settings.global.themeId).name}</span>
                <button
                  onClick={() => handleOpenPreview(settings.global, 'Site Global')}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Expandir em Tela Cheia</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MANUTENÇÃO POR PÁGINAS ================= */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pages List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Páginas do Website ({filteredPages.length})
                </h3>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value)}
                  placeholder="Buscar página..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredPages.map((item: MaintenancePageRegistryItem) => {
                  const isSelected = selectedPageKey === item.key;
                  const isPageActive = !!settings.pages[item.key]?.enabled;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedPageKey(item.key)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">
                          {item.route}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isPageActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 animate-pulse">
                            Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                            Online
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Page Editor & Config (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              {/* Header for selected page */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {currentPageItem.name}
                    </h2>
                    <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      {currentPageItem.route}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{currentPageItem.defaultTitle || 'Configuração de manutenção para esta seção'}</p>
                </div>

                {/* Page Switch */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(currentPageConfig, currentPageItem.name)}
                    className="p-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    title="Pré-visualizar esta página"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      {currentPageConfig.enabled ? 'Em Manutenção' : 'Publicada'}
                    </span>
                    <button
                      onClick={() =>
                        handleTogglePage(selectedPageKey, currentPageConfig.enabled)
                      }
                      disabled={!canToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentPageConfig.enabled ? 'bg-rose-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currentPageConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Selector for Page */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tema da Página: {currentPageItem.name}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MAINTENANCE_THEMES.map((th) => {
                    const isSelected = currentPageConfig.themeId === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            pages: {
                              ...prev.pages,
                              [selectedPageKey]: {
                                ...currentPageConfig,
                                themeId: th.id,
                              },
                            },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {th.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: th.previewColors?.bg || '#F8FAFC' }}
                          />
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: th.previewColors?.accent || '#0F2042' }}
                          />
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            {th.fontFamily || 'font-sans'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Título da Tela de Manutenção
                </label>
                <input
                  type="text"
                  value={currentPageConfig.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      pages: {
                        ...prev.pages,
                        [selectedPageKey]: {
                          ...currentPageConfig,
                          title: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Message Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mensagem Específica para esta Seção
                </label>
                <RichTextEditor
                  value={currentPageConfig.message}
                  onChange={(val: string) =>
                    setSettings((prev) => ({
                      ...prev,
                      pages: {
                        ...prev.pages,
                        [selectedPageKey]: {
                          ...currentPageConfig,
                          message: val,
                        },
                      },
                    }))
                  }
                  placeholder={`Explique o motivo da manutenção da seção ${currentPageItem.name}...`}
                />
              </div>

              {/* Return Date & Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Previsão de Retorno
                    </label>
                    <input
                      type="checkbox"
                      checked={currentPageConfig.showEstimatedReturn}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          pages: {
                            ...prev.pages,
                            [selectedPageKey]: {
                              ...currentPageConfig,
                              showEstimatedReturn: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <input
                    type="datetime-local"
                    value={
                      currentPageConfig.estimatedReturnDate
                        ? new Date(currentPageConfig.estimatedReturnDate)
                            .toISOString()
                            .slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        pages: {
                          ...prev.pages,
                          [selectedPageKey]: {
                            ...currentPageConfig,
                            estimatedReturnDate: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          },
                        },
                      }))
                    }
                    disabled={!currentPageConfig.showEstimatedReturn}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Botão de Redirecionamento
                    </label>
                    <input
                      type="checkbox"
                      checked={currentPageConfig.showButton}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          pages: {
                            ...prev.pages,
                            [selectedPageKey]: {
                              ...currentPageConfig,
                              showButton: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={currentPageConfig.buttonLabel || 'Voltar ao Início'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        pages: {
                          ...prev.pages,
                          [selectedPageKey]: {
                            ...currentPageConfig,
                            buttonLabel: e.target.value,
                          },
                        },
                      }))
                    }
                    disabled={!currentPageConfig.showButton}
                    placeholder="Rótulo do botão"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Save Page */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSavePageConfig(selectedPageKey, currentPageConfig)}
                  disabled={saving || !canEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Alterações da Página</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GALERIA DE 12 TEMAS ================= */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Galeria de 12 Temas Visuais Exclusivos
            </h2>
            <p className="text-xs text-slate-500">
              Cada tema foi concebido com harmonia visual, tipografia refinada, contraste WCAG 2.2 AA e layout responsivo. Você pode aplicar qualquer um dos temas globalmente ou atribuir temas distintos por página.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MAINTENANCE_THEMES.map((th) => {
              const isGlobalTheme = settings.global.themeId === th.id;
              return (
                <div
                  key={th.id}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    isGlobalTheme ? 'border-amber-600 ring-2 ring-amber-500/20' : 'border-slate-200'
                  }`}
                >
                  {/* Theme Thumbnail Header */}
                  <div
                    className="p-4 relative border-b border-slate-100 flex flex-col justify-between h-32"
                    style={{ backgroundColor: th.previewColors?.bg || '#F8FAFC' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: th.previewColors?.card || '#FFFFFF',
                          color: th.previewColors?.accent || '#0F2042',
                        }}
                      >
                        {th.name}
                      </span>
                      {isGlobalTheme && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                          Tema Global
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div
                        className="h-2 w-3/4 rounded"
                        style={{ backgroundColor: th.previewColors?.accent || '#0F2042' }}
                      />
                      <div
                        className="h-1.5 w-1/2 rounded opacity-50"
                        style={{ backgroundColor: th.previewColors?.card || '#FFFFFF' }}
                      />
                    </div>
                  </div>

                  {/* Theme Info Body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{th.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{th.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tipografia:</span>
                        <span className="font-mono font-medium text-slate-700 capitalize">
                          {th.fontFamily || 'font-sans'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Contraste:</span>
                        <span className="font-medium text-slate-700">
                          {th.isDark ? 'Dark Mode' : 'Light Mode'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() =>
                          handleOpenPreview(
                            { ...settings.global, themeId: th.id },
                            `Tema: ${th.name}`
                          )
                        }
                        className="p-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-center transition-colors"
                      >
                        Visualizar
                      </button>

                      <button
                        onClick={async () => {
                          if (!canEdit) return;
                          setSettings((prev) => ({
                            ...prev,
                            global: { ...prev.global, themeId: th.id },
                          }));
                          showToast(`Tema "${th.name}" selecionado para o modo Global!`, 'info');
                        }}
                        disabled={!canEdit || isGlobalTheme}
                        className="p-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-center transition-colors"
                      >
                        {isGlobalTheme ? 'Ativo' : 'Aplicar Global'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL DE PRÉ-VISUALIZAÇÃO RESPONSIVA ================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden">
          {/* Modal Header */}
          <div className="w-full max-w-6xl flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-t-2xl text-white">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold">{previewPageTitle}</h3>
                <span className="text-[11px] text-slate-400">
                  Tema: {getMaintenanceThemeById(previewConfig.themeId).name}
                </span>
              </div>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewDevice === 'tablet'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet (768px)</span>
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile (375px)</span>
              </button>
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body with responsive scrollable container */}
          <div className="w-full max-w-6xl flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl p-2 sm:p-6 overflow-y-auto flex items-center justify-center">
            <MaintenanceDisplay
              config={previewConfig}
              pageTitle={previewPageTitle}
              isPreview={true}
              previewDevice={previewDevice}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL DE CONFIRMAÇÃO DE TOGGLE GLOBAL ================= */}
      {showGlobalConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  settings.global.enabled
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {settings.global.enabled
                    ? 'Desativar Manutenção Global?'
                    : 'Ativar Manutenção Global do Site?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta ação afeta imediatamente todos os visitantes públicos.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
              {settings.global.enabled ? (
                <p>
                  Ao desativar, todas as páginas públicas do site ADMIR voltarão a ficar abertas e acessíveis para o público geral.
                </p>
              ) : (
                <p>
                  Ao ativar, todos os visitantes públicos que acessarem qualquer página do site verão a tela de manutenção oficial no tema <strong>{getMaintenanceThemeById(settings.global.themeId).name}</strong>.
                </p>
              )}
              <div className="text-blue-700 font-medium">
                ✓ O painel de administração (<code className="font-mono">/#admin</code>) continuará funcionando normalmente para a equipe autorizada.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGlobalConfirmModal(false)}
                disabled={togglingGlobal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleGlobal}
                disabled={togglingGlobal}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                  settings.global.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {togglingGlobal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span>
                  {settings.global.enabled ? 'Confirmar e Abrir Site' : 'Confirmar e Fechar Site'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
