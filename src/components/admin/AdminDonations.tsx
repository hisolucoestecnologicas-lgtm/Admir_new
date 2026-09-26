import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  Search,
  Filter,
  Heart,
  Calendar,
  ShieldCheck,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Donation } from '../../types';
import { PrivacyNotice } from '../common/PrivacyNotice';

export function AdminDonations() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canExport = hasPermission('donations.export');
  const canRefund = hasPermission('donations.refund');

  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState({ totalRaised: 0, monthlyPledges: 0, donationsReceived: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'all' | 'today' | 'month' | 'year'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'one-time' | 'monthly'>('all');

  // Modal
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const fetchDonations = async () => {
    try {
      const res = await api.getDonations();
      setDonations(res.donations);
      setStats(res.stats);
    } catch (e: any) {
      error('Erro ao carregar doações', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleRefund = async (donationId: string) => {
    if (!canRefund) {
      error('Acesso Negado', 'Você não possui permissão para reembolsar doações.');
      return;
    }
    if (!window.confirm('Confirma o reembolso desta doação? Esta ação é auditada e irreversível.')) {
      return;
    }
    try {
      await api.refundDonation(donationId);
      success('Doação Reembolsada', 'O registro financeiro foi atualizado para reembolsado.');
      setSelectedDonation(null);
      fetchDonations();
    } catch (err: any) {
      error('Erro ao reembolsar', err.message);
    }
  };

  const handleExportCSV = () => {
    if (!canExport) {
      error('Acesso Negado', 'Você não tem permissão para exportar dados financeiros.');
      return;
    }

    const headers = ['ID Transação', 'Data', 'Doador', 'E-mail', 'Tipo', 'Valor (USD)', 'Causa', 'Status'];
    const rows = filtered.map((d) => [
      d.transactionId,
      new Date(d.createdAt || d.date || Date.now()).toISOString(),
      `"${d.donorName.replace(/"/g, '""')}"`,
      d.donorEmail,
      d.donationType,
      d.amount,
      `"${(d.cause || 'Geral').replace(/"/g, '""')}"`,
      d.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admir_donations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Relatório CSV Exportado', 'O arquivo com o histórico de doações foi baixado.');
  };

  const filtered = donations.filter((d) => {
    const matchesSearch =
      d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.donorEmail.toLowerCase().includes(search.toLowerCase()) ||
      d.transactionId.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || d.donationType === typeFilter;

    // Period filter
    const now = new Date();
    const dDate = new Date(d.createdAt || d.date || Date.now());
    let matchesPeriod = true;
    if (period === 'today') {
      matchesPeriod = dDate.toDateString() === now.toDateString();
    } else if (period === 'month') {
      matchesPeriod = dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    } else if (period === 'year') {
      matchesPeriod = dDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesType && matchesPeriod;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Painel Financeiro & Doações
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro contábil de todas as contribuições, doações recorrentes e alocações programáticas.
          </p>
        </div>

        {canExport && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar CSV</span>
          </button>
        )}
      </div>

      <PrivacyNotice context="donations" theme="light" variant="compact" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Arrecadado</div>
          <div className="text-3xl font-black font-serif-heading text-slate-900">
            ${stats.totalRaised.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">USD</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Recursos 100% auditados
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compromissos Recorrentes</div>
          <div className="text-3xl font-black font-serif-heading text-slate-900">
            ${stats.monthlyPledges.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">USD/mês</span>
          </div>
          <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-current" />
            Guardiões mensais ativos
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doações Registradas</div>
          <div className="text-3xl font-black font-serif-heading text-slate-900">
            {stats.donationsReceived}
          </div>
          <div className="text-[11px] text-slate-500">
            Comprovantes diplomáticos emitidos
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar doador, e-mail ou código TXN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Period Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['all', 'today', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  period === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'all' && 'Tudo'}
                {p === 'today' && 'Hoje'}
                {p === 'month' && 'Este Mês'}
                {p === 'year' && 'Este Ano'}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['all', 'one-time', 'monthly'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'all' && 'Todos Tipos'}
                {t === 'one-time' && 'Única'}
                {t === 'monthly' && 'Mensal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Recibo / Data</th>
                <th className="py-3.5 px-4">Doador</th>
                <th className="py-3.5 px-4">Causa / Destinação</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-slate-900 font-bold">{d.transactionId}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(d.createdAt || d.date || Date.now()).toLocaleDateString()} {new Date(d.createdAt || d.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{d.donorName}</div>
                    <div className="text-[11px] text-slate-400">{d.donorEmail}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-slate-700 font-medium">{d.cause || 'Fundo Geral'}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        d.donationType === 'monthly'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {d.donationType === 'monthly' ? 'Mensal' : 'Única'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ${d.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">USD</span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedDonation(d)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Ver Comprovante Oficial"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Donation Receipt Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold font-serif-heading text-slate-900">
                  Comprovante Diplomático de Doação
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedDonation(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">ID da Transação:</span>
                <span className="font-mono font-bold text-slate-900">{selectedDonation.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Doador:</span>
                <span className="font-bold text-slate-900">{selectedDonation.donorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E-mail:</span>
                <span>{selectedDonation.donorEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Creditado:</span>
                <span className="font-bold text-amber-700 font-mono text-sm">${selectedDonation.amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modalidade:</span>
                <span className="uppercase font-semibold">{selectedDonation.donationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destinação:</span>
                <span className="font-medium text-slate-900">{selectedDonation.cause || 'Fundo Geral'}</span>
              </div>
              {selectedDonation.message && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block mb-1">Dedicatória / Mensagem:</span>
                  <p className="italic text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    "{selectedDonation.message}"
                  </p>
                </div>
              )}
            </div>

            <PrivacyNotice context="donations" theme="light" variant="compact" />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedDonation(null)}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs hover:bg-slate-800 transition-colors"
              >
                Fechar Comprovante
              </button>

              {canRefund && selectedDonation.status !== 'refunded' && (
                <button
                  type="button"
                  onClick={() => handleRefund(selectedDonation.id)}
                  className="w-full bg-red-50 text-red-700 border border-red-200 font-bold py-2.5 rounded-xl text-xs hover:bg-red-100 transition-colors"
                >
                  Emitir Reembolso (Refund)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
