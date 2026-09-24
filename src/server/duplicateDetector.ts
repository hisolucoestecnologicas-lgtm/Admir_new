import crypto from 'crypto';
import { MediaAsset, DuplicateGroup } from '../types';

/**
 * Calculates SHA-256 hash of a file buffer.
 */
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculates a 64-bit dHash (Difference Hash) from image buffer.
 * Samples luminance values across image structure.
 */
export function calculateDHash(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) return '0000000000000000';

  try {
    // Improved luminance sampling over the ENTIRE buffer
    // This is still a simplified dHash since we don't decode pixels,
    // but sampling across the whole file is better than just the header.
    const width = 9;
    const height = 8;
    const totalPixels = width * height;
    const samples: number[] = [];
    
    // Sample at 72 points across the entire buffer
    for (let i = 0; i < totalPixels; i++) {
      const offset = Math.floor((i / totalPixels) * buffer.length);
      samples.push(buffer[offset] || 0);
    }

    let binaryString = '';
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width - 1; col++) {
        const left = samples[row * width + col];
        const right = samples[row * width + col + 1];
        binaryString += left > right ? '1' : '0';
      }
    }

    // Convert 64-bit binary to 16 hex chars
    let hexHash = '';
    for (let i = 0; i < binaryString.length; i += 4) {
      const nibble = binaryString.substring(i, i + 4);
      hexHash += parseInt(nibble, 2).toString(16);
    }
    return hexHash.padStart(16, '0');
  } catch (err) {
    return '0000000000000000';
  }
}

/**
 * Calculates Hamming distance between two hex hashes of equal length.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    if (isNaN(val1) || isNaN(val2)) {
      dist += 4; // Max distance for a nibble
      continue;
    }
    let xor = val1 ^ val2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

/**
 * Parses dimension string e.g. "4032x3024" or "1920x1080" into total pixel count.
 */
function getPixelCount(dim?: string): number {
  if (!dim || !dim.includes('x')) return 0;
  const parts = dim.toLowerCase().split('x').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * parts[1];
  }
  return 0;
}

/**
 * Compares two MediaAssets and returns similarity score and classification.
 */
export function compareMediaAssets(
  assetA: MediaAsset,
  assetB: MediaAsset
): {
  similarityScore: number;
  classification: 'DUPLICATA_EXATA' | 'PROVAVEL_DUPLICATA' | 'POSSIVEL_DUPLICATA' | 'IMAGEM_SEMELHANTE';
  matchedFields: string[];
} {
  const matchedFields: string[] = [];

  // 1. Exact SHA-256 match (Highest priority, 100% confidence)
  if (
    assetA.sha256 && 
    assetB.sha256 && 
    assetA.sha256.length >= 32 &&
    assetA.sha256 === assetB.sha256
  ) {
    matchedFields.push('sha256');
    return {
      similarityScore: 100,
      classification: 'DUPLICATA_EXATA',
      matchedFields,
    };
  }

  // 2. Exact filename + exact sizeBytes
  // Lowered confidence because same name/size does NOT guarantee binary identity.
  if (
    assetA.sizeBytes > 0 &&
    assetA.sizeBytes === assetB.sizeBytes &&
    assetA.originalName &&
    assetB.originalName &&
    assetA.originalName.toLowerCase() === assetB.originalName.toLowerCase()
  ) {
    matchedFields.push('sizeBytes', 'originalName');
    return {
      similarityScore: 98,
      classification: 'PROVAVEL_DUPLICATA',
      matchedFields,
    };
  }

  // 3. dHash hamming distance
  // NOTE: This dHash implementation is working on raw buffers (compressed data).
  // Tightening threshold significantly to avoid false positives.
  let dHashDist = 64;
  if (assetA.dHash && assetB.dHash && assetA.dHash !== '0000000000000000' && assetB.dHash !== '0000000000000000') {
    dHashDist = hammingDistance(assetA.dHash, assetB.dHash);
  }

  if (dHashDist <= 2) {
    matchedFields.push('dHash_exact');
    const score = Math.round(96 - dHashDist * 2);
    return {
      similarityScore: score,
      classification: 'PROVAVEL_DUPLICATA',
      matchedFields,
    };
  } else if (dHashDist <= 6) {
    matchedFields.push('dHash_similar');
    const score = Math.round(88 - (dHashDist - 2) * 2.5);
    return {
      similarityScore: score,
      classification: 'POSSIVEL_DUPLICATA',
      matchedFields,
    };
  }

  // 4. Metadata / Gemini similarity fallback
  let metaScore = 0;

  // Title / Filename similarity
  const nameA = (assetA.title || assetA.originalName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameB = (assetB.title || assetB.originalName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nameA && nameB && nameA === nameB) {
    metaScore += 20;
    matchedFields.push('filename_exact_meta');
  } else if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA))) {
    metaScore += 10;
    matchedFields.push('filename_partial');
  }

  // Gemini Visual Context / Visible Text
  if (
    assetA.aiVisualContext &&
    assetB.aiVisualContext &&
    assetA.aiVisualContext === assetB.aiVisualContext &&
    !assetA.aiVisualContext.includes('Falha temporária')
  ) {
    metaScore += 45;
    matchedFields.push('aiVisualContext');
  }

  if (
    assetA.aiVisibleText &&
    assetB.aiVisibleText &&
    assetA.aiVisibleText === assetB.aiVisibleText &&
    assetA.aiVisibleText.trim().length > 5
  ) {
    metaScore += 30;
    matchedFields.push('aiVisibleText');
  }

  // Capture Date / Event
  if (assetA.captureDate && assetB.captureDate && assetA.captureDate === assetB.captureDate) {
    metaScore += 10;
    matchedFields.push('captureDate');
  }

  if (assetA.eventName && assetB.eventName && assetA.eventName === assetB.eventName && assetA.eventName !== 'Acervo Geral') {
    metaScore += 10;
    matchedFields.push('eventName');
  }

  if (metaScore >= 85) {
    return {
      similarityScore: metaScore,
      classification: 'POSSIVEL_DUPLICATA',
      matchedFields,
    };
  } else if (metaScore >= 60) {
    return {
      similarityScore: metaScore,
      classification: 'IMAGEM_SEMELHANTE',
      matchedFields,
    };
  }

  return {
    similarityScore: 0,
    classification: 'IMAGEM_SEMELHANTE',
    matchedFields: [],
  };
}

