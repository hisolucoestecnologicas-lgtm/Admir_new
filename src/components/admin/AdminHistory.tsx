import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  User,
  Clock,
  ShieldCheck,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { AuditLog } from '../../types';
import { PrivacyNotice } from '../common/PrivacyNotice';

export function AdminHistory() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canExport = hasPermission('history.export');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await api.getHistory();
      setLogs(data);
    } catch (e: any) {
      error('Erro ao carregar histórico', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (!canExport) {
      error('Acesso Negado', 'Permissão insuficiente para exportar histórico de auditoria.');
      return;
    }

    const headers = ['Data / Hora', 'Administrador', 'Módulo', 'Ação', 'Registro Afetado', 'Detalhes'];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      `"${l.userName.replace(/"/g, '""')}"`,
      l.module,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${(l.affectedRecord || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admir_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Relatório de Auditoria Exportado', 'Download do arquivo CSV concluído.');
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase())) ||
      (l.affectedRecord && l.affectedRecord.toLowerCase().includes(search.toLowerCase()));

    const matchesModule = selectedModule === 'all' || l.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Histórico & Trilha de Auditoria Imutável
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico não-editável de todas as modificações, acessos, exclusões e publicações.
          </p>
        </div>

        {canExport && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar CSV de Auditoria</span>
          </button>
        )}
      </div>

      <PrivacyNotice context="admin_users" theme="light" variant="compact" />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação ou termo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase">Módulo:</span>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
          >
            <option value="all">Todos os Módulos</option>
            <option value="auth">Autenticação (Login/Logout)</option>
            <option value="home">Página Inicial</option>
            <option value="programs">Programas</option>
            <option value="news">Notícias</option>
            <option value="ambassadors">Embaixadores</option>
            <option value="media">Biblioteca de Mídia</option>
            <option value="donations">Doações</option>
            <option value="tasks">Tarefas</option>
            <option value="users">Administradores</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-44">Data & Horário</th>
                <th className="py-3.5 px-4">Administrador</th>
                <th className="py-3.5 px-4">Módulo</th>
                <th className="py-3.5 px-4">Ação Realizada</th>
                <th className="py-3.5 px-4">Detalhes</th>
                <th className="py-3.5 px-4 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-400">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>

                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    {log.userName}
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-sans font-bold text-[10px] uppercase">
                      {log.module}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-sans font-medium text-slate-800">
                    {log.action}
                  </td>

                  <td className="py-3 px-4 text-slate-500 font-sans line-clamp-1 max-w-xs">
                    {log.details || log.affectedRecord || '—'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold font-serif-heading text-slate-900">
                Detalhes do Registro de Auditoria
              </h3>
              <button type="button" onClick={() => setSelectedLog(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono">
              <div><strong className="text-slate-500 font-sans">ID do Evento:</strong> {selectedLog.id}</div>
              <div><strong className="text-slate-500 font-sans">Timestamp:</strong> {new Date(selectedLog.timestamp).toISOString()}</div>
              <div><strong className="text-slate-500 font-sans">Usuário:</strong> {selectedLog.userName} ({selectedLog.userEmail || selectedLog.userId || 'N/A'})</div>
              <div><strong className="text-slate-500 font-sans">Módulo:</strong> {selectedLog.module}</div>
              <div><strong className="text-slate-500 font-sans">Ação:</strong> {selectedLog.action}</div>
              {selectedLog.affectedRecord && (
                <div><strong className="text-slate-500 font-sans">Registro:</strong> {selectedLog.affectedRecord}</div>
              )}
              {selectedLog.details && (
                <div className="pt-2 border-t border-slate-200">
                  <strong className="text-slate-500 font-sans block mb-1">Carga / Detalhes:</strong>
                  <pre className="bg-white p-2 rounded border border-slate-200 text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.details}
                  </pre>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
