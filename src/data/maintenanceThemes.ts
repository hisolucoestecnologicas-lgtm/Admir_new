import { MaintenanceConfig, PUBLIC_PAGES_REGISTRY } from '../types';

export interface MaintenanceTheme {
  id: string;
  name: string;
  category: 'Institucional' | 'Técnico' | 'Visual' | 'Premium';
  description: string;
  iconName: string;
  badge: string;
  bgClass: string;
  cardClass: string;
  titleClass: string;
  accentColor: string;
  previewGradient: string;
  defaultIconColor: string;
  fontFamily?: string;
  isDark?: boolean;
  previewColors?: {
    bg: string;
    card: string;
    accent: string;
  };
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: false,
  themeId: 'theme-01',
  title: 'Página temporariamente em manutenção',
  subtitle: 'Estamos realizando melhorias',
  message:
    'Estamos realizando atualizações nesta página. Por favor, tente novamente mais tarde.',
  additionalText:
    'Obrigado pela compreensão.',
  showLogo: true,
  showButton: true,
  buttonLabel: 'Voltar ao Início',
  buttonUrl: '/#home',
  showContact: true,
  showEstimatedReturn: false,
  estimatedReturnDate: '',
  showCountdown: false,
};

export const MAINTENANCE_PAGES_REGISTRY = PUBLIC_PAGES_REGISTRY;

