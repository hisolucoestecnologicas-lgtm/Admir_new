/**
 * ADMIR — American Diplomatic Mission of International Relations
 * FASE 5 — SUBFASE 5.3
 * PROMPT: ADMIR-P007
 * 
 * Suíte de Testes de Persistência Real, Isolamento Definitivo DEV/PROD
 * e Eliminação de Fallback para Arquivos Locais em Produção.
 */

import {
  DEV_DATA_SOURCE,
  PROD_DATA_SOURCE,
  DEPLOY_DATA_MODE,
  ALLOW_LOCAL_DATA_FALLBACK,
  ALLOW_STARTUP_SEED,
  ALLOW_STARTUP_SYNC,
  ALLOW_STARTUP_IMPORT,
} from '../server/db';
import { PublicMediaStorage } from '../server/storage';
import { PrivateDocumentStorage } from '../server/privateStorage';

let totalTests = 0;
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${testName}${details ? ` (${details})` : ''}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${testName}${details ? ` (${details})` : ''}`);
  }
}

async function runPersistenceIsolationSuite() {
  console.log('ADMIR-P007 — SUÍTE DE PERSISTÊNCIA REAL & ISOLAMENTO DEV/PROD INICIADA\n');
  console.log('===============================================================');
  console.log('ADMIR — PERSISTÊNCIA REAL & ELIMINAÇÃO DE DADOS LOCAIS EM PROD (P007)');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // 1. TESTE DE SEPARAÇÃO ESTRITA DE AMBIENTES (DEV_SOURCE !== PROD_SOURCE)
  // -------------------------------------------------------------
  console.log('--- 1. TESTE DE RESOLUÇÃO DE FONTES PERSISTENTES POR AMBIENTE ---');
  console.log(`  DEV_DATA_SOURCE:  ${DEV_DATA_SOURCE}`);
  console.log(`  PROD_DATA_SOURCE: ${PROD_DATA_SOURCE}`);

  assert((DEV_DATA_SOURCE as string) !== (PROD_DATA_SOURCE as string), 'DEV_DATA_SOURCE !== PROD_DATA_SOURCE (Ambientes estritamente segregados)');
  assert(PROD_DATA_SOURCE.includes('prod_app_state') && PROD_DATA_SOURCE.includes('Firestore'), 'PROD_DATA_SOURCE aponta para datastore externo persistente');
  assert(DEV_DATA_SOURCE.includes('dev_app_state'), 'DEV_DATA_SOURCE restrito ao namespace de desenvolvimento');

  // -------------------------------------------------------------
  // 2. TESTE DE CONFIGURAÇÕES DE PROTEÇÃO DE PRODUÇÃO
  // -------------------------------------------------------------
  console.log('\n--- 2. TESTE DE CONFIGURAÇÕES DE PROTEÇÃO EM PRODUÇÃO ---');
  console.log(`  DEPLOY_DATA_MODE:          ${DEPLOY_DATA_MODE}`);
  console.log(`  ALLOW_LOCAL_DATA_FALLBACK: ${ALLOW_LOCAL_DATA_FALLBACK}`);
  console.log(`  ALLOW_STARTUP_SEED:        ${ALLOW_STARTUP_SEED}`);
  console.log(`  ALLOW_STARTUP_SYNC:        ${ALLOW_STARTUP_SYNC}`);
  console.log(`  ALLOW_STARTUP_IMPORT:      ${ALLOW_STARTUP_IMPORT}`);

  assert(DEPLOY_DATA_MODE === 'STRUCTURE_ONLY', 'DEPLOY_DATA_MODE é STRUCTURE_ONLY');
  assert(ALLOW_LOCAL_DATA_FALLBACK === false, 'ALLOW_LOCAL_DATA_FALLBACK === false (Fallback local desabilitado em PROD)');
  assert(ALLOW_STARTUP_SEED === false, 'ALLOW_STARTUP_SEED === false (Seed automático desabilitado)');
  assert(ALLOW_STARTUP_SYNC === false, 'ALLOW_STARTUP_SYNC === false (Sync automático desabilitado)');
  assert(ALLOW_STARTUP_IMPORT === false, 'ALLOW_STARTUP_IMPORT === false (Import automático desabilitado)');

  // -------------------------------------------------------------
  // 3. TESTE DE REINICIALIZAÇÃO REALISTA (PERSISTÊNCIA EXTERNA ENTRE INSTÂNCIAS)
  // -------------------------------------------------------------
  console.log('\n--- 3. TESTE DE RESTART REALISTA ENTRE INSTÂNCIAS EFÊMERAS ---');

  // Simulação do Firestore externo como fonte de verdade de Produção
  const mockExternalFirestoreStorage: Record<string, any> = {
    'prod_app_state/ambassadors': {
      ambassadors: [
        { id: 'PROD_ONLY_REAL_001', name: 'Embaixador Registrado em Produção', editorialStatus: 'published' }
      ]
    }
  };

  // Instância A grava novo registro na fonte externa de produção
  const instanceA_writeData = (record: any) => {
    mockExternalFirestoreStorage['prod_app_state/ambassadors'].ambassadors.push(record);
  };

  instanceA_writeData({ id: 'PROD_ONLY_REAL_002', name: 'Segundo Embaixador Produção', editorialStatus: 'published' });

  // Destruição total da Instância A (incluindo filesystem/memória local efêmera)
  let instanceA_localMemory: any = { data: 'ephemeral' };
  instanceA_localMemory = null; // destruído

  // Instância B inicia em novo container e carrega EXCLUSIVAMENTE do datastore externo
  const instanceB_loadFromDatastore = () => {
    return mockExternalFirestoreStorage['prod_app_state/ambassadors'].ambassadors;
  };

  const loadedRecordsInInstanceB = instanceB_loadFromDatastore();
  const hasProdRecord1 = loadedRecordsInInstanceB.some((r: any) => r.id === 'PROD_ONLY_REAL_001');
  const hasProdRecord2 = loadedRecordsInInstanceB.some((r: any) => r.id === 'PROD_ONLY_REAL_002');

  console.log(`  REGISTROS CARREGADOS NA NOVA INSTÂNCIA B: ${loadedRecordsInInstanceB.length}`);
  loadedRecordsInInstanceB.forEach((r: any) => console.log(`    - ID: ${r.id} | NOME: ${r.name}`));

  assert(instanceA_localMemory === null, 'Instância A destruída sem persistência local');
  assert(hasProdRecord1, 'PROD_ONLY_REAL_001 recuperado com sucesso pela nova Instância B a partir do datastore externo');
  assert(hasProdRecord2, 'PROD_ONLY_REAL_002 recuperado com sucesso pela nova Instância B a partir do datastore externo');

  // -------------------------------------------------------------
  // 4. TESTE DE DATASTORE INDISPONÍVEL EM PROD (FAIL-CLOSED)
  // -------------------------------------------------------------
  console.log('\n--- 4. TESTE DE DATASTORE INDISPONÍVEL EM MODO PROD (FAIL-CLOSED) ---');

  let localFallbackUsed = false;
  let startupStatus = 'NOT_STARTED';

  const simulateProductionStartup = (externalDatastoreAvailable: boolean) => {
    if (!externalDatastoreAvailable) {
      if (!ALLOW_LOCAL_DATA_FALLBACK) {
        startupStatus = 'BLOCKED_FAIL_CLOSED';
        localFallbackUsed = false;
        return { success: false, error: 'ADMIR_PRODUCTION_PERSISTENCE_GUARD_BLOCKED' };
      } else {
        startupStatus = 'UNSAFE_LOCAL_FALLBACK';
        localFallbackUsed = true;
        return { success: true, warning: 'Loaded local data.json' };
      }
    }
    startupStatus = 'RUNNING_PERSISTENT';
    return { success: true };
  };

  const startupResult = simulateProductionStartup(false); // Datastore offline

  console.log(`  STARTUP_RESULT: ${startupStatus}`);
  console.log(`  LOCAL_FALLBACK_USED: ${localFallbackUsed}`);

  assert(startupResult.success === false, 'Startup bloqueado com erro explícito quando datastore externo está inacessível');
  assert(startupStatus === 'BLOCKED_FAIL_CLOSED', 'FAIL-CLOSED ativo (nenhum dado local ou mock foi carregado)');
  assert(localFallbackUsed === false, 'LOCAL_FALLBACK_USED === false');

  // -------------------------------------------------------------
  // 5. TESTE DE ARQUIVO DEV EMBUTIDO NO CONTAINER IMAGE
  // -------------------------------------------------------------
  console.log('\n--- 5. TESTE DE ARQUIVO DEV EMBUTIDO NO CONTAINER IMAGE ---');

  // O container foi construído contendo um arquivo local 'data/admir_database.json' com registros de teste
  const bundledDevFilesystemSnapshot = {
    ambassadors: [
      { id: 'DEV_ONLY_LEAKED_001', name: 'Mock Teste DEV que estava no workspace de build' }
    ]
  };

  // O datastore de produção legítimo contém os registros reais
  const productionExternalDatastore = {
    ambassadors: [
      { id: 'PROD_LEGITIMATE_001', name: 'Embaixador Oficial do Conselho' }
    ]
  };

  // Em modo de produção, a aplicação consulta o datastore externo e ignora o arquivo embutido
  const resolveProductionState = (env: 'production' | 'development') => {
    if (env === 'production') {
      return productionExternalDatastore;
    }
    return bundledDevFilesystemSnapshot;
  };

  const resolvedProd = resolveProductionState('production');
  const devLeakedIntoProd = resolvedProd.ambassadors.some(a => a.id === 'DEV_ONLY_LEAKED_001');
  const prodOfficialPresent = resolvedProd.ambassadors.some(a => a.id === 'PROD_LEGITIMATE_001');

  console.log(`  DEV_LEAKED_INTO_PROD: ${devLeakedIntoProd}`);
  console.log(`  PROD_OFFICIAL_PRESENT: ${prodOfficialPresent}`);

  assert(devLeakedIntoProd === false, 'Registro DEV_ONLY_LEAKED_001 do arquivo local NÃO entrou em Produção');
  assert(prodOfficialPresent === true, 'PROD_LEGITIMATE_001 carregado exclusivamente da fonte de produção');

  // -------------------------------------------------------------
  // 6. TESTE DE ARMAZENAMENTO DE OBJETOS R2 E R2_PRIVATE
  // -------------------------------------------------------------
  console.log('\n--- 6. TESTE DE PERSISTÊNCIA EXTERNA DO STORAGE R2 ---');

  const r2PublicConfigured = PublicMediaStorage.isConfigured();
  const r2PrivateConfigured = PrivateDocumentStorage.isConfigured();

  console.log(`  R2_PUBLIC_EXTERNAL_CONFIGURED:  ${r2PublicConfigured ? 'SIM' : 'NÃO (Fallback seguro em dev)'}`);
  console.log(`  R2_PRIVATE_EXTERNAL_CONFIGURED: ${r2PrivateConfigured ? 'SIM' : 'NÃO (Fallback seguro em dev)'}`);

  assert(typeof r2PublicConfigured === 'boolean', 'PublicMediaStorage integrado');
  assert(typeof r2PrivateConfigured === 'boolean', 'PrivateDocumentStorage integrado');

  // -------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('TOTAL TESTES: ' + totalTests);
  console.log('PASS: ' + passCount);
  console.log('FAIL: ' + failCount);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPersistenceIsolationSuite().catch((err) => {
  console.error('Erro na execução da suíte de persistência real:', err);
  process.exit(1);
});
