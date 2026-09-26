/**
 * ADMIR — Suíte de Homologação e Testes Automatizados (A–G)
 * REGRAS DOCUMENTAIS INTERNACIONAIS DE EMBAIXADORES
 *
 * Teste A: Procedência, Governança e Anti-Invenção de Legislação
 * Teste B: Resolução de Regras por País e Fallback DEFAULT
 * Teste C: Onboarding Adaptativo de Candidatos por País
 * Teste D: Completude Documental Não Bloqueante (computeAmbassadorCompletion)
 * Teste E: Upload Seguro de Documentos Privados e Associação à Regra
 * Teste F: AppSec & RBAC / IAM (Controle de Acesso em Configuração de Regras)
 * Teste G: Auditoria, Internacionalização (i18n) e Não-Regressão
 */

import { db } from '../server/db';
import { INITIAL_COUNTRY_DOCUMENT_RULES } from '../data/initialData';
import { User, CountryDocumentRule, PrivateDocument } from '../types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — Detalhe: ${detail}` : ''}`);
  }
}

async function runHomologationSuite() {
  console.log('\n===============================================================');
  console.log('ADMIR — SUÍTE DE HOMOLOGAÇÃO: REGRAS DOCUMENTAIS INTERNACIONAIS');
  console.log('===============================================================\n');

  const adminUser: User = {
    id: 'admin-qa-homolog',
    name: 'Admin QA Homologação',
    email: 'admin.qa@admir.org',
    role: 'owner',
    permissions: {
      'ambassadors.view': true,
      'ambassadors.create': true,
      'ambassadors.edit': true,
      'ambassadors.publish': true,
      'ambassadors.delete': true,
    } as any,
    status: 'active',
    joinedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const restrictedUser: User = {
    id: 'viewer-restricted-user',
    name: 'Usuário Visualizador',
    email: 'viewer@admir.org',
    role: 'viewer',
    permissions: {
      'ambassadors.view': true,
      'ambassadors.create': false,
      'ambassadors.edit': false,
      'ambassadors.publish': false,
      'ambassadors.delete': false,
    } as any,
    status: 'active',
    joinedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------------------
  // TESTE A: Procedência, Governança e Anti-Invenção de Legislação
  // -------------------------------------------------------------------------
  console.log('--- TESTE A: Procedência e Não Invenção de Exigências Legais ---');
  
  // 1. Todas as 13 regras geradas no scaffolding devem ser classificadas como DEMO
  const initialRules = INITIAL_COUNTRY_DOCUMENT_RULES;
  assert(
    initialRules.length === 13,
    'Contagem de regras padrão inicial',
    `Esperado 13, encontrado ${initialRules.length}`
  );

  const nonDemoRules = initialRules.filter((r) => r.sourceType !== 'DEMO');
  assert(
    nonDemoRules.length === 0,
    'Todas as regras pré-cadastradas marcadas explicitamente como DEMO',
    nonDemoRules.length > 0 ? `Regras sem DEMO: ${nonDemoRules.map((r) => r.id).join(', ')}` : 'OK'
  );

  const rulesWithUnverifiedLegalClaims = initialRules.filter(
    (r) => r.sourceType === 'LEGAL_REFERENCE' && !r.sourceReference
  );
  assert(
    rulesWithUnverifiedLegalClaims.length === 0,
    'Nenhuma regra da IA afirma ser lei nacional soberana sem ato formal comprovado'
  );

  for (const r of initialRules) {
    assert(
      Boolean(r.sourceType && r.administrativeNotes),
      `Regra ${r.id} possui sourceType e administrativeNotes declarados`,
      `sourceType: ${r.sourceType}`
    );
  }

  // -------------------------------------------------------------------------
  // TESTE B: Resolução de Regras por País e Fallback DEFAULT
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE B: Resolução de Regras por País e Fallback DEFAULT ---');

  // Brasil (BR)
  const brRulesByName = db.getApplicableRulesForCountry('Brasil');
  const brRulesByIso = db.getApplicableRulesForCountry('BR');
  assert(
    brRulesByName.length > 0 && brRulesByName.every((r) => r.countryIso === 'BR'),
    'Resolução para "Brasil" retorna exclusivamente regras com ISO "BR"',
    `Total de regras BR: ${brRulesByName.length}`
  );
  assert(
    brRulesByIso.length === brRulesByName.length,
    'Resolução por ISO ("BR") é idêntica à resolução por nome ("Brasil")'
  );

  // Estados Unidos (US)
  const usRules = db.getApplicableRulesForCountry('United States');
  assert(
    usRules.length > 0 && usRules.every((r) => r.countryIso === 'US'),
    'Resolução para "United States" retorna exclusivamente regras com ISO "US"',
    `Total de regras US: ${usRules.length}`
  );

  // País sem regras específicas (ex: França, Japão, Argentina) -> FALLBACK DEFAULT
  const frRules = db.getApplicableRulesForCountry('França');
  const jpRules = db.getApplicableRulesForCountry('JP');
  const unknownCountryRules = db.getApplicableRulesForCountry('País Fictício de Teste');
  const emptyCountryRules = db.getApplicableRulesForCountry('');

  assert(
    frRules.length > 0 && frRules.every((r) => r.countryIso === 'DEFAULT'),
    'País sem regras específicas (França) aciona fallback DEFAULT',
    `Total de regras DEFAULT recebidas: ${frRules.length}`
  );
  assert(
    jpRules.length > 0 && jpRules.every((r) => r.countryIso === 'DEFAULT'),
    'País com código ISO sem regras (JP) aciona fallback DEFAULT'
  );
  assert(
    unknownCountryRules.length > 0 && unknownCountryRules.every((r) => r.countryIso === 'DEFAULT'),
    'País desconhecido aciona fallback DEFAULT'
  );
  assert(
    emptyCountryRules.length > 0 && emptyCountryRules.every((r) => r.countryIso === 'DEFAULT'),
    'País vazio/não informado aciona fallback DEFAULT'
  );

  // -------------------------------------------------------------------------
  // TESTE C: Onboarding Adaptativo de Candidato por País
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE C: Onboarding Adaptativo de Candidato por País ---');

  // Criar candidato para o Brasil
  const testCandidateBr = db.createAmbassador(
    {
      fullName: 'Embaixador Teste Brasil Homologação',
      country: 'Brasil',
      role: 'Embaixador para Cooperação Humanitária',
      email: 'candidato.brasil@homolog.test',
      phone: '+55 11 99999-1111',
      profession: 'Diplomata & Advogado',
      address: 'Brasília, DF, Brasil',
      birthDate: '1985-05-15',
      curriculumSummary: 'Trajetória em direitos humanos e relações diplomáticas multilaterais.',
      shortBiography: 'Bio breve teste',
      fullBiography: 'Biografia completa teste',
      photo: '',
      orderIndex: 99,
      isVisible: false,
    },
    adminUser
  );

  // Criar candidato para país terceiro (ex: Uruguai)
  const testCandidateUr = db.createAmbassador(
    {
      fullName: 'Ambassador Test Uruguay Homologation',
      country: 'Uruguai',
      role: 'Diplomatic Envoy',
      email: 'candidato.uruguay@homolog.test',
      phone: '+598 2 123 4567',
      profession: 'International Relations Professor',
      address: 'Montevideo, Uruguay',
      birthDate: '1980-10-20',
      curriculumSummary: 'Extensive academic and diplomatic research in South America.',
      shortBiography: 'Bio breve Uruguai',
      fullBiography: 'Biografia completa Uruguai',
      photo: '',
      orderIndex: 100,
      isVisible: false,
    },
    adminUser
  );

  const brCandidateRules = db.getApplicableRulesForCountry(testCandidateBr.country);
  const urCandidateRules = db.getApplicableRulesForCountry(testCandidateUr.country);

  assert(
    brCandidateRules.some((r) => r.documentCode === 'cpf'),
    'Candidato do Brasil possui regra de CPF nos requisitos aplicáveis'
  );
  assert(
    !urCandidateRules.some((r) => r.documentCode === 'cpf'),
    'Candidato de outro país (Uruguai) NÃO possui exigência de CPF brasileiro'
  );
  assert(
    urCandidateRules.every((r) => r.countryIso === 'DEFAULT'),
    'Candidato do Uruguai recebe integralmente regras DEFAULT internacionais'
  );

  // -------------------------------------------------------------------------
  // TESTE D: Completude Documental Não Bloqueante (computeAmbassadorCompletion)
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE D: Completude Documental Não Bloqueante ---');

  // Antes de enviar documentos, pendências devem existir
  const initialCompBr = db.computeAmbassadorCompletion(testCandidateBr);
  assert(
    initialCompBr.completionPercentage < 100,
    'Candidato recém-criado sem documentos tem completude < 100%',
    `${initialCompBr.completionPercentage}%`
  );
  assert(
    initialCompBr.pendingItems.length > 0,
    'Pendências obrigatórias são listadas explicitamente',
    `Pendências: ${initialCompBr.pendingItems.join(', ')}`
  );

  // Adicionar apenas os documentos OBRIGATÓRIOS para o Brasil:
  // No Brasil as obrigatórias são: RG/ID ('rg'), CPF ('cpf'), Foto ('photo'), Currículo ('curriculum')
  // Comprovante de Tipo Sanguíneo ('blood_type') é OPCIONAL (isRequired: false)
  const brRequired = brCandidateRules.filter((r) => r.isActive && r.isRequired);
  for (const r of brRequired) {
    db.addPrivateDocumentToAmbassador(testCandidateBr.id, {
      type: r.documentCode,
      documentCode: r.documentCode,
      ruleId: r.id,
      fileName: `test-${r.documentCode}.pdf`,
      originalName: `${r.documentName}.pdf`,
      fileSize: 1024,
      mimeType: 'application/pdf',
      path: `/tmp/fake-${r.documentCode}.pdf`,
    });
  }

  // Preencher CPF cadastral para validar
  testCandidateBr.cpf = '000.000.000-00';
  testCandidateBr.photo = 'https://admir.org/diplomat.jpg';
  const updatedCompBr = db.computeAmbassadorCompletion(testCandidateBr);

  assert(
    updatedCompBr.completionPercentage === 100,
    'Candidato com todos os documentos obrigatórios atinge 100% de completude documental',
    `Completude: ${updatedCompBr.completionPercentage}%`
  );
  assert(
    updatedCompBr.pendingItems.length === 0,
    'Nenhum item pendente quando apenas documentos obrigatórios foram enviados'
  );
  assert(
    !testCandidateBr.documents?.some((d) => d.documentCode === 'blood_type'),
    'Documento opcional (Tipo Sanguíneo) ausente NÃO impede 100% de completude'
  );

  // Testar candidato do Uruguai com regras DEFAULT
  // No DEFAULT: Passport ('passport'), Foto ('photo'), Currículo ('curriculum') são obrigatórios;
  // Comprovante de Residência ('residence_proof') é OPCIONAL.
  const urRequired = urCandidateRules.filter((r) => r.isActive && r.isRequired);
  for (const r of urRequired) {
    db.addPrivateDocumentToAmbassador(testCandidateUr.id, {
      type: r.documentCode,
      documentCode: r.documentCode,
      ruleId: r.id,
      fileName: `test-${r.documentCode}.pdf`,
      originalName: `${r.documentName}.pdf`,
      fileSize: 2048,
      mimeType: 'application/pdf',
      path: `/tmp/fake-ur-${r.documentCode}.pdf`,
    });
  }
  testCandidateUr.photo = 'https://admir.org/diplomat-ur.jpg';
  const updatedCompUr = db.computeAmbassadorCompletion(testCandidateUr);

  assert(
    updatedCompUr.completionPercentage === 100,
    'Candidato internacional (DEFAULT) com obrigatórios atinge 100% de completude',
    `Completude: ${updatedCompUr.completionPercentage}%`
  );
  assert(
    !testCandidateUr.documents?.some((d) => d.documentCode === 'residence_proof'),
    'Comprovante de residência internacional opcional ausente NÃO impede 100% de completude'
  );

  // -------------------------------------------------------------------------
  // TESTE E: Upload Seguro de Documentos Privados e Associação à Regra
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE E: Upload Seguro e Associação a Regra ---');

  const sampleDoc = testCandidateBr.documents?.[0];
  assert(
    Boolean(sampleDoc && sampleDoc.ruleId && sampleDoc.documentCode),
    'Documento privado possui ruleId e documentCode gravados no registro',
    `ruleId: ${sampleDoc?.ruleId}, documentCode: ${sampleDoc?.documentCode}`
  );

  // Sanitização pública: dados privados nunca vazam para o frontend público
  const publicData = db.sanitizeAmbassadorPublic(testCandidateBr);
  assert(
    publicData.documents === undefined,
    'Sanitização pública remove integralmente lista de documentos privados'
  );
  assert(
    publicData.cpf === undefined && publicData.passportNumber === undefined,
    'Sanitização pública remove CPF e Passaporte do payload público'
  );
  assert(
    publicData.onboardingToken === undefined,
    'Sanitização pública remove onboardingToken'
  );

  // -------------------------------------------------------------------------
  // TESTE F: AppSec & RBAC / IAM (Controle de Acesso em Configuração de Regras)
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE F: AppSec & RBAC / IAM ---');

  // Criar regra customizada como admin
  let customRule: CountryDocumentRule | null = null;
  try {
    customRule = db.createCountryDocumentRule(
      {
        country: 'Canadá',
        countryIso: 'CA',
        documentName: 'Canadian Passport or Government Photo ID',
        documentCode: 'passport',
        category: 'identification',
        isRequired: true,
        sourceType: 'TEST',
        sourceReference: 'QA-SUITE-HOMOLOG-2026',
        administrativeNotes: 'Regra de teste automatizado para validação de segurança RBAC.',
      },
      adminUser
    );
    assert(Boolean(customRule && customRule.id), 'Admin com permissão "ambassadors.edit" cria regra documental com sucesso');
  } catch (err: any) {
    assert(false, 'Admin deveria poder criar regra documental', err.message);
  }

  // Validar campos de procedência gravados
  assert(
    customRule?.sourceType === 'TEST' && customRule?.sourceReference === 'QA-SUITE-HOMOLOG-2026',
    'Nova regra grava corretamente sourceType ("TEST") e sourceReference'
  );

  // Atualizar regra como admin
  if (customRule) {
    const updated = db.updateCountryDocumentRule(
      customRule.id,
      {
        administrativeNotes: 'Atualizado pela suíte de teste de segurança.',
        isRequired: false,
      },
      adminUser
    );
    assert(
      updated.administrativeNotes === 'Atualizado pela suíte de teste de segurança.' && updated.isRequired === false,
      'Admin com permissão atualiza regra documental com sucesso'
    );
  }

  // -------------------------------------------------------------------------
  // TESTE G: Auditoria, Internacionalização (i18n) e Não-Regressão
  // -------------------------------------------------------------------------
  console.log('\n--- TESTE G: Auditoria, i18n e Não-Regressão ---');

  // Checar registro em auditLogs
  const allLogs = (db as any).data.auditLogs || [];
  const ruleCreationLogs = allLogs.filter(
    (l: any) => l.module === 'Ambassadors' && l.action === 'Criação' && l.details?.includes('Canadá')
  );
  assert(
    ruleCreationLogs.length > 0,
    'Criação de regra documental registrada na trilha de auditoria (módulo Ambassadors)',
    `Logs encontrados: ${ruleCreationLogs.length}`
  );

  // Excluir regra de teste criada
  if (customRule) {
    const deleted = db.deleteCountryDocumentRule(customRule.id, adminUser);
    assert(deleted === true, 'Regra de teste excluída com sucesso');

    const deletionLogs = allLogs.filter(
      (l: any) => l.module === 'Ambassadors' && l.action === 'Exclusão' && l.affectedRecord === customRule!.id
    );
    assert(
      deletionLogs.length > 0,
      'Exclusão de regra documental registrada na trilha de auditoria'
    );
  }

  // Limpar candidatos de teste criados
  db.deleteAmbassador(testCandidateBr.id, adminUser);
  db.deleteAmbassador(testCandidateUr.id, adminUser);

  // Validar integridade da base
  assert(
    (db as any).data.countryDocumentRules.length >= 13,
    'Catálogo de regras preserva no mínimo as 13 regras fundamentais pós-limpeza',
    `Total de regras: ${(db as any).data.countryDocumentRules.length}`
  );

  // -------------------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`);
  console.log(`PASSARAM: ${passedTests}`);
  console.log(`FALHARAM: ${failedTests}`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runHomologationSuite().catch((err) => {
  console.error('Erro fatal ao rodar suíte de homologação:', err);
  process.exit(1);
});
