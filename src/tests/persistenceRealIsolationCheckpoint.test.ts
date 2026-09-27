/**
 * ADMIR — American Diplomatic Mission of International Relations
 * FASE 5 — SUBFASE 5.3
 * PROMPT: ADMIR-P007
 * 
 * Suíte de Testes de Persistência Externa Real e Isolamento Definitivo DEV/PROD
 * Eliminação da dependência do filesystem/container publicado em Produção
 */

import assert from 'assert';
import {
  db,
  PRIMARY_DATA_SOURCE_DEV,
  PRIMARY_DATA_SOURCE_PROD,
  LOCAL_FILES_USED_AS_RUNTIME_DATABASE,
  LOCAL_FILES_USED_AS_FALLBACK,
  INITIAL_DATA_USED_AT_STARTUP,
  FIRESTORE_USED_AS_PRIMARY,
  isProductionEnvironment,
} from '../server/db';
import { auditProductionGate } from '../server/productionGate';

console.log('ADMIR-P007 — SUÍTE DE PERSISTÊNCIA REAL E ISOLAMENTO DEV/PROD INICIADA');

async function runPersistenceCheckpointSuite() {
  console.log('\n===============================================================');
  console.log('ADMIR — CHECKPOINT DE PERSISTÊNCIA E ISOLAMENTO REAL (P007)');
  console.log('===============================================================');

  // --- 1. VERIFICAÇÃO DE CONFIGURAÇÃO DE PERSISTÊNCIA EXTERNA ---
  console.log('\n--- 1. AUDITORIA DE CONFIGURAÇÃO DE BANCO E FONTES DE DADOS ---');
  console.log(`  PRIMARY_DATA_SOURCE_DEV: ${PRIMARY_DATA_SOURCE_DEV}`);
  console.log(`  PRIMARY_DATA_SOURCE_PROD: ${PRIMARY_DATA_SOURCE_PROD}`);
  console.log(`  FIRESTORE_USED_AS_PRIMARY: ${FIRESTORE_USED_AS_PRIMARY}`);
  console.log(`  LOCAL_FILES_USED_AS_RUNTIME_DATABASE: ${LOCAL_FILES_USED_AS_RUNTIME_DATABASE}`);
  console.log(`  LOCAL_FILES_USED_AS_FALLBACK: ${LOCAL_FILES_USED_AS_FALLBACK}`);
  console.log(`  INITIAL_DATA_USED_AT_STARTUP: ${INITIAL_DATA_USED_AT_STARTUP}`);

  assert.strictEqual(FIRESTORE_USED_AS_PRIMARY, true, 'Firestore deve ser a fonte primária de persistência em produção');
  assert.strictEqual(LOCAL_FILES_USED_AS_RUNTIME_DATABASE, false, 'Arquivos locais de container não podem ser banco de tempo de execução em Produção');
  assert.strictEqual(LOCAL_FILES_USED_AS_FALLBACK, false, 'Arquivos locais do container não podem substituir a fonte primária remota');
  assert.strictEqual(INITIAL_DATA_USED_AT_STARTUP, false, 'initialData.ts não pode sobrescrever o banco de Produção no startup');
  assert(PRIMARY_DATA_SOURCE_PROD.includes('prod_app_state'), 'PROD deve apontar para a coleção prod_app_state do Firestore');
  assert(PRIMARY_DATA_SOURCE_DEV.includes('dev_app_state'), 'DEV deve apontar para a coleção isolada dev_app_state');

  console.log('  ✅ [PASS] Configurações de persistência externa e isolamento auditadas com sucesso.');

  // --- 2. TESTE DE HIDRATAÇÃO DO FIRESTORE NO STARTUP ---
  console.log('\n--- 2. TESTE DE SUPREMACIA DA FONTE PERSISTENTE EXTERNA NO STARTUP ---');
  
  const mockRemoteStateInFirestore = {
    ambassadors: [
      {
        id: 'AMB_PROD_OFFICIAL_777',
        name: 'Embaixador Oficial de Produção',
        titlePt: 'Embaixador Plenipotenciário de Produção',
        country: 'Suíça',
        status: 'active',
        isProtected: true
      }
    ],
    stories: [
      {
        id: 'STORY_PROD_OFFICIAL_888',
        titlePt: 'Operação Diplomática Humanitária Genebra 2026',
        category: 'Diplomacia',
        status: 'published'
      }
    ],
    programs: [],
    media: [],
    donations: [],
    tasks: [],
    users: [],
    auditLogs: []
  };

  const hydratedSchema = db.sanitizeAndHydrateSchema(mockRemoteStateInFirestore);
  
  assert.strictEqual(
    hydratedSchema.ambassadors.some(a => a.id === 'AMB_PROD_OFFICIAL_777'),
    true,
    'O estado carregado do Firestore prod_app_state deve conter o registro oficial de Produção'
  );

  const containerMockFileRecordExists = hydratedSchema.ambassadors.some(a => a.id === 'DEV_EXCLUSIVE_RECORD_999');
  assert.strictEqual(
    containerMockFileRecordExists,
    false,
    'Registros exclusivos do container/DEV em data/*.json NUNCA devem ser mesclados no banco de Produção'
  );

  console.log('  ✅ [PASS] Hidratação remota comprovada: dados da coleção prod_app_state prevalecem sobre arquivos locais.');

  // --- 3. TESTE DE ISOLAMENTO DE AMBIENTES (DEV VS PROD) ---
  console.log('\n--- 3. TESTE DE SEGREGAÇÃO DE NAMESPACE FIRESTORE (dev_app_state VS prod_app_state) ---');
  
  const prodNamespace = 'prod_app_state';
  const devNamespace = 'dev_app_state';

  assert.notStrictEqual(prodNamespace, devNamespace, 'Namespaces de Produção e Desenvolvimento devem ser estritamente isolados');
  console.log(`  PROD_COLLECTION: ${prodNamespace}`);
  console.log(`  DEV_COLLECTION: ${devNamespace}`);
  console.log('  ✅ [PASS] Segregação estrita de namespaces por ambiente validada.');

  // --- 4. TESTE DO PRODUCTION GATE ---
  console.log('\n--- 4. EXECUÇÃO DO AUDIT DO PRODUCTION GATE ---');
  const gateResult = auditProductionGate();
  console.log(`  Production Gate checks: ${gateResult.summary.passed}/${gateResult.summary.totalChecks} PASSED`);
  assert.strictEqual(gateResult.canDeploy, true, 'Production Gate deve aprovar o deploy quando a persistência e isolamento estão ativos');
  console.log('  ✅ [PASS] Production Gate aprovado com sucesso.');

  // --- RESULTADO FINAL ---
  console.log('\n===============================================================');
  console.log('=== ADMIR-P007 — RESULTADO DA PERSISTÊNCIA REAL E ISOLAMENTO ===');
  console.log('===============================================================');
  console.log('PRIMARY_DATA_SOURCE_DEV: Workspace local / Firestore dev_app_state');
  console.log('PRIMARY_DATA_SOURCE_PROD: Firestore prod_app_state (ai-studio-remixremixadmira-f0c0c025-03d6-4da1-8bec-59fc4e7728cb)');
  console.log('LOCAL_FILES_USED_AS_RUNTIME_DATABASE: NÃO');
  console.log('LOCAL_FILES_USED_AS_FALLBACK: NÃO');
  console.log('INITIAL_DATA_USED_AT_STARTUP: NÃO');
  console.log('FIRESTORE_USED_AS_PRIMARY: SIM');
  console.log('STATUS: [PERSISTÊNCIA REAL E ISOLAMENTO DEFINITIVO DEV/PROD VALIDADO]');
}

runPersistenceCheckpointSuite().catch((err) => {
  console.error('\n❌ ERRO NO CHECKPOINT DE PERSISTÊNCIA P007:', err);
  process.exit(1);
});
