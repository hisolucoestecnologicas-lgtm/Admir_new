import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  History,
  Archive,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Lock,
  Layers,
  Sparkles,
  Info,
  Server,
  Code2,
  ShieldAlert,
  ArrowUpRight,
  Check,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  SyncStatusInfo,
  SyncPreviewResult,
  SyncExecutionResult,
  SyncBackupRecord,
  SyncableModuleId,
  SyncConflictStrategy,
  SyncModuleInfo,
  SyncConnectionTestResult,
} from '../../types';
import {
  fetchSyncStatus,
  executeSyncPreview,
  executeSyncRun,
  fetchSyncBackups,
  restoreSyncBackup,
  fetchSyncHistory,
  exportCurrentDataSnapshot,
  testSyncConnection,
} from '../../services/syncApi';

export function DataSyncManager() {
  const { user, hasPermission, isOwner } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'sync' | 'backups' | 'history'>('sync');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<SyncStatusInfo | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Sync Configuration State
  const [isFullBase, setIsFullBase] = useState(false);
  const [selectedModules, setSelectedModules] = useState<SyncableModuleId[]>([
    'settings',
    'programs',
    'stories',
    'ambassadors',
    'media',
  ]);
  const [conflictStrategy, setConflictStrategy] = useState<SyncConflictStrategy>('source_wins');

  // Snapshot JSON upload state
  const [useUploadedSnapshot, setUseUploadedSnapshot] = useState(false);
  const [uploadedSnapshotData, setUploadedSnapshotData] = useState<any | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dry Run / Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<SyncPreviewResult | null>(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<SyncExecutionResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Backups & History State
  const [backups, setBackups] = useState<SyncBackupRecord[]>([]);
  const [history, setHistory] = useState<SyncExecutionResult[]>([]);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<SyncBackupRecord | null>(null);

  const canPreview = hasPermission('sync.preview');
  const canExecute = hasPermission('sync.execute');
  const canRestore = hasPermission('sync.restore');

  const loadAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [st, bk, hist] = await Promise.all([
        fetchSyncStatus(),
        fetchSyncBackups().catch(() => []),
        fetchSyncHistory().catch(() => []),
      ]);
      setStatusInfo(st);
      setBackups(bk);
      setHistory(hist);
    } catch (e: any) {
      const msg = e.message || 'Erro ao carregar dados do sincronizador.';
      setLoadError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testSyncConnection();
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
      // Refresh status so the badge and last test details update
      const st = await fetchSyncStatus().catch(() => null);
      if (st) {
        setStatusInfo(st);
      }
    } catch (err: any) {
      const msg = err.message || 'Falha ao executar teste de conexão.';
      showToast(`✕ Não foi possível conectar: ${msg}`, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleModule = (modId: SyncableModuleId) => {
    setPreviewResult(null); // Reset preview when selection changes
    setSelectedModules((prev) => {
      const next = prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId];
      if (statusInfo && next.length === statusInfo.modules.length) {
        setIsFullBase(true);
      } else {
        setIsFullBase(false);
      }
      return next;
    });
  };

  const handleSelectAllModules = () => {
    if (!statusInfo) return;
    setIsFullBase(true);
    setPreviewResult(null);
    setSelectedModules(statusInfo.modules.map((m) => m.id));
  };

  const handleClearModules = () => {
    setIsFullBase(false);
    setPreviewResult(null);
    setSelectedModules([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setUploadedSnapshotData(json);
        setUploadedFileName(file.name);
        setUseUploadedSnapshot(true);
        setPreviewResult(null);
        showToast(`Snapshot "${file.name}" carregado e validado com sucesso.`, 'success');
      } catch (err) {
        showToast('O arquivo selecionado não é um JSON válido.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleRunPreview = async () => {
    if (selectedModules.length === 0 && !isFullBase) {
      showToast('Selecione pelo menos um módulo para executar a análise.', 'warning');
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await executeSyncPreview({
        selectedModules,
        isFullBase,
        snapshotData: useUploadedSnapshot ? uploadedSnapshotData : undefined,
      });
      setPreviewResult(result);
      showToast('Análise preliminar (Dry Run) processada com sucesso.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao processar análise preliminar.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!canExecute) {
      showToast('Você não possui a permissão "sync.execute" para esta operação.', 'error');
      return;
    }

    setShowConfirmModal(false);
    setExecuting(true);
    try {
      const result = await executeSyncRun({
        selectedModules: previewResult?.selectedModules || selectedModules,
        strategy: conflictStrategy,
        snapshotData: useUploadedSnapshot ? uploadedSnapshotData : undefined,
      });
      setExecutionResult(result);
      showToast('Sincronização realizada com sucesso! Backup automático gerado.', 'success');
      loadAll();
    } catch (e: any) {
      showToast(e.message || 'Erro durante a execução da sincronização.', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleRestoreBackup = async (backup: SyncBackupRecord) => {
    if (!canRestore) {
      showToast('Você não possui a permissão "sync.restore" para esta operação.', 'error');
      return;
    }

    setRestoringBackupId(backup.id);
    setConfirmRestoreModal(null);
    try {
      await restoreSyncBackup(backup.id);
      showToast(`Snapshot ${backup.id} restaurado com sucesso.`, 'success');
      loadAll();
    } catch (e: any) {
      showToast(e.message || 'Erro ao restaurar backup.', 'error');
    } finally {
      setRestoringBackupId(null);
    }
  };

  const handleExportLocalSnapshot = async () => {
    try {
      const data = await exportCurrentDataSnapshot();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admir_snapshot_dev_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Snapshot local exportado com sucesso.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao exportar snapshot.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-medium">Carregando status do motor de sincronização...</p>
      </div>
    );
  }

  const categoryLabels = {
    content: 'Conteúdo Público & Editorial',
    operations: 'Operações & Atendimento',
    system: 'Sistema & Configurações',
  };

  const groupedModules = (statusInfo?.modules || []).reduce((acc, mod) => {
    acc[mod.category] = acc[mod.category] || [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, SyncModuleInfo[]>);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Database className="w-3.5 h-3.5" />
              Sincronização Controlada (Unidirecional)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Produção <ArrowRight className="w-6 h-6 text-amber-400" /> Desenvolvimento
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Importação segura e idempotente de dados oficiais de Produção para o ambiente local de testes e homologação, com análise prévia (Dry Run), snapshot automático de backup e proteção absoluta contra exclusões.
            </p>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportLocalSnapshot}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Baixar snapshot JSON dos dados locais atuais"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Exportar Snapshot Local
            </button>
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Security & Pipeline Guard Rails Badges */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white">Leitura Exclusiva:</span> Produção nunca é alterada
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Archive className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white">Backup Obrigatório:</span> Snapshot pré-importação
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-white">Zero Exclusão:</span> Mocks locais 100% preservados
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3">
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'sync'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <Database className="w-4 h-4" />
          Sincronizador & Análise Preliminar
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'backups'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <Archive className="w-4 h-4" />
          Snapshots de Backup ({backups.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Execuções ({history.length})
        </button>
      </div>

      {/* TAB 1: SYNCHRONIZER & DRY RUN */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Step 1: Source Provider Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-bold">1</span>
                Origem dos Dados de Produção
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseUploadedSnapshot(false);
                    setPreviewResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !useUploadedSnapshot
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Conexão Direta API
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseUploadedSnapshot(true);
                    setPreviewResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    useUploadedSnapshot
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Upload de Snapshot JSON
                </button>
              </div>
            </div>

            {!useUploadedSnapshot ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        statusInfo?.connectionState === 'VALIDATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : statusInfo?.connectionState === 'CONNECTION_ERROR'
                          ? 'bg-rose-100 text-rose-800'
                          : statusInfo?.connectionState === 'CONFIGURED_NOT_VALIDATED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>Servidor de Produção ADMIR</span>
                        {statusInfo?.sourceUrl && (
                          <code className="text-xs bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-mono">
                            {statusInfo.sourceUrl}
                          </code>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {statusInfo?.isConfigured
                          ? 'Conexão direta via API server-to-server. O token de autenticação permanece seguro no backend.'
                          : 'Variável PROD_API_URL não configurada no ambiente. Configure no painel de Secrets ou utilize "Upload de Snapshot JSON".'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    {/* Status Badges */}
                    {statusInfo?.connectionState === 'VALIDATED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        [CONEXÃO VALIDADA] Pronto para Leitura
                      </span>
                    )}

                    {statusInfo?.connectionState === 'CONFIGURED_NOT_VALIDATED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        [CONFIGURADO — NÃO VALIDADO]
                      </span>
                    )}

                    {statusInfo?.connectionState === 'CONNECTION_ERROR' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        [ERRO DE CONEXÃO]
                      </span>
                    )}

                    {(!statusInfo || statusInfo.connectionState === 'PENDING_CONFIG' || !statusInfo.isConfigured) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        [CONFIGURAÇÃO PENDENTE]
                      </span>
                    )}

                    {/* Testar Conexão Button */}
                    <button
                      type="button"
                      disabled={testingConnection}
                      onClick={handleTestConnection}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm disabled:opacity-50"
                    >
                      {testingConnection ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <Server className="w-3.5 h-3.5 text-amber-400" />
                          Testar Conexão
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Connection Test Details Box */}
                {statusInfo?.lastConnectionTest && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      statusInfo.lastConnectionTest.success
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {statusInfo.lastConnectionTest.success ? '✓ Conexão validada com sucesso' : '✕ Não foi possível conectar'}
                      </span>
                      <span className="text-[11px] opacity-75">
                        Testado em: {new Date(statusInfo.lastConnectionTest.testedAt).toLocaleTimeString()}
                        {statusInfo.lastConnectionTest.latencyMs !== undefined &&
                          ` • ${statusInfo.lastConnectionTest.latencyMs}ms`}
                      </span>
                    </div>
                    <p className="mt-1 opacity-90">{statusInfo.lastConnectionTest.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200 text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-amber-700" />
                    <div>
                      <div className="font-semibold text-slate-950">Importar Arquivo JSON de Snapshot Oficial</div>
                      <p className="text-slate-600 text-xs">
                        Carregue um arquivo .json de snapshot oficial previamente exportado da Produção.
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                  >
                    Selecionar Arquivo JSON
                  </button>
                </div>

                {uploadedFileName && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-300 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Arquivo: <span className="font-bold">{uploadedFileName}</span>
                    </div>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Válido & Carregado
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Module Selection & Strategy */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-bold">2</span>
                  Seleção de Módulos para Sincronização
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Escolha importar a base completa ou selecione módulos específicos.
                </p>
              </div>

              {/* Scope Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllModules}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isFullBase || (Boolean(statusInfo?.modules?.length) && selectedModules.length === statusInfo!.modules.length)
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Base Completa ({statusInfo?.modules?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={handleClearModules}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* Error state banner */}
            {loadError && !statusInfo && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Falha ao carregar módulos de sincronização</h4>
                    <p className="text-xs text-rose-700 mt-0.5">{loadError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Empty modules state */}
            {!loading && !loadError && statusInfo && Object.keys(groupedModules).length === 0 && (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl p-6">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Nenhum módulo de sincronização disponível.</p>
                <p className="text-xs text-slate-500 mt-1">Verifique a integridade do banco de dados e as permissões de acesso.</p>
              </div>
            )}

            {/* Modules Grid Grouped by Category */}
            <div className="space-y-6">
              {Object.entries(groupedModules).map(([category, mods]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    {categoryLabels[category as keyof typeof categoryLabels] || category}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mods.map((mod) => {
                      const isSelected = selectedModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModule(mod.id)}
                          className={`cursor-pointer rounded-xl p-4 border transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-50/50 border-amber-400 shadow-sm'
                              : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">{mod.name}</span>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs transition ${
                                  isSelected
                                    ? 'bg-amber-600 text-white'
                                    : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">{mod.description}</p>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Destino local: <strong>{mod.targetCount}</strong> itens</span>
                            {mod.hasPrivateDocs && (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                                Docs Privados Isolados
                              </span>
                            )}
                            {mod.isSensitive && (
                              <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                                Sanitizado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Conflict Strategy Selector */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Estratégia de Resolução de Conflitos (Para registros com mesmo ID):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    conflictStrategy === 'source_wins'
                      ? 'bg-white border-amber-500 shadow-sm'
                      : 'bg-slate-100/70 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={conflictStrategy === 'source_wins'}
                    onChange={() => setConflictStrategy('source_wins')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900">Usar versão de Produção em conflitos</span>
                    <p className="text-[11px] text-slate-500">
                      Quando o mesmo registro existir nos dois ambientes, utilizar os dados provenientes da Produção.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    conflictStrategy === 'target_wins'
                      ? 'bg-white border-amber-500 shadow-sm'
                      : 'bg-slate-100/70 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={conflictStrategy === 'target_wins'}
                    onChange={() => setConflictStrategy('target_wins')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900">Preservar versão de Desenvolvimento em conflitos</span>
                    <p className="text-[11px] text-slate-500">
                      Quando o mesmo registro existir nos dois ambientes, manter os dados atualmente existentes no Desenvolvimento.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Dry Run Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Selecionados: <strong>{selectedModules.length}</strong> módulos
              </span>

              <button
                type="button"
                disabled={previewLoading || selectedModules.length === 0 || !canPreview}
                onClick={handleRunPreview}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition shadow-sm ${
                  previewLoading || selectedModules.length === 0 || !canPreview
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                }`}
              >
                {previewLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando Análise Preliminar...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Executar Análise Preliminar (Dry Run Obrigatório)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Preview / Dry Run Analysis Results */}
          {previewResult && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Análise Concluída com Sucesso
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Relatório de Impacto da Sincronização
                  </h2>
                </div>

                <div className="text-xs text-slate-500 text-right">
                  Analisado em: <strong>{new Date(previewResult.analyzedAt).toLocaleTimeString()}</strong>
                </div>
              </div>

              {/* KPI Breakdown Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Novos Registros
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-700">+{previewResult.totalNew}</span>
                  <p className="text-[11px] text-emerald-600 mt-1">Serão inseridos no destino</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                    Atualizados / Conflitos
                  </span>
                  <span className="text-2xl font-extrabold text-blue-700">~{previewResult.totalUpdates}</span>
                  <p className="text-[11px] text-blue-600 mt-1">
                    {conflictStrategy === 'source_wins' ? 'Serão atualizados pela Produção' : 'Serão mantidos no destino'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Preservados Locais
                  </span>
                  <span className="text-2xl font-extrabold text-slate-800">={previewResult.totalPreserved}</span>
                  <p className="text-[11px] text-slate-500 mt-1">Mocks locais intactos</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Exclusões Automáticas
                  </span>
                  <span className="text-2xl font-extrabold text-amber-800">0</span>
                  <p className="text-[11px] text-amber-700 mt-1">Proteção contra perda ativa</p>
                </div>
              </div>

              {/* Warnings / Missing Dependencies */}
              {previewResult.missingDependencies.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Dependências Cruzadas Detectadas:
                  </div>
                  <ul className="space-y-1 text-xs text-amber-800 list-disc list-inside">
                    {previewResult.missingDependencies.map((dep, idx) => (
                      <li key={idx}>{dep.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewResult.warnings.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Info className="w-4 h-4 text-blue-600" />
                    Avisos e Recomendações:
                  </div>
                  <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
                    {previewResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Module-by-Module Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3">Módulo</th>
                      <th className="p-3 text-center">Origem (Prod)</th>
                      <th className="p-3 text-center">Destino (Dev)</th>
                      <th className="p-3 text-center text-emerald-700">Novos</th>
                      <th className="p-3 text-center text-blue-700">Atualizações</th>
                      <th className="p-3 text-center text-slate-700">Preservados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewResult.modulesStats.map((stat) => (
                      <tr key={stat.moduleId} className="hover:bg-slate-50/60">
                        <td className="p-3 font-semibold text-slate-900">{stat.moduleName}</td>
                        <td className="p-3 text-center font-medium text-slate-600">{stat.sourceCount}</td>
                        <td className="p-3 text-center font-medium text-slate-600">{stat.targetCount}</td>
                        <td className="p-3 text-center font-bold text-emerald-700">
                          {stat.newCount > 0 ? `+${stat.newCount}` : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-blue-700">
                          {stat.updateCount > 0 ? `~${stat.updateCount}` : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{stat.preservedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Conflicts Modal trigger */}
              {previewResult.conflicts.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-700 font-medium">
                    Foram identificadas <strong>{previewResult.conflicts.length}</strong> divergências de conteúdo entre Produção e Desenvolvimento.
                  </span>
                  <button
                    onClick={() => setShowConflictsModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 transition"
                  >
                    Ver Detalhes dos Conflitos
                  </button>
                </div>
              )}

              {/* Execution Action Gate */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Um snapshot de backup do destino será gerado automaticamente antes da gravação.</span>
                </div>

                <button
                  type="button"
                  disabled={executing || !canExecute}
                  onClick={() => setShowConfirmModal(true)}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md transition ${
                    executing || !canExecute
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando Alterações...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar e Executar Sincronização
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Last Execution Outcome Card (if just finished) */}
          {executionResult && (
            <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Sincronização Concluída com Sucesso!</h3>
                  <p className="text-slate-500 text-xs">
                    {executionResult.stats.newRecords} novos registros inseridos, {executionResult.stats.updatedRecords} atualizados e {executionResult.stats.preservedRecords} preservados em {executionResult.durationMs}ms.
                  </p>
                </div>
              </div>

              {executionResult.backupCreated && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Archive className="w-4 h-4 text-amber-600" />
                    Snapshot de Backup gerado: <strong>{executionResult.backupCreated.id}</strong> ({executionResult.backupCreated.totalRecords} registros)
                  </div>
                  <span className="text-emerald-700 font-semibold">Salvo em /data/backups/</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BACKUPS MANAGEMENT */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-600" />
                  Snapshots de Backup Automáticos
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Snapshots capturados automaticamente antes de cada operação de sincronização ou restauração.
                </p>
              </div>

              <button
                onClick={handleExportLocalSnapshot}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Estado Atual (JSON)
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-xl bg-slate-50 border border-slate-200">
                Nenhum snapshot de backup registrado ainda. Eles são gerados automaticamente na primeira sincronização.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {backups.map((bk) => (
                  <div key={bk.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{bk.id}</span>
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {new Date(bk.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{bk.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>Autor: <strong>{bk.createdBy?.name || 'Sistema'}</strong></span>
                        <span>Total de registros: <strong>{bk.totalRecords}</strong></span>
                        <span>Módulos: <strong>{bk.modules.length}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={restoringBackupId === bk.id || !canRestore}
                      onClick={() => setConfirmRestoreModal(bk)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
                    >
                      {restoringBackupId === bk.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar Este Snapshot
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTION LOGS & HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                Histórico & Auditoria de Sincronizações
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Registro imutável de todas as execuções de importação e restauração de dados.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-xl bg-slate-50 border border-slate-200">
                Nenhuma sincronização registrada até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((hist) => (
                  <div key={hist.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            hist.status === 'success'
                              ? 'bg-emerald-500'
                              : hist.status === 'partial'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-bold text-slate-900 text-xs">{hist.id}</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(hist.startedAt).toLocaleString()} ({hist.durationMs}ms)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                          Origem: {hist.sourceEnvironment}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          +{hist.stats.newRecords} novos
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                          ~{hist.stats.updatedRecords} atualizados
                        </span>
                      </div>
                    </div>

                    {/* Step Logs */}
                    <div className="bg-slate-900 text-slate-300 font-mono text-[11px] p-3 rounded-lg space-y-1 max-h-36 overflow-y-auto">
                      {hist.logs.map((log, idx) => (
                        <div key={idx} className="leading-tight">{log}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM EXECUTION GATE */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirmar Sincronização de Dados</h3>
                <p className="text-slate-500 text-xs">Produção → Desenvolvimento / Homologação</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-900">Resumo da Operação:</div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li>Módulos a sincronizar: <strong>{previewResult?.selectedModules.length} módulos</strong></li>
                <li>Novos registros: <strong>+{previewResult?.totalNew}</strong></li>
                <li>Registros atualizados: <strong>~{previewResult?.totalUpdates}</strong></li>
                <li>Registros locais preservados: <strong>={previewResult?.totalPreserved}</strong></li>
                <li>Estratégia de conflito: <strong>{conflictStrategy === 'source_wins' ? 'Usar versão de Produção em conflitos' : 'Preservar versão de Desenvolvimento em conflitos'}</strong></li>
                <li>Backup automático: <strong>Sim (criado antes da gravação)</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                Sim, Executar Sincronização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM RESTORE SNAPSHOT */}
      {confirmRestoreModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Restaurar Snapshot de Backup</h3>
                <p className="text-slate-500 text-xs">Reverter estado do banco de dados</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a restaurar o snapshot <strong>{confirmRestoreModal.id}</strong> criado em <strong>{new Date(confirmRestoreModal.createdAt).toLocaleString()}</strong> com <strong>{confirmRestoreModal.totalRecords}</strong> registros.
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Atenção:</strong> Por segurança, um snapshot do estado atual será capturado antes de aplicar a restauração.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRestoreBackup(confirmRestoreModal)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                Confirmar Restauração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAILED CONFLICTS LIST */}
      {showConflictsModal && previewResult && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-600" />
                Detalhamento dos Conflitos Detectados ({previewResult.conflicts.length})
              </h3>
              <button
                onClick={() => setShowConflictsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
              {previewResult.conflicts.map((conf, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{conf.recordTitle}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                      {conf.moduleName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                      <span className="font-bold text-emerald-900 block mb-1">Origem (Produção):</span>
                      <p className="text-emerald-800">{conf.sourceDiffSummary}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg">
                      <span className="font-bold text-blue-900 block mb-1">Destino Atual (Dev):</span>
                      <p className="text-blue-800">{conf.targetDiffSummary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowConflictsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
