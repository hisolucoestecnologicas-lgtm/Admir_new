import React, { useState, useRef, useEffect } from 'react';
import { User, Users, Search, X, Check, ChevronDown } from 'lucide-react';

export interface EligibleUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  avatar?: string;
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'owner':
      return 'Owner / Diretor';
    case 'manager':
      return 'Gestor / Coord.';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Visualizador';
    default:
      return role;
  }
}

function getUserInitials(name: string): string {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ==========================================
// RESPONSÁVEL PRINCIPAL (AUTOCOMPLETE 1 USER)
// ==========================================
interface TaskResponsibleSelectProps {
  eligibleUsers: EligibleUser[];
  selectedId?: string;
  selectedName: string;
  onChange: (user: EligibleUser | null, manualName?: string) => void;
  disabled?: boolean;
}

export function TaskResponsibleSelect({
  eligibleUsers,
  selectedId,
  selectedName,
  onChange,
  disabled = false,
}: TaskResponsibleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isTypingManual, setIsTypingManual] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected user object if ID matches
  const currentUser = eligibleUsers.find((u) => u.id === selectedId) || null;

  const filteredUsers = eligibleUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q))
    );
  });

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
          {getUserInitials(selectedName || currentUser?.name || 'AD')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-800 truncate">
            {selectedName || currentUser?.name || 'Não atribuído'}
          </div>
          {currentUser?.email && (
            <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
          )}
        </div>
      </div>
    );
  }

  // Selected state display with clear/change option
  if ((selectedId || selectedName) && !isOpen && !isTypingManual) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/60 border border-amber-200/80 rounded-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            {getUserInitials(currentUser?.name || selectedName)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
              <span>{currentUser?.name || selectedName}</span>
              {currentUser && (
                <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                  {getRoleLabel(currentUser.role)}
                </span>
              )}
            </div>
            {currentUser?.email && (
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onChange(null, '');
            setSearch('');
            setIsOpen(false);
          }}
          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors"
          title="Remover responsável"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar responsável..."
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onChange(null, '');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Usuários Elegíveis ADMIR ({filteredUsers.length})
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 font-medium">Nenhum usuário elegível encontrado.</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange(u);
                    setSearch('');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-amber-50/70 transition-colors ${
                    isSelected ? 'bg-amber-50 text-amber-900' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      {getUserInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{u.name}</span>
                        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PARTICIPANTES DA DEMANDA (MULTI-SELECT)
// ==========================================
interface TaskParticipantsSelectProps {
  eligibleUsers: EligibleUser[];
  selectedParticipants: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
    title?: string;
    avatar?: string;
  }>;
  onChange: (
    participants: Array<{
      id: string;
      name: string;
      email?: string;
      role?: string;
      title?: string;
      avatar?: string;
    }>
  ) => void;
  disabled?: boolean;
}

export function TaskParticipantsSelect({
  eligibleUsers,
  selectedParticipants,
  onChange,
  disabled = false,
}: TaskParticipantsSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedParticipants.map((p) => p.id));

  // Users available to be added
  const availableUsers = eligibleUsers.filter((u) => !selectedIds.has(u.id));

  const filteredUsers = availableUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q))
    );
  });

  const handleAdd = (user: EligibleUser) => {
    const updated = [
      ...selectedParticipants,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
      },
    ];
    onChange(updated);
    setSearch('');
  };

  const handleRemove = (userId: string) => {
    const updated = selectedParticipants.filter((p) => p.id !== userId);
    onChange(updated);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Selected Chips */}
      {selectedParticipants.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedParticipants.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium shadow-2xs"
            >
              <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] font-bold">
                {getUserInitials(p.name)}
              </div>
              <span className="truncate max-w-[130px] font-semibold">{p.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                  title={`Remover ${p.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : disabled ? (
        <div className="text-xs text-slate-400 italic">Nenhum participante adicional registrado.</div>
      ) : null}

      {/* Input to search & add */}
      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                selectedParticipants.length > 0
                  ? 'Adicionar outro participante...'
                  : 'Buscar participantes por nome ou e-mail...'
              }
              value={search}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Adicionar Participante ({filteredUsers.length} disponíveis)
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-3.5 text-center text-xs text-slate-500">
                  {availableUsers.length === 0
                    ? 'Todos os usuários elegíveis já foram adicionados como participantes.'
                    : 'Nenhum usuário correspondente encontrado.'}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleAdd(u)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-amber-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {getUserInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                          <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {getRoleLabel(u.role)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      + Adicionar
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
