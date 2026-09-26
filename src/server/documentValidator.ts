import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getSharedGenAI, GEMINI_MODEL, withAIRetry } from './aiUtils';
import {
  Ambassador,
  DocumentValidationRecord,
  DocumentFieldValidation,
  DocumentValidationFieldResult,
} from '../types';

function normalizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeDigits(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/\D/g, '');
}

function normalizeAlphanumeric(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeDate(str: string | undefined | null): string {
  if (!str) return '';
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str.trim());
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str.trim());
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str.trim();
}

export interface ExtractedDocumentData {
  isLegible: boolean;
  documentTypeIdentified?: string;
  confidence?: 'ALTA' | 'MÉDIA' | 'BAIXA';
  fullName?: string | null;
  cpf?: string | null;
  rgDni?: string | null;
  passportNumber?: string | null;
  birthDate?: string | null;
  warnings?: string | null;
}

export async function extractDataFromDocumentWithAI(
  docBuffer: Buffer,
  mimeType: string
): Promise<ExtractedDocumentData> {
  const ai = getSharedGenAI();
  if (!ai) {
    throw new Error('Serviço de IA (Gemini) não configurado no servidor.');
  }

  const prompt = `Você é um assistente especializado em conferência documental diplomática da ADMIR (American Diplomatic Mission of International Relations).
Extraia com máxima precisão e estrita fidelidade os dados visíveis no documento oficial fornecido.

DIRETRIZES FUNDAMENTAIS:
1. Extraia SOMENTE informações explicitamente visíveis e legíveis no documento.
2. NÃO deduza, NÃO invente e NÃO tente completar dados ausentes ou cortados.
3. Se o documento estiver ilegível, escuro, borrado ou corrompido, defina "isLegible": false.
4. Para campos não presentes no documento fornecido, retorne null.
5. Retorne a resposta estritamente no formato JSON estruturado.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      isLegible: { type: Type.BOOLEAN, description: 'True se o documento é legível para análise' },
      documentTypeIdentified: { type: Type.STRING, description: 'Tipo identificado: CPF, RG, CNH, Passaporte, DNI ou Outro' },
      confidence: { type: Type.STRING, enum: ['ALTA', 'MÉDIA', 'BAIXA'] },
      fullName: { type: Type.STRING, nullable: true, description: 'Nome completo no documento' },
      cpf: { type: Type.STRING, nullable: true, description: 'Número do CPF no documento' },
      rgDni: { type: Type.STRING, nullable: true, description: 'Número do RG ou DNI no documento' },
      passportNumber: { type: Type.STRING, nullable: true, description: 'Número do passaporte se for passaporte' },
      birthDate: { type: Type.STRING, nullable: true, description: 'Data de nascimento YYYY-MM-DD' },
      warnings: { type: Type.STRING, nullable: true, description: 'Observações de legibilidade ou ressalvas' },
    },
    required: ['isLegible', 'confidence'],
  };

  const cleanMimeType = mimeType.toLowerCase().includes('pdf') ? 'application/pdf' : mimeType || 'image/jpeg';

  const base64Data = docBuffer.toString('base64');

  const result = await withAIRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: cleanMimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      },
    });

    const text = response.text || '{}';
    return JSON.parse(text) as ExtractedDocumentData;
  }, 'DocumentValidationAI');

  return result;
}

export function compareAmbassadorWithExtractedData(
  ambassador: Ambassador,
  documentId: string,
  documentType: string,
  documentOriginalName: string,
  extracted: ExtractedDocumentData | null,
  errorMsg?: string
): DocumentValidationRecord {
  const analysisId = `val-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // If error occurred or unreadable
  if (!extracted || errorMsg) {
    const unverifiedFields: DocumentFieldValidation[] = [
      {
        fieldName: 'fullName',
        fieldLabel: 'Nome Completo',
        registeredValue: ambassador.fullName || ambassador.name || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        notes: errorMsg || 'Falha ao processar arquivo com a IA',
      },
      {
        fieldName: 'cpf',
        fieldLabel: 'CPF',
        registeredValue: ambassador.cpf || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        notes: errorMsg || 'Falha ao processar arquivo com a IA',
      },
      {
        fieldName: 'rgDni',
        fieldLabel: 'RG / DNI',
        registeredValue: ambassador.rgDni || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        notes: errorMsg || 'Falha ao processar arquivo com a IA',
      },
      {
        fieldName: 'passportNumber',
        fieldLabel: 'Passaporte',
        registeredValue: ambassador.passportNumber || '',
        extractedValue: '',
        result: ambassador.passportNumber ? 'NÃO FOI POSSÍVEL VALIDAR' : 'NÃO APLICÁVEL',
        notes: errorMsg || 'Falha ao processar arquivo com a IA',
      },
      {
        fieldName: 'birthDate',
        fieldLabel: 'Data de Nascimento',
        registeredValue: ambassador.birthDate || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        notes: errorMsg || 'Falha ao processar arquivo com a IA',
      },
    ];

    return {
      analysisId,
      ambassadorId: ambassador.id,
      documentId,
      documentType,
      documentOriginalName,
      model: GEMINI_MODEL,
      createdAt: now,
      analyzedAt: now,
      status: 'error',
      errorMessage: errorMsg || 'Erro no processamento',
      summary: {
        totalFields: unverifiedFields.length,
        matchingCount: 0,
        divergenceCount: 0,
        unverifiableCount: unverifiedFields.filter((f) => f.result === 'NÃO FOI POSSÍVEL VALIDAR').length,
        notPresentCount: 0,
        notApplicableCount: unverifiedFields.filter((f) => f.result === 'NÃO APLICÁVEL').length,
      },
      fields: unverifiedFields,
    };
  }

  if (!extracted.isLegible) {
    const unreadableFields: DocumentFieldValidation[] = [
      {
        fieldName: 'fullName',
        fieldLabel: 'Nome Completo',
        registeredValue: ambassador.fullName || ambassador.name || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        confidence: 'BAIXA',
        notes: 'Documento ilegível, cortado ou de baixa resolução.',
      },
      {
        fieldName: 'cpf',
        fieldLabel: 'CPF',
        registeredValue: ambassador.cpf || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        confidence: 'BAIXA',
        notes: 'Documento ilegível, cortado ou de baixa resolução.',
      },
      {
        fieldName: 'rgDni',
        fieldLabel: 'RG / DNI',
        registeredValue: ambassador.rgDni || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        confidence: 'BAIXA',
        notes: 'Documento ilegível, cortado ou de baixa resolução.',
      },
      {
        fieldName: 'passportNumber',
        fieldLabel: 'Passaporte',
        registeredValue: ambassador.passportNumber || '',
        extractedValue: '',
        result: ambassador.passportNumber ? 'NÃO FOI POSSÍVEL VALIDAR' : 'NÃO APLICÁVEL',
        confidence: 'BAIXA',
        notes: 'Documento ilegível, cortado ou de baixa resolução.',
      },
      {
        fieldName: 'birthDate',
        fieldLabel: 'Data de Nascimento',
        registeredValue: ambassador.birthDate || '',
        extractedValue: '',
        result: 'NÃO FOI POSSÍVEL VALIDAR',
        confidence: 'BAIXA',
        notes: 'Documento ilegível, cortado ou de baixa resolução.',
      },
    ];

    return {
      analysisId,
      ambassadorId: ambassador.id,
      documentId,
      documentType,
      documentOriginalName,
      model: GEMINI_MODEL,
      createdAt: now,
      analyzedAt: now,
      status: 'unreadable',
      errorMessage: 'Documento identificado como ilegível.',
      summary: {
        totalFields: unreadableFields.length,
        matchingCount: 0,
        divergenceCount: 0,
        unverifiableCount: unreadableFields.filter((f) => f.result === 'NÃO FOI POSSÍVEL VALIDAR').length,
        notPresentCount: 0,
        notApplicableCount: unreadableFields.filter((f) => f.result === 'NÃO APLICÁVEL').length,
      },
      fields: unreadableFields,
    };
  }

  const evaluatedFields: DocumentFieldValidation[] = [];

  // 1. Full Name Comparison
  const regName = (ambassador.fullName || ambassador.name || '').trim();
  const extName = (extracted.fullName || '').trim();
  let nameResult: DocumentValidationFieldResult = 'NÃO CONSTA NO DOCUMENTO';

  if (!extName) {
    nameResult = 'NÃO CONSTA NO DOCUMENTO';
  } else if (normalizeString(regName) === normalizeString(extName)) {
    nameResult = 'CONFERE';
  } else {
    nameResult = 'DIVERGÊNCIA ENCONTRADA';
  }

  evaluatedFields.push({
    fieldName: 'fullName',
    fieldLabel: 'Nome Completo',
    registeredValue: regName,
    extractedValue: extName,
    result: nameResult,
    confidence: extracted.confidence || 'ALTA',
  });

  // 2. CPF Comparison
  const regCpf = (ambassador.cpf || '').trim();
  const extCpf = (extracted.cpf || '').trim();
  let cpfResult: DocumentValidationFieldResult = 'NÃO CONSTA NO DOCUMENTO';

  if (!extCpf) {
    cpfResult = 'NÃO CONSTA NO DOCUMENTO';
  } else if (normalizeDigits(regCpf) === normalizeDigits(extCpf) && normalizeDigits(regCpf).length > 0) {
    cpfResult = 'CONFERE';
  } else {
    cpfResult = 'DIVERGÊNCIA ENCONTRADA';
  }

  evaluatedFields.push({
    fieldName: 'cpf',
    fieldLabel: 'CPF',
    registeredValue: regCpf,
    extractedValue: extCpf,
    result: cpfResult,
    confidence: extracted.confidence || 'ALTA',
  });

  // 3. RG / DNI Comparison
  const regRg = (ambassador.rgDni || '').trim();
  const extRg = (extracted.rgDni || '').trim();
  let rgResult: DocumentValidationFieldResult = 'NÃO CONSTA NO DOCUMENTO';

  if (!extRg) {
    rgResult = 'NÃO CONSTA NO DOCUMENTO';
  } else if (normalizeAlphanumeric(regRg) === normalizeAlphanumeric(extRg) && normalizeAlphanumeric(regRg).length > 0) {
    rgResult = 'CONFERE';
  } else {
    rgResult = 'DIVERGÊNCIA ENCONTRADA';
  }

  evaluatedFields.push({
    fieldName: 'rgDni',
    fieldLabel: 'RG / DNI',
    registeredValue: regRg,
    extractedValue: extRg,
    result: rgResult,
    confidence: extracted.confidence || 'ALTA',
  });

  // 4. Passport Comparison (Optional)
  const regPassport = (ambassador.passportNumber || '').trim();
  const extPassport = (extracted.passportNumber || '').trim();
  let passResult: DocumentValidationFieldResult = 'NÃO APLICÁVEL';

  if (!regPassport) {
    passResult = 'NÃO APLICÁVEL';
  } else if (!extPassport) {
    passResult = 'NÃO CONSTA NO DOCUMENTO';
  } else if (normalizeAlphanumeric(regPassport) === normalizeAlphanumeric(extPassport)) {
    passResult = 'CONFERE';
  } else {
    passResult = 'DIVERGÊNCIA ENCONTRADA';
  }

  evaluatedFields.push({
    fieldName: 'passportNumber',
    fieldLabel: 'Passaporte',
    registeredValue: regPassport,
    extractedValue: extPassport,
    result: passResult,
    confidence: extracted.confidence || 'ALTA',
  });

  // 5. Birth Date Comparison
  const regBirth = (ambassador.birthDate || '').trim();
  const extBirth = (extracted.birthDate || '').trim();
  let birthResult: DocumentValidationFieldResult = 'NÃO CONSTA NO DOCUMENTO';

  if (!extBirth) {
    birthResult = 'NÃO CONSTA NO DOCUMENTO';
  } else if (normalizeDate(regBirth) === normalizeDate(extBirth) && normalizeDate(regBirth).length > 0) {
    birthResult = 'CONFERE';
  } else {
    birthResult = 'DIVERGÊNCIA ENCONTRADA';
  }

  evaluatedFields.push({
    fieldName: 'birthDate',
    fieldLabel: 'Data de Nascimento',
    registeredValue: regBirth,
    extractedValue: extBirth,
    result: birthResult,
    confidence: extracted.confidence || 'ALTA',
  });

  const matchingCount = evaluatedFields.filter((f) => f.result === 'CONFERE').length;
  const divergenceCount = evaluatedFields.filter((f) => f.result === 'DIVERGÊNCIA ENCONTRADA').length;
  const unverifiableCount = evaluatedFields.filter((f) => f.result === 'NÃO FOI POSSÍVEL VALIDAR').length;
  const notPresentCount = evaluatedFields.filter((f) => f.result === 'NÃO CONSTA NO DOCUMENTO').length;
  const notApplicableCount = evaluatedFields.filter((f) => f.result === 'NÃO APLICÁVEL').length;

  return {
    analysisId,
    ambassadorId: ambassador.id,
    documentId,
    documentType,
    documentOriginalName,
    model: GEMINI_MODEL,
    createdAt: now,
    analyzedAt: now,
    status: 'completed',
    summary: {
      totalFields: evaluatedFields.length,
      matchingCount,
      divergenceCount,
      unverifiableCount,
      notPresentCount,
      notApplicableCount,
    },
    fields: evaluatedFields,
  };
}
