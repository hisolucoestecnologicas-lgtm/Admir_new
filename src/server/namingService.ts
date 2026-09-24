import { MediaAsset, MediaCategory, NamingConfig } from '../types';

export const DEFAULT_NAMING_CONFIG: NamingConfig = {
  prefix: 'ADMIR',
  rules: {
    EVENTO: '{prefix}_{date}_{event}_{sequence}',
    EMBAIXADOR: '{prefix}_Embaixador_{name}_{type}',
    LOGO: '{prefix}_Logo_{purpose}',
    'BRASÃO / SELO': '{prefix}_Brasao_{purpose}',
    'ÍCONE / FAVICON': '{prefix}_Icone_{purpose}',
    BANNER: '{prefix}_Banner_{page}_{sequence}',
    PROGRAMA: '{prefix}_Programa_{program}_{sequence}',
    NOTÍCIA: '{prefix}_Noticia_{date}_{slug}_{sequence}',
    INSTITUCIONAL: '{prefix}_Institucional_{description}_{sequence}',
    'DOCUMENTO / MATERIAL GRÁFICO': '{prefix}_Documento_{description}_{sequence}',
    'PAÍS / PROJETO': '{prefix}_Projeto_{country}_{sequence}',
    OUTROS: '{prefix}_Midia_{year}_{sequence}',
    'NÃO CLASSIFICADO': '{prefix}_Midia_{sequence}',
  },
};

/**
 * Remove acentos, caracteres especiais e previne path traversal
 */
export function sanitizeNameToken(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Mantém apenas alfanuméricos, espaço, hífen e underscore
    .trim()
    .replace(/\s+/g, '-') // Espaços viram hífen
    .replace(/[-_]+/g, '-') // Múltiplos traços viram um só
    .replace(/^\.+|\.+$|^\/+|\/+$|^\\+|\\+$/g, ''); // Previne path traversal
}

/**
 * Extrai a extensão real do arquivo
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Gera um nome organizado único baseado na categoria e regras de template
 */
export function generateOrganizedName(
  asset: MediaAsset,
  sequenceNumber: number,
  config: NamingConfig = DEFAULT_NAMING_CONFIG,
  extraData?: {
    eventName?: string;
    eventDate?: string;
    city?: string;
    ambassadorName?: string;
    photoType?: string;
    purpose?: string;
    programName?: string;
    newsSlug?: string;
    country?: string;
    description?: string;
  }
): string {
  const category: MediaCategory = asset.category || 'NÃO CLASSIFICADO';
  const prefix = sanitizeNameToken(config.prefix || config.globalPrefix || 'ADMIR');
  const rules = config.rules || {};
  const template = rules[category] || rules['OUTROS'] || '{prefix}_Midia_{sequence}';
  const ext = getFileExtension(asset.originalName || asset.filename);
  const seqStr = String(sequenceNumber).padStart(3, '0');

  const captureYear = asset.captureDate
    ? new Date(asset.captureDate).getFullYear().toString()
    : new Date(asset.createdAt || Date.now()).getFullYear().toString();

  const captureDate = asset.captureDate
    ? asset.captureDate.substring(0, 10)
    : asset.createdAt
    ? asset.createdAt.substring(0, 10)
    : new Date().toISOString().substring(0, 10);

  const eventToken = sanitizeNameToken(
    extraData?.eventName || asset.eventName || asset.title || 'Evento'
  );
  const cityToken = sanitizeNameToken(extraData?.city || '');
  const nameToken = sanitizeNameToken(extraData?.ambassadorName || asset.title || 'Oficial');
  const typeToken = sanitizeNameToken(extraData?.photoType || 'Perfil');
  const purposeToken = sanitizeNameToken(
    extraData?.purpose || asset.title || asset.caption || 'Oficial'
  );
  const programToken = sanitizeNameToken(
    extraData?.programName || asset.title || 'Geral'
  );
  const slugToken = sanitizeNameToken(
    extraData?.newsSlug || asset.title || 'Materia'
  );
  const countryToken = sanitizeNameToken(
    extraData?.country || 'Internacional'
  );
  const descToken = sanitizeNameToken(
    extraData?.description || asset.title || 'Acervo'
  );

  let formatted = template
    .replace(/\{prefix\}/g, prefix)
    .replace(/\{sequence\}/g, seqStr)
    .replace(/\{year\}/g, captureYear)
    .replace(/\{date\}/g, captureDate)
    .replace(/\{event\}/g, eventToken)
    .replace(/\{city\}/g, cityToken)
    .replace(/\{name\}/g, nameToken)
    .replace(/\{type\}/g, typeToken)
    .replace(/\{purpose\}/g, purposeToken)
    .replace(/\{program\}/g, programToken)
    .replace(/\{slug\}/g, slugToken)
    .replace(/\{country\}/g, countryToken)
    .replace(/\{description\}/g, descToken);

  // Se houver cidade confirmada em eventos, inclua no meio se o token {city} não estiver no template
  if (category === 'EVENTO' && cityToken && !template.includes('{city}')) {
    formatted = formatted.replace(
      `${eventToken}_${seqStr}`,
      `${eventToken}_${cityToken}_${seqStr}`
    );
  }

  // Limpa possíveis underscores duplos criados por tokens vazios
  formatted = formatted.replace(/_+/g, '_').replace(/_-\b/g, '_').replace(/^_|_$/g, '');

  return `${formatted}.${ext}`;
}
