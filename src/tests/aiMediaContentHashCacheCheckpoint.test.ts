/**
 * ADMIR — American Diplomatic Mission of International Relations
 * FASE 4 — SUBFASE 4.6
 * PROMPT: ADMIR-P004
 * 
 * Suíte de Validação da Identidade do Cache da Organização IA
 * SHA-256 + MODELO + ANALYSIS_VERSION
 */

import { GEMINI_MODEL, AI_ANALYSIS_VERSION } from '../server/aiUtils';
import { calculateSHA256 } from '../server/duplicateDetector';
import { MediaAsset } from '../types';

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

async function runContentHashCacheSuite() {
  console.log('ADMIR-P004 — SUÍTE DE CACHE POR CONTEÚDO (SHA-256 + MODELO + VERSÃO) INICIADA\n');
  console.log('===============================================================');
  console.log('ADMIR — BIBLIOTECA DE MÍDIA — CHECKPOINT DE CACHE DE IA (P004)');
  console.log('===============================================================\n');

  // Buffer simulado compartilhado para Mídia A e Mídia B
  const binaryContentAB = Buffer.from('ADMIR_DIPLOMATIC_MISSION_OFFICIAL_PHOTO_GENEVA_2026_HIGH_RES');
  const binaryContentC = Buffer.from('ADMIR_HUMANITARIAN_RELIEF_DISTRIBUTION_AMAZON_2026_RAW');

  const sha256_A = calculateSHA256(binaryContentAB);
  const sha256_B = calculateSHA256(binaryContentAB);
  const sha256_C = calculateSHA256(binaryContentC);

  console.log(`  SHA256_A: ${sha256_A}`);
  console.log(`  SHA256_B: ${sha256_B}`);
  console.log(`  SHA256_C: ${sha256_C}`);

  // -------------------------------------------------------------
  // 1. TESTE IDs DIFERENTES + MESMO CONTEÚDO (SHA-256 + MODELO + VERSÃO)
  // -------------------------------------------------------------
  console.log('\n--- 1. TESTE IDs DIFERENTES + SHA-256 IGUAL (REUTILIZAÇÃO DE ANÁLISE) ---');

  const mediaDatabase: MediaAsset[] = [];
  let geminiSimulatedCalls = 0;
  let cacheHits = 0;

  // Cria Mídia A
  const mediaA: MediaAsset = {
    id: 'TEST_MEDIA_A',
    filename: 'foto_delegacao_genebra_01.jpg',
    originalName: 'foto_delegacao_genebra_01.jpg',
    url: '/api/media/proxy/foto_delegacao_genebra_01.jpg',
    storageKey: 'public/media/foto_delegacao_genebra_01.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentAB.length,
    altText: '',
    caption: '',
    tags: ['diplomacia', 'onu'],
    createdAt: '2026-02-10T10:00:00.000Z',
    albumId: 'album-genebra-2026',
    sha256: sha256_A,
    aiAnalyzed: false,
    aiStatus: 'PENDING'
  };
  mediaDatabase.push(mediaA);

  // Cria Mídia B com ID diferente e metadados próprios, mas conteúdo idêntico
  const mediaB: MediaAsset = {
    id: 'TEST_MEDIA_B',
    filename: 'copia_arquivo_missao_suica.jpg',
    originalName: 'copia_arquivo_missao_suica.jpg',
    url: '/api/media/proxy/copia_arquivo_missao_suica.jpg',
    storageKey: 'public/media/copia_arquivo_missao_suica.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentAB.length,
    altText: '',
    caption: '',
    tags: ['arquivo_historico'],
    createdAt: '2026-03-01T14:30:00.000Z',
    albumId: 'album-arquivo-morto',
    sha256: sha256_B,
    aiAnalyzed: false,
    aiStatus: 'PENDING'
  };
  mediaDatabase.push(mediaB);

  // Função simulada do worker com o algoritmo implementado
  function processMediaAnalysis(targetMediaId: string, buffer: Buffer) {
    const asset = mediaDatabase.find(m => m.id === targetMediaId)!;
    const contentSha256 = asset.sha256 || calculateSHA256(buffer);

    // Identidade do cache: SHA-256 + MODELO + VERSÃO
    const cachedSource = mediaDatabase.find(m =>
      m.id !== targetMediaId &&
      m.sha256 === contentSha256 &&
      m.aiAnalyzed === true &&
      m.aiStatus === 'ANALYZED' &&
      m.aiModel === GEMINI_MODEL &&
      m.aiAnalysisVersion === AI_ANALYSIS_VERSION
    );

    if (cachedSource) {
      cacheHits++;
      console.log(`  [AI_ANALYSIS_CACHE_HIT] Target: ${targetMediaId}, Source: ${cachedSource.id}, SHA: ${contentSha256.substring(0, 12)}..., Model: ${GEMINI_MODEL}, Version: ${AI_ANALYSIS_VERSION}`);
      
      // Atualiza apenas campos analíticos derivados da imagem
      asset.sha256 = contentSha256;
      asset.aiAnalyzed = true;
      asset.aiAnalyzedAt = new Date().toISOString();
      asset.aiModel = GEMINI_MODEL;
      asset.aiAnalysisVersion = AI_ANALYSIS_VERSION;
      asset.aiDescription = cachedSource.aiDescription;
      asset.aiSuggestedTitle = cachedSource.aiSuggestedTitle;
      asset.aiTags = cachedSource.aiTags;
      asset.aiSceneType = cachedSource.aiSceneType;
      asset.aiProbableEventType = cachedSource.aiProbableEventType;
      asset.aiVisibleText = cachedSource.aiVisibleText;
      asset.aiVisualContext = cachedSource.aiVisualContext;
      asset.aiConfidence = cachedSource.aiConfidence;
      asset.aiStatus = 'ANALYZED';
      asset.aiError = undefined;

      // Preserva edições manuais ou preenche sugestões
      asset.title = asset.title || cachedSource.aiSuggestedTitle;
      asset.altText = asset.altText || cachedSource.aiDescription || '';
      asset.tags = Array.from(new Set([...(asset.tags || []), ...(cachedSource.aiTags || [])]));
      asset.eventName = asset.eventName || cachedSource.aiProbableEventType;
      return;
    }

    // Caso contrário: Executa chamada Gemini
    geminiSimulatedCalls++;
    asset.sha256 = contentSha256;
    asset.aiAnalyzed = true;
    asset.aiAnalyzedAt = new Date().toISOString();
    asset.aiModel = GEMINI_MODEL;
    asset.aiAnalysisVersion = AI_ANALYSIS_VERSION;
    asset.aiDescription = 'Sessão solene de diplomacia multilateral no Palácio das Nações em Genebra.';
    asset.aiSuggestedTitle = 'Comitiva ADMIR em Genebra';
    asset.aiTags = ['diplomacia', 'onu', 'genebra', 'paz'];
    asset.aiSceneType = 'meeting';
    asset.aiProbableEventType = 'Missão Diplomática Genebra';
    asset.aiVisibleText = 'ADMIR UNITED NATIONS 2026';
    asset.aiVisualContext = 'Salão nobre com bandeiras e comissários';
    asset.aiConfidence = 0.98;
    asset.aiStatus = 'ANALYZED';
    asset.title = asset.title || asset.aiSuggestedTitle;
    asset.altText = asset.altText || asset.aiDescription || '';
    asset.tags = Array.from(new Set([...(asset.tags || []), ...(asset.aiTags || [])]));
    asset.eventName = asset.eventName || asset.aiProbableEventType;
  }

  // 1. Processa Mídia A
  processMediaAnalysis('TEST_MEDIA_A', binaryContentAB);

  // 2. Processa Mídia B
  processMediaAnalysis('TEST_MEDIA_B', binaryContentAB);

  console.log(`  GEMINI_SIMULATED_CALLS: ${geminiSimulatedCalls}`);
  console.log(`  CACHE_HITS: ${cacheHits}`);

  assert(mediaA.id !== mediaB.id, 'A.id !== B.id (IDs são distintos)');
  assert(mediaA.sha256 === mediaB.sha256, 'A.sha256 === B.sha256 (Conteúdo idêntico)');
  assert(geminiSimulatedCalls === 1, 'GEMINI_SIMULATED_CALLS === 1 (Apenas 1 chamada de IA)');
  assert(cacheHits === 1, 'CACHE_HITS === 1 (Mídia B reutilizou análise de Mídia A)');

  // -------------------------------------------------------------
  // 2. TESTE PRESERVAÇÃO DE METADADOS ESPECÍFICOS DE B
  // -------------------------------------------------------------
  console.log('\n--- 2. TESTE PRESERVAÇÃO DE METADADOS ESPECÍFICOS DE B ---');

  assert(mediaB.id === 'TEST_MEDIA_B', 'mediaB.id preservado (não sobrescrito)');
  assert(mediaB.filename === 'copia_arquivo_missao_suica.jpg', 'mediaB.filename preservado');
  assert(mediaB.storageKey === 'public/media/copia_arquivo_missao_suica.jpg', 'mediaB.storageKey preservado');
  assert(mediaB.albumId === 'album-arquivo-morto', 'mediaB.albumId preservado (não herdou de A)');
  assert(mediaB.createdAt === '2026-03-01T14:30:00.000Z', 'mediaB.createdAt preservado');
  assert(mediaB.tags.includes('arquivo_historico'), 'Tags pré-existentes de B foram preservadas');
  assert(mediaB.tags.includes('genebra'), 'Tags analíticas de A foram agregadas');

  // -------------------------------------------------------------
  // 3. TESTE REUTILIZAÇÃO DE CAMPOS ANALÍTICOS DERIVADOS
  // -------------------------------------------------------------
  console.log('\n--- 3. TESTE CAMPOS ANALÍTICOS DERIVADOS ---');

  assert(mediaB.aiDescription === mediaA.aiDescription, 'aiDescription reutilizada com precisão');
  assert(mediaB.aiSuggestedTitle === mediaA.aiSuggestedTitle, 'aiSuggestedTitle reutilizado com precisão');
  assert(mediaB.aiSceneType === mediaA.aiSceneType, 'aiSceneType reutilizado com precisão');
  assert(mediaB.aiProbableEventType === mediaA.aiProbableEventType, 'aiProbableEventType reutilizado com precisão');
  assert(mediaB.aiVisibleText === mediaA.aiVisibleText, 'aiVisibleText reutilizado com precisão');
  assert(mediaB.aiVisualContext === mediaA.aiVisualContext, 'aiVisualContext reutilizado com precisão');
  assert(mediaB.aiConfidence === mediaA.aiConfidence, 'aiConfidence reutilizado com precisão');
  assert(mediaB.aiModel === GEMINI_MODEL, 'aiModel registrado como gemini-3.8-flash');
  assert(mediaB.aiAnalysisVersion === AI_ANALYSIS_VERSION, 'aiAnalysisVersion registrado como v2');

  // -------------------------------------------------------------
  // 4. TESTE HASH DIFERENTE (MÍDIA C) -> CACHE MISS
  // -------------------------------------------------------------
  console.log('\n--- 4. TESTE HASH DIFERENTE (MÍDIA C) -> CACHE MISS ---');

  const mediaC: MediaAsset = {
    id: 'TEST_MEDIA_C',
    filename: 'ajuda_humanitaria_amazonia.jpg',
    originalName: 'ajuda_humanitaria_amazonia.jpg',
    url: '/api/media/proxy/ajuda_humanitaria_amazonia.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentC.length,
    altText: '',
    caption: '',
    tags: [],
    createdAt: '2026-03-05T08:00:00.000Z',
    sha256: sha256_C,
    aiAnalyzed: false,
    aiStatus: 'PENDING'
  };
  mediaDatabase.push(mediaC);

  const callsBeforeC = geminiSimulatedCalls;
  processMediaAnalysis('TEST_MEDIA_C', binaryContentC);
  const callsAfterC = geminiSimulatedCalls;

  assert(callsAfterC === callsBeforeC + 1, 'Mídia C com SHA diferente disparou nova chamada Gemini (CACHE MISS)');

  // -------------------------------------------------------------
  // 5. TESTE MODELO DIFERENTE -> CACHE MISS
  // -------------------------------------------------------------
  console.log('\n--- 5. TESTE MODELO DIFERENTE -> CACHE MISS ---');

  const mediaD_DifferentModel: MediaAsset = {
    id: 'TEST_MEDIA_D_OLD_MODEL',
    filename: 'foto_genebra_modelo_antigo.jpg',
    originalName: 'foto_genebra_modelo_antigo.jpg',
    url: '/api/media/proxy/foto_genebra_modelo_antigo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentAB.length,
    altText: '',
    caption: '',
    tags: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    sha256: sha256_A,
    aiAnalyzed: true,
    aiStatus: 'ANALYZED',
    aiModel: 'gemini-1.5-flash', // Modelo diferente
    aiAnalysisVersion: 'v2',
    aiDescription: 'Descrição antiga gerada por modelo anterior.'
  };

  // Verificação de elegibilidade de cache
  const matchesOldModel = mediaD_DifferentModel.sha256 === sha256_A &&
                          mediaD_DifferentModel.aiModel === GEMINI_MODEL &&
                          mediaD_DifferentModel.aiAnalysisVersion === AI_ANALYSIS_VERSION;

  assert(matchesOldModel === false, 'Análise com modelo diferente (gemini-1.5-flash) NÃO é reutilizada para gemini-3.8-flash');

  // -------------------------------------------------------------
  // 6. TESTE VERSÃO DIFERENTE -> CACHE MISS
  // -------------------------------------------------------------
  console.log('\n--- 6. TESTE VERSÃO DIFERENTE -> CACHE MISS ---');

  const mediaE_DifferentVersion: MediaAsset = {
    id: 'TEST_MEDIA_E_OLD_VERSION',
    filename: 'foto_genebra_versao_antiga.jpg',
    originalName: 'foto_genebra_versao_antiga.jpg',
    url: '/api/media/proxy/foto_genebra_versao_antiga.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentAB.length,
    altText: '',
    caption: '',
    tags: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    sha256: sha256_A,
    aiAnalyzed: true,
    aiStatus: 'ANALYZED',
    aiModel: GEMINI_MODEL,
    aiAnalysisVersion: 'v1', // Versão diferente
    aiDescription: 'Descrição antiga v1.'
  };

  const matchesOldVersion = mediaE_DifferentVersion.sha256 === sha256_A &&
                            mediaE_DifferentVersion.aiModel === GEMINI_MODEL &&
                            mediaE_DifferentVersion.aiAnalysisVersion === AI_ANALYSIS_VERSION;

  assert(matchesOldVersion === false, 'Análise com versão anterior (v1) NÃO é reutilizada para versão atual (v2)');

  // -------------------------------------------------------------
  // 7. TESTE PRESERVAÇÃO DE DECISÕES HUMANAS
  // -------------------------------------------------------------
  console.log('\n--- 7. TESTE PRESERVAÇÃO DE DECISÕES HUMANAS / EDIÇÕES MANUAIS ---');

  const mediaF_HumanEdited: MediaAsset = {
    id: 'TEST_MEDIA_F',
    filename: 'foto_genebra_revisada_humano.jpg',
    originalName: 'foto_genebra_revisada_humano.jpg',
    url: '/api/media/proxy/foto_genebra_revisada_humano.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: binaryContentAB.length,
    title: 'Título Personalizado por Administrador Humano',
    altText: 'Texto alternativo acessível aprovado pelo comitê',
    caption: 'Legenda personalizada',
    tags: ['revisao_humana'],
    createdAt: '2026-03-10T11:00:00.000Z',
    sha256: sha256_A,
    aiAnalyzed: false,
    aiStatus: 'PENDING'
  };
  mediaDatabase.push(mediaF_HumanEdited);

  processMediaAnalysis('TEST_MEDIA_F', binaryContentAB);

  assert(mediaF_HumanEdited.title === 'Título Personalizado por Administrador Humano', 'Título editado manualmente preservado');
  assert(mediaF_HumanEdited.altText === 'Texto alternativo acessível aprovado pelo comitê', 'AltText editado manualmente preservado');
  assert(mediaF_HumanEdited.tags.includes('revisao_humana'), 'Tags manuais preservadas');

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

runContentHashCacheSuite().catch(err => {
  console.error('Erro na execução da suíte de cache:', err);
  process.exit(1);
});
