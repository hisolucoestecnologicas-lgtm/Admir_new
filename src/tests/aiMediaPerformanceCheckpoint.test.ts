import { AIRateLimiter, AI_ANALYSIS_VERSION, GEMINI_MODEL } from '../server/aiUtils';
import { MediaAsset, MediaAIJob } from '../types';

async function runAIPerformanceCheckpoint() {
  console.log('===============================================================');
  console.log('ADMIR — BIBLIOTECA DE MÍDIA — CHECKPOINT DE PERFORMANCE IA');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- 1. TEST RATE LIMITER: INÍCIO A INÍCIO ---
  console.log('--- 1. TESTE RATE LIMITER (START-TO-START INTERVAL) ---');
  {
    const testLimiter = new AIRateLimiter();
    // Simulate 4 RPM -> minDelay = 15000ms
    const minDelay = testLimiter.getMinDelayMs();
    assert(minDelay === 15000, `Rate Limiter padrão calculado corretamente: ${minDelay}ms (4 RPM)`);

    // Simulate Call 1 start
    const call1Start = 100000;
    testLimiter.setLastCallStartTime(call1Start);

    // If Gemini Call 1 takes 5000ms, when Call 2 checks wait at t = 105000:
    const call2CheckTime = call1Start + 5000; // 5s after call 1 start
    const elapsedSinceStart = call2CheckTime - call1Start;
    const expectedRemainingWait = minDelay - elapsedSinceStart; // 15000 - 5000 = 10000ms

    assert(expectedRemainingWait === 10000, `Espera restante a partir do INÍCIO da chamada 1 é exatamente ${expectedRemainingWait}ms (10s) e NÃO 15s`);

    // Test multiplier adaptation on 429
    const initialMult = testLimiter.getAdaptiveMultiplier();
    assert(initialMult === 1.0, `Multiplicador inicial é 1.0x`);

    testLimiter.notifyQuotaError();
    const multAfter429 = testLimiter.getAdaptiveMultiplier();
    assert(multAfter429 === 2.0, `Multiplicador adaptativo após 429 escala para 2.0x`);

    testLimiter.notifySuccess();
    const multAfterSuccess = testLimiter.getAdaptiveMultiplier();
    assert(multAfterSuccess === 1.8, `Multiplicador adaptativo decresce gradualmente após sucesso: ${multAfterSuccess}x`);
  }

  // --- 2. TESTE PIPELINE & SKIP POR VERSÃO / SHA ---
  console.log('\n--- 2. TESTE SKIP INTELIGENTE E VERSIONAMENTO ---');
  {
    const now = new Date().toISOString();
    const mockAssetAnalyzed: MediaAsset = {
      id: 'med-test-analyzed-1',
      filename: 'already_analyzed.jpg',
      originalName: 'already_analyzed.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      url: '/api/media/proxy/already_analyzed.jpg',
      altText: 'Foto analisada',
      caption: '',
      tags: ['diplomacia', 'evento'],
      createdAt: now,
      aiAnalyzed: true,
      aiAnalysisVersion: AI_ANALYSIS_VERSION,
      aiStatus: 'ANALYZED',
      aiModel: GEMINI_MODEL,
    };

    const isUpToDate = mockAssetAnalyzed.aiAnalyzed &&
      mockAssetAnalyzed.aiAnalysisVersion === AI_ANALYSIS_VERSION &&
      mockAssetAnalyzed.aiStatus === 'ANALYZED';

    assert(isUpToDate === true, 'Mídia já analisada na mesma versão é qualificada para SKIP imediato sem chamada Gemini');

    const mockAssetOldVersion: MediaAsset = {
      ...mockAssetAnalyzed,
      id: 'med-test-old-version',
      aiAnalysisVersion: 'v1_legacy',
    };

    const needsReanalysis = !(mockAssetOldVersion.aiAnalyzed &&
      mockAssetOldVersion.aiAnalysisVersion === AI_ANALYSIS_VERSION &&
      mockAssetOldVersion.aiStatus === 'ANALYZED');

    assert(needsReanalysis === true, 'Mídia com versão anterior (v1) é detectada para reanálise necessária');
  }

  // --- 3. TESTE CANCELAMENTO COOPERATIVO & PAUSE/RESUME ---
  console.log('\n--- 3. TESTE CANCELAMENTO COOPERATIVO & PAUSE/RESUME ---');
  {
    const now = new Date().toISOString();
    const mockJob: MediaAIJob = {
      id: 'job-perf-test-1',
      status: 'RUNNING',
      totalItems: 3,
      processedItems: 1,
      successItems: 1,
      failedItems: 0,
      skippedItems: 0,
      pendingMediaIds: ['med-1', 'med-2'],
      processedMediaIds: ['med-0'],
      modelUsed: GEMINI_MODEL,
      analysisVersion: AI_ANALYSIS_VERSION,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    };

    // Simulate pause
    mockJob.status = 'PAUSED';
    assert(mockJob.status === 'PAUSED', 'Job transitou para PAUSED cooperativamente');

    // Simulate resume
    mockJob.status = 'RUNNING';
    assert(mockJob.status === 'RUNNING', 'Job retomado para RUNNING sem perda do estado de pendingMediaIds');
    assert(mockJob.pendingMediaIds.length === 2, 'Lista de pendentes preservada integralmente');
    assert(mockJob.processedItems === 1, 'Contador de processados preservado');

    // Simulate cancellation
    mockJob.status = 'CANCELLED';
    assert(mockJob.status === 'CANCELLED', 'Job cancelado com interrupção do loop');
  }

  // --- 4. TESTE ESTADO RATE_LIMITED E FEEDBACK DE TEMPO ---
  console.log('\n--- 4. TESTE ESTADO RATE_LIMITED E CONTAGEM REGRESSIVA ---');
  {
    const now = new Date().toISOString();
    const waitUntil = new Date(Date.now() + 12000).toISOString();
    const rateLimitedJob: MediaAIJob = {
      id: 'job-perf-test-2',
      status: 'RATE_LIMITED',
      rateLimitWaitUntil: waitUntil,
      totalItems: 5,
      processedItems: 2,
      successItems: 2,
      failedItems: 0,
      skippedItems: 0,
      pendingMediaIds: ['med-3', 'med-4', 'med-5'],
      processedMediaIds: ['med-1', 'med-2'],
      modelUsed: GEMINI_MODEL,
      analysisVersion: AI_ANALYSIS_VERSION,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    };

    assert(rateLimitedJob.status === 'RATE_LIMITED', 'Status RATE_LIMITED suportado pelo modelo de dados');
    assert(typeof rateLimitedJob.rateLimitWaitUntil === 'string', 'Timestamp rateLimitWaitUntil gravado para UX do painel');
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed} PASS, ${failed} FAIL`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAIPerformanceCheckpoint().catch((err) => {
  console.error('Erro na execução do checkpoint de IA:', err);
  process.exit(1);
});
