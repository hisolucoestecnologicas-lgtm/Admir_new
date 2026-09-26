/**
 * ADMIR — CHECKPOINT FINAL DE SEGURANÇA DAS REGRAS DOCUMENTAIS
 * RBAC 403 + MATRIZ R2_PRIVATE/TOKENS + ANTI-IDOR + AUDITORIA + CLEANUP
 */

import http from 'http';
import express from 'express';
import { apiRouter } from '../server/routes';
import { db } from '../server/db';
import { User, Ambassador } from '../types';
import { PrivateDocumentStorage } from '../server/privateStorage';

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

async function runSecurityCheckpoint() {
  console.log('===============================================================');
  console.log('ADMIR — CHECKPOINT DE SEGURANÇA: RBAC 403 & R2_PRIVATE & TOKENS');
  console.log('===============================================================\n');

  // Configure Express App
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api', apiRouter);

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper for requests
  async function apiFetch(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
    const { method = 'GET', headers = {}, body } = options;
    const fetchHeaders: Record<string, string> = { ...headers };
    let fetchBody: string | undefined;

    if (body !== undefined) {
      fetchHeaders['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: fetchHeaders,
      body: fetchBody,
    });

    let resBody: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        resBody = await res.json();
      } catch (e) {
        resBody = null;
      }
    } else {
      resBody = await res.text();
    }

    return {
      status: res.status,
      headers: res.headers,
      body: resBody,
    };
  }

  // -------------------------------------------------------------------------
  // 1. BASELINE REGISTRATION
  // -------------------------------------------------------------------------
  console.log('--- 1. REGISTRO DE BASELINE ---');
  const baselineAmbassadors = db.getAmbassadors(true);
  const baselineAmbassadorsCount = baselineAmbassadors.length;

  const baselineRules = db.getCountryDocumentRules('', true);
  const baselineRulesCount = baselineRules.length;
  const baselineRuleIds = baselineRules.map((r) => r.id);

  let baselinePrivDocsCount = 0;
  baselineAmbassadors.forEach((a) => {
    if (a.documents) baselinePrivDocsCount += a.documents.length;
  });

  const baselineAuditLogs = (db as any).data?.auditLogs || [];
  const baselineAuditLogsCount = baselineAuditLogs.length;

  console.log(`  • Embaixadores Iniciais: ${baselineAmbassadorsCount}`);
  console.log(`  • Regras Documentais Iniciais: ${baselineRulesCount}`);
  console.log(`  • IDs das 13 Regras DEMO: ${JSON.stringify(baselineRuleIds)}`);
  console.log(`  • Documentos Privados Iniciais: ${baselinePrivDocsCount}`);
  console.log(`  • Logs de Auditoria Iniciais: ${baselineAuditLogsCount}\n`);

  assert(baselineRulesCount === 13, 'Baseline: Total de 13 regras documentais existentes');

  // Controlled test identities
  const authorizedAdmin: User = {
    id: 'user-admin-authorized',
    name: 'Admin Autorizado',
    email: 'admin.auth@admir.org',
    role: 'manager',
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

  const unauthorizedViewer: User = {
    id: 'user-viewer-unauthorized',
    name: 'Viewer Sem Permissão',
    email: 'viewer.unauth@admir.org',
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

  // Register in DB user cache for resolveUser middleware lookup
  (db as any).data.users.push(authorizedAdmin);
  (db as any).data.users.push(unauthorizedViewer);

  let createdTestRuleId: string | null = null;
  let candidateA: Ambassador | null = null;
  let candidateB: Ambassador | null = null;
  let testDocAId: string | null = null;
  let docStorageKey: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 2. TESTE RBAC NEGATIVO & POSITIVO
    // -------------------------------------------------------------------------
    console.log('--- 2. TESTE RBAC NEGATIVO (HTTP 403) E POSITIVO ---');

    // A) POST de nova regra documental com usuário sem permissão (Viewer)
    const resPostUnauth = await apiFetch('/api/country-document-rules', {
      method: 'POST',
      headers: { 'x-user-id': unauthorizedViewer.id },
      body: {
        country: 'Teste Negativo',
        countryIso: 'TN',
        documentName: 'Documento Não Autorizado',
        documentCode: 'test_unauth',
        category: 'identification',
        isRequired: true,
      },
    });

    assert(
      resPostUnauth.status === 403,
      'RBAC Negativo A: POST /api/country-document-rules retorna 403 sem permissão',
      `Status: ${resPostUnauth.status}`
    );

    // Criação autorizada de regra [TEST] para testar PUT/DELETE
    const resPostAuth = await apiFetch('/api/country-document-rules', {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
      body: {
        country: 'País de Teste RBAC',
        countryIso: 'TR',
        documentName: 'Regra de Teste RBAC Temporária',
        documentCode: 'test_rbac_doc',
        category: 'identification',
        isRequired: true,
        sourceType: 'TEST',
        sourceReference: 'RBAC-CHECKPOINT-2026',
        administrativeNotes: 'Regra temporária criada para validação de RBAC 403.',
      },
    });

    assert(
      resPostAuth.status === 201,
      'RBAC Positivo: POST /api/country-document-rules retorna 201 com admin autorizado',
      `Status: ${resPostAuth.status}`
    );
    createdTestRuleId = resPostAuth.body?.id;
    assert(Boolean(createdTestRuleId), 'ID da regra temporária obtido');

    // B) PUT de regra documental sem permissão
    const resPutUnauth = await apiFetch(`/api/country-document-rules/${createdTestRuleId}`, {
      method: 'PUT',
      headers: { 'x-user-id': unauthorizedViewer.id },
      body: {
        documentName: 'Tentativa de Modificação Não Autorizada',
      },
    });

    assert(
      resPutUnauth.status === 403,
      'RBAC Negativo B: PUT /api/country-document-rules/:id retorna 403 sem permissão',
      `Status: ${resPutUnauth.status}`
    );

    // C) DELETE de regra documental sem permissão
    const resDelUnauth = await apiFetch(`/api/country-document-rules/${createdTestRuleId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': unauthorizedViewer.id },
    });

    assert(
      resDelUnauth.status === 403,
      'RBAC Negativo C: DELETE /api/country-document-rules/:id retorna 403 sem permissão',
      `Status: ${resDelUnauth.status}`
    );

    // D) Reorder de regras documentais sem permissão
    const resReorderUnauth = await apiFetch('/api/country-document-rules/reorder', {
      method: 'POST',
      headers: { 'x-user-id': unauthorizedViewer.id },
      body: {
        orderedIds: [createdTestRuleId],
      },
    });

    assert(
      resReorderUnauth.status === 403,
      'RBAC Negativo D: POST /api/country-document-rules/reorder retorna 403 sem permissão',
      `Status: ${resReorderUnauth.status}`
    );

    // E) Reorder de regras com admin autorizado (Cenário Positivo)
    const resReorderAuth = await apiFetch('/api/country-document-rules/reorder', {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
      body: {
        orderedIds: [createdTestRuleId!],
      },
    });

    assert(
      resReorderAuth.status === 200,
      'RBAC Positivo: POST /api/country-document-rules/reorder retorna 200 com admin autorizado',
      `Status: ${resReorderAuth.status}`
    );

    // -------------------------------------------------------------------------
    // 3. MATRIZ DE SEGURANÇA — DOCUMENTO R2_PRIVATE & TOKENS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. MATRIZ DE SEGURANÇA: R2_PRIVATE & CONTROLE DE TOKENS ---');

    // Criar Candidato A via endpoint normal /api/ambassadors
    const resCreateAmbA = await apiFetch('/api/ambassadors', {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
      body: {
        fullName: 'Candidato Artificial A de Teste',
        country: 'Brasil',
        role: 'Representante Especial',
        email: 'candidato.a@seguranca.test',
        phone: '+55 11 98888-0001',
        profession: 'Auditor de Segurança',
        address: 'São Paulo, SP, Brasil',
        birthDate: '1990-01-01',
        curriculumSummary: 'Especialista em segurança da informação.',
        shortBiography: 'Bio curta A',
        fullBiography: 'Bio completa A',
        photo: '',
        orderIndex: 101,
        isVisible: false,
      },
    });

    candidateA = resCreateAmbA.body;
    assert(Boolean(candidateA?.id), `Candidato A criado via endpoint normal (ID: ${candidateA?.id})`);

    // Criar Candidato B via endpoint normal /api/ambassadors
    const resCreateAmbB = await apiFetch('/api/ambassadors', {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
      body: {
        fullName: 'Candidato Artificial B de Teste',
        country: 'Brasil',
        role: 'Representante Adjunto',
        email: 'candidato.b@seguranca.test',
        phone: '+55 11 98888-0002',
        profession: 'Engenheiro de Redes',
        address: 'Rio de Janeiro, RJ, Brasil',
        birthDate: '1992-02-02',
        curriculumSummary: 'Especialista em infraestrutura.',
        shortBiography: 'Bio curta B',
        fullBiography: 'Bio completa B',
        photo: '',
        orderIndex: 102,
        isVisible: false,
      },
    });

    candidateB = resCreateAmbB.body;
    assert(Boolean(candidateB?.id), `Candidato B criado via endpoint normal (ID: ${candidateB?.id})`);

    // Gerar tokens de onboarding para A e B via endpoints oficiais /api/ambassadors/:id/generate-link
    const resGenLinkA = await apiFetch(`/api/ambassadors/${candidateA!.id}/generate-link`, {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
    });
    const tokenA = resGenLinkA.body?.token;

    const resGenLinkB = await apiFetch(`/api/ambassadors/${candidateB!.id}/generate-link`, {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
    });
    const tokenB = resGenLinkB.body?.token;

    assert(Boolean(tokenA && tokenB), 'Tokens de onboarding gerados com sucesso via endpoint oficial');

    // Anexar documento privado ao Candidato A pelo mecanismo normal de upload
    const samplePdfBuffer = Buffer.from('%PDF-1.4 Mock Private Diplomatic Document Content for Security Checkpoint');
    const sampleBase64 = 'data:application/pdf;base64,' + samplePdfBuffer.toString('base64');

    const resUploadDoc = await apiFetch(`/api/ambassadors/${candidateA!.id}/documents`, {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
      body: {
        type: 'passport',
        fileName: 'passaporte_privado_seguro.pdf',
        fileData: sampleBase64,
        mimeType: 'application/pdf',
        fileSize: samplePdfBuffer.length,
        ruleId: 'rule-default-passport',
        documentCode: 'passport',
      },
    });

    assert(resUploadDoc.status === 201, 'Upload do documento privado pelo mecanismo normal efetuado com HTTP 201', `Status: ${resUploadDoc.status}`);
    const createdDoc = resUploadDoc.body;
    testDocAId = createdDoc?.id;
    docStorageKey = createdDoc?.path || createdDoc?.storageKey;

    const storageProvider = createdDoc?.storageProvider;
    console.log(`  • Documento Criado ID: ${testDocAId}, Provider: ${storageProvider}, Path: ${docStorageKey}`);
    assert(Boolean(testDocAId), `Documento privado ID obtido: ${testDocAId}`);
    assert(
      storageProvider === 'R2_PRIVATE' || storageProvider === 'FILESYSTEM',
      `Storage Provider confirmado (${storageProvider})`
    );

    // CENÁRIO A: Admin autenticado e autorizado solicita o download do documento
    const resDocAdminAuth = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download`,
      { headers: { 'x-user-id': authorizedAdmin.id } }
    );

    assert(
      resDocAdminAuth.status === 200,
      'Cenário A: Admin autorizado acessa documento privado com HTTP 200',
      `Status: ${resDocAdminAuth.status}`
    );

    // CENÁRIO B: Solicitação sem autenticação e sem token
    const resDocNoAuth = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download`
    );

    assert(
      resDocNoAuth.status === 401 || resDocNoAuth.status === 403,
      'Cenário B: Acesso sem autenticação retorna HTTP 401/403 (Negado)',
      `Status: ${resDocNoAuth.status}`
    );

    // CENÁRIO C: Token de onboarding válido pertencente ao próprio candidato A
    const resDocTokenA = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download?token=${tokenA}`
    );

    assert(
      resDocTokenA.status === 200,
      'Cenário C: Token válido do próprio candidato A acessa seu documento com HTTP 200',
      `Status: ${resDocTokenA.status}`
    );

    // CENÁRIO D: Token de OUTRO candidato (B) tentando acessar documento do candidato A
    const resDocTokenB = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download?token=${tokenB}`
    );

    assert(
      resDocTokenB.status === 401 || resDocTokenB.status === 403,
      'Cenário D: Token do candidato B tentando acessar documento do candidato A é NEGADO (HTTP 401/403)',
      `Status: ${resDocTokenB.status}`
    );

    // -------------------------------------------------------------------------
    // 4. TESTE DE TOKEN REVOGADO
    // -------------------------------------------------------------------------
    console.log('\n--- 4. TESTE DE TOKEN REVOGADO ---');

    // Comprovar que o token de onboarding A funciona antes da revogação
    const resOnboardBefore = await apiFetch(`/api/ambassador-onboarding/${tokenA}`);
    assert(
      resOnboardBefore.status === 200,
      'Onboarding com Token A funciona antes da revogação (HTTP 200)',
      `Status: ${resOnboardBefore.status}`
    );

    // Revogar token A oficialmente via endpoint /api/ambassadors/:id/revoke-link
    const resRevoke = await apiFetch(`/api/ambassadors/${candidateA!.id}/revoke-link`, {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
    });
    assert(resRevoke.status === 200 && resRevoke.body?.success === true, 'Token A revogado com sucesso pela administração via endpoint oficial');

    // Tentar acessar onboarding com exatamente o mesmo token A após revogação
    const resOnboardAfterRevoke = await apiFetch(`/api/ambassador-onboarding/${tokenA}`);
    assert(
      resOnboardAfterRevoke.status === 404 || resOnboardAfterRevoke.status === 403,
      'Token revogado é rejeitado no endpoint de onboarding (HTTP 404/403)',
      `Status: ${resOnboardAfterRevoke.status}`
    );

    // Tentar acessar download de documento privado com o token revogado
    const resDocTokenRevoked = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download?token=${tokenA}`
    );

    assert(
      resDocTokenRevoked.status === 401 || resDocTokenRevoked.status === 403,
      'Token revogado tem download de documento bloqueado (HTTP 401/403)',
      `Status: ${resDocTokenRevoked.status}`
    );

    // -------------------------------------------------------------------------
    // 5. TESTE DE TOKEN EXPIRADO
    // -------------------------------------------------------------------------
    console.log('\n--- 5. TESTE DE TOKEN EXPIRADO ---');

    // Gerar novo token para B e forçar data de expiração no passado no registro subjacente
    const resGenLinkExp = await apiFetch(`/api/ambassadors/${candidateB!.id}/generate-link`, {
      method: 'POST',
      headers: { 'x-user-id': authorizedAdmin.id },
    });
    const tokenExp = resGenLinkExp.body?.token;
    
    // Atualizar no DB para expiração no passado
    const targetAmbB = (db as any).data.ambassadors.find((a: any) => a.id === candidateB!.id);
    if (targetAmbB) {
      targetAmbB.tokenExpiresAt = new Date(Date.now() - 86400000).toISOString(); // 24h atrás
      targetAmbB.onboardingTokenExpiresAt = targetAmbB.tokenExpiresAt;
      (db as any).save();
    }

    // Tentar acessar onboarding com token expirado
    const resOnboardExp = await apiFetch(`/api/ambassador-onboarding/${tokenExp}`);
    assert(
      resOnboardExp.status === 404 || resOnboardExp.status === 403,
      'Token expirado é rejeitado no endpoint de onboarding (HTTP 404/403)',
      `Status: ${resOnboardExp.status}`
    );

    // Confirmar que o sistema persistiu tokenStatus = 'expired'
    const updatedAmbB = (db as any).data.ambassadors.find((a: any) => a.id === candidateB!.id);
    assert(
      updatedAmbB?.tokenStatus === 'expired',
      'Persistência automática de tokenStatus = "expired" confirmada',
      `Status atual: ${updatedAmbB?.tokenStatus}`
    );

    // Tentar acessar documento com token expirado
    const resDocTokenExp = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/${testDocAId}/download?token=${tokenExp}`
    );

    assert(
      resDocTokenExp.status === 401 || resDocTokenExp.status === 403,
      'Token expirado tem acesso a documentos bloqueado (HTTP 401/403)',
      `Status: ${resDocTokenExp.status}`
    );

    // -------------------------------------------------------------------------
    // 6. PROTEÇÃO CONTRA IDOR
    // -------------------------------------------------------------------------
    console.log('\n--- 6. PROTEÇÃO CONTRA IDOR & VALIDAÇÕES DE INTEGRIDADE ---');

    // IDOR 1: documentId inexistente
    const resIdorFakeDoc = await apiFetch(
      `/api/ambassadors/${candidateA!.id}/documents/fake-non-existent-doc-999/download`,
      { headers: { 'x-user-id': authorizedAdmin.id } }
    );

    assert(
      resIdorFakeDoc.status === 404,
      'Anti-IDOR: documentId inexistente retorna 404',
      `Status: ${resIdorFakeDoc.status}`
    );

    // IDOR 2: ambassadorId inexistente
    const resIdorFakeAmb = await apiFetch(
      `/api/ambassadors/fake-non-existent-amb-999/documents/${testDocAId}/download`,
      { headers: { 'x-user-id': authorizedAdmin.id } }
    );

    assert(
      resIdorFakeAmb.status === 404,
      'Anti-IDOR: ambassadorId inexistente retorna 404',
      `Status: ${resIdorFakeAmb.status}`
    );

    // IDOR 3: Documento de A solicitado sob rota de B
    const resIdorCrossDoc = await apiFetch(
      `/api/ambassadors/${candidateB!.id}/documents/${testDocAId}/download`,
      { headers: { 'x-user-id': authorizedAdmin.id } }
    );

    assert(
      resIdorCrossDoc.status === 404,
      'Anti-IDOR: Documento do candidato A solicitado na rota do candidato B retorna 404',
      `Status: ${resIdorCrossDoc.status}`
    );

    // IDOR 4: Mensagem de erro não deve vazar conteúdo nem segredos
    const bodyFakeDoc = typeof resIdorFakeDoc.body === 'string' ? resIdorFakeDoc.body : JSON.stringify(resIdorFakeDoc.body || {});
    const bodyCrossDoc = typeof resIdorCrossDoc.body === 'string' ? resIdorCrossDoc.body : JSON.stringify(resIdorCrossDoc.body || {});
    assert(
      !bodyFakeDoc.includes('PDF-1.4') && !bodyCrossDoc.includes('PDF-1.4'),
      'Anti-IDOR: Mensagens de erro não vazam conteúdo de arquivos nem dados confidenciais'
    );

    // -------------------------------------------------------------------------
    // 7. AUDITORIA E PRIVACIDADE (LGPD)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. AUDITORIA E PRIVACIDADE (LGPD) ---');

    const recentAuditLogs = (db as any).data?.auditLogs || [];
    let containsBase64 = false;
    let containsFullSecrets = false;

    for (const log of recentAuditLogs) {
      const detailsStr = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '');
      if (detailsStr.length > 500 && detailsStr.includes('base64,')) {
        containsBase64 = true;
      }
      if (detailsStr.includes('R2_PRIVATE_SECRET_ACCESS_KEY') || detailsStr.includes('ADMIR_SALT_2026')) {
        containsFullSecrets = true;
      }
    }

    assert(!containsBase64, 'Trilha de auditoria não armazena payloads pesados ou Base64 de arquivos');
    assert(!containsFullSecrets, 'Trilha de auditoria não expõe credenciais ou chaves secretas');

  } finally {
    // Close test server
    server.close();

    // -------------------------------------------------------------------------
    // 8. CLEANUP OBRIGATÓRIO
    // -------------------------------------------------------------------------
    console.log('\n--- 8. CLEANUP OBRIGATÓRIO DE RESÍDUOS ---');

    // 1. Remover documento criado se existir no storage
    if (candidateA && testDocAId) {
      try {
        if (docStorageKey && PrivateDocumentStorage.isConfigured()) {
          await PrivateDocumentStorage.delete(docStorageKey);
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Remover regra de teste temporária criada
    if (createdTestRuleId) {
      db.deleteCountryDocumentRule(createdTestRuleId, authorizedAdmin);
      console.log(`  • Regra [TEST] temporária (${createdTestRuleId}) removida.`);
    }

    // 3. Remover candidatos de teste artificiais
    if (candidateA) {
      db.deleteAmbassador(candidateA.id, authorizedAdmin);
      console.log(`  • Candidato artificial A (${candidateA.id}) removido.`);
    }
    if (candidateB) {
      db.deleteAmbassador(candidateB.id, authorizedAdmin);
      console.log(`  • Candidato artificial B (${candidateB.id}) removido.`);
    }

    // 4. Remover usuários de teste
    (db as any).data.users = (db as any).data.users.filter(
      (u: User) => u.id !== authorizedAdmin.id && u.id !== unauthorizedViewer.id
    );

    // 5. Limpar arquivos temporários no sistema de arquivos
    try {
      const fs = await import('fs');
      const path = await import('path');
      if (candidateA) {
        const pDirA = path.join(process.cwd(), 'data', 'private_documents', candidateA.id);
        if (fs.existsSync(pDirA)) fs.rmSync(pDirA, { recursive: true, force: true });
      }
      if (candidateB) {
        const pDirB = path.join(process.cwd(), 'data', 'private_documents', candidateB.id);
        if (fs.existsSync(pDirB)) fs.rmSync(pDirB, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore
    }

    // Comparação de baseline pós-cleanup
    const finalAmbassadors = db.getAmbassadors(true);
    const finalAmbassadorsCount = finalAmbassadors.length;

    const finalRules = db.getCountryDocumentRules('', true);
    const finalRulesCount = finalRules.length;
    const finalRuleIds = finalRules.map((r) => r.id);

    let finalPrivDocsCount = 0;
    finalAmbassadors.forEach((a) => {
      if (a.documents) finalPrivDocsCount += a.documents.length;
    });

    console.log('\n--- COMPARAÇÃO DE BASELINE PÓS-CLEANUP ---');
    console.log(`  • Embaixadores: Antes = ${baselineAmbassadorsCount}, Depois = ${finalAmbassadorsCount}`);
    console.log(`  • Regras Documentais: Antes = ${baselineRulesCount}, Depois = ${finalRulesCount}`);
    console.log(`  • Documentos Privados: Antes = ${baselinePrivDocsCount}, Depois = ${finalPrivDocsCount}`);

    assert(
      finalAmbassadorsCount === baselineAmbassadorsCount,
      'Baseline de Embaixadores exatamente preservado',
      `Esperado: ${baselineAmbassadorsCount}, Obtido: ${finalAmbassadorsCount}`
    );

    assert(
      finalRulesCount === 13 && finalRulesCount === baselineRulesCount,
      'Baseline das 13 regras documentais DEMO exatamente preservado',
      `Esperado: 13, Obtido: ${finalRulesCount}`
    );

    assert(
      finalPrivDocsCount === baselinePrivDocsCount,
      'Baseline de documentos privados preservado',
      `Esperado: ${baselinePrivDocsCount}, Obtido: ${finalPrivDocsCount}`
    );

    const all13DemoPreserved = baselineRuleIds.every((id) => finalRuleIds.includes(id));
    assert(all13DemoPreserved, 'Todas as 13 regras [DEMO] originais preservadas intactas');
  }

  // -------------------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL DE TESTES DE SEGURANÇA EXECUTADOS: ${totalTests}`);
  console.log(`PASSARAM: ${passedTests}`);
  console.log(`FALHARAM: ${failedTests}`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityCheckpoint().catch((err) => {
  console.error('Erro fatal ao rodar checkpoint de segurança:', err);
  process.exit(1);
});
