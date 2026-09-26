import { db } from './db';
import { MediaAsset, MediaAIJob, User } from '../types';
import { analyzeImageWithGemini } from './aiMediaService';
import { PublicMediaStorage } from './storage';
import { GEMINI_MODEL, AI_ANALYSIS_VERSION, aiRateLimiter } from './aiUtils';

let isWorkerRunning = false;

// Prefetch cache for the efficient pipeline
interface PrefetchedMedia {
  mediaId: string;
  buffer: Buffer;
  downloadTimeMs: number;
  prepTimeMs: number;
}

let prefetchedItem: PrefetchedMedia | null = null;
let prefetchPromise: Promise<PrefetchedMedia | null> | null = null;

function clearPrefetchCache() {
  prefetchedItem = null;
  prefetchPromise = null;
}

async function prefetchNextMedia(nextMediaId: string): Promise<PrefetchedMedia | null> {
  try {
    const asset = db.getMedia().find(m => m.id === nextMediaId);
    if (!asset) return null;

    // Check if already analyzed to avoid redundant downloads
    if (asset.aiAnalyzed && asset.aiAnalysisVersion === AI_ANALYSIS_VERSION && asset.aiStatus === 'ANALYZED') {
      return null;
    }

    const downloadStart = Date.now();
    let buffer: Buffer | null = null;
    if (asset.url.startsWith('/api/media/proxy/')) {
      const key = asset.url.replace('/api/media/proxy/', '');
      if (PublicMediaStorage.isConfigured()) {
        const { body } = await PublicMediaStorage.read(key);
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }
    }
    const downloadTimeMs = Date.now() - downloadStart;

    if (!buffer) return null;

    const prepStart = Date.now();
    const prepTimeMs = Date.now() - prepStart;

    console.log(`[AI_Pipeline] Prefetched media ${nextMediaId} successfully: download=${downloadTimeMs}ms.`);
    return {
      mediaId: nextMediaId,
      buffer,
      downloadTimeMs,
      prepTimeMs
    };
  } catch (err) {
    console.warn(`[AI_Pipeline] Error prefetching next media ${nextMediaId}:`, err);
    return null;
  }
}

/**
 * Main worker loop that processes pending AI Media Jobs with Cooperative Cancellation & Performance Metrics.
 */
