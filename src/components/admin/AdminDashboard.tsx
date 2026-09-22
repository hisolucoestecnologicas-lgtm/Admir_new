import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  FolderKanban,
  Newspaper,
  Users2,
  CheckSquare,
  Shield,
  ArrowRight,
  TrendingUp,
  Heart,
  Plus,
  Clock,
  Sparkles,
  Filter,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ListTodo,
  Layers,
  BarChart3,
  User,
  RotateCcw,
  Activity,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';
import { AuditLog, Task, TaskWorkspace, TaskWorkflow, TaskWorkflowStage } from '../../types';
import { AdminSection } from './AdminLayout';

export function AdminDashboard({ onNavigate }: { onNavigate: (sec: AdminSection) => void }) {
  const { user, isOwner } = useAuth();
  const { programs, stories, ambassadors } = useSite();

  const [donationStats, setDonationStats] = useState<{ totalRaised: number; monthlyPledges: number; donationsReceived: number }>({
    totalRaised: 18450,
    monthlyPledges: 1450,
    donationsReceived: 78,
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  // Task Executive Dashboard State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>([]);
  const [workflows, setWorkflows] = useState<TaskWorkflow[]>([]);
  const [stagesMap, setStagesMap] = useState<Record<string, TaskWorkflowStage[]>>({});
  const [blockedTaskIds, setBlockedTaskIds] = useState<string[]>([]);
  const [loadingTaskData, setLoadingTaskData] = useState(true);

  // Filters
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterWorkflow, setFilterWorkflow] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const dRes = await api.getDonations();
        setDonationStats(dRes.stats);
      } catch (e) {
        // user may not have permission to view donations
      }

      try {
        const logs = await api.getHistory();
        setRecentLogs(logs.slice(0, 5));
      } catch (e) {
        // user may not have permission to view history
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTaskDashboardData() {
      setLoadingTaskData(true);
      try {
        const [wsRes, wfRes, tasksRes, depRes] = await Promise.all([
          api.getWorkspaces().catch(() => []),
          api.getWorkflows(undefined, true).catch(() => []),
          api.getTasks().catch(() => []),
          api.getAllTaskDependencies().catch(() => ({ dependencies: [], blockedTaskIds: [] })),
        ]);

        setWorkspaces(wsRes);
        setWorkflows(wfRes);
        setTasks(tasksRes);
        setBlockedTaskIds(depRes.blockedTaskIds || []);

        // Fetch stages for all workflows
        const stagePromises = wfRes.map((wf) =>
          api
            .getStages(wf.id, true)
            .then((st) => ({ wfId: wf.id, stages: st }))
            .catch(() => ({ wfId: wf.id, stages: [] }))
        );
        const stageResults = await Promise.all(stagePromises);
        const sMap: Record<string, TaskWorkflowStage[]> = {};
        stageResults.forEach((res) => {
          sMap[res.wfId] = res.stages;
        });
        setStagesMap(sMap);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard de tarefas:', err);
      } finally {
        setLoadingTaskData(false);
      }
    }
    loadTaskDashboardData();
  }, []);

  // When workflow filter changes, clear stage filter if not belonging
  const handleWorkflowFilterChange = (wfId: string) => {
    setFilterWorkflow(wfId);
    setFilterStage('');
  };

  // Stage options based on current workflow filter
  const availableStages = filterWorkflow
    ? stagesMap[filterWorkflow] || []
    : Object.values(stagesMap).flat();

  // Workflows filtered by selected workspace
  const availableWorkflows = filterWorkspace
    ? workflows.filter((wf) => wf.workspaceId === filterWorkspace)
    : workflows;

  // Unique list of assignees/responsibles
  const uniqueResponsibles = Array.from(
    new Set(tasks.map((t) => t.responsible).filter(Boolean))
  ).sort();

  // Filter tasks based on selected dropdowns
  const filteredTasks = tasks.filter((t) => {
    if (filterWorkspace && t.workspaceId && t.workspaceId !== filterWorkspace) return false;
    if (filterWorkflow && t.workflowId && t.workflowId !== filterWorkflow) return false;
    if (filterStage && t.stageId && t.stageId !== filterStage) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterResponsible && t.responsible && t.responsible !== filterResponsible) return false;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper checks
  const isFinalStage = (task: Task) => {
    if (task.column === 'done') return true;
    if (!task.workflowId || !task.stageId) return false;
    const wfStages = stagesMap[task.workflowId] || [];
    const st = wfStages.find((s) => s.id === task.stageId);
    return st?.isFinal === true;
  };

  const isInitialStage = (task: Task) => {
    if (task.column === 'todo') return true;
    if (!task.workflowId || !task.stageId) return false;
    const wfStages = stagesMap[task.workflowId] || [];
    const st = wfStages.find((s) => s.id === task.stageId);
    return st?.isInitial === true;
  };

  // KPIs
  const openTasksCount = filteredTasks.filter((t) => isInitialStage(t) || (!isFinalStage(t) && t.column === 'todo')).length;
  const inProgressCount = filteredTasks.filter((t) => !isFinalStage(t) && !isInitialStage(t) && t.column !== 'todo').length;
  const completedCount = filteredTasks.filter((t) => isFinalStage(t)).length;
  const overdueCount = filteredTasks.filter((t) => !isFinalStage(t) && t.dueDate && t.dueDate < todayStr).length;
  const blockedCount = filteredTasks.filter((t) => !isFinalStage(t) && blockedTaskIds.includes(t.id)).length;

  // Attention required tasks
  const attentionTasks = filteredTasks.filter((t) => {
    if (isFinalStage(t)) return false;
    const isOverdue = t.dueDate && t.dueDate < todayStr;
    const isBlocked = blockedTaskIds.includes(t.id);
    const isUrgent = t.priority === 'urgent';
    return isOverdue || isBlocked || isUrgent;
  });

  const hasActiveFilters = Boolean(filterWorkspace || filterWorkflow || filterStage || filterPriority || filterResponsible);

  const resetFilters = () => {
    setFilterWorkspace('');
    setFilterWorkflow('');
    setFilterStage('');
    setFilterPriority('');
    setFilterResponsible('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Missão Diplomática ADMIR — Centro de Comando
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif-heading">
            Olá, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Painel de controle institucional com controle de acesso granular (RBAC), auditoria imutável e gerenciamento editorial em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('news')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Notícia
          </button>
          <button
            type="button"
            onClick={() => onNavigate('donations')}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Doações
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              Convidar Admin
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('donations')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Arrecadado</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-serif-heading text-slate-900">
            ${donationStats.totalRaised.toLocaleString('en-US')} USD
          </div>
          <div className="text-[11px] text-slate-500">
            {donationStats.donationsReceived} contribuições registradas
          </div>
        </div>

        <div
          onClick={() => onNavigate('programs')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Programas Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-serif-heading text-slate-900">
            {programs.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Iniciativas de campo em andamento
          </div>
        </div>

        <div
          onClick={() => onNavigate('news')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Notícias Publicadas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Newspaper className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-serif-heading text-slate-900">
            {stories.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Reportagens e comunicados de campo
          </div>
        </div>

        <div
          onClick={() => onNavigate('ambassadors')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Corpo Diplomático</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-serif-heading text-slate-900">
            {ambassadors.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Embaixadores de paz acreditados
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Operations Matrix */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-serif-heading flex items-center justify-between">
            <span>Módulos de Gestão Rápida</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home-texts')}
              className="p-4 text-left rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Textos da Homepage</div>
              <div className="text-[11px] text-slate-500 mt-1">Editar hero, contadores de impacto e sobre nós.</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('media')}
              className="p-4 text-left rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Biblioteca de Mídia</div>
              <div className="text-[11px] text-slate-500 mt-1">Upload de fotografias com checagem de uso.</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="p-4 text-left rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Quadro Kanban</div>
              <div className="text-[11px] text-slate-500 mt-1">Organizar tarefas da missão, prazos e equipe.</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('sync')}
              className="p-4 text-left rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Sincronização de Dados</div>
              <div className="text-[11px] text-slate-500 mt-1">Importar dados de Produção para Dev com Dry Run e Backup.</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="p-4 text-left rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700">Auditoria Completa</div>
              <div className="text-[11px] text-slate-500 mt-1">Log imutável de todas as ações de administradores.</div>
            </button>
          </div>
        </div>

        {/* Recent Audit Log Feed */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif-heading flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Atividades Recentes de Auditoria</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              Ver Tudo →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Nenhum evento registrado recentemente.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="py-3 text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                        {log.module}
                      </span>
                      <span>{log.action}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                      {log.details || log.affectedRecord}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-slate-700 font-medium">{log.userName.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          GESTÃO OPERACIONAL — DASHBOARD EXECUTIVO DE TAREFAS
      ========================================================================= */}
      <div className="pt-6 border-t border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>Gestão Operacional</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-serif-heading text-slate-900 mt-1">
              Dashboard Executivo de Tarefas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Acompanhamento de volume, estágios, prioridades, gargalos e pendências em tempo real.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>Acessar Quadro Kanban</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Filtros Executivos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-amber-600" />
              <span>Filtros Operacionais Dinâmicos</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Filter Workspace */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Workspace
              </label>
              <select
                value={filterWorkspace}
                onChange={(e) => {
                  setFilterWorkspace(e.target.value);
                  setFilterWorkflow('');
                  setFilterStage('');
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="">Todos Workspaces</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Workflow */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Workflow
              </label>
              <select
                value={filterWorkflow}
                onChange={(e) => handleWorkflowFilterChange(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="">Todos Workflows</option>
                {availableWorkflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Stage */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Estágio / Stage
              </label>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="">Todos Estágios</option>
                {availableStages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Priority */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Prioridade
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="">Todas Prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>

            {/* Filter Responsible */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Responsável
              </label>
              <select
                value={filterResponsible}
                onChange={(e) => setFilterResponsible(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="">Todos Responsáveis</option>
                {uniqueResponsibles.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs de Tarefas Executivas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Abertas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Abertas</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-serif-heading text-slate-900">
              {loadingTaskData ? '...' : openTasksCount}
            </div>
            <div className="text-[11px] text-slate-500">Backlog / Pendentes</div>
          </div>

          {/* Em Andamento */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Em Andamento</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-serif-heading text-amber-700">
              {loadingTaskData ? '...' : inProgressCount}
            </div>
            <div className="text-[11px] text-slate-500">Em execução ativa</div>
          </div>

          {/* Concluídas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Concluídas</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-serif-heading text-emerald-700">
              {loadingTaskData ? '...' : completedCount}
            </div>
            <div className="text-[11px] text-slate-500">Finalizadas com êxito</div>
          </div>

          {/* Atrasadas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Atrasadas</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-serif-heading text-rose-600">
              {loadingTaskData ? '...' : overdueCount}
            </div>
            <div className="text-[11px] text-rose-500 font-medium">Fora do prazo</div>
          </div>

          {/* Bloqueadas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Bloqueadas</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-serif-heading text-purple-700">
              {loadingTaskData ? '...' : blockedCount}
            </div>
            <div className="text-[11px] text-purple-600 font-medium">Trava de dependência</div>
          </div>
        </div>

        {/* Gráficos e Distribuição Operacional */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Distribuição por Workflow */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif-heading flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Distribuição por Workflow</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Total: {filteredTasks.length} tarefas
              </span>
            </h3>

            <div className="space-y-4 pt-1">
              {workflows.map((wf) => {
                const wfTasks = filteredTasks.filter((t) => t.workflowId === wf.id);
                const totalWf = wfTasks.length;
                const completedWf = wfTasks.filter((t) => isFinalStage(t)).length;
                const pct = totalWf > 0 ? Math.round((completedWf / totalWf) * 100) : 0;

                return (
                  <div key={wf.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{wf.name}</span>
                        {!wf.active && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            Inativo
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {completedWf}/{totalWf} ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-600 h-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribuição por Prioridade */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>Distribuição por Prioridade</span>
            </h3>

            {(() => {
              const urgent = filteredTasks.filter((t) => t.priority === 'urgent').length;
              const high = filteredTasks.filter((t) => t.priority === 'high').length;
              const medium = filteredTasks.filter((t) => t.priority === 'medium').length;
              const low = filteredTasks.filter((t) => t.priority === 'low').length;
              const total = filteredTasks.length || 1;

              return (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-rose-700">Urgente</span>
                      <span className="text-slate-500">{urgent} tarefas ({Math.round((urgent / total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-600 h-full" style={{ width: `${(urgent / total) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-amber-700">Alta</span>
                      <span className="text-slate-500">{high} tarefas ({Math.round((high / total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${(high / total) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-blue-700">Média</span>
                      <span className="text-slate-500">{medium} tarefas ({Math.round((medium / total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${(medium / total) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-600">Baixa</span>
                      <span className="text-slate-500">{low} tarefas ({Math.round((low / total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full" style={{ width: `${(low / total) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Atividades que Exigem Atenção & Resumo Operacional */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Atividades que Exigem Atenção */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-serif-heading flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Atividades que Exigem Atenção ({attentionTasks.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                Abrir Kanban →
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {attentionTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  Nenhuma tarefa com atraso, bloqueio por dependência ou prioridade urgente no momento.
                </div>
              ) : (
                attentionTasks.map((task) => {
                  const isOverdue = task.dueDate && task.dueDate < todayStr;
                  const isBlocked = blockedTaskIds.includes(task.id);
                  const isUrgent = task.priority === 'urgent';
                  const wfName = workflows.find((w) => w.id === task.workflowId)?.name || 'Geral';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onNavigate('tasks')}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900 hover:text-amber-700">
                          {task.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{wfName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {task.responsible || 'Sem responsável'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            Bloqueada
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Atrasada
                          </span>
                        )}
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Urgente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Resumo Operacional */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif-heading flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Resumo Operacional</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">
                  Taxa Global de Conclusão
                </div>
                <div className="text-2xl font-black text-slate-900 font-serif-heading">
                  {filteredTasks.length > 0
                    ? `${Math.round((completedCount / filteredTasks.length) * 100)}%`
                    : '0%'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {completedCount} de {filteredTasks.length} tarefas filtradas concluídas.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">
                  Bloqueios por Dependência
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {blockedCount} tarefa(s) impedida(s)
                </div>
                <p className="text-[11px] text-slate-500">
                  Trava de transição ativada via regra server-side.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Histórico de Tendência</span>
                </div>
                <p className="text-amber-800/80 leading-relaxed">
                  Histórico de amostragem em fase inicial. O comparativo mensal de velocidade operacional estará disponível após o fechamento do ciclo corrente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
