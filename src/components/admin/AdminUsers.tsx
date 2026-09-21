import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Shield,
  Key,
  X,
  Save,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { User, AdminInvite, GranularPermissions, UserRole, PERMISSION_GROUPS, PermissionKey } from '../../types';
import { getPresetPermissions, ALL_PERMISSIONS_KEYS } from '../../data/permissionPresets';

export function AdminUsers() {
  const { user, isOwner, hasPermission } = useAuth();
  const { success, error } = useToast();

  const canManage = isOwner || hasPermission('admins.invite') || hasPermission('admins.change_permissions');

  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [permissionsState, setPermissionsState] = useState<GranularPermissions>(getPresetPermissions('editor'));
  const [generatedInvite, setGeneratedInvite] = useState<{ token: string; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPermissionsState, setEditPermissionsState] = useState<GranularPermissions>(getPresetPermissions('none'));
  const [editRole, setEditRole] = useState<UserRole>('editor');

  const fetchAdmins = async () => {
    try {
      const data = await api.getAdmins();
      setUsers(data.users);
      setInvites(data.invites);
    } catch (e: any) {
      error('Erro ao carregar administradores', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleApplyPreset = (preset: 'all' | 'none' | 'readonly' | 'editor' | 'manager') => {
    setPermissionsState(getPresetPermissions(preset));
  };

  const handleApplyEditPreset = (preset: 'all' | 'none' | 'readonly' | 'editor' | 'manager') => {
    setEditPermissionsState(getPresetPermissions(preset));
  };

  const togglePermission = (key: PermissionKey) => {
    setPermissionsState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleEditPermission = (key: PermissionKey) => {
    setEditPermissionsState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      error('Informe o e-mail do destinatário.');
      return;
    }

    try {
      const invite = await api.inviteAdmin(inviteEmail.trim(), inviteRole, permissionsState);
      const fullLink = `${window.location.origin}/#accept-invite/${invite.token}`;
      setGeneratedInvite({ token: invite.token, link: fullLink });
      success('Convite Gerado!', 'Link de uso único válido por 48 horas criado com sucesso.');
      fetchAdmins();
    } catch (err: any) {
      error('Erro ao gerar convite', err.message);
    }
  };

  const handleCopyLink = () => {
    if (generatedInvite?.link && navigator.clipboard) {
      navigator.clipboard.writeText(generatedInvite.link);
      setCopiedLink(true);
      success('Link Copiado!', 'Envie este link para o novo administrador.');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const openEditModal = (u: User) => {
    if (u.role === 'owner' && !isOwner) {
      error('Acesso Negado', 'Somente o Dono do Site pode alterar permissões de outro Dono.');
      return;
    }
    setEditingUser(u);
    setEditRole(u.role);
    setEditPermissionsState({ ...u.permissions });
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    try {
      await api.updateUserPermissions(editingUser.id, editRole, editPermissionsState);
      success('Permissões Salvas!', `A matriz RBAC de ${editingUser.name} foi atualizada.`);
      setEditingUser(null);
      fetchAdmins();
    } catch (err: any) {
      error('Erro ao atualizar permissões', err.message);
    }
  };

  const handleRevokeUser = async (u: User) => {
    if (u.role === 'owner') {
      error('Ação Proibida', 'O Dono do Site possui soberania absoluta e não pode ser revogado.');
      return;
    }
    if (!window.confirm(`Revogar imediatamente o acesso de ${u.name} (${u.email})?`)) return;

    try {
      await api.removeUserAccess(u.id);
      success('Acesso Revogado', `O usuário ${u.name} foi removido do sistema.`);
      fetchAdmins();
    } catch (err: any) {
      error('Erro ao revogar usuário', err.message);
    }
  };

  const countActivePermissions = (perms: GranularPermissions) => {
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900">
            Controle de Administradores & RBAC
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de credenciais, convites de uso único (48h) e matriz granular de privilégios.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setShowInviteModal(true);
              setGeneratedInvite(null);
              setInviteEmail('');
              setInviteRole('editor');
              setPermissionsState(getPresetPermissions('editor'));
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Convidar Administrador</span>
          </button>
        )}
      </div>

      {/* Official ADMIR Accounts Notice */}
      <div className="bg-linear-to-r from-amber-50 to-slate-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-950 font-serif-heading text-sm">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Contas Administrativas Oficiais ADMIR — Preservação Permanente (Regra 10.1)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1 border-t border-amber-200/60">
          <div>
            <span className="font-bold text-slate-900 block mb-1">👑 DONOS DO SITE (OWNERS):</span>
            <ul className="space-y-0.5 text-slate-600 font-mono text-[10px]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>navarro.empreendimentos@gmail.com</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>hfonsecafigueiredo@gmail.com</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>hisolucoestecnologicas@gmail.com</span>
              </li>
            </ul>
          </div>
          <div>
            <span className="font-bold text-slate-900 block mb-1">🛡️ ADMINISTRADORES OFICIAIS:</span>
            <ul className="space-y-0.5 text-slate-600 font-mono text-[10px]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span>inadmflavio@gmail.com</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span>drisaas07@gmail.com</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span>andreval74@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-amber-200/40">
          * Vínculo de identidade gerenciado via Firebase Auth. Contas com status [PENDENTE DE VINCULAÇÃO DE IDENTIDADE] serão vinculadas com segurança em seu primeiro acesso autenticado.
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Administrador</th>
                <th className="py-3.5 px-4">Nível / Perfil</th>
                <th className="py-3.5 px-4 text-center">Permissões Ativas</th>
                <th className="py-3.5 px-4">Último Acesso</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl border border-slate-200 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-serif-heading flex items-center gap-1.5 flex-wrap">
                          <span>{u.name}</span>
                          {u.isProtected && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                              Oficial
                            </span>
                          )}
                          {u.identityStatus === 'pending_link' && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-sans font-bold tracking-wide">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              Pendente Vinculação
                            </span>
                          )}
                          {u.authProvider === 'google' && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-sans font-semibold">
                              Google (Firebase)
                            </span>
                          )}
                          {u.id === user?.id && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans font-medium">
                              (Você)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{u.email}</span>
                          {u.title && <span className="text-slate-500">• {u.title}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    {u.role === 'owner' ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-600/40 px-3 py-1 rounded-full text-xs font-black shadow-xs tracking-wider">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        DONO DO SITE
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-800 uppercase px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {u.role}
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {u.role === 'owner' ? (
                      <span className="text-amber-700 font-bold text-xs">Poder Absoluto (Total)</span>
                    ) : (
                      <span className="font-mono font-bold text-slate-800">
                        {countActivePermissions(u.permissions)} privilégios
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-[11px] text-slate-400">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Pendente de Login'}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {canManage && u.role !== 'owner' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Editar matriz de permissões"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!u.isProtected ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Revogar acesso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Conta oficial protegida contra exclusão"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-600/50" />
                            </span>
                          )}
                        </>
                      )}
                      {u.role === 'owner' && (
                        <span
                          className="text-[10px] text-amber-700/80 font-medium italic pr-2"
                          title="Dono do site protegido contra revogação"
                        >
                          Soberano
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Admin Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  Gerar Convite de Acesso Único
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gere um token seguro com validade de 48 horas para admissão de novo colaborador.
                </p>
              </div>
              <button type="button" onClick={() => setShowInviteModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedInvite ? (
              <div className="space-y-4 bg-amber-50/50 p-6 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Link de Convite Criado com Sucesso!</span>
                </div>
                <p className="text-xs text-slate-600">
                  Este link possui validade de <strong>48 horas</strong> e pode ser utilizado uma única vez:
                </p>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.link}
                    className="w-full text-xs font-mono text-slate-800 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Convidado *</label>
                  <input
                    type="email"
                    required
                    placeholder="diplomata@admiramerican.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Papel / Função</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="manager">Manager / Diretor Operacional</option>
                    <option value="editor">Editor de Conteúdo</option>
                    <option value="viewer">Viewer (Somente Leitura)</option>
                  </select>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Carregar Pré-definição (Preset):</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('manager')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      Preset: Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('editor')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      Preset: Editor de Conteúdo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('readonly')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      Preset: Somente Leitura
                    </button>
                  </div>
                </div>

                {/* Granular RBAC Checkboxes */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Matriz Granular de Permissões ({countActivePermissions(permissionsState)} selecionadas):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.group} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {group.group}
                        </div>
                        {group.permissions.map((p) => {
                          const checked = !!permissionsState[p.key];
                          return (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.key)}
                                className="w-3.5 h-3.5 text-amber-600 rounded"
                              />
                              <span className="line-clamp-1">{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Gerar Link de Convite</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit User Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-slate-900">
                  Editar Permissões: {editingUser.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajuste fino dos privilégios na matriz RBAC para {editingUser.email}.
                </p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Papel</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="manager">Manager / Diretor Operacional</option>
                  <option value="editor">Editor de Conteúdo</option>
                  <option value="viewer">Viewer (Somente Leitura)</option>
                  <option value="custom">Personalizado (Custom)</option>
                </select>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyEditPreset('manager')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyEditPreset('editor')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Editor
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyEditPreset('readonly')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Readonly
                </button>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Permissões Habilitadas ({countActivePermissions(editPermissionsState)} ativas):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.group} className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {group.group}
                    </div>
                    {group.permissions.map((p) => {
                      const checked = !!editPermissionsState[p.key];
                      return (
                        <label
                          key={p.key}
                          className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEditPermission(p.key)}
                            className="w-3.5 h-3.5 text-amber-600 rounded"
                          />
                          <span className="line-clamp-1">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUserPermissions}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Permissões</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
