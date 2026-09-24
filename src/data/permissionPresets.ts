import { GranularPermissions, UserRole } from '../types';

export const ALL_PERMISSIONS_KEYS: (keyof GranularPermissions)[] = [
  'access.panel',
  'access.change_password',
  'access.manage_profile',

  'home.view',
  'home.edit_texts',
  'home.edit_numbers',
  'home.edit_hero',
  'home.publish',

  'programs.view',
  'programs.create',
  'programs.edit',
  'programs.publish',
  'programs.hide',
  'programs.delete',
  'programs.reorder',

  'news.view',
  'news.create',
  'news.edit',
  'news.publish',
  'news.unpublish',
  'news.delete',
  'news.reorder',

  'ambassadors.view',
  'ambassadors.create',
  'ambassadors.edit',
  'ambassadors.publish',
  'ambassadors.hide',
  'ambassadors.delete',
  'ambassadors.reorder',

  'media.view',
  'media.upload',
  'media.bulk_upload',
  'media.edit_metadata',
  'media.bulk_edit',
  'media.manage_albums',
  'media.ai_organize',
  'media.ai_review',
  'media.review_duplicates',
  'media.delete_duplicates',
  'media.restore_deleted',
  'media.copy_url',
  'media.delete',

  'donations.view',
  'donations.view_donor_details',
  'donations.export',
  'donations.manage_settings',
  'donations.refund',
  'donations.manage',

  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.move',
  'tasks.complete',
  'tasks.delete',
  'tasks.assign',
  'tasks.manage_workflows',

  'admins.view',
  'admins.invite',
  'admins.resend_invite',
  'admins.cancel_invite',
  'admins.change_permissions',
  'admins.remove_access',

  'history.view',
  'history.filter',
  'history.export',

  'maintenance.view',
  'maintenance.edit',
  'maintenance.toggle',

  'sync.view',
  'sync.preview',
  'sync.execute',
  'sync.restore',
];

export function getPresetPermissions(preset: 'all' | 'none' | 'readonly' | 'editor' | 'manager'): GranularPermissions {
  const base: GranularPermissions = {
    'access.panel': false,
    'access.change_password': false,
    'access.manage_profile': false,

    'home.view': false,
    'home.edit_texts': false,
    'home.edit_numbers': false,
    'home.edit_hero': false,
    'home.publish': false,

    'programs.view': false,
    'programs.create': false,
    'programs.edit': false,
    'programs.publish': false,
    'programs.hide': false,
    'programs.delete': false,
    'programs.reorder': false,

    'news.view': false,
    'news.create': false,
    'news.edit': false,
    'news.publish': false,
    'news.unpublish': false,
    'news.delete': false,
    'news.reorder': false,

    'ambassadors.view': false,
    'ambassadors.create': false,
    'ambassadors.edit': false,
    'ambassadors.publish': false,
    'ambassadors.hide': false,
    'ambassadors.delete': false,
    'ambassadors.reorder': false,

    'media.view': false,
    'media.upload': false,
    'media.bulk_upload': false,
    'media.edit_metadata': false,
    'media.bulk_edit': false,
    'media.manage_albums': false,
    'media.ai_organize': false,
    'media.ai_review': false,
    'media.review_duplicates': false,
    'media.delete_duplicates': false,
    'media.restore_deleted': false,
    'media.copy_url': false,
    'media.delete': false,

    'donations.view': false,
    'donations.view_donor_details': false,
    'donations.export': false,
    'donations.manage_settings': false,
    'donations.refund': false,
    'donations.manage': false,

    'tasks.view': false,
    'tasks.create': false,
    'tasks.edit': false,
    'tasks.move': false,
    'tasks.complete': false,
    'tasks.delete': false,
    'tasks.assign': false,
    'tasks.manage_workflows': false,

    'admins.view': false,
    'admins.invite': false,
    'admins.resend_invite': false,
    'admins.cancel_invite': false,
    'admins.change_permissions': false,
    'admins.remove_access': false,

    'history.view': false,
    'history.filter': false,
    'history.export': false,

    'maintenance.view': false,
    'maintenance.edit': false,
    'maintenance.toggle': false,

    'sync.view': false,
    'sync.preview': false,
    'sync.execute': false,
    'sync.restore': false,
  };

  if (preset === 'none') return base;

  if (preset === 'all') {
    Object.keys(base).forEach((k) => {
      (base as any)[k] = true;
    });
    return base;
  }

  if (preset === 'readonly') {
    base['access.panel'] = true;
    base['access.change_password'] = true;
    base['access.manage_profile'] = true;
    base['home.view'] = true;
    base['programs.view'] = true;
    base['news.view'] = true;
    base['ambassadors.view'] = true;
    base['media.view'] = true;
    base['media.copy_url'] = true;
    base['donations.view'] = true;
    base['tasks.view'] = true;
    base['history.view'] = true;
    base['history.filter'] = true;
    base['maintenance.view'] = true;
    return base;
  }

  if (preset === 'editor') {
    base['access.panel'] = true;
    base['access.change_password'] = true;
    base['access.manage_profile'] = true;

    base['home.view'] = true;
    base['home.edit_texts'] = true;
    base['home.edit_numbers'] = true;
    base['home.edit_hero'] = true;

    base['programs.view'] = true;
    base['programs.create'] = true;
    base['programs.edit'] = true;
    base['programs.publish'] = true;

    base['news.view'] = true;
    base['news.create'] = true;
    base['news.edit'] = true;
    base['news.publish'] = true;

    base['ambassadors.view'] = true;
    base['ambassadors.create'] = true;
    base['ambassadors.edit'] = true;
    base['ambassadors.publish'] = true;

    base['media.view'] = true;
    base['media.upload'] = true;
    base['media.bulk_upload'] = true;
    base['media.edit_metadata'] = true;
    base['media.bulk_edit'] = true;
    base['media.manage_albums'] = true;
    base['media.ai_organize'] = true;
    base['media.ai_review'] = true;
    base['media.copy_url'] = true;

    base['tasks.view'] = true;
    base['tasks.create'] = true;
    base['tasks.edit'] = true;
    base['tasks.move'] = true;
    base['tasks.complete'] = true;

    base['history.view'] = true;

    base['maintenance.view'] = true;
    base['maintenance.edit'] = true;
    return base;
  }

  if (preset === 'manager') {
    Object.keys(base).forEach((k) => {
      (base as any)[k] = true;
    });
    // Manager has almost everything except deleting admins or removing owner
    base['admins.remove_access'] = false;
    base['admins.change_permissions'] = false;
    base['maintenance.view'] = true;
    base['maintenance.edit'] = true;
    base['maintenance.toggle'] = true;
    return base;
  }

  return base;
}

