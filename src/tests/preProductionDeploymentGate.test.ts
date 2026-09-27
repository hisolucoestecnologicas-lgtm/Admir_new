/**
 * ADMIR — American Diplomatic Mission of International Relations
 * FASE 5 — SUBFASE 5.12
 * PROMPT: ADMIR-P016
 * 
 * Suíte de Testes Isolada de Pré-Produção e Validação de Ambiente
 * Valida a identificação segura de DEV/PROD, detecção de conflitos, bloqueio de *.run.app genérico
 * e proteção de rotas críticas sem qualquer escrita ou leitura de banco real.
 */

import assert from 'assert';
import {
  resolveRuntimeEnvironment,
  isProductionEnvironment,
  ALLOW_STARTUP_SEED,
  ALLOW_STARTUP_SYNC,
  ALLOW_STARTUP_IMPORT,
  ALLOW_LOCAL_DATA_FALLBACK
} from '../server/db';

console.log('=== INICIANDO SUÍTE DE TESTES DE PRÉ-PRODUÇÃO — ADMIR-P016 ===');

async function runPreProductionDeploymentGateTests() {
  let failed = false;

  const testCase = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message || err}`);
      failed = true;
    }
  };

  // --- 1. RESOLVER CENTRAL DE AMBIENTE ---
  console.log('\n--- 1. TESTES DO RESOLVER CENTRAL DE AMBIENTE ---');

  testCase('Host oficial de produção deve resolver para production', () => {
    const res = resolveRuntimeEnvironment({
      host: 'admir-american-diplomatic-mission-of-5577.ai.studio',
      kService: 'admir-american-diplomatic-mission-of-5577',
      appEnv: 'production'
    });
    assert.strictEqual(res, 'production', 'Host oficial deve resolver como production');
  });

  testCase('Host oficial de produção sem K_SERVICE também deve resolver para production', () => {
    const res = resolveRuntimeEnvironment({
      host: 'admir-american-diplomatic-mission-of-5577.ai.studio',
      kService: '',
      appEnv: ''
    });
    assert.strictEqual(res, 'production', 'Host oficial sem K_SERVICE deve resolver como production');
  });

  testCase('Preview Real do AI Studio (ais-dev) deve resolver para development', () => {
    const res = resolveRuntimeEnvironment({
      host: 'ais-dev-mpovpbsy35sokjlyzu3jla-573675315275.us-east1.run.app',
      kService: 'ais-dev-mpovpbsy35sokjlyzu3jla',
      appEnv: 'development'
    });
    assert.strictEqual(res, 'development', 'Preview real dev deve resolver como development');
  });

  testCase('Preview Real do AI Studio (ais-pre) deve resolver para development', () => {
    const res = resolveRuntimeEnvironment({
      host: 'ais-pre-mpovpbsy35sokjlyzu3jla-573675315275.us-east1.run.app',
      kService: 'ais-pre-mpovpbsy35sokjlyzu3jla',
      appEnv: 'development'
    });
    assert.strictEqual(res, 'development', 'Preview real pre deve resolver como development');
  });

  testCase('Localhost deve resolver para development', () => {
    const res = resolveRuntimeEnvironment({
      host: 'localhost:3000',
      kService: '',
      appEnv: ''
    });
    assert.strictEqual(res, 'development', 'Localhost deve ser identificado como development');
  });

  // --- 2. BLOQUEIO DE RUN.APP GENÉRICO ---
  console.log('\n--- 2. TESTES DE BLOQUEIO DE CLOUD RUN (*.run.app) GENÉRICO ---');

  testCase('Host run.app genérico com kService genérico deve resolver para unknown (bloqueio Fail-Closed)', () => {
    const res = resolveRuntimeEnvironment({
      host: 'qualquer-servico.us-east1.run.app',
      kService: 'qualquer-servico',
      appEnv: ''
    });
    assert.strictEqual(res, 'unknown', 'Host run.app genérico não pode resolver para development ou production');
  });

  testCase('Host run.app genérico sem kService deve resolver para unknown', () => {
    const res = resolveRuntimeEnvironment({
      host: 'qualquer-servico.us-east1.run.app',
      kService: '',
      appEnv: ''
    });
    assert.strictEqual(res, 'unknown', 'Apenas *.run.app sem sinal de DEV deve ser considerado unknown');
  });

  // --- 3. DETECÇÃO DE CONFLITO ---
  console.log('\n--- 3. TESTES DE DETECÇÃO DE CONFLITO DE AMBIENTES ---');

  testCase('Host oficial de produção + K_SERVICE de preview deve resultar em unknown (ENVIRONMENT_CONFLICT)', () => {
    const res = resolveRuntimeEnvironment({
      host: 'admir-american-diplomatic-mission-of-5577.ai.studio',
      kService: 'ais-pre-mpovpbsy35sokjlyzu3jla'
    });
    assert.strictEqual(res, 'unknown', 'Conflito de host oficial com serviço de preview deve resultar em unknown');
  });

  testCase('Host de preview + K_SERVICE de produção deve resultar em unknown (ENVIRONMENT_CONFLICT)', () => {
    const res = resolveRuntimeEnvironment({
      host: 'ais-pre-mpovpbsy35sokjlyzu3jla-573675315275.us-east1.run.app',
      kService: 'admir-american-diplomatic-mission-of-5577'
    });
    assert.strictEqual(res, 'unknown', 'Conflito de host de preview com serviço de produção deve resultar em unknown');
  });

  // --- 4. GATES E SEGURANÇA DE STARTUP ---
  console.log('\n--- 4. TESTES DE GATES DE PERSISTÊNCIA E INICIALIZAÇÃO SEGURA ---');

  testCase('Escrita de dados iniciais ou seeds automáticos devem estar estritamente desabilitados', () => {
    assert.strictEqual(ALLOW_STARTUP_SEED, false, 'ALLOW_STARTUP_SEED deve ser false para proteger banco');
  });

  testCase('Sincronização automática no startup deve estar estritamente desabilitada', () => {
    assert.strictEqual(ALLOW_STARTUP_SYNC, false, 'ALLOW_STARTUP_SYNC deve ser false para proteger produção');
  });

  testCase('Importação automática no startup deve estar desabilitada', () => {
    assert.strictEqual(ALLOW_STARTUP_IMPORT, false, 'ALLOW_STARTUP_IMPORT deve ser false');
  });

  testCase('Fallback de arquivo local de container em falhas de produção deve estar desabilitado', () => {
    assert.strictEqual(ALLOW_LOCAL_DATA_FALLBACK, false, 'ALLOW_LOCAL_DATA_FALLBACK deve ser false');
  });

  // --- FINALIZANDO ---
  if (failed) {
    console.error('\n🔴 ALGUNS TESTES FALHARAM! Correções são necessárias antes de prosseguir.');
    process.exit(1);
  } else {
    console.log('\n💚 TODOS OS TESTES DE PRÉ-PRODUÇÃO PASSARAM COM SUCESSO! GATES CONFIRMADOS.');
    process.exit(0);
  }
}

runPreProductionDeploymentGateTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
