import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { compareMediaAssets, generateDuplicateRecommendation } from './duplicateDetector';
import {
  validateCPF,
  validateEmail,
  validateBirthDate,
  sanitizeRG_DNI,
  sanitizePassport,
} from '../utils/validation';
import {
  SiteSettings,
  Program,
  Story,
  Ambassador,
  PrivateDocument,
  DocumentValidationRecord,
  MediaAsset,
  MediaAlbum,
  MediaImportJob,
  MediaAIJob,
  DuplicateGroup,
  AIClusterGroup,
  Donation,
  PaymentEvent,
  Task,
  TaskParticipant,
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
  MaintenanceSettings,
  MaintenanceConfig,
  MediaCategory,
  MediaUsageLocation,
  AISuggestionData,
  NamingConfig,
  AcervoDiagnosticReport,
  CountryDocumentRule,
} from '../types';
import { DEFAULT_NAMING_CONFIG, generateOrganizedName } from './namingService';
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
  INITIAL_MAINTENANCE_SETTINGS,
  INITIAL_COUNTRY_DOCUMENT_RULES,
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
  taskTicketCounter?: number;
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
  maintenanceSettings?: MaintenanceSettings;
  albums?: MediaAlbum[];
  importJobs?: MediaImportJob[];
  duplicateGroups?: DuplicateGroup[];
  namingConfig?: NamingConfig;
  aiClusterProposals?: AIClusterGroup[];
  aiJobs?: MediaAIJob[];
  countryDocumentRules?: CountryDocumentRule[];
}

