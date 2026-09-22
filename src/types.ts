/**
 * ADMIR — American Diplomatic Mission of International Relations
 * Complete Application & CMS Types
 */

export type Language = 'en' | 'pt' | 'es';

export type UserRole = 'owner' | 'manager' | 'editor' | 'viewer' | 'custom';

export interface GranularPermissions {
  // Account / Access
  'access.panel': boolean;
  'access.change_password': boolean;
  'access.manage_profile': boolean;

  // Home
  'home.view': boolean;
  'home.edit_texts': boolean;
  'home.edit_numbers': boolean;
  'home.edit_hero': boolean;
  'home.publish': boolean;

  // Programs
  'programs.view': boolean;
  'programs.create': boolean;
  'programs.edit': boolean;
  'programs.publish': boolean;
  'programs.hide': boolean;
  'programs.delete': boolean;
  'programs.reorder': boolean;

  // News & Stories
  'news.view': boolean;
  'news.create': boolean;
  'news.edit': boolean;
  'news.publish': boolean;
  'news.unpublish': boolean;
  'news.delete': boolean;
  'news.reorder': boolean;

  // Ambassadors
  'ambassadors.view': boolean;
  'ambassadors.create': boolean;
  'ambassadors.edit': boolean;
  'ambassadors.publish': boolean;
  'ambassadors.hide': boolean;
  'ambassadors.delete': boolean;
  'ambassadors.reorder': boolean;

  // Photos / Media
  'media.view': boolean;
  'media.upload': boolean;
  'media.edit_metadata': boolean;
  'media.copy_url': boolean;
  'media.delete': boolean;

  // Donations
  'donations.view': boolean;
  'donations.view_donor_details': boolean;
  'donations.export': boolean;
  'donations.manage_settings': boolean;
  'donations.refund': boolean;
  'donations.manage': boolean;

  // Tasks
  'tasks.view': boolean;
  'tasks.create': boolean;
  'tasks.edit': boolean;
  'tasks.move': boolean;
  'tasks.complete': boolean;
  'tasks.delete': boolean;
  'tasks.assign': boolean;
  'tasks.manage_workflows': boolean;

  // Administrators
  'admins.view': boolean;
  'admins.invite': boolean;
  'admins.resend_invite': boolean;
  'admins.cancel_invite': boolean;
  'admins.change_permissions': boolean;
  'admins.remove_access': boolean;

  // History / Audit Log
  'history.view': boolean;
  'history.filter': boolean;
  'history.export': boolean;

  // Assistant & Human Requests
  'assistant.view'?: boolean;
  'assistant.edit'?: boolean;
  'assistant.manage_requests'?: boolean;

  // Maintenance Center (Central de Manutenção)
  'maintenance.view'?: boolean;
  'maintenance.edit'?: boolean;
  'maintenance.toggle'?: boolean;

  // Data Synchronization (Sincronização de Dados Produção → Dev)
  'sync.view'?: boolean;
  'sync.preview'?: boolean;
  'sync.execute'?: boolean;
  'sync.restore'?: boolean;

  // Granular aliases for backwards compatibility
  'donations.export_csv'?: boolean;
  'history.export_csv'?: boolean;
  'news.toggle_status'?: boolean;
  'programs.toggle_status'?: boolean;
  'media.edit_meta'?: boolean;
  'tasks.move_status'?: boolean;
  'tasks.comment'?: boolean;
}

export type PermissionKey = keyof GranularPermissions;

