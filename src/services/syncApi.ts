import {
  SyncStatusInfo,
  SyncPreviewResult,
  SyncExecutionResult,
  SyncBackupRecord,
  SyncableModuleId,
  SyncConflictStrategy,
  SyncConnectionTestResult,
} from '../types';

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('admir_auth_token') ||
    localStorage.getItem('admir_current_user_id') ||
    '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['x-user-id'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchSyncStatus(): Promise<SyncStatusInfo> {
  const res = await fetch('/api/sync/status', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao carregar status de sincronização' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function executeSyncPreview(params: {
  selectedModules: SyncableModuleId[];
  isFullBase: boolean;
  snapshotData?: any;
}): Promise<SyncPreviewResult> {
  const res = await fetch('/api/sync/preview', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao processar análise preliminar' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function executeSyncRun(params: {
  selectedModules: SyncableModuleId[];
  strategy: SyncConflictStrategy;
  snapshotData?: any;
}): Promise<SyncExecutionResult> {
  const res = await fetch('/api/sync/execute', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro durante execução da sincronização' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSyncBackups(): Promise<SyncBackupRecord[]> {
  const res = await fetch('/api/sync/backups', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao listar backups' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function restoreSyncBackup(backupId: string): Promise<SyncExecutionResult> {
  const res = await fetch(`/api/sync/restore/${encodeURIComponent(backupId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao restaurar backup' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSyncHistory(): Promise<SyncExecutionResult[]> {
  const res = await fetch('/api/sync/history', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao listar histórico' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function exportCurrentDataSnapshot(): Promise<any> {
  const res = await fetch('/api/sync/export-source', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Erro ao exportar snapshot de dados.');
  }
  return res.json();
}

export async function testSyncConnection(): Promise<SyncConnectionTestResult> {
  const res = await fetch('/api/sync/test-connection', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao testar conexão com Produção' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

