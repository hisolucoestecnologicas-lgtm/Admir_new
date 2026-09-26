import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  FolderPlus,
  Layers,
  CheckSquare,
  Square,
  Tag,
  Filter,
  Eye,
  RefreshCw,
  Folder,
  FileText,
  ShieldAlert,
  SlidersHorizontal,
  Grid,
  List,
  Edit3,
  Archive,
  GitCompare,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  AlertCircle,
  FileArchive,
  Maximize2,
  Settings,
  FileEdit,
  Type,
  Link2,
  HelpCircle,
  Layers3,
  Move,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  MediaAsset,
  MediaAlbum,
  AIClusterGroup,
  MediaImportJob,
  MediaAIJob,
  DuplicateGroup,
  MediaCategory,
  NamingConfig,
  AcervoDiagnosticReport,
  MediaUsageLocation,
} from '../../types';

const ALL_CATEGORIES: MediaCategory[] = [
  'EVENTO',
  'EMBAIXADOR',
  'INSTITUCIONAL',
  'LOGO',
  'BRASÃO / SELO',
  'ÍCONE / FAVICON',
  'BANNER',
  'PROGRAMA',
  'NOTÍCIA',
  'DOCUMENTO / MATERIAL GRÁFICO',
  'PAÍS / PROJETO',
  'OUTROS',
  'NÃO CLASSIFICADO',
];

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'DUPLICATE' | 'ERROR';
  progress: number;
  sha256?: string;
  errorMsg?: string;
  asset?: MediaAsset;
}