/**
 * Generates a non-destructive system recommendation for a group of duplicate candidate assets.
 */
export function generateDuplicateRecommendation(groupAssets: MediaAsset[]): {
  keepMediaId: string;
  deleteMediaIds: string[];
  reason: string;
} {
  if (!groupAssets || groupAssets.length === 0) {
    return { keepMediaId: '', deleteMediaIds: [], reason: 'Grupo vazio' };
  }

  if (groupAssets.length === 1) {
    return {
      keepMediaId: groupAssets[0].id,
      deleteMediaIds: [],
      reason: 'Apenas uma mídia no grupo.',
    };
  }

  // Score each asset to find the best candidate to KEEP:
  // Points:
  // - usageCount > 0: +1000 points (CRITICAL: preserve assets used on live site)
  // - pixel count: +1 point per 10,000 pixels
  // - sizeBytes: +1 point per 100KB
  // - has album/event info: +50 points
  // - older createdAt (original upload): +20 points
  let bestAsset = groupAssets[0];
  let highestScore = -1;

  groupAssets.forEach((asset) => {
    let score = 0;

    if ((asset.usageCount || 0) > 0) {
      score += 1000 * (asset.usageCount || 1);
    }

    const pixels = getPixelCount(asset.dimensions);
    score += Math.floor(pixels / 10000);

    score += Math.floor(asset.sizeBytes / 100000);

    if (asset.albumId) score += 50;
    if (asset.eventName) score += 30;

    if (asset.createdAt) {
      const ageDays = Math.floor((Date.now() - new Date(asset.createdAt).getTime()) / (1000 * 3600 * 24));
      score += Math.min(50, ageDays);
    }

    if (score > highestScore) {
      highestScore = score;
      bestAsset = asset;
    }
  });

  const deleteIds = groupAssets.filter((a) => a.id !== bestAsset.id).map((a) => a.id);

  // Build descriptive Portuguese explanation
  const reasons: string[] = [];
  if ((bestAsset.usageCount || 0) > 0) {
    reasons.push(`está em uso no site em ${bestAsset.usageCount} local(is)`);
  }
  if (bestAsset.dimensions) {
    reasons.push(`possui resolução de ${bestAsset.dimensions}`);
  }
  reasons.push(`tamanho de ${(bestAsset.sizeBytes / (1024 * 1024)).toFixed(2)} MB`);

  const reasonText = `Sugestão: Manter a imagem "${bestAsset.title || bestAsset.originalName}" pois ${reasons.join(', ')}. As demais (${deleteIds.length}) foram marcadas para revisão.`;

  return {
    keepMediaId: bestAsset.id,
    deleteMediaIds: deleteIds,
    reason: reasonText,
  };
}
