/**
 * ADMIR — Módulo Central de Máscaras, Normalização e Validação
 * Padrão internacional para Embaixadores e Onboarding
 */

/**
 * Validação algorítmica real do CPF (Brasil).
 * Rejeita dígitos incorretos e sequências repetidas (ex: 111.111.111-11).
 * Aceita vazio se o campo for opcional.
 */
export function validateCPF(cpf: string | undefined | null): boolean {
  if (!cpf || typeof cpf !== 'string') return true;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 0) return true;
  if (clean.length !== 11) return false;

  // Rejeita sequências repetidas inválidas
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (parseInt(clean.charAt(9), 10) !== d1) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  if (parseInt(clean.charAt(10), 10) !== d2) return false;

  return true;
}

/**
 * Máscara progressiva para CPF: 000.000.000-00
 */
export function maskCPF(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formatação e preservação de Telefones (Nacional e Internacional).
 * Preserva o prefixo internacional "+" e códigos de país (ex: +1, +351, +971).
 */
export function formatPhone(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Se o número começa com '+', preserva a formatação internacional
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[^\d+()\s-]/g, '').replace(/\s+/g, ' ');
  }

  // Se são apenas dígitos locais brasileiros
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return value.replace(/[^\d+()\s-]/g, '');
}

/**
 * Validação de formato de E-mail.
 */
export function validateEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') return true;
  const trimmed = email.trim();
  if (trimmed.length === 0) return true;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Validação de Data de Nascimento.
 * Valida data real de calendário (rejeitando datas inexistentes como 30 de fevereiro ou 31 de abril)
 * e impede datas no futuro, sem impor limites arbitrários de idade mínima/máxima.
 */
export function validateBirthDate(dateStr: string | undefined | null): { valid: boolean; message?: string } {
  if (!dateStr || typeof dateStr !== 'string') return { valid: true };
  const trimmed = dateStr.trim();
  if (trimmed.length === 0) return { valid: true };

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return { valid: false, message: 'Data de nascimento informada é inválida.' };
    }
    const now = new Date();
    if (parsed.getTime() > now.getTime()) {
      return { valid: false, message: 'A data de nascimento não pode ser no futuro.' };
    }
    return { valid: true };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return { valid: false, message: 'Mês de nascimento inválido.' };
  }

  // Constrói data UTC para validar rigorosamente a existência no calendário
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { valid: false, message: 'Data de nascimento inexistente no calendário.' };
  }

  const now = new Date();
  if (date.getTime() > now.getTime()) {
    return { valid: false, message: 'A data de nascimento não pode ser no futuro.' };
  }

  return { valid: true };
}

/**
 * Sanitização de RG/DNI multi-país (não impõe máscara rígida brasileira).
 */
export function sanitizeRG_DNI(value: string | undefined | null): string {
  if (!value) return '';
  return value.trim().replace(/[^\w\s.-]/gi, '');
}

/**
 * Sanitização de Passaporte (opcional, alfanumérico).
 */
export function sanitizePassport(value: string | undefined | null): string {
  if (!value) return '';
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/gi, '');
}

/**
 * Derivação centralizada e pura da Dimensão 4 — Status do Link Externo.
 * Retorna: 'no_link' | 'active' | 'expired' | 'revoked'
 */
export type ExternalLinkStatus = 'no_link' | 'active' | 'expired' | 'revoked';

export function getExternalLinkStatus(ambassador: {
  onboardingToken?: string;
  tokenExpiresAt?: string;
  onboardingTokenExpiresAt?: string;
  tokenStatus?: 'active' | 'expired' | 'revoked' | 'completed';
  onboardingTokenRevokedAt?: string;
  tokenRevokedAt?: string;
} | null | undefined): ExternalLinkStatus {
  if (!ambassador || !ambassador.onboardingToken || ambassador.onboardingToken.trim() === '') {
    return 'no_link';
  }

  if (
    ambassador.tokenStatus === 'revoked' ||
    Boolean(ambassador.onboardingTokenRevokedAt) ||
    Boolean(ambassador.tokenRevokedAt)
  ) {
    return 'revoked';
  }

  const expiresAt = ambassador.tokenExpiresAt || ambassador.onboardingTokenExpiresAt;
  if (ambassador.tokenStatus === 'expired' || (expiresAt && new Date(expiresAt).getTime() < Date.now())) {
    return 'expired';
  }

  return 'active';
}

export function getExternalLinkBadgeColor(status: ExternalLinkStatus): string {
  switch (status) {
    case 'active':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'expired':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'revoked':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'no_link':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function getExternalLinkLabel(status: ExternalLinkStatus): string {
  switch (status) {
    case 'active':
      return 'Link Ativo';
    case 'expired':
      return 'Link Expirado';
    case 'revoked':
      return 'Link Revogado';
    case 'no_link':
    default:
      return 'Sem Link';
  }
}

