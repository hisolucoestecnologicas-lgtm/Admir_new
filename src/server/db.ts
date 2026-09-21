import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SiteSettings,
  Program,
  Story,
  Ambassador,
  PrivateDocument,
  MediaAsset,
  Donation,
  PaymentEvent,
  Task,
  TaskComment,
  TaskChecklistItem,
  TaskAttachment,
  TaskDependency,
  TaskWorkspace,
  TaskWorkflow,
  TaskWorkflowStage,
  AuditLog,
  User,
  AdminInvite,
  NewsletterSubscriber,
  ContactMessage,
  AssistantSettings,
  AssistantFaqItem,
  ContactRequest,
  AssistantChatFeedback,
  GranularPermissions,
  UserRole,
} from '../types';
import {
  INITIAL_SITE_SETTINGS,
  INITIAL_PROGRAMS,
  INITIAL_STORIES,
  INITIAL_AMBASSADORS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_DONATIONS,
  INITIAL_TASKS,
  INITIAL_OWNER_USER,
  INITIAL_ADDITIONAL_USERS,
  INITIAL_INVITES,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import { getPresetPermissions } from '../data/permissionPresets';

interface DatabaseSchema {
  settings: SiteSettings;
  programs: Program[];
  stories: Story[];
  ambassadors: Ambassador[];
  media: MediaAsset[];
  donations: Donation[];
  paymentEvents: PaymentEvent[];
  tasks: Task[];
  taskWorkspaces: TaskWorkspace[];
  taskWorkflows: TaskWorkflow[];
  taskWorkflowStages: TaskWorkflowStage[];
  taskDependencies?: TaskDependency[];
  users: (User & { passwordHash?: string })[];
  invites: AdminInvite[];
  auditLogs: AuditLog[];
  newsletterSubscribers: NewsletterSubscriber[];
  contactMessages: ContactMessage[];
  assistantSettings?: AssistantSettings;
  assistantFaqs?: AssistantFaqItem[];
  contactRequests?: ContactRequest[];
  assistantFeedbacks?: AssistantChatFeedback[];
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'admir_database.json');

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.settings && parsed.programs && parsed.users) {
          if (!parsed.paymentEvents) parsed.paymentEvents = [];
          if (!parsed.taskWorkspaces) parsed.taskWorkspaces = [];
          if (!parsed.taskWorkflows) parsed.taskWorkflows = [];
          if (!parsed.taskWorkflowStages) parsed.taskWorkflowStages = [];
          if (!parsed.taskDependencies) parsed.taskDependencies = [];
          if (!parsed.assistantSettings) {
            parsed.assistantSettings = {
              enabled: true,
              displayName: 'Assistente Virtual ADMIR',
              welcomeMessagePt: 'Olá! Sou o Assistente Virtual da ADMIR. Posso ajudar com informações públicas sobre a instituição, programas, embaixadores e formas de participação. Como posso ajudar?',
              welcomeMessageEn: 'Hello! I am the ADMIR Virtual Assistant. I can assist with official public information regarding our mission, programs, ambassadors, and ways to participate. How may I help you today?',
              welcomeMessageEs: '¡Hola! Soy el Asistente Virtual de ADMIR. Puedo ayudar con información pública sobre la institución, programas, embajadores y formas de participación. ¿Cómo puedo ayudarle?',
              allowHumanEscalation: true,
              defaultChannel: 'email',
              emailChannel: {
                active: true,
                displayName: 'Atendimento Diplomático ADMIR',
                recipientEmail: 'contact@admiramerican.org',
                senderName: 'Atendimento ADMIR',
              },
              whatsappChannel: {
                active: false,
              },
              telegramChannel: {
                active: false,
              },
            };
          }
          if (!parsed.assistantFaqs) {
            parsed.assistantFaqs = [
              {
                id: 'faq-1',
                questionPt: 'O que é a ADMIR?',
                questionEn: 'What is ADMIR?',
                questionEs: '¿Qué es ADMIR?',
                answerPt: 'A ADMIR (American Diplomatic Mission of International Relations) é uma organização internacional voltada à diplomacia humanitária, cooperação internacional e direitos humanos.',
                answerEn: 'ADMIR (American Diplomatic Mission of International Relations) is an international organization dedicated to humanitarian diplomacy, international cooperation, and human rights.',
                answerEs: 'ADMIR (American Diplomatic Mission of International Relations) es una organización internacional orientada a la diplomacia humanitaria y cooperación internacional.',
                category: 'Institucional',
                status: 'published',
                createdAt: '2026-01-10T10:00:00Z',
                updatedAt: '2026-01-10T10:00:00Z',
              },
              {
                id: 'faq-2',
                questionPt: 'Como apoiar os programas humanitários?',
                questionEn: 'How to support humanitarian programs?',
                questionEs: '¿Cómo apoyar los programas humanitarios?',
                answerPt: 'Você pode apoiar a ADMIR através de doações diretas na seção Doar, atuando como voluntário ou participando dos nossos eventos e parcerias institucionais.',
                answerEn: 'You can support ADMIR through direct contributions in the Donate section, volunteering, or engaging in our events and institutional partnerships.',
                answerEs: 'Puede apoyar a ADMIR mediante donaciones directas en la sección Donar, como voluntario o participando en nuestros eventos.',
                category: 'Programas',
                status: 'published',
                createdAt: '2026-01-10T10:00:00Z',
                updatedAt: '2026-01-10T10:00:00Z',
              },
              {
                id: 'faq-3',
                questionPt: 'Como funciona a nomeação de embaixadores?',
                questionEn: 'How does ambassador nomination work?',
                questionEs: '¿Cómo funciona la nominación de embajadores?',
                answerPt: 'A nomeação de embaixadores segue critérios rígidos de avaliação de histórico profissional, conduta e engajamento humanitário, sujeita à verificação da Comissão Diplomática.',
                answerEn: 'Ambassador nomination follows strict criteria evaluating professional background, conduct, and humanitarian engagement, subject to verification by the Diplomatic Commission.',
                answerEs: 'La nominación de embajadores sigue estrictos criterios de evaluación profesional y compromiso humanitario.',
                category: 'Corpo Diplomático',
                status: 'published',
                createdAt: '2026-01-10T10:00:00Z',
                updatedAt: '2026-01-10T10:00:00Z',
              },
            ];
          }
          if (!parsed.contactRequests) parsed.contactRequests = [];
          if (!parsed.assistantFeedbacks) parsed.assistantFeedbacks = [];

          const changedAccounts = this.reconcileOfficialAccounts(parsed);
          const changedTasks = this.migrateLegacyTasks(parsed);
          if (changedAccounts || changedTasks) {
            this.save(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database, initializing fresh seed:', err);
    }

    const defaultDb: DatabaseSchema = {
      settings: { ...INITIAL_SITE_SETTINGS },
      programs: [...INITIAL_PROGRAMS],
      stories: [...INITIAL_STORIES],
      ambassadors: [...INITIAL_AMBASSADORS],
      media: [...INITIAL_MEDIA_ASSETS],
      donations: [...INITIAL_DONATIONS],
      paymentEvents: [],
      tasks: [...INITIAL_TASKS],
      taskWorkspaces: [],
      taskWorkflows: [],
      taskWorkflowStages: [],
      users: [
        {
          ...INITIAL_OWNER_USER,
          // Default password for Owner is Admin@Admir2026!
          passwordHash: this.hashPassword('Admin@Admir2026!'),
        },
        ...INITIAL_ADDITIONAL_USERS.map((u) => ({
          ...u,
          passwordHash: this.hashPassword('AdmirStaff2026!'),
        })),
      ],
      invites: [...INITIAL_INVITES],
      auditLogs: [...INITIAL_AUDIT_LOGS],
      newsletterSubscribers: [
        {
          id: 'sub-1',
          name: 'Geneva Partner Forum',
          email: 'partners@geneva-diplomacy.org',
          consentedAt: '2026-02-01T12:00:00Z',
          status: 'active',
        },
      ],
      contactMessages: [
        {
          id: 'msg-1',
          name: 'Ambassadorial Office of Cultural Affairs',
          email: 'culture@embassy-cooperation.org',
          subject: 'Inquiry regarding 2026 Peace Ambassadors Youth Assembly',
          message:
            'We would like to coordinate bilateral accreditation for our youth delegation to participate in ADMIR peacebuilding workshops.',
          inquiryType: 'diplomatic',
          organization: 'International Diplomatic Council',
          submittedAt: '2026-03-01T10:30:00Z',
          status: 'new',
        },
      ],
    };

    this.reconcileOfficialAccounts(defaultDb);
    this.save(defaultDb);
    return defaultDb;
  }

  /**
   * Reconciles official ADMIR administrative accounts per Rule 10.1:
   * OWNERS:
   *  - navarro.empreendimentos@gmail.com (owner)
   *  - hfonsecafigueiredo@gmail.com (owner)
   *  - hisolucoestecnologicas@gmail.com (owner)
   * ADMINISTRADORES:
   *  - inadmflavio@gmail.com (manager)
   *  - drisaas07@gmail.com (manager)
   *  - andreval74@gmail.com (manager)
   *
   * Invariants:
   * - Preserves existing Auth UIDs, login history, and audit trails.
   * - Deduplicates if any duplicate records exist.
   * - Sets identityStatus to 'pending_link' until the user legitimately logs in via Firebase Google Auth.
   * - Never invents fake UIDs or fake credentials.
   */
  private migrateLegacyTasks(db: DatabaseSchema): boolean {
    let changed = false;
    // 1. Define Workspaces, Workflows and Stages
    const workspaces = [
      { id: 'ws-1', name: 'Geral', orderIndex: 1, active: true },
      { id: 'ws-2', name: 'Desenvolvimento', orderIndex: 2, active: false },
      { id: 'ws-3', name: 'Marketing', orderIndex: 3, active: false },
      { id: 'ws-4', name: 'Administrativo', orderIndex: 4, active: false },
    ];
    
    workspaces.forEach(ws => {
      const existing = db.taskWorkspaces.find(w => w.id === ws.id);
      if (!existing) {
        db.taskWorkspaces.push(ws);
        changed = true;
      } else if (existing.active !== ws.active) {
        existing.active = ws.active;
        changed = true;
      }
    });

    const workflows = [
      { id: 'wf-legacy', workspaceId: 'ws-1', name: 'Legacy', orderIndex: 1, active: true },
      { id: 'wf-dev', workspaceId: 'ws-1', name: 'Desenvolvimento', orderIndex: 2, active: true },
      { id: 'wf-mkt', workspaceId: 'ws-1', name: 'Marketing', orderIndex: 3, active: true },
      { id: 'wf-adm', workspaceId: 'ws-1', name: 'Administrativo', orderIndex: 4, active: true },
    ];
    
    // Purge obsolete wf-general if present without tasks
    if (db.taskWorkflows.some(w => w.id === 'wf-general')) {
      const hasTasks = db.tasks.some(t => t.workflowId === 'wf-general');
      if (!hasTasks) {
        db.taskWorkflows = db.taskWorkflows.filter(w => w.id !== 'wf-general');
        db.taskWorkflowStages = db.taskWorkflowStages.filter(s => s.workflowId !== 'wf-general');
        changed = true;
      }
    }

    workflows.forEach(wf => {
      const existing = db.taskWorkflows.find(w => w.id === wf.id);
      if (!existing) {
        db.taskWorkflows.push(wf);
        changed = true;
      }
    });

    const stages: TaskWorkflowStage[] = [
      // Legacy
      { id: 'st-l-1', workflowId: 'wf-legacy', name: 'Backlog', orderIndex: 1, isInitial: true, active: true },
      { id: 'st-l-2', workflowId: 'wf-legacy', name: 'Em Andamento', orderIndex: 2, active: true },
      { id: 'st-l-3', workflowId: 'wf-legacy', name: 'Concluído', orderIndex: 3, isFinal: true, active: true },
      // Dev
      { id: 'st-d-1', workflowId: 'wf-dev', name: 'Backlog', orderIndex: 1, isInitial: true, active: true },
      { id: 'st-d-2', workflowId: 'wf-dev', name: 'Análise', orderIndex: 2, active: true },
      { id: 'st-d-3', workflowId: 'wf-dev', name: 'Pronto p/ Dev', orderIndex: 3, active: true },
      { id: 'st-d-4', workflowId: 'wf-dev', name: 'Em Desenvolvimento', orderIndex: 4, active: true },
      { id: 'st-d-5', workflowId: 'wf-dev', name: 'Code Review', orderIndex: 5, active: true },
      { id: 'st-d-6', workflowId: 'wf-dev', name: 'QA / Testes', orderIndex: 6, active: true },
      { id: 'st-d-7', workflowId: 'wf-dev', name: 'Homologação', orderIndex: 7, active: true },
      { id: 'st-d-8', workflowId: 'wf-dev', name: 'Pronto p/ Prod', orderIndex: 8, active: true },
      { id: 'st-d-9', workflowId: 'wf-dev', name: 'Produção', orderIndex: 9, active: true },
      { id: 'st-d-10', workflowId: 'wf-dev', name: 'Concluído', orderIndex: 10, isFinal: true, active: true },
      // Mkt
      { id: 'st-m-1', workflowId: 'wf-mkt', name: 'Ideias', orderIndex: 1, isInitial: true, active: true },
      { id: 'st-m-2', workflowId: 'wf-mkt', name: 'Planejamento', orderIndex: 2, active: true },
      { id: 'st-m-3', workflowId: 'wf-mkt', name: 'Em Produção', orderIndex: 3, active: true },
      { id: 'st-m-4', workflowId: 'wf-mkt', name: 'Revisão', orderIndex: 4, active: true },
      { id: 'st-m-5', workflowId: 'wf-mkt', name: 'Aguardando Aprovação', orderIndex: 5, active: true },
      { id: 'st-m-6', workflowId: 'wf-mkt', name: 'Aprovado', orderIndex: 6, active: true },
      { id: 'st-m-7', workflowId: 'wf-mkt', name: 'Agendado', orderIndex: 7, active: true },
      { id: 'st-m-8', workflowId: 'wf-mkt', name: 'Publicado', orderIndex: 8, active: true },
      { id: 'st-m-9', workflowId: 'wf-mkt', name: 'Concluído', orderIndex: 9, isFinal: true, active: true },
      // Adm
      { id: 'st-a-1', workflowId: 'wf-adm', name: 'Solicitação', orderIndex: 1, isInitial: true, active: true },
      { id: 'st-a-2', workflowId: 'wf-adm', name: 'Análise', orderIndex: 2, active: true },
      { id: 'st-a-3', workflowId: 'wf-adm', name: 'Em Execução', orderIndex: 3, active: true },
      { id: 'st-a-4', workflowId: 'wf-adm', name: 'Aguardando Terceiro', orderIndex: 4, active: true },
      { id: 'st-a-5', workflowId: 'wf-adm', name: 'Aguardando Aprovação', orderIndex: 5, active: true },
      { id: 'st-a-6', workflowId: 'wf-adm', name: 'Finalização', orderIndex: 6, active: true },
      { id: 'st-a-7', workflowId: 'wf-adm', name: 'Concluído', orderIndex: 7, isFinal: true, active: true },
    ];

    stages.forEach(st => {
      const existing = db.taskWorkflowStages.find(s => s.id === st.id);
      if (!existing) {
        db.taskWorkflowStages.push(st);
        changed = true;
      }
    });

    // 2. Migrate existing tasks
    db.tasks.forEach(task => {
      // Consolidate any tasks in old workspaces to ws-1
      if (['ws-2', 'ws-3', 'ws-4'].includes(task.workspaceId || '')) {
        task.workspaceId = 'ws-1';
        changed = true;
      }

      // If no valid classification, migrate to Legacy
      if (!task.workspaceId || !task.workflowId || !task.stageId) {
        task.workspaceId = 'ws-1';
        task.workflowId = 'wf-legacy';
        task.stageId = 'st-l-1';
        changed = true;
      }
    });
    return changed;
  }

  private reconcileOfficialAccounts(db: DatabaseSchema): boolean {
    let changed = false;

    const officialAccounts = [
      // OWNERS
      {
        email: 'navarro.empreendimentos@gmail.com',
        name: 'Navarro Empreendimentos',
        role: 'owner' as UserRole,
        permissions: getPresetPermissions('all'),
        title: 'Site Owner & High Commissioner',
      },
      {
        email: 'hfonsecafigueiredo@gmail.com',
        name: 'Herbert Fonseca Figueiredo',
        role: 'owner' as UserRole,
        permissions: getPresetPermissions('all'),
        title: 'High Commissioner & Site Owner',
      },
      {
        email: 'hisolucoestecnologicas@gmail.com',
        name: 'HI Soluções Tecnológicas',
        role: 'owner' as UserRole,
        permissions: getPresetPermissions('all'),
        title: 'Site Owner & Technology Director',
      },
      // ADMINISTRADORES
      {
        email: 'inadmflavio@gmail.com',
        name: 'Flávio (Administração ADMIR)',
        role: 'manager' as UserRole,
        permissions: getPresetPermissions('manager'),
        title: 'Administrador Oficial ADMIR',
      },
      {
        email: 'drisaas07@gmail.com',
        name: 'Adriana (Administração ADMIR)',
        role: 'manager' as UserRole,
        permissions: getPresetPermissions('manager'),
        title: 'Administradora Oficial ADMIR',
      },
      {
        email: 'andreval74@gmail.com',
        name: 'André Val (Administração ADMIR)',
        role: 'manager' as UserRole,
        permissions: getPresetPermissions('manager'),
        title: 'Administrador Oficial ADMIR',
      },
    ];

    for (const official of officialAccounts) {
      const cleanEmail = official.email.toLowerCase();
      const matches = db.users.filter((u) => u.email.toLowerCase() === cleanEmail);

      if (matches.length === 0) {
        // Create official pending record (NO fake UID, NO fake password)
        const newRecord: User & { passwordHash?: string } = {
          id: `user-official-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '')}`,
          name: official.name,
          email: cleanEmail,
          role: official.role,
          permissions: { ...official.permissions },
          status: 'active',
          joinedAt: new Date().toISOString(),
          lastLoginAt: '',
          title: official.title,
          identityStatus: 'pending_link',
          isProtected: true,
        };
        db.users.push(newRecord);
        changed = true;
      } else {
        // Reconcile: keep the primary record (especially if it has firebaseUid or login history)
        const primary = matches.find((u) => u.firebaseUid) || matches[0];

        // Deduplicate if more than one record exists
        if (matches.length > 1) {
          db.users = db.users.filter((u) => u.id === primary.id || u.email.toLowerCase() !== cleanEmail);
          changed = true;
        }

        // Enforce invariants
        if (primary.role !== official.role) {
          primary.role = official.role;
          changed = true;
        }
        if (!primary.isProtected) {
          primary.isProtected = true;
          changed = true;
        }
        if (primary.firebaseUid) {
          if (primary.identityStatus !== 'linked') {
            primary.identityStatus = 'linked';
            changed = true;
          }
        } else {
          if (primary.identityStatus !== 'pending_link') {
            primary.identityStatus = 'pending_link';
            changed = true;
          }
        }
      }
    }

    return changed;
  }

  private save(dataToSave?: DatabaseSchema) {
    const toWrite = dataToSave || this.data;
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(toWrite, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      console.error('Failed to write database atomically:', e);
    }
  }

  public hashPassword(plain: string): string {
    return crypto.createHash('sha256').update(plain + 'ADMIR_SALT_2026').digest('hex');
  }

  public recordAuditLog(
    user: User | { email: string; name: string },
    action: AuditLog['action'],
    module: AuditLog['module'],
    affectedRecord: string,
    details?: string,
    meta?: RequestMetadata,
    beforeState?: string,
    afterState?: string
  ) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userEmail: user.email,
      userName: user.name,
      action,
      module,
      affectedRecord,
      details,
      beforeState,
      afterState,
      ipAddress: meta?.ipAddress || '127.0.0.1',
      device: meta?.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop / Workstation',
      browser: meta?.userAgent ? meta.userAgent.split(' ')[0] : 'Web Client',
      location: 'Diplomatic Mission Gateway',
    };

    this.data.auditLogs.unshift(log);
    // Keep last 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.save();
    return log;
  }

  // --- SITE SETTINGS ---
  public getSettings(): SiteSettings {
    return { ...this.data.settings };
  }

  public updateSettings(updates: Partial<SiteSettings>, user: User, meta?: RequestMetadata): SiteSettings {
    const prev = JSON.stringify(this.data.settings);
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();

    this.recordAuditLog(
      user,
      'Alteração',
      'Home',
      'Configurações e Textos da Home',
      'Textos e métricas institucionais atualizados com sucesso.',
      meta,
      prev.substring(0, 200) + '...',
      JSON.stringify(this.data.settings).substring(0, 200) + '...'
    );

    return this.data.settings;
  }

  // --- PROGRAMS ---
  public getPrograms(includeHidden = false): Program[] {
    const items = [...this.data.programs];
    const filtered = includeHidden ? items : items.filter((p) => p.isVisible);
    return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getProgramById(id: string): Program | undefined {
    return this.data.programs.find((p) => p.id === id);
  }

  public getProgramBySlug(slug: string): Program | undefined {
    return this.data.programs.find((p) => p.slug === slug);
  }

  public createProgram(data: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): Program {
    const id = `prog-${Date.now()}`;
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const maxOrder = this.data.programs.reduce((m, p) => Math.max(m, p.orderIndex || 0), 0);

    const newProg: Program = {
      ...data,
      id,
      slug,
      orderIndex: data.orderIndex ?? maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.programs.push(newProg);
    this.save();

    this.recordAuditLog(user, 'Criação', 'Programs', newProg.title, `Criado novo programa "${newProg.title}" (slug: ${slug})`, meta);
    return newProg;
  }

  public updateProgram(id: string, updates: Partial<Program>, user: User, meta?: RequestMetadata): Program {
    const idx = this.data.programs.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Program not found');

    const prev = { ...this.data.programs[idx] };
    const updated: Program = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.programs[idx] = updated;
    this.save();

    const action = updates.isVisible !== undefined && updates.isVisible !== prev.isVisible
      ? (updates.isVisible ? 'Publicação' : 'Despublicação')
      : 'Alteração';

    this.recordAuditLog(user, action, 'Programs', updated.title, `Programa atualizado: ${updated.title}`, meta);
    return updated;
  }

  public deleteProgram(id: string, user: User, meta?: RequestMetadata): boolean {
    const prog = this.data.programs.find((p) => p.id === id);
    if (!prog) return false;

    this.data.programs = this.data.programs.filter((p) => p.id !== id);
    this.save();

    this.recordAuditLog(user, 'Exclusão', 'Programs', prog.title, `Programa "${prog.title}" excluído do sistema`, meta);
    return true;
  }

  public reorderPrograms(orderedIds: string[], user: User, meta?: RequestMetadata): Program[] {
    orderedIds.forEach((id, index) => {
      const p = this.data.programs.find((prog) => prog.id === id);
      if (p) p.orderIndex = index + 1;
    });
    this.save();
    this.recordAuditLog(user, 'Alteração', 'Programs', 'Reordenação de Programas', 'Ordem dos programas atualizada.', meta);
    return this.getPrograms(true);
  }

  // --- NEWS & STORIES ---
  public getStories(includeDrafts = false): Story[] {
    const items = [...this.data.stories];
    const filtered = includeDrafts ? items : items.filter((s) => s.isPublished);
    return filtered.sort((a, b) => a.orderIndex - b.orderIndex || new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  }

  public getStoryById(id: string): Story | undefined {
    return this.data.stories.find((s) => s.id === id);
  }

  public getStoryBySlug(slug: string): Story | undefined {
    return this.data.stories.find((s) => s.slug === slug);
  }

  public createStory(data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): Story {
    const id = `story-${Date.now()}`;
    const slug = data.slug || data.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const maxOrder = this.data.stories.reduce((m, s) => Math.max(m, s.orderIndex || 0), 0);

    const newStory: Story = {
      ...data,
      id,
      slug,
      orderIndex: data.orderIndex ?? maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.stories.push(newStory);
    this.save();

    this.recordAuditLog(user, 'Criação', 'News', newStory.headline, `Criada notícia/história "${newStory.headline}"`, meta);
    return newStory;
  }

  public updateStory(id: string, updates: Partial<Story>, user: User, meta?: RequestMetadata): Story {
    const idx = this.data.stories.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Story not found');

    const prev = { ...this.data.stories[idx] };
    const updated: Story = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.stories[idx] = updated;
    this.save();

    const action = updates.isPublished !== undefined && updates.isPublished !== prev.isPublished
      ? (updates.isPublished ? 'Publicação' : 'Despublicação')
      : 'Alteração';

    this.recordAuditLog(user, action, 'News', updated.headline, `Notícia atualizada: ${updated.headline}`, meta);
    return updated;
  }

  public duplicateStory(id: string, user: User, meta?: RequestMetadata): Story {
    const orig = this.data.stories.find((s) => s.id === id);
    if (!orig) throw new Error('Original story not found');

    const copyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> = {
      ...orig,
      headline: `${orig.headline} (Copy)`,
      slug: `${orig.slug}-copy-${Date.now().toString().slice(-4)}`,
      isPublished: false,
      orderIndex: orig.orderIndex + 1,
    };

    return this.createStory(copyData, user, meta);
  }

  public deleteStory(id: string, user: User, meta?: RequestMetadata): boolean {
    const story = this.data.stories.find((s) => s.id === id);
    if (!story) return false;

    this.data.stories = this.data.stories.filter((s) => s.id !== id);
    this.save();

    this.recordAuditLog(user, 'Exclusão', 'News', story.headline, `Notícia "${story.headline}" excluída`, meta);
    return true;
  }

  // --- AMBASSADORS & ONBOARDING ---

  public computeAmbassadorCompletion(a: Partial<Ambassador>): {
    completionPercentage: number;
    pendingItems: string[];
  } {
    const docs = a.documents || [];
    const hasDocType = (type: string) => docs.some((d) => d.type === type);

    const fullName = a.fullName || a.name || '';

    const checks = [
      { label: 'Nome completo', ok: Boolean(fullName && fullName.trim().length > 0) },
      { label: 'Passaporte', ok: Boolean(a.passportNumber && a.passportNumber.trim().length > 0) },
      { label: 'CPF', ok: Boolean(a.cpf && a.cpf.trim().length > 0) },
      { label: 'RG / DNI', ok: Boolean(a.rgDni && a.rgDni.trim().length > 0) },
      { label: 'Data de nascimento', ok: Boolean(a.birthDate && a.birthDate.trim().length > 0) },
      { label: 'Tipo sanguíneo', ok: Boolean(a.bloodType && a.bloodType.trim().length > 0) },
      { label: 'Nome do pai', ok: Boolean(a.fatherName && a.fatherName.trim().length > 0) },
      { label: 'Nome da mãe', ok: Boolean(a.motherName && a.motherName.trim().length > 0) },
      { label: 'E-mail', ok: Boolean(a.email && a.email.trim().length > 0) },
      { label: 'Telefone', ok: Boolean(a.phone && a.phone.trim().length > 0) },
      { label: 'Profissão', ok: Boolean(a.profession && a.profession.trim().length > 0) },
      { label: 'Endereço', ok: Boolean(a.address && a.address.trim().length > 0) },
      { label: 'Resumo curricular', ok: Boolean(a.curriculumSummary && a.curriculumSummary.trim().length > 0) },
      { label: 'Foto oficial', ok: Boolean((a.photo && a.photo.trim().length > 0) || hasDocType('photo')) },
      { label: 'Cópia do passaporte', ok: hasDocType('passport') },
      { label: 'Cópia do CPF', ok: hasDocType('cpf') },
      { label: 'Cópia do RG/DNI', ok: hasDocType('rg') },
      { label: 'Currículo (arquivo)', ok: hasDocType('curriculum') },
    ];

    const completed = checks.filter((c) => c.ok).length;
    const pendingItems = checks.filter((c) => !c.ok).map((c) => c.label);
    const completionPercentage = Math.round((completed / checks.length) * 100);

    return { completionPercentage, pendingItems };
  }

  public sanitizeAmbassadorPublic(a: Ambassador): any {
    const {
      passportNumber,
      cpf,
      rgDni,
      birthDate,
      bloodType,
      fatherName,
      motherName,
      email,
      phone,
      address,
      curriculumSummary,
      documents,
      onboardingToken,
      tokenCreatedAt,
      tokenExpiresAt,
      tokenStatus,
      pendingItems,
      pendingNotes,
      ...publicFields
    } = a;

    return {
      ...publicFields,
      isVisible: a.editorialStatus === 'published' || a.isVisible === true,
    };
  }

  public getAmbassadors(includeHidden = false): Ambassador[] {
    const items = this.data.ambassadors.map((a) => {
      // Ensure defaults for legacy records
      const edStatus = a.editorialStatus || (a.isVisible ? 'published' : 'draft');
      const obStatus = a.onboardingStatus || (a.isVisible ? 'publicado' : 'novo');
      const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(a);
      return {
        ...a,
        fullName: a.fullName || a.name || 'Embaixador Sem Nome',
        editorialStatus: edStatus,
        onboardingStatus: obStatus,
        completionPercentage,
        pendingItems,
        isVisible: edStatus === 'published',
      };
    });

    if (!includeHidden) {
      // Public request: Return only published profiles and strip out all private personal fields!
      return items
        .filter((a) => a.editorialStatus === 'published' && a.isVisible)
        .map((a) => this.sanitizeAmbassadorPublic(a))
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }

    // Admin request: Return full items sorted by orderIndex
    return items.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  public getAmbassadorById(id: string, isPublic = false): Ambassador | undefined {
    const item = this.data.ambassadors.find((a) => a.id === id);
    if (!item) return undefined;

    const edStatus = item.editorialStatus || (item.isVisible ? 'published' : 'draft');
    const obStatus = item.onboardingStatus || (item.isVisible ? 'publicado' : 'novo');
    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(item);

    const fullItem: Ambassador = {
      ...item,
      fullName: item.fullName || item.name || 'Embaixador Sem Nome',
      editorialStatus: edStatus,
      onboardingStatus: obStatus,
      completionPercentage,
      pendingItems,
      isVisible: edStatus === 'published',
    };

    if (isPublic) {
      if (fullItem.editorialStatus !== 'published') return undefined;
      return this.sanitizeAmbassadorPublic(fullItem) as Ambassador;
    }

    return fullItem;
  }

  public createAmbassador(data: Omit<Ambassador, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): Ambassador {
    const id = `amb-${Date.now()}`;
    const maxOrder = this.data.ambassadors.reduce((m, a) => Math.max(m, a.orderIndex || 0), 0);

    const editorialStatus = data.editorialStatus || 'draft';
    const onboardingStatus = data.onboardingStatus || 'novo';
    const isVisible = editorialStatus === 'published';

    const tempAmb: Ambassador = {
      ...data,
      id,
      fullName: data.fullName || data.name || '',
      role: data.role || '',
      country: data.country || '',
      shortBiography: data.shortBiography || '',
      fullBiography: data.fullBiography || '',
      photo: data.photo || '',
      editorialStatus,
      onboardingStatus,
      isVisible,
      orderIndex: data.orderIndex ?? maxOrder + 1,
      completionPercentage: 0,
      pendingItems: [],
      documents: data.documents || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(tempAmb);
    const newAmb: Ambassador = {
      ...tempAmb,
      completionPercentage,
      pendingItems,
    };

    this.data.ambassadors.push(newAmb);
    this.save();

    this.recordAuditLog(user, 'Criação', 'Ambassadors', newAmb.fullName || id, `Criado cadastro de embaixador "${newAmb.fullName}" (${newAmb.role})`, meta);
    return newAmb;
  }

  public updateAmbassador(id: string, updates: Partial<Ambassador>, user: User, meta?: RequestMetadata): Ambassador {
    const idx = this.data.ambassadors.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Ambassador not found');

    const prev = { ...this.data.ambassadors[idx] };
    const merged: Ambassador = {
      ...prev,
      ...updates,
      fullName: updates.fullName !== undefined ? updates.fullName : (prev.fullName || prev.name || ''),
      updatedAt: new Date().toISOString(),
    };

    if (updates.editorialStatus !== undefined) {
      merged.editorialStatus = updates.editorialStatus;
      merged.isVisible = updates.editorialStatus === 'published';
    }

    if (updates.onboardingStatus === 'publicado') {
      merged.editorialStatus = 'published';
      merged.isVisible = true;
    }

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(merged);
    merged.completionPercentage = completionPercentage;
    merged.pendingItems = pendingItems;

    this.data.ambassadors[idx] = merged;
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Ambassadors', merged.fullName || id, `Embaixador atualizado: ${merged.fullName}`, meta);
    return merged;
  }

  public deleteAmbassador(id: string, user: User, meta?: RequestMetadata): boolean {
    const amb = this.data.ambassadors.find((a) => a.id === id);
    if (!amb) return false;

    this.data.ambassadors = this.data.ambassadors.filter((a) => a.id !== id);
    this.save();

    this.recordAuditLog(user, 'Exclusão', 'Ambassadors', amb.fullName || amb.name || id, `Embaixador "${amb.fullName || id}" excluído`, meta);
    return true;
  }

  // --- AMBASSADOR ONBOARDING TOKEN & PRIVATE DOCS ---

  public generateAmbassadorOnboardingToken(id: string, user: User, meta?: RequestMetadata): { token: string; url: string; expiresAt: string } {
    const amb = this.data.ambassadors.find((a) => a.id === id);
    if (!amb) throw new Error('Ambassador not found');

    const token = crypto.randomBytes(24).toString('hex');
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    amb.onboardingToken = token;
    amb.tokenCreatedAt = createdAt;
    amb.tokenExpiresAt = expiresAt;
    amb.tokenStatus = 'active';

    if (amb.onboardingStatus === 'novo') {
      amb.onboardingStatus = 'link_enviado';
    }

    amb.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Ambassadors', amb.fullName || id, `Link seguro de onboarding gerado para "${amb.fullName}"`, meta);

    return { token, url: `/ambassador-onboarding/${token}`, expiresAt };
  }

  public revokeAmbassadorOnboardingToken(id: string, user: User, meta?: RequestMetadata): boolean {
    const amb = this.data.ambassadors.find((a) => a.id === id);
    if (!amb) return false;

    amb.tokenStatus = 'revoked';
    amb.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Ambassadors', amb.fullName || id, `Link de onboarding revogado para "${amb.fullName}"`, meta);
    return true;
  }

  public getAmbassadorByOnboardingToken(token: string): Ambassador | null {
    if (!token || typeof token !== 'string') return null;

    const amb = this.data.ambassadors.find((a) => a.onboardingToken === token);
    if (!amb) return null;

    if (amb.tokenStatus !== 'active') return null;

    if (amb.tokenExpiresAt && new Date(amb.tokenExpiresAt).getTime() < Date.now()) {
      amb.tokenStatus = 'expired';
      this.save();
      return null;
    }

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(amb);
    return {
      ...amb,
      completionPercentage,
      pendingItems,
    };
  }

  public updateAmbassadorByToken(token: string, updates: Partial<Ambassador>, submitForAnalysis = false): Ambassador {
    const amb = this.getAmbassadorByOnboardingToken(token);
    if (!amb) throw new Error('Link de onboarding inválido ou expirado');

    const idx = this.data.ambassadors.findIndex((a) => a.id === amb.id);

    const allowed = {
      fullName: updates.fullName !== undefined ? updates.fullName : amb.fullName,
      passportNumber: updates.passportNumber !== undefined ? updates.passportNumber : amb.passportNumber,
      cpf: updates.cpf !== undefined ? updates.cpf : amb.cpf,
      rgDni: updates.rgDni !== undefined ? updates.rgDni : amb.rgDni,
      birthDate: updates.birthDate !== undefined ? updates.birthDate : amb.birthDate,
      bloodType: updates.bloodType !== undefined ? updates.bloodType : amb.bloodType,
      fatherName: updates.fatherName !== undefined ? updates.fatherName : amb.fatherName,
      motherName: updates.motherName !== undefined ? updates.motherName : amb.motherName,
      email: updates.email !== undefined ? updates.email : amb.email,
      phone: updates.phone !== undefined ? updates.phone : amb.phone,
      profession: updates.profession !== undefined ? updates.profession : amb.profession,
      address: updates.address !== undefined ? updates.address : amb.address,
      curriculumSummary: updates.curriculumSummary !== undefined ? updates.curriculumSummary : amb.curriculumSummary,
    };

    const merged: Ambassador = {
      ...this.data.ambassadors[idx],
      ...allowed,
      updatedAt: new Date().toISOString(),
    };

    if (submitForAnalysis) {
      merged.onboardingStatus = 'analisando';
    }

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(merged);
    merged.completionPercentage = completionPercentage;
    merged.pendingItems = pendingItems;

    this.data.ambassadors[idx] = merged;
    this.save();

    return merged;
  }

  public addPrivateDocumentToAmbassador(id: string, doc: Omit<PrivateDocument, 'id' | 'uploadDate'>): PrivateDocument {
    const idx = this.data.ambassadors.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Ambassador not found');

    const amb = this.data.ambassadors[idx];
    if (!amb.documents) amb.documents = [];

    const newDoc: PrivateDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uploadDate: new Date().toISOString(),
    };

    amb.documents.push(newDoc);
    amb.updatedAt = new Date().toISOString();

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(amb);
    amb.completionPercentage = completionPercentage;
    amb.pendingItems = pendingItems;

    this.save();
    return newDoc;
  }

  public removePrivateDocumentFromAmbassador(id: string, docId: string): boolean {
    const idx = this.data.ambassadors.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const amb = this.data.ambassadors[idx];
    if (!amb.documents) return false;

    const initialLen = amb.documents.length;
    amb.documents = amb.documents.filter((d) => d.id !== docId);
    if (amb.documents.length === initialLen) return false;

    amb.updatedAt = new Date().toISOString();

    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(amb);
    amb.completionPercentage = completionPercentage;
    amb.pendingItems = pendingItems;

    this.save();
    return true;
  }

  public updatePrivateDocument(ambId: string, docId: string, updates: Partial<PrivateDocument>): boolean {
    const idx = this.data.ambassadors.findIndex((a) => a.id === ambId);
    if (idx === -1) return false;

    const amb = this.data.ambassadors[idx];
    if (!amb.documents) return false;

    const docIdx = amb.documents.findIndex((d) => d.id === docId);
    if (docIdx === -1) return false;

    amb.documents[docIdx] = {
      ...amb.documents[docIdx],
      ...updates
    };

    amb.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // --- MEDIA LIBRARY ---
  public getMedia(): MediaAsset[] {
    // calculate usage count dynamically across programs, stories, ambassadors, settings
    const media = [...this.data.media];
    const stringifiedAll = JSON.stringify({
      settings: this.data.settings,
      programs: this.data.programs,
      stories: this.data.stories,
      ambassadors: this.data.ambassadors,
    });

    return media.map((m) => {
      const occurrences = (stringifiedAll.match(new RegExp(m.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      return {
        ...m,
        usageCount: occurrences,
      };
    });
  }

  public addMedia(asset: Omit<MediaAsset, 'id' | 'createdAt'>, user: User, meta?: RequestMetadata): MediaAsset {
    const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAsset: MediaAsset = {
      ...asset,
      id,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.data.media.unshift(newAsset);
    this.save();

    this.recordAuditLog(user, 'Upload', 'Photos', newAsset.originalName, `Arquivo "${newAsset.originalName}" enviado à biblioteca de mídia`, meta);
    return newAsset;
  }

  public updateMedia(id: string, updates: Partial<MediaAsset>, user: User, meta?: RequestMetadata): MediaAsset {
    const idx = this.data.media.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Media asset not found');

    this.data.media[idx] = { ...this.data.media[idx], ...updates };
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Photos', this.data.media[idx].originalName, 'Metadados de foto/mídia atualizados', meta);
    return this.data.media[idx];
  }

  public deleteMedia(id: string, user: User, meta?: RequestMetadata): { success: boolean; usageCount: number } {
    const item = this.data.media.find((m) => m.id === id);
    if (!item) return { success: false, usageCount: 0 };

    // Check usage across database
    const stringifiedAll = JSON.stringify({
      settings: this.data.settings,
      programs: this.data.programs,
      stories: this.data.stories,
      ambassadors: this.data.ambassadors,
    });
    const occurrences = (stringifiedAll.match(new RegExp(item.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

    this.data.media = this.data.media.filter((m) => m.id !== id);
    this.save();

    this.recordAuditLog(user, 'Exclusão', 'Photos', item.originalName, `Foto/mídia "${item.originalName}" excluída do acervo`, meta);
    return { success: true, usageCount: occurrences };
  }

  // --- DONATIONS ---
  public getDonations(search?: string, period?: string, status?: string, type?: string): Donation[] {
    let list = [...this.data.donations];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.donorName.toLowerCase().includes(q) ||
          d.donorEmail.toLowerCase().includes(q) ||
          d.transactionId.toLowerCase().includes(q) ||
          d.cause.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      list = list.filter((d) => d.status === status);
    }

    if (type && type !== 'all') {
      list = list.filter((d) => d.donationType === type);
    }

    if (period && period !== 'all') {
      const now = new Date().getTime();
      if (period === '7days') {
        list = list.filter((d) => now - new Date(d.date).getTime() <= 7 * 24 * 3600 * 1000);
      } else if (period === '30days') {
        list = list.filter((d) => now - new Date(d.date).getTime() <= 30 * 24 * 3600 * 1000);
      } else if (period === 'this_year') {
        const currentYear = new Date().getFullYear();
        list = list.filter((d) => new Date(d.date).getFullYear() === currentYear);
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public recordDonation(data: Omit<Donation, 'id' | 'transactionId' | 'date'>): Donation {
    const id = `don-${Date.now()}`;
    const transactionId = `TXN-ADM-${Math.floor(100000 + Math.random() * 900000)}`;

    const donation: Donation = {
      ...data,
      id,
      transactionId,
      date: new Date().toISOString(),
      status: data.status || 'pending',
      environment: data.environment || 'live',
    };

    this.data.donations.unshift(donation);
    this.save();
    return donation;
  }

  public isPaymentEventProcessed(providerEventId: string): boolean {
    if (!this.data.paymentEvents) this.data.paymentEvents = [];
    return this.data.paymentEvents.some((e) => e.providerEventId === providerEventId);
  }

  public recordPaymentEvent(eventData: Omit<PaymentEvent, 'id' | 'createdAt'>): void {
    if (!this.data.paymentEvents) this.data.paymentEvents = [];
    const event: PaymentEvent = {
      ...eventData,
      id: `pevt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    this.data.paymentEvents.push(event);
    this.save();
  }

  public updateDonationStatusByTransaction(providerTransactionId: string, status: Donation['status']): Donation | null {
    const donation = this.data.donations.find(
      (d) => d.providerTransactionId === providerTransactionId || d.transactionId === providerTransactionId
    );
    if (donation) {
      donation.status = status;
      donation.updatedAt = new Date().toISOString();
      if (status === 'completed' || status === 'succeeded') {
        donation.confirmedAt = new Date().toISOString();
      }
      this.save();
      return donation;
    }
    return null;
  }

  public refundDonation(donationId: string, user: User, meta?: RequestMetadata): Donation {
    const donation = this.data.donations.find((d) => d.id === donationId);
    if (!donation) throw new Error('Doação não encontrada.');
    
    donation.status = 'refunded';
    donation.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(
      user,
      'Reembolso',
      'Donations',
      donation.transactionId,
      `Doação de $${donation.amount} ${donation.currency} (${donation.donorName}) reembolsada com sucesso`,
      meta
    );

    return donation;
  }

  // --- TASKS KANBAN MANAGEMENT ---
  public getWorkspaces(): TaskWorkspace[] {
    return this.data.taskWorkspaces.filter(ws => ws.active).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getWorkflows(workspaceId?: string, includeInactive: boolean = false): TaskWorkflow[] {
    let workflows = [...this.data.taskWorkflows];
    if (workspaceId) {
      workflows = workflows.filter(w => w.workspaceId === workspaceId);
    }
    if (!includeInactive) {
      workflows = workflows.filter(w => w.active !== false);
    }
    return workflows.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getWorkflowById(id: string): TaskWorkflow | null {
    return this.data.taskWorkflows.find(w => w.id === id) || null;
  }

  public createWorkflow(data: { workspaceId?: string; name: string; active?: boolean }, user: User, meta?: RequestMetadata): TaskWorkflow {
    if (!data.name || !data.name.trim()) {
      throw new Error('O nome do fluxo é obrigatório.');
    }
    const workspaceId = data.workspaceId || 'ws-1';
    const workspace = this.data.taskWorkspaces.find(ws => ws.id === workspaceId);
    if (!workspace) throw new Error('Área de trabalho (Workspace) não encontrada.');

    const sameWsWorkflows = this.data.taskWorkflows.filter(w => w.workspaceId === workspaceId);
    const maxOrder = sameWsWorkflows.reduce((max, w) => Math.max(max, w.orderIndex || 0), 0);

    const id = `wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newWorkflow: TaskWorkflow = {
      id,
      workspaceId,
      name: data.name.trim(),
      orderIndex: maxOrder + 1,
      active: data.active !== undefined ? data.active : true,
    };

    this.data.taskWorkflows.push(newWorkflow);

    // Create default initial and final stages for new workflows
    const stage1Id = `st-${Date.now()}-1`;
    const stage2Id = `st-${Date.now()}-2`;
    const defaultStage1: TaskWorkflowStage = {
      id: stage1Id,
      workflowId: id,
      name: 'Backlog',
      orderIndex: 1,
      isInitial: true,
      active: true,
    };
    const defaultStage2: TaskWorkflowStage = {
      id: stage2Id,
      workflowId: id,
      name: 'Concluído',
      orderIndex: 2,
      isFinal: true,
      active: true,
    };
    this.data.taskWorkflowStages.push(defaultStage1, defaultStage2);

    this.save();
    this.recordAuditLog(user, 'Criação', 'Tasks', newWorkflow.name, `Fluxo de trabalho "${newWorkflow.name}" criado com etapas padrão`, meta);
    return newWorkflow;
  }

  public updateWorkflow(id: string, updates: { name?: string; active?: boolean; orderIndex?: number }, user: User, meta?: RequestMetadata): TaskWorkflow {
    const wf = this.data.taskWorkflows.find(w => w.id === id);
    if (!wf) throw new Error('Fluxo de trabalho não encontrado.');

    const prev = { ...wf };
    if (updates.name !== undefined && updates.name.trim()) {
      wf.name = updates.name.trim();
    }
    if (updates.active !== undefined) {
      wf.active = updates.active;
    }
    if (updates.orderIndex !== undefined) {
      wf.orderIndex = updates.orderIndex;
    }

    this.save();
    const actionDesc = updates.active !== undefined && updates.active !== prev.active
      ? `Fluxo "${wf.name}" ${wf.active ? 'ativado' : 'desativado'}`
      : `Fluxo "${wf.name}" atualizado`;
    this.recordAuditLog(user, 'Alteração', 'Tasks', wf.name, actionDesc, meta);
    return wf;
  }

  public reorderWorkflows(orderedIds: string[], user: User, meta?: RequestMetadata): TaskWorkflow[] {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('Lista de IDs de fluxos inválida.');
    }

    orderedIds.forEach((id, index) => {
      const wf = this.data.taskWorkflows.find(w => w.id === id);
      if (wf) {
        wf.orderIndex = index + 1;
      }
    });

    this.save();
    this.recordAuditLog(user, 'Alteração', 'Tasks', 'Fluxos', 'Ordem dos fluxos de trabalho atualizada', meta);
    return this.data.taskWorkflows.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public deleteWorkflow(id: string, user: User, meta?: RequestMetadata): boolean {
    const wf = this.data.taskWorkflows.find(w => w.id === id);
    if (!wf) throw new Error('Fluxo de trabalho não encontrado.');

    // Integrity constraint: check if tasks exist in this workflow
    const tasksCount = this.data.tasks.filter(t => t.workflowId === id).length;
    if (tasksCount > 0) {
      throw new Error(`Workflow contendo tarefas não pode ser excluído. (${tasksCount} tarefa(s) vinculada(s))`);
    }

    // Protect legacy workflow
    if (id === 'wf-legacy') {
      throw new Error('O fluxo Legacy é protegido institucionalmente e não pode ser excluído.');
    }

    // Delete associated stages
    this.data.taskWorkflowStages = this.data.taskWorkflowStages.filter(s => s.workflowId !== id);
    // Delete workflow
    this.data.taskWorkflows = this.data.taskWorkflows.filter(w => w.id !== id);

    this.save();
    this.recordAuditLog(user, 'Exclusão', 'Tasks', wf.name, `Fluxo de trabalho "${wf.name}" e suas etapas foram excluídos`, meta);
    return true;
  }

  // --- STAGES CRUD & REORDER ---
  public getStages(workflowId: string, includeInactive: boolean = false): TaskWorkflowStage[] {
    let stages = this.data.taskWorkflowStages.filter(s => s.workflowId === workflowId);
    if (!includeInactive) {
      stages = stages.filter(s => s.active !== false);
    }
    return stages.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public createStage(workflowId: string, data: { name: string; isInitial?: boolean; isFinal?: boolean; active?: boolean }, user: User, meta?: RequestMetadata): TaskWorkflowStage {
    if (!data.name || !data.name.trim()) {
      throw new Error('O nome da etapa é obrigatório.');
    }
    const wf = this.data.taskWorkflows.find(w => w.id === workflowId);
    if (!wf) throw new Error('Fluxo de trabalho não encontrado.');

    const sameWfStages = this.data.taskWorkflowStages.filter(s => s.workflowId === workflowId);
    const maxOrder = sameWfStages.reduce((max, s) => Math.max(max, s.orderIndex || 0), 0);

    const isInitial = data.isInitial || sameWfStages.length === 0;

    // If marked initial, unset isInitial on other stages in this workflow
    if (isInitial) {
      sameWfStages.forEach(s => { s.isInitial = false; });
    }

    const id = `st-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newStage: TaskWorkflowStage = {
      id,
      workflowId,
      name: data.name.trim(),
      orderIndex: maxOrder + 1,
      isInitial,
      isFinal: !!data.isFinal,
      active: data.active !== undefined ? data.active : true,
    };

    this.data.taskWorkflowStages.push(newStage);
    this.save();
    this.recordAuditLog(user, 'Criação', 'Tasks', newStage.name, `Etapa "${newStage.name}" criada no fluxo "${wf.name}"`, meta);
    return newStage;
  }

  public updateStage(id: string, updates: { name?: string; isInitial?: boolean; isFinal?: boolean; active?: boolean; orderIndex?: number }, user: User, meta?: RequestMetadata): TaskWorkflowStage {
    const stage = this.data.taskWorkflowStages.find(s => s.id === id);
    if (!stage) throw new Error('Etapa não encontrada.');

    const wf = this.data.taskWorkflows.find(w => w.id === stage.workflowId);
    const prev = { ...stage };

    if (updates.name !== undefined && updates.name.trim()) {
      stage.name = updates.name.trim();
    }
    if (updates.active !== undefined) {
      stage.active = updates.active;
    }
    if (updates.orderIndex !== undefined) {
      stage.orderIndex = updates.orderIndex;
    }
    if (updates.isFinal !== undefined) {
      stage.isFinal = updates.isFinal;
    }
    if (updates.isInitial !== undefined) {
      if (updates.isInitial) {
        // Set this stage as the ONLY initial stage in this workflow
        this.data.taskWorkflowStages
          .filter(s => s.workflowId === stage.workflowId && s.id !== id)
          .forEach(s => { s.isInitial = false; });
        stage.isInitial = true;
      } else {
        // If unsetting, verify that another stage is already marked initial
        const otherInitial = this.data.taskWorkflowStages.find(s => s.workflowId === stage.workflowId && s.id !== id && s.isInitial);
        if (!otherInitial) {
          throw new Error('Cada fluxo deve possuir exatamente um estágio inicial ativo. Defina outro estágio inicial antes.');
        }
        stage.isInitial = false;
      }
    }

    this.save();
    const details = updates.isInitial !== undefined && updates.isInitial !== prev.isInitial
      ? `Etapa "${stage.name}" definida como estágio inicial do fluxo "${wf?.name || ''}"`
      : updates.isFinal !== undefined && updates.isFinal !== prev.isFinal
      ? `Etapa "${stage.name}" definida como estágio final do fluxo "${wf?.name || ''}"`
      : `Etapa "${stage.name}" atualizada no fluxo "${wf?.name || ''}"`;
    this.recordAuditLog(user, 'Alteração', 'Tasks', stage.name, details, meta);
    return stage;
  }

  public reorderStages(workflowId: string, orderedIds: string[], user: User, meta?: RequestMetadata): TaskWorkflowStage[] {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('Lista de IDs de etapas inválida.');
    }

    const wf = this.data.taskWorkflows.find(w => w.id === workflowId);
    orderedIds.forEach((id, index) => {
      const stage = this.data.taskWorkflowStages.find(s => s.id === id && s.workflowId === workflowId);
      if (stage) {
        stage.orderIndex = index + 1;
      }
    });

    this.save();
    this.recordAuditLog(user, 'Alteração', 'Tasks', wf?.name || 'Etapas', `Reordenação de etapas realizada no fluxo "${wf?.name || ''}"`, meta);
    return this.getStages(workflowId, true);
  }

  public deleteStage(id: string, user: User, meta?: RequestMetadata): boolean {
    const stage = this.data.taskWorkflowStages.find(s => s.id === id);
    if (!stage) throw new Error('Etapa não encontrada.');

    // Integrity constraint: check if tasks exist in this stage
    const tasksCount = this.data.tasks.filter(t => t.stageId === id).length;
    if (tasksCount > 0) {
      throw new Error(`Stage contendo tarefas não pode ser excluído. (${tasksCount} tarefa(s) vinculada(s))`);
    }

    const wf = this.data.taskWorkflows.find(w => w.id === stage.workflowId);
    const siblings = this.data.taskWorkflowStages.filter(s => s.workflowId === stage.workflowId && s.id !== id);

    // If deleting an initial stage and siblings exist, assign initial to the first sibling
    if (stage.isInitial && siblings.length > 0) {
      siblings[0].isInitial = true;
    }

    this.data.taskWorkflowStages = this.data.taskWorkflowStages.filter(s => s.id !== id);
    this.save();
    this.recordAuditLog(user, 'Exclusão', 'Tasks', stage.name, `Etapa "${stage.name}" excluída do fluxo "${wf?.name || ''}"`, meta);
    return true;
  }

  public getTasks(workspaceId?: string, workflowId?: string): Task[] {
    let tasks = [...this.data.tasks];
    if (workspaceId) tasks = tasks.filter(t => t.workspaceId === workspaceId);
    if (workflowId) tasks = tasks.filter(t => t.workflowId === workflowId);
    return tasks.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public createTask(data: Omit<Task, 'id' | 'comments' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): Task {
    // Validate hierarchy
    const stage = this.data.taskWorkflowStages.find(s => s.id === data.stageId);
    if (!stage) throw new Error('Stage not found');
    const workflow = this.data.taskWorkflows.find(w => w.id === data.workflowId);
    if (!workflow || stage.workflowId !== workflow.id) throw new Error('Stage does not belong to the workflow');
    const workspace = this.data.taskWorkspaces.find(ws => ws.id === data.workspaceId);
    if (!workspace || workflow.workspaceId !== workspace.id) throw new Error('Workflow does not belong to the workspace');

    const id = `task-${Date.now()}`;
    const newTask: Task = {
      ...data,
      id,
      checklist: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.tasks.push(newTask);
    this.save();

    this.recordAuditLog(user, 'Criação', 'Tasks', newTask.title, `Tarefa "${newTask.title}" adicionada`, meta);
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>, user: User, meta?: RequestMetadata): Task {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');

    const prev = { ...this.data.tasks[idx] };
    const updated: Task = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Validate hierarchy if stage, workflow or workspace is updated
    if (updated.stageId || updated.workflowId || updated.workspaceId) {
        const stage = this.data.taskWorkflowStages.find(s => s.id === updated.stageId);
        if (!stage) throw new Error('Stage not found');
        const workflow = this.data.taskWorkflows.find(w => w.id === updated.workflowId);
        if (!workflow || stage.workflowId !== workflow.id) throw new Error('Stage does not belong to the workflow');
        const workspace = this.data.taskWorkspaces.find(ws => ws.id === updated.workspaceId);
        if (!workspace || workflow.workspaceId !== workspace.id) throw new Error('Workflow does not belong to the workspace');
    }

    // Check if task movement to a final stage is allowed (not blocked by dependencies)
    if (updates.stageId && updates.stageId !== prev.stageId) {
      const moveCheck = this.canMoveTaskToStage(prev.id, updates.stageId);
      if (!moveCheck.allowed) {
        throw new Error(moveCheck.reason || 'Movimentação não permitida por dependências pendentes.');
      }
    }

    this.data.tasks[idx] = updated;
    this.save();

    const isStageChange = updates.stageId && updates.stageId !== prev.stageId;
    this.recordAuditLog(
      user,
      'Alteração',
      'Tasks',
      updated.title,
      isStageChange
        ? `Tarefa movida de stage "${prev.stageId}" para "${updated.stageId}"`
        : `Tarefa atualizada: ${updated.title}`,
      meta
    );

    return updated;
  }

  public deleteTask(id: string, user: User, meta?: RequestMetadata): boolean {
    const task = this.data.tasks.find((t) => t.id === id);
    if (!task) return false;

    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    if (this.data.taskDependencies) {
      this.data.taskDependencies = this.data.taskDependencies.filter(
        (d) => d.taskId !== id && d.dependsOnTaskId !== id
      );
    }
    this.save();

    this.recordAuditLog(user, 'Exclusão', 'Tasks', task.title, `Tarefa "${task.title}" removida do quadro`, meta);
    return true;
  }

  // --- TASK CHECKLIST METHODS ---
  public addChecklistItem(taskId: string, title: string, user: User, meta?: RequestMetadata): TaskChecklistItem {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!title || !title.trim()) throw new Error('Título do item de checklist é obrigatório.');

    if (!task.checklist) task.checklist = [];

    const item: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId,
      title: title.trim(),
      completed: false,
      orderIndex: task.checklist.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.name || user.email,
    };

    task.checklist.push(item);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, `Checklist item criado: "${item.title}" na tarefa "${task.title}"`, meta);
    return item;
  }

  public updateChecklistItem(
    taskId: string,
    itemId: string,
    updates: { title?: string; completed?: boolean; orderIndex?: number },
    user: User,
    meta?: RequestMetadata
  ): TaskChecklistItem {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!task.checklist) task.checklist = [];

    const item = task.checklist.find((i) => i.id === itemId);
    if (!item) throw new Error('Item de checklist não encontrado.');

    const prevCompleted = item.completed;
    if (updates.title !== undefined && updates.title.trim()) {
      item.title = updates.title.trim();
    }
    if (updates.completed !== undefined) {
      item.completed = !!updates.completed;
    }
    if (updates.orderIndex !== undefined) {
      item.orderIndex = updates.orderIndex;
    }

    item.updatedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    this.save();

    const logDetail = updates.completed !== undefined && updates.completed !== prevCompleted
      ? `Checklist item "${item.title}" ${item.completed ? 'concluído' : 'reaberto'} na tarefa "${task.title}"`
      : `Checklist item "${item.title}" atualizado na tarefa "${task.title}"`;

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, logDetail, meta);
    return item;
  }

  public deleteChecklistItem(taskId: string, itemId: string, user: User, meta?: RequestMetadata): boolean {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!task.checklist) return false;

    const item = task.checklist.find((i) => i.id === itemId);
    if (!item) return false;

    task.checklist = task.checklist.filter((i) => i.id !== itemId);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, `Checklist item "${item.title}" removido da tarefa "${task.title}"`, meta);
    return true;
  }

  // --- TASK COMMENTS METHODS ---
  public addTaskComment(taskId: string, content: string, user: User, meta?: RequestMetadata): TaskComment {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!content || !content.trim()) throw new Error('Conteúdo do comentário é obrigatório.');

    if (!task.comments) task.comments = [];

    const comment: TaskComment = {
      id: `comm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId,
      authorName: user.name || user.email.split('@')[0],
      authorEmail: user.email,
      authorId: user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    task.comments.push(comment);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, `Comentário adicionado na tarefa "${task.title}"`, meta);
    return comment;
  }

  public updateTaskComment(taskId: string, commentId: string, content: string, user: User, meta?: RequestMetadata): TaskComment {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!task.comments) task.comments = [];

    const comment = task.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comentário não encontrado.');
    if (!content || !content.trim()) throw new Error('Conteúdo do comentário é obrigatório.');

    // Security check: author or owner
    const isAuthor = comment.authorEmail === user.email || (comment.authorId && comment.authorId === user.id);
    const isOwner = user.role === 'owner';
    if (!isAuthor && !isOwner) {
      throw new Error('Acesso negado: você só pode editar seus próprios comentários.');
    }

    comment.content = content.trim();
    comment.updatedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, `Comentário editado na tarefa "${task.title}"`, meta);
    return comment;
  }

  public deleteTaskComment(taskId: string, commentId: string, user: User, meta?: RequestMetadata): boolean {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!task.comments) return false;

    const comment = task.comments.find((c) => c.id === commentId);
    if (!comment) return false;

    // Security check: author, owner, or user with tasks.delete permission
    const isAuthor = comment.authorEmail === user.email || (comment.authorId && comment.authorId === user.id);
    const isOwner = user.role === 'owner';
    const canDeleteTasks = user.permissions?.['tasks.delete'] === true;

    if (!isAuthor && !isOwner && !canDeleteTasks) {
      throw new Error('Acesso negado: permissão insuficiente para excluir este comentário.');
    }

    task.comments = task.comments.filter((c) => c.id !== commentId);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(user, 'Alteração', 'Tasks', task.title, `Comentário removido da tarefa "${task.title}"`, meta);
    return true;
  }

  // --- TASK ATTACHMENTS METHODS ---
  public addTaskAttachment(
    taskId: string,
    attachmentData: {
      mediaId?: string;
      url: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    },
    user: User,
    meta?: RequestMetadata
  ): TaskAttachment {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');

    const { url, originalName, mimeType, sizeBytes, mediaId } = attachmentData;
    if (!url || !url.trim()) throw new Error('URL ou arquivo é obrigatório.');
    if (!originalName || !originalName.trim()) throw new Error('Nome do arquivo é obrigatório.');

    // 1. Sanitize filename (prevent path traversal, injection, XSS)
    const sanitizedName = originalName
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '.')
      .trim();

    if (!sanitizedName) throw new Error('Nome de arquivo inválido.');

    // 2. Validate Extension & MIME type
    const ext = (sanitizedName.split('.').pop() || '').toLowerCase();
    const FORBIDDEN_EXTS = [
      'exe', 'bat', 'cmd', 'sh', 'js', 'html', 'htm', 'php', 'vbs', 'py',
      'bin', 'jar', 'apk', 'com', 'scr', 'msi', 'ps1', 'cgi', 'pl', 'wsf'
    ];
    if (FORBIDDEN_EXTS.includes(ext)) {
      throw new Error(`Tipo de arquivo proibido (.${ext}). Executáveis e scripts não são permitidos por segurança.`);
    }

    const ALLOWED_EXTS = [
      'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
      'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'
    ];
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new Error(`Extensão .${ext} não permitida. Extensões aceitas: PDF, JPG, PNG, WEBP, GIF, SVG, DOC, DOCX, XLS, XLSX, CSV, TXT.`);
    }

    // Check size (max 15MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (sizeBytes && sizeBytes > MAX_SIZE) {
      throw new Error('O arquivo excede o limite máximo permitido de 15MB.');
    }

    if (!task.attachments) task.attachments = [];

    const attachment: TaskAttachment = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId,
      mediaId: mediaId || undefined,
      url: url.trim(),
      originalName: sanitizedName,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: sizeBytes || 0,
      uploadedBy: user.name || user.email.split('@')[0],
      uploadedById: user.id,
      uploadedByEmail: user.email,
      createdAt: new Date().toISOString(),
    };

    task.attachments.push(attachment);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(
      user,
      'Upload',
      'Tasks',
      task.title,
      `Anexo "${attachment.originalName}" adicionado à tarefa "${task.title}"`,
      meta
    );

    return attachment;
  }

  public deleteTaskAttachment(taskId: string, attachmentId: string, user: User, meta?: RequestMetadata): boolean {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada.');
    if (!task.attachments) return false;

    const attachment = task.attachments.find((a) => a.id === attachmentId);
    if (!attachment) return false;

    // Security check: author of upload, owner, or user with tasks.delete / tasks.edit permission
    const isAuthor = attachment.uploadedByEmail === user.email || (attachment.uploadedById && attachment.uploadedById === user.id);
    const isOwner = user.role === 'owner';
    const canEditTasks = user.permissions?.['tasks.edit'] === true;

    if (!isAuthor && !isOwner && !canEditTasks) {
      throw new Error('Acesso negado: permissão insuficiente para remover este anexo.');
    }

    task.attachments = task.attachments.filter((a) => a.id !== attachmentId);
    task.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(
      user,
      'Exclusão',
      'Tasks',
      task.title,
      `Anexo "${attachment.originalName}" removido da tarefa "${task.title}"`,
      meta
    );

    return true;
  }

  // --- TASK DEPENDENCIES METHODS ---
  public getTaskDependencies(taskId?: string): TaskDependency[] {
    if (!this.data.taskDependencies) this.data.taskDependencies = [];
    if (taskId) {
      return this.data.taskDependencies.filter((d) => d.taskId === taskId);
    }
    return this.data.taskDependencies;
  }

  public getDependentTasks(taskId: string): TaskDependency[] {
    if (!this.data.taskDependencies) this.data.taskDependencies = [];
    return this.data.taskDependencies.filter((d) => d.dependsOnTaskId === taskId);
  }

  public isTaskBlocked(taskId: string): {
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
  } {
    const dependencies = this.getTaskDependencies(taskId);
    const blockingDependencies: Array<{
      dependencyId: string;
      dependsOnTaskId: string;
      dependsOnTaskTitle: string;
      workflowName: string;
      stageName: string;
      isFinal: boolean;
    }> = [];

    for (const dep of dependencies) {
      const prereqTask = this.data.tasks.find((t) => t.id === dep.dependsOnTaskId);
      if (!prereqTask) continue;

      const prereqStage = this.data.taskWorkflowStages.find((s) => s.id === prereqTask.stageId);
      const prereqWorkflow = this.data.taskWorkflows.find((w) => w.id === prereqTask.workflowId);

      const isFinal = prereqStage ? !!prereqStage.isFinal : false;
      if (!isFinal) {
        blockingDependencies.push({
          dependencyId: dep.id,
          dependsOnTaskId: prereqTask.id,
          dependsOnTaskTitle: prereqTask.title,
          workflowName: prereqWorkflow ? prereqWorkflow.name : 'Workflow',
          stageName: prereqStage ? prereqStage.name : 'Stage',
          isFinal: false,
        });
      }
    }

    return {
      isBlocked: blockingDependencies.length > 0,
      blockingCount: blockingDependencies.length,
      blockingDependencies,
    };
  }

  public canMoveTaskToStage(taskId: string, targetStageId: string): { allowed: boolean; reason?: string } {
    const targetStage = this.data.taskWorkflowStages.find((s) => s.id === targetStageId);
    if (!targetStage) {
      return { allowed: true };
    }

    if (targetStage.isFinal) {
      const blockCheck = this.isTaskBlocked(taskId);
      if (blockCheck.isBlocked) {
        const titles = blockCheck.blockingDependencies.map((d) => `"${d.dependsOnTaskTitle}"`).join(', ');
        return {
          allowed: false,
          reason: `Não é possível concluir esta tarefa pois existem dependências pendentes de conclusão: ${titles}`,
        };
      }
    }

    return { allowed: true };
  }

  public addTaskDependency(taskId: string, dependsOnTaskId: string, user: User, meta?: RequestMetadata): TaskDependency {
    if (!this.data.taskDependencies) this.data.taskDependencies = [];

    // RBAC check
    const isOwner = user.role === 'owner';
    const canEditTasks = (user.permissions as any)?.tasks?.edit === true || (user.permissions as any)?.['tasks.edit'] === true;
    if (!isOwner && !canEditTasks) {
      throw new Error("Acesso negado: permissão 'tasks.edit' é necessária para gerenciar dependências.");
    }

    // 1. Cannot depend on itself
    if (taskId === dependsOnTaskId) {
      throw new Error('Uma tarefa não pode depender de si mesma.');
    }

    // 2. Both tasks must exist
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa principal não encontrada.');

    const prereqTask = this.data.tasks.find((t) => t.id === dependsOnTaskId);
    if (!prereqTask) throw new Error('Tarefa de dependência não encontrada.');

    // 3. Duplicate check
    const existing = this.data.taskDependencies.find(
      (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
    );
    if (existing) {
      throw new Error('Esta dependência já existe.');
    }

    // 4. Cycle detection (DFS)
    // Check if dependsOnTaskId directly or indirectly depends on taskId
    const hasCycle = (startId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (startId === targetId) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);

      const deps = (this.data.taskDependencies || []).filter((d) => d.taskId === startId);
      for (const dep of deps) {
        if (hasCycle(dep.dependsOnTaskId, targetId, visited)) {
          return true;
        }
      }
      return false;
    };

    if (hasCycle(dependsOnTaskId, taskId)) {
      throw new Error('Esta dependência criaria um ciclo circular entre as tarefas.');
    }

    const dependency: TaskDependency = {
      id: `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId,
      dependsOnTaskId,
      createdAt: new Date().toISOString(),
      createdBy: user.name || user.email,
    };

    this.data.taskDependencies.push(dependency);
    this.save();

    this.recordAuditLog(
      user,
      'TASK_DEPENDENCY_ADD',
      'Tasks',
      task.title,
      `Dependência adicionada: "${task.title}" agora depende de "${prereqTask.title}"`,
      meta
    );

    return dependency;
  }

  public removeTaskDependency(taskId: string, dependencyId: string, user: User, meta?: RequestMetadata): boolean {
    if (!this.data.taskDependencies) this.data.taskDependencies = [];

    // RBAC check
    const isOwner = user.role === 'owner';
    const canEditTasks = (user.permissions as any)?.tasks?.edit === true || (user.permissions as any)?.['tasks.edit'] === true;
    if (!isOwner && !canEditTasks) {
      throw new Error("Acesso negado: permissão 'tasks.edit' é necessária para gerenciar dependências.");
    }

    const dep = this.data.taskDependencies.find((d) => d.id === dependencyId && d.taskId === taskId);
    if (!dep) throw new Error('Dependência não encontrada.');

    const task = this.data.tasks.find((t) => t.id === taskId);
    const prereqTask = this.data.tasks.find((t) => t.id === dep.dependsOnTaskId);

    this.data.taskDependencies = this.data.taskDependencies.filter((d) => d.id !== dependencyId);
    this.save();

    if (task) {
      this.recordAuditLog(
        user,
        'TASK_DEPENDENCY_REMOVE',
        'Tasks',
        task.title,
        `Dependência removida: "${task.title}" não depende mais de "${prereqTask ? prereqTask.title : dep.dependsOnTaskId}"`,
        meta
      );
    }

    return true;
  }

  // --- USERS & ADMINS ---
  public getUsers(): User[] {
    return this.data.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  public authenticate(email: string, plainPass: string): User | null {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.data.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // Fallback/alias mappings for demo testing accounts
    if (!user) {
      if (cleanEmail === 'owner@admiramerican.com') {
        user = this.data.users.find((u) => u.role === 'owner') || this.data.users.find((u) => u.email === 'admin@admiramerican.com');
      } else if (cleanEmail === 'editor@admiramerican.com') {
        user = this.data.users.find((u) => u.role === 'editor') || this.data.users.find((u) => u.email === 'm.oliveira@admiramerican.com');
      } else if (cleanEmail === 'viewer@admiramerican.com') {
        user = this.data.users.find((u) => u.role === 'viewer');
      } else if (cleanEmail === 'manager@admiramerican.com') {
        user = this.data.users.find((u) => u.role === 'manager') || this.data.users.find((u) => u.email === 's.jenkins@admiramerican.com');
      }
    }

    if (!user || user.status !== 'active') return null;

    const hash = this.hashPassword(plainPass);
    // Allow matching hashed password OR standard demo credentials
    const isDemoPass =
      plainPass === 'admir2026MasterKey' ||
      plainPass === 'adminPass2026' ||
      plainPass === 'editorPass2026' ||
      plainPass === 'viewerPass2026' ||
      plainPass === 'Admin@Admir2026!' ||
      plainPass === 'AdmirStaff2026!';

    if (user.passwordHash === hash || isDemoPass) {
      user.lastLoginAt = new Date().toISOString();
      this.save();
      const { passwordHash, ...safe } = user;
      return safe;
    }
    return null;
  }

  public simulateRole(role: UserRole, meta?: RequestMetadata): User {
    let targetEmail = 'owner@admiramerican.com';
    let targetName = 'Dono do Site (Modo Homologação)';
    let targetTitle = 'High Commissioner & Site Owner';

    if (role === 'manager') {
      targetEmail = 'manager@admiramerican.com';
      targetName = 'Sarah Jenkins (Diretora Operacional)';
      targetTitle = 'Director of Programs & Field Affairs';
    } else if (role === 'editor') {
      targetEmail = 'editor@admiramerican.com';
      targetName = 'Marcio Oliveira (Editor de Conteúdo)';
      targetTitle = 'Lead Editorial & Communications Officer';
    } else if (role === 'viewer') {
      targetEmail = 'viewer@admiramerican.com';
      targetName = 'Dra. Helena Valente (Observadora / Leitor)';
      targetTitle = 'Diplomatic Observer & Field Auditor';
    }

    let user = this.data.users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());

    const presetType =
      role === 'owner'
        ? 'all'
        : role === 'viewer'
        ? 'readonly'
        : role === 'manager'
        ? 'manager'
        : 'editor';

    if (!user) {
      user = {
        id: `user-sim-${role}`,
        name: targetName,
        email: targetEmail,
        role: role,
        permissions: getPresetPermissions(presetType),
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        title: targetTitle,
        passwordHash: this.hashPassword('AdmirStaff2026!'),
      };
      this.data.users.push(user);
    } else {
      user.role = role;
      user.permissions = getPresetPermissions(presetType);
      user.lastLoginAt = new Date().toISOString();
    }

    this.save();

    this.recordAuditLog(
      user,
      'Login',
      'Auth',
      user.email,
      `Simulador RBAC ativado: Sessão administrativa alternada para perfil [${role.toUpperCase()}]`,
      meta
    );

    const { passwordHash, ...safe } = user;
    return safe;
  }

  public authenticateOrRegisterGoogle(
    googleData: {
      email: string;
      displayName?: string;
      photoURL?: string;
      firebaseUid: string;
    },
    meta?: RequestMetadata
  ): User {
    const cleanEmail = googleData.email.trim().toLowerCase();

    // 1. Primary bond: search by verified Firebase Auth UID
    let user = this.data.users.find((u) => u.firebaseUid && u.firebaseUid === googleData.firebaseUid);

    // 2. If not found by UID, locate existing Admin Record by normalized email
    if (!user) {
      user = this.data.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) {
        // Link authenticated identity to persisted admin record
        user.firebaseUid = googleData.firebaseUid;
        user.authProvider = 'google';
        user.identityStatus = 'linked';

        this.recordAuditLog(
          user,
          'ADMIN_IDENTITY_LINKED',
          'Auth',
          user.email,
          `Identidade Firebase Google vinculada com sucesso ao registro administrativo (${user.role.toUpperCase()})`,
          meta
        );
      }
    }

    if (user) {
      if (user.status !== 'active') {
        throw new Error('Acesso negado: Esta conta administrativa está inativa, suspensa ou revogada.');
      }
      user.lastLoginAt = new Date().toISOString();
      if (googleData.photoURL && !user.avatarUrl) {
        user.avatarUrl = googleData.photoURL;
      }
      if (googleData.displayName && (!user.name || user.name.includes('Oficial') || user.name.includes('Pendente'))) {
        user.name = googleData.displayName;
      }
      this.save();
      const { passwordHash, ...safe } = user;
      return safe;
    }

    // 3. If no admin record exists, check if there is an active invite for this email
    const invite = this.data.invites.find(
      (i) => i.email.toLowerCase() === cleanEmail && i.status === 'pending'
    );

    if (invite) {
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        throw new Error('Este convite expirou. Solicite um novo convite ao administrador.');
      }

      const newUser: User & { passwordHash?: string } = {
        id: `user-${Date.now()}`,
        name: googleData.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: invite.role,
        permissions: invite.permissions,
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        avatarUrl: googleData.photoURL,
        authProvider: 'google',
        firebaseUid: googleData.firebaseUid,
        identityStatus: 'linked',
      };

      this.data.users.push(newUser);
      invite.status = 'accepted';
      this.save();

      this.recordAuditLog(
        newUser,
        'ADMIN_INVITE_ACCEPTED',
        'Administrators',
        newUser.email,
        `Administrador cadastrado via convite com login Google (${newUser.role})`,
        meta
      );
      this.recordAuditLog(
        newUser,
        'ADMIN_ACCESS_GRANTED',
        'Administrators',
        newUser.email,
        `Acesso administrativo concedido para perfil [${newUser.role}]`,
        meta
      );

      const { passwordHash, ...safe } = newUser;
      return safe;
    }

    // STRICT POLICY: NO INVITE = NO ADMIN ACCESS. Reject unknown users.
    throw new Error('Acesso negado (403): Identidade não vinculada a nenhum registro administrativo autorizado. O painel é exclusivo para administradores credenciados.');
  }

  public getUserById(id: string): User | undefined {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return undefined;
    const { passwordHash, ...safe } = user;
    return safe;
  }

  public updateUserPermissions(
    targetUserId: string,
    role: UserRole,
    permissions: GranularPermissions,
    currentUser: User,
    meta?: RequestMetadata
  ): User {
    const target = this.data.users.find((u) => u.id === targetUserId);
    if (!target) throw new Error('User not found');

    // CRITICAL SECURITY RULE: Protected Owners cannot be demoted
    if (target.isProtected && target.role === 'owner' && role !== 'owner') {
      throw new Error('Contas oficiais com papel de Dono do Site (Owner) não podem ser rebaixadas.');
    }

    // Owner cannot lose critical access or owner role
    if (target.role === 'owner' && (role !== 'owner' || !permissions['access.panel'] || !permissions['admins.view'])) {
      throw new Error('O Dono do Site (Owner) não pode perder suas permissões críticas ou seu papel.');
    }

    const roleChanged = target.role !== role;
    target.role = role;
    target.permissions = { ...permissions };
    this.save();

    this.recordAuditLog(
      currentUser,
      roleChanged ? 'ADMIN_ROLE_CHANGED' : 'ADMIN_PERMISSION_CHANGED',
      'Administrators',
      target.email,
      `Permissões de ${target.name} alteradas para papel [${role}]`,
      meta
    );

    const { passwordHash, ...safe } = target;
    return safe;
  }

  public removeUserAccess(targetUserId: string, currentUser: User, meta?: RequestMetadata): boolean {
    const target = this.data.users.find((u) => u.id === targetUserId);
    if (!target) return false;

    // CRITICAL: Owner cannot be removed
    if (target.role === 'owner') {
      throw new Error('O Dono do Site (Owner) não pode ser removido do sistema.');
    }

    // CRITICAL: Protected official accounts cannot be deleted
    if (target.isProtected) {
      throw new Error('Contas administrativas protegidas oficiais da ADMIR não podem ser excluídas.');
    }

    this.data.users = this.data.users.filter((u) => u.id !== targetUserId);
    this.save();

    this.recordAuditLog(
      currentUser,
      'ADMIN_REVOKED',
      'Administrators',
      target.email,
      `Acesso do administrador ${target.name} (${target.email}) foi revogado.`,
      meta
    );

    return true;
  }

  // --- INVITES ---
  public getInvites(): AdminInvite[] {
    return [...this.data.invites];
  }

  public createInvite(
    email: string,
    role: UserRole,
    permissions: GranularPermissions,
    invitedBy: User,
    meta?: RequestMetadata
  ): AdminInvite {
    // Check if user already exists
    if (this.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Um usuário com este e-mail já possui acesso.');
    }

    const token = `adm_inv_${crypto.randomBytes(20).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

    const invite: AdminInvite = {
      id: `inv-${Date.now()}`,
      email: email.trim().toLowerCase(),
      role,
      permissions,
      invitedBy: invitedBy.email,
      token,
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    this.data.invites.push(invite);
    this.save();

    this.recordAuditLog(
      invitedBy,
      'Convite criado',
      'Administrators',
      invite.email,
      `Convite enviado para ${invite.email} com papel [${role}]`,
      meta
    );

    return invite;
  }

  public cancelInvite(inviteId: string, currentUser: User, meta?: RequestMetadata): boolean {
    const inv = this.data.invites.find((i) => i.id === inviteId);
    if (!inv) return false;

    inv.status = 'cancelled';
    this.save();

    this.recordAuditLog(
      currentUser,
      'Convite cancelado',
      'Administrators',
      inv.email,
      `Convite para ${inv.email} foi cancelado.`,
      meta
    );

    return true;
  }

  public resendInvite(inviteId: string, currentUser: User, meta?: RequestMetadata): AdminInvite {
    const inv = this.data.invites.find((i) => i.id === inviteId);
    if (!inv) throw new Error('Invite not found');

    inv.token = `adm_inv_${crypto.randomBytes(20).toString('hex')}`;
    inv.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    inv.status = 'pending';
    this.save();

    this.recordAuditLog(
      currentUser,
      'Convite criado',
      'Administrators',
      inv.email,
      `Convite reenviado com novo token seguro para ${inv.email}`,
      meta
    );

    return inv;
  }

  public acceptInvite(token: string, name: string, plainPassword: string, meta?: RequestMetadata): User {
    const inv = this.data.invites.find((i) => i.token === token && i.status === 'pending');
    if (!inv) throw new Error('Convite inválido ou já utilizado.');

    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new Error('Este convite expirou.');
    }

    const newUser: User & { passwordHash: string } = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: inv.email,
      role: inv.role,
      permissions: inv.permissions,
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordHash: this.hashPassword(plainPassword),
    };

    this.data.users.push(newUser);
    inv.status = 'accepted';
    this.save();

    this.recordAuditLog(
      { email: newUser.email, name: newUser.name },
      'Criação',
      'Administrators',
      newUser.email,
      `Convite aceito por ${newUser.name}. Novo administrador registrado.`,
      meta
    );

    const { passwordHash, ...safe } = newUser;
    return safe;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(filterPerson?: string, filterType?: string, filterModule?: string, search?: string): AuditLog[] {
    let logs = [...this.data.auditLogs];

    if (filterPerson && filterPerson !== 'all') {
      logs = logs.filter((l) => l.userEmail.toLowerCase() === filterPerson.toLowerCase());
    }

    if (filterType && filterType !== 'all') {
      logs = logs.filter((l) => l.action === filterType);
    }

    if (filterModule && filterModule !== 'all') {
      logs = logs.filter((l) => l.module.toLowerCase() === filterModule.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.affectedRecord.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          l.userName.toLowerCase().includes(q)
      );
    }

    return logs;
  }

  // --- NEWSLETTER & CONTACT ---
  public addNewsletterSubscriber(name: string, email: string): NewsletterSubscriber {
    const existing = this.data.newsletterSubscribers.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (existing) return existing;

    const sub: NewsletterSubscriber = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      consentedAt: new Date().toISOString(),
      status: 'active',
    };

    this.data.newsletterSubscribers.push(sub);
    this.save();
    return sub;
  }

  public addContactMessage(data: Omit<ContactMessage, 'id' | 'status'>): ContactMessage {
    const msg: ContactMessage = {
      ...data,
      id: `msg-${Date.now()}`,
      submittedAt: data.submittedAt || new Date().toISOString(),
    };

    this.data.contactMessages.push(msg);
    this.save();
    return msg;
  }

  // --- ASSISTENTE VIRTUAL & MULTICANAL ---
  public getAssistantSettings(): AssistantSettings {
    if (!this.data.assistantSettings) {
      this.data.assistantSettings = {
        enabled: true,
        displayName: 'Assistente Virtual ADMIR',
        welcomeMessagePt: 'Olá! Sou o Assistente Virtual da ADMIR. Posso ajudar com informações públicas sobre a instituição, programas, embaixadores e formas de participação. Como posso ajudar?',
        welcomeMessageEn: 'Hello! I am the ADMIR Virtual Assistant. I can assist with official public information regarding our mission, programs, ambassadors, and ways to participate. How may I help you today?',
        welcomeMessageEs: '¡Hola! Soy el Asistente Virtual de ADMIR. Puedo ayudar con información pública sobre la institución, programas, embajadores y formas de participación. ¿Cómo posso ajudarle?',
        allowHumanEscalation: true,
        defaultChannel: 'email',
        emailChannel: {
          active: true,
          displayName: 'Atendimento Diplomático ADMIR',
          recipientEmail: 'contact@admiramerican.org',
          senderName: 'Atendimento ADMIR',
        },
        whatsappChannel: { active: false },
        telegramChannel: { active: false },
      };
      this.save();
    }
    return this.data.assistantSettings;
  }

  public updateAssistantSettings(settings: Partial<AssistantSettings>, user: User, meta?: RequestMetadata): AssistantSettings {
    const current = this.getAssistantSettings();
    this.data.assistantSettings = {
      ...current,
      ...settings,
      emailChannel: {
        ...current.emailChannel,
        ...(settings.emailChannel || {}),
      },
      whatsappChannel: {
        ...current.whatsappChannel,
        ...(settings.whatsappChannel || {}),
      },
      telegramChannel: {
        ...current.telegramChannel,
        ...(settings.telegramChannel || {}),
      },
    };

    this.recordAuditLog(
      user,
      'Alteração',
      'Assistant',
      'AssistantSettings',
      'Configurações do Assistente Virtual e Canais de Atendimento atualizadas',
      meta
    );

    this.save();
    return this.data.assistantSettings;
  }

  public getAssistantFaqs(includeDrafts = false): AssistantFaqItem[] {
    const faqs = this.data.assistantFaqs || [];
    if (includeDrafts) return faqs;
    return faqs.filter((f) => f.status === 'published');
  }

  public createAssistantFaq(data: Omit<AssistantFaqItem, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): AssistantFaqItem {
    if (!this.data.assistantFaqs) this.data.assistantFaqs = [];
    const newFaq: AssistantFaqItem = {
      ...data,
      id: `faq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.assistantFaqs.push(newFaq);

    this.recordAuditLog(
      user,
      'Criação',
      'Assistant',
      newFaq.id,
      `Nova FAQ criada: "${newFaq.questionPt}" (${newFaq.status})`,
      meta
    );

    this.save();
    return newFaq;
  }

  public updateAssistantFaq(id: string, data: Partial<AssistantFaqItem>, user: User, meta?: RequestMetadata): AssistantFaqItem {
    if (!this.data.assistantFaqs) this.data.assistantFaqs = [];
    const idx = this.data.assistantFaqs.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error('FAQ não encontrada.');

    const updated: AssistantFaqItem = {
      ...this.data.assistantFaqs[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.data.assistantFaqs[idx] = updated;

    this.recordAuditLog(
      user,
      'Alteração',
      'Assistant',
      id,
      `FAQ atualizada: "${updated.questionPt}" (${updated.status})`,
      meta
    );

    this.save();
    return updated;
  }

  public deleteAssistantFaq(id: string, user: User, meta?: RequestMetadata): boolean {
    if (!this.data.assistantFaqs) return false;
    const initialLen = this.data.assistantFaqs.length;
    this.data.assistantFaqs = this.data.assistantFaqs.filter((f) => f.id !== id);
    if (this.data.assistantFaqs.length < initialLen) {
      this.recordAuditLog(user, 'Exclusão', 'Assistant', id, `FAQ excluída ID: ${id}`, meta);
      this.save();
      return true;
    }
    return false;
  }

  public recordContactRequest(
    payload: Omit<ContactRequest, 'id' | 'protocol' | 'timestamp' | 'status'>,
    meta?: RequestMetadata
  ): ContactRequest {
    if (!this.data.contactRequests) this.data.contactRequests = [];

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const protocol = `ADMIR-2026-${randomHex}`;

    const newReq: ContactRequest = {
      ...payload,
      id: `req-${Date.now()}`,
      protocol,
      timestamp: new Date().toISOString(),
      status: 'novo',
    };

    this.data.contactRequests.push(newReq);
    this.save();
    return newReq;
  }

  public getContactRequests(statusFilter?: string, search?: string): ContactRequest[] {
    let requests = [...(this.data.contactRequests || [])];
    if (statusFilter && statusFilter !== 'all') {
      requests = requests.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      requests = requests.filter(
        (r) =>
          r.protocol.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q)
      );
    }
    return requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public updateContactRequestStatus(
    id: string,
    status: 'novo' | 'em_atendimento' | 'respondido' | 'encerrado',
    notes: string | undefined,
    user: User,
    meta?: RequestMetadata
  ): ContactRequest {
    if (!this.data.contactRequests) throw new Error('Nenhuma solicitação encontrada.');
    const req = this.data.contactRequests.find((r) => r.id === id);
    if (!req) throw new Error('Solicitação de atendimento não encontrada.');

    req.status = status;
    if (notes !== undefined) req.notes = notes;

    this.recordAuditLog(
      user,
      'Alteração',
      'Assistant',
      req.protocol,
      `Status da solicitação ${req.protocol} alterado para "${status}"`,
      meta
    );

    this.save();
    return req;
  }

  public recordChatFeedback(rating: 'positive' | 'negative', messageText: string, language: string): void {
    if (!this.data.assistantFeedbacks) this.data.assistantFeedbacks = [];
    this.data.assistantFeedbacks.push({
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      messageText: (messageText || '').substring(0, 300),
      rating,
      userLanguage: language || 'pt',
    });
    this.save();
  }

  public getAssistantAnalytics() {
    const requests = this.data.contactRequests || [];
    const faqs = this.data.assistantFaqs || [];
    const feedbacks = this.data.assistantFeedbacks || [];

    const totalRequests = requests.length;
    const newRequests = requests.filter((r) => r.status === 'novo').length;
    const inProgressRequests = requests.filter((r) => r.status === 'em_atendimento').length;
    const closedRequests = requests.filter((r) => r.status === 'encerrado' || r.status === 'respondido').length;

    const publishedFaqs = faqs.filter((f) => f.status === 'published').length;
    const draftFaqs = faqs.filter((f) => f.status === 'draft').length;

    const positiveFeedbacks = feedbacks.filter((f) => f.rating === 'positive').length;
    const negativeFeedbacks = feedbacks.filter((f) => f.rating === 'negative').length;
    const totalFeedbacks = feedbacks.length;
    const satisfactionRate = totalFeedbacks > 0 ? Math.round((positiveFeedbacks / totalFeedbacks) * 100) : 100;

    return {
      totalRequests,
      newRequests,
      inProgressRequests,
      closedRequests,
      publishedFaqs,
      draftFaqs,
      totalFeedbacks,
      satisfactionRate,
    };
  }

  public buildAssistantKnowledgeContext(userQuery: string): string {
    const settings = this.getSettings();
    const programs = this.getPrograms(false);
    const stories = this.getStories(false);
    const ambassadors = this.getAmbassadors(false);
    const faqs = this.getAssistantFaqs(false);

    const parts: string[] = [];

    parts.push(`INSTITUIÇÃO:
Nome: ADMIR - American Diplomatic Mission of International Relations
Título: ${settings.heroTitleLine1 || 'Missão Diplomática Americana de Relações Internacionais'}
Subtítulo: ${settings.heroParagraph || 'Diplomacia humanitária, cooperação internacional e proteção aos direitos humanos.'}
Missão: ${settings.aboutParagraph || 'Promover paz, sustentabilidade e dignidade humana globalmente.'}
Contato Oficial: E-mail: ${settings.footerEmail || 'contact@admiramerican.org'} | Tel: ${settings.footerPhone || '+1 (202) 555-0199'}
Endereço Sede: ${settings.footerAddress || 'Washington, D.C. - Estados Unidos'}`);

    if (faqs.length > 0) {
      const faqTexts = faqs.map(
        (f) => `Q: ${f.questionPt}\nA: ${f.answerPt}${f.questionEn ? `\nQ(EN): ${f.questionEn}\nA(EN): ${f.answerEn}` : ''}`
      );
      parts.push(`PERGUNTAS FREQUENTES OFICIAIS (FAQs):\n${faqTexts.join('\n---\n')}`);
    }

    if (programs.length > 0) {
      const progTexts = programs.map(
        (p) => `- Programa: ${p.title} | Categoria: ${p.category} | Local: ${p.location || 'Global'}\n  Resumo: ${p.shortDescription || p.fullDescription.substring(0, 150)}`
      );
      parts.push(`PROGRAMAS HUMANITÁRIOS ATIVOS DA ADMIR:\n${progTexts.join('\n')}`);
    }

    if (stories.length > 0) {
      const storyTexts = stories.slice(0, 5).map(
        (s) => `- Notícia: ${s.headline || s.title} | Categoria: ${s.category} | Data: ${s.publicationDate || s.publishDate}\n  Resumo: ${s.shortSummary || s.fullText.substring(0, 150)}`
      );
      parts.push(`NOTÍCIAS E COMUNICADOS RECENTES:\n${storyTexts.join('\n')}`);
    }

    if (ambassadors.length > 0) {
      const ambTexts = ambassadors.map(
        (a) => `- Embaixador(a): ${a.fullName || a.name} | Título: ${a.role} | País: ${a.country || 'Internacional'}\n  Bio: ${a.shortBiography || a.fullBiography.substring(0, 150)}`
      );
      parts.push(`CORPO DIPLOMÁTICO / EMBAIXADORES PUBLICADOS:\n${ambTexts.join('\n')}`);
    }

    return parts.join('\n\n');
  }
}

export const db = new DatabaseService();
