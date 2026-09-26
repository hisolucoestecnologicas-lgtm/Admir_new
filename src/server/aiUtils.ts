import { GoogleGenAI } from '@google/genai';

/**
 * Common model name to be used across the application.
 * Preference for gemini-3.8-flash as it's the current recommended model.
 */
export const GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Global Rate Limit for AI Media Analysis (Free Tier is ~15 RPM or 5 RPM depending on specific model)
 * We'll use a conservative 4 RPM to avoid hitting 429 too often.
 */
export const AI_MEDIA_MAX_RPM = process.env.AI_MEDIA_MAX_RPM ? parseInt(process.env.AI_MEDIA_MAX_RPM, 10) : 4;
export const AI_MEDIA_MIN_DELAY_MS = (60 * 1000) / AI_MEDIA_MAX_RPM;

/**
 * Versioning for AI analysis results.
 * Incrementing this will trigger re-analysis of already analyzed media.
 */
export const AI_ANALYSIS_VERSION = 'v2';

export class AIRateLimiter {
  private lastCallStartTime: number = 0;
  private adaptiveMultiplier: number = 1.0;
  private maxRpm: number = AI_MEDIA_MAX_RPM;

  constructor() {
    this.maxRpm = AI_MEDIA_MAX_RPM;
  }

  public getMinDelayMs(): number {
    return (60 * 1000) / this.maxRpm;
  }

  public getAdaptiveMultiplier(): number {
    return this.adaptiveMultiplier;
  }

  /**
   * Registers a call is about to start.
   * Calculates the wait time required to respect the rate limit since the START of the last call.
   */
  public async waitIfNecessary(): Promise<number> {
    const minDelay = this.getMinDelayMs() * this.adaptiveMultiplier;
    const now = Date.now();
    
    let waitMs = 0;
    if (this.lastCallStartTime > 0) {
      const timeSinceLastStart = now - this.lastCallStartTime;
      if (timeSinceLastStart < minDelay) {
        waitMs = minDelay - timeSinceLastStart;
        console.log(`[AIRateLimiter] Waiting ${Math.round(waitMs)}ms to respect the ${this.maxRpm} RPM rate limit (Multiplier: ${this.adaptiveMultiplier.toFixed(1)}x).`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    this.lastCallStartTime = Date.now();
    return waitMs;
  }

  public notifySuccess() {
    if (this.adaptiveMultiplier > 1.0) {
      // Gradually decay back to normal delay
      this.adaptiveMultiplier = Math.max(1.0, this.adaptiveMultiplier - 0.2);
      console.log(`[AIRateLimiter] Success! Decreased adaptive multiplier to ${this.adaptiveMultiplier.toFixed(1)}x`);
    }
  }

  public notifyQuotaError() {
    // Increase the multiplier on 429
    this.adaptiveMultiplier = Math.min(8.0, this.adaptiveMultiplier * 2.0);
    console.warn(`[AIRateLimiter] Quota exceeded (429)! Increased adaptive multiplier to ${this.adaptiveMultiplier.toFixed(1)}x`);
  }

  public setLastCallStartTime(time: number) {
    this.lastCallStartTime = time;
  }
}

export const aiRateLimiter = new AIRateLimiter();

/**
 * Standardized retry mechanism for Gemini API calls.
 * Handles transient 503, 429, and other overloaded/unavailable errors.
 * Improved for low-quota environments (Free Tier).
 */
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  context: string = 'AI',
  maxRetries = 5,
  initialDelay = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // For MediaAnalysis, we let withAIRetry handle the central rate limit check before executing the API call.
      if (context === 'MediaAnalysis') {
        await aiRateLimiter.waitIfNecessary();
      }

      const result = await fn();
      aiRateLimiter.notifySuccess();
      return result;
    } catch (err: any) {
      lastError = err;
      const msg = String(err.message || err).toLowerCase();
      
      const isQuotaError = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
      
      if (isQuotaError) {
        aiRateLimiter.notifyQuotaError();
      }

      const isTransient = 
        isQuotaError ||
        msg.includes('503') || 
        msg.includes('high demand') ||
        msg.includes('unavailable') ||
        msg.includes('deadline_exceeded') ||
        msg.includes('overloaded');
      
      if (!isTransient || i === maxRetries - 1) throw err;
      
      // If it's a quota error, we need a significantly longer wait to clear the rate limit
      // especially if we are on a 5 RPM (1 request every 12s) free tier.
      let delay = initialDelay * Math.pow(2.5, i); // Slightly more aggressive backoff
      
      if (isQuotaError) {
        // Minimum 15s wait for quota errors to be safe
        delay = Math.max(delay, 15000 + (Math.random() * 5000));
      } else {
        // Add jitter to non-quota transient errors
        delay = delay + (Math.random() * 1000);
      }
      
      console.warn(`[${context}] ${isQuotaError ? 'Quota/Rate limit' : 'Transient error'} detected, retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

let genAI: GoogleGenAI | null = null;

export function getSharedGenAI(): GoogleGenAI | null {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genAI = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return genAI;
}