export function AdminMediaLibrary() {
  const { hasPermission } = useAuth();
  const { programs, stories } = useSite();
  const { success, error, warning } = useToast();

  const getUsageCategoryBadge = (category?: string) => {
    switch (category) {
      case 'DUPLICATA_NAO_UTILIZADA':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[9px] px-2 py-0.5 rounded-full">DUPLICATA NÃO UTILIZADA</span>;
      case 'DUPLICATA_EM_USO':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[9px] px-2 py-0.5 rounded-full">DUPLICATA EM USO</span>;
      case 'DUPLICATA_USOS_DIFERENTES':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 font-bold text-[9px] px-2 py-0.5 rounded-full">DUPLICATA COM USOS DIFERENTES</span>;
      case 'DUPLICATA_CONSOLIDAVEL':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-full">DUPLICATA CONSOLIDÁVEL</span>;
      case 'DUPLICATA_NAO_CONSOLIDAVEL':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[9px] px-2 py-0.5 rounded-full">DUPLICATA NÃO CONSOLIDÁVEL (ÍCONE × ALTA RES)</span>;
      case 'DUPLICATA_CONSOLIDACAO_INCOMPLETA':
        return <span className="bg-red-600 text-white border border-red-800 font-bold text-[9px] px-2 py-0.5 rounded-full animate-pulse">CONSOLIDAÇÃO INCOMPLETA / ERRO</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[9px] px-2 py-0.5 rounded-full">EM REVISÃO</span>;
    }
  };

  const canUpload = hasPermission('media.upload');
  const canBulkUpload = hasPermission('media.bulk_upload') || canUpload;
  const canDelete = hasPermission('media.delete');
  const canManageAlbums = hasPermission('media.manage_albums') || canUpload;
  const canAIOrganize = hasPermission('media.ai_organize') || canUpload;
  const canReviewDuplicates = hasPermission('media.review_duplicates') || canBulkUpload;
  const canDeleteDuplicates = hasPermission('media.delete_duplicates') || canDelete;
  const canRestoreDeleted = hasPermission('media.restore_deleted') || canUpload;

  // Tabs
  const [activeTab, setActiveTab] = useState<'gallery' | 'bulk_upload' | 'ai_organization' | 'albums' | 'duplicates' | 'trash' | 'naming_config'>('gallery');

  // Media Data
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Acervo Diagnostic Report ("ANALISAR E ORGANIZAR ACERVO ATUAL")
  const [acervoDiagnostic, setAcervoDiagnostic] = useState<AcervoDiagnosticReport | null>(null);
  const [isAnalyzingAcervo, setIsAnalyzingAcervo] = useState(false);
  const [showDiagnosticBanner, setShowDiagnosticBanner] = useState(false);

  // Detailed Usage Check Modal
  const [usageModalAsset, setUsageModalAsset] = useState<MediaAsset | null>(null);
  const [usageLocations, setUsageLocations] = useState<MediaUsageLocation[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Batch Rename Modal
  const [showBatchRenameModal, setShowBatchRenameModal] = useState(false);
  const [batchRenameList, setBatchRenameList] = useState<AcervoDiagnosticReport['renamePreviews']>([]);
  const [isApplyingBatchRename, setIsApplyingBatchRename] = useState(false);

  // Naming Configuration
  const [namingConfig, setNamingConfig] = useState<NamingConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Batch Selection for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkAlbumTarget, setBulkAlbumTarget] = useState('');
  const [bulkEventNameInput, setBulkEventNameInput] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Detail Modal
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  // Single Upload Modal (Legacy/Simple)
  const [showSingleUpload, setShowSingleUpload] = useState(false);
  const [singleTitle, setSingleTitle] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleAlt, setSingleAlt] = useState('');
  const [singleTags, setSingleTags] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedQueueAlbum, setSelectedQueueAlbum] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Albums Modal State
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumCategory, setAlbumCategory] = useState<'general' | 'diplomatic' | 'humanitarian' | 'press' | 'assembly'>('humanitarian');
  const [albumCreating, setAlbumCreating] = useState(false);

  // AI Gemini Analysis & Jobs
  const [activeAIJob, setActiveAIJob] = useState<MediaAIJob | null>(null);
  const pollingAIRef = useRef<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [showCancelAIModal, setShowCancelAIModal] = useState(false);
  const [aiClustering, setAiClustering] = useState(false);
  const [aiClusters, setAiClusters] = useState<AIClusterGroup[]>([]);
  const [aiSelectedCluster, setAiSelectedCluster] = useState<AIClusterGroup | null>(null);

  // AI Proposal Review State
  const [isReviewingProposal, setIsReviewingProposal] = useState(false);
  const [reviewProposal, setReviewProposal] = useState<AIClusterGroup | null>(null);
  const [reviewSelectedIds, setReviewSelectedIds] = useState<string[]>([]);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewDescription, setReviewDescription] = useState('');
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isApprovingProposal, setIsApprovingProposal] = useState(false);

  // Archive (.ZIP) Upload State
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingArchive, setIsProcessingArchive] = useState(false);
  const [archiveReport, setArchiveReport] = useState<any | null>(null);
  const [importTrace, setImportTrace] = useState<string[]>([]);
  const [importDiagnosticInfo, setImportDiagnosticInfo] = useState<{ fileName?: string; fileSize?: string; lastStage?: string; error?: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(true);

  const addTrace = (msg: string, stage?: string) => {
    console.log(msg);
    setImportTrace(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    if (stage) {
      setImportDiagnosticInfo(prev => ({
        ...prev,
        lastStage: stage,
      }));
    }
  };

  // Duplicates Review State
  const [duplicateGroups, setDuplicateGroups] = useState<(DuplicateGroup & { mediaAssets: MediaAsset[] })[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [scanningDuplicates, setScanningDuplicates] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<(DuplicateGroup & { mediaAssets: MediaAsset[] }) | null>(null);
  const [duplicateActions, setDuplicateActions] = useState<Record<string, 'keep' | 'consolidate' | 'trash' | 'delete'>>({});
  const [masterMediaId, setMasterMediaId] = useState<string>('');
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isResolvingDuplicates, setIsResolvingDuplicates] = useState(false);

  // Trash (Lixeira) State
  const [trashedMediaList, setTrashedMediaList] = useState<MediaAsset[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [isRestoringTrash, setIsRestoringTrash] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const fetchDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await api.getDuplicateGroups();
      setDuplicateGroups(res.groups || []);
    } catch (e: any) {
      console.warn('Falha ao carregar duplicidades:', e);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const trashed = await api.getTrashedMedia();
      setTrashedMediaList(trashed || []);
    } catch (e: any) {
      console.warn('Falha ao carregar lixeira:', e);
    } finally {
      setLoadingTrash(false);
    }
  };

  const fetchNamingConfig = async () => {
    try {
      const cfg = await api.getNamingConfig();
      setNamingConfig(cfg);
    } catch (e: any) {
      console.warn('Falha ao carregar configurações de nomenclatura:', e);
    }
  };

  const handleSaveNamingConfig = async () => {
    if (!namingConfig) return;
    setIsSavingConfig(true);
    try {
      const saved = await api.saveNamingConfig(namingConfig);
      setNamingConfig(saved);
      success('Regras de Nomenclatura Salvas!', 'As regras de padronização foram atualizadas com sucesso.');
    } catch (err: any) {
      error('Erro ao salvar regras', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAnalyzeAcervo = async () => {
    setIsAnalyzingAcervo(true);
    try {
      const diag = await api.analyzeCurrentAcervo();
      setAcervoDiagnostic(diag);
      setShowDiagnosticBanner(true);
      setBatchRenameList(diag.renamePreviews || []);
      const dupCount = diag.pendingDuplicatesCount ?? diag.duplicateGroupsCount ?? 0;
      success(
        'Análise de Acervo Concluída!',
        `${diag.totalScanned} fotos analisadas. ${diag.unclassifiedCount} sem classificação e ${dupCount} grupos de duplicatas identificados.`
      );
    } catch (err: any) {
      error('Erro ao analisar acervo', err.message);
    } finally {
      setIsAnalyzingAcervo(false);
    }
  };

  const handleOpenUsageModal = async (asset: MediaAsset) => {
    setUsageModalAsset(asset);
    setLoadingUsage(true);
    try {
      const usage = await api.getMediaUsage(asset.id);
      setUsageLocations(usage.locations || []);
    } catch (err: any) {
      error('Erro ao verificar utilizações', err.message);
      setUsageLocations([]);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleOpenBatchRenameModal = () => {
    if (acervoDiagnostic && acervoDiagnostic.renamePreviews?.length > 0) {
      setBatchRenameList(acervoDiagnostic.renamePreviews);
      setShowBatchRenameModal(true);
    } else {
      handleAnalyzeAcervo().then(() => {
        setShowBatchRenameModal(true);
      });
    }
  };

  const handleApplyBatchRename = async () => {
    if (batchRenameList.length === 0) return;
    setIsApplyingBatchRename(true);
    try {
      const renames = batchRenameList.map((item) => ({
        assetId: item.assetId,
        newOrganizedName: item.suggestedOrganizedName,
      }));

      const res = await api.applyBatchRename(renames);
      success('Nomenclatura Padronizada!', `${res.renamedCount} fotografias receberam nomes organizados padronizados.`);
      setShowBatchRenameModal(false);
      fetchMedia();
      if (acervoDiagnostic) {
        handleAnalyzeAcervo();
      }
    } catch (err: any) {
      error('Erro ao padronizar nomes', err.message);
    } finally {
      setIsApplyingBatchRename(false);
    }
  };

  const handleApproveAISuggestions = async (assetOrId: MediaAsset | string) => {
    try {
      const id = typeof assetOrId === 'string' ? assetOrId : assetOrId.id;
      const updated = await api.approveAISuggestions(id);
      setSelectedAsset(updated);
      success('Sugestões da IA Aprovadas!', 'As sugestões foram aplicadas ao cadastro da foto.');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao aprovar sugestões da IA', err.message);
    }
  };

  const fetchAIProposals = async () => {
    try {
      const res = await api.getAIClusterProposals();
      setAiClusters(res.clusters || []);
    } catch (e: any) {
      console.warn('Falha ao carregar propostas da IA:', e);
    }
  };

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const [mediaData, albumsData] = await Promise.all([
        api.getMedia(),
        api.getAlbums().catch(() => []),
        fetchAIProposals()
      ]);
      setMediaList(mediaData);
      setAlbums(albumsData);
      fetchDuplicates();
      fetchTrash();
    } catch (e: any) {
      error('Falha ao carregar biblioteca', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
    
    // Check for active AI jobs
    api.getActiveAIJob().then(job => {
      if (job) {
        setActiveAIJob(job);
        setAiAnalyzing(true);
        startAIJobPolling(job.id);
      }
    }).catch(() => {});
  }, []);

  // --- SELECTION HELPERS ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMedia.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMedia.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // --- COPY URL HELPER ---
  const handleCopyUrl = (item: MediaAsset) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      success('URL Copiada!', 'Link da imagem em alta resolução copiado.');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // --- BULK EDIT METADATA ---
  const handleApplyBulkEdit = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const newTags = bulkTagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const updates: Partial<MediaAsset> = {};
      if (bulkAlbumTarget) updates.albumId = bulkAlbumTarget === 'none' ? undefined : bulkAlbumTarget;
      if (bulkEventNameInput.trim()) updates.eventName = bulkEventNameInput.trim();

      let targetAssets = mediaList.filter((m) => selectedIds.includes(m.id));
      if (newTags.length > 0) {
        // Append new tags to existing tags
        for (const asset of targetAssets) {
          const combinedTags = Array.from(new Set([...(asset.tags || []), ...newTags]));
          await api.updateMedia(asset.id, { ...updates, tags: combinedTags });
        }
      } else {
        await api.bulkEditMedia(selectedIds, updates);
      }

      success('Edição em Massa Concluída!', `${selectedIds.length} fotografias foram atualizadas.`);
      setShowBulkEditModal(false);
      setSelectedIds([]);
      setBulkTagInput('');
      setBulkAlbumTarget('');
      setBulkEventNameInput('');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao atualizar em massa', err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  // --- SINGLE MANUAL UPLOAD ---
  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle.trim() || !singleUrl.trim()) {
      error('Preencha título e URL da imagem.');
      return;
    }

    setSingleSubmitting(true);
    try {
      const tags = singleTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.uploadMedia({
        title: singleTitle.trim(),
        url: singleUrl.trim(),
        altText: singleAlt.trim() || singleTitle.trim(),
        tags,
        dimensions: '1600x900',
        fileSize: '450 KB',
      });

      success('Mídia Adicionada!', 'Ativo inserido na biblioteca.');
      setShowSingleUpload(false);
      setSingleTitle('');
      setSingleUrl('');
      setSingleAlt('');
      setSingleTags('');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao adicionar', err.message);
    } finally {
      setSingleSubmitting(false);
    }
  };

  // --- BULK UPLOAD QUEUE HANDLERS ---
  const handleFilesAdded = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      warning('Nenhuma imagem válida selecionada', 'Por favor, selecione arquivos JPG, PNG, WEBP ou GIF.');
      return;
    }

    const newItems: QueueItem[] = fileArray.map((file) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      status: 'PENDING',
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const processUploadQueue = async () => {
    if (uploadQueue.length === 0 || isUploading) return;
    setIsUploading(true);

    const pending = uploadQueue.filter((q) => q.status === 'PENDING');
    const CONCURRENCY = 3;

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (item) => {
          // Update queue status to UPLOADING
          setUploadQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'UPLOADING', progress: 10 } : q)));

          try {
            const res = await api.uploadMediaDirect(item.file, {
              title: item.name.replace(/\.[^/.]+$/, ''),
              albumId: selectedQueueAlbum || undefined,
            });

            if (res.isDuplicate) {
              setUploadQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, status: 'DUPLICATE', progress: 100, asset: res.asset, errorMsg: 'Duplicada (Hash idêntico)' }
                    : q
                )
              );
            } else {
              setUploadQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, status: 'COMPLETED', progress: 100, asset: res.asset } : q))
              );
            }
          } catch (err: any) {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: 'ERROR', progress: 0, errorMsg: err.message || 'Erro de envio' } : q))
            );
          }
        })
      );
    }

    setIsUploading(false);
    success('Lote de Fotos Processado!', 'Atualizando galeria...');
    fetchMedia();
  };

  // --- DELETE MEDIA ---
  const handleDelete = async (item: MediaAsset) => {
    if (!canDelete) {
      error('Acesso Negado', 'Permissão insuficiente para remover mídias.');
      return;
    }

    const inPrograms = programs.some((p) => p.heroImage === item.url || (p.gallery && p.gallery.includes(item.url)));
    const inStories = stories.some((s) => s.heroImage === item.url);

    if (inPrograms || inStories) {
      const proceed = window.confirm(
        `AVISO DE SEGURANÇA:\nEsta foto está atualmente em uso em programas ou notícias do site!\n\nTem certeza de que deseja excluí-la do acervo?`
      );
      if (!proceed) return;
    } else {
      if (!window.confirm(`Excluir a foto "${item.title || item.originalName}" do acervo?`)) return;
    }

    try {
      await api.deleteMedia(item.id);
      success('Mídia Excluída', 'Foto removida do acervo.');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao excluir mídia', err.message);
    }
  };

  // --- CREATE ALBUM ---
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle.trim()) {
      error('Informe o título do álbum/evento.');
      return;
    }

    setAlbumCreating(true);
    try {
      await api.createAlbum({
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        category: albumCategory,
      });

      success('Álbum Criado!', `Álbum "${albumTitle}" adicionado.`);
      setShowAlbumModal(false);
      setAlbumTitle('');
      setAlbumDesc('');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao criar álbum', err.message);
    } finally {
      setAlbumCreating(false);
    }
  };

  // --- AI GEMINI ANALYSIS & CLUSTERING HANDLERS ---
  const handleRunAIAnalysis = async (targetIds?: string[], forceReanalyze: boolean = false) => {
    setAiAnalyzing(true);
    try {
      const job = await api.analyzeMediaWithAI(targetIds, forceReanalyze);
      setActiveAIJob(job);
      startAIJobPolling(job.id);
      success('Processamento IA Iniciado', `Iniciada análise de ${job.totalItems} fotos em segundo plano.`);
    } catch (err: any) {
      if (err.message?.includes('409') || err.job) {
        warning('Processamento já em andamento', 'Existe um job de IA sendo executado.');
        if (err.job) {
          setActiveAIJob(err.job);
          startAIJobPolling(err.job.id);
        }
      } else {
        error('Erro ao iniciar análise IA', err.message);
      }
      setAiAnalyzing(false);
    }
  };

  const handleRunAIClustering = async () => {
    setAiClustering(true);
    try {
      const result = await api.clusterMediaWithAI();
      setAiClusters(result.clusters);
      success('Agrupamento Concluído!', `${result.clusters.length} propostas de álbuns geradas pelo Gemini. Revise-as abaixo.`);
    } catch (err: any) {
      error('Erro no Agrupamento de IA', err.message);
    } finally {
      setAiClustering(false);
    }
  };

  const handleApproveCluster = async (cluster: AIClusterGroup) => {
    setIsApprovingProposal(true);
    try {
      const res = await api.approveAIClusterProposal(cluster.id);
      success('Álbum Aprovado!', `Álbum "${cluster.title}" foi criado com sucesso.`);
      setIsReviewingProposal(false);
      setAiClusters((prev) => prev.filter((c) => c.id !== cluster.id));
      fetchMedia();
    } catch (err: any) {
      error('Erro ao aprovar proposta', err.message);
    } finally {
      setIsApprovingProposal(false);
    }
  };

  const handleStartReview = (cluster: AIClusterGroup) => {
    setReviewProposal(cluster);
    setReviewTitle(cluster.title);
    setReviewDescription(cluster.description || '');
    setReviewSelectedIds([]);
    setIsReviewingProposal(true);
  };

  const handleSaveProposal = async () => {
    if (!reviewProposal) return;
    setIsSavingProposal(true);
    try {
      const updated = await api.updateAIClusterProposal(reviewProposal.id, {
        title: reviewTitle,
        description: reviewDescription,
        mediaIds: reviewProposal.mediaIds,
      });
      setAiClusters(prev => prev.map(c => c.id === updated.id ? updated : c));
      setReviewProposal(updated);
      success('Alterações Salvas!', 'A proposta foi atualizada com sucesso.');
    } catch (err: any) {
      error('Erro ao salvar proposta', err.message);
    } finally {
      setIsSavingProposal(false);
    }
  };

  const handleRemoveFromProposal = async (mediaIdsToRemove: string[]) => {
    if (!reviewProposal) return;
    const newMediaIds = reviewProposal.mediaIds.filter(id => !mediaIdsToRemove.includes(id));
    
    try {
      const updated = await api.updateAIClusterProposal(reviewProposal.id, {
        mediaIds: newMediaIds,
      });
      setAiClusters(prev => prev.map(c => c.id === updated.id ? updated : c));
      setReviewProposal(updated);
      setReviewSelectedIds([]);
      success('Mídia Removida', `${mediaIdsToRemove.length} foto(s) removida(s) da proposta.`);
    } catch (err: any) {
      error('Erro ao remover da proposta', err.message);
    }
  };

  const handleMoveToProposal = async (mediaIdsToMove: string[], targetId: string) => {
    if (!reviewProposal) return;
    
    try {
      // 1. Remove from current
      const newMediaIds = reviewProposal.mediaIds.filter(id => !mediaIdsToMove.includes(id));
      await api.updateAIClusterProposal(reviewProposal.id, { mediaIds: newMediaIds });

      // 2. Add to target
      const target = aiClusters.find(c => c.id === targetId);
      if (target) {
        const combined = Array.from(new Set([...target.mediaIds, ...mediaIdsToMove]));
        await api.updateAIClusterProposal(targetId, { mediaIds: combined });
      }

      // Refresh everything
      await fetchAIProposals();
      
      // Update local review state if target is not current
      if (reviewProposal.id === targetId) {
        // Should not happen if target list is correct
      } else {
        const updatedCurrent = (await api.getAIClusterProposals()).clusters.find(c => c.id === reviewProposal.id);
        if (updatedCurrent) setReviewProposal(updatedCurrent);
      }

      setReviewSelectedIds([]);
      success('Mídia Movimentada', `${mediaIdsToMove.length} foto(s) movida(s) para outra proposta.`);
    } catch (err: any) {
      error('Erro ao mover mídia', err.message);
    }
  };

  const handleCreateNewProposal = async () => {
    if (!reviewProposal || reviewSelectedIds.length === 0) return;
    
    const newTitle = prompt('Digite o nome da nova proposta:', 'Novo Agrupamento Manual');
    if (!newTitle) return;

    try {
      // 1. Remove from current
      const newMediaIds = reviewProposal.mediaIds.filter(id => !reviewSelectedIds.includes(id));
      await api.updateAIClusterProposal(reviewProposal.id, { mediaIds: newMediaIds });

      // 2. Create new (I'll use apiRouter.post('/media/ai-cluster') equivalent or add a specific one)
      // For now, let's just use a special ID
      const newProposal: AIClusterGroup = {
        id: `manual-${Date.now()}`,
        title: newTitle,
        suggestedEventType: 'Agrupamento Manual',
        sceneType: 'mixed',
        confidence: 'ALTA',
        description: 'Grupo criado manualmente a partir de uma revisão de IA.',
        mediaIds: [...reviewSelectedIds],
        visibleTexts: [],
        status: 'MODIFIED',
      };

      // Since I don't have a direct POST /api/media/ai-cluster-proposals yet, I'll update the whole list or add the endpoint
      // Actually, I'll just add the endpoint to routes.ts and api.ts for completeness.
      // But for now, I'll assume I can just update the list.
      const currentProposals = await api.getAIClusterProposals();
      const newList = [...currentProposals.clusters, newProposal];
      
      // I'll add a setAIClusterProposals endpoint to api.ts/routes.ts
      await api.setAIClusterProposals(newList);
      
      await fetchAIProposals();
      const updatedCurrent = (await api.getAIClusterProposals()).clusters.find(c => c.id === reviewProposal.id);
      if (updatedCurrent) setReviewProposal(updatedCurrent);
      
      setReviewSelectedIds([]);
      success('Novo Grupo Criado', `Foram movidas ${reviewSelectedIds.length} fotos para "${newTitle}".`);
    } catch (err: any) {
      error('Erro ao criar novo grupo', err.message);
    }
  };

  // --- COMPRESSED ARCHIVE (.ZIP) HANDLER & POLLING ---
  const pollingRef = useRef<any>(null);
  const [activeImportJob, setActiveImportJob] = useState<MediaImportJob | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const startJobPolling = (jobId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const job = await api.getImportJob(jobId);
        setActiveImportJob(job);

        // Terminating states
        if (
          job.status === 'COMPLETED' ||
          job.status === 'ERROR' ||
          job.status === 'CANCELLED' ||
          job.status === 'WAITING_DUPLICATE_REVIEW'
        ) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setIsProcessingArchive(false);
          fetchMedia();

          if (job.status === 'COMPLETED') {
            success('Importação Concluída!', `Pacote "${job.archiveName}" foi importado com sucesso.`);
          } else if (job.status === 'WAITING_DUPLICATE_REVIEW') {
            warning('Importação Concluída!', 'Imagens carregadas. Existem duplicidades detectadas que requerem revisão humana.');
          } else if (job.status === 'CANCELLED') {
            warning('Importação Cancelada', 'O processamento do pacote foi cancelado pelo administrador.');
          } else {
            error('Falha na Importação', 'Ocorreu um erro no processamento das imagens.');
          }
        }
      } catch (err: any) {
        console.error('Erro ao consultar status da importação:', err);
      }
    }, 1500);
  };

  const startAIJobPolling = (jobId: string) => {
    if (!jobId) return;

    if (pollingAIRef.current) {
      clearInterval(pollingAIRef.current);
      pollingAIRef.current = null;
    }

    let consecutiveErrors = 0;

    pollingAIRef.current = setInterval(async () => {
      try {
        const job = await api.getAIJob(jobId);
        consecutiveErrors = 0;
        setActiveAIJob(job);

        if (
          job.status === 'COMPLETED' ||
          job.status === 'COMPLETED_WITH_ERRORS' ||
          job.status === 'FAILED' ||
          job.status === 'CANCELLED'
        ) {
          if (pollingAIRef.current) {
            clearInterval(pollingAIRef.current);
            pollingAIRef.current = null;
          }
          setAiAnalyzing(false);
          fetchMedia();

          if (job.status === 'COMPLETED') {
            success('Processamento IA Concluído!', `${job.successItems} fotografias analisadas com sucesso.`);
          } else if (job.status === 'COMPLETED_WITH_ERRORS') {
            warning('Processamento IA Concluído', `${job.successItems} sucessos, ${job.failedItems} falhas.`);
          } else if (job.status === 'CANCELLED') {
            warning('Análise Cancelada', 'O processamento IA foi interrompido.');
          } else {
            error('Falha na Análise IA', job.lastError || 'Ocorreu um erro desconhecido.');
          }
        }
      } catch (err: any) {
        consecutiveErrors++;
        console.error(`[MediaAI Polling] Erro ao consultar status do job de IA (${jobId}):`, err.message || err);

        // Terminate polling on 404/not found or repeated failure to prevent hanging intervals
        const isNotFound = err.message?.includes('não encontrado') || err.message?.includes('404');
        if (isNotFound || consecutiveErrors >= 3) {
          console.warn(`[MediaAI Polling] Encerrando polling para jobId=${jobId} devido a erro (${err.message})`);
          if (pollingAIRef.current) {
            clearInterval(pollingAIRef.current);
            pollingAIRef.current = null;
          }
          setAiAnalyzing(false);
        }
      }
    }, 2000);
  };

  const handleArchiveSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous traces and progress
    setImportTrace([]);
    setUploadProgress(0);
    setImportDiagnosticInfo(null);

    addTrace('[ARCHIVE TRACE 08] HANDLER_START', 'HANDLER_START');

    const file = e.target.files?.[0];
    if (!file) {
      addTrace('[ARCHIVE TRACE ERROR] No file selected', 'ERROR');
      return;
    }

    addTrace(`[ARCHIVE TRACE 05] FILE_SELECTED: ${file.name} (${file.size} bytes)`, 'FILE_SELECTED');
    setImportDiagnosticInfo({
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      lastStage: 'FILE_SELECTED',
    });

    addTrace('[ARCHIVE TRACE 06] VALIDATION_START', 'VALIDATION_START');
    if (
      !file.name.toLowerCase().endsWith('.zip') &&
      !file.name.toLowerCase().endsWith('.rar') &&
      !file.name.toLowerCase().endsWith('.7z')
    ) {
      addTrace('[ARCHIVE TRACE ERROR] Invalid file format', 'ERROR');
      error('Formato inválido', 'Selecione um arquivo compactado .ZIP, .RAR ou .7Z.');
      return;
    }
    addTrace('[ARCHIVE TRACE 07] VALIDATION_OK', 'VALIDATION_OK');

    setIsProcessingArchive(true);
    setArchiveReport(null);
    setActiveImportJob(null);

    try {
      addTrace('[ARCHIVE TRACE 09] REQUEST_BUILD_START', 'REQUEST_BUILD_START');
      addTrace('[ARCHIVE TRACE 10] REQUEST_SEND_START', 'REQUEST_SEND_START');
      
      const report = await api.uploadArchive(file, (pct) => {
        setUploadProgress(pct);
        addTrace(`[ARCHIVE TRACE] FETCH_PROGRESS: ${pct}%`, 'UPLOADING');
      });

      addTrace('[ARCHIVE TRACE 11] RESPONSE_RECEIVED', 'RESPONSE_RECEIVED');
      const jobId = report.job?.id || report.jobId;
      if (jobId) {
        setActiveImportJob(report.job || null);
        startJobPolling(jobId);
        addTrace('[ARCHIVE TRACE 12] FRONTEND_COMPLETE (Polling Started)', 'FRONTEND_COMPLETE');
        success('Processando Pacote', 'O arquivo compactado foi enviado. Iniciando extração e indexação em segundo plano...');
      } else {
        // Fallback to legacy structure
        setArchiveReport(report);
        setIsProcessingArchive(false);
        addTrace('[ARCHIVE TRACE 12] FRONTEND_COMPLETE (Legacy Mode Complete)', 'FRONTEND_COMPLETE');
        success('Pacote Importado!', 'Fotos extraídas com sucesso.');
        fetchMedia();
      }
    } catch (err: any) {
      addTrace(`[ARCHIVE TRACE ERROR] Stage: UPLOAD, Error: ${err.message}`, 'ERROR');
      setImportDiagnosticInfo(prev => ({
        ...prev,
        error: err.message,
        lastStage: 'ERROR',
      }));
      error('Erro ao enviar pacote', err.message);
      setIsProcessingArchive(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar o processamento deste pacote? Mídias já salvas no R2 serão preservadas, mas os arquivos restantes serão ignorados.')) {
      return;
    }

    try {
      const res = await api.cancelImportJob(jobId);
      setActiveImportJob(res.job);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsProcessingArchive(false);
      success('Processamento Cancelado', 'O envio foi cancelado com sucesso.');
      fetchMedia();
    } catch (err: any) {
      error('Erro ao cancelar', err.message);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setIsProcessingArchive(true);
      const res = await api.retryImportJob(jobId);
      setActiveImportJob(res.job);
      success('Processamento Retomado', 'O processamento em massa foi retomado com sucesso.');
      startJobPolling(jobId);
    } catch (err: any) {
      error('Erro ao retomar', err.message);
    }
  };

  // --- DUPLICATE SCANNER & RESOLUTION HANDLERS ---
  const handleScanDuplicates = async () => {
    setScanningDuplicates(true);
    try {
      const res = await api.scanDuplicates();
      const report = [
        `${res.totalScanned} mídias analisadas no acervo.`,
        `${res.reevaluatedCount || 0} grupos existentes reavaliados.`,
        `${res.keptCount || 0} mantidos.`,
        `${res.removedCount || 0} falsos positivos removidos da fila de revisão.`,
        `${res.reclassifiedCount || 0} grupos reclassificados.`,
        `${res.newGroupsCount} novos grupos identificados.`
      ].join(' ');

      success('Revarredura Estrutural Concluída!', report);
      fetchDuplicates();
    } catch (err: any) {
      error('Erro ao varrer biblioteca', err.message);
    } finally {
      setScanningDuplicates(false);
    }
  };

  const isIcon = (asset: MediaAsset) => {
    if (asset.category === 'ÍCONE / FAVICON') return true;
    if (asset.originalName.toLowerCase().includes('favicon') || asset.originalName.toLowerCase().includes('icon')) return true;
    if (asset.dimensions) {
      const parts = asset.dimensions.split('x');
      if (parts.length === 2) {
        const w = parseInt(parts[0]);
        const h = parseInt(parts[1]);
        if (!isNaN(w) && !isNaN(h) && w <= 128 && h <= 128) return true;
      }
    }
    return false;
  };

  const handleOpenGroupReview = (group: DuplicateGroup & { mediaAssets: MediaAsset[] }) => {
    setSelectedGroup(group);
    const keepId = group.recommendation?.keepMediaId || group.primaryMediaId || group.mediaAssets[0]?.id || '';
    setMasterMediaId(keepId);

    const initialActions: Record<string, 'keep' | 'consolidate' | 'trash' | 'delete'> = {};
    group.mediaAssets.forEach((asset) => {
      if (asset.id === keepId) {
        initialActions[asset.id] = 'keep';
      } else {
        const locs = group.assetUsages?.[asset.id] || [];
        if (locs.length > 0) {
          initialActions[asset.id] = 'consolidate';
        } else {
          initialActions[asset.id] = 'trash';
        }
      }
    });

    setDuplicateActions(initialActions);
  };

  const handleApplyDuplicateResolution = async () => {
    if (!selectedGroup) return;

    // 1. Validation: Block delete/trash of in-use media
    for (const asset of selectedGroup.mediaAssets) {
      const action = duplicateActions[asset.id];
      const locs = selectedGroup.assetUsages?.[asset.id] || [];
      if ((action === 'trash' || action === 'delete') && locs.length > 0) {
        warning(
          'Ação Bloqueada por Segurança',
          `Não é possível excluir ou enviar para a lixeira o arquivo "${asset.originalName}" porque ele está em uso em ${locs.length} locais. Escolha "Consolidar" para redirecionar os usos para o arquivo Mestre.`
        );
        return;
      }
    }

    // 2. Favicon / High-Res Compatibility check
    const masterAsset = selectedGroup.mediaAssets.find(a => a.id === masterMediaId);
    if (masterAsset) {
      const masterIsIcon = isIcon(masterAsset);
      for (const asset of selectedGroup.mediaAssets) {
        const action = duplicateActions[asset.id];
        if (action === 'consolidate' && asset.id !== masterMediaId) {
          const targetIsIcon = isIcon(asset);
          if (masterIsIcon !== targetIsIcon) {
            const confirmProceed = window.confirm(
              `⚠️ ALERTA DE COMPATIBILIDADE:\n\nVocê está prestes a consolidar um ícone/favicon com uma imagem regular de grande resolução (ou vice-versa):\n\n- Mestre: ${masterAsset.originalName} (${masterAsset.dimensions})\n- Alvo: ${asset.originalName} (${asset.dimensions})\n\nSubstituir o arquivo em uso pode distorcer a exibição em áreas críticas (como favicon na aba do navegador ou logotipo na barra de navegação).\n\nDeseja continuar com a consolidação mesmo assim?`
            );
            if (!confirmProceed) return;
          }
        }
      }
    }

    setIsResolvingDuplicates(true);
    try {
      // 3. Perform Consolidations first!
      const targetsToConsolidate = Object.entries(duplicateActions)
        .filter(([id, act]) => act === 'consolidate' && id !== masterMediaId)
        .map(([id]) => id);

      let consolidateMsg = '';
      if (targetsToConsolidate.length > 0) {
        const cRes = await api.consolidateMedia(masterMediaId, targetsToConsolidate);
        consolidateMsg = cRes.message;
        if (cRes.warnings && cRes.warnings.length > 0) {
          cRes.warnings.forEach((w) => success('Informação de Consolidação', w));
        }
      }

      // 4. Resolve remaining explicit actions (keep, trash, delete) for non-consolidated items
      const actionsList = Object.entries(duplicateActions)
        .filter(([id, action]) => action !== 'consolidate')
        .map(([mediaId, action]) => ({
          mediaId,
          action: action as 'keep' | 'trash' | 'delete',
        }));

      if (actionsList.length > 0) {
        const res = await api.resolveDuplicates(selectedGroup.id, actionsList);
        success('Resolução Concluída!', res.message);
      } else if (consolidateMsg) {
        success('Consolidação Concluída!', consolidateMsg);
      }
      setSelectedGroup(null);
      fetchMedia();
    } catch (err: any) {
      error('Erro ao resolver duplicidades', err.message);
    } finally {
      setIsResolvingDuplicates(false);
    }
  };

  const handleCreateTestDuplicateScenario = async () => {
    if (!window.confirm('Deseja gerar um cenário real de teste de duplicidades com 3 fotos (A em uso, B em uso, C sem uso)?')) return;
    try {
      const res = await api.createTestDuplicateScenario();
      success('Cenário de Teste Criado!', res.message);
      fetchMedia();
    } catch (err: any) {
      error('Erro ao criar cenário de teste', err.message);
    }
  };

  const handleDismissDuplicates = async () => {
    if (!selectedGroup) return;
    if (!window.confirm('Confirmar decisão: Estes arquivos NÃO são duplicados e não devem mais aparecer nesta revisão?')) return;

    try {
      await api.dismissDuplicates(selectedGroup.id);
      success('Decisão Registrada', 'Os arquivos não serão mais considerados duplicados em varreduras futuras.');
      setSelectedGroup(null);
      fetchDuplicates();
    } catch (err: any) {
      error('Erro ao registrar decisão', err.message);
    }
  };

  // --- TRASH (LIXEIRA) HANDLERS ---
  const handleRestoreTrash = async (ids?: string[]) => {
    const targetIds = ids || selectedTrashIds;
    if (targetIds.length === 0) return;

    setIsRestoringTrash(true);
    try {
      await api.restoreTrashedMedia(targetIds);
      success('Mídias Restauradas!', `${targetIds.length} foto(s) retornaram à galeria ativa.`);
      setSelectedTrashIds([]);
      fetchMedia();
    } catch (err: any) {
      error('Erro ao restaurar', err.message);
    } finally {
      setIsRestoringTrash(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (
      !window.confirm(
        'ATENÇÃO: Deseja realmente excluir permanentemente todas as fotos da Lixeira? Esta ação apaga os arquivos do Cloudflare R2 e não pode ser desfeita.'
      )
    ) {
      return;
    }

    setIsEmptyingTrash(true);
    try {
      const res = await api.emptyTrash();
      success('Lixeira Esvaziada', `${res.deletedCount} arquivo(s) foram excluídos do servidor R2.`);
      fetchMedia();
    } catch (err: any) {
      error('Erro ao esvaziar lixeira', err.message);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  // --- FILTERED MEDIA LIST ---
  const filteredMedia = mediaList.filter((m) => {
    const query = search.toLowerCase();
    const matchesSearch =
      (m.title || m.originalName || m.organizedName || m.displayName || m.altText || m.aiDescription || '').toLowerCase().includes(query) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(query))) ||
      (m.aiVisibleText && m.aiVisibleText.toLowerCase().includes(query)) ||
      (m.eventName && m.eventName.toLowerCase().includes(query)) ||
      (m.category && m.category.toLowerCase().includes(query));

    const matchesAlbum = selectedAlbumFilter === 'all' ? true : selectedAlbumFilter === 'none' ? !m.albumId : m.albumId === selectedAlbumFilter;
    const matchesCategory = selectedCategoryFilter === 'all' ? true : (m.category || 'NÃO CLASSIFICADO') === selectedCategoryFilter;

    return matchesSearch && matchesAlbum && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* HEADER & TOP TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-amber-600" />
            <span>Biblioteca Inteligente de Mídia</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de acervo de fotos institucionais, upload em massa direto para R2 e organização assistida por IA Gemini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyzeAcervo}
            disabled={isAnalyzingAcervo}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {isAnalyzingAcervo ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analisando Acervo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-amber-950" />
                <span>ANALISAR E ORGANIZAR ACERVO ATUAL</span>
              </>
            )}
          </button>

          {canManageAlbums && (
            <button
              type="button"
              onClick={() => setShowAlbumModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <FolderPlus className="w-4 h-4 text-slate-600" />
              <span>Novo Álbum</span>
            </button>
          )}

          {canBulkUpload && (
            <button
              type="button"
              onClick={() => setActiveTab('bulk_upload')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload em Massa</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'gallery'
              ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Acervo Geral ({mediaList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk_upload')}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'bulk_upload'
              ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Importar & Pacotes ZIP</span>
        </button>

        {canReviewDuplicates && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('duplicates');
              fetchDuplicates();
            }}
            className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 relative ${
              activeTab === 'duplicates'
                ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GitCompare className="w-4 h-4 text-orange-500" />
            <span>Revisão de Duplicidades</span>
            {duplicateGroups.length > 0 && (
              <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                {duplicateGroups.length}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('ai_organization')}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'ai_organization'
              ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Organização IA Gemini</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('albums')}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'albums'
              ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Álbuns & Eventos ({albums.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('naming_config');
            fetchNamingConfig();
          }}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'naming_config'
              ? 'bg-amber-500/10 text-amber-700 border-b-2 border-amber-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          <span>Configurações de Nomenclatura</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('trash');
            fetchTrash();
          }}
          className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'trash'
              ? 'bg-red-500/10 text-red-700 border-b-2 border-red-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>Lixeira ({trashedMediaList.length})</span>
        </button>
      </div>

      {/* TAB 1: ACERVO GERAL (GALLERY VIEW) */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          {/* DIAGNOSTIC BANNER ("ANALISAR E ORGANIZAR ACERVO ATUAL") */}
          {showDiagnosticBanner && acervoDiagnostic && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase">
                      Diagnóstico do Acervo ADMIR
                    </span>
                    <span className="text-xs text-slate-400">Varredura Efetuada com Sucesso</span>
                  </div>
                  <h3 className="text-base font-bold font-serif-heading text-white">
                    Relatório de Classificação & Organização do Acervo
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sua biblioteca contém <strong className="text-amber-400">{acervoDiagnostic.totalScanned} mídias</strong>.
                    Análise identificou <strong className="text-amber-400">{acervoDiagnostic.unclassifiedCount} itens sem classificação</strong> e{' '}
                    <strong className="text-amber-400">{acervoDiagnostic.pendingDuplicatesCount ?? acervoDiagnostic.duplicateGroupsCount ?? 0} grupos de duplicatas</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDiagnosticBanner(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                  title="Fechar relatório"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CATEGORIES BREAKDOWN BADGES */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
                {Object.entries(acervoDiagnostic.categoryCounts || {}).map(([cat, count]) => (
                  <div
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`cursor-pointer text-xs px-2.5 py-1 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategoryFilter === cat
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>🏷️ {cat}</span>
                    <span className="bg-slate-950/40 px-1.5 py-0.2 rounded-md text-[10px] text-amber-300 font-mono">{count}</span>
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS FROM DIAGNOSTIC */}
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('NÃO CLASSIFICADO')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Revisar Sem Classificação ({acervoDiagnostic.unclassifiedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('duplicates');
                    fetchDuplicates();
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Revisar Duplicidades ({acervoDiagnostic.pendingDuplicatesCount ?? acervoDiagnostic.duplicateGroupsCount ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenBatchRenameModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5 text-amber-300" />
                  <span>Prévia de Padronização de Nomes ({acervoDiagnostic.renamePreviews?.length || 0})</span>
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE FILTROS E AÇÕES EM MASSA */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por título, tag, OCR ou evento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Filtro por Categoria */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/50 font-medium text-amber-950"
              >
                <option value="all">Todas as Categorias</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    🏷️ {cat}
                  </option>
                ))}
              </select>

              {/* Filtro por Álbum */}
              <select
                value={selectedAlbumFilter}
                onChange={(e) => setSelectedAlbumFilter(e.target.value)}
                className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-700"
              >
                <option value="all">Todos os Álbuns</option>
                <option value="none">Sem Álbum (Avulsas)</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    📁 {a.title} ({a.mediaCount || 0})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50"
              >
                {selectedIds.length === filteredMedia.length && filteredMedia.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Selecionar Tudo ({selectedIds.length})</span>
              </button>
            </div>

            {/* Ações para itens selecionados */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs w-full md:w-auto justify-between">
                <span className="font-semibold text-amber-900">{selectedIds.length} selecionadas</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar em Massa</span>
                  </button>

                  {canAIOrganize && (
                    <button
                      type="button"
                      onClick={() => handleRunAIAnalysis(selectedIds)}
                      disabled={aiAnalyzing}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{aiAnalyzing ? 'Analisando...' : 'Analisar IA'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GRID DE MÍDIAS */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span>Carregando acervo de mídias da ADMIR...</span>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-300">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">Nenhuma fotografia encontrada para os filtros selecionados.</p>
              <p className="text-slate-400 mt-1">
                Tente alterar a busca ou utilize o botão <strong className="text-amber-600">Upload em Massa</strong> para adicionar novas fotos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredMedia.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group relative ${
                      isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Select Checkbox Overlay */}
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(item.id)}
                      className="absolute top-2 left-2 z-10 bg-slate-900/60 hover:bg-slate-900 text-white p-1 rounded-lg backdrop-blur-sm transition-colors"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4 text-white/80" />}
                    </button>

                    {/* Image Preview */}
                    <div className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedAsset(item)}>
                      <img
                        src={item.thumbUrl || item.url}
                        alt={item.altText || item.title || item.originalName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/media/events/brazil-2025-mission-1.jpg';
                        }}
                      />

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <span className="bg-amber-950/80 text-amber-300 font-semibold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm border border-amber-500/30">
                          🏷️ {item.category || 'NÃO CLASSIFICADO'}
                        </span>
                        {item.aiAnalyzed && (
                          <span className="bg-purple-900/80 text-purple-200 font-semibold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>IA</span>
                          </span>
                        )}
                        {item.aiStatus === 'PROCESSING' && (
                          <span className="bg-amber-500/80 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>ANALISANDO...</span>
                          </span>
                        )}
                        {item.aiStatus === 'FAILED' && (
                          <span className="bg-rose-600/80 text-white font-bold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1" title={item.aiError}>
                            <AlertCircle className="w-3 h-3" />
                            <span>ERRO IA</span>
                          </span>
                        )}
                      </div>

                      {item.albumTitle && (
                        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/75 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm truncate">
                          📁 {item.albumTitle}
                        </div>
                      )}
                    </div>

                    {/* Metadata Content */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 truncate" title={item.title || item.originalName}>
                          {item.title || item.originalName}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.aiDescription || item.caption || item.altText || 'Fotografia institucional sem descrição.'}
                        </p>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-md">
                              #{tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium">+{item.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : 'Local'}</span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUsageModal(item);
                            }}
                            className="p-1 hover:bg-amber-50 text-amber-700 rounded-md transition-colors"
                            title="Ver locais de utilização no site"
                          >
                            <Link2 className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedAsset(item)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-md transition-colors"
                            title="Ver Detalhes completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-md transition-colors"
                            title="Copiar URL"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded-md transition-colors"
                              title="Excluir da biblioteca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD EM MASSA E ARQUIVOS COMPACTADOS (.ZIP) */}
      {activeTab === 'bulk_upload' && (
        <div className="space-y-6">
          {/* PAINEL CENTRAL DE UPLOAD EM MASSA */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800 space-y-4">
            <div className="space-y-1">
              <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                Área de Upload em Massa & Pacotes
              </span>
              <h2 className="text-xl font-bold font-serif-heading text-white flex items-center gap-2 mt-1.5">
                <UploadCloud className="w-5 h-5 text-amber-400" />
                <span>Upload em Massa unificado</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                Envie várias fotografias simultaneamente ou carregue pacotes compactados contendo centenas de imagens. 
                Os arquivos serão validados estruturalmente (Magic Bytes), analisados quanto a duplicidades (Hash SHA-256 / dHash) 
                e salvos de forma assíncrona no Cloudflare R2 com total resiliência.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LADO ESQUERDO: PACOTE COMPACTADO (.ZIP, .RAR, .7Z) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Importação de Acervo via ZIP / RAR</h3>
                  <p className="text-[10px] text-slate-500">Indicado para grandes volumes de fotos históricas organizedas em pastas</p>
                </div>
              </div>

              <input
                type="file"
                ref={archiveInputRef}
                accept=".zip,.rar,.7z,application/zip,application/x-zip-compressed"
                className="hidden"
                onClick={() => {
                  console.log('[ARCHIVE TRACE 02] FILE_INPUT_CLICK');
                  addTrace('[ARCHIVE TRACE 02] FILE_INPUT_CLICK');
                }}
                onChange={(e) => {
                  console.log('[ARCHIVE TRACE 03] FILE_INPUT_CHANGE');
                  addTrace('[ARCHIVE TRACE 03] FILE_INPUT_CHANGE');
                  if (e.target.files) {
                    addTrace(`[ARCHIVE TRACE 04] FILES_COUNT: ${e.target.files.length}`);
                  }
                  handleArchiveSelected(e);
                }}
              />
              {/* DRAG AND DROP ZONE FOR ZIP */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    addTrace('[ARCHIVE TRACE 03] FILE_INPUT_CHANGE (via drag & drop)');
                    // Trigger upload
                    const mockEvent = { target: { files: [file], value: '' } } as any;
                    handleArchiveSelected(mockEvent);
                  }
                }}
                onClick={() => {
                  console.log('[ARCHIVE TRACE 01] DROPZONE_CLICK');
                  addTrace('[ARCHIVE TRACE 01] DROPZONE_CLICK');
                  archiveInputRef.current?.click();
                }}
                className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/10 hover:bg-purple-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Clique para selecionar ou arraste o arquivo .ZIP / .RAR aqui</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Extração e processamento tolerante a falhas</p>
                </div>
              </div>

              {/* PAINEL DE DIAGNÓSTICO TEMPORÁRIO (FASE DE UPLOAD E CONEXÃO) */}
              {(isProcessingArchive || importTrace.length > 0) && (
                <div className="border border-purple-200 bg-purple-50/20 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Settings className={`w-3.5 h-3.5 text-purple-600 ${isProcessingArchive && !activeImportJob ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-bold text-slate-800">Diagnóstico da Importação</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
                      className="text-[10px] text-purple-600 hover:text-purple-800 underline font-medium"
                    >
                      {showDiagnosticPanel ? 'Ocultar' : 'Exibir'}
                    </button>
                  </div>

                  {showDiagnosticPanel && (
                    <div className="space-y-3">
                      {/* STATS */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-medium">Arquivo Selecionado</span>
                          <span className="font-semibold text-slate-700 truncate block max-w-[130px]" title={importDiagnosticInfo?.fileName}>
                            {importDiagnosticInfo?.fileName || 'Detectando...'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Tamanho Estimado</span>
                          <span className="font-semibold text-slate-700 block">
                            {importDiagnosticInfo?.fileSize || 'Calculando...'}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 block font-medium">Último Checkpoint</span>
                          <span className="font-bold text-purple-700 block uppercase font-mono tracking-tight text-[9px]">
                            {importDiagnosticInfo?.lastStage || 'Aguardando...'}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 block font-medium">Status do Envio</span>
                          <span className={`font-semibold block ${importDiagnosticInfo?.error ? 'text-rose-600' : 'text-slate-600'}`}>
                            {importDiagnosticInfo?.error ? 'Falha de Conexão' : isProcessingArchive ? 'Transmitindo...' : 'Finalizado'}
                          </span>
                        </div>
                      </div>

                      {/* REAL-TIME UPLOAD PROGRESS */}
                      {isProcessingArchive && !activeImportJob && uploadProgress !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Transmissão Binária (Upload)</span>
                            <span className="font-bold text-purple-700">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 transition-all duration-150 animate-pulse"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 italic">Enviando dados compactados ao servidor...</p>
                        </div>
                      )}

                      {/* LIVE TRACE LOGS */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550 block">Logs de Rastreamento (Checkpoints):</span>
                        <div className="bg-slate-900 text-slate-300 font-mono text-[9px] p-2.5 rounded-xl max-h-32 overflow-y-auto space-y-1 border border-slate-800 scrollbar-thin">
                          {importTrace.length === 0 ? (
                            <span className="text-slate-500 italic block">Nenhum log registrado. Selecione um arquivo para começar.</span>
                          ) : (
                            importTrace.map((log, idx) => (
                              <div key={idx} className="leading-tight border-b border-slate-800 pb-1 last:border-b-0 break-all text-slate-400">
                                {log.includes('ERROR') ? (
                                  <span className="text-rose-400 font-semibold">{log}</span>
                                ) : log.includes('SUCCESS') || log.includes('COMPLETE') || log.includes('OK') ? (
                                  <span className="text-emerald-400 font-semibold">{log}</span>
                                ) : (
                                  <span>{log}</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* ERROR ALERT */}
                      {importDiagnosticInfo?.error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] flex gap-1.5 items-start">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold block text-rose-800">Erro Identificado</strong>
                            <p className="font-mono">{importDiagnosticInfo.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PROGRESSO EM TEMPO REAL DA IMPORTAÇÃO ATIVA */}
              {activeImportJob && (
                <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[60%]">
                      {activeImportJob.archiveName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        activeImportJob.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeImportJob.status === 'PROCESSING' || activeImportJob.status === 'EXTRACTING'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : activeImportJob.status === 'CANCELLED'
                          ? 'bg-slate-200 text-slate-600'
                          : activeImportJob.status === 'WAITING_DUPLICATE_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {activeImportJob.status === 'IDLE' && 'Fila de Espera'}
                      {activeImportJob.status === 'EXTRACTING' && 'Extraindo ZIP...'}
                      {activeImportJob.status === 'PROCESSING' && 'Importando Mídias...'}
                      {activeImportJob.status === 'WAITING_DUPLICATE_REVIEW' && 'Aguardando Revisão'}
                      {activeImportJob.status === 'COMPLETED' && 'Concluído'}
                      {activeImportJob.status === 'CANCELLED' && 'Cancelado'}
                      {activeImportJob.status === 'ERROR' && 'Erro Crítico'}
                    </span>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Progresso</span>
                      <span>
                        {activeImportJob.processedItems} / {activeImportJob.totalItems || '?'} arquivos
                        {activeImportJob.totalItems ? ` (${Math.round((activeImportJob.processedItems / activeImportJob.totalItems) * 100)}%)` : ''}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          activeImportJob.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : activeImportJob.status === 'ERROR'
                            ? 'bg-rose-500'
                            : activeImportJob.status === 'CANCELLED'
                            ? 'bg-slate-400'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: activeImportJob.totalItems
                            ? `${Math.min(100, (activeImportJob.processedItems / activeImportJob.totalItems) * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>

                  {/* METRIC CARD GRID */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-medium">Fotos Válidas</span>
                      <strong className="text-sm font-bold text-emerald-600">{activeImportJob.validImagesCount || activeImportJob.processedItems || 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-medium">Duplicidades</span>
                      <strong className="text-sm font-bold text-amber-600">{(activeImportJob.exactDuplicatesCount || 0) + (activeImportJob.probableDuplicatesCount || 0) + (activeImportJob.possibleDuplicatesCount || 0) || activeImportJob.duplicateItems || 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-medium">Não-Imagens</span>
                      <strong className="text-sm font-bold text-slate-600">{activeImportJob.ignoredFilesCount || 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-medium">Falhas / Erros</span>
                      <strong className="text-sm font-bold text-rose-600">{activeImportJob.failedItems || 0}</strong>
                    </div>
                  </div>

                  {/* FAILED FILES DETAILED ERROR LIST */}
                  {activeImportJob.items && activeImportJob.items.filter((item: any) => item.status === 'ERROR').length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl space-y-1.5 max-h-24 overflow-y-auto">
                      <span className="text-[9px] font-bold text-rose-800 block">Detalhes de falhas do pacote ({activeImportJob.items.filter((item: any) => item.status === 'ERROR').length}):</span>
                      {activeImportJob.items.filter((item: any) => item.status === 'ERROR').map((fail: any, idx: number) => (
                        <div key={idx} className="text-[9px] text-rose-700 flex justify-between font-mono">
                          <span className="truncate max-w-[50%]">{fail.originalName || fail.filename}</span>
                          <span className="text-rose-500 truncate max-w-[45%]" title={fail.error}>{fail.error}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIVE ACTIONS */}
                  <div className="flex gap-2 pt-1 justify-end">
                    {(activeImportJob.status === 'PROCESSING' || activeImportJob.status === 'EXTRACTING' || activeImportJob.status === 'IDLE') && (
                      <button
                        type="button"
                        onClick={() => handleCancelJob(activeImportJob.id)}
                        className="text-xs text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar Operação</span>
                      </button>
                    )}

                    {(activeImportJob.status === 'ERROR' || activeImportJob.status === 'CANCELLED') && (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(activeImportJob.id)}
                        className="text-xs text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retomar Envio</span>
                      </button>
                    )}

                    {activeImportJob.status === 'WAITING_DUPLICATE_REVIEW' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('duplicates');
                          fetchDuplicates();
                        }}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Ir para Revisão de Duplicidades</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LADO DIREITO: FOTOS AVULSAS DIRETO R2 */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Fotos Avulsas em Lote</h3>
                  <p className="text-[10px] text-slate-500">Arraste dezenas de arquivos direto de seu computador</p>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              />
              {/* DROPZONE FOTOS AVULSAS */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/10 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Clique para selecionar ou arraste fotografias aqui</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Suporta JPG, PNG, WEBP, GIF (streaming direto sem Base64)</p>
                </div>
              </div>

              {/* QUEUE CONTROLS */}
              {uploadQueue.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Fila de Transmissão ({uploadQueue.length})
                      </h4>
                      <p className="text-[9px] text-slate-500 font-medium">
                        Sucessos: {uploadQueue.filter((q) => q.status === 'COMPLETED').length} | Duplicadas: {uploadQueue.filter((q) => q.status === 'DUPLICATE').length}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={selectedQueueAlbum}
                        onChange={(e) => setSelectedQueueAlbum(e.target.value)}
                        className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                      >
                        <option value="">Álbum...</option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setUploadQueue([])}
                        className="text-[10px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 bg-white"
                      >
                        Limpar
                      </button>

                      <button
                        type="button"
                        onClick={processUploadQueue}
                        disabled={isUploading || uploadQueue.every((q) => q.status === 'COMPLETED' || q.status === 'DUPLICATE')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-lg text-[10px] disabled:opacity-50 flex items-center gap-1"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3 h-3" />
                            <span>Enviar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* LIST OF QUEUE ITEMS */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                    {uploadQueue.map((item) => (
                      <div key={item.id} className="p-2 rounded-xl border border-slate-100 bg-white flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-mono text-[9px] text-slate-500 shrink-0">
                            {item.name.split('.').pop()?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-[11px] truncate">{item.name}</p>
                            <p className="text-[9px] text-slate-400">{Math.round(item.size / 1024)} KB</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === 'PENDING' && <span className="text-[10px] text-slate-400">Fila</span>}
                          {item.status === 'UPLOADING' && <span className="text-[10px] text-blue-600 font-semibold animate-pulse">Enviando</span>}
                          {item.status === 'COMPLETED' && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              Salvo R2
                            </span>
                          )}
                          {item.status === 'DUPLICATE' && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                              Duplicada (Ignorada)
                            </span>
                          )}
                          {item.status === 'ERROR' && (
                            <span className="text-[10px] text-rose-600 font-medium" title={item.errorMsg}>
                              Erro
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: REVISÃO DE DUPLICIDADES */}
      {activeTab === 'duplicates' && (
        <div className="space-y-6">
          <div className="bg-orange-950 text-white p-6 rounded-3xl shadow-sm border border-orange-900/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Detetor de Duplicidades
                </span>
                <h2 className="text-lg font-bold font-serif-heading mt-1 flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-amber-400" />
                  <span>Detecção & Revisão Orientada de Duplicidades</span>
                </h2>
                <p className="text-xs text-orange-200 mt-1 max-w-2xl leading-relaxed">
                  Comparações por Hash SHA-256 exato e diferença estrutural dHash (perceptual similarity). Nenhuma imagem é excluída automaticamente — a decisão final de manter ou mover para a Lixeira é sempre do administrador.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCreateTestDuplicateScenario}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Gerar Cenário de Teste</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanDuplicates}
                  disabled={scanningDuplicates}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${scanningDuplicates ? 'animate-spin' : ''}`} />
                  <span>{scanningDuplicates ? 'Analisando Acervo...' : 'Executar Varredura no Acervo'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* LISTA DE GRUPOS DE DUPLICIDADES */}
          {loadingDuplicates ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span>Carregando grupos de duplicidades...</span>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Nenhuma duplicidade pendente de revisão!</p>
              <p className="text-slate-400">
                Sua biblioteca de mídia está limpa. Execute a <strong className="text-amber-600">Varredura no Acervo</strong> para comparar o catálogo histórico.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Exibindo <strong>{duplicateGroups.length}</strong> grupo(s) de imagens similares</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {duplicateGroups.map((group) => {
                  const assets = group.mediaAssets || [];
                  const isExact = group.classification === 'DUPLICATA_EXATA' || group.similarityScore === 100;

                  return (
                    <div key={group.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                              isExact
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isExact ? '🔴 DUPLICATA EXATA (100%)' : `🟡 PROVÁVEL DUPLICATA (${group.similarityScore}%)`}
                          </span>
                          {group.usageCategory && getUsageCategoryBadge(group.usageCategory)}
                          <span className="text-xs text-slate-500 font-mono">Grupo #{group.groupNumber || group.id.substring(0, 8)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenGroupReview(group)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          <span>Comparar Lado a Lado & Resolver →</span>
                        </button>
                      </div>

                      {/* SUGESTÃO DO SISTEMA */}
                      {group.recommendation && (
                        <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{group.recommendation.reason}</p>
                        </div>
                      )}

                      {/* PREVIEW MINIATURAS LADO A LADO */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                        {assets.map((asset) => {
                          const locs = group.assetUsages?.[asset.id] || [];
                          const inUse = locs.length > 0 || (asset.usageCount || 0) > 0;
                          const count = locs.length || asset.usageCount || 0;
                          return (
                            <div key={asset.id} className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 space-y-2 relative flex flex-col justify-between">
                              <div>
                                <div className="h-32 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center relative">
                                  <img src={asset.thumbUrl || asset.url} alt={asset.originalName} className="w-full h-full object-cover" />
                                  {inUse && (
                                    <span className="absolute top-2 right-2 z-10 bg-red-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-sm">
                                      EM USO · {count} {count === 1 ? 'local' : 'locais'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] space-y-0.5 mt-2">
                                  <p className="font-bold text-slate-900 truncate" title={asset.originalName}>
                                    {asset.originalName}
                                  </p>

                                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                    <span>{asset.dimensions || 'Dimensões N/D'}</span>
                                    <span>{(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                </div>
                              </div>

                              {locs.length > 0 && (
                                <div className="bg-red-50/50 p-1.5 rounded-lg border border-red-100 mt-1.5 text-[9px] text-red-950 space-y-0.5">
                                  <strong className="font-bold text-red-900 block">Locais de uso:</strong>
                                  <div className="max-h-12 overflow-y-auto space-y-0.5">
                                    {locs.slice(0, 2).map((loc, idx) => (
                                      <div key={idx} className="truncate">
                                        • <span className="font-semibold">{loc.module}</span> ({loc.field}) {loc.entityTitle && `· ${loc.entityTitle}`}
                                      </div>
                                    ))}
                                    {locs.length > 2 && (
                                      <div className="text-slate-400 text-[8px] italic">+ {locs.length - 2} outro(s)</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: LIXEIRA (SOFT DELETED) */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="bg-red-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Área de Exclusão Temporária
                </span>
                <h2 className="text-lg font-bold font-serif-heading mt-1 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <span>Lixeira do Acervo Institucional</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  As mídias removidas ficam retidas aqui com segurança. Elas podem ser restauradas para a biblioteca ativa a qualquer momento. Ao esvaziar a Lixeira, os arquivos são excluídos permanentemente do Cloudflare R2.
                </p>
              </div>

              {canDelete && trashedMediaList.length > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  disabled={isEmptyingTrash}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isEmptyingTrash ? 'Esvaziando...' : 'Esvaziar Lixeira Definitivamente'}</span>
                </button>
              )}
            </div>
          </div>

          {loadingTrash ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
              <span>Carregando itens da Lixeira...</span>
            </div>
          ) : trashedMediaList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">Lixeira vazia!</p>
              <p className="text-slate-400">Nenhum item foi excluído recentemente do acervo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{trashedMediaList.length} item(ns) na Lixeira</span>

                {selectedTrashIds.length > 0 && canRestoreDeleted && (
                  <button
                    type="button"
                    onClick={() => handleRestoreTrash()}
                    disabled={isRestoringTrash}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Selecionadas ({selectedTrashIds.length})</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {trashedMediaList.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 relative">
                    <div className="h-40 bg-slate-100 rounded-xl overflow-hidden relative">
                      <img src={item.thumbUrl || item.url} alt={item.originalName} className="w-full h-full object-cover grayscale opacity-80" />
                      <span className="absolute top-2 left-2 bg-red-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                        REMOVIDA
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={item.title || item.originalName}>
                        {item.title || item.originalName}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Excluída por: {item.deletedBy || 'Administrador'} em {new Date(item.deletedAt || Date.now()).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {canRestoreDeleted && (
                        <button
                          type="button"
                          onClick={() => handleRestoreTrash([item.id])}
                          className="text-emerald-600 hover:text-emerald-700 font-bold text-[11px] flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Excluir definitivamente "${item.originalName}" do Cloudflare R2?`)) {
                              await api.emptyTrash([item.id]);
                              fetchTrash();
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700 text-[11px]"
                        >
                          Excluir R2
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* TAB 3: ORGANIZAÇÃO IA GEMINI */}
      {activeTab === 'ai_organization' && (
        <div className="space-y-6">
          <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-3 max-w-2xl">
              <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                Inteligência Visional Gemini 2.5
              </span>
              <h2 className="text-xl font-bold font-serif-heading">Análise Visional & Agrupamento de Eventos</h2>
              <p className="text-xs text-purple-200 leading-relaxed">
                O agente Gemini examina as imagens enviadas, identifica cenários diplomáticos (ceremônias, assembleias, missões humanitárias), realiza leitura de textos visíveis (banners, logos) e agrupa o acervo em eventos lógicos para aprovação humana.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleRunAIAnalysis()}
                  disabled={aiAnalyzing}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{aiAnalyzing ? 'Analisando Imagens com Visão...' : 'Analisar Fotos Pendentes'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAIClustering}
                  disabled={aiClustering}
                  className="bg-purple-800 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs border border-purple-600 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>{aiClustering ? 'Gerando Agrupamentos...' : 'Gerar Álbuns Sugeridos com IA'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* PAINEL DE STATUS DE JOB IA */}
          {activeAIJob && (
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    activeAIJob.status === 'RUNNING' ? 'bg-amber-100 text-amber-600' :
                    activeAIJob.status === 'RATE_LIMITED' ? 'bg-rose-100 text-rose-600' :
                    activeAIJob.status === 'CANCELLED' ? 'bg-rose-100 text-rose-600' :
                    activeAIJob.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {activeAIJob.status === 'RUNNING' ? <RefreshCw className="w-5 h-5 animate-spin" /> : 
                     activeAIJob.status === 'RATE_LIMITED' ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : 
                     activeAIJob.status === 'CANCELLED' ? <XCircle className="w-5 h-5 text-rose-600" /> :
                     activeAIJob.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                     <Pause className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeAIJob.status === 'RUNNING' ? 'Processamento em Massa Ativo' :
                       activeAIJob.status === 'RATE_LIMITED' ? 'Aguardando Cota da API (Rate Limit)' :
                       activeAIJob.status === 'PAUSED' ? 'Processamento Pausado' :
                       activeAIJob.status === 'CANCELLED' ? 'Processamento Cancelado' :
                       activeAIJob.status === 'COMPLETED' ? 'Processamento Concluído' :
                       activeAIJob.status === 'COMPLETED_WITH_ERRORS' ? 'Processamento Concluído com Alertas' :
                       activeAIJob.status === 'FAILED' ? 'Falha no Processamento' :
                       'Status do Processamento'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">Job ID: {activeAIJob.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeAIJob.status === 'RUNNING' || activeAIJob.status === 'RATE_LIMITED' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await api.pauseAIJob(activeAIJob.id);
                        setActiveAIJob(updated);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      PAUSAR
                    </button>
                  ) : activeAIJob.status === 'PAUSED' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await api.resumeAIJob(activeAIJob.id);
                        setActiveAIJob(updated);
                      }}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      RETOMAR
                    </button>
                  ) : null}

                  {/* CANCELAR button: ONLY shown for active, cancellable jobs */}
                  {(activeAIJob.status === 'RUNNING' || activeAIJob.status === 'RATE_LIMITED' || activeAIJob.status === 'PENDING' || activeAIJob.status === 'PAUSED') ? (
                    <button
                      type="button"
                      disabled={isCancellingJob}
                      onClick={() => {
                        console.log('[MediaAI Cancel] --- CANCEL HANDLER CLICKED ---');
                        console.log('[MediaAI Cancel] Pass 1 - jobId:', activeAIJob?.id);
                        console.log('[MediaAI Cancel] UI State Before Request:', {
                          jobId: activeAIJob?.id,
                          status: activeAIJob?.status,
                          isCancellingJob,
                          aiAnalyzing,
                          processedItems: activeAIJob?.processedItems,
                          totalItems: activeAIJob?.totalItems
                        });

                        if (!activeAIJob || !activeAIJob.id) {
                          console.error('[MediaAI Cancel] ERROR: activeAIJob or activeAIJob.id is missing', activeAIJob);
                          error('Erro', 'Nenhum job ativo encontrado para cancelar.');
                          return;
                        }

                        setShowCancelAIModal(true);
                        console.log('[MediaAI Cancel] Confirmation modal opened via React state.');
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isCancellingJob ? 'CANCELANDO...' : 'CANCELAR'}</span>
                    </button>
                  ) : activeAIJob.status === 'CANCELLED' ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Cancelado
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAIJob(null);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAIJob(null);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Fechar
                    </button>
                  )}
                </div>
              </div>

              {/* React Confirmation Modal for AI Job Cancellation */}
              {showCancelAIModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Cancelar processamento de IA?</h3>
                        <p className="text-xs text-slate-500 font-mono">Job ID: {activeAIJob?.id}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      O processamento será interrompido após a operação atualmente em andamento. As análises já concluídas serão preservadas e as fotos restantes poderão ser processadas posteriormente.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          console.log('[MediaAI Cancel] User aborted cancellation at confirmation modal (VOLTAR clicked).');
                          setShowCancelAIModal(false);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        VOLTAR
                      </button>
                      <button
                        type="button"
                        disabled={isCancellingJob}
                        onClick={async () => {
                          setShowCancelAIModal(false);
                          if (!activeAIJob || !activeAIJob.id) {
                            console.error('[MediaAI Cancel Diagnostics] ERROR: activeAIJob or activeAIJob.id is missing', activeAIJob);
                            return;
                          }

                          const targetJobId = activeAIJob.id;
                          console.log('[MediaAI Cancel Diagnostics] 1. INITIATING CANCEL PROCESS');
                          console.log('[MediaAI Cancel Diagnostics] Target Job ID:', targetJobId);
                          console.log('[MediaAI Cancel Diagnostics] Component State BEFORE Request:', {
                            activeAIJobId: targetJobId,
                            activeAIJobStatus: activeAIJob.status,
                            processedItems: activeAIJob.processedItems,
                            totalItems: activeAIJob.totalItems,
                            isCancellingJob,
                            aiAnalyzing
                          });

                          try {
                            setIsCancellingJob(true);
                            console.log('[MediaAI Cancel Diagnostics] 2. DISPATCHING API REQUEST via api.cancelAIJob for jobId:', targetJobId);
                            
                            const updated = await api.cancelAIJob(targetJobId);

                            console.log('[MediaAI Cancel Diagnostics] 3. BACKEND RESPONSE RECEIVED SUCCESSFULLY');
                            console.log('[MediaAI Cancel Diagnostics] Response Body / Updated Job:', updated);

                            setActiveAIJob(updated);
                            setAiAnalyzing(false);
                            if (pollingAIRef.current) {
                              clearInterval(pollingAIRef.current);
                              pollingAIRef.current = null;
                            }
                            success('Análise Cancelada', 'O processamento do acervo foi cancelado com sucesso.');
                          } catch (err: any) {
                            console.error('[MediaAI Cancel Diagnostics] ERROR CAUGHT DURING CANCEL REQUEST:', err);
                            console.error('[MediaAI Cancel Diagnostics] Error message:', err.message || err);
                            error('Erro ao cancelar', err.message || 'Falha na comunicação com o servidor');
                          } finally {
                            setIsCancellingJob(false);
                            console.log('[MediaAI Cancel Diagnostics] 4. FINALLY BLOCK REACHED. Component State AFTER Request:', {
                              isCancellingJob: false,
                              aiAnalyzing: false,
                              activeAIJobStatus: activeAIJob?.status
                            });
                          }
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isCancellingJob ? 'CANCELANDO...' : 'CANCELAR PROCESSAMENTO'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Progresso Real: {Math.round((activeAIJob.processedItems / (activeAIJob.totalItems || 1)) * 100)}%</span>
                  <span>{activeAIJob.processedItems} / {activeAIJob.totalItems} fotos</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      activeAIJob.status === 'RATE_LIMITED' ? 'bg-rose-400' :
                      activeAIJob.status === 'CANCELLED' ? 'bg-slate-400' :
                      activeAIJob.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${(activeAIJob.processedItems / (activeAIJob.totalItems || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Sucessos</span>
                  <span className="text-sm font-bold text-emerald-600">{activeAIJob.successItems}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Falhas</span>
                  <span className="text-sm font-bold text-rose-600">{activeAIJob.failedItems}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Pulados</span>
                  <span className="text-sm font-bold text-slate-600">{activeAIJob.skippedItems}</span>
                </div>
              </div>

              {activeAIJob.lastMediaName && (
                <div className="text-[10px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>Última foto processada: <strong className="text-slate-700">{activeAIJob.lastMediaName}</strong></span>
                </div>
              )}

              {activeAIJob.status === 'RATE_LIMITED' && activeAIJob.rateLimitWaitUntil && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-[10px] flex items-center gap-2 border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    A API Gemini atingiu o limite de cota gratuito. Aguardando liberação automática até 
                    <strong> {new Date(activeAIJob.rateLimitWaitUntil).toLocaleTimeString()}</strong> para retomar.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PROPOSTAS DE AGRUPAMENTO (CLUSTERS) */}
          {aiClusters.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Propostas de Álbuns / Eventos Detectados pelo Gemini</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiClusters.map((cluster) => (
                  <div key={cluster.id} className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm space-y-3 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            cluster.confidence === 'ALTA' ? 'bg-emerald-100 text-emerald-800' :
                            cluster.confidence === 'MÉDIA' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            Confiança: {cluster.confidence}
                          </span>
                          {cluster.status === 'MODIFIED' && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              REVISADO
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{cluster.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cluster.description}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartReview(cluster)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>REVISAR PROPOSTA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveCluster(cluster)}
                          disabled={isApprovingProposal}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {isApprovingProposal ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>APROVAR</span>
                        </button>
                      </div>
                    </div>

                    {cluster.visibleTexts && cluster.visibleTexts.length > 0 && (
                      <div className="text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-slate-600">
                        <strong className="text-slate-800">Textos Detectados:</strong> {cluster.visibleTexts.join(', ')}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 font-medium">{cluster.mediaIds.length} fotografias associadas</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Descartar esta proposta da IA? As fotos permanecerão no acervo.')) {
                            await api.deleteAIClusterProposal(cluster.id);
                            fetchAIProposals();
                          }
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        Descartar Proposta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ÁLBUNS & EVENTOS */}
      {activeTab === 'albums' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {albums.map((album) => (
              <div key={album.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      📁
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{album.title}</h3>
                      <p className="text-[11px] text-slate-400">{album.mediaCount || 0} fotos associadas</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{album.description || 'Sem descrição cadastrada.'}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlbumFilter(album.id);
                      setActiveTab('gallery');
                    }}
                    className="text-amber-600 hover:text-amber-700 font-bold"
                  >
                    Ver Fotos do Álbum →
                  </button>

                  {canManageAlbums && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Remover álbum "${album.title}"? As fotos permanecerão no acervo geral.`)) {
                          await api.deleteAlbum(album.id);
                          fetchMedia();
                        }
                      }}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CONFIGURAÇÕES DE NOMENCLATURA (FASE 12) */}
      {activeTab === 'naming_config' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-2">
            <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase">
              Padronização Institucional
            </span>
            <h2 className="text-lg font-bold font-serif-heading">Regras e Modelos de Nomenclatura</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Defina os padrões de nomes para cada categoria. Os nomes organizados servem para identificação clara no acervo.
              <br />
              <strong className="text-amber-400">Nota de Segurança:</strong> O nome do arquivo no R2 (<code className="text-amber-200">storageKey</code>) permanece 100% inalterado, garantindo a integridade dos links do site.
            </p>
          </div>

          {!namingConfig ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span>Carregando configurações de nomenclatura...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form & Category Rules */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <label className="text-xs font-bold text-slate-900 block mb-1">Prefixo Global da Instituição</label>
                  <input
                    type="text"
                    value={namingConfig.globalPrefix || 'ADMIR'}
                    onChange={(e) => setNamingConfig({ ...namingConfig, globalPrefix: e.target.value })}
                    className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="ADMIR"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Substitui a tag <code className="bg-slate-100 px-1 py-0.5 rounded">{'{prefix}'}</code> nos modelos abaixo.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Modelos por Categoria</h3>

                  <div className="space-y-3">
                    {ALL_CATEGORIES.map((cat) => (
                      <div key={cat} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">🏷️ {cat}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Exemplo: ADMIR_2026-09-15_Cerimonia_001</span>
                        </div>
                        <input
                          type="text"
                          value={namingConfig.categoryTemplates?.[cat] || `{prefix}_${cat.replace(/[^A-Za-z0-9]/g, '')}_{sequence}`}
                          onChange={(e) =>
                            setNamingConfig({
                              ...namingConfig,
                              categoryTemplates: {
                                ...namingConfig.categoryTemplates,
                                [cat]: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNamingConfig}
                    disabled={isSavingConfig}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingConfig ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Regras de Nomenclatura</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Token Cheatsheet Card */}
              <div className="space-y-4">
                <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-3 text-xs text-amber-950">
                  <h3 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Variáveis Disponíveis</span>
                  </h3>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    Você pode combinar qualquer uma destas variáveis entre chaves no modelo de nomenclatura de cada categoria:
                  </p>

                  <ul className="space-y-2 text-[11px] font-mono">
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{prefix}'}</strong>: Prefixo global (ex: ADMIR)
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{date}'}</strong>: Data da foto/evento (YYYY-MM-DD)
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{year}'}</strong>: Ano corrente (ex: 2026)
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{event}'}</strong>: Nome sanitizado do evento
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{name}'}</strong>: Nome da pessoa / embaixador
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{purpose}'}</strong>: Finalidade (ex: Logo, Favicon, Banner)
                    </li>
                    <li className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <strong className="text-amber-950">{'{sequence}'}</strong>: Sequencial (001, 002, 003...)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALHES COMPLETOS DA FOTO */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedAsset.title || selectedAsset.originalName}</h3>
                <p className="text-xs text-slate-400">ID: {selectedAsset.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-80 flex items-center justify-center">
              <img src={selectedAsset.url} alt={selectedAsset.altText} className="max-h-80 object-contain" />
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              {/* Category Selector */}
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3">
                <div>
                  <strong className="text-amber-950 font-bold block">Classificação do Acervo:</strong>
                  <span className="text-[11px] text-amber-800">Selecione a categoria apropriada</span>
                </div>
                <select
                  value={selectedAsset.category || 'OUTROS'}
                  onChange={async (e) => {
                    const newCat = e.target.value as MediaCategory;
                    const updated: MediaAsset = { ...selectedAsset, category: newCat };
                    setSelectedAsset(updated);
                    try {
                      await api.updateMediaMetadata(selectedAsset.id, { category: newCat });
                      fetchMedia();
                      success('Categoria Atualizada', `Definida como ${newCat}`);
                    } catch (err: any) {
                      error('Erro ao salvar categoria', err.message);
                    }
                  }}
                  className="bg-white font-bold text-amber-950 px-3 py-1.5 rounded-xl border border-amber-300 focus:outline-none text-xs"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      🏷️ {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Names Breakdown */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 font-sans font-bold">Nome Original:</span>{' '}
                  <span className="text-slate-800">{selectedAsset.originalName || 'Desconhecido'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans font-bold">Nome Padronizado:</span>{' '}
                  <span className="text-amber-700 font-bold">{selectedAsset.organizedName || selectedAsset.displayName || selectedAsset.title || 'Pendente'}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  <span className="font-sans font-bold">Chave de Armazenamento R2 (Inalterável):</span> {selectedAsset.storageKey || selectedAsset.id}
                </div>
              </div>

              {/* AI Gemini Description */}
              {selectedAsset.aiDescription && (
                <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                  <strong className="text-purple-900 font-bold flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Descrição IA Gemini:
                  </strong>
                  <p className="text-purple-950 leading-relaxed">{selectedAsset.aiDescription}</p>
                </div>
              )}

              {/* AI Gemini Suggestions Box (Fase 2) */}
              {selectedAsset.aiSuggestions && (
                <div className="bg-purple-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-300 font-bold flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 fill-amber-300" />
                      Sugestões da IA Gemini para este Asset:
                    </strong>
                    <span className="bg-purple-800 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-mono">Pendente de Aprovação</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-purple-950/60 p-3 rounded-xl border border-purple-800">
                    <div>
                      <span className="text-purple-300 block font-bold">Categoria Sugerida:</span>
                      <span className="text-amber-300 font-bold">{selectedAsset.aiSuggestions.suggestedCategory || 'Não especificada'}</span>
                    </div>
                    <div>
                      <span className="text-purple-300 block font-bold">Nome Organizado Sugerido:</span>
                      <span className="text-amber-300 font-mono font-bold truncate block">{selectedAsset.aiSuggestions.suggestedOrganizedName || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveAISuggestions(selectedAsset.id)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar Sugestões da IA</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedAsset.aiVisibleText && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <strong className="text-slate-800">Leitura OCR de Texto Visível:</strong>
                  <p className="text-slate-600 mt-0.5">{selectedAsset.aiVisibleText}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <strong className="text-slate-500 block">Tipo de Cena:</strong>
                  <span>{selectedAsset.aiSceneType || 'Não analisado'}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block">Evento Provável:</strong>
                  <span>{selectedAsset.eventName || selectedAsset.aiProbableEventType || 'Não associado'}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleOpenUsageModal(selectedAsset)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Ver Locais de Utilização no Site</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO DE ÁLBUM */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAlbum} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Novo Álbum / Evento</h3>
              <button type="button" onClick={() => setShowAlbumModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título do Álbum *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cúpula de Paz 2026 - Genebra"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descrição do Evento</label>
                <textarea
                  rows={3}
                  placeholder="Resumo institucional da missão..."
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAlbumModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={albumCreating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
              >
                {albumCreating ? 'Criando...' : 'Criar Álbum'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIÇÃO EM MASSA */}
      {/* MODAL REVISÃO COMPARATIVA LADO A LADO DE DUPLICIDADES */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-1 rounded-md">
                    {selectedGroup.classification === 'DUPLICATA_EXATA' ? '🔴 DUPLICATA EXATA (100% Hash SHA-256)' : `🟡 PROVÁVEL DUPLICATA (${selectedGroup.similarityScore}% Similaridade Visual)`}
                  </span>
                  {selectedGroup.usageCategory && getUsageCategoryBadge(selectedGroup.usageCategory)}
                </div>
                <h3 className="text-lg font-bold font-serif-heading text-slate-900 mt-2">
                  Revisão Lado a Lado — Grupo #{selectedGroup.groupNumber || selectedGroup.id.substring(0, 8)}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina qual arquivo será o <strong>Mestre (Canônica)</strong>. As referências dos outros arquivos serão remapeadas e consolidadas de forma 100% segura.
                </p>
              </div>

              <button type="button" onClick={() => setSelectedGroup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SUGESTÃO SISTÊMICA */}
            {selectedGroup.recommendation && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-950 block">Recomendação Automática da Biblioteca Inteligente:</strong>
                  <p className="mt-0.5 leading-relaxed">{selectedGroup.recommendation.reason}</p>
                </div>
              </div>
            )}

            {/* MATRIZ DE COMPARAÇÃO LADO A LADO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedGroup.mediaAssets || []).map((asset) => {
                const isMaster = asset.id === masterMediaId;
                const currentAction = isMaster ? 'keep' : (duplicateActions[asset.id] || 'trash');
                const isRecommendedKeep = selectedGroup.recommendation?.keepMediaId === asset.id;
                const locs = selectedGroup.assetUsages?.[asset.id] || [];
                const inUse = locs.length > 0 || (asset.usageCount || 0) > 0;

                return (
                  <div
                    key={asset.id}
                    className={`rounded-2xl border p-4 space-y-3 transition-all ${
                      isMaster
                        ? 'border-amber-500 bg-amber-50/15 ring-2 ring-amber-500/30'
                        : currentAction === 'keep'
                        ? 'border-emerald-500 bg-emerald-50/10'
                        : currentAction === 'consolidate'
                        ? 'border-purple-500 bg-purple-50/10 ring-2 ring-purple-500/20'
                        : currentAction === 'trash'
                        ? 'border-slate-300 bg-slate-50/50'
                        : 'border-rose-400 bg-rose-50/10'
                    }`}
                  >
                    {/* Header Item */}
                    <div className="flex items-center justify-between text-xs">
                      {isMaster ? (
                        <span className="bg-amber-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          👑 MESTRE (CANÔNICA)
                        </span>
                      ) : isRecommendedKeep ? (
                        <span className="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Sugerido Manter
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-500">Cópia Paralela</span>
                      )}

                      {inUse && (
                        <span className="bg-red-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-md">
                          EM USO ({locs.length || asset.usageCount})
                        </span>
                      )}
                    </div>

                    {/* Preview da Foto */}
                    <div className="h-44 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 relative">
                      <img src={asset.url} alt={asset.originalName} className="max-h-44 w-full object-contain" />
                    </div>

                    {/* Ficha Técnica Comparativa */}
                    <div className="space-y-1.5 text-[11px] bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <strong className="text-slate-500 block text-[10px]">Nome do Arquivo:</strong>
                        <span className="font-bold text-slate-800 break-all">{asset.originalName}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div>
                          <strong className="text-slate-500 block text-[10px]">Tamanho:</strong>
                          <span className="font-semibold text-slate-700">{(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <div>
                          <strong className="text-slate-500 block text-[10px]">Dimensões:</strong>
                          <span className="font-semibold text-slate-700">{asset.dimensions || 'N/D'}</span>
                        </div>
                      </div>

                      {asset.originalPath && (
                        <div className="pt-1 border-t border-slate-100">
                          <strong className="text-slate-500 block text-[10px]">Pasta Original (ZIP):</strong>
                          <span className="font-mono text-[10px] text-slate-600 truncate block">{asset.originalPath}</span>
                        </div>
                      )}
                    </div>

                    {/* ROLE SELECTOR: DEFINIR COMO MESTRE */}
                    <div className="pt-1">
                      {isMaster ? (
                        <div className="bg-amber-100 text-amber-950 font-bold text-[10px] py-1.5 px-3 rounded-xl text-center border border-amber-300">
                          🏆 Esta é a cópia Mestre (Canônica)
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMasterMediaId(asset.id);
                            const newActions = { ...duplicateActions, [asset.id]: 'keep' };
                            selectedGroup.mediaAssets.forEach((other) => {
                              if (other.id !== asset.id) {
                                const otherLocs = selectedGroup.assetUsages?.[other.id] || [];
                                if (otherLocs.length > 0) {
                                  newActions[other.id] = 'consolidate';
                                } else {
                                  newActions[other.id] = 'trash';
                                }
                              }
                            });
                            setDuplicateActions(newActions as any);
                          }}
                          className="w-full bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-700 font-bold py-1.5 rounded-xl text-[10px] transition-colors border border-slate-200 hover:border-amber-300"
                        >
                          Definir como Mestre (Canônica)
                        </button>
                      )}
                    </div>

                    {/* MAPA DE USO */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">Locais de Utilização:</label>
                      {locs.length > 0 ? (
                        <div className="bg-red-50/80 border border-red-200 p-2.5 rounded-xl text-[10px] text-red-950 space-y-1">
                          <strong className="text-red-900 block font-bold">Vinculado a {locs.length} recurso(s):</strong>
                          <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1">
                            {locs.map((loc, idx) => (
                              <div key={idx} className="border-b border-red-100 pb-0.5 last:border-none text-[9px] leading-tight">
                                • <span className="font-semibold">{loc.module}</span> ({loc.field}) {loc.entityTitle && `· ${loc.entityTitle}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-[10px] text-slate-500">
                          ✅ Sem utilizações ativas no site.
                        </div>
                      )}
                    </div>

                    {/* SELETOR DE AÇÃO PARA ESTA FOTO */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Ação para este arquivo:</label>

                      {isMaster ? (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-semibold leading-relaxed">
                          O arquivo Mestre será preservado no acervo ativo com todas as referências apontando para ele.
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs">
                          <label
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                              currentAction === 'keep' ? 'border-emerald-600 bg-emerald-100/50 font-bold text-emerald-950' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`action_${asset.id}`}
                              checked={currentAction === 'keep'}
                              onChange={() => setDuplicateActions((prev) => ({ ...prev, [asset.id]: 'keep' }))}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>🟢 Manter Cópia Ativa</span>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                              currentAction === 'consolidate' ? 'border-purple-600 bg-purple-100/50 font-bold text-purple-950' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`action_${asset.id}`}
                              checked={currentAction === 'consolidate'}
                              onChange={() => setDuplicateActions((prev) => ({ ...prev, [asset.id]: 'consolidate' }))}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span>🌀 Consolidar Referências</span>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                              currentAction === 'trash' ? 'border-amber-500 bg-amber-100/50 font-bold text-amber-950' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`action_${asset.id}`}
                              checked={currentAction === 'trash'}
                              onChange={() => setDuplicateActions((prev) => ({ ...prev, [asset.id]: 'trash' }))}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>🟡 Mover para a Lixeira</span>
                          </label>

                          {canDeleteDuplicates && (
                            <label
                              className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                                currentAction === 'delete' ? 'border-rose-600 bg-rose-100/50 font-bold text-rose-950' : 'border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`action_${asset.id}`}
                                checked={currentAction === 'delete'}
                                onChange={() => setDuplicateActions((prev) => ({ ...prev, [asset.id]: 'delete' }))}
                                className="text-rose-600 focus:ring-rose-500"
                              />
                              <span>🔴 Excluir do R2</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTÕES DE AÇÃO DO MODAL */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Mestre Escolhido: <strong className="text-amber-700">{selectedGroup.mediaAssets.find(a => a.id === masterMediaId)?.originalName || 'Nenhum'}</strong> |{' '}
                <strong>{Object.values(duplicateActions).filter((a) => a === 'consolidate').length}</strong> consolidações |{' '}
                <strong>{Object.values(duplicateActions).filter((a) => a === 'trash' || a === 'delete').length}</strong> remoções
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismissDuplicates}
                  className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                >
                  Não são duplicadas
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleApplyDuplicateResolution}
                  disabled={isResolvingDuplicates}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResolvingDuplicates ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Consolidando & Resolvendo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar & Aplicar Decisão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO EM MASSA */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edição em Massa ({selectedIds.length} fotos)</h3>
              <button type="button" onClick={() => setShowBulkEditModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mover para Álbum:</label>
                <select
                  value={bulkAlbumTarget}
                  onChange={(e) => setBulkAlbumTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="">(Não alterar álbum atual)</option>
                  <option value="none">Remover do álbum atual</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      📁 {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adicionar Tags (separadas por vírgula):</label>
                <input
                  type="text"
                  placeholder="ex: paz, genebra, 2026"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome do Evento:</label>
                <input
                  type="text"
                  placeholder="ex: Reunião Bilateral com Embaixadores"
                  value={bulkEventNameInput}
                  onChange={(e) => setBulkEventNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBulkEdit}
                disabled={bulkUpdating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm"
              >
                {bulkUpdating ? 'Aplicando...' : 'Aplicar nas Selecionadas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FERRAMENTA DE LOCALIZAÇÃO DE USO NO SITE (FASE 19) */}
      {usageModalAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                  Diagnóstico de Rastreabilidade
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Locais de Utilização no Website</h3>
                <p className="text-xs text-slate-500 font-mono">{usageModalAsset.title || usageModalAsset.originalName}</p>
              </div>
              <button type="button" onClick={() => setUsageModalAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingUsage ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span>Rastreando uso deste asset em páginas, notícias e perfis...</span>
              </div>
            ) : usageLocations.length === 0 ? (
              <div className="bg-slate-50 p-6 text-center rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800">Nenhuma utilização pública encontrada nas páginas mapeadas.</p>
                <p className="text-slate-400">
                  Esta foto está armazenada com segurança no acervo e no Cloudflare R2, mas não está vinculada publicamente em notícias, eventos ou perfis de embaixadores no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-950">
                  <span className="font-bold">⚠ Atenção aos Vínculos Ativos:</span>
                  <p className="text-[11px] mt-0.5 text-amber-900">
                    Este asset é utilizado em {usageLocations.length} local(is) no site da ADMIR. Recomenda-se cautela antes de mover para a lixeira.
                  </p>
                </div>

                <div className="space-y-2">
                  {usageLocations.map((loc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {loc.module || loc.entityType || 'Geral'}
                        </span>
                        <h4 className="font-bold text-slate-900 mt-1">{loc.entityTitle || loc.title || 'Item Vinculado'}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{loc.field}</span>
                      </div>
                      {(loc.pageUrl || loc.url) && (
                        <a
                          href={loc.pageUrl || loc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Abrir Página</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setUsageModalAsset(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Fechar Rastreamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRÉVIA DE PADRONIZAÇÃO DE NOMES (FASE 11, 19, 23) */}
      {showBatchRenameModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">
                  Reorganização Segura do Acervo
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Prévia de Padronização de Nomes de Mídia</h3>
                <p className="text-xs text-slate-500">
                  Valide a alteração visual dos nomes do acervo antes da aplicação final.
                </p>
              </div>
              <button type="button" onClick={() => setShowBatchRenameModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-950 space-y-1">
              <span className="font-extrabold flex items-center gap-1">
                🛡️ Garantia de Preservação e Integridade:
              </span>
              <p className="text-[11px] leading-relaxed text-amber-900">
                • O nome do arquivo físico no R2 (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">storageKey</code>) e as URLs de imagem NUNCA são alterados.
                <br />
                • O nome original da foto enviada é mantido para sempre no histórico do registro (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">originalName</code>).
                <br />• Esta operação atualiza somente o atributo de identificação lógica e organizada do acervo.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{batchRenameList.length} itens prontos para padronização:</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                {batchRenameList.map((item) => {
                  const mediaAsset = mediaList.find((m) => m.id === item.assetId);
                  return (
                    <div key={item.assetId} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {mediaAsset?.thumbUrl || mediaAsset?.url ? (
                            <img src={mediaAsset.thumbUrl || mediaAsset.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">🖼️</div>
                          )}
                        </div>
                        <div className="min-w-0 font-mono text-[11px]">
                          <span className="text-slate-400 block truncate" title={item.currentName}>
                            De: {item.currentName}
                          </span>
                          <span className="text-amber-700 font-bold block truncate" title={item.suggestedOrganizedName}>
                            Para: {item.suggestedOrganizedName}
                          </span>
                        </div>
                      </div>

                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0">
                        🏷️ {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBatchRenameModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplyBatchRename}
                disabled={isApplyingBatchRename}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isApplyingBatchRename ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aplicando Padronização...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar & Aplicar Padronização</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Proposal Review Modal */}
      {isReviewingProposal && reviewProposal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Revisão de Proposta IA</h3>
                  <p className="text-sm text-slate-500">Ajuste os detalhes antes de criar o álbum definitivo.</p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewingProposal(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Side: Metadata & Actions */}
              <div className="w-80 border-r border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto bg-slate-50/30">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Título do Álbum</label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição</label>
                    <textarea
                      rows={4}
                      value={reviewDescription}
                      onChange={(e) => setReviewDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleSaveProposal}
                    disabled={isSavingProposal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingProposal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    SALVAR ALTERAÇÕES
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações em Lote ({reviewSelectedIds.length})</h4>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => handleRemoveFromProposal(reviewSelectedIds)}
                      disabled={reviewSelectedIds.length === 0}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover da Proposta
                    </button>
                    
                    <button
                      onClick={handleCreateNewProposal}
                      disabled={reviewSelectedIds.length === 0}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar Novo Grupo
                    </button>

                    <div className="relative group">
                      <button
                        disabled={reviewSelectedIds.length === 0}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <Move className="w-3.5 h-3.5" />
                          Mover para...
                        </div>
                      </button>
                      
                      {reviewSelectedIds.length > 0 && (
                        <div className="absolute left-full top-0 ml-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 hidden group-hover:block z-50 max-h-64 overflow-y-auto">
                          <p className="text-[10px] font-bold text-slate-400 p-2 border-b border-slate-100 mb-1">SELECIONE O DESTINO</p>
                          {aiClusters
                            .filter(c => c.id !== reviewProposal.id)
                            .map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleMoveToProposal(reviewSelectedIds, c.id)}
                                className="w-full text-left p-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors truncate"
                              >
                                {c.title}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100">
                  <button
                    onClick={() => handleApproveCluster(reviewProposal)}
                    disabled={isApprovingProposal}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      {isApprovingProposal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span className="text-sm">APROVAR & CRIAR ÁLBUM</span>
                    </div>
                    <span className="text-[10px] opacity-80 uppercase tracking-tighter">Transformar em acervo oficial</span>
                  </button>
                </div>
              </div>

              {/* Right Side: Media Grid */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-100/30">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    Mídias na Proposta
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                      {reviewProposal.mediaIds.length}
                    </span>
                  </h4>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewSelectedIds([...reviewProposal.mediaIds])}
                      className="text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      Selecionar Tudo
                    </button>
                    <button
                      onClick={() => setReviewSelectedIds([])}
                      className="text-[10px] font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {reviewProposal.mediaIds.map(mediaId => {
                    const asset = mediaList.find(a => a.id === mediaId);
                    if (!asset) return null;
                    const isSelected = reviewSelectedIds.includes(mediaId);
                    
                    return (
                      <div 
                        key={mediaId}
                        onClick={() => {
                          if (isSelected) setReviewSelectedIds(prev => prev.filter(id => id !== mediaId));
                          else setReviewSelectedIds(prev => [...prev, mediaId]);
                        }}
                        className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isSelected ? 'border-purple-600 ring-2 ring-purple-100' : 'border-transparent hover:border-slate-200'
                        }`}
                      >
                        <img 
                          src={asset.url} 
                          alt={asset.title} 
                          className="w-full h-full object-cover"
                        />
                        
                        <div className={`absolute inset-0 transition-opacity flex items-center justify-center ${
                          isSelected ? 'bg-purple-600/20' : 'bg-black/0 group-hover:bg-black/20'
                        }`}>
                          {isSelected ? (
                            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-white/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                          <p className="text-[9px] text-white font-medium truncate">{asset.title || asset.originalName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