export function normalizeCountryIso(countryStr?: string | null): string {
  if (!countryStr) return 'DEFAULT';
  const norm = countryStr
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm === 'brasil' || norm === 'brazil' || norm === 'br') return 'BR';
  if (
    norm === 'estados unidos' ||
    norm === 'estados unidos da america' ||
    norm === 'united states' ||
    norm === 'united states of america' ||
    norm === 'usa' ||
    norm === 'us' ||
    norm === 'eua'
  )
    return 'US';
  if (norm === 'argentina' || norm === 'ar') return 'AR';
  if (norm === 'portugal' || norm === 'pt') return 'PT';
  if (norm === 'espanha' || norm === 'spain' || norm === 'espana' || norm === 'es') return 'ES';
  if (norm === 'colombia' || norm === 'co') return 'CO';
  if (norm === 'paraguai' || norm === 'paraguay' || norm === 'py') return 'PY';
  if (norm === 'uruguai' || norm === 'uruguay' || norm === 'uy') return 'UY';
  if (norm === 'chile' || norm === 'cl') return 'CL';
  if (norm === 'reino unido' || norm === 'united kingdom' || norm === 'uk' || norm === 'gb') return 'GB';
  if (norm === 'franca' || norm === 'france' || norm === 'fr') return 'FR';
  if (norm === 'italia' || norm === 'italy' || norm === 'it') return 'IT';
  if (norm === 'alemanha' || norm === 'germany' || norm === 'deutschland' || norm === 'de') return 'DE';
  if (norm === 'suica' || norm === 'switzerland' || norm === 'ch') return 'CH';
  if (norm === 'japao' || norm === 'japan' || norm === 'jp') return 'JP';
  if (norm === 'angola' || norm === 'ao') return 'AO';
  if (norm === 'mocambique' || norm === 'mozambique' || norm === 'mz') return 'MZ';
  if (norm === 'cabo verde' || norm === 'cape verde' || norm === 'cv') return 'CV';

  if (/^[a-zA-Z]{2}$/.test(countryStr.trim())) {
    return countryStr.trim().toUpperCase();
  }

  return 'DEFAULT';
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
    (global as any).__startup_timers = (global as any).__startup_timers || {};
    (global as any).__startup_timers.dbInitStart = performance.now();
    this.data = this.loadDatabase();
    (global as any).__startup_timers.dbInitEnd = performance.now();
  }

  private loadDatabase(): DatabaseSchema {
    (global as any).__startup_timers = (global as any).__startup_timers || {};
    (global as any).__startup_timers.loadDatabaseStart = performance.now();
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
          if (parsed.taskTicketCounter === undefined) {
            const seqs = (parsed.tasks || []).map((t: any) => {
              if (!t.ticketNumber) return 0;
              const m = String(t.ticketNumber).match(/^ADMIR-(\d+)$/i);
              return m ? parseInt(m[1], 10) : 0;
            });
            parsed.taskTicketCounter = Math.max(0, ...seqs);
          }
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
          if (!parsed.albums) parsed.albums = [];
          if (!parsed.importJobs) parsed.importJobs = [];
          if (!parsed.aiClusterProposals) parsed.aiClusterProposals = [];
          if (!parsed.aiJobs) parsed.aiJobs = [];
          if (!parsed.maintenanceSettings) {
            parsed.maintenanceSettings = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_SETTINGS));
          }
          let changedCountryRules = false;
          if (!parsed.countryDocumentRules || parsed.countryDocumentRules.length === 0) {
            parsed.countryDocumentRules = JSON.parse(JSON.stringify(INITIAL_COUNTRY_DOCUMENT_RULES));
            changedCountryRules = true;
          } else {
            // Reconcile provenance on existing rules if missing
            for (const r of parsed.countryDocumentRules) {
              if (!r.sourceType) {
                r.sourceType = 'DEMO';
                r.sourceReference = r.sourceReference || 'DEMO-SCAFFOLDING-AI';
                r.administrativeNotes = r.administrativeNotes || 'Regra de demonstração técnica migrada para conformidade de procedência.';
                changedCountryRules = true;
              }
            }
          }

          const changedAccounts = this.reconcileOfficialAccounts(parsed);
          const changedTasks = this.migrateLegacyTasks(parsed);
          if (changedAccounts || changedTasks || changedCountryRules) {
            this.save(parsed);
          }
          (global as any).__startup_timers.loadDatabaseEnd = performance.now();
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
      albums: [],
      importJobs: [],
      aiJobs: [],
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
      maintenanceSettings: JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_SETTINGS)),
      countryDocumentRules: JSON.parse(JSON.stringify(INITIAL_COUNTRY_DOCUMENT_RULES)),
    };

    this.reconcileOfficialAccounts(defaultDb);
    this.save(defaultDb);
    (global as any).__startup_timers.loadDatabaseEnd = performance.now();
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
    const rules = this.getApplicableRulesForCountry(a.country);

    const fullName = a.fullName || a.name || '';

    const checks: { label: string; ok: boolean }[] = [
      { label: 'Nome completo', ok: Boolean(fullName && fullName.trim().length > 0) },
      { label: 'E-mail', ok: Boolean(a.email && a.email.trim().length > 0) },
      { label: 'Telefone', ok: Boolean(a.phone && a.phone.trim().length > 0) },
      { label: 'Profissão', ok: Boolean(a.profession && a.profession.trim().length > 0) },
      { label: 'Endereço residencial', ok: Boolean(a.address && a.address.trim().length > 0) },
      { label: 'Resumo curricular', ok: Boolean(a.curriculumSummary && a.curriculumSummary.trim().length > 0) },
      { label: 'Data de nascimento', ok: Boolean(a.birthDate && a.birthDate.trim().length > 0) },
    ];

    // Check if CPF is required by the country rules (e.g. BR)
    const isCpfExplicitlyRequired = rules.some(
      (r) => r.isActive && r.isRequired && (r.documentCode === 'cpf' || r.documentName.toLowerCase().includes('cpf'))
    );
    if (isCpfExplicitlyRequired) {
      checks.push({ label: 'CPF', ok: Boolean(a.cpf && a.cpf.trim().length > 0) });
    }

    // Dynamic document check based on country rules
    const requiredRules = rules.filter((r) => r.isActive && r.isRequired);

    if (requiredRules.length > 0) {
      for (const rule of requiredRules) {
        const hasDoc = docs.some(
          (d) =>
            d.ruleId === rule.id ||
            d.documentCode === rule.documentCode ||
            d.type === rule.documentCode ||
            (rule.documentCode === 'photo' && ((a.photo && a.photo.trim().length > 0) || d.type === 'photo')) ||
            (rule.documentCode === 'passport' && (d.type === 'passport' || d.type === 'rg'))
        );
        checks.push({ label: rule.documentName, ok: hasDoc });
      }
    } else {
      const hasPhoto = Boolean((a.photo && a.photo.trim().length > 0) || docs.some((d) => d.type === 'photo'));
      checks.push({ label: 'Foto oficial', ok: hasPhoto });
      checks.push({
        label: 'Documento de identificação com foto',
        ok: docs.some((d) => d.type === 'passport' || d.type === 'rg' || d.type === 'cpf'),
      });
      checks.push({ label: 'Currículo (arquivo)', ok: docs.some((d) => d.type === 'curriculum') });
    }

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
    if (data.cpf && !validateCPF(data.cpf)) {
      throw new Error('CPF informado é inválido. Verifique os dígitos informados.');
    }
    if (data.email && !validateEmail(data.email)) {
      throw new Error('Endereço de e-mail informado é inválido.');
    }
    if (data.birthDate) {
      const bd = validateBirthDate(data.birthDate);
      if (!bd.valid) throw new Error(bd.message || 'Data de nascimento inválida.');
    }

    const id = `amb-${Date.now()}`;
    const maxOrder = this.data.ambassadors.reduce((m, a) => Math.max(m, a.orderIndex || 0), 0);

    const editorialStatus = data.editorialStatus || 'draft';
    const onboardingStatus = data.onboardingStatus || 'novo';
    const isVisible = editorialStatus === 'published';

    const tempAmb: Ambassador = {
      ...data,
      id,
      fullName: (data.fullName || data.name || '').trim(),
      passportNumber: sanitizePassport(data.passportNumber),
      rgDni: sanitizeRG_DNI(data.rgDni),
      role: (data.role || '').trim(),
      country: (data.country || '').trim(),
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

    if (updates.cpf !== undefined && !validateCPF(updates.cpf)) {
      throw new Error('CPF informado é inválido. Verifique os dígitos informados.');
    }
    if (updates.email !== undefined && !validateEmail(updates.email)) {
      throw new Error('Endereço de e-mail informado é inválido.');
    }
    if (updates.birthDate !== undefined) {
      const bd = validateBirthDate(updates.birthDate);
      if (!bd.valid) throw new Error(bd.message || 'Data de nascimento inválida.');
    }

    const prev = { ...this.data.ambassadors[idx] };
    const merged: Ambassador = {
      ...prev,
      ...updates,
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : (prev.fullName || prev.name || ''),
      passportNumber: updates.passportNumber !== undefined ? sanitizePassport(updates.passportNumber) : prev.passportNumber,
      rgDni: updates.rgDni !== undefined ? sanitizeRG_DNI(updates.rgDni) : prev.rgDni,
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

    const isRegeneration = Boolean(amb.onboardingToken && amb.tokenStatus === 'active');
    const token = crypto.randomBytes(24).toString('hex');
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    amb.onboardingToken = token;
    amb.tokenCreatedAt = createdAt;
    amb.tokenExpiresAt = expiresAt;
    amb.tokenStatus = 'active';

    // Status do onboarding NÃO é alterado automaticamente para 'link_enviado' ao gerar o token
    // Preserva o status atual (ex: 'novo', 'analisando', etc.)
    amb.updatedAt = new Date().toISOString();
    this.save();

    const actionName = isRegeneration ? 'Regeneração de Link' : 'Geração de Link';
    const actionText = isRegeneration
      ? `Link externo de onboarding regenerado para "${amb.fullName || id}". Link anterior invalidado.`
      : `Link externo de onboarding gerado para "${amb.fullName || id}".`;

    this.recordAuditLog(user, actionName, 'Ambassadors', amb.fullName || id, actionText, meta);

    return { token, url: `/#ambassador-onboarding?token=${token}`, expiresAt };
  }

  public revokeAmbassadorOnboardingToken(id: string, user: User, meta?: RequestMetadata): boolean {
    const amb = this.data.ambassadors.find((a) => a.id === id);
    if (!amb) return false;

    amb.tokenStatus = 'revoked';
    amb.updatedAt = new Date().toISOString();
    this.save();

    this.recordAuditLog(
      user,
      'Revogação de Link',
      'Ambassadors',
      amb.fullName || id,
      `Link externo de onboarding revogado para "${amb.fullName || id}". Acesso externo bloqueado.`,
      meta
    );
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

  public updateAmbassadorByToken(token: string, updates: Partial<Ambassador>, submitForAnalysis = false, meta?: RequestMetadata): Ambassador {
    const amb = this.getAmbassadorByOnboardingToken(token);
    if (!amb) throw new Error('Link de onboarding inválido ou expirado');

    if (updates.cpf !== undefined && !validateCPF(updates.cpf)) {
      throw new Error('CPF informado é inválido. Verifique os dígitos informados.');
    }
    if (updates.email !== undefined && !validateEmail(updates.email)) {
      throw new Error('Endereço de e-mail informado é inválido.');
    }
    if (updates.birthDate !== undefined) {
      const bd = validateBirthDate(updates.birthDate);
      if (!bd.valid) throw new Error(bd.message || 'Data de nascimento inválida.');
    }

    const idx = this.data.ambassadors.findIndex((a) => a.id === amb.id);

    const allowed = {
      fullName: updates.fullName !== undefined ? updates.fullName.trim() : amb.fullName,
      passportNumber: updates.passportNumber !== undefined ? sanitizePassport(updates.passportNumber) : amb.passportNumber,
      cpf: updates.cpf !== undefined ? updates.cpf : amb.cpf,
      rgDni: updates.rgDni !== undefined ? sanitizeRG_DNI(updates.rgDni) : amb.rgDni,
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

    // Record minimal safe audit log for external candidate onboarding submission
    const userMeta: User = {
      id: 'system-onboarding-candidate',
      name: merged.fullName || 'Candidato Externo',
      email: merged.email || 'candidato.externo@onboarding',
      role: 'viewer',
      permissions: {} as any,
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const actionText = submitForAnalysis
      ? `Onboarding submetido para análise pelo candidato externo (ID: ${merged.id})`
      : `Ficha de onboarding atualizada pelo candidato externo (ID: ${merged.id})`;

    this.recordAuditLog(
      userMeta,
      submitForAnalysis ? ('Submissão de Onboarding' as any) : 'Alteração',
      'Ambassadors',
      merged.fullName || merged.id,
      actionText,
      meta
    );

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

  // --- DOCUMENT VALIDATION (AI ASSISTED) ---

  public saveDocumentValidation(
    ambassadorId: string,
    validation: DocumentValidationRecord,
    user: User,
    isReanalysis = false,
    meta?: RequestMetadata
  ): Ambassador {
    const idx = this.data.ambassadors.findIndex((a) => a.id === ambassadorId);
    if (idx === -1) throw new Error('Ambassador not found');

    const amb = this.data.ambassadors[idx];
    if (!amb.documentValidations) amb.documentValidations = [];

    // Replace any previous validation for the same documentId
    amb.documentValidations = amb.documentValidations.filter((v) => v.documentId !== validation.documentId);
    amb.documentValidations.push(validation);
    amb.updatedAt = new Date().toISOString();

    this.save();

    const actionType = isReanalysis ? 'REANÁLISE DOCUMENTAL EXECUTADA' : 'VALIDAÇÃO DOCUMENTAL EXECUTADA';
    const details = `Validação assistida por IA executada para o documento "${validation.documentOriginalName}" (${validation.documentType}). Resultado: ${validation.summary.matchingCount} confere(m), ${validation.summary.divergenceCount} divergência(s).`;

    this.recordAuditLog(user, actionType, 'Ambassadors', amb.fullName || ambassadorId, details, meta);

    return amb;
  }

  public applyDocumentFieldValueToAmbassador(
    ambassadorId: string,
    documentId: string,
    fieldName: 'fullName' | 'cpf' | 'rgDni' | 'passportNumber' | 'birthDate',
    user: User,
    meta?: RequestMetadata
  ): Ambassador {
    const idx = this.data.ambassadors.findIndex((a) => a.id === ambassadorId);
    if (idx === -1) throw new Error('Ambassador not found');

    const amb = this.data.ambassadors[idx];
    const validation = (amb.documentValidations || []).find((v) => v.documentId === documentId);
    if (!validation) throw new Error('Registro de validação não localizado');

    const field = validation.fields.find((f) => f.fieldName === fieldName);
    if (!field || !field.extractedValue) {
      throw new Error('Valor extraído não disponível para este campo');
    }

    // Apply the value to the ambassador profile
    (amb as any)[fieldName] = field.extractedValue;
    field.result = 'CONFERE';
    field.registeredValue = field.extractedValue;
    field.notes = `Atualizado pelo administrador com base no documento "${validation.documentOriginalName}" em ${new Date().toLocaleDateString()}`;

    // Recalculate summary
    validation.summary.matchingCount = validation.fields.filter((f) => f.result === 'CONFERE').length;
    validation.summary.divergenceCount = validation.fields.filter((f) => f.result === 'DIVERGÊNCIA ENCONTRADA').length;

    amb.updatedAt = new Date().toISOString();
    const { completionPercentage, pendingItems } = this.computeAmbassadorCompletion(amb);
    amb.completionPercentage = completionPercentage;
    amb.pendingItems = pendingItems;

    this.save();

    const details = `Campo "${field.fieldLabel}" atualizado para o valor identificado no documento "${validation.documentOriginalName}".`;
    this.recordAuditLog(user, 'ALTERAÇÃO CADASTRAL A PARTIR DE DOCUMENTO', 'Ambassadors', amb.fullName || ambassadorId, details, meta);

    return amb;
  }

  public markDivergenceReviewed(
    ambassadorId: string,
    documentId: string,
    fieldName: string,
    notes: string | undefined,
    user: User,
    meta?: RequestMetadata
  ): Ambassador {
    const idx = this.data.ambassadors.findIndex((a) => a.id === ambassadorId);
    if (idx === -1) throw new Error('Ambassador not found');

    const amb = this.data.ambassadors[idx];
    const validation = (amb.documentValidations || []).find((v) => v.documentId === documentId);
    if (!validation) throw new Error('Registro de validação não localizado');

    const field = validation.fields.find((f) => f.fieldName === fieldName);
    if (field) {
      field.notes = notes || `Divergência revisada e mantida pelo administrador em ${new Date().toLocaleDateString()}`;
    }

    amb.updatedAt = new Date().toISOString();
    this.save();

    const details = `Divergência no campo "${field?.fieldLabel || fieldName}" revisada e confirmada pelo administrador.`;
    this.recordAuditLog(user, 'DIVERGÊNCIA REVISADA', 'Ambassadors', amb.fullName || ambassadorId, details, meta);

    return amb;
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

  // --- COUNTRY DOCUMENT RULES (ADMIN & DYNAMIC ONBOARDING) ---

  public getCountryDocumentRules(countryIso?: string, includeInactive = false): CountryDocumentRule[] {
    let rules = this.data.countryDocumentRules || [];
    if (!includeInactive) {
      rules = rules.filter((r) => r.isActive);
    }
    if (countryIso && countryIso !== 'all') {
      const iso = countryIso.toUpperCase();
      rules = rules.filter((r) => r.countryIso.toUpperCase() === iso);
    }
    return [...rules].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getApplicableRulesForCountry(countryNameOrIso?: string): CountryDocumentRule[] {
    const allRules = this.data.countryDocumentRules || [];
    const activeRules = allRules.filter((r) => r.isActive);

    const iso = normalizeCountryIso(countryNameOrIso);

    // 1. Try matching by specific country ISO
    if (iso !== 'DEFAULT') {
      const countrySpecificRules = activeRules.filter((r) => r.countryIso.toUpperCase() === iso);
      if (countrySpecificRules.length > 0) {
        return countrySpecificRules.sort((a, b) => a.orderIndex - b.orderIndex);
      }
    }

    // 2. Try matching by country name string directly if ISO wasn't mapped
    if (countryNameOrIso) {
      const normalizedQuery = countryNameOrIso.trim().toLowerCase();
      const directNameMatches = activeRules.filter(
        (r) => r.country.toLowerCase() === normalizedQuery || r.countryIso.toLowerCase() === normalizedQuery
      );
      if (directNameMatches.length > 0) {
        return directNameMatches.sort((a, b) => a.orderIndex - b.orderIndex);
      }
    }

    // 3. Fallback to DEFAULT international rules
    const defaultRules = activeRules.filter((r) => r.countryIso === 'DEFAULT');
    if (defaultRules.length > 0) {
      return defaultRules.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // 4. Absolute fallback to INITIAL_COUNTRY_DOCUMENT_RULES defaults
    return INITIAL_COUNTRY_DOCUMENT_RULES.filter((r) => r.countryIso === 'DEFAULT');
  }

  public createCountryDocumentRule(
    ruleData: Partial<CountryDocumentRule>,
    user: User,
    meta?: RequestMetadata
  ): CountryDocumentRule {
    if (!ruleData.country || !ruleData.documentName || !ruleData.documentCode) {
      throw new Error('País, nome do documento e código do documento são obrigatórios.');
    }

    const iso = (ruleData.countryIso || normalizeCountryIso(ruleData.country)).toUpperCase();
    const existingRules = this.data.countryDocumentRules || [];

    const newRule: CountryDocumentRule = {
      id: `rule-${iso.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      country: ruleData.country.trim(),
      countryIso: iso,
      documentCode: ruleData.documentCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      documentName: ruleData.documentName.trim(),
      description: ruleData.description || '',
      isRequired: Boolean(ruleData.isRequired),
      category: ruleData.category || 'identification',
      allowedFormats: Array.isArray(ruleData.allowedFormats) && ruleData.allowedFormats.length > 0
        ? ruleData.allowedFormats
        : ['application/pdf', 'image/jpeg', 'image/png'],
      validityRequired: Boolean(ruleData.validityRequired),
      candidateInstructions: ruleData.candidateInstructions || '',
      isActive: ruleData.isActive !== false,
      orderIndex: typeof ruleData.orderIndex === 'number' ? ruleData.orderIndex : existingRules.length + 1,
      sourceType: ruleData.sourceType || 'UNKNOWN',
      sourceReference: ruleData.sourceReference?.trim() || undefined,
      administrativeNotes: ruleData.administrativeNotes?.trim() || undefined,
      translations: ruleData.translations || {
        pt: {
          name: ruleData.documentName,
          description: ruleData.description || '',
          candidateInstructions: ruleData.candidateInstructions || '',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.data.countryDocumentRules) {
      this.data.countryDocumentRules = [];
    }
    this.data.countryDocumentRules.push(newRule);
    this.save();

    this.recordAuditLog(
      user,
      'Criação',
      'Ambassadors',
      newRule.id,
      `Regra documental criada para o país ${newRule.country} (${newRule.countryIso}): ${newRule.documentName}`,
      meta
    );

    return newRule;
  }

  public updateCountryDocumentRule(
    id: string,
    updates: Partial<CountryDocumentRule>,
    user: User,
    meta?: RequestMetadata
  ): CountryDocumentRule {
    const rules = this.data.countryDocumentRules || [];
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Regra documental com ID "${id}" não encontrada.`);
    }

    const current = rules[index];
    const updated: CountryDocumentRule = {
      ...current,
      ...updates,
      countryIso: updates.countryIso ? updates.countryIso.toUpperCase() : current.countryIso,
      updatedAt: new Date().toISOString(),
    };

    rules[index] = updated;
    this.save();

    this.recordAuditLog(
      user,
      'Alteração',
      'Ambassadors',
      id,
      `Regra documental "${updated.documentName}" do país ${updated.country} atualizada`,
      meta
    );

    return updated;
  }

  public deleteCountryDocumentRule(id: string, user: User, meta?: RequestMetadata): boolean {
    const rules = this.data.countryDocumentRules || [];
    const rule = rules.find((r) => r.id === id);
    if (!rule) {
      return false;
    }

    this.data.countryDocumentRules = rules.filter((r) => r.id !== id);
    this.save();

    this.recordAuditLog(
      user,
      'Exclusão',
      'Ambassadors',
      id,
      `Regra documental "${rule.documentName}" do país ${rule.country} removida`,
      meta
    );

    return true;
  }

  public reorderCountryDocumentRules(orderedIds: string[], user: User, meta?: RequestMetadata): CountryDocumentRule[] {
    const rules = this.data.countryDocumentRules || [];
    const map = new Map<string, CountryDocumentRule>();
    rules.forEach((r) => map.set(r.id, r));

    let index = 1;
    orderedIds.forEach((id) => {
      const r = map.get(id);
      if (r) {
        r.orderIndex = index++;
      }
    });

    rules.sort((a, b) => a.orderIndex - b.orderIndex);
    this.save();

    this.recordAuditLog(
      user,
      'Alteração',
      'Ambassadors',
      'rules-reorder',
      'Reordenamento de regras documentais por país realizado',
      meta
    );

    return rules;
  }

  // --- MEDIA LIBRARY ---
  public getMedia(includeDeleted = false): MediaAsset[] {
    // calculate usage count dynamically across programs, stories, ambassadors, settings
    let media = [...this.data.media];
    if (!includeDeleted) {
      media = media.filter((m) => !m.isDeleted);
    }

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

  public addMedia(asset: Omit<MediaAsset, 'id' | 'createdAt'> & { id?: string }, user: User, meta?: RequestMetadata): MediaAsset {
    const id = asset.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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

  /**
   * Repairs duplicate groups by removing non-existent media IDs and duplicates within the group.
   * This restores integrity after a faulty import.
   */
  public repairDuplicateGroups(): void {
    if (!this.data.duplicateGroups) return;

    const activeMediaIds = new Set(this.data.media.filter(m => !m.isDeleted).map(m => m.id));
    let changed = false;

    this.data.duplicateGroups = this.data.duplicateGroups.filter(group => {
      const originalCount = group.mediaIds.length;
      
      // Keep only existing IDs and remove duplicates
      const validIds = Array.from(new Set(group.mediaIds.filter(id => activeMediaIds.has(id))));
      
      if (validIds.length !== originalCount) {
        group.mediaIds = validIds;
        group.updatedAt = new Date().toISOString();
        changed = true;
      }

      // If group has fewer than 2 members, it's no longer a duplicate group
      if (group.mediaIds.length < 2) {
        changed = true;
        // Also clear flags from the remaining asset
        if (group.mediaIds.length === 1) {
          const asset = this.data.media.find(m => m.id === group.mediaIds[0]);
          if (asset) {
            asset.duplicateGroupId = undefined;
            asset.duplicateStatus = 'none';
          }
        }
        return false;
      }

      // Re-generate recommendation if members changed
      if (changed) {
        const groupAssets = this.data.media.filter(m => group.mediaIds.includes(m.id));
        group.recommendation = generateDuplicateRecommendation(groupAssets);
      }

      return true;
    });

    if (changed) {
      this.save();
    }
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

  public findMediaBySha256(sha256: string): MediaAsset | undefined {
    if (!sha256) return undefined;
    return this.data.media.find((m) => m.sha256 === sha256);
  }

  public bulkUpdateMedia(ids: string[], updates: Partial<MediaAsset>, user: User, meta?: RequestMetadata): MediaAsset[] {
    const updated: MediaAsset[] = [];
    const idSet = new Set(ids);

    this.data.media = this.data.media.map((item) => {
      if (idSet.has(item.id)) {
        const newItem = { ...item, ...updates };
        updated.push(newItem);
        return newItem;
      }
      return item;
    });

    this.save();
    this.recordAuditLog(user, 'Edição em Massa', 'Photos', `${updated.length} itens`, `Edição em massa aplicada a ${updated.length} mídias`, meta);
    return updated;
  }

  // --- ALBUMS & EVENTS ---
  public getAlbums(): MediaAlbum[] {
    if (!this.data.albums) this.data.albums = [];
    return [...this.data.albums].map((album) => {
      const mediaCount = this.data.media.filter((m) => m.albumId === album.id).length;
      return { ...album, mediaCount };
    });
  }

  public createAlbum(data: Omit<MediaAlbum, 'id' | 'createdAt' | 'updatedAt' | 'mediaCount'>, user: User, meta?: RequestMetadata): MediaAlbum {
    if (!this.data.albums) this.data.albums = [];
    const id = `album-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newAlbum: MediaAlbum = {
      ...data,
      id,
      mediaCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: user.name || user.email,
    };

    this.data.albums.unshift(newAlbum);
    this.save();
    this.recordAuditLog(user, 'Criação', 'Albums', newAlbum.title, `Álbum/Evento "${newAlbum.title}" criado`, meta);
    return newAlbum;
  }

  public updateAlbum(id: string, updates: Partial<MediaAlbum>, user: User, meta?: RequestMetadata): MediaAlbum {
    if (!this.data.albums) this.data.albums = [];
    const idx = this.data.albums.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Álbum não encontrado');

    const updatedAlbum = {
      ...this.data.albums[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.albums[idx] = updatedAlbum;
    this.save();
    this.recordAuditLog(user, 'Alteração', 'Albums', updatedAlbum.title, `Álbum "${updatedAlbum.title}" atualizado`, meta);
    return updatedAlbum;
  }

  public deleteAlbum(id: string, user: User, meta?: RequestMetadata): boolean {
    if (!this.data.albums) this.data.albums = [];
    const album = this.data.albums.find((a) => a.id === id);
    if (!album) return false;

    // Disassociate media from album without deleting the underlying photo files
    this.data.media = this.data.media.map((m) => (m.albumId === id ? { ...m, albumId: undefined, albumTitle: undefined } : m));
    this.data.albums = this.data.albums.filter((a) => a.id !== id);
    this.save();
    this.recordAuditLog(user, 'Exclusão', 'Albums', album.title, `Álbum "${album.title}" removido`, meta);
    return true;
  }

  // --- MEDIA IMPORT JOBS ---
  public getImportJobs(): MediaImportJob[] {
    if (!this.data.importJobs) this.data.importJobs = [];
    return [...this.data.importJobs];
  }

  public getImportJob(id: string): MediaImportJob | undefined {
    if (!this.data.importJobs) this.data.importJobs = [];
    return this.data.importJobs.find((j) => j.id === id);
  }

  public createImportJob(data: Omit<MediaImportJob, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): MediaImportJob {
    if (!this.data.importJobs) this.data.importJobs = [];
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newJob: MediaImportJob = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      createdBy: user.name || user.email,
    };

    this.data.importJobs.unshift(newJob);
    this.save();
    this.recordAuditLog(user, 'Sessão de Importação', 'Photos', newJob.jobName, `Sessão de importação em massa "${newJob.jobName}" iniciada (${newJob.totalItems} itens)`, meta);
    return newJob;
  }

  public updateImportJob(id: string, updates: Partial<MediaImportJob>): MediaImportJob {
    if (!this.data.importJobs) this.data.importJobs = [];
    const idx = this.data.importJobs.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error('Import Job não encontrado');

    const updatedJob = {
      ...this.data.importJobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.importJobs[idx] = updatedJob;
    this.save();
    return updatedJob;
  }

  // --- MEDIA AI ANALYSIS JOBS ---
  public getAIJobs(): MediaAIJob[] {
    if (!this.data.aiJobs) this.data.aiJobs = [];
    return [...this.data.aiJobs];
  }

  public getAIJob(id: string): MediaAIJob | undefined {
    if (!this.data.aiJobs) this.data.aiJobs = [];
    return this.data.aiJobs.find((j) => j.id === id);
  }

  public getActiveAIJob(): MediaAIJob | undefined {
    if (!this.data.aiJobs) this.data.aiJobs = [];
    return this.data.aiJobs.find((j) => j.status === 'RUNNING' || j.status === 'RATE_LIMITED' || j.status === 'PENDING');
  }

  public createAIJob(data: Omit<MediaAIJob, 'id' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): MediaAIJob {
    if (!this.data.aiJobs) this.data.aiJobs = [];
    const id = `ai-job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newJob: MediaAIJob = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      createdBy: user.name || user.email,
    };

    this.data.aiJobs.unshift(newJob);
    this.save();
    this.recordAuditLog(user, 'Alteração', 'Photos', `Job de IA ${id}`, `Novo job de análise IA Gemini iniciado para ${newJob.totalItems} fotos.`, meta);
    return newJob;
  }

  public updateAIJob(id: string, updates: Partial<MediaAIJob>): MediaAIJob {
    if (!this.data.aiJobs) this.data.aiJobs = [];
    const idx = this.data.aiJobs.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error('AI Job não encontrado');

    const updatedJob = {
      ...this.data.aiJobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.aiJobs[idx] = updatedJob;
    this.save();
    return updatedJob;
  }

  // --- DUPLICATE GROUPS & REVIEW ---
  public getDuplicateGroups(): DuplicateGroup[] {
    this.repairDuplicateGroups();
    if (!this.data.duplicateGroups) this.data.duplicateGroups = [];
    return [...this.data.duplicateGroups];
  }

  public getDuplicateGroupById(id: string): DuplicateGroup | undefined {
    if (!this.data.duplicateGroups) this.data.duplicateGroups = [];
    return this.data.duplicateGroups.find((g) => g.id === id);
  }

  public saveDuplicateGroup(group: DuplicateGroup): DuplicateGroup {
    if (!this.data.duplicateGroups) this.data.duplicateGroups = [];
    const idx = this.data.duplicateGroups.findIndex((g) => g.id === group.id);
    if (idx >= 0) {
      this.data.duplicateGroups[idx] = { ...this.data.duplicateGroups[idx], ...group, updatedAt: new Date().toISOString() };
    } else {
      this.data.duplicateGroups.unshift(group);
    }
    this.save();
    return group;
  }

  public deleteDuplicateGroup(id: string): boolean {
    if (!this.data.duplicateGroups) this.data.duplicateGroups = [];
    this.data.duplicateGroups = this.data.duplicateGroups.filter((g) => g.id !== id);
    this.save();
    return true;
  }

  public dismissDuplicateGroup(
    groupId?: string,
    mediaIds?: string[],
    user?: User,
    meta?: RequestMetadata
  ): { success: boolean; message: string } {
    if (groupId) {
      if (this.data.duplicateGroups) {
        const group = this.data.duplicateGroups.find((g) => g.id === groupId);
        if (group) {
          group.status = 'dismissed';
          // Also mark individual assets as not_duplicate so they don't reapppear in next scans
          group.mediaIds.forEach((id) => {
            const asset = this.data.media.find((m) => m.id === id);
            if (asset) {
              asset.duplicateStatus = 'not_duplicate';
            }
          });
        }
      }
    } else if (mediaIds) {
      mediaIds.forEach((id) => {
        const asset = this.data.media.find((m) => m.id === id);
        if (asset) {
          asset.duplicateStatus = 'not_duplicate';
        }
      });
    }

    this.save();

    if (user) {
      this.recordAuditLog(
        user,
        'Decisão de Duplicidade' as any,
        'Photos',
        'Múltiplos Arquivos',
        `Arquivos marcados como "Não Duplicados". Eles serão ignorados em verificações futuras.`,
        meta
      );
    }

    return {
      success: true,
      message: 'Os arquivos foram marcados como não duplicados e não aparecerão em verificações futuras.',
    };
  }

  public scanLibraryForDuplicates(user?: User, meta?: RequestMetadata): { 
    totalScanned: number; 
    newGroupsCount: number; 
    reevaluatedCount: number;
    removedCount: number;
    reclassifiedCount: number;
    keptCount: number;
    groups: DuplicateGroup[] 
  } {
    const activeMedia = this.getMedia(false);
    // filter not_duplicate explicitly marked by user in the asset itself
    const scannableMedia = activeMedia.filter(m => m.duplicateStatus !== 'not_duplicate');
    
    if (!this.data.duplicateGroups) this.data.duplicateGroups = [];

    const now = new Date().toISOString();
    let reevaluatedCount = 0;
    let removedCount = 0;
    let reclassifiedCount = 0;
    let keptCount = 0;
    let newGroupsCount = 0;

    // 1. RE-EVALUATE ALL NON-DISMISSED GROUPS
    const updatedGroups: DuplicateGroup[] = [];
    
    for (const group of this.data.duplicateGroups) {
      // If group is already dismissed, keep it but check if assets still exist
      if (group.status === 'dismissed') {
        const remainingIds = group.mediaIds.filter(id => activeMedia.some(m => m.id === id));
        if (remainingIds.length >= 2) {
          group.mediaIds = remainingIds;
          updatedGroups.push(group);
        }
        continue;
      }

      // If group is resolved, check for "Incomplete Consolidation"
      if (group.status === 'resolved' || group.status === 'resolved_incomplete') {
        const assets = activeMedia.filter(m => group.mediaIds.includes(m.id));
        const masterId = group.recommendation?.keepMediaId || group.primaryMediaId;
        const redundantAssets = assets.filter(a => a.id !== masterId);
        
        let incomplete = false;
        for (const red of redundantAssets) {
          const locs = this.getMediaUsageLocations(red);
          // If the supposedly redundant asset is NOT deleted OR still has references
          if (!red.isDeleted || locs.length > 0) {
            incomplete = true;
            break;
          }
        }
        
        if (incomplete) {
          group.status = 'resolved_incomplete';
          group.usageCategory = 'DUPLICATA_CONSOLIDACAO_INCOMPLETA';
        } else {
          group.status = 'resolved';
          // category will be set in the enrichment phase
        }
        
        // Keep the group if assets still exist in the system (even if in trash)
        const allSystemAssets = this.getMedia(true).filter(m => group.mediaIds.includes(m.id));
        if (allSystemAssets.length >= 2) {
          updatedGroups.push(group);
        }
        continue;
      }

      // ONLY RE-EVALUATE PENDING GROUPS
      if (group.status === 'pending_review') {
        reevaluatedCount++;
        const groupAssets = activeMedia.filter(m => group.mediaIds.includes(m.id));
        
        if (groupAssets.length < 2) {
          removedCount++;
          // Clear asset back-references
          groupAssets.forEach(a => {
            a.duplicateGroupId = undefined;
            a.duplicateStatus = undefined;
          });
          continue; 
        }

        const primary = groupAssets.find(a => a.id === group.primaryMediaId) || groupAssets[0];
        const stillValidMembers: MediaAsset[] = [primary];
        let maxScore = 0;
        let topClassification: DuplicateGroup['classification'] = 'IMAGEM_SEMELHANTE';

        for (const asset of groupAssets) {
          if (asset.id === primary.id) continue;
          
          // FORCED RE-EVALUATION WITH CURRENT ALGORITHM
          const cmp = compareMediaAssets(primary, asset);
          
          if (cmp.similarityScore >= 75) {
            stillValidMembers.push(asset);
            if (cmp.similarityScore > maxScore) {
              maxScore = cmp.similarityScore;
              topClassification = cmp.classification;
            }
          }
        }

        if (stillValidMembers.length < 2) {
          removedCount++;
          groupAssets.forEach(a => {
            a.duplicateGroupId = undefined;
            a.duplicateStatus = undefined;
          });
          continue;
        }

        // Reclassified?
        if (group.similarityScore !== maxScore || group.classification !== topClassification) {
          reclassifiedCount++;
          group.similarityScore = maxScore;
          group.classification = topClassification;
        } else {
          keptCount++;
        }

        group.mediaIds = stillValidMembers.map(m => m.id);
        group.updatedAt = now;
        group.recommendation = generateDuplicateRecommendation(stillValidMembers);
        
        // Ensure asset back-references are correct
        stillValidMembers.forEach(a => {
          a.duplicateGroupId = group.id;
          a.duplicateStatus = 'pending_review';
        });

        updatedGroups.push(group);
      }
    }

    this.data.duplicateGroups = updatedGroups;

    // 2. SCAN FOR NEW DUPLICATES
    for (let i = 0; i < scannableMedia.length; i++) {
      for (let j = i + 1; j < scannableMedia.length; j++) {
        const assetA = scannableMedia[i];
        const assetB = scannableMedia[j];

        // Skip if same group
        if (assetA.duplicateGroupId && assetA.duplicateGroupId === assetB.duplicateGroupId) continue;

        const cmp = compareMediaAssets(assetA, assetB);
        if (cmp.similarityScore >= 75) {
          // Add to existing pending group or create new
          let targetGroup = this.data.duplicateGroups.find(g => 
            (g.id === assetA.duplicateGroupId || g.id === assetB.duplicateGroupId) && 
            g.status === 'pending_review'
          );

          if (targetGroup) {
            if (!targetGroup.mediaIds.includes(assetA.id)) targetGroup.mediaIds.push(assetA.id);
            if (!targetGroup.mediaIds.includes(assetB.id)) targetGroup.mediaIds.push(assetB.id);
            if (cmp.similarityScore > targetGroup.similarityScore) {
              targetGroup.similarityScore = cmp.similarityScore;
              targetGroup.classification = cmp.classification;
            }
            targetGroup.updatedAt = now;
            const groupAssets = activeMedia.filter((a) => targetGroup!.mediaIds.includes(a.id));
            targetGroup.recommendation = generateDuplicateRecommendation(groupAssets);
            
            assetA.duplicateGroupId = targetGroup.id;
            assetA.duplicateStatus = 'pending_review';
            assetB.duplicateGroupId = targetGroup.id;
            assetB.duplicateStatus = 'pending_review';
          } else {
            // New group
            const groupId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newGroup: DuplicateGroup = {
              id: groupId,
              groupNumber: String(this.data.duplicateGroups.length + 1).padStart(4, '0'),
              primaryMediaId: assetA.id,
              mediaIds: [assetA.id, assetB.id],
              similarityScore: cmp.similarityScore,
              classification: cmp.classification,
              status: 'pending_review',
              createdAt: now,
              updatedAt: now,
              recommendation: generateDuplicateRecommendation([assetA, assetB]),
            };
            this.data.duplicateGroups.unshift(newGroup);
            newGroupsCount++;
            assetA.duplicateGroupId = groupId;
            assetA.duplicateStatus = 'pending_review';
            assetB.duplicateGroupId = groupId;
            assetB.duplicateStatus = 'pending_review';
          }
        }
      }
    }

    // 3. ENRICH AND FINALIZE (Usage Categories)
    for (const group of this.data.duplicateGroups) {
      const groupAssets = activeMedia.filter((a) => group.mediaIds.includes(a.id));
      const assetUsages: Record<string, MediaUsageLocation[]> = {};
      let totalLocationsCount = 0;
      const modulesSet = new Set<string>();

      for (const asset of groupAssets) {
        const locs = this.getMediaUsageLocations(asset);
        assetUsages[asset.id] = locs;
        totalLocationsCount += locs.length;
        locs.forEach((l) => modulesSet.add(`${l.module || 'Geral'}:${l.field || 'Principal'}`));
      }

      group.assetUsages = assetUsages;
      group.is100PercentIdentical = group.similarityScore >= 99 || group.classification === 'DUPLICATA_EXATA';

      if (group.status === 'resolved_incomplete') {
        group.usageCategory = 'DUPLICATA_CONSOLIDACAO_INCOMPLETA';
      } else {
        const hasFavicon = groupAssets.some((a) => a.category === 'ÍCONE / FAVICON' || (a.dimensions && parseInt(a.dimensions.split('x')[0]) <= 128));
        const hasLargeImage = groupAssets.some((a) => a.dimensions && parseInt(a.dimensions.split('x')[0]) >= 800);

        if (hasFavicon && hasLargeImage) {
          group.usageCategory = 'DUPLICATA_NAO_CONSOLIDAVEL';
        } else if (totalLocationsCount === 0) {
          group.usageCategory = 'DUPLICATA_NAO_UTILIZADA';
        } else if (modulesSet.size >= 2) {
          group.usageCategory = 'DUPLICATA_USOS_DIFERENTES';
        } else if (totalLocationsCount > 0) {
          group.usageCategory = 'DUPLICATA_EM_USO';
        } else {
          group.usageCategory = 'DUPLICATA_CONSOLIDAVEL';
        }
      }
    }

    this.save();
    
    if (user) {
      this.recordAuditLog(user, 'Revisão de Duplicidades' as any, 'Photos', 'Revarredura da Biblioteca', 
        `Revarredura concluída: ${activeMedia.length} mídias analisadas. ` +
        `${reevaluatedCount} grupos reavaliados, ${removedCount} removidos, ${reclassifiedCount} reclassificados, ${newGroupsCount} novos.`, 
        meta);
    }

    return {
      totalScanned: scannableMedia.length,
      newGroupsCount,
      reevaluatedCount,
      removedCount,
      reclassifiedCount,
      keptCount,
      groups: this.data.duplicateGroups,
    };
  }

  // --- SOFT DELETE & LIXEIRA (TRASH) ---
  public softDeleteMedia(id: string, user?: User, meta?: RequestMetadata): boolean {
    const idx = this.data.media.findIndex((m) => m.id === id);
    if (idx === -1) return false;

    const media = this.data.media[idx];
    if (media.isDeleted) return true; // Already in trash, skip redundant log

    media.isDeleted = true;
    media.deletedAt = new Date().toISOString();
    media.deletedBy = user ? (user.name || user.email) : 'Administrador';

    this.save();
    if (user) {
      this.recordAuditLog(user, 'Exclusão', 'Photos', media.title || media.originalName, `Mídia "${media.originalName}" movida para a Lixeira`, meta);
    }
    return true;
  }

  public bulkSoftDeleteMedia(ids: string[], user?: User, meta?: RequestMetadata): MediaAsset[] {
    const idSet = new Set(ids);
    const deleted: MediaAsset[] = [];
    const now = new Date().toISOString();

    this.data.media = this.data.media.map((item) => {
      if (idSet.has(item.id)) {
        const newItem = {
          ...item,
          isDeleted: true,
          deletedAt: now,
          deletedBy: user ? (user.name || user.email) : 'Administrador',
        };
        deleted.push(newItem);
        return newItem;
      }
      return item;
    });

    this.save();
    if (user && deleted.length > 0) {
      this.recordAuditLog(user, 'Exclusão em Massa', 'Photos', `${deleted.length} mídias`, `${deleted.length} mídias movidas para a Lixeira após revisão`, meta);
    }
    return deleted;
  }

  public restoreMedia(id: string, user?: User, meta?: RequestMetadata): boolean {
    const idx = this.data.media.findIndex((m) => m.id === id);
    if (idx === -1) return false;

    const media = this.data.media[idx];
    media.isDeleted = false;
    media.deletedAt = undefined;
    media.deletedBy = undefined;

    this.save();
    if (user) {
      this.recordAuditLog(user, 'Alteração', 'Photos', media.title || media.originalName, `Mídia "${media.originalName}" restaurada da Lixeira`, meta);
    }
    return true;
  }

  public bulkRestoreMedia(ids: string[], user?: User, meta?: RequestMetadata): MediaAsset[] {
    const idSet = new Set(ids);
    const restored: MediaAsset[] = [];

    this.data.media = this.data.media.map((item) => {
      if (idSet.has(item.id)) {
        const newItem = {
          ...item,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
        };
        restored.push(newItem);
        return newItem;
      }
      return item;
    });

    this.save();
    if (user && restored.length > 0) {
      this.recordAuditLog(user, 'Alteração', 'Photos', `${restored.length} mídias`, `${restored.length} mídias restauradas da Lixeira`, meta);
    }
    return restored;
  }

  public permanentDeleteMedia(id: string, user?: User, meta?: RequestMetadata): boolean {
    const idx = this.data.media.findIndex((m) => m.id === id);
    if (idx === -1) return false;

    const media = this.data.media[idx];
    this.data.media.splice(idx, 1);
    this.save();

    if (user) {
      this.recordAuditLog(user, 'Exclusão', 'Photos', media.title || media.originalName, `Mídia "${media.originalName}" excluída permanentemente`, meta);
    }
    return true;
  }

  public getTrashedMedia(): MediaAsset[] {
    return this.data.media.filter((m) => m.isDeleted);
  }

  // --- USAGE DETAILED CHECK ---
  public getMediaUsageLocations(asset: MediaAsset): MediaUsageLocation[] {
    const locations: MediaUsageLocation[] = [];
    const url = asset.url;
    const filename = asset.filename;
    const id = asset.id;

    const matchesUrlOrName = (str?: string) => {
      if (!str) return false;
      return (
        (url && str.includes(url)) ||
        (filename && str.includes(filename)) ||
        (id && str.includes(id)) ||
        (asset.storageKey && str.includes(asset.storageKey))
      );
    };

    // 1. Settings / Home / Header
    if (this.data.settings) {
      const s = this.data.settings;
      for (const [key, val] of Object.entries(s)) {
        if (typeof val === 'string' && matchesUrlOrName(val)) {
          locations.push({ module: 'Home / Configurações', entityTitle: 'Configurações Institucionais do Site', field: `Campo ${key}`, pageUrl: '/' });
        }
      }
      if (s.translations) {
        for (const lang of ['pt', 'en', 'es'] as const) {
          const tr = s.translations[lang];
          if (tr) {
            for (const [key, val] of Object.entries(tr)) {
              if (typeof val === 'string' && matchesUrlOrName(val)) {
                locations.push({ module: 'Home / Configurações', entityTitle: `Tradução (${lang.toUpperCase()})`, field: `Campo ${key}`, pageUrl: '/' });
              }
            }
          }
        }
      }
    }

    // 1b. Maintenance Settings
    if (this.data.maintenanceSettings) {
      const ms = this.data.maintenanceSettings;
      if (ms.global) {
        if (matchesUrlOrName(ms.global.customLogoUrl)) {
          locations.push({ module: 'Central de Manutenção', entityTitle: 'Configuração Global de Manutenção', field: 'Logo Customizado', pageUrl: '/maintenance' });
        }
        if (matchesUrlOrName(ms.global.customImageUrl)) {
          locations.push({ module: 'Central de Manutenção', entityTitle: 'Configuração Global de Manutenção', field: 'Imagem de Destaque', pageUrl: '/maintenance' });
        }
      }
      if (ms.pages) {
        for (const [pageKey, pConfig] of Object.entries(ms.pages)) {
          if (pConfig && matchesUrlOrName(pConfig.customLogoUrl)) {
            locations.push({ module: 'Central de Manutenção', entityTitle: `Página Manutenção: ${pageKey}`, field: 'Logo Customizado', pageUrl: '/maintenance' });
          }
          if (pConfig && matchesUrlOrName(pConfig.customImageUrl)) {
            locations.push({ module: 'Central de Manutenção', entityTitle: `Página Manutenção: ${pageKey}`, field: 'Imagem de Destaque', pageUrl: '/maintenance' });
          }
        }
      }
    }

    // 2. Ambassadors
    if (this.data.ambassadors) {
      for (const amb of this.data.ambassadors) {
        if (matchesUrlOrName(amb.photo)) {
          locations.push({ module: 'Embaixadores', entityId: amb.id, entityTitle: `Embaixador ${amb.fullName || amb.name}`, field: 'Foto Pública de Perfil', pageUrl: '/ambassadors' });
        }
        if (amb.translations) {
          for (const lang of ['pt', 'en', 'es'] as const) {
            const tr = amb.translations[lang];
            if (tr && matchesUrlOrName(tr.bio)) {
              locations.push({ module: 'Embaixadores', entityId: amb.id, entityTitle: `Embaixador ${amb.fullName || amb.name} (${lang.toUpperCase()})`, field: 'Biografia Traduzida', pageUrl: '/ambassadors' });
            }
          }
        }
      }
    }

    // 3. Programs
    if (this.data.programs) {
      for (const prog of this.data.programs) {
        if (matchesUrlOrName(prog.featuredImage)) {
          locations.push({ module: 'Programas', entityId: prog.id, entityTitle: `Programa: ${prog.title}`, field: 'Imagem Principal do Card', pageUrl: '/programs' });
        }
        if (matchesUrlOrName(prog.heroImage)) {
          locations.push({ module: 'Programas', entityId: prog.id, entityTitle: `Programa: ${prog.title}`, field: 'Imagem Hero', pageUrl: '/programs' });
        }
        if (Array.isArray(prog.gallery)) {
          for (const gUrl of prog.gallery) {
            if (matchesUrlOrName(gUrl)) {
              locations.push({ module: 'Programas', entityId: prog.id, entityTitle: `Programa: ${prog.title}`, field: 'Galeria de Fotos', pageUrl: '/programs' });
              break;
            }
          }
        }
        if (matchesUrlOrName(prog.fullDescription)) {
          locations.push({ module: 'Programas', entityId: prog.id, entityTitle: `Programa: ${prog.title}`, field: 'Descrição Detalhada', pageUrl: '/programs' });
        }
        if (prog.translations) {
          for (const lang of ['pt', 'en', 'es'] as const) {
            const tr = prog.translations[lang];
            if (tr && matchesUrlOrName(tr.fullDescription)) {
              locations.push({ module: 'Programas', entityId: prog.id, entityTitle: `Programa: ${prog.title} (${lang.toUpperCase()})`, field: 'Descrição Traduzida', pageUrl: '/programs' });
            }
          }
        }
      }
    }

    // 4. Stories / News
    if (this.data.stories) {
      for (const story of this.data.stories) {
        if (matchesUrlOrName(story.featuredPhoto)) {
          locations.push({ module: 'Notícias', entityId: story.id, entityTitle: `Notícia: ${story.headline || story.title}`, field: 'Capa Principal da Notícia', pageUrl: '/news' });
        }
        if (matchesUrlOrName(story.heroImage)) {
          locations.push({ module: 'Notícias', entityId: story.id, entityTitle: `Notícia: ${story.headline || story.title}`, field: 'Imagem Hero', pageUrl: '/news' });
        }
        if (matchesUrlOrName(story.fullText)) {
          locations.push({ module: 'Notícias', entityId: story.id, entityTitle: `Notícia: ${story.headline || story.title}`, field: 'Imagem no Corpo do Texto', pageUrl: '/news' });
        }
        if (Array.isArray(story.photoGallery)) {
          for (const gUrl of story.photoGallery) {
            if (matchesUrlOrName(gUrl)) {
              locations.push({ module: 'Notícias', entityId: story.id, entityTitle: `Notícia: ${story.headline || story.title}`, field: 'Galeria de Fotos', pageUrl: '/news' });
              break;
            }
          }
        }
        if (story.translations) {
          for (const lang of ['pt', 'en', 'es'] as const) {
            const tr = story.translations[lang];
            if (tr && matchesUrlOrName(tr.fullText || tr.fullContent)) {
              locations.push({ module: 'Notícias', entityId: story.id, entityTitle: `Notícia: ${story.headline || story.title} (${lang.toUpperCase()})`, field: 'Texto Traduzido', pageUrl: '/news' });
            }
          }
        }
      }
    }

    // 5. Albums
    if (this.data.albums) {
      for (const alb of this.data.albums) {
        if (matchesUrlOrName(alb.coverUrl) || alb.coverMediaId === id) {
          locations.push({ module: 'Galeria', entityId: alb.id, entityTitle: `Álbum: ${alb.title}`, field: 'Capa do Álbum', pageUrl: '/media' });
        }
        if (asset.albumId === alb.id) {
          locations.push({ module: 'Galeria', entityId: alb.id, entityTitle: `Álbum: ${alb.title}`, field: 'Foto do Álbum', pageUrl: '/media' });
        }
      }
    }

    // 6. Tasks
    if (this.data.tasks) {
      for (const task of this.data.tasks) {
        if (Array.isArray(task.attachments)) {
          for (const att of task.attachments) {
            if (matchesUrlOrName(att.url) || att.mediaId === id) {
              locations.push({ module: 'Tarefas / Kanban', entityId: task.id, entityTitle: `Tarefa: ${task.title}`, field: 'Anexo de Mídia', pageUrl: '/tasks' });
              break;
            }
          }
        }
      }
    }

    return locations;
  }

  // --- REFERENCE REPLACEMENT & CONSOLIDATION ---
  public replaceMediaReferences(
    sourceAsset: MediaAsset,
    targetAsset: MediaAsset,
    user?: User,
    meta?: RequestMetadata
  ): number {
    let updatedCount = 0;
    const sourceUrl = sourceAsset.url;
    const targetUrl = targetAsset.url;
    const sourceId = sourceAsset.id;
    const targetId = targetAsset.id;
    const sourceFilename = sourceAsset.filename;

    if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) return 0;

    const replaceStr = (str?: string): { newStr: string; changed: boolean } => {
      if (!str) return { newStr: '', changed: false };
      let changed = false;
      let newStr = str;
      if (newStr.includes(sourceUrl)) {
        newStr = newStr.replaceAll(sourceUrl, targetUrl);
        changed = true;
      }
      if (sourceFilename && newStr.includes(sourceFilename)) {
        newStr = newStr.replaceAll(sourceFilename, targetAsset.filename);
        changed = true;
      }
      return { newStr, changed };
    };

    // 1. Settings
    if (this.data.settings) {
      const s = this.data.settings;
      for (const [key, val] of Object.entries(s)) {
        if (typeof val === 'string') {
          const { newStr, changed } = replaceStr(val);
          if (changed) {
            (s as any)[key] = newStr;
            updatedCount++;
          }
        }
      }
      if (s.translations) {
        for (const lang of ['pt', 'en', 'es'] as const) {
          const tr = s.translations[lang];
          if (tr) {
            for (const [key, val] of Object.entries(tr)) {
              if (typeof val === 'string') {
                const { newStr, changed } = replaceStr(val);
                if (changed) {
                  (tr as any)[key] = newStr;
                  updatedCount++;
                }
              }
            }
          }
        }
      }
    }

    // 1b. Maintenance Settings
    if (this.data.maintenanceSettings) {
      const ms = this.data.maintenanceSettings;
      if (ms.global) {
        if (ms.global.customLogoUrl) {
          const { newStr, changed } = replaceStr(ms.global.customLogoUrl);
          if (changed) { ms.global.customLogoUrl = newStr; updatedCount++; }
        }
        if (ms.global.customImageUrl) {
          const { newStr, changed } = replaceStr(ms.global.customImageUrl);
          if (changed) { ms.global.customImageUrl = newStr; updatedCount++; }
        }
      }
      if (ms.pages) {
        for (const pConfig of Object.values(ms.pages)) {
          if (pConfig.customLogoUrl) {
            const { newStr, changed } = replaceStr(pConfig.customLogoUrl);
            if (changed) { pConfig.customLogoUrl = newStr; updatedCount++; }
          }
          if (pConfig.customImageUrl) {
            const { newStr, changed } = replaceStr(pConfig.customImageUrl);
            if (changed) { pConfig.customImageUrl = newStr; updatedCount++; }
          }
        }
      }
    }

    // 2. Ambassadors
    if (this.data.ambassadors) {
      for (const amb of this.data.ambassadors) {
        if (amb.photo) {
          const { newStr, changed } = replaceStr(amb.photo);
          if (changed) { amb.photo = newStr; updatedCount++; }
        }
      }
    }

    // 3. Programs
    if (this.data.programs) {
      for (const prog of this.data.programs) {
        if (prog.featuredImage) {
          const { newStr, changed } = replaceStr(prog.featuredImage);
          if (changed) { prog.featuredImage = newStr; updatedCount++; }
        }
        if (prog.heroImage) {
          const { newStr, changed } = replaceStr(prog.heroImage);
          if (changed) { prog.heroImage = newStr; updatedCount++; }
        }
        if (Array.isArray(prog.gallery) && prog.gallery.length > 0) {
          let galChanged = false;
          prog.gallery = prog.gallery.map((gUrl) => {
            const { newStr, changed } = replaceStr(gUrl);
            if (changed) galChanged = true;
            return newStr;
          });
          if (galChanged) updatedCount++;
        }
        if (prog.fullDescription) {
          const { newStr, changed } = replaceStr(prog.fullDescription);
          if (changed) { prog.fullDescription = newStr; updatedCount++; }
        }
        if (prog.translations) {
          for (const lang of ['pt', 'en', 'es'] as const) {
            const tr = prog.translations[lang] as any;
            if (tr) {
              if (tr.featuredImage) {
                const { newStr, changed } = replaceStr(tr.featuredImage);
                if (changed) { tr.featuredImage = newStr; updatedCount++; }
              }
              if (tr.heroImage) {
                const { newStr, changed } = replaceStr(tr.heroImage);
                if (changed) { tr.heroImage = newStr; updatedCount++; }
              }
              if (tr.fullDescription) {
                const { newStr, changed } = replaceStr(tr.fullDescription);
                if (changed) { tr.fullDescription = newStr; updatedCount++; }
              }
            }
          }
        }
      }
    }

    // 4. Stories
    if (this.data.stories) {
      for (const story of this.data.stories) {
        if (story.featuredPhoto) {
          const { newStr, changed } = replaceStr(story.featuredPhoto);
          if (changed) { story.featuredPhoto = newStr; updatedCount++; }
        }
        if (story.heroImage) {
          const { newStr, changed } = replaceStr(story.heroImage);
          if (changed) { story.heroImage = newStr; updatedCount++; }
        }
        if (story.fullText) {
          const { newStr, changed } = replaceStr(story.fullText);
          if (changed) { story.fullText = newStr; updatedCount++; }
        }
        if (Array.isArray(story.photoGallery) && story.photoGallery.length > 0) {
          let galChanged = false;
          story.photoGallery = story.photoGallery.map((gUrl) => {
            const { newStr, changed } = replaceStr(gUrl);
            if (changed) galChanged = true;
            return newStr;
          });
          if (galChanged) updatedCount++;
        }
        if (story.translations) {
          for (const lang of ['pt', 'en', 'es'] as const) {
            const tr = story.translations[lang] as any;
            if (tr) {
              if (tr.featuredPhoto) {
                const { newStr, changed } = replaceStr(tr.featuredPhoto);
                if (changed) { tr.featuredPhoto = newStr; updatedCount++; }
              }
              if (tr.fullText) {
                const { newStr, changed } = replaceStr(tr.fullText);
                if (changed) { tr.fullText = newStr; updatedCount++; }
              }
            }
          }
        }
      }
    }

    // 5. Albums
    if (this.data.albums) {
      for (const alb of this.data.albums) {
        if (alb.coverUrl) {
          const { newStr, changed } = replaceStr(alb.coverUrl);
          if (changed) { alb.coverUrl = newStr; updatedCount++; }
        }
        if (alb.coverMediaId === sourceId) {
          alb.coverMediaId = targetId;
          updatedCount++;
        }
      }
    }

    // 6. Tasks
    if (this.data.tasks) {
      for (const task of this.data.tasks) {
        if (Array.isArray(task.attachments)) {
          for (const att of task.attachments) {
            if (att.url) {
              const { newStr, changed } = replaceStr(att.url);
              if (changed) { att.url = newStr; updatedCount++; }
            }
            if (att.mediaId === sourceId) {
              att.mediaId = targetId;
              updatedCount++;
            }
          }
        }
      }
    }

    this.save();
    return updatedCount;
  }

  /**
   * Dry run of consolidation to see what will be changed
   */
  public consolidateMediaDryRun(masterMediaId: string, targetMediaIds: string[]): {
    master: MediaAsset;
    targets: {
      id: string;
      originalName: string;
      usages: { module: string; field: string; entityTitle?: string }[];
    }[];
    totalChanges: number;
  } {
    const master = this.data.media.find((m) => m.id === masterMediaId);
    if (!master) throw new Error('Mídia Mestre não encontrada');

    const result = {
      master,
      targets: [] as any[],
      totalChanges: 0
    };

    for (const targetId of targetMediaIds) {
      const target = this.data.media.find((m) => m.id === targetId);
      if (!target) continue;

      const usages = this.getMediaUsageLocations(target);
      result.targets.push({
        id: target.id,
        originalName: target.originalName,
        usages
      });
      result.totalChanges += usages.length;
    }

    return result;
  }

  public consolidateMedia(
    masterMediaId: string,
    targetMediaIds: string[],
    user?: User,
    meta?: RequestMetadata
  ): { success: boolean; masterMedia: MediaAsset; updatedReferencesCount: number; message: string; warnings?: string[] } {
    const master = this.data.media.find((m) => m.id === masterMediaId);
    if (!master) throw new Error('Mídia mestre não encontrada.');

    let totalUpdatedRefs = 0;
    const consolidatedIds: string[] = [];
    const warnings: string[] = [];

    for (const tid of targetMediaIds) {
      if (tid === masterMediaId) continue;
      const target = this.data.media.find((m) => m.id === tid);
      if (!target || target.isDeleted) continue;

      // Check aspect ratio / dimensions compatibility
      if (master.dimensions && target.dimensions) {
        const parseDims = (d: string) => {
          const parts = d.split('x').map((p) => parseInt(p.trim(), 10));
          return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? { w: parts[0], h: parts[1] } : null;
        };
        const masterD = parseDims(master.dimensions);
        const targetD = parseDims(target.dimensions);
        if (masterD && targetD) {
          const masterRatio = masterD.w / masterD.h;
          const targetRatio = targetD.w / targetD.h;
          if (Math.abs(masterRatio - targetRatio) > 0.35) {
            warnings.push(
              `Atenção: Proporção de imagem divergente entre mestre (${master.dimensions}) e ${target.originalName} (${target.dimensions}). A configuração visual das entidades foi preservada.`
            );
          }
        }
      }

      // 1. Migrate References
      const refsCount = this.replaceMediaReferences(target, master, user, meta);
      totalUpdatedRefs += refsCount;

      // Save migration before zero-reference verification
      this.save();

      // 2. ZERO-REFERENCE GATE: Re-evaluate remaining references for target!
      const remainingLocations = this.getMediaUsageLocations(target);

      if (remainingLocations.length > 0) {
        // Rule 2: DO NOT delete, DO NOT move to trash if references still exist!
        warnings.push(`Consolidação incompleta — ainda existem ${remainingLocations.length} referência(s) para a mídia "${target.originalName || target.id}".`);
        target.duplicateStatus = 'confirmed_duplicate';
        target.duplicateOfId = masterMediaId;
        // DO NOT call softDeleteMedia!
      } else {
        // ZERO REFERENCES CONFIRMED!
        target.duplicateStatus = 'confirmed_duplicate';
        target.duplicateOfId = masterMediaId;
        
        // Perform soft-delete (move to trash)
        this.softDeleteMedia(target.id, user, {
          ...meta,
          reason: `Consolidado no arquivo mestre ${masterMediaId}`
        } as any);
        
        consolidatedIds.push(tid);
      }
    }

    // Preserve Master Active
    master.duplicateStatus = 'keep_both';
    master.isDeleted = false;

    // 3. Update DuplicateGroups
    if (this.data.duplicateGroups) {
      this.data.duplicateGroups = this.data.duplicateGroups.filter((g) => {
        const hasTarget = g.mediaIds.some((id) => consolidatedIds.includes(id));
        if (hasTarget) {
          g.mediaIds = g.mediaIds.filter((id) => !consolidatedIds.includes(id));
          if (g.mediaIds.length <= 1) return false;
        }
        return true;
      });
    }

    this.save();

    if (user) {
      this.recordAuditLog(
        user,
        'Consolidação de Mídia' as any,
        'Photos',
        master.title || master.originalName,
        `Consolidação de mídia realizada: ${consolidatedIds.length} redundância(s) consolidadas e movidas para a Lixeira. ${totalUpdatedRefs} referência(s) migrada(s) para o mestre "${master.originalName}". ${warnings.length > 0 ? warnings.join(' | ') : ''}`,
        meta
      );
    }

    const isFullySuccessful = consolidatedIds.length === targetMediaIds.filter(id => id !== masterMediaId).length;
    const successMessage = consolidatedIds.length > 0
      ? `Consolidação realizada com sucesso. ${totalUpdatedRefs} referência(s) migrada(s) para o arquivo mestre "${master.originalName}".`
      : `Consolidação iniciada. Nenhuma mídia foi movida para a Lixeira devido a referências pendentes.`;

    return {
      success: isFullySuccessful,
      masterMedia: master,
      updatedReferencesCount: totalUpdatedRefs,
      message: warnings.length > 0 ? `${successMessage} ${warnings.join(' ')}` : successMessage,
      warnings,
    };
  }

  public checkDeleteSafety(mediaIds: string[]): {
    totalSelected: number;
    unusedCount: number;
    usedCount: number;
    unknownCount: number;
    safeToDeleteIds: string[];
    blockedItems: { id: string; name: string; usageCount: number; locations: MediaUsageLocation[] }[];
  } {
    const safeToDeleteIds: string[] = [];
    const blockedItems: { id: string; name: string; usageCount: number; locations: MediaUsageLocation[] }[] = [];
    let unusedCount = 0;
    let usedCount = 0;
    let unknownCount = 0;

    for (const id of mediaIds) {
      const media = this.data.media.find((m) => m.id === id);
      if (!media) {
        unknownCount++;
        continue;
      }

      const locations = this.getMediaUsageLocations(media);
      if (locations.length === 0) {
        unusedCount++;
        safeToDeleteIds.push(id);
      } else {
        usedCount++;
        blockedItems.push({
          id: media.id,
          name: media.originalName || media.filename,
          usageCount: locations.length,
          locations,
        });
      }
    }

    return {
      totalSelected: mediaIds.length,
      unusedCount,
      usedCount,
      unknownCount,
      safeToDeleteIds,
      blockedItems,
    };
  }

  public createTestDuplicateScenario(user?: User, meta?: RequestMetadata): {
    message: string;
    mediaA: MediaAsset;
    mediaB: MediaAsset;
    mediaC: MediaAsset;
  } {
    if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
      throw new Error('Acesso negado: Criação de cenários e dados de teste é estritamente proibida no ambiente de Produção.');
    }

    const now = new Date().toISOString();
    const sharedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const sharedUrl = 'https://picsum.photos/id/1050/800/600';

    const mediaA: MediaAsset = {
      id: `test_dup_a_${Date.now()}`,
      filename: 'logo-admir-header.webp',
      originalName: 'logo-admir-header.webp',
      organizedName: 'ADMIR_Logo_Header_001',
      title: 'Logotipo Header Oficial',
      url: sharedUrl,
      thumbUrl: sharedUrl,
      mimeType: 'image/webp',
      sizeBytes: 45200,
      fileSize: '45.2 KB',
      dimensions: '800x600',
      altText: 'ADMIR Logo Header',
      caption: 'Logotipo utilizado no topo do site',
      tags: ['logo', 'header', 'oficial'],
      createdAt: now,
      sha256: sharedSha256,
      category: 'LOGO',
    };

    const mediaB: MediaAsset = {
      id: `test_dup_b_${Date.now()}`,
      filename: 'brasao-admir-oficial.webp',
      originalName: 'brasao-admir-oficial.webp',
      organizedName: 'ADMIR_Brasao_Oficial_002',
      title: 'Brasão Diplomático ADMIR',
      url: sharedUrl,
      thumbUrl: sharedUrl,
      mimeType: 'image/webp',
      sizeBytes: 45200,
      fileSize: '45.2 KB',
      dimensions: '800x600',
      altText: 'Brasão Diplomático ADMIR',
      caption: 'Brasão oficial para selos e documentos',
      tags: ['brasao', 'selo', 'diplomatico'],
      createdAt: now,
      sha256: sharedSha256,
      category: 'BRASÃO / SELO',
    };

    const mediaC: MediaAsset = {
      id: `test_dup_c_${Date.now()}`,
      filename: 'logo-admir-copia-nao-utilizada.webp',
      originalName: 'logo-admir-copia-nao-utilizada.webp',
      organizedName: 'ADMIR_Logo_Copia_003',
      title: 'Cópia Antiga Sem Uso',
      url: sharedUrl,
      thumbUrl: sharedUrl,
      mimeType: 'image/webp',
      sizeBytes: 45200,
      fileSize: '45.2 KB',
      dimensions: '800x600',
      altText: 'Cópia não utilizada',
      caption: 'Arquivo duplicado armazenado no acervo',
      tags: ['duplicado', 'rascunho'],
      createdAt: now,
      sha256: sharedSha256,
      category: 'OUTROS',
    };

    this.data.media.unshift(mediaA, mediaB, mediaC);

    if (this.data.settings) {
      this.data.settings.heroBgImage = mediaA.url;
    }

    if (this.data.ambassadors && this.data.ambassadors.length > 0) {
      this.data.ambassadors[0].photo = mediaB.url;
    }

    this.save();
    this.scanLibraryForDuplicates(user, meta);

    return {
      message: 'Cenário de teste de duplicidades criado com sucesso! A (Header - em uso), B (Brasão - em uso) e C (Não utilizada).',
      mediaA,
      mediaB,
      mediaC,
    };
  }

  // --- NAMING CONFIG & ACERVO ANALYSIS ---
  public getNamingConfig(): NamingConfig {
    if (!this.data.namingConfig) {
      this.data.namingConfig = DEFAULT_NAMING_CONFIG;
    }
    return this.data.namingConfig;
  }

  public saveNamingConfig(config: NamingConfig, user?: User, meta?: RequestMetadata): NamingConfig {
    this.data.namingConfig = config;
    this.save();
    if (user) {
      this.recordAuditLog(user, 'Alteração', 'Photos', 'Configurações de Nomenclatura', 'Padrões de nomenclatura da biblioteca de mídia atualizados', meta);
    }
    return this.data.namingConfig;
  }

  public analyzeCurrentAcervo(): AcervoDiagnosticReport {
    const activeMedia = this.getMedia(false); // non-deleted media
    const categoryCounts: Record<string, number> = {};
    let unclassifiedCount = 0;

    const config = this.getNamingConfig();
    const renamePreviews: AcervoDiagnosticReport['renamePreviews'] = [];

    const categorySequences: Record<string, number> = {};

    for (const asset of activeMedia) {
      const cat: MediaCategory = asset.category || 'NÃO CLASSIFICADO';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (cat === 'NÃO CLASSIFICADO') unclassifiedCount++;

      categorySequences[cat] = (categorySequences[cat] || 0) + 1;
      const seq = categorySequences[cat];

      const suggestedName = generateOrganizedName(asset, seq, config);

      renamePreviews.push({
        assetId: asset.id,
        originalName: asset.originalName || asset.filename,
        currentName: asset.organizedName || asset.filename,
        suggestedOrganizedName: suggestedName,
        category: cat,
        status: cat === 'NÃO CLASSIFICADO' ? 'needs_info' : 'ready',
      });
    }

    const dupScan = this.scanLibraryForDuplicates();

    return {
      totalScanned: activeMedia.length,
      categoryCounts,
      duplicateGroupsCount: dupScan.newGroupsCount || dupScan.groups.length,
      unclassifiedCount,
      renamePreviewCount: renamePreviews.length,
      renamePreviews,
      duplicateGroups: dupScan.groups,
    };
  }

  public applyBatchRename(
    renames: { assetId: string; newOrganizedName: string }[],
    user: User,
    meta?: RequestMetadata
  ): number {
    let count = 0;
    const renameMap = new Map(renames.map((r) => [r.assetId, r.newOrganizedName]));

    this.data.media = this.data.media.map((asset) => {
      if (renameMap.has(asset.id)) {
        const newName = renameMap.get(asset.id)!;
        count++;
        return {
          ...asset,
          organizedName: newName,
          displayName: newName,
        };
      }
      return asset;
    });

    this.save();
    if (user) {
      this.recordAuditLog(
        user,
        'Edição em Massa',
        'Photos',
        'Padronização de Nomenclatura',
        `${count} mídias tiveram nomenclatura padronizada sem alterar URLs ou storageKeys físicas do Cloudflare R2.`,
        meta
      );
    }
    return count;
  }

  public approveAISuggestions(
    assetId: string,
    overrides?: Partial<MediaAsset>,
    user?: User,
    meta?: RequestMetadata
  ): MediaAsset {
    const idx = this.data.media.findIndex((m) => m.id === assetId);
    if (idx === -1) throw new Error('Mídia não encontrada');

    const asset = this.data.media[idx];
    const sug = asset.aiSuggestions;

    const updatedCategory = (overrides?.category || sug?.category || asset.category || 'NÃO CLASSIFICADO') as MediaCategory;
    const updatedTitle = overrides?.title || sug?.suggestedTitle || asset.title;
    const updatedDesc = overrides?.description || sug?.suggestedDescription || asset.description;
    const updatedTags = overrides?.tags || (sug?.tags ? Array.from(new Set([...asset.tags, ...sug.tags])) : asset.tags);

    const updatedAsset: MediaAsset = {
      ...asset,
      category: updatedCategory,
      title: updatedTitle,
      description: updatedDesc,
      tags: updatedTags,
      aiSuggestions: sug ? { ...sug, status: 'approved' } : undefined,
    };

    if (!updatedAsset.organizedName) {
      const config = this.getNamingConfig();
      const sameCatCount = this.data.media.filter((m) => m.category === updatedCategory).length + 1;
      updatedAsset.organizedName = generateOrganizedName(updatedAsset, sameCatCount, config);
      updatedAsset.displayName = updatedAsset.organizedName;
    }

    this.data.media[idx] = updatedAsset;
    this.save();

    if (user) {
      this.recordAuditLog(
        user,
        'Alteração',
        'Photos',
        asset.originalName,
        `Sugestões da IA aprovadas para a mídia "${asset.originalName}". Categoria: ${updatedCategory}`,
        meta
      );
    }

    return updatedAsset;
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

  public getTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  private getNextTaskTicketNumber(): string {
    const existingSeqNumbers = (this.data.tasks || [])
      .map(t => {
        if (!t.ticketNumber) return 0;
        const match = String(t.ticketNumber).match(/^ADMIR-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxSeq = Math.max(0, ...existingSeqNumbers);
    const nextSeq = Math.max(maxSeq + 1, (this.data.taskTicketCounter || 0) + 1);
    this.data.taskTicketCounter = nextSeq;
    return `ADMIR-${String(nextSeq).padStart(6, '0')}`;
  }

  public getEligibleTaskUsers(workspaceId?: string, workflowId?: string, search?: string): Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    title?: string;
    avatar?: string;
  }> {
    let users = (this.data.users || []).filter(u => u.status === 'active');
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.title && u.title.toLowerCase().includes(q))
      );
    }
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      avatarUrl: u.avatarUrl,
      avatar: u.avatarUrl,
    }));
  }

  private validateTaskUserEligibility(userId: string): User {
    const u = this.data.users.find(usr => usr.id === userId);
    if (!u) {
      throw new Error(`Usuário informado não foi encontrado no sistema.`);
    }
    if (u.status !== 'active') {
      throw new Error(`Usuário "${u.name}" está inativo e não pode ser atribuído a tarefas.`);
    }
    return u;
  }

  public createTask(data: Omit<Task, 'id' | 'comments' | 'createdAt' | 'updatedAt'>, user: User, meta?: RequestMetadata): Task {
    // Validate hierarchy
    const stage = this.data.taskWorkflowStages.find(s => s.id === data.stageId);
    if (!stage) throw new Error('Stage not found');
    const workflow = this.data.taskWorkflows.find(w => w.id === data.workflowId);
    if (!workflow || stage.workflowId !== workflow.id) throw new Error('Stage does not belong to the workflow');
    const workspace = this.data.taskWorkspaces.find(ws => ws.id === data.workspaceId);
    if (!workspace || workflow.workspaceId !== workspace.id) throw new Error('Workflow does not belong to the workspace');

    // Generate unique, sequential, immutable ticket number
    const ticketNumber = this.getNextTaskTicketNumber();

    // Validate responsible user if responsibleId is provided
    let responsibleName = (data.responsible || '').trim();
    let responsibleId = data.responsibleId;
    let responsibleEmail = data.responsibleEmail;

    if (responsibleId) {
      const respUser = this.validateTaskUserEligibility(responsibleId);
      responsibleName = respUser.name;
      responsibleEmail = respUser.email;
    } else if (responsibleName) {
      const matched = this.data.users.find(u =>
        u.status === 'active' &&
        (u.name.toLowerCase() === responsibleName.toLowerCase() || u.email.toLowerCase() === responsibleName.toLowerCase())
      );
      if (matched) {
        responsibleId = matched.id;
        responsibleName = matched.name;
        responsibleEmail = matched.email;
      }
    }

    // Validate participants if provided
    let participantIds: string[] = [];
    let participants: TaskParticipant[] = [];
    if (data.participantIds && Array.isArray(data.participantIds)) {
      const uniqueIds = Array.from(new Set(data.participantIds.filter(Boolean)));
      for (const pId of uniqueIds) {
        const pUser = this.validateTaskUserEligibility(pId);
        participantIds.push(pUser.id);
        participants.push({
          id: pUser.id,
          name: pUser.name,
          email: pUser.email,
          role: pUser.role,
          title: pUser.title,
          avatarUrl: pUser.avatarUrl,
          avatar: pUser.avatarUrl,
        });
      }
    }

    const id = `task-${Date.now()}`;
    const newTask: Task = {
      ...data,
      id,
      ticketNumber,
      responsible: responsibleName,
      responsibleId,
      responsibleEmail,
      participantIds,
      participants,
      checklist: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.tasks.push(newTask);
    this.save();

    this.recordAuditLog(user, 'Criação', 'Tasks', newTask.title, `Tarefa "${newTask.title}" [${ticketNumber}] adicionada`, meta);
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>, user: User, meta?: RequestMetadata): Task {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');

    const prev = { ...this.data.tasks[idx] };

    // Validate responsible if responsibleId or responsible text is updated
    let updatedResponsible = updates.responsible !== undefined ? updates.responsible : prev.responsible;
    let updatedResponsibleId = updates.responsibleId !== undefined ? updates.responsibleId : prev.responsibleId;
    let updatedResponsibleEmail = updates.responsibleEmail !== undefined ? updates.responsibleEmail : prev.responsibleEmail;

    if (updates.responsibleId !== undefined) {
      if (updates.responsibleId) {
        const respUser = this.validateTaskUserEligibility(updates.responsibleId);
        updatedResponsible = respUser.name;
        updatedResponsibleId = respUser.id;
        updatedResponsibleEmail = respUser.email;
      } else {
        updatedResponsibleId = undefined;
        updatedResponsibleEmail = undefined;
        if (updates.responsible === undefined) {
          updatedResponsible = '';
        }
      }
    } else if (updates.responsible !== undefined && updates.responsible.trim()) {
      const matched = this.data.users.find(u =>
        u.status === 'active' &&
        (u.name.toLowerCase() === updates.responsible!.trim().toLowerCase() || u.email.toLowerCase() === updates.responsible!.trim().toLowerCase())
      );
      if (matched) {
        updatedResponsibleId = matched.id;
        updatedResponsible = matched.name;
        updatedResponsibleEmail = matched.email;
      }
    }

    // Validate participants if participantIds is updated
    let updatedParticipantIds = prev.participantIds || [];
    let updatedParticipants = prev.participants || [];

    if (updates.participantIds !== undefined) {
      const uniqueIds = Array.from(new Set((updates.participantIds || []).filter(Boolean)));
      updatedParticipantIds = [];
      updatedParticipants = [];
      for (const pId of uniqueIds) {
        const pUser = this.validateTaskUserEligibility(pId);
        updatedParticipantIds.push(pUser.id);
        updatedParticipants.push({
          id: pUser.id,
          name: pUser.name,
          email: pUser.email,
          role: pUser.role,
          title: pUser.title,
          avatarUrl: pUser.avatarUrl,
          avatar: pUser.avatarUrl,
        });
      }
    }

    const updated: Task = {
      ...prev,
      ...updates,
      responsible: updatedResponsible,
      responsibleId: updatedResponsibleId,
      responsibleEmail: updatedResponsibleEmail,
      participantIds: updatedParticipantIds,
      participants: updatedParticipants,
      // Ensure ticketNumber is strictly immutable once assigned
      ticketNumber: prev.ticketNumber || updates.ticketNumber,
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
    const ticketDisplay = updated.ticketNumber ? `[${updated.ticketNumber}] ` : '';
    this.recordAuditLog(
      user,
      'Alteração',
      'Tasks',
      updated.title,
      isStageChange
        ? `Tarefa ${ticketDisplay}movida de stage "${prev.stageId}" para "${updated.stageId}"`
        : `Tarefa ${ticketDisplay}atualizada: ${updated.title}`,
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

  // --- CENTRAL DE MANUTENÇÃO ---
  public getMaintenanceSettings(): MaintenanceSettings {
    if (!this.data.maintenanceSettings) {
      this.data.maintenanceSettings = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_SETTINGS));
      this.save();
    }
    return JSON.parse(JSON.stringify(this.data.maintenanceSettings));
  }

  public updateMaintenanceSettings(
    newSettings: Partial<MaintenanceSettings>,
    user: User,
    meta?: RequestMetadata
  ): MaintenanceSettings {
    const current = this.getMaintenanceSettings();
    const prevStr = JSON.stringify(current);

    const merged: MaintenanceSettings = {
      global: {
        ...current.global,
        ...(newSettings.global || {}),
      },
      pages: {
        ...current.pages,
        ...(newSettings.pages || {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || user.email,
    };

    this.data.maintenanceSettings = merged;
    this.save();

    this.recordAuditLog(
      user,
      'Alteração',
      'Home',
      'Central de Manutenção',
      `Configurações da Central de Manutenção atualizadas por ${user.name || user.email}.`,
      meta,
      prevStr.substring(0, 300) + '...',
      JSON.stringify(merged).substring(0, 300) + '...'
    );

    return JSON.parse(JSON.stringify(this.data.maintenanceSettings));
  }

  public toggleGlobalMaintenance(
    enabled: boolean,
    user: User,
    meta?: RequestMetadata
  ): MaintenanceSettings {
    const current = this.getMaintenanceSettings();
    current.global.enabled = enabled;
    current.updatedAt = new Date().toISOString();
    current.updatedBy = user.name || user.email;

    this.data.maintenanceSettings = current;
    this.save();

    const actionText = enabled ? 'ativado' : 'desativado';
    this.recordAuditLog(
      user,
      'Alteração',
      'Home',
      'Central de Manutenção - Global',
      `Modo de manutenção global ${actionText} por ${user.name || user.email}.`,
      meta
    );

    return JSON.parse(JSON.stringify(this.data.maintenanceSettings));
  }

  public togglePageMaintenance(
    pageKey: string,
    enabled: boolean,
    user: User,
    meta?: RequestMetadata
  ): MaintenanceSettings {
    const current = this.getMaintenanceSettings();
    if (!current.pages[pageKey]) {
      current.pages[pageKey] = {
        enabled: false,
        themeId: 'theme-01',
        title: `Página ${pageKey} em Manutenção`,
        message: '<p>Esta área está passando por manutenção programada.</p>',
        showLogo: true,
        showButton: true,
        buttonLabel: 'Voltar ao Início',
        buttonUrl: '/#home',
        showContact: true,
        showEstimatedReturn: false,
        showCountdown: false,
      };
    }

    current.pages[pageKey].enabled = enabled;
    current.updatedAt = new Date().toISOString();
    current.updatedBy = user.name || user.email;

    this.data.maintenanceSettings = current;
    this.save();

    const actionText = enabled ? 'ativada' : 'desativada';
    this.recordAuditLog(
      user,
      'Alteração',
      'Home',
      `Central de Manutenção - Página ${pageKey}`,
      `Manutenção na página "${pageKey}" ${actionText} por ${user.name || user.email}.`,
      meta
    );

    return JSON.parse(JSON.stringify(this.data.maintenanceSettings));
  }

  public updatePageMaintenance(
    pageKey: string,
    config: Partial<MaintenanceConfig>,
    user: User,
    meta?: RequestMetadata
  ): MaintenanceSettings {
    const current = this.getMaintenanceSettings();
    const existing = current.pages[pageKey] || {
      enabled: false,
      themeId: 'theme-01',
      title: `Página ${pageKey} em Manutenção`,
      message: '<p>Esta área está passando por manutenção programada.</p>',
      showLogo: true,
      showButton: true,
      buttonLabel: 'Voltar ao Início',
      buttonUrl: '/#home',
      showContact: true,
      showEstimatedReturn: false,
      showCountdown: false,
    };

    current.pages[pageKey] = {
      ...existing,
      ...config,
    };
    current.updatedAt = new Date().toISOString();
    current.updatedBy = user.name || user.email;

    this.data.maintenanceSettings = current;
    this.save();

    this.recordAuditLog(
      user,
      'Alteração',
      'Home',
      `Central de Manutenção - Página ${pageKey}`,
      `Configurações da página "${pageKey}" atualizadas na Central de Manutenção.`,
      meta
    );

    return JSON.parse(JSON.stringify(this.data.maintenanceSettings));
  }

  // --- MEDIA AI ORGANIZATION & CLUSTERING ---

  public getAIClusterProposals(): AIClusterGroup[] {
    return this.data.aiClusterProposals || [];
  }

  public setAIClusterProposals(clusters: AIClusterGroup[]): void {
    this.data.aiClusterProposals = clusters;
    this.save();
  }

  public updateAIClusterProposal(id: string, updates: Partial<AIClusterGroup>): AIClusterGroup {
    if (!this.data.aiClusterProposals) this.data.aiClusterProposals = [];
    const idx = this.data.aiClusterProposals.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Proposal not found');

    this.data.aiClusterProposals[idx] = {
      ...this.data.aiClusterProposals[idx],
      ...updates,
      status: updates.status || 'MODIFIED',
    };
    this.save();
    return this.data.aiClusterProposals[idx];
  }

  public deleteAIClusterProposal(id: string): boolean {
    if (!this.data.aiClusterProposals) return false;
    const initialLen = this.data.aiClusterProposals.length;
    this.data.aiClusterProposals = this.data.aiClusterProposals.filter((c) => c.id !== id);
    const deleted = this.data.aiClusterProposals.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }
}

export const db = new DatabaseService();
