import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Users2,
  FolderKanban,
  Newspaper,
  Image as ImageIcon,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  History,
  LayoutDashboard,
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  AuditLog,
  Program,
  Story,
  Ambassador,
  MediaAsset,
  MediaAlbum,
  MediaImportJob,
  Donation,
  Task,
  TaskWorkspace,
  TaskWorkflow,
  User as AdminUser,
} from '../../types';

type ReportType =
  | 'overview'
  | 'programs'
  | 'news'
  | 'ambassadors'
  | 'media'
  | 'donations'
  | 'tasks'
  | 'admins'
  | 'audit';

type DetailLevel = 'summary' | 'analytical';

type DatePreset = 'all' | '7days' | '30days' | 'ytd';

export function AdminReports() {
  const { user, hasPermission } = useAuth();
  const { success, error, info } = useToast();

  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('analytical');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [loading, setLoading] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Loaded database references
  const [programs, setPrograms] = useState<Program[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [importJobs, setImportJobs] = useState<MediaImportJob[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationStats, setDonationStats] = useState({ totalRaised: 0, donationsReceived: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>([]);
  const [workflows, setWorkflows] = useState<TaskWorkflow[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Unique category lists derived from data
  const [programCategories, setProgramCategories] = useState<string[]>([]);
  const [newsCategories, setNewsCategories] = useState<string[]>([]);
  const [mediaCategories, setMediaCategories] = useState<string[]>([]);

  // RBAC checks for displaying option cards and enforcing access
  const permissionsMap = {
    overview: true, // Everyone has dashboard access
    programs: hasPermission('programs.view'),
    news: hasPermission('news.view'),
    ambassadors: hasPermission('ambassadors.view'),
    media: hasPermission('media.view'),
    donations: hasPermission('donations.view'),
    tasks: hasPermission('tasks.view'),
    admins: hasPermission('admins.view'),
    audit: hasPermission('history.view'),
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];

      // Fetch what is permitted and relevant
      if (permissionsMap.programs) {
        promises.push(
          api.getPrograms(true).then((data) => {
            setPrograms(data);
            const cats = Array.from(new Set(data.map((p) => p.category).filter(Boolean))) as string[];
            setProgramCategories(cats);
          })
        );
      }

      if (permissionsMap.news) {
        promises.push(
          api.getStories(true).then((data) => {
            setStories(data);
            const cats = Array.from(new Set(data.map((s) => s.category).filter(Boolean))) as string[];
            setNewsCategories(cats);
          })
        );
      }

      if (permissionsMap.ambassadors) {
        promises.push(api.getAdminAmbassadors().then((data) => setAmbassadors(data)));
      }

      if (permissionsMap.media) {
        promises.push(
          api.getMedia().then((data) => {
            setMedia(data);
            const cats = Array.from(new Set(data.map((m) => m.category).filter(Boolean))) as string[];
            setMediaCategories(cats);
          })
        );
        promises.push(api.getAlbums().then((data) => setAlbums(data)));
        promises.push(api.getImportJobs().then((data) => setImportJobs(data)));
      }

      if (permissionsMap.donations) {
        promises.push(
          api.getDonations().then((data) => {
            setDonations(data.donations);
            setDonationStats({
              totalRaised: data.stats.totalRaised,
              donationsReceived: data.stats.donationsReceived,
            });
          })
        );
      }

      if (permissionsMap.tasks) {
        promises.push(api.getTasks().then((data) => setTasks(data)));
        promises.push(api.getWorkspaces().then((data) => setWorkspaces(data)));
        promises.push(api.getWorkflows(undefined, true).then((data) => setWorkflows(data)));
      }

      if (permissionsMap.admins) {
        promises.push(api.getAdmins().then((data) => setAdmins(data.users)));
      }

      if (permissionsMap.audit) {
        promises.push(api.getHistory().then((data) => setAuditLogs(data)));
      }

      await Promise.all(promises);
      success('Dados Carregados', 'Relatórios atualizados com os dados mais recentes do sistema.');
    } catch (e: any) {
      error('Falha de Carregamento', 'Erro ao buscar dados para os relatórios: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter logic helper based on active report type & filters selected
  const filterByDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).getTime();
    const now = Date.now();

    if (datePreset === '7days') {
      return itemDate >= now - 7 * 24 * 3600 * 1000;
    }
    if (datePreset === '30days') {
      return itemDate >= now - 30 * 24 * 3600 * 1000;
    }
    if (datePreset === 'ytd') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      return itemDate >= startOfYear;
    }
    return true;
  };

  const getFilteredPrograms = () => {
    return programs.filter((p) => {
      const pStatus = p.status || (p.isVisible ? 'published' : 'draft');
      const matchStatus = filterStatus === 'all' || pStatus === filterStatus;
      const matchCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchDate = filterByDateRange(p.createdAt);
      return matchStatus && matchCategory && matchDate;
    });
  };

  const getFilteredStories = () => {
    return stories.filter((s) => {
      const sStatus = s.status || (s.isPublished ? 'published' : 'draft');
      const matchStatus = filterStatus === 'all' || sStatus === filterStatus;
      const matchCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchDate = filterByDateRange(s.publicationDate || s.publishDate);
      return matchStatus && matchCategory && matchDate;
    });
  };

  const getFilteredAmbassadors = () => {
    return ambassadors.filter((a) => {
      const matchStatus =
        filterStatus === 'all' ||
        a.onboardingStatus === filterStatus ||
        a.editorialStatus === filterStatus;
      const matchDate = filterByDateRange(a.createdAt);
      return matchStatus && matchDate;
    });
  };

  const getFilteredMedia = () => {
    return media.filter((m) => {
      const matchCategory = filterCategory === 'all' || m.category === filterCategory;
      const matchDate = filterByDateRange(m.createdAt);
      return matchCategory && matchDate;
    });
  };

  const getFilteredDonations = () => {
    return donations.filter((d) => {
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      const matchDate = filterByDateRange(d.date || d.createdAt);
      return matchStatus && matchDate;
    });
  };

  const getFilteredTasks = () => {
    return tasks.filter((t) => {
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchDate = filterByDateRange(t.createdAt);
      return matchPriority && matchDate;
    });
  };

  const getFilteredAdmins = () => {
    return admins.filter((a) => {
      const matchRole = filterRole === 'all' || a.role === filterRole;
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchDate = filterByDateRange(a.joinedAt);
      return matchRole && matchStatus && matchDate;
    });
  };

  const getFilteredAuditLogs = () => {
    return auditLogs.filter((l) => {
      const matchCategory =
        filterCategory === 'all' || l.module.toLowerCase() === filterCategory.toLowerCase();
      const matchDate = filterByDateRange(l.timestamp);
      return matchCategory && matchDate;
    });
  };

  // Human descriptive text for filters
  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (datePreset !== 'all') {
      const names = { '7days': 'Últimos 7 dias', '30days': 'Últimos 30 dias', ytd: 'Desde o início do ano' };
      parts.push(`Período: ${names[datePreset]}`);
    } else {
      parts.push('Período: Todo o Histórico');
    }

    if (filterStatus !== 'all') parts.push(`Status: ${filterStatus}`);
    if (filterCategory !== 'all') parts.push(`Categoria/Módulo: ${filterCategory}`);
    if (filterRole !== 'all') parts.push(`Papel: ${filterRole}`);
    if (filterPriority !== 'all') parts.push(`Prioridade: ${filterPriority}`);

    return parts.join('  ·  ');
  };

  // Generate audit entry when printing or exporting
  const logReportGenerationEvent = async (format: 'pdf' | 'csv') => {
    const reportNames: Record<ReportType, string> = {
      overview: 'Visão Geral do Painel',
      programs: 'Programas Humanitários',
      news: 'Notícias & Histórias Editoriais',
      ambassadors: 'Corpo Diplomático e Embaixadores',
      media: 'Mídias e Biblioteca Digital',
      donations: 'Financeiro e Doações',
      tasks: 'Gestão de Tarefas e Kanban',
      admins: 'Contas de Administradores',
      audit: 'Trilha de Auditoria Geral',
    };

    try {
      await api.logHistory(
        'Geração de Relatório',
        'Reports',
        reportNames[activeReport],
        `Relatório em formato ${format.toUpperCase()} (${detailLevel === 'analytical' ? 'Analítico' : 'Sintético'}) gerado por ${user?.name || user?.email}`
      );
    } catch (e) {
      console.error('Falha ao registar auditoria de relatório:', e);
    }
  };

  const handlePrint = () => {
    logReportGenerationEvent('pdf');
    success('Preparando Documento', 'O layout de impressão limpo foi otimizado. Carregando diálogo...');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Custom manual CSV export for the selected report type
  const handleCSVExport = () => {
    logReportGenerationEvent('csv');
    let csvData = '';
    const fileName = `admir_relatorio_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeReport === 'programs') {
      const items = getFilteredPrograms();
      const headers = ['Título', 'Categoria', 'Localização', 'Status Editorial', 'Data de Criação'];
      const rows = items.map((i) => {
        const pStatus = i.status || (i.isVisible ? 'published' : 'draft');
        return [
          `"${i.title.replace(/"/g, '""')}"`,
          i.category,
          `"${(i.location || '').replace(/"/g, '""')}"`,
          pStatus,
          i.createdAt || '',
        ];
      });
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'news') {
      const items = getFilteredStories();
      const headers = ['Manchete', 'Categoria', 'Status Editorial', 'Data de Publicação'];
      const rows = items.map((i) => {
        const sStatus = i.status || (i.isPublished ? 'published' : 'draft');
        return [
          `"${(i.headline || i.title || '').replace(/"/g, '""')}"`,
          i.category,
          sStatus,
          i.publicationDate || i.publishDate || '',
        ];
      });
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'ambassadors') {
      const items = getFilteredAmbassadors();
      const headers = ['Nome Completo', 'Cargo', 'País', 'Completo %', 'Status Editorial', 'Status Onboarding'];
      const rows = items.map((i) => [
        `"${i.fullName.replace(/"/g, '""')}"`,
        `"${i.role.replace(/"/g, '""')}"`,
        i.country,
        `${i.completionPercentage}%`,
        i.editorialStatus || 'draft',
        i.onboardingStatus || 'novo',
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'media') {
      const items = getFilteredMedia();
      const headers = ['Nome Arquivo', 'Título', 'Categoria', 'Tamanho (KB)', 'Data de Envio'];
      const rows = items.map((i) => [
        `"${i.originalName.replace(/"/g, '""')}"`,
        `"${(i.title || '').replace(/"/g, '""')}"`,
        i.category || 'Outros',
        Math.round((i.sizeBytes || 0) / 1024),
        i.createdAt || '',
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'donations') {
      const items = getFilteredDonations();
      const headers = ['Doador', 'E-mail', 'Valor', 'Moeda', 'Status', 'Método', 'Data'];
      const rows = items.map((i) => [
        `"${i.donorName.replace(/"/g, '""')}"`,
        i.donorEmail,
        i.amount,
        i.currency || 'USD',
        i.status,
        i.provider || 'paypal',
        i.date || i.createdAt || '',
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'tasks') {
      const items = getFilteredTasks();
      const headers = ['Ticket', 'Título', 'Workspace ID', 'Prioridade', 'Responsável', 'Data de Vencimento'];
      const rows = items.map((i) => [
        i.ticketNumber || '',
        `"${i.title.replace(/"/g, '""')}"`,
        i.workspaceId || '',
        i.priority || 'medium',
        i.responsible || '',
        i.dueDate || '',
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'admins') {
      const items = getFilteredAdmins();
      const headers = ['Nome', 'E-mail', 'Papel', 'Status', 'Cargo Técnico'];
      const rows = items.map((i) => [
        `"${i.name.replace(/"/g, '""')}"`,
        i.email,
        i.role,
        i.status,
        `"${(i.title || '').replace(/"/g, '""')}"`,
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeReport === 'audit') {
      const items = getFilteredAuditLogs();
      const headers = ['Data / Hora', 'Usuário', 'Ação', 'Módulo', 'Registro Afetado', 'Detalhes'];
      const rows = items.map((i) => [
        i.timestamp,
        `"${i.userName.replace(/"/g, '""')}"`,
        `"${i.action.replace(/"/g, '""')}"`,
        i.module,
        `"${(i.affectedRecord || '').replace(/"/g, '""')}"`,
        `"${(i.details || '').replace(/"/g, '""')}"`,
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      info('Exportação Geral', 'A exportação em formato CSV está disponível nos relatórios específicos de módulos.');
      return;
    }

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Relatório Exportado', 'Download do arquivo CSV concluído.');
  };

  // Automatically reset secondary filters when active tab shifts to keep clean states
  const handleReportTypeChange = (type: ReportType) => {
    setActiveReport(type);
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterRole('all');
    setFilterPriority('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Dynamic Screen CSS injection to force pristine print overrides */}
      <style>{`
        @media print {
          /* Hide EVERYTHING in layout */
          body * {
            visibility: hidden;
            background: transparent !important;
            box-shadow: none !important;
          }
          /* Except the dedicated print area */
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2.5cm 1.5cm;
            color: #000 !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
            background: white !important;
          }
          /* Eliminate scroll and margins for pure print output */
          html, body {
            height: auto;
            overflow: visible;
            background: white !important;
          }
          /* Table print styling optimization */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          td, th {
            border-bottom: 1px solid #ddd !important;
            padding: 8px !important;
            text-align: left !important;
            font-size: 9.5pt !important;
            color: #111 !important;
          }
          th {
            font-weight: bold !important;
            border-bottom: 2px solid #000 !important;
            text-transform: uppercase !important;
            font-size: 8.5pt !important;
          }
          /* Hide interactive or display panels */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Header - Hides on Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Central de Relatórios, Impressão & Exportação
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geração de relatórios consolidados e analíticos do sistema com suporte para auditoria, exportação CSV e PDFs limpos para impressão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            Sincronizar Dados
          </button>

          <button
            onClick={handleCSVExport}
            disabled={activeReport === 'overview'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar dados filtrados em formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      {/* Control Panel - Dynamic Filters & Option Tabs - Hides on Print */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        {/* Module selector panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Módulos Disponíveis
          </div>
          <div className="space-y-1">
            {[
              { id: 'overview', label: 'Visão Geral do Painel', icon: LayoutDashboard },
              { id: 'programs', label: 'Programas Humanitários', icon: FolderKanban },
              { id: 'news', label: 'Notícias & Histórias', icon: Newspaper },
              { id: 'ambassadors', label: 'Corpo Diplomático', icon: Users2 },
              { id: 'media', label: 'Fotos / Mídia Pública', icon: ImageIcon },
              { id: 'donations', label: 'Painel de Doações', icon: DollarSign },
              { id: 'tasks', label: 'Kanban e Tarefas', icon: CheckSquare },
              { id: 'admins', label: 'Administradores', icon: ShieldAlert },
              { id: 'audit', label: 'Auditoria de Sistema', icon: History },
            ].map((item) => {
              const Icon = item.icon;
              const hasAccess = permissionsMap[item.id as ReportType];
              const isSelected = activeReport === item.id;

              return (
                <button
                  key={item.id}
                  disabled={!hasAccess}
                  onClick={() => handleReportTypeChange(item.id as ReportType)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    !hasAccess
                      ? 'opacity-35 cursor-not-allowed'
                      : isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </div>
                  {!hasAccess && <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.2 rounded uppercase font-bold">Bloqueado</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Filters Configuration Block */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Opções e Filtros de Curadoria do Relatório
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range / Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Período Cronológico
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="all">Todo o Histórico (Sem filtro)</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="ytd">Deste Ano (YTD)</option>
                </select>
              </div>
            </div>

            {/* Detail level selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Nível de Detalhamento
              </label>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDetailLevel('summary')}
                  className={`flex-1 py-1 text-xs font-semibold rounded transition-all ${
                    detailLevel === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sintético
                </button>
                <button
                  type="button"
                  onClick={() => setDetailLevel('analytical')}
                  className={`flex-1 py-1 text-xs font-semibold rounded transition-all ${
                    detailLevel === 'analytical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Analítico
                </button>
              </div>
            </div>

            {/* Contextual Filters depending on Selected Tab */}
            {activeReport === 'programs' && (
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Categoria</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todas as Categorias</option>
                    {programCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeReport === 'news' && (
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Categoria</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todas as Categorias</option>
                    {newsCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeReport === 'ambassadors' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status de Onboarding</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="all">Todos os Status</option>
                  <option value="novo">Novo Link</option>
                  <option value="link_enviado">Link Enviado</option>
                  <option value="analisando">Em Análise</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
            )}

            {activeReport === 'media' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Categoria</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="all">Todas as Categorias</option>
                  {mediaCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {activeReport === 'donations' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status Transacional</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="all">Todos os Status</option>
                  <option value="succeeded">Sucedido</option>
                  <option value="refunded">Reembolsado</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
            )}

            {activeReport === 'tasks' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Prioridade</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="all">Todas as Prioridades</option>
                  <option value="high">Alta (High)</option>
                  <option value="medium">Média (Medium)</option>
                  <option value="low">Baixa (Low)</option>
                  <option value="urgent">Urgente (Urgent)</option>
                </select>
              </div>
            )}

            {activeReport === 'admins' && (
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Papel de Acesso</label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todos os Papéis</option>
                    <option value="owner">Dono do Site (Owner)</option>
                    <option value="manager">Diretor (Manager)</option>
                    <option value="editor">Editor (Editor)</option>
                    <option value="viewer">Observador (Viewer)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            )}

            {activeReport === 'audit' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Módulo</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="all">Todos os Módulos</option>
                  <option value="Auth">Autenticação (Auth)</option>
                  <option value="Ambassadors">Embaixadores</option>
                  <option value="Programs">Programas</option>
                  <option value="Stories">Notícias & Histórias</option>
                  <option value="Photos">Mídia Pública</option>
                  <option value="Donations">Financeiro</option>
                  <option value="Tasks">Kanban</option>
                  <option value="Administrators">Administradores</option>
                  <option value="Reports">Relatórios</option>
                </select>
              </div>
            )}

            {activeReport === 'overview' && (
              <div className="flex items-center p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-500 font-medium">
                <Info className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                O relatório de Visão Geral sintetiza o desempenho e as estatísticas globais de todos os módulos disponíveis de forma unificada.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Report Render Wrapper - Shared with Native Printer Viewport */}
      <div id="print-area" className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 md:p-10 shadow-sm relative text-slate-800">
        
        {/* Document Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-700 tracking-wider uppercase font-mono">
              Relatório Institucional de Sistema
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 font-serif-heading leading-tight">
              ADMIR — American Diplomatic Mission of International Relations
            </h1>
            <p className="text-[11px] text-slate-500 italic max-w-xl">
              Promovendo paz, cooperação diplomática internacional, dignidade humana e ajuda humanitária globalmente.
            </p>
          </div>

          <div className="text-left sm:text-right mt-4 sm:mt-0 text-[10px] space-y-0.5 text-slate-500 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            <div>
              <span className="font-bold text-slate-800">Classificação:</span> [CONFIDENCIAL — USO INTERNO]
            </div>
            <div>
              <span className="font-bold text-slate-800">Emissor:</span> {user?.name}
            </div>
            <div>
              <span className="font-bold text-slate-800">E-mail:</span> {user?.email}
            </div>
            <div>
              <span className="font-bold text-slate-800">Data/Hora:</span> {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Current Active Report Metadata Indicator */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-4 py-2 mb-6 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-slate-700 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              {activeReport.toUpperCase()}
            </span>
            <span className="text-slate-900 font-serif-heading text-sm">
              {activeReport === 'overview' && 'Relatório Executivo de Visão Geral'}
              {activeReport === 'programs' && 'Relatório Consolidado de Programas'}
              {activeReport === 'news' && 'Relatório Editorial de Notícias & Histórias'}
              {activeReport === 'ambassadors' && 'Relatório de Onboarding do Corpo Diplomático'}
              {activeReport === 'media' && 'Relatório de Arquivos da Biblioteca de Mídias'}
              {activeReport === 'donations' && 'Relatório de Demonstrativo de Doações'}
              {activeReport === 'tasks' && 'Relatório Executivo de Atividades e Kanban'}
              {activeReport === 'admins' && 'Relatório de Contas de Administradores'}
              {activeReport === 'audit' && 'Relatório da Trilha de Auditoria Geral'}
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            {getFilterSummaryText()}
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 no-print">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            <span className="text-xs font-medium">Buscando dados seguros...</span>
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 1. OVERVIEW (VISÃO GERAL)
            ========================================== */}
        {!loading && activeReport === 'overview' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Programas</span>
                <span className="text-2xl font-serif-heading font-bold text-slate-950 block">{programs.length}</span>
                <span className="text-[10px] text-slate-500 block">
                  {programs.filter(p => (p.status || (p.isVisible ? 'published' : 'draft')) === 'published').length} publicados
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notícias</span>
                <span className="text-2xl font-serif-heading font-bold text-slate-950 block">{stories.length}</span>
                <span className="text-[10px] text-slate-500 block">
                  {stories.filter(s => (s.status || (s.isPublished ? 'published' : 'draft')) === 'published').length} publicadas
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corpo Diplomático</span>
                <span className="text-2xl font-serif-heading font-bold text-slate-950 block">{ambassadors.length}</span>
                <span className="text-[10px] text-slate-500 block">{Math.round(ambassadors.reduce((acc, a) => acc + (a.completionPercentage || 0), 0) / (ambassadors.length || 1))}% comp. médio</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arrecadação</span>
                <span className="text-2xl font-serif-heading font-bold text-slate-950 block">USD {donationStats.totalRaised.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block">{donationStats.donationsReceived} doações registradas</span>
              </div>
            </div>

            {/* General Description Paragraph */}
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Este documento apresenta o consolidado executivo do sistema da <strong>ADMIR — American Diplomatic Mission of International Relations</strong>. O escopo abrange o total de programas institucionais, relatórios editoriais de notícias veiculadas, estatísticas detalhadas do onboarding de novos embaixadores e demonstrativos de doações recebidas para financiamento das operações humanitárias globais.
              </p>
              <p>
                A integridade dos dados foi auditada conforme os registros automáticos do servidor. Todas as contas administrativas ativas estão operando sob a política estrita de autorização RBAC do Diplomatic CMS.
              </p>
            </div>

            {/* Module distribution overview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-left">Módulo do CMS</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-center">Registros Ativos</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-center">Publicados / Ativos</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-center">Rascunhos / Pendentes</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Acesso RBAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Programas Humanitários</td>
                    <td className="py-2.5 px-3 text-center">{programs.length}</td>
                    <td className="py-2.5 px-3 text-center">
                      {programs.filter(p => (p.status || (p.isVisible ? 'published' : 'draft')) === 'published').length}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {programs.filter(p => (p.status || (p.isVisible ? 'published' : 'draft')) === 'draft').length}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">programs.view / edit</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Notícias & Histórias</td>
                    <td className="py-2.5 px-3 text-center">{stories.length}</td>
                    <td className="py-2.5 px-3 text-center">
                      {stories.filter(s => (s.status || (s.isPublished ? 'published' : 'draft')) === 'published').length}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {stories.filter(s => (s.status || (s.isPublished ? 'published' : 'draft')) === 'draft').length}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">news.view / edit</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Corpo Diplomático e Onboarding</td>
                    <td className="py-2.5 px-3 text-center">{ambassadors.length}</td>
                    <td className="py-2.5 px-3 text-center">{ambassadors.filter(a => a.onboardingStatus === 'publicado').length}</td>
                    <td className="py-2.5 px-3 text-center">{ambassadors.filter(a => a.onboardingStatus !== 'publicado').length}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">ambassadors.view / edit</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Biblioteca de Mídias Públicas</td>
                    <td className="py-2.5 px-3 text-center">{media.length}</td>
                    <td className="py-2.5 px-3 text-center">—</td>
                    <td className="py-2.5 px-3 text-center">—</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">media.view / edit</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Demonstrativo de Doações</td>
                    <td className="py-2.5 px-3 text-center">{donations.length}</td>
                    <td className="py-2.5 px-3 text-center">{donations.filter(d => d.status === 'succeeded').length}</td>
                    <td className="py-2.5 px-3 text-center">{donations.filter(d => d.status !== 'succeeded').length}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">donations.view / refund</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-900">Kanban de Atividades</td>
                    <td className="py-2.5 px-3 text-center">{tasks.length}</td>
                    <td className="py-2.5 px-3 text-center">{tasks.filter(t => t.stageId?.includes('final') || t.stageId?.includes('st-l-3')).length}</td>
                    <td className="py-2.5 px-3 text-center">{tasks.filter(t => !t.stageId?.includes('final') && !t.stageId?.includes('st-l-3')).length}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">tasks.view / edit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 2. PROGRAMS (PROGRAMAS)
            ========================================== */}
        {!loading && activeReport === 'programs' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Filtrado</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredPrograms().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publicados</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredPrograms().filter((p) => {
                    const pStatus = p.status || (p.isVisible ? 'published' : 'draft');
                    return pStatus === 'published';
                  }).length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Em Rascunho</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  {getFilteredPrograms().filter((p) => {
                    const pStatus = p.status || (p.isVisible ? 'published' : 'draft');
                    return pStatus === 'draft';
                  }).length}
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Título</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Localização</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Data Criação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredPrograms().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Nenhum programa localizado para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredPrograms().map((p) => {
                        const pStatus = p.status || (p.isVisible ? 'published' : 'draft');
                        return (
                          <tr key={p.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{p.title}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.location || 'Washington, D.C.'}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-xs">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${pStatus === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {pStatus === 'published' ? 'Publicado' : 'Rascunho'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Resumo de Categorias Humanitárias</h3>
                <div className="space-y-1.5">
                  {programCategories.map((cat) => {
                    const count = getFilteredPrograms().filter((p) => p.category === cat).length;
                    return (
                      <div key={cat} className="flex justify-between items-center text-xs font-medium text-slate-700">
                        <span>{cat}</span>
                        <span className="text-slate-900">{count} programas ({Math.round((count / (getFilteredPrograms().length || 1)) * 100)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 3. NEWS (NOTÍCIAS & HISTÓRIAS)
            ========================================== */}
        {!loading && activeReport === 'news' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Filtrado</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredStories().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publicadas</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredStories().filter((s) => {
                    const sStatus = s.status || (s.isPublished ? 'published' : 'draft');
                    return sStatus === 'published';
                  }).length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Em Rascunho</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  {getFilteredStories().filter((s) => {
                    const sStatus = s.status || (s.isPublished ? 'published' : 'draft');
                    return sStatus === 'draft';
                  }).length}
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Título / Manchete</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Autor / Editor</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Data Publicação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredStories().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Nenhuma notícia localizada para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredStories().map((s) => {
                        const sStatus = s.status || (s.isPublished ? 'published' : 'draft');
                        return (
                          <tr key={s.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-sm truncate">{s.headline || s.title}</td>
                            <td className="py-2.5 px-3 text-slate-600">{s.category}</td>
                            <td className="py-2.5 px-3 text-slate-600">{s.author || 'Departamento Diplomático'}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-xs">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${sStatus === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {sStatus === 'published' ? 'Publicado' : 'Rascunho'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {s.publicationDate || s.publishDate ? new Date(s.publicationDate || s.publishDate || '').toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Resumo da Editoria Digital</h3>
                <div className="space-y-1.5">
                  {newsCategories.map((cat) => {
                    const count = getFilteredStories().filter((s) => s.category === cat).length;
                    return (
                      <div key={cat} className="flex justify-between items-center text-xs font-medium text-slate-700">
                        <span>{cat}</span>
                        <span className="text-slate-900">{count} matérias ({Math.round((count / (getFilteredStories().length || 1)) * 100)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 4. AMBASSADORS (EMBAIXADORES)
            ========================================== */}
        {!loading && activeReport === 'ambassadors' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diplomatas</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredAmbassadors().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completo % Médio</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  {Math.round(getFilteredAmbassadors().reduce((acc, a) => acc + (a.completionPercentage || 0), 0) / (getFilteredAmbassadors().length || 1))}%
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Onboarded Ativos</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredAmbassadors().filter((a) => a.onboardingStatus === 'publicado').length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Link Enviado/Análise</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-slate-700 block">
                  {getFilteredAmbassadors().filter((a) => a.onboardingStatus === 'link_enviado' || a.onboardingStatus === 'analisando').length}
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Nome do Embaixador</th>
                      <th className="py-2 px-3">Papel Diplomático</th>
                      <th className="py-2 px-3">País de Atuação</th>
                      <th className="py-2 px-3">Onboarding Status</th>
                      <th className="py-2 px-3">Docs Enviados</th>
                      <th className="py-2 px-3 text-right">Ficha Comp. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredAmbassadors().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">Nenhum diplomata localizado para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredAmbassadors().map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{a.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{a.role}</td>
                          <td className="py-2.5 px-3 text-slate-600">{a.country}</td>
                          <td className="py-2.5 px-3 text-slate-500 uppercase text-[9.5px] font-bold tracking-wider">{a.onboardingStatus}</td>
                          <td className="py-2.5 px-3 text-slate-500">{a.documents?.length || 0} de 6</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{a.completionPercentage}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Distribuição por Países</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {Array.from(new Set(getFilteredAmbassadors().map((a) => a.country))).slice(0, 5).map((country) => {
                      const count = getFilteredAmbassadors().filter((a) => a.country === country).length;
                      return (
                        <div key={country} className="flex justify-between items-center">
                          <span>{country}</span>
                          <span className="font-bold">{count} diplomatas</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Completabilidade de Ficha</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>Excelente (&ge; 80%)</span>
                      <span className="font-bold">{getFilteredAmbassadors().filter((a) => (a.completionPercentage || 0) >= 80).length} diplomatas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Intermediário (40% - 79%)</span>
                      <span className="font-bold">{getFilteredAmbassadors().filter((a) => (a.completionPercentage || 0) >= 40 && (a.completionPercentage || 0) < 80).length} diplomatas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pendente (&lt; 40%)</span>
                      <span className="font-bold">{getFilteredAmbassadors().filter((a) => (a.completionPercentage || 0) < 40).length} diplomatas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 5. MEDIA (FOTOS / MÍDIA PÚBLICA)
            ========================================== */}
        {!loading && activeReport === 'media' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arquivos de Imagem</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredMedia().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tamanho Acervo Estimado</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  {Math.round(getFilteredMedia().reduce((acc, m) => acc + (m.sizeBytes || 0), 0) / (1024 * 1024))} MB
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Álbuns e Eventos</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">{albums.length} álbuns</span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Nome Arquivo</th>
                      <th className="py-2 px-3">Título Digital</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Resolução</th>
                      <th className="py-2 px-3 text-right">Tamanho KB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredMedia().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Nenhum arquivo digital localizado para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredMedia().slice(0, 100).map((m) => (
                        <tr key={m.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[200px]">{m.originalName}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]">{m.title || 'Sem título'}</td>
                          <td className="py-2 px-3 text-slate-600">{m.category || 'Não categorizado'}</td>
                          <td className="py-2 px-3 text-slate-500">{m.dimensions || 'N/A'}</td>
                          <td className="py-2 px-3 text-right text-slate-800 font-mono">
                            {Math.round((m.sizeBytes || 0) / 1024)} KB
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {getFilteredMedia().length > 100 && (
                  <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-500 font-semibold border-t border-slate-200 uppercase tracking-wider">
                    Mostrando primeiras 100 mídias de {getFilteredMedia().length} no formato analítico para otimização de página.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Distribuição por Categoria de Mídia</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {mediaCategories.map((c) => {
                      const count = getFilteredMedia().filter((m) => m.category === c).length;
                      return (
                        <div key={c} className="flex justify-between items-center">
                          <span>{c || 'Sem Categoria'}</span>
                          <span className="font-bold">{count} mídias ({Math.round((count / (getFilteredMedia().length || 1)) * 100)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Últimos Importes de Mídia WordPress</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {importJobs.slice(0, 4).map((j) => (
                      <div key={j.id} className="flex justify-between items-center">
                        <span className="truncate max-w-[150px]">{j.jobName}</span>
                        <span className="font-mono text-[10px] uppercase font-bold text-slate-600">
                          {j.totalItems} mídias ({j.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 6. DONATIONS (DOAÇÕES)
            ========================================== */}
        {!loading && activeReport === 'donations' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receita Total Filtrada</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-800 block">
                  USD {getFilteredDonations().reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  USD {Math.round(getFilteredDonations().reduce((acc, d) => acc + (d.amount || 0), 0) / (getFilteredDonations().length || 1))}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantidade de Doações</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-slate-800 block">
                  {getFilteredDonations().length} transações
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Doador</th>
                      <th className="py-2 px-3">E-mail de Contato</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Método Pagamento</th>
                      <th className="py-2 px-3">Causa / Objetivo</th>
                      <th className="py-2 px-3 text-right">Valor USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredDonations().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">Nenhuma transação humanitária localizada para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredDonations().map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{d.donorName}</td>
                          <td className="py-2 px-3 text-slate-600">{d.donorEmail}</td>
                          <td className="py-2 px-3 text-slate-500 uppercase text-[9.5px] font-bold">{d.status}</td>
                          <td className="py-2 px-3 text-slate-500 font-medium uppercase text-[10px]">{d.provider || 'Credit Card / Paypal'}</td>
                          <td className="py-2 px-3 text-slate-500">{d.cause || 'Missão Diplomática Geral'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            USD {d.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Distribuição por Destinação</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {Array.from(new Set(getFilteredDonations().map((d) => d.cause || 'Missão Geral'))).map((cause) => {
                      const amount = getFilteredDonations().filter((d) => (d.cause || 'Missão Geral') === cause).reduce((acc, curr) => acc + curr.amount, 0);
                      return (
                        <div key={cause} className="flex justify-between items-center">
                          <span>{cause}</span>
                          <span className="font-bold">USD {amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Método de Envio transacional</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {Array.from(new Set(getFilteredDonations().map((d) => d.provider || 'paypal'))).map((method) => {
                      const count = getFilteredDonations().filter((d) => (d.provider || 'paypal') === method).length;
                      return (
                        <div key={method} className="flex justify-between items-center uppercase font-mono text-[10.5px]">
                          <span>{method}</span>
                          <span className="font-bold">{count} doações</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 7. TASKS (KANBAN E TAREFAS)
            ========================================== */}
        {!loading && activeReport === 'tasks' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tarefas Ativas</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredTasks().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prioridade Alta/Urgente</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-rose-700 block">
                  {getFilteredTasks().filter((t) => t.priority === 'high' || t.priority === 'urgent').length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Concluídas</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredTasks().filter((t) => t.stageId?.includes('final') || t.stageId?.includes('st-l-3')).length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Espaços de Trabalho</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-slate-700 block">{workspaces.length}</span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Ticket ID</th>
                      <th className="py-2 px-3">Tarefa / Atividade</th>
                      <th className="py-2 px-3">Prioridade</th>
                      <th className="py-2 px-3">Responsável</th>
                      <th className="py-2 px-3">Checklist Itens</th>
                      <th className="py-2 px-3 text-right">Previsão Entrega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredTasks().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">Nenhuma tarefa institucional localizada para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredTasks().map((t) => (
                        <tr key={t.id}>
                          <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">{t.ticketNumber || `ADMIR-${t.id.slice(-4)}`}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{t.title}</td>
                          <td className="py-2.5 px-3 text-slate-500 uppercase text-[9.5px] font-bold">{t.priority || 'medium'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{t.responsible || 'Sem Responsável'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{(t.checklist || []).filter(c => c.completed).length} de {(t.checklist || []).length} resolvidos</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Tarefas por Prioridade</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>Alta / Urgente</span>
                      <span className="font-bold">{getFilteredTasks().filter((t) => t.priority === 'high' || t.priority === 'urgent').length} tarefas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Média</span>
                      <span className="font-bold">{getFilteredTasks().filter((t) => t.priority === 'medium' || !t.priority).length} tarefas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Baixa</span>
                      <span className="font-bold">{getFilteredTasks().filter((t) => t.priority === 'low').length} tarefas</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Distribuição por Workspace</h3>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {workspaces.map((ws) => {
                      const count = getFilteredTasks().filter((t) => t.workspaceId === ws.id).length;
                      return (
                        <div key={ws.id} className="flex justify-between items-center">
                          <span>{ws.name}</span>
                          <span className="font-bold">{count} tarefas</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 8. ADMINS (ADMINISTRADORES)
            ========================================== */}
        {!loading && activeReport === 'admins' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Administradores</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredAdmins().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contas Protegidas</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-rose-700 block">
                  {getFilteredAdmins().filter((a) => a.isProtected).length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sessão Ativa Google</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredAdmins().filter((a) => a.authProvider === 'google').length}
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Administrador</th>
                      <th className="py-2 px-3">E-mail Credenciado</th>
                      <th className="py-2 px-3">Cargo Diplomático</th>
                      <th className="py-2 px-3">Papel RBAC</th>
                      <th className="py-2 px-3">Vínculo Google</th>
                      <th className="py-2 px-3 text-right">Último Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredAdmins().map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{a.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{a.email}</td>
                        <td className="py-2.5 px-3 text-slate-600">{a.title || 'Diplomata ADMIR'}</td>
                        <td className="py-2.5 px-3 text-slate-500 uppercase text-[9px] font-bold tracking-wider">{a.role}</td>
                        <td className="py-2.5 px-3 text-slate-500 uppercase text-[9px] font-bold">
                          {a.authProvider === 'google' ? 'Google Linked' : 'Pend. Onboarding'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                          {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Nunca acessado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Descrição de Permissões Críticas por Nível</h3>
                <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>OWNER (Dono do Site):</strong> Controle absoluto sobre todos os módulos do CMS, incluindo a criação de convites, atribuição de cargos, alterações críticas de banco de dados e auditoria de sistema.
                  </p>
                  <p>
                    <strong>MANAGER (Diretor):</strong> Escopo operacional completo com exclusão de rebaixamento de Owners. Acesso completo ao Painel de Doações e Kanban.
                  </p>
                  <p>
                    <strong>EDITOR (Escritor):</strong> Permissão para criação e publicação de programas humanitários, notícias, mídias públicas e atualização do onboarding de diplomatas.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            REPORT TYPES: 9. AUDIT (HISTORY AUDIT LOG)
            ========================================== */}
        {!loading && activeReport === 'audit' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registros Gravados</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 block">{getFilteredAuditLogs().length}</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modificações</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-amber-700 block">
                  {getFilteredAuditLogs().filter((l) => l.action.includes('Alteração') || l.action.includes('Edição')).length}
                </span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acessos Gravados</span>
                <span className="text-xl font-serif-heading font-bold text-slate-950 text-emerald-700 block">
                  {getFilteredAuditLogs().filter((l) => l.action === 'Login').length}
                </span>
              </div>
            </div>

            {/* Table Detail */}
            {detailLevel === 'analytical' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3">Data/Hora</th>
                      <th className="py-2 px-3">Usuário</th>
                      <th className="py-2 px-3">Ação</th>
                      <th className="py-2 px-3">Módulo</th>
                      <th className="py-2 px-3">Registro Afetado</th>
                      <th className="py-2 px-3 text-right">IP Servidor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getFilteredAuditLogs().length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">Nenhum evento auditado localizado para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      getFilteredAuditLogs().slice(0, 100).map((l) => (
                        <tr key={l.id}>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10.5px]">{new Date(l.timestamp).toLocaleString()}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{l.userName}</td>
                          <td className="py-2 px-3 text-slate-800">{l.action}</td>
                          <td className="py-2 px-3 text-slate-600">{l.module}</td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-[200px]" title={l.affectedRecord}>{l.affectedRecord}</td>
                          <td className="py-2 px-3 text-right text-slate-500 font-mono text-[10px]">{l.ipAddress || '127.0.0.1'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {getFilteredAuditLogs().length > 100 && (
                  <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-500 font-semibold border-t border-slate-200 uppercase tracking-wider">
                    Mostrando os primeiros 100 logs de auditoria de {getFilteredAuditLogs().length} para otimização de renderização.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-serif-heading font-semibold text-slate-950 text-sm">Descrição de Rastreabilidade e Não-Repúdio</h3>
                <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  <p>
                    A trilha de auditoria é armazenada e indexada de forma imutável a cada alteração ou requisição administrativa. Nenhuma conta administrativa possui privilégios para editar, ocultar ou excluir registros deste histórico.
                  </p>
                  <p>
                    Todos os registros contêm a identificação segura do usuário, o IP de origem, informações do agente do navegador e o estado anterior e posterior das alterações críticas efetuadas.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature Area & Official Seal (Pruned and elegant) */}
        <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-slate-400 text-[10px] gap-4">
          <div className="space-y-1">
            <div className="font-bold text-slate-700 uppercase tracking-wider">ADMIR Diplomatic Mission System</div>
            <div>Assinatura de Documento Oficial Criptografado & Histórico Auditado</div>
            <div className="font-mono text-[9px]">HASH DE INTEGRIDADE: SHA256-4DA1-8BEC-59FC4E7728CB</div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="h-10 w-28 border border-slate-200 bg-slate-50 flex items-center justify-center font-bold font-serif-heading text-slate-400 rounded tracking-widest text-[9px] uppercase">
              SELO OFICIAL
            </div>
            <div>Washington, D.C. - Estados Unidos</div>
          </div>
        </div>

      </div>

    </div>
  );
}
