import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Tag,
  Copy,
  ExternalLink,
  Link2,
  Edit2,
  Save,
  Trash2,
  X,
  User,
  Users,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Plus,
  ListTodo,
  Paperclip,
  Upload,
  Download,
  FolderOpen,
  Search,
  MessageSquare,
  Send,
  Lock,
  Unlock,
  ShieldAlert,
  AlertCircle,
  Check,
  Loader2,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { Task, TaskPriority, TaskChecklistItem, TaskComment, TaskAttachment, TaskDependency, MediaAsset, TaskParticipant } from '../../types';
import { TaskResponsibleSelect, TaskParticipantsSelect, EligibleUser } from './TaskUserSelect';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';

interface ExpandedTaskViewProps {
  task: Task;
  workspaces: any[];
  workflows: any[];
  stages: any[];
  eligibleUsers: EligibleUser[];
  canEdit: boolean;
  canDelete: boolean;
  canMove: boolean;
  onBack: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenInNewTab: (taskId: string) => void;
  onCopyLink: (taskId: string) => void;
}

export function ExpandedTaskView({
  task,
  workspaces,
  workflows,
  stages,
  eligibleUsers,
  canEdit,
  canDelete,
  canMove,
  onBack,
  onTaskUpdated,
  onDeleteTask,
  onOpenInNewTab,
  onCopyLink,
}: ExpandedTaskViewProps) {
  const { success, error } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [responsible, setResponsible] = useState(task.responsible || '');
  const [responsibleId, setResponsibleId] = useState<string>(task.responsibleId || '');
  const [selectedParticipants, setSelectedParticipants] = useState<TaskParticipant[]>(task.participants || []);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // Comments
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Attachments
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [showMediaPickerModal, setShowMediaPickerModal] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dependencies
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

  // Sync state with incoming task
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setResponsible(task.responsible || '');
    setResponsibleId(task.responsibleId || '');
    setSelectedParticipants(task.participants || []);
  }, [task]);

  // Load dependencies
  const loadDependencies = async () => {
    try {
      const data = await api.getTaskDependencies(task.id);
      setTaskDependenciesData(data);
      const allT = await api.getTasks('', '');
      setAllAvailableTasks(allT.filter((t) => t.title && t.id && t.id !== task.id));
    } catch (e) {
      console.error('Erro ao carregar dependências:', e);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, [task.id]);

  const handleSaveMain = async () => {
    if (!title.trim()) {
      error('O título da tarefa é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || undefined,
        responsible: responsible.trim(),
        responsibleId: responsibleId || undefined,
        participantIds: selectedParticipants.map((p) => p.id),
      });
      onTaskUpdated(updated);
      setIsEditing(false);
      success('Tarefa Atualizada!', 'As alterações foram salvas com sucesso.');
    } catch (err: any) {
      error('Erro ao salvar tarefa', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveStatus = async (nextStageId: string) => {
    if (!canMove) {
      error('Acesso Negado', 'Permissão insuficiente para alterar etapa.');
      return;
    }
    try {
      const updated = await api.updateTask(task.id, { stageId: nextStageId });
      onTaskUpdated(updated);
      success('Etapa Atualizada', 'A tarefa foi movida para a nova etapa.');
    } catch (err: any) {
      error('Erro ao mover etapa', err.message);
    }
  };

  // Checklist actions
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    try {
      const newItem = await api.addChecklistItem(task.id, newChecklistText.trim());
      setNewChecklistText('');
      const updatedChecklist = [...(task.checklist || []), newItem];
      onTaskUpdated({ ...task, checklist: updatedChecklist, updatedAt: new Date().toISOString() });
      success('Subtarefa Adicionada', 'Item registrado no checklist.');
    } catch (err: any) {
      error('Erro ao adicionar subtarefa', err.message);
    }
  };

  const handleToggleChecklist = async (item: TaskChecklistItem) => {
    if (!canEdit) return;
    const newCompleted = !item.completed;
    try {
      const saved = await api.updateChecklistItem(task.id, item.id, { completed: newCompleted });
      const updatedChecklist = (task.checklist || []).map((i) => (i.id === item.id ? saved : i));
      onTaskUpdated({ ...task, checklist: updatedChecklist });
    } catch (err: any) {
      error('Erro ao atualizar subtarefa', err.message);
    }
  };

  const handleSaveChecklistEdit = async (itemId: string) => {
    if (!editingChecklistText.trim()) {
      setEditingChecklistId(null);
      return;
    }
    try {
      const saved = await api.updateChecklistItem(task.id, itemId, { title: editingChecklistText.trim() });
      const updatedChecklist = (task.checklist || []).map((i) => (i.id === itemId ? saved : i));
      onTaskUpdated({ ...task, checklist: updatedChecklist, updatedAt: new Date().toISOString() });
      setEditingChecklistId(null);
      setEditingChecklistText('');
      success('Subtarefa Atualizada', 'Texto modificado com sucesso.');
    } catch (err: any) {
      error('Erro ao editar subtarefa', err.message);
    }
  };

  const handleDeleteChecklist = async (itemId: string) => {
    if (!canEdit) return;
    try {
      await api.deleteChecklistItem(task.id, itemId);
      const updatedChecklist = (task.checklist || []).filter((i) => i.id !== itemId);
      onTaskUpdated({ ...task, checklist: updatedChecklist, updatedAt: new Date().toISOString() });
      success('Subtarefa Removida', 'Item excluído do checklist.');
    } catch (err: any) {
      error('Erro ao remover subtarefa', err.message);
    }
  };

  // Comments actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const comment = await api.addTaskComment(task.id, newCommentText.trim());
      setNewCommentText('');
      const updatedComments = [...(task.comments || []), comment];
      onTaskUpdated({ ...task, comments: updatedComments, updatedAt: new Date().toISOString() });
      success('Comentário Adicionado', 'Observação registrada com sucesso.');
    } catch (err: any) {
      error('Erro ao adicionar comentário', err.message);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      setEditingCommentId(null);
      return;
    }
    try {
      const updated = await api.updateTaskComment(task.id, commentId, editingCommentText.trim());
      const updatedComments = (task.comments || []).map((c) => (c.id === commentId ? updated : c));
      onTaskUpdated({ ...task, comments: updatedComments, updatedAt: new Date().toISOString() });
      setEditingCommentId(null);
      setEditingCommentText('');
      success('Comentário Atualizado', 'Texto modificado com sucesso.');
    } catch (err: any) {
      error('Erro ao editar comentário', err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Excluir este comentário definitivamente?')) return;
    try {
      await api.deleteTaskComment(task.id, commentId);
      const updatedComments = (task.comments || []).filter((c) => c.id !== commentId);
      onTaskUpdated({ ...task, comments: updatedComments, updatedAt: new Date().toISOString() });
      success('Comentário Removido', 'Observação excluída.');
    } catch (err: any) {
      error('Erro ao excluir comentário', err.message);
    }
  };

  // Attachments actions
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
    try {
      const newAtt = await api.addTaskAttachment(task.id, {
        mediaId: mediaItem.id,
        url: mediaItem.url,
        originalName: mediaItem.originalName || mediaItem.title || 'Arquivo de Mídia',
        mimeType: mediaItem.mimeType || 'application/octet-stream',
        sizeBytes: mediaItem.sizeBytes || 0,
      });
      const updatedAttachments = [...(task.attachments || []), newAtt];
      onTaskUpdated({ ...task, attachments: updatedAttachments, updatedAt: new Date().toISOString() });
      setShowMediaPickerModal(false);
      success('Arquivo Anexado', `"${newAtt.originalName}" foi vinculado com sucesso.`);
    } catch (err: any) {
      error('Erro ao anexar arquivo', err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      error('Arquivo Muito Grande', 'O tamanho máximo permitido é de 15MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const FORBIDDEN_EXTS = ['exe', 'bat', 'cmd', 'sh', 'js', 'html', 'htm', 'php', 'vbs', 'py', 'bin', 'jar', 'apk', 'com', 'scr', 'msi', 'ps1', 'cgi', 'pl', 'wsf'];
    if (FORBIDDEN_EXTS.includes(ext)) {
      error('Arquivo Não Permitido', `Arquivos .${ext} não são permitidos por segurança.`);
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const newAtt = await api.addTaskAttachment(task.id, {
            url: base64Data,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          });
          const updatedAttachments = [...(task.attachments || []), newAtt];
          onTaskUpdated({ ...task, attachments: updatedAttachments, updatedAt: new Date().toISOString() });
          success('Arquivo Anexado', `"${file.name}" foi enviado com sucesso.`);
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
    if (!window.confirm(`Remover o anexo "${filename}" desta tarefa?`)) return;
    try {
      await api.deleteTaskAttachment(task.id, attachmentId);
      const updatedAttachments = (task.attachments || []).filter((a) => a.id !== attachmentId);
      onTaskUpdated({ ...task, attachments: updatedAttachments, updatedAt: new Date().toISOString() });
      success('Anexo Removido', `"${filename}" foi desvinculado.`);
    } catch (err: any) {
      error('Erro ao remover anexo', err.message);
    }
  };

  // Dependencies actions
  const handleAddDependency = async () => {
    if (!selectedDepTaskId) return;
    setIsAddingDep(true);
    try {
      await api.addTaskDependency(task.id, selectedDepTaskId);
      success('Dependência Adicionada', 'A dependência foi registrada com sucesso.');
      setSelectedDepTaskId('');
      await loadDependencies();
    } catch (err: any) {
      error('Erro ao adicionar dependência', err.message);
    } finally {
      setIsAddingDep(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!window.confirm('Remover esta dependência?')) return;
    try {
      await api.removeTaskDependency(task.id, depId);
      success('Dependência Removida', 'A dependência foi desvinculada.');
      await loadDependencies();
    } catch (err: any) {
      error('Erro ao remover dependência', err.message);
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
        return <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-lg uppercase">Urgente</span>;
      case 'high':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg uppercase">Alta</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg uppercase">Média</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg uppercase">Baixa</span>;
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === task.workspaceId);
  const currentWorkflow = workflows.find((w) => w.id === task.workflowId);
  const currentStage = stages.find((s) => s.id === task.stageId);

  const completedChecklistCount = (task.checklist || []).filter((i) => i.completed).length;
  const totalChecklistCount = (task.checklist || []).length;
  const checklistPercent = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar / Navigation Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-800 rounded-xl text-xs font-bold transition-colors shadow-2xs"
            title="Voltar ao Quadro Kanban"
          >
            <ArrowLeft className="w-4 h-4 text-amber-700" />
            <span>Voltar ao Kanban</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700">{currentWorkspace?.name || 'Workspace'}</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">{currentWorkflow?.name || 'Workflow'}</span>
            <span>/</span>
            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              {currentStage?.name || 'Etapa'}
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenInNewTab(task.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-700 transition-colors shadow-2xs"
            title="Abrir esta tarefa em uma nova aba do navegador"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
            <span>Abrir em Nova Aba</span>
          </button>

          <button
            type="button"
            onClick={() => onCopyLink(task.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-700 transition-colors shadow-2xs"
            title="Copiar link direto para esta tarefa"
          >
            <Link2 className="w-3.5 h-3.5 text-amber-700" />
            <span>Copiar Link</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleSaveMain();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isEditing ? (
                <Save className="w-3.5 h-3.5" />
              ) : (
                <Edit2 className="w-3.5 h-3.5" />
              )}
              <span>{isEditing ? 'Salvar Alterações' : 'Editar Tarefa'}</span>
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Excluir tarefa definitivamente"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 8 Cols Content / 4 Cols Metadata & Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Main Content, Checklist, Attachments, Dependencies, Comments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              {task.ticketNumber && (
                <span
                  className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-300 shadow-2xs tracking-wide flex items-center gap-1.5 cursor-pointer hover:bg-amber-200/90 transition-colors"
                  title="Clique para copiar o número do Ticket"
                  onClick={() => {
                    navigator.clipboard.writeText(task.ticketNumber!);
                    success('Ticket copiado!', task.ticketNumber!);
                  }}
                >
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <span>{task.ticketNumber}</span>
                  <Copy className="w-3 h-3 text-amber-600 opacity-60 ml-0.5" />
                </span>
              )}
              {getPriorityBadge(task.priority)}
            </div>

            <div>
              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título da Demanda</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xl sm:text-2xl font-bold font-serif-heading text-slate-900 border-b-2 border-amber-400 focus:outline-none py-1 bg-transparent"
                    placeholder="Título da tarefa..."
                  />
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold font-serif-heading text-slate-900 leading-tight">
                  {task.title}
                </h1>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição & Escopo</label>
              {isEditing ? (
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes operacionais da missão, instruções e diretrizes..."
                  className="w-full text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl leading-relaxed focus:outline-none border border-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              ) : (
                <div className="text-xs text-slate-700 bg-slate-50/80 p-4 rounded-2xl leading-relaxed whitespace-pre-wrap border border-slate-100 min-h-[80px]">
                  {task.description || <span className="text-slate-400 italic">Sem descrição detalhada registrada.</span>}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMain}
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            )}
          </div>

          {/* Checklist & Subtarefas Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-amber-600" />
                <span>Checklist & Subtarefas</span>
              </h3>
              {totalChecklistCount > 0 && (
                <span className="text-xs font-semibold text-slate-500">
                  {completedChecklistCount} de {totalChecklistCount} concluídos ({checklistPercent}%)
                </span>
              )}
            </div>

            {totalChecklistCount > 0 && (
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    completedChecklistCount === totalChecklistCount ? 'bg-emerald-500' : 'bg-amber-600'
                  }`}
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>
            )}

            {/* Checklist Items List */}
            <div className="space-y-2">
              {totalChecklistCount === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Nenhuma subtarefa adicionada até o momento.</p>
              ) : (
                task.checklist!.map((item) => (
                  <div
                    key={item.id}
                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl transition-colors border ${
                      item.completed ? 'bg-slate-50/70 border-slate-100' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleToggleChecklist(item)}
                        className={`shrink-0 text-slate-400 hover:text-amber-600 transition-colors ${
                          !canEdit ? 'cursor-default opacity-60' : 'cursor-pointer'
                        }`}
                        title={item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                      >
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>

                      {editingChecklistId === item.id ? (
                        <div className="flex items-center gap-2 flex-1">
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
                            className="flex-1 text-xs px-3 py-1.5 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveChecklistEdit(item.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700"
                            title="Salvar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingChecklistId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`text-xs break-words select-text ${
                            item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'
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
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklist(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {canEdit && (
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Nova subtarefa..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-amber-600" />
                <span>Anexos & Documentos ({task.attachments?.length || 0})</span>
              </h3>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.svg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    {isUploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Enviar Arquivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenMediaPicker}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Biblioteca</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {(!task.attachments || task.attachments.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">Nenhum documento ou mídia anexada a esta tarefa.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 group hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {getFileIcon(att.mimeType, att.originalName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 truncate" title={att.originalName}>
                            {att.originalName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {formatFileSize(att.sizeBytes)} • {new Date(att.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={att.url}
                          download={att.originalName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-amber-700 rounded-lg hover:bg-white transition-colors"
                          title="Baixar ou visualizar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id, att.originalName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dependencies Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Dependências & Bloqueios</span>
              </h3>
            </div>

            {taskDependenciesData?.isBlocked && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Esta tarefa está BLOQUEADA</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Existem {taskDependenciesData.blockingCount} tarefas pré-requisito pendentes de conclusão antes de avançar esta etapa.
                  </p>
                </div>
              </div>
            )}

            {/* List of prerequisites */}
            <div className="space-y-2">
              {(!taskDependenciesData?.dependencies || taskDependenciesData.dependencies.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-1">Nenhuma dependência registrada para esta tarefa.</p>
              ) : (
                taskDependenciesData.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">Depende de:</span>
                      <strong className="text-slate-900 truncate">{dep.dependsOnTaskId}</strong>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                        title="Remover dependência"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {canEdit && (
              <div className="flex gap-2 pt-2">
                <select
                  value={selectedDepTaskId}
                  onChange={(e) => setSelectedDepTaskId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Selecione uma tarefa para criar dependência...</option>
                  {allAvailableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketNumber ? `[${t.ticketNumber}] ` : ''}
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddDependency}
                  disabled={!selectedDepTaskId || isAddingDep}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {isAddingDep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Vincular</span>
                </button>
              </div>
            )}
          </div>

          {/* Internal Comments & Notes */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Observações & Histórico ({task.comments?.length || 0})</span>
            </h3>

            <div className="space-y-3">
              {(!task.comments || task.comments.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">Nenhum comentário registrado.</p>
              ) : (
                task.comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {comment.authorName ? comment.authorName.slice(0, 2).toUpperCase() : 'AD'}
                        </div>
                        <span className="font-bold text-slate-800">{comment.authorName || 'Diplomata ADMIR'}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {canEdit && editingCommentId !== comment.id && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.content);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Editar comentário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Excluir comentário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full text-xs p-2.5 border border-amber-300 rounded-xl focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1 text-xs text-slate-500 font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCommentEdit(comment.id)}
                            className="px-3 py-1 text-xs bg-amber-600 text-white font-bold rounded-lg"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* New Comment Input Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Escreva uma observação ou nota interna..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Comentar</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (4 cols): Quick Metadata & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status & Assignment Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Controle da Demanda
            </h3>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa Atual</label>
              {canMove ? (
                <select
                  value={task.stageId}
                  onChange={(e) => handleMoveStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50/70 border border-amber-200/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl border border-slate-200">
                  {currentStage?.name || 'Desconhecida'}
                </div>
              )}
            </div>

            {/* Responsible Principal */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável Principal</label>
              {isEditing ? (
                <TaskResponsibleSelect
                  eligibleUsers={eligibleUsers}
                  selectedId={responsibleId}
                  selectedName={responsible}
                  onChange={(u) => {
                    if (u) {
                      setResponsibleId(u.id);
                      setResponsible(u.name);
                    } else {
                      setResponsibleId('');
                      setResponsible('');
                    }
                  }}
                />
              ) : (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {task.responsible ? task.responsible.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">
                      {task.responsible || <span className="text-slate-400 italic">Não atribuído</span>}
                    </div>
                    {task.responsibleEmail && (
                      <div className="text-[10px] text-slate-400 truncate">{task.responsibleEmail}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prazo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo (Data Limite)</label>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-slate-400 italic">Sem prazo definido</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridade</label>
              {isEditing ? (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              ) : (
                <div>{getPriorityBadge(task.priority)}</div>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Participantes da Demanda ({isEditing ? selectedParticipants.length : (task.participants?.length || 0)})
              </label>
              {isEditing ? (
                <TaskParticipantsSelect
                  eligibleUsers={eligibleUsers}
                  selectedParticipants={selectedParticipants}
                  onChange={(updated) => setSelectedParticipants(updated)}
                />
              ) : (
                <div>
                  {task.participants && task.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 truncate block max-w-[130px]">{p.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum participante adicional.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* System Metadata Card */}
          <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 text-xs text-slate-500 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metadados Técnicos</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span>Ticket:</span>
                <span className="font-mono font-bold text-slate-800">{task.ticketNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>ID da Tarefa:</span>
                <span className="font-mono text-[10px] text-slate-600">{task.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Criada em:</span>
                <span>{new Date(task.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Última atualização:</span>
                <span>{new Date(task.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
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
              ) : mediaAssets.filter(
                  (m) =>
                    !mediaSearch ||
                    m.title?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                    m.originalName?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                    m.filename?.toLowerCase().includes(mediaSearch.toLowerCase())
                ).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Nenhum arquivo encontrado na Biblioteca de Mídia.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mediaAssets
                    .filter(
                      (m) =>
                        !mediaSearch ||
                        m.title?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                        m.originalName?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                        m.filename?.toLowerCase().includes(mediaSearch.toLowerCase())
                    )
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
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {item.title || item.originalName || item.filename || 'Arquivo'}
                            </p>
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
    </div>
  );
}