export async function startAIWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  console.log('[AI_Media_Worker] Background worker started.');

  // Normalize interrupted/stuck jobs on startup
  try {
    const activeJob = db.getActiveAIJob();
    if (activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'RATE_LIMITED')) {
      console.log(`[AI_Media_Worker] Resuming interrupted job ${activeJob.id} on startup.`);
      db.updateAIJob(activeJob.id, {
        status: 'RUNNING',
        rateLimitWaitUntil: undefined
      });
    }
  } catch (err) {
    console.error('[AI_Media_Worker] Failed to normalize active job on startup:', err);
  }

  try {
    while (true) {
      const activeJob = db.getActiveAIJob();
      console.log(`[AI_Media_Worker] STATUS_CHECK activeJobId=${activeJob?.id || 'none'} status=${activeJob?.status || 'none'}`);
      
      if (!activeJob) {
        clearPrefetchCache();
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (activeJob.status === 'PAUSED' || activeJob.status === 'CANCELLED') {
        clearPrefetchCache();
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (activeJob.status === 'PENDING' || activeJob.status === 'INTERRUPTED') {
        db.updateAIJob(activeJob.id, { 
          status: 'RUNNING',
          startedAt: activeJob.startedAt || new Date().toISOString()
        });
      }

      await processJob(activeJob.id);
    }
  } catch (err) {
    console.error('[AI_Media_Worker] Critical worker failure:', err);
  } finally {
    isWorkerRunning = false;
  }
}

async function processJob(jobId: string) {
  const jobBefore = db.getAIJob(jobId);
  console.log(`[AI_Media_Worker] STATUS_CHECK jobId=${jobId} status=${jobBefore?.status || 'not_found'}`);
  if (!jobBefore || jobBefore.status !== 'RUNNING') return;

  const queueStartTimestamp = Date.now();

  const pendingIds = [...jobBefore.pendingMediaIds];
  if (pendingIds.length === 0) {
    db.updateAIJob(jobId, { 
      status: jobBefore.failedItems > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      finishedAt: new Date().toISOString()
    });
    clearPrefetchCache();
    return;
  }

  const mediaId = pendingIds[0];
  const nextMediaId = pendingIds[1];
  const asset = db.getMedia().find(m => m.id === mediaId);

  // Cooperative cancellation check #1
  const checkJob = db.getAIJob(jobId);
  console.log(`[AI_Media_Worker] STATUS_CHECK (Check 1) jobId=${jobId} status=${checkJob?.status}`);
  if (!checkJob || checkJob.status === 'CANCELLED' || checkJob.status === 'PAUSED') {
    return;
  }

  if (!asset) {
    db.updateAIJob(jobId, {
      pendingMediaIds: pendingIds.slice(1),
      processedMediaIds: [...jobBefore.processedMediaIds, mediaId],
      processedItems: jobBefore.processedItems + 1,
      skippedItems: jobBefore.skippedItems + 1
    });
    return;
  }

  // Check if already analyzed with same version (Skip optimization)
  if (asset.aiAnalyzed && asset.aiAnalysisVersion === AI_ANALYSIS_VERSION && asset.aiStatus === 'ANALYZED') {
    db.updateAIJob(jobId, {
      pendingMediaIds: pendingIds.slice(1),
      processedMediaIds: [...jobBefore.processedMediaIds, mediaId],
      processedItems: jobBefore.processedItems + 1,
      successItems: jobBefore.successItems + 1,
      lastMediaId: mediaId,
      lastMediaName: asset.originalName || asset.filename
    });
    return;
  }

  const queueWaitMs = Date.now() - queueStartTimestamp;

  // Adaptive Rate Limiting wait with Admin UI UX feedback
  const rateLimitStart = Date.now();
  const minDelay = aiRateLimiter.getMinDelayMs() * aiRateLimiter.getAdaptiveMultiplier();
  const lastStart = (aiRateLimiter as any).lastCallStartTime || 0;
  const elapsed = rateLimitStart - lastStart;
  let rateLimitWaitMs = 0;

  if (lastStart > 0 && elapsed < minDelay) {
    rateLimitWaitMs = minDelay - elapsed;
    
    db.updateAIJob(jobId, { 
      status: 'RATE_LIMITED',
      rateLimitWaitUntil: new Date(Date.now() + rateLimitWaitMs).toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, rateLimitWaitMs));
    
    // Cooperative cancellation check #2 after rate limit wait
    const afterWaitJob = db.getAIJob(jobId);
    if (!afterWaitJob || afterWaitJob.status === 'CANCELLED' || afterWaitJob.status === 'PAUSED') {
      return;
    }

    db.updateAIJob(jobId, { status: 'RUNNING', rateLimitWaitUntil: undefined });
  }

  // Set last call start time to NOW since we are initiating the request flow
  aiRateLimiter.setLastCallStartTime(Date.now());

  const itemStartTime = Date.now();

  try {
    db.updateMedia(mediaId, { aiStatus: 'PROCESSING' }, { name: 'AI_WORKER', email: 'ai-worker@admir.org' } as User);

    // 1. Download / Retrieval using Efficient Pipeline
    let buffer: Buffer | null = null;
    let downloadTimeMs = 0;
    let prepTimeMs = 0;

    // Check prefetch HIT
    if (prefetchedItem && prefetchedItem.mediaId === mediaId) {
      buffer = prefetchedItem.buffer;
      downloadTimeMs = prefetchedItem.downloadTimeMs;
      prepTimeMs = prefetchedItem.prepTimeMs;
      console.log(`[AI_Pipeline] Cache HIT for media ${mediaId}! Saved download wait.`);
      prefetchedItem = null; // consume
    } else {
      if (prefetchPromise) {
        const res = await prefetchPromise;
        if (res && res.mediaId === mediaId) {
          buffer = res.buffer;
          downloadTimeMs = res.downloadTimeMs;
          prepTimeMs = res.prepTimeMs;
          console.log(`[AI_Pipeline] Promise HIT for media ${mediaId}! Saved download wait.`);
        }
        prefetchPromise = null;
      }
    }

    // Direct download fallback if prefetch missed or wasn't triggered
    if (!buffer) {
      const downloadStart = Date.now();
      if (asset.url.startsWith('/api/media/proxy/')) {
        const key = asset.url.replace('/api/media/proxy/', '');
        if (PublicMediaStorage.isConfigured()) {
          const { body } = await PublicMediaStorage.read(key);
          const chunks: Buffer[] = [];
          for await (const chunk of body) {
            chunks.push(Buffer.from(chunk));
          }
          buffer = Buffer.concat(chunks);
        }
      }
      downloadTimeMs = Date.now() - downloadStart;
    }

    // Trigger prefetch for the NEXT item asynchronously in the background
    if (nextMediaId) {
      prefetchPromise = prefetchNextMedia(nextMediaId);
    }

    if (!buffer) {
      throw new Error('Falha ao recuperar arquivo para análise.');
    }

    // 2. Image Preparation (base64 conversion)
    const prepStart = Date.now();
    const base64Data = buffer.toString('base64');
    prepTimeMs = Date.now() - prepStart;

    // Cooperative cancellation check #3 before calling Gemini
    const preGeminiJob = db.getAIJob(jobId);
    if (!preGeminiJob || preGeminiJob.status === 'CANCELLED') {
      return;
    }

    // 3. Gemini Request Time
    const geminiStart = Date.now();
    const analysis = await analyzeImageWithGemini(buffer, asset.mimeType || 'image/jpeg', asset.originalName || asset.filename);
    const geminiRequestMs = Date.now() - geminiStart;

    // Cooperative cancellation check #4 after Gemini response before DB save
    const postGeminiJob = db.getAIJob(jobId);
    if (!postGeminiJob || postGeminiJob.status === 'CANCELLED') {
      console.log(`[AI_Media_Worker] Job ${jobId} was cancelled during Gemini call. Discarding persistence for media ${mediaId}.`);
      return;
    }

    // 4. Persistence Time
    const persistStart = Date.now();
    db.updateMedia(mediaId, {
      aiAnalyzed: true,
      aiAnalyzedAt: new Date().toISOString(),
      aiModel: GEMINI_MODEL,
      aiAnalysisVersion: AI_ANALYSIS_VERSION,
      aiDescription: analysis.description,
      aiSuggestedTitle: analysis.suggestedTitle,
      aiTags: analysis.tags,
      aiSceneType: analysis.sceneType,
      aiProbableEventType: analysis.probableEventType,
      aiVisibleText: analysis.visibleText,
      aiVisualContext: analysis.visualContext,
      aiConfidence: analysis.confidence,
      aiStatus: 'ANALYZED',
      aiError: undefined,
      title: asset.title || analysis.suggestedTitle,
      altText: asset.altText || analysis.description,
      tags: Array.from(new Set([...(asset.tags || []), ...(analysis.tags || [])])),
      eventName: asset.eventName || analysis.probableEventType,
    }, { name: 'AI_WORKER', email: 'ai-worker@admir.org' } as User);

    const currentJobLatest = db.getAIJob(jobId);
    if (currentJobLatest && currentJobLatest.status !== 'CANCELLED') {
      db.updateAIJob(jobId, {
        pendingMediaIds: pendingIds.slice(1),
        processedMediaIds: [...currentJobLatest.processedMediaIds, mediaId],
        processedItems: currentJobLatest.processedItems + 1,
        successItems: currentJobLatest.successItems + 1,
        lastMediaId: mediaId,
        lastMediaName: asset.originalName || asset.filename
      });
    }
    const persistenceMs = Date.now() - persistStart;
    const totalItemMs = Date.now() - itemStartTime;

    console.log(`[AI_Performance_Metric] Media ${mediaId} (${asset.originalName}): DOWNLOAD=${downloadTimeMs}ms, PREP=${prepTimeMs}ms, QUEUE_WAIT=${queueWaitMs}ms, RATE_LIMIT_WAIT=${rateLimitWaitMs}ms, GEMINI_REQ=${geminiRequestMs}ms, PERSIST=${persistenceMs}ms, TOTAL=${totalItemMs}ms`);

  } catch (err: any) {
    console.error(`[AI_Media_Worker] Error processing media ${mediaId}:`, err.message);
    
    const errStr = String(err.message || err).toLowerCase();
    const isQuotaOrRateLimit = errStr.includes('free_tier_requests') || errStr.includes('generatesperday') || errStr.includes('limit: 20') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted');
    
    const jobNow = db.getAIJob(jobId);
    if (jobNow && jobNow.status === 'CANCELLED') return;

    if (isQuotaOrRateLimit) {
      db.updateAIJob(jobId, { 
        status: 'PAUSED',
        lastError: 'Cota da API Gemini esgotada (Rate Limit / Free Tier atingido). Processamento pausado automaticamente para evitar estouros de cota adicionais.',
        rateLimitWaitUntil: new Date(Date.now() + 3600000).toISOString()
      });
      return;
    }

    db.updateMedia(mediaId, { 
      aiStatus: 'FAILED',
      aiError: err.message
    }, { name: 'AI_WORKER', email: 'ai-worker@admir.org' } as User);

    const latestJob = db.getAIJob(jobId);
    if (latestJob && latestJob.status !== 'CANCELLED') {
      db.updateAIJob(jobId, {
        pendingMediaIds: pendingIds.slice(1),
        processedMediaIds: [...latestJob.processedMediaIds, mediaId],
        processedItems: latestJob.processedItems + 1,
        failedItems: latestJob.failedItems + 1,
        lastMediaId: mediaId,
        lastMediaName: asset.originalName || asset.filename,
        lastError: `Erro no item ${asset.filename}: ${err.message}`
      });
    }
  }
}