export const MAINTENANCE_THEMES: MaintenanceTheme[] = [
  {
    id: 'theme-01',
    name: 'Institucional Minimalista',
    category: 'Institucional',
    description: 'Design sóbrio e elegante em fundo claro com acabamento diplomático em azul marinho e dourado.',
    iconName: 'Building2',
    badge: 'Padrão Oficial',
    bgClass: 'bg-slate-50 text-slate-900',
    cardClass: 'bg-white border border-slate-200/80 shadow-xl shadow-slate-900/5',
    titleClass: 'text-slate-900 font-serif-heading',
    accentColor: '#0F2042',
    previewGradient: 'from-slate-100 to-slate-200 border-slate-300',
    defaultIconColor: '#0F2042',
    fontFamily: 'font-serif-heading',
    isDark: false,
    previewColors: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      accent: '#0F2042',
    },
  },
  {
    id: 'theme-02',
    name: 'Construção & Obras',
    category: 'Técnico',
    description: 'Estética de modernização e reforma com toques vibrantes em âmbar e grafite institucional.',
    iconName: 'Construction',
    badge: 'Técnico',
    bgClass: 'bg-gradient-to-b from-amber-50/50 via-slate-50 to-slate-100 text-slate-900',
    cardClass: 'bg-white border-2 border-amber-400/40 shadow-xl shadow-amber-500/5',
    titleClass: 'text-slate-900 font-sans font-bold',
    accentColor: '#D97706',
    previewGradient: 'from-amber-100 to-amber-200 border-amber-300',
    defaultIconColor: '#D97706',
    fontFamily: 'font-sans',
    isDark: false,
    previewColors: {
      bg: '#FEF3C7',
      card: '#FFFFFF',
      accent: '#D97706',
    },
  },
  {
    id: 'theme-03',
    name: 'Ferramentas e Manutenção',
    category: 'Técnico',
    description: 'Visual focado em infraestrutura técnica, engrenagens e ajuste de serviços digitais.',
    iconName: 'Wrench',
    badge: 'Infraestrutura',
    bgClass: 'bg-slate-900 text-slate-100',
    cardClass: 'bg-slate-800/90 border border-slate-700 shadow-2xl shadow-black/40',
    titleClass: 'text-white font-sans font-bold',
    accentColor: '#38BDF8',
    previewGradient: 'from-slate-800 to-slate-900 border-slate-700',
    defaultIconColor: '#38BDF8',
    fontFamily: 'font-mono',
    isDark: true,
    previewColors: {
      bg: '#0F172A',
      card: '#1E293B',
      accent: '#38BDF8',
    },
  },
  {
    id: 'theme-04',
    name: 'Tecnologia & Dados',
    category: 'Técnico',
    description: 'Linhas modernas, malha de alta tecnologia e indicadores digitais de progresso.',
    iconName: 'Cpu',
    badge: 'Inovação',
    bgClass: 'bg-slate-950 text-slate-100',
    cardClass: 'bg-slate-900/90 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10',
    titleClass: 'text-indigo-100 font-mono font-bold tracking-tight',
    accentColor: '#6366F1',
    previewGradient: 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40',
    defaultIconColor: '#818CF8',
    fontFamily: 'font-mono',
    isDark: true,
    previewColors: {
      bg: '#020617',
      card: '#0F172A',
      accent: '#6366F1',
    },
  },
  {
    id: 'theme-05',
    name: 'Diplomático Oficial',
    category: 'Institucional',
    description: 'Heráldica solene com selos diplomáticos, tipografia nobre e refinamento cerimonial.',
    iconName: 'ShieldCheck',
    badge: 'Destaque Solene',
    bgClass: 'bg-[#0B1528] text-slate-100',
    cardClass: 'bg-[#0F1E38] border-2 border-[#CCA352]/40 shadow-2xl shadow-[#CCA352]/10',
    titleClass: 'text-[#E6C687] font-serif-heading font-bold',
    accentColor: '#CCA352',
    previewGradient: 'from-[#0B1528] to-[#162A4D] border-[#CCA352]/60',
    defaultIconColor: '#CCA352',
    fontFamily: 'font-serif-heading',
    isDark: true,
    previewColors: {
      bg: '#0B1528',
      card: '#0F1E38',
      accent: '#CCA352',
    },
  },
  {
    id: 'theme-06',
    name: 'Humanitário & Esperança',
    category: 'Institucional',
    description: 'Foco no acolhimento, fraternidade internacional, tons esmeralda e calor humano.',
    iconName: 'HeartHandshake',
    badge: 'Humanitário',
    bgClass: 'bg-gradient-to-b from-emerald-50 via-teal-50/40 to-slate-50 text-slate-900',
    cardClass: 'bg-white border border-emerald-200 shadow-xl shadow-emerald-900/5',
    titleClass: 'text-slate-900 font-serif-heading font-bold',
    accentColor: '#059669',
    previewGradient: 'from-emerald-100 to-teal-200 border-emerald-300',
    defaultIconColor: '#059669',
    fontFamily: 'font-sans',
    isDark: false,
    previewColors: {
      bg: '#ECFDF5',
      card: '#FFFFFF',
      accent: '#059669',
    },
  },
  {
    id: 'theme-07',
    name: 'Dark Premium',
    category: 'Premium',
    description: 'Paleta profunda obsidiana com detalhes em latão acetinado e contraste ultra-nítido.',
    iconName: 'Moon',
    badge: 'Premium Dark',
    bgClass: 'bg-zinc-950 text-zinc-100',
    cardClass: 'bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/80',
    titleClass: 'text-white font-sans font-bold tracking-tight',
    accentColor: '#F59E0B',
    previewGradient: 'from-zinc-900 to-black border-zinc-700',
    defaultIconColor: '#F59E0B',
    fontFamily: 'font-sans',
    isDark: true,
    previewColors: {
      bg: '#09090B',
      card: '#18181B',
      accent: '#F59E0B',
    },
  },
  {
    id: 'theme-08',
    name: 'Gradiente Moderno',
    category: 'Visual',
    description: 'Gradiente suave contemporâneo em tons reais de azul e ciano com cartões flutuantes.',
    iconName: 'Sparkles',
    badge: 'Moderno',
    bgClass: 'bg-gradient-to-tr from-blue-900 via-indigo-900 to-slate-900 text-white',
    cardClass: 'bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-950/50',
    titleClass: 'text-white font-sans font-bold',
    accentColor: '#38BDF8',
    previewGradient: 'from-blue-700 via-indigo-700 to-purple-800 border-white/20',
    defaultIconColor: '#38BDF8',
    fontFamily: 'font-sans',
    isDark: true,
    previewColors: {
      bg: '#1E1B4B',
      card: '#0F172A',
      accent: '#38BDF8',
    },
  },
  {
    id: 'theme-09',
    name: 'Ilustração Vetorial',
    category: 'Visual',
    description: 'Composição visual ilustrada e amigável para uma comunicação transparente e acolhedora.',
    iconName: 'Palette',
    badge: 'Amigável',
    bgClass: 'bg-slate-100 text-slate-800',
    cardClass: 'bg-white border-2 border-slate-200 shadow-lg',
    titleClass: 'text-slate-900 font-sans font-bold',
    accentColor: '#4F46E5',
    previewGradient: 'from-slate-200 to-indigo-100 border-slate-300',
    defaultIconColor: '#4F46E5',
    fontFamily: 'font-sans',
    isDark: false,
    previewColors: {
      bg: '#F1F5F9',
      card: '#FFFFFF',
      accent: '#4F46E5',
    },
  },
  {
    id: 'theme-10',
    name: 'Fotografia & Acervo',
    category: 'Visual',
    description: 'Foto humanitária em fundo imersivo com máscara escura de alta legibilidade para leitura das mensagens.',
    iconName: 'Camera',
    badge: 'Fotográfico',
    bgClass: 'bg-slate-950 text-white',
    cardClass: 'bg-black/75 backdrop-blur-md border border-white/15 shadow-2xl',
    titleClass: 'text-white font-serif-heading font-bold',
    accentColor: '#FCD34D',
    previewGradient: 'from-slate-800 to-slate-950 border-white/20',
    defaultIconColor: '#FCD34D',
    fontFamily: 'font-serif-heading',
    isDark: true,
    previewColors: {
      bg: '#020617',
      card: '#0B1120',
      accent: '#FCD34D',
    },
  },
  {
    id: 'theme-11',
    name: 'Glassmorphism',
    category: 'Premium',
    description: 'Efeito vidro fosco com desfoque de fundo, bordas translúcidas e iluminação suave.',
    iconName: 'Layers',
    badge: 'Efeito Vidro',
    bgClass: 'bg-slate-900 text-white',
    cardClass: 'bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/50',
    titleClass: 'text-white font-sans font-bold tracking-tight',
    accentColor: '#60A5FA',
    previewGradient: 'from-slate-800/80 to-indigo-900/80 border-white/30',
    defaultIconColor: '#60A5FA',
    fontFamily: 'font-sans',
    isDark: true,
    previewColors: {
      bg: '#0F172A',
      card: '#1E293B',
      accent: '#60A5FA',
    },
  },
  {
    id: 'theme-12',
    name: 'Tela Completa (Imersivo)',
    category: 'Premium',
    description: 'Aproveitamento total da tela com tipografia de alto impacto e foco ininterrupto na mensagem.',
    iconName: 'Maximize2',
    badge: 'Full Screen',
    bgClass: 'bg-[#0A1120] text-slate-100 flex flex-col justify-center min-h-screen',
    cardClass: 'bg-transparent border-0 shadow-none max-w-4xl mx-auto',
    titleClass: 'text-white font-serif-heading text-4xl sm:text-5xl font-extrabold tracking-tight',
    accentColor: '#CCA352',
    previewGradient: 'from-[#0A1120] to-[#121E36] border-[#CCA352]/40',
    defaultIconColor: '#CCA352',
    fontFamily: 'font-serif-heading',
    isDark: true,
    previewColors: {
      bg: '#0A1120',
      card: '#121E36',
      accent: '#CCA352',
    },
  },
];

export function getMaintenanceTheme(themeId?: string): MaintenanceTheme {
  const found = MAINTENANCE_THEMES.find((t) => t.id === themeId);
  return found || MAINTENANCE_THEMES[0];
}

export const getMaintenanceThemeById = getMaintenanceTheme;