export interface PermissionSection {
  id: string;
  name: string;
  description: string;
  permissions: {
    key: keyof GranularPermissions;
    label: string;
    description?: string;
  }[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: 'access',
    name: 'CONTA / ACESSO',
    description: 'Acesso geral ao painel e credenciais do usuário',
    permissions: [
      { key: 'access.panel', label: 'Acessar painel administrativo' },
      { key: 'access.change_password', label: 'Alterar própria senha' },
      { key: 'access.manage_profile', label: 'Gerenciar perfil e dados' },
    ],
  },
  {
    id: 'home',
    name: 'HOME',
    description: 'Controle de conteúdo e contadores da página inicial',
    permissions: [
      { key: 'home.view', label: 'Visualizar textos da home' },
      { key: 'home.edit_texts', label: 'Editar textos institucionais' },
      { key: 'home.edit_numbers', label: 'Editar contadores de impacto' },
      { key: 'home.edit_hero', label: 'Editar hero principal e imagem' },
      { key: 'home.publish', label: 'Publicar alterações da home' },
    ],
  },
  {
    id: 'programs',
    name: 'PROGRAMS',
    description: 'Gestão completa dos programas humanitários',
    permissions: [
      { key: 'programs.view', label: 'Visualizar programas' },
      { key: 'programs.create', label: 'Criar novos programas' },
      { key: 'programs.edit', label: 'Editar programas existentes' },
      { key: 'programs.publish', label: 'Publicar programas' },
      { key: 'programs.hide', label: 'Ocultar programas' },
      { key: 'programs.delete', label: 'Excluir programas' },
      { key: 'programs.reorder', label: 'Reordenar programas' },
    ],
  },
  {
    id: 'news',
    name: 'NEWS & STORIES',
    description: 'Publicação editorial, histórias humanitárias e comunicados',
    permissions: [
      { key: 'news.view', label: 'Visualizar notícias e histórias' },
      { key: 'news.create', label: 'Criar notícias' },
      { key: 'news.edit', label: 'Editar notícias com Rich Text' },
      { key: 'news.publish', label: 'Publicar notícias' },
      { key: 'news.unpublish', label: 'Despublicar notícias' },
      { key: 'news.delete', label: 'Excluir notícias' },
      { key: 'news.reorder', label: 'Reordenar notícias' },
    ],
  },
  {
    id: 'ambassadors',
    name: 'AMBASSADORS',
    description: 'Liderança diplomática e representantes internacionais',
    permissions: [
      { key: 'ambassadors.view', label: 'Visualizar embaixadores' },
      { key: 'ambassadors.create', label: 'Criar novo embaixador' },
      { key: 'ambassadors.edit', label: 'Editar biografias e dados' },
      { key: 'ambassadors.publish', label: 'Publicar embaixador' },
      { key: 'ambassadors.hide', label: 'Ocultar embaixador' },
      { key: 'ambassadors.delete', label: 'Excluir embaixador' },
      { key: 'ambassadors.reorder', label: 'Reordenar lista de embaixadores' },
    ],
  },
  {
    id: 'media',
    name: 'PHOTOS / MEDIA',
    description: 'Biblioteca central de mídia e fotografia humanitária',
    permissions: [
      { key: 'media.view', label: 'Visualizar biblioteca de mídia' },
      { key: 'media.upload', label: 'Fazer upload de fotos e mídias' },
      { key: 'media.bulk_upload', label: 'Fazer upload em massa e pacotes ZIP' },
      { key: 'media.edit_metadata', label: 'Editar alt text, legenda e tags' },
      { key: 'media.bulk_edit', label: 'Edição em massa de metadados' },
      { key: 'media.manage_albums', label: 'Gerenciar álbuns e eventos' },
      { key: 'media.ai_organize', label: 'Organização inteligente com IA Gemini' },
      { key: 'media.ai_review', label: 'Revisar sugestões de álbuns da IA' },
      { key: 'media.review_duplicates', label: 'Revisar duplicidades detectadas' },
      { key: 'media.delete_duplicates', label: 'Confirmar exclusão de duplicatas (Lixeira)' },
      { key: 'media.restore_deleted', label: 'Restaurar mídias da lixeira' },
      { key: 'media.copy_url', label: 'Copiar link de mídia' },
      { key: 'media.delete', label: 'Excluir mídia do acervo' },
    ],
  },
  {
    id: 'donations',
    name: 'DONATIONS',
    description: 'Gestão de doações recebidas e relatórios financeiros',
    permissions: [
      { key: 'donations.view', label: 'Visualizar painel de doações' },
      { key: 'donations.view_donor_details', label: 'Visualizar dados do doador' },
      { key: 'donations.export', label: 'Exportar relatórios em CSV' },
      { key: 'donations.manage_settings', label: 'Gerenciar configurações de doação' },
      { key: 'donations.refund', label: 'Realizar reembolso (Refund)' },
      { key: 'donations.manage', label: 'Gerenciar transações de doação' },
    ],
  },
  {
    id: 'tasks',
    name: 'TASKS',
    description: 'Quadro Kanban interno de tarefas institucionais',
    permissions: [
      { key: 'tasks.view', label: 'Visualizar quadro de tarefas' },
      { key: 'tasks.create', label: 'Criar nova tarefa' },
      { key: 'tasks.edit', label: 'Editar tarefas e prazos' },
      { key: 'tasks.move', label: 'Mover tarefas entre colunas' },
      { key: 'tasks.complete', label: 'Marcar tarefa como concluída' },
      { key: 'tasks.delete', label: 'Excluir tarefas' },
      { key: 'tasks.assign', label: 'Atribuir responsáveis' },
      { key: 'tasks.manage_workflows', label: 'Gerenciar fluxos e etapas do Kanban' },
    ],
  },
  {
    id: 'admins',
    name: 'ADMINISTRATORS',
    description: 'Gestão de usuários administrativos e permissões',
    permissions: [
      { key: 'admins.view', label: 'Visualizar lista de administradores' },
      { key: 'admins.invite', label: 'Convidar novo administrador' },
      { key: 'admins.resend_invite', label: 'Reenviar convite pendente' },
      { key: 'admins.cancel_invite', label: 'Cancelar convite' },
      { key: 'admins.change_permissions', label: 'Alterar permissões de administradores' },
      { key: 'admins.remove_access', label: 'Remover acesso de administrador' },
    ],
  },
  {
    id: 'history',
    name: 'HISTORY',
    description: 'Trilha de auditoria e histórico de ações no sistema',
    permissions: [
      { key: 'history.view', label: 'Visualizar histórico / audit log' },
      { key: 'history.filter', label: 'Filtrar por pessoa, tipo e período' },
      { key: 'history.export', label: 'Exportar logs de auditoria' },
    ],
  },
  {
    id: 'maintenance',
    name: 'CENTRAL DE MANUTENÇÃO',
    description: 'Controle de modo de manutenção global e por página, temas e mensagens',
    permissions: [
      { key: 'maintenance.view', label: 'Visualizar central de manutenção' },
      { key: 'maintenance.edit', label: 'Editar temas, títulos e mensagens de manutenção' },
      { key: 'maintenance.toggle', label: 'Ativar e desativar status de manutenção' },
    ],
  },
  {
    id: 'sync',
    name: 'SINCRONIZAÇÃO DE DADOS',
    description: 'Sincronização controlada de dados de Produção para Desenvolvimento com preview e backup',
    permissions: [
      { key: 'sync.view', label: 'Visualizar painel de sincronização' },
      { key: 'sync.preview', label: 'Executar análise de sincronização (Dry Run)' },
      { key: 'sync.execute', label: 'Executar sincronização (Produção → Dev)' },
      { key: 'sync.restore', label: 'Restaurar snapshots de backup anteriores' },
    ],
  },
];
