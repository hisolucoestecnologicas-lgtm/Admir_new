import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  X,
  Save,
  Send,
  Settings,
  ListTodo,
  CheckCircle2,
  Edit2,
  Check,
  Paperclip,
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  FolderOpen,
  Search,
  Loader2,
  Link2,
  Lock,
  Unlock,
  ShieldAlert,
  Users,
  Tag,
  Copy,
  Maximize2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';
import { Task, TaskColumn, TaskPriority, TaskChecklistItem, TaskComment, TaskAttachment, TaskDependency, MediaAsset, TaskParticipant } from '../../types';
import { WorkflowManagerModal } from './WorkflowManagerModal';
import { TaskResponsibleSelect, TaskParticipantsSelect, EligibleUser } from './TaskUserSelect';
import { ExpandedTaskView } from './ExpandedTaskView';

export function AdminTasks() {
  const { user, hasPermission } = useAuth();
  const { success, error } = useToast();
  const { selectedParam, navigateTo } = useSite();

  const canCreate = hasPermission('tasks.create');
  const canEdit = hasPermission('tasks.edit');
  const canDelete = hasPermission('tasks.delete');
  const canMove = hasPermission('tasks.move');
  const canManageWorkflows = hasPermission('tasks.manage_workflows') || user?.role === 'owner' || user?.role === 'manager';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Expanded Task View states
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(() => {
    if (selectedParam && selectedParam.startsWith('tasks/')) {
      return selectedParam.replace('tasks/', '').trim() || null;
    }
    return null;
  });
  const [expandedTask, setExpandedTask] = useState<Task | null>(null);
  const [loadingExpandedTask, setLoadingExpandedTask] = useState<boolean>(false);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Checklist states
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // Comment states
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Attachment states
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showMediaPickerModal, setShowMediaPickerModal] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dependencies states
  const [allDependencies, setAllDependencies] = useState<TaskDependency[]>([]);
  const [blockedTaskIds, setBlockedTaskIds] = useState<string[]>([]);
  const [allAvailableTasks, setAllAvailableTasks] = useState<Task[]>([]);
  const [taskDependenciesData, setTaskDependenciesData] = useState<{
    dependencies: TaskDependency[];
    dependentTasks: TaskDependency[];
    isBlocked: boolean;
    blockingCount: number;
    blockingDependencies: Array<{
      dependencyId: string;
      dependsOnTaskId: string;
      dependsOnTaskTitle: string;
      workflowName: string;
      stageName: string;
      isFinal: boolean;
    }>;
  } | null>(null);
  const [selectedDepTaskId, setSelectedDepTaskId] = useState<string>('');
  const [isAddingDep, setIsAddingDep] = useState(false);

  const getTaskUrl = (taskId: string) => {
    return `${window.location.origin}${window.location.pathname}#admin/tasks/${taskId}`;
  };

  const handleCopyTaskLink = async (taskId: string) => {
    const url = getTaskUrl(taskId);
    try {
      await navigator.clipboard.writeText(url);
      success('Link Copiado!', 'O link direto para a tarefa foi copiado para a área de transferência.');
    } catch (err) {
      error('Erro ao copiar', 'Não foi possível copiar o link.');
    }
  };

  const handleOpenInNewTab = (taskId: string) => {
    const url = getTaskUrl(taskId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExpandTask = (taskToExpand: Task) => {
    setSelectedTask(null);
    setIsEditing(false);
    setExpandedTaskId(taskToExpand.id);
    setExpandedTask(taskToExpand);
    navigateTo('admin', `tasks/${taskToExpand.id}`);
  };

  const handleBackToKanban = () => {
    setExpandedTaskId(null);
    setExpandedTask(null);
    navigateTo('admin', 'tasks');
    fetchTasks();
  };

  const loadExpandedTask = async (id: string) => {
    setLoadingExpandedTask(true);
    try {
      const t = await api.getTask(id);
      setExpandedTask(t);
    } catch (err: any) {
      console.error('Erro ao carregar tarefa expandida:', err);
      setExpandedTask(null);
      error('Tarefa Não Encontrada', 'A tarefa solicitada não foi localizada.');
    } finally {
      setLoadingExpandedTask(false);
    }
  };

  useEffect(() => {
    if (selectedParam && selectedParam.startsWith('tasks/')) {
      const id = selectedParam.replace('tasks/', '').trim();
      if (id) {
        setExpandedTaskId(id);
        loadExpandedTask(id);
      }
    } else if (selectedParam === 'tasks' || !selectedParam) {
      setExpandedTaskId(null);
      setExpandedTask(null);
    }
  }, [selectedParam]);

  const fetchDependencies = async () => {
    try {
      const res = await api.getAllTaskDependencies();
      setAllDependencies(res.dependencies || []);
      setBlockedTaskIds(res.blockedTaskIds || []);
    } catch (e) {
      console.error('Erro ao buscar dependências:', e);
    }
  };

  const fetchAllTasks = async () => {
    try {
      const allT = await api.getTasks('', '');
      setAllAvailableTasks(allT.filter(t => t.title && t.id));
    } catch (e) {
      console.error('Erro ao buscar tarefas para dependências:', e);
    }
  };

  const loadSelectedTaskDependencies = async (taskId: string) => {
    try {
      const data = await api.getTaskDependencies(taskId);
      setTaskDependenciesData(data);
    } catch (e: any) {
      console.error('Erro ao carregar dependências da tarefa:', e);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchAllTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      loadSelectedTaskDependencies(selectedTask.id);
      fetchAllTasks();
    } else {
      setTaskDependenciesData(null);
    }
  }, [selectedTask?.id]);

  const handleAddDependency = async () => {
    if (!selectedTask || !selectedDepTaskId) return;
    setIsAddingDep(true);
    try {
      await api.addTaskDependency(selectedTask.id, selectedDepTaskId);
      success('Dependência Adicionada', 'A dependência foi registrada com sucesso.');
      setSelectedDepTaskId('');
      await loadSelectedTaskDependencies(selectedTask.id);
      await fetchDependencies();
    } catch (err: any) {
      error('Erro ao adicionar dependência', err.message);
    } finally {
      setIsAddingDep(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!selectedTask) return;
    if (!window.confirm('Remover esta dependência?')) return;
    try {
      await api.removeTaskDependency(selectedTask.id, depId);
      success('Dependência Removida', 'A dependência foi desvinculada com sucesso.');
      await loadSelectedTaskDependencies(selectedTask.id);
      await fetchDependencies();
    } catch (err: any) {
      error('Erro ao remover dependência', err.message);
    }
  };

  // Form states (Modal)
  const [modalWorkflows, setModalWorkflows] = useState<any[]>([]);
  const [modalStages, setModalStages] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [modalWorkspaceId, setModalWorkspaceId] = useState<string>('');
  const [modalWorkflowId, setModalWorkflowId] = useState<string>('');
  const [modalStageId, setModalStageId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<TaskParticipant[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchEligibleUsers = async () => {
    try {
      const list = await api.getEligibleTaskUsers();
      setEligibleUsers(list || []);
    } catch (e: any) {
      console.error('Erro ao buscar usuários elegíveis', e);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setResponsible('');
    setResponsibleId('');
    setSelectedParticipants([]);
  };

  const fetchKanbanConfig = async () => {
    try {
      await fetchEligibleUsers();
      const ws = await api.getWorkspaces();
      setWorkspaces(ws);
      if (ws.length > 0) {
        setSelectedWorkspaceId(ws[0].id);
        setModalWorkspaceId(ws[0].id);
        const wf = await api.getWorkflows(ws[0].id);
        setWorkflows(wf);
        // Modal workflows: exclude Legacy
        const filteredModalWf = wf.filter((w: any) => w.name !== 'Legacy');
        setModalWorkflows(filteredModalWf);

        if (wf.length > 0) {
            setSelectedWorkflowId(wf[0].id);
            const st = await api.getStages(wf[0].id);
            setStages(st);
        }

        if (filteredModalWf.length > 0) {
            setModalWorkflowId(filteredModalWf[0].id);
            const mst = await api.getStages(filteredModalWf[0].id);
            setModalStages(mst);
            const initial = mst.find((s: any) => s.isInitial);
            if (initial) setModalStageId(initial.id);
            else if (mst.length > 0) setModalStageId(mst[0].id);
        }
      }
    } catch (e: any) {
      error('Erro ao buscar configuração Kanban', e.message);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks(selectedWorkspaceId, selectedWorkflowId);
      setTasks(data);
      await fetchDependencies();
    } catch (e: any) {
      error('Erro ao buscar tarefas', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanConfig();
  }, []);

  useEffect(() => {
    if (selectedWorkflowId) {
        api.getStages(selectedWorkflowId).then(setStages);
        fetchTasks();
    }
  }, [selectedWorkspaceId, selectedWorkflowId]);

  useEffect(() => {
    if (modalWorkspaceId) {
      api.getWorkflows(modalWorkspaceId).then(wf => {
        const filtered = wf.filter((w: any) => w.name !== 'Legacy');
        setModalWorkflows(filtered);
        if (filtered.length > 0) {
          setModalWorkflowId(filtered[0].id);
        } else {
          setModalWorkflowId('');
          setModalStages([]);
          setModalStageId('');
        }
      });
    }
  }, [modalWorkspaceId]);

  useEffect(() => {
    if (modalWorkflowId) {
      api.getStages(modalWorkflowId).then(mst => {
        setModalStages(mst);
        const initial = mst.find((s: any) => s.isInitial);
        if (initial) setModalStageId(initial.id);
        else if (mst.length > 0) setModalStageId(mst[0].id);
        else setModalStageId('');
      });
    }
  }, [modalWorkflowId]);

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description || '');
      setPriority(selectedTask.priority);
      setDueDate(selectedTask.dueDate || '');
      setResponsible(selectedTask.responsible || '');
      setResponsibleId(selectedTask.responsibleId || '');
      setSelectedParticipants(selectedTask.participants || []);
      setModalWorkspaceId(selectedTask.workspaceId);
      setModalWorkflowId(selectedTask.workflowId);
      setModalStageId(selectedTask.stageId);
    }
  }, [selectedTask]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      error('Informe o título da tarefa.');
      return;
    }
    if (!modalStageId) {
      error('Selecione uma etapa para a nova tarefa.');
      return;
    }

    try {
      const newTask = await api.createTask({
        title: title.trim(),
        description: description.trim(),
        workspaceId: modalWorkspaceId,
        workflowId: modalWorkflowId,
        stageId: modalStageId,
        priority,
        dueDate: dueDate || new Date().toISOString().slice(0, 10),
        responsible: responsible.trim() || '',
        responsibleId: responsibleId || undefined,
        participantIds: selectedParticipants.map(p => p.id),
      });

      setTasks(prev => [newTask, ...prev]);
      setShowNewModal(false);
      resetForm();
      success(
        'Tarefa Criada!',
        newTask.ticketNumber ? `Ticket gerado: ${newTask.ticketNumber}` : 'Adicionada ao quadro com sucesso.'
      );
      fetchTasks();
    } catch (err: any) {
      error('Erro ao criar tarefa', err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !title.trim()) {
      error('O título da tarefa é obrigatório.');
      return;
    }

    try {
      const updated = await api.updateTask(selectedTask.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        responsible: responsible.trim(),
        responsibleId: responsibleId || undefined,
        participantIds: selectedParticipants.map(p => p.id),
      });

      success('Tarefa Atualizada!', 'As alterações foram salvas com sucesso.');
      setIsEditing(false);
      
      // Update lists without reload
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      setSelectedTask(updated);
    } catch (err: any) {
      error('Erro ao atualizar tarefa', err.message);
    }
  };

  const handleMoveStatus = async (task: Task, nextStageId: string) => {
    if (!canMove) {
      error('Acesso Negado', 'Permissão insuficiente para alterar etapa de tarefas.');
      return;
    }

    const previousStageId = task.stageId;
    const previousTasks = [...tasks];

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stageId: nextStageId, updatedAt: new Date().toISOString() } : t));
    if (selectedTask?.id === task.id) {
      setSelectedTask({ ...selectedTask, stageId: nextStageId, updatedAt: new Date().toISOString() });
    }

    try {
      const updated = await api.updateTask(task.id, { stageId: nextStageId });
      // Sync with real data (updatedAt, etc)
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      if (selectedTask?.id === updated.id) {
        setSelectedTask(updated);
      }
    } catch (err: any) {
      // Rollback
      setTasks(previousTasks);
      if (selectedTask?.id === task.id) {
        setSelectedTask(previousTasks.find(t => t.id === task.id) || null);
      }
      error('Erro ao mover tarefa', err.message);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(stageId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverStageId(null);

    if (!taskId) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.stageId === stageId) return;

    await handleMoveStatus(task, stageId);
  };

  const handleDelete = async (taskId: string) => {
    if (!canDelete) {
      error('Acesso Negado', 'Permissão insuficiente para excluir tarefas.');
      return;
    }
    if (!window.confirm('Excluir esta tarefa definitivamente?')) return;

    try {
      await api.deleteTask(taskId);
      success('Tarefa Excluída', 'A tarefa foi removida.');
      setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      error('Erro ao excluir', err.message);
    }
  };

  // --- CHECKLIST HANDLERS ---
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newChecklistText.trim()) return;

    try {
      const newItem = await api.addChecklistItem(selectedTask.id, newChecklistText.trim());
      setNewChecklistText('');
      const updatedChecklist = [...(selectedTask.checklist || []), newItem];
      const updatedTask: Task = { ...selectedTask, checklist: updatedChecklist, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      success('Item Adicionado', 'Subtarefa adicionada com sucesso.');
    } catch (err: any) {
      error('Erro ao adicionar item', err.message);
    }
  };

  const handleToggleChecklistItem = async (item: TaskChecklistItem) => {
    if (!selectedTask || !canEdit) return;

    const newCompleted = !item.completed;
    // Optimistic UI Update
    const updatedChecklist = (selectedTask.checklist || []).map(i =>
      i.id === item.id ? { ...i, completed: newCompleted, updatedAt: new Date().toISOString() } : i
    );
    const updatedTask: Task = { ...selectedTask, checklist: updatedChecklist, updatedAt: new Date().toISOString() };
    setSelectedTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));

    try {
      const savedItem = await api.updateChecklistItem(selectedTask.id, item.id, { completed: newCompleted });
      const syncedChecklist = (selectedTask.checklist || []).map(i =>
        i.id === item.id ? savedItem : i
      );
      const syncedTask: Task = { ...selectedTask, checklist: syncedChecklist };
      setSelectedTask(syncedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? syncedTask : t));
    } catch (err: any) {
      // Rollback on error
      setSelectedTask(selectedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t));
      error('Erro ao atualizar item', err.message);
    }
  };

  const handleSaveChecklistEdit = async (itemId: string) => {
    if (!selectedTask || !editingChecklistText.trim()) {
      setEditingChecklistId(null);
      return;
    }

    try {
      const savedItem = await api.updateChecklistItem(selectedTask.id, itemId, { title: editingChecklistText.trim() });
      const updatedChecklist = (selectedTask.checklist || []).map(i =>
        i.id === itemId ? savedItem : i
      );
      const updatedTask: Task = { ...selectedTask, checklist: updatedChecklist, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setEditingChecklistId(null);
      setEditingChecklistText('');
      success('Item Atualizado', 'Subtarefa atualizada.');
    } catch (err: any) {
      error('Erro ao editar item', err.message);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!selectedTask || !canEdit) return;

    try {
      await api.deleteChecklistItem(selectedTask.id, itemId);
      const updatedChecklist = (selectedTask.checklist || []).filter(i => i.id !== itemId);
      const updatedTask: Task = { ...selectedTask, checklist: updatedChecklist, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      success('Item Removido', 'Subtarefa excluída.');
    } catch (err: any) {
      error('Erro ao excluir item', err.message);
    }
  };

  // --- COMMENT HANDLERS ---
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    try {
      const comment = await api.addTaskComment(selectedTask.id, newCommentText.trim());
      setNewCommentText('');
      const updatedComments = [...(selectedTask.comments || []), comment];
      const updatedTask: Task = { ...selectedTask, comments: updatedComments, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      success('Comentário Adicionado', 'Observação salva na tarefa.');
    } catch (err: any) {
      error('Erro ao comentar', err.message);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!selectedTask || !editingCommentText.trim()) {
      setEditingCommentId(null);
      return;
    }

    try {
      const updatedComment = await api.updateTaskComment(selectedTask.id, commentId, editingCommentText.trim());
      const updatedComments = (selectedTask.comments || []).map(c =>
        c.id === commentId ? updatedComment : c
      );
      const updatedTask: Task = { ...selectedTask, comments: updatedComments, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setEditingCommentId(null);
      setEditingCommentText('');
      success('Comentário Atualizado', 'Comentário editado com sucesso.');
    } catch (err: any) {
      error('Erro ao editar comentário', err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    if (!window.confirm('Excluir este comentário?')) return;

    try {
      await api.deleteTaskComment(selectedTask.id, commentId);
      const updatedComments = (selectedTask.comments || []).filter(c => c.id !== commentId);
      const updatedTask: Task = { ...selectedTask, comments: updatedComments, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      success('Comentário Removido', 'Comentário excluído.');
    } catch (err: any) {
      error('Erro ao excluir comentário', err.message);
    }
  };

  // --- ATTACHMENT HANDLERS ---
  const handleOpenMediaPicker = async () => {
    setShowMediaPickerModal(true);
    setLoadingMedia(true);
    try {
      const media = await api.getMedia();
      setMediaAssets(media);
    } catch (err: any) {
      error('Erro ao carregar Biblioteca de Mídia', err.message);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleAttachFromMedia = async (mediaItem: MediaAsset) => {
    if (!selectedTask) return;

    try {
      const newAtt = await api.addTaskAttachment(selectedTask.id, {
        mediaId: mediaItem.id,
        url: mediaItem.url,
        originalName: mediaItem.originalName || mediaItem.title || 'Arquivo de Mídia',
        mimeType: mediaItem.mimeType || 'application/octet-stream',
        sizeBytes: mediaItem.sizeBytes || 0,
      });

      const updatedAttachments = [...(selectedTask.attachments || []), newAtt];
      const updatedTask: Task = { ...selectedTask, attachments: updatedAttachments, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setShowMediaPickerModal(false);
      success('Arquivo Anexado', `"${newAtt.originalName}" foi vinculado com sucesso.`);
    } catch (err: any) {
      error('Erro ao anexar arquivo', err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    e.target.value = '';

    // Size limit: 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      error('Arquivo Muito Grande', 'O tamanho máximo permitido é de 15MB.');
      return;
    }

    // Extension check
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const FORBIDDEN_EXTS = ['exe', 'bat', 'cmd', 'sh', 'js', 'html', 'htm', 'php', 'vbs', 'py', 'bin', 'jar', 'apk', 'com', 'scr', 'msi', 'ps1', 'cgi', 'pl', 'wsf'];
    if (FORBIDDEN_EXTS.includes(ext)) {
      error('Arquivo Não Permitido', `Arquivos .${ext} não são permitidos por segurança.`);
      return;
    }

    const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
    if (!ALLOWED_EXTS.includes(ext)) {
      error('Extensão Inválida', `Extensão .${ext} não suportada. Use PDF, imagens, documentos Word, planilhas ou textos.`);
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const newAtt = await api.addTaskAttachment(selectedTask.id, {
            url: base64Data,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          });

          const updatedAttachments = [...(selectedTask.attachments || []), newAtt];
          const updatedTask: Task = { ...selectedTask, attachments: updatedAttachments, updatedAt: new Date().toISOString() };
          setSelectedTask(updatedTask);
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
          success('Arquivo Anexado', `"${file.name}" foi enviado e anexado à tarefa.`);
        } catch (err: any) {
          error('Erro ao enviar anexo', err.message);
        } finally {
          setIsUploadingAttachment(false);
        }
      };
      reader.onerror = () => {
        error('Erro de Leitura', 'Não foi possível ler o arquivo selecionado.');
        setIsUploadingAttachment(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      error('Erro ao processar arquivo', err.message);
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, filename: string) => {
    if (!selectedTask) return;
    if (!window.confirm(`Remover o anexo "${filename}" desta tarefa?`)) return;

    try {
      await api.deleteTaskAttachment(selectedTask.id, attachmentId);
      const updatedAttachments = (selectedTask.attachments || []).filter(a => a.id !== attachmentId);
      const updatedTask: Task = { ...selectedTask, attachments: updatedAttachments, updatedAt: new Date().toISOString() };
      setSelectedTask(updatedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      success('Anexo Removido', `O anexo "${filename}" foi desvinculado com sucesso.`);
    } catch (err: any) {
      error('Erro ao remover anexo', err.message);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string, filename?: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-sky-600" />;
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return <FileText className="w-4 h-4 text-rose-600" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Urgente</span>;
      case 'high':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Alta</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Média</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Baixa</span>;
    }
  };

  if (expandedTaskId) {
    if (loadingExpandedTask) {
      return (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-xs font-semibold">Carregando detalhes da tarefa...</p>
        </div>
      );
    }

    if (!expandedTask) {
      return (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-serif-heading">Tarefa Não Encontrada</h3>
          <p className="text-xs text-slate-500">
            A tarefa solicitada (ID: <span className="font-mono text-slate-700 font-bold">{expandedTaskId}</span>) não foi localizada ou foi excluída.
          </p>
          <button
            type="button"
            onClick={handleBackToKanban}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Quadro Kanban</span>
          </button>
        </div>
      );
    }

    return (
      <ExpandedTaskView
        task={expandedTask}
        workspaces={workspaces}
        workflows={workflows}
        stages={stages}
        eligibleUsers={eligibleUsers}
        canEdit={canEdit}
        canDelete={canDelete}
        canMove={canMove}
        onBack={handleBackToKanban}
        onTaskUpdated={(updated) => {
          setExpandedTask(updated);
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onDeleteTask={async (taskId) => {
          await handleDelete(taskId);
          handleBackToKanban();
        }}
        onOpenInNewTab={handleOpenInNewTab}
        onCopyLink={handleCopyTaskLink}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Quadro Kanban & Tarefas Operacionais
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento interno de missões de campo, preparativos consulares e entregas institucionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <select
              value={selectedWorkspaceId}
              onChange={(e) => {
                  setSelectedWorkspaceId(e.target.value);
                  api.getWorkflows(e.target.value).then(wf => {
                      setWorkflows(wf);
                      if (wf.length > 0) setSelectedWorkflowId(wf[0].id);
                  });
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
            <select
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {workflows.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
            </select>
          </div>

          {canManageWorkflows && (
            <button
              type="button"
              onClick={() => setShowWorkflowModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
              title="Gerenciar Fluxos e Etapas do Kanban"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Gerenciar Fluxos</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowNewModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por Ticket (ex: ADMIR-000001), título, responsável ou participante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-medium">
            Exibindo <strong className="text-slate-800">
              {tasks.filter((t) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                const matchTicket = t.ticketNumber ? t.ticketNumber.toLowerCase().includes(q) : false;
                const matchTitle = t.title ? t.title.toLowerCase().includes(q) : false;
                const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
                const matchResponsible = t.responsible ? t.responsible.toLowerCase().includes(q) : false;
                const matchParticipants = t.participants ? t.participants.some(p => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q))) : false;
                return matchTicket || matchTitle || matchDesc || matchResponsible || matchParticipants;
              }).length}
            </strong> de <strong className="text-slate-800">{tasks.length}</strong> tarefas
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-bold text-amber-700 hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Kanban Board */}
      <div className="relative">
        <div 
          className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scroll-smooth min-h-[650px] max-h-[75vh]"
          style={{ scrollbarWidth: 'thin' }}
        >
          {stages.sort((a, b) => a.orderIndex - b.orderIndex).map(stage => {
              const stageTasks = tasks.filter(t => {
                if (t.stageId !== stage.id) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                const matchTicket = t.ticketNumber ? t.ticketNumber.toLowerCase().includes(q) : false;
                const matchTitle = t.title ? t.title.toLowerCase().includes(q) : false;
                const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
                const matchResponsible = t.responsible ? t.responsible.toLowerCase().includes(q) : false;
                const matchParticipants = t.participants ? t.participants.some(p => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q))) : false;
                return matchTicket || matchTitle || matchDesc || matchResponsible || matchParticipants;
              });
              const isOver = dragOverStageId === stage.id;

              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`flex-shrink-0 w-80 snap-start bg-slate-50 border-2 rounded-3xl p-4 flex flex-col transition-all duration-200 ${
                    isOver ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-widest truncate max-w-[180px]">
                        {stage.name}
                      </h3>
                    </div>
                    <span className="bg-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {stageTasks.length}
                    </span>
                  </div>
                  
                  <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                      {stageTasks.length === 0 ? (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Nenhuma tarefa</p>
                        </div>
                      ) : (
                        stageTasks.map((t) => (
                          <div
                            key={t.id}
                            draggable={canMove}
                            onDragStart={(e) => handleDragStart(e, t.id)}
                            onClick={() => setSelectedTask(t)}
                            className={`group bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-grab active:cursor-grabbing space-y-3 relative overflow-hidden ${
                              draggedTaskId === t.id ? 'opacity-40 grayscale-[0.5]' : ''
                            }`}
                          >
                            {/* Priority accent */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${
                              t.priority === 'urgent' ? 'bg-rose-500' :
                              t.priority === 'high' ? 'bg-amber-500' :
                              t.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />

                            <div className="flex items-center justify-between pl-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {t.ticketNumber && (
                                  <span 
                                    className="font-mono text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200/80 shadow-2xs tracking-tight"
                                    title={`Ticket: ${t.ticketNumber}`}
                                  >
                                    {t.ticketNumber}
                                  </span>
                                )}
                                {getPriorityBadge(t.priority)}
                              </div>
                              {t.dueDate && (
                                <span className={`text-[10px] flex items-center gap-1 font-medium ${
                                  new Date(t.dueDate) < new Date() ? 'text-rose-600' : 'text-slate-400'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {new Date(t.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-900 text-[13px] leading-tight pl-1 group-hover:text-amber-900 transition-colors">
                              {t.title}
                            </h4>

                            {((t.checklist && t.checklist.length > 0) || (t.comments && t.comments.length > 0) || (t.attachments && t.attachments.length > 0) || blockedTaskIds.includes(t.id) || allDependencies.some(d => d.taskId === t.id)) && (
                              <div className="flex items-center gap-2 pl-1 text-[10px] flex-wrap">
                                {blockedTaskIds.includes(t.id) ? (
                                  <div
                                    className="flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded-md"
                                    title="Esta tarefa possui dependências pendentes não concluídas."
                                  >
                                    <Lock className="w-3 h-3 text-rose-600" />
                                    <span>Bloqueada</span>
                                  </div>
                                ) : allDependencies.some(d => d.taskId === t.id) ? (
                                  <div
                                    className="flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md"
                                    title={`${allDependencies.filter(d => d.taskId === t.id).length} dependência(s) resolvida(s)`}
                                  >
                                    <Link2 className="w-3 h-3 text-slate-500" />
                                    <span>{allDependencies.filter(d => d.taskId === t.id).length}</span>
                                  </div>
                                ) : null}

                                {t.checklist && t.checklist.length > 0 && (
                                  <div
                                    className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md ${
                                      t.checklist.filter(c => c.completed).length === t.checklist.length
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                    title={`${t.checklist.filter(c => c.completed).length} de ${t.checklist.length} subtarefas concluídas`}
                                  >
                                    <CheckSquare className="w-3 h-3" />
                                    <span>{t.checklist.filter(c => c.completed).length}/{t.checklist.length}</span>
                                  </div>
                                )}
                                {t.comments && t.comments.length > 0 && (
                                  <div
                                    className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md"
                                    title={`${t.comments.length} nota(s)/comentário(s)`}
                                  >
                                    <MessageSquare className="w-3 h-3 text-slate-400" />
                                    <span>{t.comments.length}</span>
                                  </div>
                                )}
                                {t.attachments && t.attachments.length > 0 && (
                                  <div
                                    className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md"
                                    title={`${t.attachments.length} anexo(s)`}
                                  >
                                    <Paperclip className="w-3 h-3 text-slate-400" />
                                    <span>{t.attachments.length}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between pl-1 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <div 
                                  className="flex items-center gap-1 min-w-0" 
                                  title={`Responsável Principal: ${t.responsible || 'Não atribuído'}${t.responsibleEmail ? ` (${t.responsibleEmail})` : ''}`}
                                >
                                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 flex-shrink-0 text-[9px] font-bold">
                                    {t.responsible ? t.responsible.slice(0, 2).toUpperCase() : <User className="w-2.5 h-2.5 text-slate-400" />}
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[90px]">
                                    {t.responsible || 'Não atribuído'}
                                  </span>
                                </div>

                                {t.participants && t.participants.length > 0 && (
                                  <div 
                                    className="flex items-center gap-0.5 flex-shrink-0 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 text-[9px] font-bold"
                                    title={`Participantes: ${t.participants.map(p => p.name).join(', ')}`}
                                  >
                                    <Users className="w-2.5 h-2.5 text-slate-400" />
                                    <span>+{t.participants.length}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                {canMove && (
                                  <select
                                    value={t.stageId}
                                    onChange={(e) => handleMoveStatus(t, e.target.value)}
                                    className="text-[9px] font-extrabold text-amber-700 bg-amber-50/50 hover:bg-amber-100 px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer appearance-none text-center transition-colors"
                                  >
                                    <option value={t.stageId} disabled>Mover para...</option>
                                    {stages
                                      .filter(s => s.id !== t.stageId)
                                      .map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                      ))
                                    }
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                  </div>
                </div>
              );
          })}
        </div>

        {/* Horizontal scroll indicators (optional visual cues) */}
        <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-24 bg-gradient-to-r from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-24 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* New Task Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold font-serif-heading text-slate-900">
                Criar Nova Tarefa Operacional
              </h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Revisar despacho diplomático da missão no Quênia"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Área (Workspace) *</label>
                  <select
                    value={modalWorkspaceId}
                    onChange={(e) => setModalWorkspaceId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fluxo (Workflow) *</label>
                    <select
                      value={modalWorkflowId}
                      onChange={(e) => setModalWorkflowId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {modalWorkflows.map(wf => (
                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Etapa (Stage) *</label>
                    <select
                      value={modalStageId}
                      onChange={(e) => setModalStageId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {modalStages.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Instruções e escopo operacional..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prazo (Data limite)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsável Principal
                </label>
                <TaskResponsibleSelect
                  eligibleUsers={eligibleUsers}
                  selectedId={responsibleId}
                  selectedName={responsible}
                  onChange={(u, manual) => {
                    if (u) {
                      setResponsibleId(u.id);
                      setResponsible(u.name);
                    } else {
                      setResponsibleId('');
                      setResponsible(manual || '');
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Participantes da Demanda
                </label>
                <TaskParticipantsSelect
                  eligibleUsers={eligibleUsers}
                  selectedParticipants={selectedParticipants}
                  onChange={(updated) => setSelectedParticipants(updated)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Criar Tarefa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Comments Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {selectedTask.ticketNumber && (
                    <span 
                      className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs tracking-wide flex items-center gap-1.5 cursor-pointer hover:bg-amber-200/90 transition-colors"
                      title="Clique para copiar o número do Ticket"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTask.ticketNumber!);
                        success('Ticket copiado!', selectedTask.ticketNumber!);
                      }}
                    >
                      <Tag className="w-3 h-3 text-amber-700" />
                      <span>{selectedTask.ticketNumber}</span>
                      <Copy className="w-2.5 h-2.5 text-amber-600 opacity-60 ml-0.5" />
                    </span>
                  )}
                  {getPriorityBadge(selectedTask.priority)}
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {workspaces.find(w => w.id === selectedTask.workspaceId)?.name} / {workflows.find(w => w.id === selectedTask.workflowId)?.name}
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-lg font-bold font-serif-heading text-slate-900 border-b border-amber-300 focus:outline-none"
                  />
                ) : (
                  <h3 className="text-lg font-bold font-serif-heading text-slate-900">
                    {selectedTask.title}
                  </h3>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <button
                  type="button"
                  onClick={() => handleExpandTask(selectedTask)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-700 transition-colors shadow-2xs"
                  title="Expandir tarefa em tela cheia"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline text-[11px]">Expandir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(selectedTask.id)}
                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyTaskLink(selectedTask.id)}
                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Copiar Link da Tarefa"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                {canEdit && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2 py-1 hover:bg-amber-50 rounded-xl"
                  >
                    Editar
                  </button>
                )}
                <button type="button" onClick={() => { setSelectedTask(null); setIsEditing(false); }} className="p-1 text-slate-400 hover:text-slate-800 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Etapa Atual</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {stages.find(s => s.id === selectedTask.stageId)?.name || 'Desconhecida'}
                  </span>
                  {canMove && !isEditing && (
                    <select
                      value={selectedTask.stageId}
                      onChange={(e) => handleMoveStatus(selectedTask, e.target.value)}
                      className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border-none focus:ring-0 cursor-pointer"
                    >
                      <option value={selectedTask.stageId} disabled>Mover...</option>
                      {stages.filter(s => s.id !== selectedTask.stageId).map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Responsável Principal</label>
                {isEditing ? (
                  <TaskResponsibleSelect
                    eligibleUsers={eligibleUsers}
                    selectedId={responsibleId}
                    selectedName={responsible}
                    onChange={(u, manual) => {
                      if (u) {
                        setResponsibleId(u.id);
                        setResponsible(u.name);
                      } else {
                        setResponsibleId('');
                        setResponsible(manual || '');
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {selectedTask.responsible ? selectedTask.responsible.slice(0, 2).toUpperCase() : <User className="w-3 h-3 text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{selectedTask.responsible || 'Não atribuído'}</div>
                      {selectedTask.responsibleEmail && (
                        <div className="text-[10px] text-slate-400 font-normal truncate">{selectedTask.responsibleEmail}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Prazo</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 border-b border-slate-200 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Sem prazo'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Prioridade</label>
                {isEditing ? (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs font-semibold text-slate-700 border-none p-0 focus:ring-0"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                ) : (
                  <div>{getPriorityBadge(selectedTask.priority)}</div>
                )}
              </div>
            </div>

            {/* Participantes da Demanda Section */}
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Participantes da Demanda ({isEditing ? selectedParticipants.length : (selectedTask.participants?.length || 0)})</span>
                </label>
              </div>

              {isEditing ? (
                <TaskParticipantsSelect
                  eligibleUsers={eligibleUsers}
                  selectedParticipants={selectedParticipants}
                  onChange={(updated) => setSelectedParticipants(updated)}
                />
              ) : (
                <div>
                  {selectedTask.participants && selectedTask.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedTask.participants.map((p) => (
                        <div 
                          key={p.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 truncate block max-w-[150px]">{p.name}</span>
                            {p.email && <span className="text-[9px] text-slate-400 truncate block">{p.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum participante adicional registrado nesta demanda.</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Descrição</label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl leading-relaxed focus:outline-none border border-slate-200"
                />
              ) : (
                <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'Sem descrição.'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-4">
              <span>Criado em: {new Date(selectedTask.createdAt).toLocaleString()}</span>
              <span>Última atualização: {new Date(selectedTask.updatedAt).toLocaleString()}</span>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            )}

            {/* Checklist / Subtarefas Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-amber-600" />
                  Checklist & Subtarefas
                </h4>
                {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {selectedTask.checklist.filter(i => i.completed).length} de {selectedTask.checklist.length} concluídos (
                    {Math.round((selectedTask.checklist.filter(i => i.completed).length / selectedTask.checklist.length) * 100)}%)
                  </span>
                )}
              </div>

              {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedTask.checklist.filter(i => i.completed).length === selectedTask.checklist.length
                        ? 'bg-emerald-500'
                        : 'bg-amber-600'
                    }`}
                    style={{
                      width: `${Math.round((selectedTask.checklist.filter(i => i.completed).length / selectedTask.checklist.length) * 100)}%`
                    }}
                  />
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(!selectedTask.checklist || selectedTask.checklist.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic py-1">Nenhuma subtarefa adicionada.</p>
                ) : (
                  selectedTask.checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-2 p-2 rounded-xl transition-colors border ${
                        item.completed ? 'bg-slate-50/70 border-slate-100' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleChecklistItem(item)}
                          className={`flex-shrink-0 text-slate-400 hover:text-amber-600 transition-colors ${
                            !canEdit ? 'cursor-default opacity-60' : 'cursor-pointer'
                          }`}
                          title={item.completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
                        >
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </button>

                        {editingChecklistId === item.id ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingChecklistText}
                              onChange={(e) => setEditingChecklistText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveChecklistEdit(item.id);
                                } else if (e.key === 'Escape') {
                                  setEditingChecklistId(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 text-xs px-2 py-1 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveChecklistEdit(item.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingChecklistId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs break-words select-text ${
                              item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                        )}
                      </div>

                      {canEdit && editingChecklistId !== item.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChecklistId(item.id);
                              setEditingChecklistText(item.title);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded"
                            title="Editar texto"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Checklist Item Form */}
              {canEdit && (
                <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Adicionar subtarefa... (Enter)"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newChecklistText.trim()}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </form>
              )}
            </div>

            {/* Dependencies Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-600" />
                  Dependências ({taskDependenciesData?.dependencies?.length || 0})
                </h4>
                {taskDependenciesData?.isBlocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>Bloqueada ({taskDependenciesData.blockingCount} pendente(s))</span>
                  </span>
                )}
              </div>

              {/* Blocking Warning Banner */}
              {taskDependenciesData?.isBlocked && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Esta tarefa está temporariamente bloqueada.</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Ela não pode ser movida para a etapa final até que todas as dependências pré-requisito sejam concluídas.
                    </p>
                  </div>
                </div>
              )}

              {/* Dependencies List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(!taskDependenciesData?.dependencies || taskDependenciesData.dependencies.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic py-1">Nenhuma dependência cadastrada.</p>
                ) : (
                  taskDependenciesData.dependencies.map((dep) => {
                    const blockInfo = taskDependenciesData.blockingDependencies?.find(b => b.dependencyId === dep.id);
                    const prereqTask = allAvailableTasks.find(t => t.id === dep.dependsOnTaskId);
                    const isFinal = blockInfo ? blockInfo.isFinal : false;
                    const prereqTitle = blockInfo?.dependsOnTaskTitle || prereqTask?.title || dep.dependsOnTaskId;

                    return (
                      <div
                        key={dep.id}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                            isFinal ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'
                          }`}>
                            {isFinal ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 truncate text-[12px]" title={prereqTitle}>
                              {prereqTitle}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                              {blockInfo?.workflowName && <span>Workflow: {blockInfo.workflowName}</span>}
                              {blockInfo?.stageName && <span>• Etapa: {blockInfo.stageName}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isFinal ? 'Concluída' : 'Bloqueante'}
                          </span>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDependency(dep.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Remover dependência"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Dependency Form */}
              {canEdit && (
                <div className="pt-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedDepTaskId}
                      onChange={(e) => setSelectedDepTaskId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                    >
                      <option value="">Selecione uma tarefa pré-requisito...</option>
                      {allAvailableTasks
                        .filter(t => t.id !== selectedTask.id && !taskDependenciesData?.dependencies?.some(d => d.dependsOnTaskId === t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))
                      }
                    </select>
                    <button
                      type="button"
                      disabled={!selectedDepTaskId || isAddingDep}
                      onClick={handleAddDependency}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-colors"
                    >
                      {isAddingDep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dependent Tasks Section (Tarefas que dependem desta) */}
              {taskDependenciesData?.dependentTasks && taskDependenciesData.dependentTasks.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-blue-600" />
                    Tarefas Dependentes ({taskDependenciesData.dependentTasks.length})
                  </h5>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {taskDependenciesData.dependentTasks.map(dep => {
                      const depTask = allAvailableTasks.find(t => t.id === dep.taskId);
                      return (
                        <div key={dep.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-semibold text-slate-800 truncate">{depTask?.title || dep.taskId}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">Depende desta</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                  Anexos & Documentos ({selectedTask.attachments?.length || 0})
                </h4>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      title="Fazer upload de arquivo do dispositivo"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 text-amber-600" />
                      )}
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenMediaPicker}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Selecionar arquivo da Biblioteca de Mídia"
                    >
                      <FolderOpen className="w-3 h-3 text-slate-600" />
                      <span>Mídia</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.svg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    />
                  </div>
                )}
              </div>

              {/* Attachments List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(!selectedTask.attachments || selectedTask.attachments.length === 0) ? (
                  <div className="p-3 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-[11px] text-slate-400 italic">Nenhum anexo ou documento anexado a esta tarefa.</p>
                  </div>
                ) : (
                  selectedTask.attachments.map((att) => {
                    const isAuthor = att.uploadedByEmail === user?.email || (att.uploadedById && att.uploadedById === user?.id);
                    const isOwner = user?.role === 'owner';
                    const canDeleteAttachment = isAuthor || isOwner || canEdit;

                    return (
                      <div
                        key={att.id}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                            {getFileIcon(att.mimeType, att.originalName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 truncate text-[12px]" title={att.originalName}>
                              {att.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{formatFileSize(att.sizeBytes)}</span>
                              <span>•</span>
                              <span>Por: {att.uploadedBy}</span>
                              <span>•</span>
                              <span>{new Date(att.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.originalName}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                            title="Abrir ou Baixar Arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {canDeleteAttachment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id, att.originalName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                              title="Remover Anexo da Tarefa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Comments Thread */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                Notas & Comentários Internos ({selectedTask.comments?.length || 0})
              </h4>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic py-1">Nenhum comentário registrado ainda.</p>
                ) : (
                  selectedTask.comments.map((c) => {
                    const isAuthor = c.authorEmail === user?.email || (c.authorId && c.authorId === user?.id);
                    const isOwner = user?.role === 'owner';
                    const canDeleteComment = isAuthor || isOwner || canDelete;
                    const canEditComment = isAuthor || isOwner;

                    return (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[9px]">
                              {(c.authorName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800">{c.authorName}</span>
                            <span className="text-slate-400">({c.authorEmail})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {new Date(c.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {canEditComment && editingCommentId !== c.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentText(c.content);
                                }}
                                className="text-slate-400 hover:text-amber-600 p-0.5"
                                title="Editar comentário"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Excluir comentário"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {editingCommentId === c.id ? (
                          <div className="space-y-1.5 pt-1">
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full text-xs p-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveCommentEdit(c.id)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-amber-600 text-white rounded-md hover:bg-amber-700"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Adicionar nota ou comentário interno..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-amber-400" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedTask.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Tarefa
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Picker Modal */}
      {showMediaPickerModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Selecionar da Biblioteca de Mídia</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPickerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar arquivo na biblioteca por título ou nome..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[400px] pr-1">
              {loadingMedia ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  <p className="text-xs">Carregando Biblioteca de Mídia...</p>
                </div>
              ) : mediaAssets.filter(m => !mediaSearch || m.title?.toLowerCase().includes(mediaSearch.toLowerCase()) || m.originalName?.toLowerCase().includes(mediaSearch.toLowerCase()) || m.filename?.toLowerCase().includes(mediaSearch.toLowerCase())).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Nenhum arquivo encontrado na Biblioteca de Mídia.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mediaAssets
                    .filter(m => !mediaSearch || m.title?.toLowerCase().includes(mediaSearch.toLowerCase()) || m.originalName?.toLowerCase().includes(mediaSearch.toLowerCase()) || m.filename?.toLowerCase().includes(mediaSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.url && item.mimeType?.startsWith('image/') ? (
                            <img
                              src={item.url}
                              alt={item.title || item.originalName}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                              {getFileIcon(item.mimeType, item.originalName || item.title || item.filename)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-slate-900 truncate">{item.title || item.originalName || item.filename || 'Arquivo'}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {item.mimeType || 'Arquivo'} • {formatFileSize(item.sizeBytes)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAttachFromMedia(item)}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs shrink-0 cursor-pointer"
                        >
                          Anexar
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMediaPickerModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow & Stages Manager Modal */}
      <WorkflowManagerModal
        isOpen={showWorkflowModal}
        onClose={(refreshNeeded) => {
          setShowWorkflowModal(false);
          if (refreshNeeded) {
            fetchKanbanConfig();
            fetchTasks();
          }
        }}
        workspaces={workspaces}
        activeWorkspaceId={selectedWorkspaceId || 'ws-1'}
      />
    </div>
  );
}
