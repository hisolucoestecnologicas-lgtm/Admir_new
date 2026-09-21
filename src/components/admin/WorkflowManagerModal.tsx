import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  Layers,
  Flag,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Lock,
  ChevronRight,
  Settings
} from 'lucide-react';
import { TaskWorkspace, TaskWorkflow, TaskWorkflowStage } from '../../types';
import { api } from '../../lib/api';

interface WorkflowManagerModalProps {
  isOpen: boolean;
  onClose: (refreshNeeded: boolean) => void;
  workspaces: TaskWorkspace[];
  activeWorkspaceId: string;
}

export const WorkflowManagerModal: React.FC<WorkflowManagerModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
}) => {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(activeWorkspaceId || 'ws-1');
  const [workflows, setWorkflows] = useState<TaskWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [stages, setStages] = useState<TaskWorkflowStage[]>([]);
  
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // New Workflow State
  const [isAddingWorkflow, setIsAddingWorkflow] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  
  // Edit Workflow State
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingWorkflowName, setEditingWorkflowName] = useState('');

  // New Stage State
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageIsInitial, setNewStageIsInitial] = useState(false);
  const [newStageIsFinal, setNewStageIsFinal] = useState(false);

  // Edit Stage State
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedWorkspaceId(activeWorkspaceId || 'ws-1');
      loadWorkflows(activeWorkspaceId || 'ws-1');
    }
  }, [isOpen, activeWorkspaceId]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
    }, 4500);
  };

  const loadWorkflows = async (wsId: string) => {
    try {
      setLoadingWorkflows(true);
      const data = await api.getWorkflows(wsId, true);
      setWorkflows(data);
      if (data.length > 0) {
        // Select either previously selected or the first one
        const currentSelected = data.find(w => w.id === selectedWorkflowId) || data[0];
        setSelectedWorkflowId(currentSelected.id);
        loadStages(currentSelected.id);
      } else {
        setSelectedWorkflowId(null);
        setStages([]);
      }
    } catch (err: any) {
      showNotification(err.message || 'Erro ao carregar fluxos.', true);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const loadStages = async (wfId: string) => {
    try {
      setLoadingStages(true);
      const data = await api.getStages(wfId, true);
      setStages(data);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao carregar etapas.', true);
    } finally {
      setLoadingStages(false);
    }
  };

  const handleSelectWorkflow = (wfId: string) => {
    setSelectedWorkflowId(wfId);
    setEditingWorkflowId(null);
    setEditingStageId(null);
    setIsAddingStage(false);
    loadStages(wfId);
  };

  // --- WORKFLOW ACTIONS ---
  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    try {
      setSaving(true);
      const created = await api.createWorkflow({
        workspaceId: selectedWorkspaceId,
        name: newWorkflowName.trim(),
        active: true,
      });
      setNewWorkflowName('');
      setIsAddingWorkflow(false);
      setHasChanges(true);
      showNotification(`Fluxo "${created.name}" criado com sucesso.`);
      await loadWorkflows(selectedWorkspaceId);
      setSelectedWorkflowId(created.id);
      await loadStages(created.id);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao criar fluxo.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWorkflowName = async (wf: TaskWorkflow) => {
    if (!editingWorkflowName.trim() || editingWorkflowName === wf.name) {
      setEditingWorkflowId(null);
      return;
    }

    try {
      setSaving(true);
      await api.updateWorkflow(wf.id, { name: editingWorkflowName.trim() });
      setEditingWorkflowId(null);
      setHasChanges(true);
      showNotification('Nome do fluxo atualizado.');
      await loadWorkflows(selectedWorkspaceId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao renomear fluxo.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWorkflowActive = async (wf: TaskWorkflow) => {
    try {
      setSaving(true);
      const updated = await api.updateWorkflow(wf.id, { active: !wf.active });
      setHasChanges(true);
      showNotification(`Fluxo "${updated.name}" ${updated.active ? 'ativado' : 'desativado'}.`);
      await loadWorkflows(selectedWorkspaceId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao alterar status do fluxo.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveWorkflow = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workflows.length) return;

    const newOrder = [...workflows];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    try {
      setSaving(true);
      setWorkflows(newOrder);
      await api.reorderWorkflows(newOrder.map(w => w.id));
      setHasChanges(true);
      showNotification('Ordem dos fluxos atualizada.');
    } catch (err: any) {
      showNotification(err.message || 'Erro ao reordenar fluxos.', true);
      await loadWorkflows(selectedWorkspaceId);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkflow = async (wf: TaskWorkflow) => {
    if (wf.id === 'wf-legacy') {
      showNotification('O fluxo Legacy é protegido institucionalmente e não pode ser excluído.', true);
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o fluxo "${wf.name}"?\nEsta ação só será permitida se o fluxo não possuir tarefas vinculadas.`)) {
      return;
    }

    try {
      setSaving(true);
      await api.deleteWorkflow(wf.id);
      setHasChanges(true);
      showNotification(`Fluxo "${wf.name}" excluído com sucesso.`);
      await loadWorkflows(selectedWorkspaceId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao excluir fluxo.', true);
    } finally {
      setSaving(false);
    }
  };

  // --- STAGES ACTIONS ---
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflowId || !newStageName.trim()) return;

    try {
      setSaving(true);
      const created = await api.createStage(selectedWorkflowId, {
        name: newStageName.trim(),
        isInitial: newStageIsInitial,
        isFinal: newStageIsFinal,
        active: true,
      });
      setNewStageName('');
      setNewStageIsInitial(false);
      setNewStageIsFinal(false);
      setIsAddingStage(false);
      setHasChanges(true);
      showNotification(`Etapa "${created.name}" criada com sucesso.`);
      await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao criar etapa.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStageName = async (st: TaskWorkflowStage) => {
    if (!editingStageName.trim() || editingStageName === st.name) {
      setEditingStageId(null);
      return;
    }

    try {
      setSaving(true);
      await api.updateStage(st.id, { name: editingStageName.trim() });
      setEditingStageId(null);
      setHasChanges(true);
      showNotification('Nome da etapa atualizado.');
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao renomear etapa.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleSetInitialStage = async (st: TaskWorkflowStage) => {
    if (st.isInitial) return;

    try {
      setSaving(true);
      await api.updateStage(st.id, { isInitial: true });
      setHasChanges(true);
      showNotification(`Etapa "${st.name}" definida como estágio inicial.`);
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao definir estágio inicial.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFinalStage = async (st: TaskWorkflowStage) => {
    try {
      setSaving(true);
      const updated = await api.updateStage(st.id, { isFinal: !st.isFinal });
      setHasChanges(true);
      showNotification(`Etapa "${updated.name}" ${updated.isFinal ? 'marcada como estágio final' : 'desmarcada de estágio final'}.`);
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao alterar configuração da etapa.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStageActive = async (st: TaskWorkflowStage) => {
    try {
      setSaving(true);
      const updated = await api.updateStage(st.id, { active: !st.active });
      setHasChanges(true);
      showNotification(`Etapa "${updated.name}" ${updated.active ? 'ativada' : 'desativada'}.`);
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao alterar status da etapa.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (!selectedWorkflowId) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newOrder = [...stages];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    try {
      setSaving(true);
      setStages(newOrder);
      await api.reorderStages(selectedWorkflowId, newOrder.map(s => s.id));
      setHasChanges(true);
      showNotification('Ordem das etapas atualizada.');
    } catch (err: any) {
      showNotification(err.message || 'Erro ao reordenar etapas.', true);
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (st: TaskWorkflowStage) => {
    if (!window.confirm(`Deseja realmente excluir a etapa "${st.name}"?\nEsta ação falhará se houver tarefas cadastradas nesta etapa.`)) {
      return;
    }

    try {
      setSaving(true);
      await api.deleteStage(st.id);
      setHasChanges(true);
      showNotification(`Etapa "${st.name}" excluída com sucesso.`);
      if (selectedWorkflowId) await loadStages(selectedWorkflowId);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao excluir etapa.', true);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif-heading flex items-center gap-2">
                <span>Gerenciamento de Fluxos e Etapas</span>
                <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-300 font-sans px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                  Kanban Config
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Configure os fluxos de trabalho, esteiras operacionais e etapas de transição.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose(hasChanges)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-2.5 text-rose-800 text-xs font-semibold animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden bg-slate-50">
          {/* Left Column: Workflows List (4 cols) */}
          <div className="md:col-span-5 lg:col-span-4 bg-white border-r border-slate-200 p-5 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fluxos de Trabalho ({workflows.length})
                </h3>
              </div>
              {!isAddingWorkflow && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingWorkflow(true);
                    setNewWorkflowName('');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition-colors border border-amber-200/60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Fluxo
                </button>
              )}
            </div>

            {/* Add Workflow Form */}
            {isAddingWorkflow && (
              <form onSubmit={handleCreateWorkflow} className="mb-3 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-amber-900">Novo Fluxo de Trabalho</div>
                <input
                  type="text"
                  placeholder="Nome do fluxo (ex: Operações)..."
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingWorkflow(false)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newWorkflowName.trim()}
                    className="px-3 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-50 shadow-xs"
                  >
                    <Save className="w-3 h-3" />
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {/* Workflow Items List */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {loadingWorkflows ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando fluxos...</div>
              ) : workflows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Nenhum fluxo encontrado.</div>
              ) : (
                workflows.map((wf, idx) => {
                  const isSelected = wf.id === selectedWorkflowId;
                  const isLegacy = wf.id === 'wf-legacy';
                  const isEditing = editingWorkflowId === wf.id;

                  return (
                    <div
                      key={wf.id}
                      onClick={() => !isEditing && handleSelectWorkflow(wf.id)}
                      className={`group rounded-2xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingWorkflowName}
                              onChange={(e) => setEditingWorkflowName(e.target.value)}
                              autoFocus
                              className="flex-1 px-2.5 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none bg-white font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateWorkflowName(wf)}
                              className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingWorkflowId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">{wf.name}</span>
                              {isLegacy && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-600 rounded">
                                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                                  Legacy
                                </span>
                              )}
                              {!wf.active && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Ordem #{wf.orderIndex}
                            </div>
                          </div>
                        )}

                        {/* Workflow Action Buttons */}
                        {!isEditing && (
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveWorkflow(idx, 'up')}
                              disabled={idx === 0 || saving}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveWorkflow(idx, 'down')}
                              disabled={idx === workflows.length - 1 || saving}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWorkflowId(wf.id);
                                setEditingWorkflowName(wf.name);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-700 rounded"
                              title="Renomear fluxo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleWorkflowActive(wf)}
                              className={`p-1 rounded text-[10px] font-bold ${
                                wf.active
                                  ? 'text-emerald-700 hover:text-emerald-800'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={wf.active ? 'Desativar fluxo' : 'Ativar fluxo'}
                            >
                              {wf.active ? 'Ativo' : 'Off'}
                            </button>
                            {!isLegacy && (
                              <button
                                type="button"
                                onClick={() => handleDeleteWorkflow(wf)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Excluir fluxo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <ChevronRight className={`w-4 h-4 ml-1 ${isSelected ? 'text-amber-600' : 'text-slate-300'}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Stages List of Selected Workflow (8 cols) */}
          <div className="md:col-span-7 lg:col-span-8 p-6 flex flex-col h-full overflow-y-auto">
            {currentWorkflow ? (
              <>
                {/* Workflow Header in details */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold font-serif-heading text-slate-900">
                        {currentWorkflow.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        currentWorkflow.active
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentWorkflow.active ? 'Fluxo Ativo' : 'Fluxo Desativado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure as colunas do Kanban, estágio inicial padrão e etapas conclusivas.
                    </p>
                  </div>

                  {!isAddingStage && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingStage(true);
                        setNewStageName('');
                        setNewStageIsInitial(false);
                        setNewStageIsFinal(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Etapa
                    </button>
                  )}
                </div>

                {/* Add Stage Form */}
                {isAddingStage && (
                  <form onSubmit={handleCreateStage} className="bg-white p-4 rounded-2xl border border-amber-300 shadow-xs mb-4 space-y-3">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nova Etapa para "{currentWorkflow.name}"</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nome da Etapa *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Em Revisão, Homologação..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          autoFocus
                          required
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={newStageIsInitial}
                          onChange={(e) => setNewStageIsInitial(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">Estágio Inicial</div>
                          <div className="text-[10px] text-slate-400">Novas tarefas entrarão nesta etapa</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={newStageIsFinal}
                          onChange={(e) => setNewStageIsFinal(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">Estágio Final / Concluído</div>
                          <div className="text-[10px] text-slate-400">Marca a tarefa como finalizada</div>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingStage(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !newStageName.trim()}
                        className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Criar Etapa
                      </button>
                    </div>
                  </form>
                )}

                {/* Stages List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  {loadingStages ? (
                    <div className="py-12 text-center text-xs text-slate-400">Carregando etapas...</div>
                  ) : stages.length === 0 ? (
                    <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 p-6">
                      <p>Nenhuma etapa configurada para este fluxo.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingStage(true)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar primeira etapa
                      </button>
                    </div>
                  ) : (
                    stages.map((st, idx) => {
                      const isEditing = editingStageId === st.id;

                      return (
                        <div
                          key={st.id}
                          className={`bg-white rounded-2xl border p-3.5 transition-all shadow-xs ${
                            st.isInitial
                              ? 'border-amber-300 ring-1 ring-amber-200/50'
                              : st.isFinal
                              ? 'border-emerald-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingStageName}
                                  onChange={(e) => setEditingStageName(e.target.value)}
                                  autoFocus
                                  className="flex-1 px-3 py-1.5 text-xs border border-amber-400 rounded-xl focus:outline-none font-semibold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStageName(st)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                  title="Salvar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStageId(null)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {st.orderIndex || idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">{st.name}</span>
                                    {st.isInitial && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                                        <Flag className="w-2.5 h-2.5 text-amber-600" />
                                        Estágio Inicial
                                      </span>
                                    )}
                                    {st.isFinal && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                        Conclusivo
                                      </span>
                                    )}
                                    {!st.active && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-500 rounded">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Stage Action Buttons */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Set as initial */}
                                <button
                                  type="button"
                                  onClick={() => handleSetInitialStage(st)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                    st.isInitial
                                      ? 'bg-amber-100 text-amber-900 cursor-default'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                                  }`}
                                  title={st.isInitial ? 'Estágio inicial ativo' : 'Definir como estágio inicial padrão'}
                                >
                                  <Flag className="w-3 h-3" />
                                  <span>{st.isInitial ? 'Inicial' : 'Tornar Inicial'}</span>
                                </button>

                                {/* Toggle Final */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleFinalStage(st)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                    st.isFinal
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                                  }`}
                                  title="Marcar como estágio final/conclusão de tarefa"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{st.isFinal ? 'Final' : 'Final?'}</span>
                                </button>

                                {/* Move Up/Down */}
                                <button
                                  type="button"
                                  onClick={() => handleMoveStage(idx, 'up')}
                                  disabled={idx === 0 || saving}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStage(idx, 'down')}
                                  disabled={idx === stages.length - 1 || saving}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Rename */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStageId(st.id);
                                    setEditingStageName(st.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                                  title="Renomear etapa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStage(st)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                  title="Excluir etapa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Layers className="w-8 h-8 text-slate-300 mb-2" />
                <p>Selecione um fluxo de trabalho à esquerda para visualizar suas etapas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Regra de integridade: Etapas e fluxos contendo tarefas não podem ser excluídos destrutivamente.
          </div>
          <button
            type="button"
            onClick={() => onClose(hasChanges)}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
