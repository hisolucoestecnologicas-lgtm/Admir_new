import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Newspaper,
  Users2,
  Image as ImageIcon,
  DollarSign,
  CheckSquare,
  ShieldAlert,
  History,
  LogOut,
  ExternalLink,
  Shield,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  UserCheck,
  Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { AdminLogin } from './AdminLogin';

// CMS Modules
import { AdminDashboard } from './AdminDashboard';
import { AdminHomeTexts } from './AdminHomeTexts';
import { AdminPrograms } from './AdminPrograms';
import { AdminNews } from './AdminNews';
import { AdminAmbassadors } from './AdminAmbassadors';
import { AdminMediaLibrary } from './AdminMediaLibrary';
import { AdminDonations } from './AdminDonations';
import { AdminTasks } from './AdminTasks';
import { AdminUsers } from './AdminUsers';
import { AdminHistory } from './AdminHistory';
import { AdminAssistant } from './AdminAssistant';
import { AdminMaintenance } from './AdminMaintenance';
import { DataSyncManager } from './DataSyncManager';
import { AdminReports } from './AdminReports';
import { Bot, Wrench, Database } from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'reports'
  | 'home-texts'
  | 'programs'
  | 'news'
  | 'ambassadors'
  | 'media'
  | 'donations'
  | 'tasks'
  | 'assistant'
  | 'maintenance'
  | 'sync'
  | 'users'
  | 'history';

export function AdminLayout() {
  const { user, isAuthenticated, isOwner, logout, hasPermission, login } = useAuth();
  const { selectedParam, navigateTo } = useSite();

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (selectedParam?.startsWith('tasks')) {
      setActiveSection('tasks');
    }
  }, [selectedParam]);

  if (!isAuthenticated || !user) {
    return <AdminLogin />;
  }

  const navItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, perm: null },
    { id: 'reports', label: 'Relatórios & Impressão', icon: Printer, perm: null },
    { id: 'home-texts', label: 'Textos da Home', icon: FileText, perm: 'home.view' as const },
    { id: 'programs', label: 'Programas', icon: FolderKanban, perm: 'programs.view' as const },
    { id: 'news', label: 'Notícias & Histórias', icon: Newspaper, perm: 'news.view' as const },
    { id: 'ambassadors', label: 'Embaixadores', icon: Users2, perm: 'ambassadors.view' as const },
    { id: 'media', label: 'Fotos / Mídia', icon: ImageIcon, perm: 'media.view' as const },
    { id: 'donations', label: 'Painel de Doações', icon: DollarSign, perm: 'donations.view' as const },
    { id: 'tasks', label: 'Tarefas / Kanban', icon: CheckSquare, perm: 'tasks.view' as const },
    { id: 'assistant', label: 'Assistente Virtual / IA', icon: Bot, perm: 'assistant.view' as const },
    { id: 'maintenance', label: 'Central de Manutenção', icon: Wrench, perm: 'maintenance.view' as const },
    { id: 'sync', label: 'Sincronização de Dados', icon: Database, perm: 'sync.view' as const },
    { id: 'users', label: 'Administradores', icon: ShieldAlert, perm: 'admins.view' as const },
    { id: 'history', label: 'Histórico / Auditoria', icon: History, perm: 'history.view' as const },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Header Bar */}
      <header className="bg-slate-900 text-white h-16 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold font-serif-heading">
              AD
            </div>
            <div>
              <span className="font-serif-heading font-bold text-white text-sm">
                ADMIR Diplomatic CMS
              </span>
              <span className="text-[10px] text-amber-400 block -mt-0.5 uppercase tracking-wider font-semibold">
                Painel Administrativo
              </span>
            </div>
          </div>
        </div>

        {/* Right User Bar */}
        <div className="flex items-center gap-3">
          {/* User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-amber-500/50 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-none flex items-center gap-1.5">
                <span>{user.name}</span>
                {user.authProvider === 'google' && (
                  <span className="text-[9px] bg-slate-800 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded font-mono">
                    Google
                  </span>
                )}
              </div>
              <div className="text-[10px] mt-0.5">
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 font-extrabold text-amber-300 bg-amber-950/80 border border-amber-600/40 px-1.5 py-0.2 rounded">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    DONO DO SITE
                  </span>
                ) : (
                  <span className="text-slate-400 uppercase font-semibold">{user.role}</span>
                )}
              </div>
            </div>
          </div>

          {/* Link to Public Site */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Ver o site público"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ver Site Público</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Encerrar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Admin Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all ${
            sidebarOpen ? 'fixed inset-y-0 left-0 z-50 pt-16 shadow-2xl lg:relative lg:pt-0' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navegação do Sistema
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const hasAccess = item.perm === null || hasPermission(item.perm);
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!hasAccess}
                  onClick={() => {
                    setActiveSection(item.id as AdminSection);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    !hasAccess
                      ? 'opacity-40 cursor-not-allowed text-slate-500'
                      : isActive
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {!hasAccess && <span className="text-[10px] uppercase font-bold text-slate-500">Bloqueado</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeSection === 'overview' && <AdminDashboard onNavigate={(sec) => setActiveSection(sec)} />}
          {activeSection === 'reports' && <AdminReports />}
          {activeSection === 'home-texts' && <AdminHomeTexts />}
          {activeSection === 'programs' && <AdminPrograms />}
          {activeSection === 'news' && <AdminNews />}
          {activeSection === 'ambassadors' && <AdminAmbassadors />}
          {activeSection === 'media' && <AdminMediaLibrary />}
          {activeSection === 'donations' && <AdminDonations />}
          {activeSection === 'tasks' && <AdminTasks />}
          {activeSection === 'assistant' && <AdminAssistant />}
          {activeSection === 'maintenance' && <AdminMaintenance />}
          {activeSection === 'sync' && <DataSyncManager />}
          {activeSection === 'users' && <AdminUsers />}
          {activeSection === 'history' && <AdminHistory />}
        </main>
      </div>
    </div>
  );
}
