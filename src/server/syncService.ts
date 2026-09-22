import fs from 'fs';
import path from 'path';
import {
  SyncableModuleId,
  SyncModuleInfo,
  SyncPreviewResult,
  SyncConflictItem,
  SyncMissingDependency,
  SyncModuleStat,
  SyncBackupRecord,
  SyncExecutionResult,
  SyncStatusInfo,
  SyncConflictStrategy,
  SyncConnectionState,
  SyncConnectionTestResult,
  User,
} from '../types';
import { db, RequestMetadata } from './db';

const BACKUPS_DIR = path.resolve(process.cwd(), 'data', 'backups');
const SYNC_HISTORY_FILE = path.resolve(process.cwd(), 'data', 'sync_history.json');
const SYNC_BACKUPS_FILE = path.resolve(process.cwd(), 'data', 'sync_backups.json');

export class SyncService {
  private isSyncing = false;
  private lastConnectionTestResult?: SyncConnectionTestResult;

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      if (!fs.existsSync(SYNC_HISTORY_FILE)) {
        fs.writeFileSync(SYNC_HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
      if (!fs.existsSync(SYNC_BACKUPS_FILE)) {
        fs.writeFileSync(SYNC_BACKUPS_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('[SyncService] Failed to initialize directories:', e);
    }
  }

  /**
   * Returns metadata for all syncable modules based on the actual database schema
   */
  public getAvailableModules(): SyncModuleInfo[] {
    const currentTarget = this.getTargetData();

    return [
      {
        id: 'settings',
        name: 'Textos da Home & Configurações',
        description: 'Textos institucionais, métricas de impacto e imagens de destaque da Home.',
        category: 'content',
        sourceCount: 1,
        targetCount: 1,
        dependencies: [],
      },
      {
        id: 'programs',
        name: 'Programas Humanitários',
        description: 'Catálogo de missões, projetos globais e iniciativas comunitárias da ADMIR.',
        category: 'content',
        sourceCount: 0,
        targetCount: currentTarget.programs?.length || 0,
        dependencies: ['media'],
      },
      {
        id: 'stories',
        name: 'Notícias & Histórias',
        description: 'Artigos institucionais, comunicados diplomáticos e reportagens de campo.',
        category: 'content',
        sourceCount: 0,
        targetCount: currentTarget.stories?.length || 0,
        dependencies: ['media'],
      },
      {
        id: 'ambassadors',
        name: 'Corpo de Embaixadores',
        description: 'Perfis públicos, credenciais diplomáticas e biografias oficiais.',
        category: 'content',
        sourceCount: 0,
        targetCount: currentTarget.ambassadors?.length || 0,
        dependencies: ['media'],
        hasPrivateDocs: true, // Documentos privados são estritamente isolados e não copiados
      },
      {
        id: 'media',
        name: 'Biblioteca de Mídia',
        description: 'Acervo de fotografias institucionais, metadados e ativos públicos.',
        category: 'content',
        sourceCount: 0,
        targetCount: currentTarget.media?.length || 0,
        dependencies: [],
      },
      {
        id: 'donations',
        name: 'Doações & Financeiro',
        description: 'Registros de contribuições humanitárias recebidas (sanitizadas sem dados de cartão).',
        category: 'operations',
        sourceCount: 0,
        targetCount: currentTarget.donations?.length || 0,
        dependencies: [],
        isSensitive: true,
      },
      {
        id: 'tasks',
        name: 'Tarefas / Kanban',
        description: 'Quadro operacional de tarefas, prioridades, comentários e checklists.',
        category: 'operations',
        sourceCount: 0,
        targetCount: currentTarget.tasks?.length || 0,
        dependencies: ['taskWorkflows', 'users'],
      },
      {
        id: 'taskWorkflows',
        name: 'Fluxos & Workspaces',
        description: 'Estruturas de etapas, workflows e colunas do Kanban.',
        category: 'operations',
        sourceCount: 0,
        targetCount: (currentTarget.taskWorkspaces?.length || 0) + (currentTarget.taskWorkflows?.length || 0),
        dependencies: [],
      },
      {
        id: 'assistant',
        name: 'Assistente Virtual / IA',
        description: 'Configurações de atendimento e banco de perguntas frequentes (FAQs).',
        category: 'system',
        sourceCount: 0,
        targetCount: (currentTarget.assistantFaqs?.length || 0) + 1,
        dependencies: [],
      },
      {
        id: 'maintenance',
        name: 'Central de Manutenção',
        description: 'Configurações globais e por página do modo de manutenção técnica.',
        category: 'system',
        sourceCount: 1,
        targetCount: 1,
        dependencies: [],
      },
      {
        id: 'users',
        name: 'Perfis de Administradores',
        description: 'Contas administrativas (com proteção rigorosa das contas oficiais da ADMIR).',
        category: 'system',
        sourceCount: 0,
        targetCount: currentTarget.users?.length || 0,
        dependencies: [],
        isSensitive: true,
      },
      {
        id: 'auditLogs',
        name: 'Histórico & Auditoria',
        description: 'Trilha imutável de registros de ações e alterações no sistema.',
        category: 'system',
        sourceCount: 0,
        targetCount: currentTarget.auditLogs?.length || 0,
        dependencies: [],
      },
      {
        id: 'newsletterSubscribers',
        name: 'Inscritos na Newsletter',
        description: 'Cadastros de e-mails para comunicados periódicos.',
        category: 'operations',
        sourceCount: 0,
        targetCount: currentTarget.newsletterSubscribers?.length || 0,
        dependencies: [],
      },
      {
        id: 'contactMessages',
        name: 'Mensagens de Contato',
        description: 'Mensagens diplomáticas e gerais recebidas pelos formulários do site.',
        category: 'operations',
        sourceCount: 0,
        targetCount: currentTarget.contactMessages?.length || 0,
        dependencies: [],
      },
    ];
  }

  /**
   * Retrieves current destination (Development / Homologation) data from db.ts
   */
  public getTargetData(): any {
    const rawData = (db as any).data;
    return JSON.parse(JSON.stringify(rawData));
  }

  /**
   * Checks connection and configuration status of the Production source
   */
  public getStatus(): SyncStatusInfo {
    const prodUrl = process.env.PROD_API_URL || process.env.ADMIR_PROD_URL;
    const isConfigured = Boolean(prodUrl);
    const backups = this.getBackups();
    const history = this.getHistory();
    const lastSync = history.length > 0 ? history[0] : undefined;

    let connectionState: SyncConnectionState = 'PENDING_CONFIG';
    if (!isConfigured) {
      connectionState = 'PENDING_CONFIG';
    } else if (this.lastConnectionTestResult) {
      connectionState = this.lastConnectionTestResult.status;
    } else {
      connectionState = 'CONFIGURED_NOT_VALIDATED';
    }

    return {
      isConfigured,
      connectionState,
      lastConnectionTest: this.lastConnectionTestResult,
      sourceMode: isConfigured ? 'direct_api' : 'pending_config',
      sourceUrl: prodUrl ? prodUrl.replace(/\/\/[^@]+@/, '//***@') : undefined,
      targetEnvironment: 'Desenvolvimento / Homologação (Local)',
      availableBackupsCount: backups.length,
      lastSync,
      inProgress: this.isSyncing,
      modules: this.getAvailableModules(),
    };
  }

  /**
   * Tests the connection to the Production source (READ-ONLY).
   * Verifies connectivity, endpoint readiness, and token authorization server-to-server.
   * Never alters production, never returns raw secrets, reports latency and state.
   */
  public async testConnection(): Promise<SyncConnectionTestResult> {
    const prodUrl = process.env.PROD_API_URL || process.env.ADMIR_PROD_URL;
    const prodToken = process.env.PROD_SYNC_TOKEN || process.env.ADMIR_PROD_SYNC_TOKEN;
    const testedAt = new Date().toISOString();

    if (!prodUrl) {
      const result: SyncConnectionTestResult = {
        success: false,
        status: 'PENDING_CONFIG',
        message: 'Configuração de Produção pendente: a variável PROD_API_URL não está configurada no ambiente. Configure no painel de Secrets ou utilize a opção "Upload de Snapshot JSON".',
        testedAt,
      };
      this.lastConnectionTestResult = result;
      return result;
    }

    const cleanUrl = prodUrl.replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ADMIR-Sync-Client/1.0',
      };
      if (prodToken) {
        headers['Authorization'] = `Bearer ${prodToken}`;
        headers['x-sync-token'] = prodToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${cleanUrl}/api/sync/export-source`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        // Validate that response contains valid JSON
        await response.json();
        const result: SyncConnectionTestResult = {
          success: true,
          status: 'VALIDATED',
          statusCode: response.status,
          latencyMs,
          message: `Conexão validada com sucesso! Resposta em ${latencyMs}ms. Origem de Produção pronta para leitura.`,
          sourceUrl: cleanUrl.replace(/\/\/[^@]+@/, '//***@'),
          testedAt,
        };
        this.lastConnectionTestResult = result;
        return result;
      }

      if (response.status === 401 || response.status === 403) {
        const result: SyncConnectionTestResult = {
          success: false,
          status: 'CONNECTION_ERROR',
          statusCode: response.status,
          latencyMs,
          message: `Falha de autenticação (HTTP ${response.status}): Token de sincronização (PROD_SYNC_TOKEN) ausente ou inválido no servidor de Produção.`,
          sourceUrl: cleanUrl.replace(/\/\/[^@]+@/, '//***@'),
          testedAt,
        };
        this.lastConnectionTestResult = result;
        return result;
      }

      const result: SyncConnectionTestResult = {
        success: false,
        status: 'CONNECTION_ERROR',
        statusCode: response.status,
        latencyMs,
        message: `Servidor de Produção retornou status inesperado (HTTP ${response.status}): ${response.statusText}`,
        sourceUrl: cleanUrl.replace(/\/\/[^@]+@/, '//***@'),
        testedAt,
      };
      this.lastConnectionTestResult = result;
      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const result: SyncConnectionTestResult = {
        success: false,
        status: 'CONNECTION_ERROR',
        latencyMs,
        message: isTimeout
          ? `Tempo limite excedido (timeout de 8s) ao tentar conectar ao servidor em ${cleanUrl}.`
          : `Não foi possível conectar ao servidor de Produção: ${err.message}`,
        sourceUrl: cleanUrl.replace(/\/\/[^@]+@/, '//***@'),
        testedAt,
      };
      this.lastConnectionTestResult = result;
      return result;
    }
  }

  /**
   * Fetches data from production source (either via direct API or from a provided snapshot)
   * READ-ONLY: Never writes or alters production.
   */
  public async fetchSourceData(providedSnapshot?: any): Promise<{ data: any; sourceMode: string; sourceUrl?: string }> {
    if (providedSnapshot && typeof providedSnapshot === 'object') {
      return {
        data: this.sanitizeIncomingData(providedSnapshot),
        sourceMode: 'snapshot_payload',
        sourceUrl: 'Snapshot Oficial de Produção (Upload)',
      };
    }

    const prodUrl = process.env.PROD_API_URL || process.env.ADMIR_PROD_URL;
    const prodToken = process.env.PROD_SYNC_TOKEN || process.env.ADMIR_PROD_SYNC_TOKEN;

    if (!prodUrl) {
      throw new Error(
        'Configuração de Produção pendente. Para sincronizar diretamente via API, configure a variável de ambiente PROD_API_URL no painel de Secrets ou utilize a opção "Importar Snapshot JSON de Produção".'
      );
    }

    try {
      const cleanUrl = prodUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ADMIR-Sync-Client/1.0',
      };
      if (prodToken) {
        headers['Authorization'] = `Bearer ${prodToken}`;
        headers['x-sync-token'] = prodToken;
      }

      console.log(`[SyncService] Fetching source data (READ-ONLY) from ${cleanUrl}/api/sync/export-source...`);
      const response = await fetch(`${cleanUrl}/api/sync/export-source`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Falha na consulta à Produção (HTTP ${response.status}): ${response.statusText}`);
      }

      const payload = await response.json();
      return {
        data: this.sanitizeIncomingData(payload),
        sourceMode: 'direct_api',
        sourceUrl: cleanUrl,
      };
    } catch (e: any) {
      throw new Error(`Não foi possível conectar ao ambiente de Produção: ${e.message}`);
    }
  }

  /**
   * Exports sanitized data for when this instance acts as source (READ-ONLY)
   */
  public exportSourceData(): any {
    const raw = this.getTargetData();
    return this.sanitizeIncomingData(raw);
  }

  /**
   * Sanitizes data to ensure security invariants:
   * - Strips plain passwords, password hashes, salts, and active authentication/invite tokens.
   * - Strips private documents and sensitive personal identity fields from ambassador entities.
   * - Strips payment tokens, CVVs, card numbers, and raw gateway credentials from donations.
   * - Strips any environment secrets accidentally stored in settings.
   */
  private sanitizeIncomingData(raw: any): any {
    const cloned = JSON.parse(JSON.stringify(raw));

    // Sanitize Users: strip passwords, passwordHash, salt, session/invite tokens
    if (Array.isArray(cloned.users)) {
      cloned.users = cloned.users.map((u: any) => {
        const {
          passwordHash,
          password,
          salt,
          token,
          inviteToken,
          sessionToken,
          resetToken,
          ...safeUser
        } = u;
        return {
          ...safeUser,
          // Preserve identity status
          identityStatus: safeUser.identityStatus || 'pending_link',
        };
      });
    }

    // Sanitize Donations: strip tokens, card details, raw gateway payloads
    if (Array.isArray(cloned.donations)) {
      cloned.donations = cloned.donations.map((d: any) => {
        const {
          paymentToken,
          rawGatewayResponse,
          cardNumber,
          cvv,
          clientSecret,
          stripeChargeId,
          ...safeDonation
        } = d;
        return safeDonation;
      });
    }

    // Sanitize Ambassadors: strip private documents and private identity identifiers
    if (Array.isArray(cloned.ambassadors)) {
      cloned.ambassadors = cloned.ambassadors.map((a: any) => {
        const {
          privateDocuments,
          documents,
          cpf,
          rg,
          passport,
          bloodType,
          onboardingToken,
          ...safeAmbassador
        } = a;
        return safeAmbassador;
      });
    }

    // Sanitize settings: strip any potential API secrets or tokens
    if (cloned.settings && typeof cloned.settings === 'object') {
      const {
        stripeSecretKey,
        stripeWebhookSecret,
        paypalSecret,
        r2SecretAccessKey,
        r2PrivateSecretAccessKey,
        prodSyncToken,
        geminiApiKey,
        ...safeSettings
      } = cloned.settings;
      cloned.settings = safeSettings;
    }

    return cloned;
  }

  /**
   * Runs Dry Run / Preview Analysis comparing Source (Prod) vs Target (Dev)
   */
  public async analyzePreview(
    selectedModules: SyncableModuleId[],
    isFullBase: boolean,
    providedSnapshot?: any
  ): Promise<SyncPreviewResult> {
    const { data: sourceData, sourceUrl } = await this.fetchSourceData(providedSnapshot);
    const targetData = this.getTargetData();

    const modulesToAnalyze: SyncableModuleId[] = isFullBase
      ? (this.getAvailableModules().map((m) => m.id) as SyncableModuleId[])
      : selectedModules;

    const modulesStats: SyncModuleStat[] = [];
    const conflicts: SyncConflictItem[] = [];
    const missingDependencies: SyncMissingDependency[] = [];
    const warnings: string[] = [];

    let totalNew = 0;
    let totalUpdates = 0;
    let totalConflicts = 0;
    let totalPreserved = 0;

    for (const modId of modulesToAnalyze) {
      const sourceItems = this.getModuleRecords(sourceData, modId);
      const targetItems = this.getModuleRecords(targetData, modId);
      const moduleName = this.getModuleName(modId);

      const sourceMap = new Map<string, any>(sourceItems.map((item: any) => [this.getRecordId(item, modId), item]));
      const targetMap = new Map<string, any>(targetItems.map((item: any) => [this.getRecordId(item, modId), item]));

      let newCount = 0;
      let updateCount = 0;
      let conflictCount = 0;
      let preservedCount = 0;

      // Check items from source
      for (const [id, sourceItem] of sourceMap.entries()) {
        const targetItem = targetMap.get(id);

        if (!targetItem) {
          newCount++;
        } else {
          // Both exist: check for diff/conflict
          const isDifferent = this.isRecordDifferent(sourceItem, targetItem, modId);
          if (isDifferent) {
            updateCount++;
            conflictCount++;

            conflicts.push({
              moduleId: modId,
              moduleName,
              recordId: id,
              recordTitle: this.getRecordTitle(sourceItem, modId),
              sourceDiffSummary: this.getDiffSummary(sourceItem, modId),
              targetDiffSummary: this.getDiffSummary(targetItem, modId),
              sourceUpdatedAt: sourceItem.updatedAt || sourceItem.createdAt,
              targetUpdatedAt: targetItem.updatedAt || targetItem.createdAt,
            });
          } else {
            preservedCount++;
          }
        }
      }

      // Check items exclusive to target (which will be PRESERVED)
      for (const [id] of targetMap.entries()) {
        if (!sourceMap.has(id)) {
          preservedCount++;
        }
      }

      totalNew += newCount;
      totalUpdates += updateCount;
      totalConflicts += conflictCount;
      totalPreserved += preservedCount;

      modulesStats.push({
        moduleId: modId,
        moduleName,
        sourceCount: sourceItems.length,
        targetCount: targetItems.length,
        newCount,
        updateCount,
        conflictCount,
        preservedCount,
        deletedCount: 0, // Always 0: No automatic deletions
      });
    }

    // Check cross-module dependencies
    this.checkDependencies(modulesToAnalyze, sourceData, targetData, missingDependencies, warnings);

    return {
      analyzedAt: new Date().toISOString(),
      sourceEnvironment: `PRODUÇÃO (${sourceUrl || 'Oficial'})`,
      targetEnvironment: 'DESENVOLVIMENTO / HOMOLOGAÇÃO',
      selectedModules: modulesToAnalyze,
      isFullBase,
      modulesStats,
      totalNew,
      totalUpdates,
      totalConflicts,
      totalPreserved,
      totalDeletions: 0,
      conflicts,
      missingDependencies,
      warnings,
      canProceed: true,
    };
  }

  /**
   * Helper to retrieve records array/object for a module
   */
  private getModuleRecords(dbObj: any, modId: SyncableModuleId): any[] {
    if (!dbObj) return [];

    switch (modId) {
      case 'settings':
        return dbObj.settings ? [dbObj.settings] : [];
      case 'programs':
        return Array.isArray(dbObj.programs) ? dbObj.programs : [];
      case 'stories':
        return Array.isArray(dbObj.stories) ? dbObj.stories : [];
      case 'ambassadors':
        return Array.isArray(dbObj.ambassadors) ? dbObj.ambassadors : [];
      case 'media':
        return Array.isArray(dbObj.media) ? dbObj.media : [];
      case 'donations':
        return Array.isArray(dbObj.donations) ? dbObj.donations : [];
      case 'tasks':
        return Array.isArray(dbObj.tasks) ? dbObj.tasks : [];
      case 'taskWorkflows': {
        const list: any[] = [];
        if (Array.isArray(dbObj.taskWorkspaces)) list.push(...dbObj.taskWorkspaces.map((w: any) => ({ ...w, _type: 'workspace' })));
        if (Array.isArray(dbObj.taskWorkflows)) list.push(...dbObj.taskWorkflows.map((w: any) => ({ ...w, _type: 'workflow' })));
        if (Array.isArray(dbObj.taskWorkflowStages)) list.push(...dbObj.taskWorkflowStages.map((s: any) => ({ ...s, _type: 'stage' })));
        return list;
      }
      case 'assistant':
        return Array.isArray(dbObj.assistantFaqs)
          ? [{ ...(dbObj.assistantSettings || {}), id: 'assistant-settings', _type: 'settings' }, ...dbObj.assistantFaqs]
          : [];
      case 'maintenance':
        return dbObj.maintenanceSettings ? [dbObj.maintenanceSettings] : [];
      case 'users':
        return Array.isArray(dbObj.users) ? dbObj.users : [];
      case 'auditLogs':
        return Array.isArray(dbObj.auditLogs) ? dbObj.auditLogs : [];
      case 'newsletterSubscribers':
        return Array.isArray(dbObj.newsletterSubscribers) ? dbObj.newsletterSubscribers : [];
      case 'contactMessages':
        return Array.isArray(dbObj.contactMessages) ? dbObj.contactMessages : [];
      default:
        return [];
    }
  }

  private getRecordId(item: any, modId: SyncableModuleId): string {
    if (!item) return 'null';
    if (modId === 'settings') return 'site-settings';
    if (modId === 'maintenance') return 'maintenance-settings';
    if (item.id) return String(item.id);
    if (item.ambassadorId) return String(item.ambassadorId);
    if (item.slug) return String(item.slug);
    if (item.email) return String(item.email);
    return JSON.stringify(item);
  }

  private getRecordTitle(item: any, modId: SyncableModuleId): string {
    if (!item) return 'Registro';
    if (modId === 'settings') return 'Textos & Configurações da Home';
    if (modId === 'maintenance') return 'Configurações da Central de Manutenção';
    return item.title || item.name || item.subject || item.questionPt || item.ticketNumber || item.id || 'Registro';
  }

  private getDiffSummary(item: any, modId: SyncableModuleId): string {
    if (!item) return '';
    if (modId === 'programs') return `Status: ${item.isVisible ? 'Publicado' : 'Oculto'} | Ordem: ${item.orderIndex || 0}`;
    if (modId === 'stories') return `Status: ${item.status || 'draft'} | Categoria: ${item.category || 'Geral'}`;
    if (modId === 'ambassadors') return `Cargo: ${item.role || item.title || 'Embaixador'} | País: ${item.country || 'Global'}`;
    if (modId === 'tasks') return `Ticket: ${item.ticketNumber || item.id} | Etapa: ${item.stageId || 'Backlog'}`;
    if (modId === 'donations') return `Valor: $${item.amount} | Doador: ${item.donorName || 'Anônimo'}`;
    if (modId === 'users') return `Perfil: ${item.role} | Email: ${item.email}`;
    return `Atualizado em ${item.updatedAt || item.createdAt || 'N/D'}`;
  }

  private isRecordDifferent(sourceItem: any, targetItem: any, modId: SyncableModuleId): boolean {
    if (modId === 'users') {
      return sourceItem.role !== targetItem.role || sourceItem.status !== targetItem.status;
    }
    // Deep clone and strip transient timing fields for fair comparison
    const cleanSource = { ...sourceItem };
    const cleanTarget = { ...targetItem };
    delete cleanSource.updatedAt;
    delete cleanTarget.updatedAt;
    return JSON.stringify(cleanSource) !== JSON.stringify(cleanTarget);
  }

  private getModuleName(modId: SyncableModuleId): string {
    const info = this.getAvailableModules().find((m) => m.id === modId);
    return info ? info.name : modId;
  }

  private checkDependencies(
    selectedModules: SyncableModuleId[],
    sourceData: any,
    targetData: any,
    missingDeps: SyncMissingDependency[],
    warnings: string[]
  ) {
    const selectedSet = new Set(selectedModules);

    // 1. Stories -> Media
    if (selectedSet.has('stories') && !selectedSet.has('media')) {
      const stories = this.getModuleRecords(sourceData, 'stories');
      const targetMediaIds = new Set(this.getModuleRecords(targetData, 'media').map((m) => m.id));

      for (const story of stories) {
        if (story.coverImage && story.coverImage.startsWith('media-') && !targetMediaIds.has(story.coverImage)) {
          missingDeps.push({
            fromModule: 'stories',
            toModule: 'media',
            missingId: story.coverImage,
            referenceName: `Notícia "${story.title}"`,
            message: `A notícia "${story.title}" utiliza a imagem de capa (${story.coverImage}) que não existe no destino.`,
          });
        }
      }
    }

    // 2. Ambassadors -> Media
    if (selectedSet.has('ambassadors') && !selectedSet.has('media')) {
      const ambassadors = this.getModuleRecords(sourceData, 'ambassadors');
      const targetMediaIds = new Set(this.getModuleRecords(targetData, 'media').map((m) => m.id));

      for (const amb of ambassadors) {
        if (amb.publicPhoto && amb.publicPhoto.startsWith('media-') && !targetMediaIds.has(amb.publicPhoto)) {
          missingDeps.push({
            fromModule: 'ambassadors',
            toModule: 'media',
            missingId: amb.publicPhoto,
            referenceName: `Embaixador "${amb.name}"`,
            message: `O embaixador "${amb.name}" referencia a foto (${amb.publicPhoto}) ausente na Biblioteca de Mídia de destino.`,
          });
        }
      }
    }

    // 3. Tasks -> TaskWorkflows & Users
    if (selectedSet.has('tasks')) {
      if (!selectedSet.has('taskWorkflows')) {
        warnings.push(
          'Recomendado: Incluir o módulo "Fluxos & Workspaces" para assegurar que todas as etapas e colunas do Kanban sejam correspondidas perfeitamente.'
        );
      }
      if (!selectedSet.has('users')) {
        warnings.push(
          'Aviso: Tarefas com responsáveis atribuídos em Produção manterão as associações, mas os usuários devem existir no destino.'
        );
      }
    }
  }

  /**
   * Creates an automatic backup snapshot of the target database before any sync operation
   */
  public async createTargetBackup(
    modules: SyncableModuleId[],
    user: User,
    description?: string
  ): Promise<SyncBackupRecord> {
    this.ensureDirectories();
    const targetData = this.getTargetData();
    const timestamp = new Date().toISOString();
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fileName = `${backupId}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    const recordCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const modId of modules) {
      const count = this.getModuleRecords(targetData, modId).length;
      recordCounts[modId] = count;
      totalRecords += count;
    }

    const backupPayload = {
      id: backupId,
      createdAt: timestamp,
      createdBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      description: description || `Backup automático pré-sincronização de ${modules.length} módulos.`,
      modules,
      recordCounts,
      totalRecords,
      data: targetData,
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

    const backupRecord: SyncBackupRecord = {
      id: backupId,
      createdAt: timestamp,
      createdBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      description: backupPayload.description,
      modules,
      recordCounts,
      totalRecords,
      filePath: fileName,
    };

    const backups = this.getBackups();
    backups.unshift(backupRecord);
    // Keep last 30 backups in index
    fs.writeFileSync(SYNC_BACKUPS_FILE, JSON.stringify(backups.slice(0, 30), null, 2), 'utf-8');

    console.log(`[SyncService] Backup snapshot created: ${backupId} (${totalRecords} records across ${modules.length} modules)`);
    return backupRecord;
  }

  /**
   * Returns list of saved backups
   */
  public getBackups(): SyncBackupRecord[] {
    try {
      if (fs.existsSync(SYNC_BACKUPS_FILE)) {
        const raw = fs.readFileSync(SYNC_BACKUPS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SyncService] Failed to read backups file:', e);
    }
    return [];
  }

  /**
   * Restores a previously created backup snapshot
   */
  public async restoreBackup(backupId: string, user: User, meta?: RequestMetadata): Promise<SyncExecutionResult> {
    if (this.isSyncing) {
      throw new Error('Uma operação de sincronização já está em andamento. Aguarde a conclusão.');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] Iniciando restauração do snapshot ${backupId}...`);
      const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo de backup não encontrado no servidor: ${backupId}`);
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const backupContent = JSON.parse(raw);

      if (!backupContent.data) {
        throw new Error('Formato inválido do arquivo de backup.');
      }

      // Create a safety backup of CURRENT state before restoring
      await this.createTargetBackup(
        this.getAvailableModules().map((m) => m.id) as SyncableModuleId[],
        user,
        `Snapshot automático de segurança antes de restaurar o backup ${backupId}.`
      );

      // Restore data to target DB
      const restoredDb = backupContent.data;

      // Reconcile official accounts to guarantee security invariants
      (db as any).reconcileOfficialAccounts(restoredDb);
      (db as any).data = restoredDb;
      (db as any).save();

      logs.push(`[${new Date().toISOString()}] Restauração concluída com sucesso.`);

      db.recordAuditLog(
        user,
        'Alteração',
        'Administrators',
        `Restore Snapshot ${backupId}`,
        `Restaurado estado anterior do banco de dados a partir do snapshot ${backupId} criado em ${backupContent.createdAt}`,
        meta
      );

      const result: SyncExecutionResult = {
        id: `restore-${Date.now()}`,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: 'success',
        sourceEnvironment: `Snapshot de Backup (${backupId})`,
        targetEnvironment: 'Desenvolvimento / Homologação',
        modules: backupContent.modules || [],
        strategy: 'source_wins',
        stats: {
          newRecords: 0,
          updatedRecords: backupContent.totalRecords || 0,
          preservedRecords: 0,
          conflictsResolved: 0,
          errorsCount: 0,
        },
        logs,
      };

      this.recordSyncHistory(result);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Executes the synchronized import of selected modules (or full database)
   * from Production into Development / Homologation
   */
  public async executeSync(
    selectedModules: SyncableModuleId[],
    strategy: SyncConflictStrategy = 'source_wins',
    user: User,
    meta?: RequestMetadata,
    providedSnapshot?: any
  ): Promise<SyncExecutionResult> {
    if (this.isSyncing) {
      throw new Error('Uma operação de sincronização já está em andamento. Aguarde a conclusão.');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] Iniciando processo de sincronização...`);

      // Step 1: Fetch source data (READ-ONLY)
      logs.push(`[${new Date().toISOString()}] Consultando dados de Produção (READ-ONLY)...`);
      const { data: sourceData, sourceUrl } = await this.fetchSourceData(providedSnapshot);

      // Step 2: Create automatic Target Backup
      logs.push(`[${new Date().toISOString()}] Criando snapshot de backup do ambiente de destino...`);
      const backupRecord = await this.createTargetBackup(
        selectedModules,
        user,
        `Backup automático antes da sincronização de ${selectedModules.length} módulos de Produção.`
      );
      logs.push(`[${new Date().toISOString()}] Backup ${backupRecord.id} criado com sucesso.`);

      // Step 3: Apply Merge with Idempotence & Protection
      const targetDb = this.getTargetData();
      let totalNew = 0;
      let totalUpdated = 0;
      let totalPreserved = 0;
      let totalConflictsResolved = 0;

      for (const modId of selectedModules) {
        logs.push(`[${new Date().toISOString()}] Sincronizando módulo: ${this.getModuleName(modId)}...`);
        const stats = this.mergeModuleData(modId, sourceData, targetDb, strategy);
        totalNew += stats.newCount;
        totalUpdated += stats.updateCount;
        totalPreserved += stats.preservedCount;
        totalConflictsResolved += stats.conflictCount;
      }

      // Step 4: Reconcile Official Accounts (Security Invariant: Rule 12)
      logs.push(`[${new Date().toISOString()}] Verificando integridade e proteção das contas administrativas oficiais...`);
      (db as any).reconcileOfficialAccounts(targetDb);

      // Step 5: Save Atomically
      logs.push(`[${new Date().toISOString()}] Gravando alterações atomicamente no banco de dados de destino...`);
      (db as any).data = targetDb;
      (db as any).save();

      logs.push(`[${new Date().toISOString()}] Sincronização finalizada com êxito.`);

      db.recordAuditLog(
        user,
        'Criação',
        'Administrators',
        'Sincronização Produção → Dev',
        `Sincronização concluída: ${totalNew} novos registros, ${totalUpdated} atualizados, ${totalPreserved} preservados em ${selectedModules.length} módulos.`,
        meta
      );

      const result: SyncExecutionResult = {
        id: `sync-${Date.now()}`,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: errors.length > 0 ? 'partial' : 'success',
        sourceEnvironment: `PRODUÇÃO (${sourceUrl || 'Oficial'})`,
        targetEnvironment: 'DESENVOLVIMENTO / HOMOLOGAÇÃO',
        modules: selectedModules,
        strategy,
        stats: {
          newRecords: totalNew,
          updatedRecords: totalUpdated,
          preservedRecords: totalPreserved,
          conflictsResolved: totalConflictsResolved,
          errorsCount: errors.length,
        },
        backupCreated: {
          id: backupRecord.id,
          createdAt: backupRecord.createdAt,
          totalRecords: backupRecord.totalRecords,
        },
        logs,
        errors: errors.length > 0 ? errors : undefined,
      };

      this.recordSyncHistory(result);
      return result;
    } catch (e: any) {
      logs.push(`[${new Date().toISOString()}] ERRO: ${e.message}`);
      errors.push(e.message);

      const failedResult: SyncExecutionResult = {
        id: `sync-${Date.now()}`,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: 'failed',
        sourceEnvironment: 'PRODUÇÃO',
        targetEnvironment: 'DESENVOLVIMENTO / HOMOLOGAÇÃO',
        modules: selectedModules,
        strategy,
        stats: {
          newRecords: 0,
          updatedRecords: 0,
          preservedRecords: 0,
          conflictsResolved: 0,
          errorsCount: 1,
        },
        logs,
        errors,
      };

      this.recordSyncHistory(failedResult);
      throw e;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Merges a single module data into targetDb with strict preservation of dev records
   */
  private mergeModuleData(
    modId: SyncableModuleId,
    sourceData: any,
    targetDb: any,
    strategy: SyncConflictStrategy
  ): { newCount: number; updateCount: number; conflictCount: number; preservedCount: number } {
    const sourceItems = this.getModuleRecords(sourceData, modId);
    let newCount = 0;
    let updateCount = 0;
    let conflictCount = 0;
    let preservedCount = 0;

    switch (modId) {
      case 'settings': {
        if (sourceData.settings) {
          if (strategy === 'source_wins') {
            targetDb.settings = { ...targetDb.settings, ...sourceData.settings };
            updateCount++;
          } else {
            preservedCount++;
          }
        }
        break;
      }

      case 'programs': {
        targetDb.programs = targetDb.programs || [];
        const targetMap = new Map(targetDb.programs.map((p: any) => [p.id, p]));

        for (const src of sourceItems) {
          if (!targetMap.has(src.id)) {
            targetDb.programs.push(src);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.programs.findIndex((p: any) => p.id === src.id);
              targetDb.programs[idx] = { ...targetDb.programs[idx], ...src };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'stories': {
        targetDb.stories = targetDb.stories || [];
        const targetMap = new Map(targetDb.stories.map((s: any) => [s.id, s]));

        for (const src of sourceItems) {
          if (!targetMap.has(src.id)) {
            targetDb.stories.push(src);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.stories.findIndex((s: any) => s.id === src.id);
              targetDb.stories[idx] = { ...targetDb.stories[idx], ...src };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'ambassadors': {
        targetDb.ambassadors = targetDb.ambassadors || [];
        const targetMap = new Map(targetDb.ambassadors.map((a: any) => [a.id || a.ambassadorId, a]));

        for (const src of sourceItems) {
          const key = src.id || src.ambassadorId;
          if (!targetMap.has(key)) {
            // Guarantee private documents are stripped
            const { privateDocuments, ...safeAmbassador } = src;
            targetDb.ambassadors.push(safeAmbassador);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.ambassadors.findIndex((a: any) => (a.id || a.ambassadorId) === key);
              const existingPrivateDocs = targetDb.ambassadors[idx].privateDocuments;
              const { privateDocuments, ...safeAmbassador } = src;
              targetDb.ambassadors[idx] = {
                ...targetDb.ambassadors[idx],
                ...safeAmbassador,
                // Preserve local private documents untouched
                privateDocuments: existingPrivateDocs,
              };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'media': {
        targetDb.media = targetDb.media || [];
        const targetMap = new Map(targetDb.media.map((m: any) => [m.id, m]));

        for (const src of sourceItems) {
          if (!targetMap.has(src.id)) {
            targetDb.media.push(src);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.media.findIndex((m: any) => m.id === src.id);
              targetDb.media[idx] = { ...targetDb.media[idx], ...src };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'donations': {
        targetDb.donations = targetDb.donations || [];
        const targetMap = new Map(targetDb.donations.map((d: any) => [d.id, d]));

        for (const src of sourceItems) {
          if (!targetMap.has(src.id)) {
            targetDb.donations.push(src);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.donations.findIndex((d: any) => d.id === src.id);
              targetDb.donations[idx] = { ...targetDb.donations[idx], ...src };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'tasks': {
        targetDb.tasks = targetDb.tasks || [];
        const targetMap = new Map(targetDb.tasks.map((t: any) => [t.id, t]));

        for (const src of sourceItems) {
          if (!targetMap.has(src.id)) {
            targetDb.tasks.push(src);
            newCount++;
          } else {
            if (strategy === 'source_wins') {
              const idx = targetDb.tasks.findIndex((t: any) => t.id === src.id);
              targetDb.tasks[idx] = { ...targetDb.tasks[idx], ...src };
              updateCount++;
              conflictCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'taskWorkflows': {
        targetDb.taskWorkspaces = targetDb.taskWorkspaces || [];
        targetDb.taskWorkflows = targetDb.taskWorkflows || [];
        targetDb.taskWorkflowStages = targetDb.taskWorkflowStages || [];

        if (Array.isArray(sourceData.taskWorkspaces)) {
          const wsMap = new Map(targetDb.taskWorkspaces.map((w: any) => [w.id, w]));
          for (const ws of sourceData.taskWorkspaces) {
            if (!wsMap.has(ws.id)) {
              targetDb.taskWorkspaces.push(ws);
              newCount++;
            }
          }
        }

        if (Array.isArray(sourceData.taskWorkflows)) {
          const wfMap = new Map(targetDb.taskWorkflows.map((w: any) => [w.id, w]));
          for (const wf of sourceData.taskWorkflows) {
            if (!wfMap.has(wf.id)) {
              targetDb.taskWorkflows.push(wf);
              newCount++;
            }
          }
        }

        if (Array.isArray(sourceData.taskWorkflowStages)) {
          const stMap = new Map(targetDb.taskWorkflowStages.map((s: any) => [s.id, s]));
          for (const st of sourceData.taskWorkflowStages) {
            if (!stMap.has(st.id)) {
              targetDb.taskWorkflowStages.push(st);
              newCount++;
            }
          }
        }
        break;
      }

      case 'assistant': {
        if (sourceData.assistantSettings) {
          targetDb.assistantSettings = { ...targetDb.assistantSettings, ...sourceData.assistantSettings };
          updateCount++;
        }
        if (Array.isArray(sourceData.assistantFaqs)) {
          targetDb.assistantFaqs = targetDb.assistantFaqs || [];
          const faqMap = new Map(targetDb.assistantFaqs.map((f: any) => [f.id, f]));
          for (const src of sourceData.assistantFaqs) {
            if (!faqMap.has(src.id)) {
              targetDb.assistantFaqs.push(src);
              newCount++;
            } else if (strategy === 'source_wins') {
              const idx = targetDb.assistantFaqs.findIndex((f: any) => f.id === src.id);
              targetDb.assistantFaqs[idx] = { ...targetDb.assistantFaqs[idx], ...src };
              updateCount++;
            }
          }
        }
        break;
      }

      case 'maintenance': {
        if (sourceData.maintenanceSettings) {
          targetDb.maintenanceSettings = JSON.parse(JSON.stringify(sourceData.maintenanceSettings));
          updateCount++;
        }
        break;
      }

      case 'users': {
        targetDb.users = targetDb.users || [];
        const userMap = new Map(targetDb.users.map((u: any) => [u.email.toLowerCase(), u]));

        for (const src of sourceItems) {
          const email = src.email.toLowerCase();
          if (!userMap.has(email)) {
            // Add new user profile with preserved structure
            targetDb.users.push(src);
            newCount++;
          } else {
            // Never overwrite passwords or downgrade owners
            const existingUser = userMap.get(email) as any;
            if (existingUser && existingUser.role !== 'owner' && strategy === 'source_wins') {
              const idx = targetDb.users.findIndex((u: any) => u.email.toLowerCase() === email);
              targetDb.users[idx] = {
                ...targetDb.users[idx],
                name: src.name,
                role: src.role,
                permissions: src.permissions,
                title: src.title,
                status: src.status,
              };
              updateCount++;
            } else {
              preservedCount++;
            }
          }
        }
        break;
      }

      case 'auditLogs': {
        targetDb.auditLogs = targetDb.auditLogs || [];
        const logMap = new Map(targetDb.auditLogs.map((l: any) => [l.id, l]));

        for (const src of sourceItems) {
          if (!logMap.has(src.id)) {
            targetDb.auditLogs.push(src);
            newCount++;
          }
        }
        break;
      }

      case 'newsletterSubscribers': {
        targetDb.newsletterSubscribers = targetDb.newsletterSubscribers || [];
        const subMap = new Map(targetDb.newsletterSubscribers.map((s: any) => [s.email.toLowerCase(), s]));

        for (const src of sourceItems) {
          if (!subMap.has(src.email.toLowerCase())) {
            targetDb.newsletterSubscribers.push(src);
            newCount++;
          }
        }
        break;
      }

      case 'contactMessages': {
        targetDb.contactMessages = targetDb.contactMessages || [];
        const msgMap = new Map(targetDb.contactMessages.map((m: any) => [m.id, m]));

        for (const src of sourceItems) {
          if (!msgMap.has(src.id)) {
            targetDb.contactMessages.push(src);
            newCount++;
          }
        }
        break;
      }
    }

    return { newCount, updateCount, conflictCount, preservedCount };
  }

  /**
   * Records a sync execution into history log
   */
  private recordSyncHistory(record: SyncExecutionResult) {
    try {
      const history = this.getHistory();
      history.unshift(record);
      // Keep last 50 sync logs
      fs.writeFileSync(SYNC_HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2), 'utf-8');
    } catch (e) {
      console.warn('[SyncService] Failed to record sync history:', e);
    }
  }

  public getHistory(): SyncExecutionResult[] {
    try {
      if (fs.existsSync(SYNC_HISTORY_FILE)) {
        const raw = fs.readFileSync(SYNC_HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SyncService] Failed to read history file:', e);
    }
    return [];
  }
}

export const syncService = new SyncService();