export interface PermissionGroup {
  group: string;
  permissions: { key: PermissionKey; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'Página Inicial (Home)',
    permissions: [
      { key: 'home.view', label: 'Visualizar Módulo Home' },
      { key: 'home.edit_texts', label: 'Editar Textos Institucionais' },
      { key: 'home.edit_numbers', label: 'Editar Contadores de Impacto' },
      { key: 'home.edit_hero', label: 'Editar Hero e Imagem Principal' },
      { key: 'home.publish', label: 'Publicar Alterações na Home' },
    ],
  },
  {
    group: 'Programas Humanitários',
    permissions: [
      { key: 'programs.view', label: 'Visualizar Programas' },
      { key: 'programs.create', label: 'Criar Novo Programa' },
      { key: 'programs.edit', label: 'Editar Programas' },
      { key: 'programs.publish', label: 'Publicar / Ativar' },
      { key: 'programs.hide', label: 'Ocultar Programa' },
      { key: 'programs.delete', label: 'Excluir Programa' },
      { key: 'programs.reorder', label: 'Reordenar Programas' },
    ],
  },
  {
    group: 'Notícias & Histórias',
    permissions: [
      { key: 'news.view', label: 'Visualizar Notícias' },
      { key: 'news.create', label: 'Escrever Notícia' },
      { key: 'news.edit', label: 'Editar Notícia' },
      { key: 'news.publish', label: 'Publicar Notícia' },
      { key: 'news.unpublish', label: 'Despublicar Notícia' },
      { key: 'news.delete', label: 'Excluir Notícia' },
      { key: 'news.reorder', label: 'Reordenar Notícias' },
    ],
  },
  {
    group: 'Corpo de Embaixadores',
    permissions: [
      { key: 'ambassadors.view', label: 'Visualizar Embaixadores' },
      { key: 'ambassadors.create', label: 'Registrar Embaixador' },
      { key: 'ambassadors.edit', label: 'Editar Biografias e Dados' },
      { key: 'ambassadors.publish', label: 'Publicar Embaixador' },
      { key: 'ambassadors.hide', label: 'Ocultar do Corpo Diplomático' },
      { key: 'ambassadors.delete', label: 'Revogar Embaixador' },
      { key: 'ambassadors.reorder', label: 'Reordenar Lista' },
    ],
  },
  {
    group: 'Biblioteca de Mídia',
    permissions: [
      { key: 'media.view', label: 'Visualizar Galeria' },
      { key: 'media.upload', label: 'Fazer Upload de Fotos' },
      { key: 'media.edit_metadata', label: 'Editar Metadados / Alt text' },
      { key: 'media.copy_url', label: 'Copiar Links de Ativos' },
      { key: 'media.delete', label: 'Excluir Mídia' },
    ],
  },
  {
    group: 'Doações & Financeiro',
    permissions: [
      { key: 'donations.view', label: 'Visualizar Doações' },
      { key: 'donations.view_donor_details', label: 'Ver Dados dos Doadores' },
      { key: 'donations.export', label: 'Exportar Relatórios CSV' },
      { key: 'donations.manage_settings', label: 'Configurar Metas e Causas' },
    ],
  },
  {
    group: 'Quadro de Tarefas Operacionais',
    permissions: [
      { key: 'tasks.view', label: 'Visualizar Quadro Kanban' },
      { key: 'tasks.create', label: 'Criar Tarefas' },
      { key: 'tasks.edit', label: 'Editar Tarefas' },
      { key: 'tasks.move', label: 'Mover entre Colunas' },
      { key: 'tasks.complete', label: 'Concluir Tarefas' },
      { key: 'tasks.delete', label: 'Excluir Tarefas' },
      { key: 'tasks.assign', label: 'Atribuir Responsáveis' },
      { key: 'tasks.manage_workflows', label: 'Gerenciar Fluxos e Etapas' },
    ],
  },
  {
    group: 'Controle de Administradores',
    permissions: [
      { key: 'admins.view', label: 'Visualizar Administradores' },
      { key: 'admins.invite', label: 'Convidar Novo Administrador' },
      { key: 'admins.resend_invite', label: 'Reenviar Link de Convite' },
      { key: 'admins.cancel_invite', label: 'Cancelar Convite' },
      { key: 'admins.change_permissions', label: 'Modificar Permissões RBAC' },
      { key: 'admins.remove_access', label: 'Revogar Acesso' },
    ],
  },
  {
    group: 'Histórico & Trilha de Auditoria',
    permissions: [
      { key: 'history.view', label: 'Visualizar Histórico Imutável' },
      { key: 'history.filter', label: 'Filtrar Trilha de Auditoria' },
      { key: 'history.export', label: 'Exportar Logs em CSV' },
    ],
  },
  {
    group: 'Assistente Virtual & Atendimento',
    permissions: [
      { key: 'assistant.view', label: 'Visualizar Painel do Assistente' },
      { key: 'assistant.edit', label: 'Configurar Assistente e FAQs' },
      { key: 'assistant.manage_requests', label: 'Gerenciar Solicitações de Atendimento' },
    ],
  },
  {
    group: 'Central de Manutenção',
    permissions: [
      { key: 'maintenance.view', label: 'Visualizar Central de Manutenção' },
      { key: 'maintenance.edit', label: 'Editar Mensagens e Temas de Manutenção' },
      { key: 'maintenance.toggle', label: 'Ativar / Desativar Modo de Manutenção' },
    ],
  },
  {
    group: 'Sincronização de Ambientes (Prod → Dev)',
    permissions: [
      { key: 'sync.view', label: 'Visualizar Painel de Sincronização' },
      { key: 'sync.preview', label: 'Executar Análise / Dry Run' },
      { key: 'sync.execute', label: 'Executar Sincronização (Produção → Dev)' },
      { key: 'sync.restore', label: 'Restaurar Snapshot de Backup' },
    ],
  },
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: GranularPermissions;
  status: 'active' | 'inactive';
  joinedAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  title?: string;
  authProvider?: 'password' | 'google';
  firebaseUid?: string;
  identityStatus?: 'linked' | 'pending_link';
  isProtected?: boolean;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: UserRole;
  permissions: GranularPermissions;
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface SiteSettings {
  // Impact Counters
  communitiesServed: number;
  communitiesServedLabel: string;
  reliefsDelivered: number;
  reliefsDeliveredLabel: string;
  volunteersEngaged: number;
  volunteersEngagedLabel: string;

  // Hero
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroParagraph: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroBgImage: string;
  heroOverlayOpacity: number;

  // About Section
  aboutSmallLabel: string;
  aboutTitle: string;
  aboutHighlightedSentence: string;
  aboutParagraph: string;
  aboutCtaText: string;

  // Programs Section
  programsSectionTitle: string;
  programsSectionIntro: string;

  // Impact Section
  impact1Number: string;
  impact1Text: string;
  impact2Number: string;
  impact2Text: string;
  impact3Number: string;
  impact3Text: string;

  // Donation Section
  donationSectionTitle: string;
  donationSectionParagraph: string;

  // Ambassadors Page & Section
  ambassadorsPageTitle: string;
  ambassadorsPageIntro: string;

  // Donor Wall
  donorWallTitle: string;
  donorWallParagraph: string;

  // News/Stories Section
  newsSectionTitle: string;
  newsSectionIntro: string;

  // Newsletter Section
  newsletterTitle: string;
  newsletterParagraph: string;

  // Footer
  footerDescription: string;
  footerAddress: string;
  footerEmail: string;
  footerPhone: string;
  footerWebsite: string;
  footerCopyright: string;

  // Aliases and nested helpers
  address?: string;
  phone?: string;
  email?: string;
  hero?: {
    eyebrow?: string;
    titleLine1?: string;
    titleLine2?: string;
    paragraph?: string;
    primaryCtaText?: string;
    secondaryCtaText?: string;
    backgroundImage?: string;
  };
  impactCounters?: {
    counter1Value?: string;
    counter1Label?: string;
    counter2Value?: string;
    counter2Label?: string;
    counter3Value?: string;
    counter3Label?: string;
  };
  aboutSection?: {
    smallLabel?: string;
    title?: string;
    highlightedSentence?: string;
    highlightSentence?: string;
    paragraph?: string;
    bodyParagraph?: string;
    ctaText?: string;
  };
  impactStats?: {
    stat1Number?: string;
    stat1Text?: string;
    stat2Number?: string;
    stat2Text?: string;
    stat3Number?: string;
    stat3Text?: string;
  };
  translations?: {
    en?: Partial<SiteSettings>;
    pt?: Partial<SiteSettings>;
    es?: Partial<SiteSettings>;
  };
}

export interface ProgramTranslation {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: string;
  objectives?: string[];
  beneficiariesMetric?: string;
  regionsActive?: string;
  location?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  featuredImage: string;
  heroImage?: string;
  gallery: string[];
  orderIndex: number;
  isVisible: boolean;
  status?: 'active' | 'archived' | 'published' | 'draft';
  featured?: boolean;
  seoTitle: string;
  seoDescription: string;
  category: string;
  beneficiariesMetric?: string;
  regionsActive?: string;
  objectives?: string[];
  location?: string;
  translations?: {
    en?: ProgramTranslation;
    pt?: ProgramTranslation;
    es?: ProgramTranslation;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HumanitarianProjectLocation {
  id: string;
  programId: string;
  programSlug: string;
  country: string;
  countryCode: string;
  city: string;
  region: 'Americas' | 'Europe' | 'Africa' | 'Global';
  coordinates: {
    lat: number;
    lng: number;
  };
  projectTitle: {
    en: string;
    pt: string;
    es: string;
  };
  focusArea: {
    en: string;
    pt: string;
    es: string;
  };
  status: 'active' | 'rapid_response' | 'diplomatic_hub';
  beneficiariesScope: {
    en: string;
    pt: string;
    es: string;
  };
  featuredImage?: string;
}

export interface StoryTranslation {
  headline?: string;
  title?: string;
  shortSummary?: string;
  excerpt?: string;
  fullText?: string;
  fullContent?: string;
  category?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface Story {
  id: string;
  headline: string;
  title?: string;
  slug: string;
  category: 'Humanitarian Action' | 'Institutional News' | 'Events' | 'Field Stories' | string;
  shortSummary: string;
  excerpt?: string;
  fullText: string; // Rich HTML format
  fullContent?: string;
  featuredPhoto: string;
  heroImage?: string;
  photoGallery: string[];
  tags?: string[];
  videoLink?: string;
  externalLink?: string;
  author: string;
  publicationDate: string;
  publishDate?: string;
  orderIndex: number;
  isPublished: boolean;
  status?: 'published' | 'draft';
  featured?: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
  readTimeMinutes?: number;
  translations?: {
    en?: StoryTranslation;
    pt?: StoryTranslation;
    es?: StoryTranslation;
  };
  createdAt: string;
  updatedAt: string;
}

export type NewsStory = Story;

export type AmbassadorOnboardingStatus =
  | 'novo'
  | 'link_enviado'
  | 'analisando'
  | 'pendencia'
  | 'aguardando_publicacao'
  | 'publicado';

export type AmbassadorEditorialStatus = 'draft' | 'published';

export interface PrivateDocument {
  id: string;
  type: 'photo' | 'curriculum' | 'passport' | 'cpf' | 'rg' | 'blood_type' | 'other';
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  path: string;
  storageProvider?: 'FILESYSTEM' | 'FIRESTORE' | 'R2_PRIVATE';
  storageKey?: string;
}

export interface AmbassadorTranslation {
  role?: string;
  country?: string;
  shortBiography?: string;
  fullBiography?: string;
  bio?: string;
  specialty?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Ambassador {
  id: string;
  fullName: string;
  name?: string;
  role: string;
  country: string;
  shortBiography: string;
  fullBiography: string;
  bio?: string;
  photo: string;
  orderIndex: number;
  order?: number;
  isVisible: boolean; // boolean matching editorialStatus === 'published'
  editorialStatus?: AmbassadorEditorialStatus;
  onboardingStatus?: AmbassadorOnboardingStatus;
  completionPercentage?: number;
  pendingItems?: string[];
  pendingNotes?: string;
  onboardingNotes?: string;

  specialty?: string;
  appointedDate?: string;

  // Private Personal Information (never returned on public endpoints)
  passportNumber?: string;
  cpf?: string;
  rgDni?: string;
  birthDate?: string;
  bloodType?: string;
  fatherName?: string;
  motherName?: string;
  email?: string;
  phone?: string;
  profession?: string;
  address?: string;
  curriculumSummary?: string;

  // Private Documents (never returned on public endpoints)
  documents?: PrivateDocument[];

  // Onboarding Token Information
  onboardingToken?: string;
  tokenCreatedAt?: string;
  tokenExpiresAt?: string;
  tokenStatus?: 'active' | 'expired' | 'revoked' | 'completed';

  linkedin?: string;
  socialLinks?: string;
  seoTitle?: string;
  seoDescription?: string;
  translations?: {
    en?: AmbassadorTranslation;
    pt?: AmbassadorTranslation;
    es?: AmbassadorTranslation;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  title?: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  fileSize?: string;
  dimensions?: string;
  altText: string;
  caption: string;
  tags: string[];
  createdAt: string;
  usageCount?: number;
}

export interface Donation {
  id: string;
  donorName: string;
  donorEmail: string;
  donationType: 'one-time' | 'monthly';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | 'disputed';
  transactionId: string;
  cause: string;
  message?: string;
  date: string;
  createdAt?: string;
  provider?: 'stripe' | 'paypal' | 'manual';
  providerTransactionId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  environment?: 'test' | 'live';
  anonymous?: boolean;
  publicConsent?: boolean;
  designationType?: string;
  designationId?: string;
  confirmedAt?: string;
  updatedAt?: string;
}

export interface PaymentEvent {
  id: string;
  provider: 'stripe' | 'paypal';
  providerEventId: string;
  eventType: string;
  transactionReference: string;
  processed: boolean;
  createdAt: string;
  processedAt?: string;
}

export interface TaskWorkspace {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
  active?: boolean;
}

export interface TaskWorkflow {
  id: string;
  workspaceId: string;
  name: string;
  orderIndex: number;
  active?: boolean;
}

export interface TaskWorkflowStage {
  id: string;
  workflowId: string;
  name: string;
  orderIndex: number;
  isInitial?: boolean;
  isFinal?: boolean;
  active?: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskChecklistItem {
  id: string;
  taskId?: string;
  title: string;
  completed: boolean;
  orderIndex?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorName: string;
  authorEmail: string;
  authorId?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  mediaId?: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedById?: string;
  uploadedByEmail?: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
  createdBy?: string;
}

export type TaskColumn = 'backlog' | 'in-progress' | 'completed' | 'on-hold' | string;

export interface TaskParticipant {
  id: string;
  name: string;
  email?: string;
  role?: string;
  title?: string;
  avatarUrl?: string;
  avatar?: string;
}

export interface Task {
  id: string;
  ticketNumber?: string;
  title: string;
  description: string;
  responsible: string;
  responsibleId?: string;
  responsibleEmail?: string;
  participantIds?: string[];
  participants?: TaskParticipant[];
  priority: TaskPriority;
  dueDate: string;
  workspaceId: string;
  workflowId: string;
  stageId: string;
  orderIndex: number;
  checklist?: TaskChecklistItem[];
  comments: TaskComment[];
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  // Legacy support fields
  column?: TaskColumn;
}

export type AuditActionType =
  | 'Criação'
  | 'Alteração'
  | 'Exclusão'
  | 'Login'
  | 'Logout'
  | 'Convite criado'
  | 'Convite cancelado'
  | 'Permissão alterada'
  | 'Upload'
  | 'Publicação'
  | 'Despublicação'
  | 'Reembolso'
  | 'ADMIN_INVITE_CREATED'
  | 'ADMIN_INVITE_ACCEPTED'
  | 'ADMIN_ACCESS_GRANTED'
  | 'ADMIN_ROLE_CHANGED'
  | 'ADMIN_PERMISSION_CHANGED'
  | 'ADMIN_SUSPENDED'
  | 'ADMIN_REVOKED'
  | 'ADMIN_IDENTITY_LINKED'
  | 'TASK_DEPENDENCY_ADD'
  | 'TASK_DEPENDENCY_REMOVE';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail: string;
  userName: string;
  action: AuditActionType;
  module: 'Home' | 'Programs' | 'News' | 'Ambassadors' | 'Photos' | 'Donations' | 'Tasks' | 'Administrators' | 'Auth' | 'Assistant';
  affectedRecord: string;
  details?: string;
  beforeState?: string;
  afterState?: string;
  ipAddress: string;
  device: string;
  browser: string;
  location?: string;
}

export interface NewsletterSubscriber {
  id: string;
  name: string;
  email: string;
  consentedAt: string;
  status: 'active' | 'unsubscribed';
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  organization?: string;
  inquiryType?: string;
  submittedAt: string;
  status?: 'new' | 'read' | 'archived';
}

/* =========================================================================
   ASSISTENTE VIRTUAL & MULTICANAL TYPES
========================================================================= */

export interface AssistantSettings {
  enabled: boolean;
  displayName: string;
  welcomeMessagePt: string;
  welcomeMessageEn: string;
  welcomeMessageEs: string;
  allowHumanEscalation: boolean;
  defaultChannel: 'email' | 'whatsapp' | 'telegram';
  emailChannel: {
    active: boolean;
    displayName: string;
    recipientEmail: string;
    senderName: string;
    replyTo?: string;
  };
  whatsappChannel: {
    active: boolean;
    phoneNumber?: string;
  };
  telegramChannel: {
    active: boolean;
    botUsername?: string;
  };
}

export interface AssistantFaqItem {
  id: string;
  questionPt: string;
  questionEn?: string;
  questionEs?: string;
  answerPt: string;
  answerEn?: string;
  answerEs?: string;
  category: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface ContactRequest {
  id: string;
  protocol: string;
  timestamp: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  conversationSummary?: string;
  language: string;
  channel: 'email' | 'whatsapp' | 'telegram';
  status: 'novo' | 'em_atendimento' | 'respondido' | 'encerrado';
  notes?: string;
}

export interface AssistantChatFeedback {
  id: string;
  timestamp: string;
  messageText: string;
  rating: 'positive' | 'negative';
  userLanguage: string;
}

/* =========================================================================
   CENTRAL DE MANUTENÇÃO TYPES
========================================================================= */

export interface MaintenanceTextTranslation {
  title?: string;
  subtitle?: string;
  message?: string;
  additionalText?: string;
  buttonLabel?: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  themeId: string;
  title: string;
  subtitle?: string;
  message: string;
  additionalText?: string;
  showLogo: boolean;
  customLogoUrl?: string;
  customImageUrl?: string;
  showButton: boolean;
  buttonLabel?: string;
  buttonUrl?: string;
  showContact: boolean;
  showEstimatedReturn: boolean;
  estimatedReturnDate?: string;
  showCountdown: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
  customCss?: string;
  translations?: {
    pt?: Partial<MaintenanceTextTranslation>;
    en?: Partial<MaintenanceTextTranslation>;
    es?: Partial<MaintenanceTextTranslation>;
  };
}

export interface MaintenancePageRegistryItem {
  key: string;
  name: string;
  route: string;
  defaultTitle: string;
  defaultMessage: string;
  defaultThemeId: string;
}

export interface MaintenanceSettings {
  global: MaintenanceConfig;
  pages: Record<string, MaintenanceConfig>;
  updatedAt: string;
  updatedBy?: string;
}

export const PUBLIC_PAGES_REGISTRY: MaintenancePageRegistryItem[] = [
  {
    key: 'home',
    name: 'Home (Página Inicial)',
    route: '#home',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-01',
  },
  {
    key: 'about',
    name: 'About Us (Sobre a ADMIR)',
    route: '#about',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-05',
  },
  {
    key: 'programs',
    name: 'Programs (Programas Humanitários)',
    route: '#programs',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-04',
  },
  {
    key: 'ambassadors',
    name: 'Ambassadors (Corpo Diplomático)',
    route: '#ambassadors',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-05',
  },
  {
    key: 'get-involved',
    name: 'Get Involved (Participe / Voluntariado)',
    route: '#get-involved',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-06',
  },
  {
    key: 'stories',
    name: 'News & Stories (Notícias e Histórias)',
    route: '#stories',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-02',
  },
  {
    key: 'contact',
    name: 'Contact (Contato Oficial)',
    route: '#contact',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-03',
  },
  {
    key: 'donate',
    name: 'Donate (Doações e Apoio)',
    route: '#donate',
    defaultTitle: 'Página temporariamente em manutenção',
    defaultMessage: 'Esta área está temporariamente indisponível enquanto realizamos atualizações. Por favor, tente novamente mais tarde.',
    defaultThemeId: 'theme-08',
  },
];

export const MAINTENANCE_PAGES_REGISTRY = PUBLIC_PAGES_REGISTRY;

// ==========================================
// DATA SYNCHRONIZATION (PRODUÇÃO → DEV) TYPES
// ==========================================

export type SyncableModuleId =
  | 'settings'
  | 'programs'
  | 'stories'
  | 'ambassadors'
  | 'media'
  | 'donations'
  | 'tasks'
  | 'taskWorkflows'
  | 'assistant'
  | 'maintenance'
  | 'users'
  | 'auditLogs'
  | 'newsletterSubscribers'
  | 'contactMessages';

export type SyncConflictStrategy = 'source_wins' | 'target_wins' | 'manual';

export interface SyncModuleInfo {
  id: SyncableModuleId;
  name: string;
  description: string;
  category: 'content' | 'operations' | 'system';
  sourceCount: number;
  targetCount: number;
  dependencies: SyncableModuleId[];
  isSensitive?: boolean;
  hasPrivateDocs?: boolean;
}

export interface SyncConflictItem {
  moduleId: SyncableModuleId;
  moduleName: string;
  recordId: string;
  recordTitle: string;
  sourceDiffSummary: string;
  targetDiffSummary: string;
  sourceUpdatedAt?: string;
  targetUpdatedAt?: string;
}

export interface SyncMissingDependency {
  fromModule: SyncableModuleId;
  toModule: SyncableModuleId;
  missingId: string;
  referenceName: string;
  message: string;
}

export interface SyncModuleStat {
  moduleId: SyncableModuleId;
  moduleName: string;
  sourceCount: number;
  targetCount: number;
  newCount: number;
  updateCount: number;
  conflictCount: number;
  preservedCount: number;
  deletedCount: number; // Always 0
}

export interface SyncPreviewResult {
  analyzedAt: string;
  sourceEnvironment: string;
  targetEnvironment: string;
  selectedModules: SyncableModuleId[];
  isFullBase: boolean;
  modulesStats: SyncModuleStat[];
  totalNew: number;
  totalUpdates: number;
  totalConflicts: number;
  totalPreserved: number;
  totalDeletions: number;
  conflicts: SyncConflictItem[];
  missingDependencies: SyncMissingDependency[];
  warnings: string[];
  canProceed: boolean;
}

export interface SyncBackupRecord {
  id: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
  modules: SyncableModuleId[];
  recordCounts: Record<string, number>;
  totalRecords: number;
  filePath: string;
}

export interface SyncExecutionResult {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'success' | 'partial' | 'failed';
  sourceEnvironment: string;
  targetEnvironment: string;
  modules: SyncableModuleId[];
  strategy: SyncConflictStrategy;
  stats: {
    newRecords: number;
    updatedRecords: number;
    preservedRecords: number;
    conflictsResolved: number;
    errorsCount: number;
  };
  backupCreated?: {
    id: string;
    createdAt: string;
    totalRecords: number;
  };
  logs: string[];
  errors?: string[];
}

export type SyncConnectionState =
  | 'PENDING_CONFIG'
  | 'CONFIGURED_NOT_VALIDATED'
  | 'VALIDATED'
  | 'CONNECTION_ERROR';

export interface SyncConnectionTestResult {
  success: boolean;
  status: SyncConnectionState;
  statusCode?: number;
  latencyMs?: number;
  message: string;
  sourceUrl?: string;
  testedAt: string;
}

export interface SyncStatusInfo {
  isConfigured: boolean;
  sourceMode: 'direct_api' | 'snapshot_ready' | 'pending_config';
  sourceUrl?: string;
  targetEnvironment: string;
  availableBackupsCount: number;
  lastSync?: SyncExecutionResult;
  inProgress: boolean;
  modules: SyncModuleInfo[];
  connectionState?: SyncConnectionState;
  lastConnectionTest?: SyncConnectionTestResult;
}

