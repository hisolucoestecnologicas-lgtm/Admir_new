import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { PublicMediaStorage } from './storage';
import { analyzeImageWithGemini, clusterMediaAssetsWithGemini } from './aiMediaService';
import { calculateSHA256, calculateDHash, compareMediaAssets, generateDuplicateRecommendation } from './duplicateDetector';
import { MediaAsset, MediaImportJob, MediaImportJobItem, DuplicateGroup, User } from '../types';

export interface ArchiveProcessingOptions {
  jobName?: string;
  userId?: string;
  userName?: string;
  albumId?: string;
}

export interface ArchiveProcessingReport {
  jobId: string;
  archiveName: string;
  totalFilesFound: number;
  validImagesCount: number;
  ignoredFilesCount: number;
  ignoredFilesList: { name: string; reason: string }[];
  exactDuplicatesCount: number;
  probableDuplicatesCount: number;
  possibleDuplicatesCount: number;
  createdAssets: MediaAsset[];
  duplicateGroups: DuplicateGroup[];
  job: MediaImportJob;
}

// Security limits
const MAX_PACKAGE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_TOTAL_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_FILES_PER_PACKAGE = 1200;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_COMPRESSION_RATIO = 100; // Uncompressed size / Compressed size cannot exceed 100x

const TEMP_DIR = path.join(process.cwd(), 'data', 'temp_imports');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Magic Bytes definitions
const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  GIF: [0x47, 0x49, 0x46, 0x38],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF...WEBP
};

function isValidImageHeader(buffer: Buffer): { valid: boolean; mime: string; ext: string } {
  if (!buffer || buffer.length < 8) return { valid: false, mime: '', ext: '' };

  // Check JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // Check PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, mime: 'image/png', ext: 'png' };
  }

  // Check WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, mime: 'image/webp', ext: 'webp' };
  }

  // Check GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { valid: true, mime: 'image/gif', ext: 'gif' };
  }

  return { valid: false, mime: '', ext: '' };
}

/**
 * Extracts and processes a compressed zip archive securely on the server.
 */
export async function processArchiveUpload(
  archiveBufferOrPath: Buffer | string,
  archiveFileName: string,
  options: ArchiveProcessingOptions = {}
): Promise<ArchiveProcessingReport> {
  const uploadStartTime = Date.now();
  const isPath = typeof archiveBufferOrPath === 'string';
  const sizeBytes = isPath ? fs.statSync(archiveBufferOrPath).size : archiveBufferOrPath.length;
  console.log('PACKAGE_UPLOAD_START', { archiveFileName, sizeBytes });

  // Size limit validation
  if (sizeBytes > MAX_PACKAGE_SIZE) {
    console.log(`[ARCHIVE TRACE ERROR] Stage: SIZE_LIMIT_VALIDATION, Error: Exceeds ${MAX_PACKAGE_SIZE / (1024 * 1024)} MB`);
    throw new Error(`O tamanho do pacote excede o limite de segurança permitido de ${MAX_PACKAGE_SIZE / (1024 * 1024)} MB.`);
  }

  console.log('PACKAGE_UPLOAD_RECEIVED', { durationMs: Date.now() - uploadStartTime });
  console.log('[ARCHIVE TRACE 23] PACKAGE_VALIDATION_START');
  console.log('PACKAGE_VALIDATION_START');

  // Validate ZIP with AdmZip
  let zip: AdmZip;
  try {
    zip = new AdmZip(archiveBufferOrPath);
  } catch (err: any) {
    console.log(`[ARCHIVE TRACE ERROR] Stage: ZIP_OPEN, Error: ${err.message}`);
    throw new Error(`Falha ao abrir arquivo compactado. O arquivo pode estar corrompido ou formato não suportado (.zip): ${(err as Error).message}`);
  }

  console.log('[ARCHIVE TRACE 24] PACKAGE_VALIDATION_OK');
  console.log('PACKAGE_VALIDATION_OK');
  console.log('[ARCHIVE TRACE 25] EXTRACTION_START');
  console.log('PACKAGE_EXTRACTION_START');

  const entries = zip.getEntries();
  const totalFilesFound = entries.filter((e) => !e.isDirectory).length;

  if (totalFilesFound === 0) {
    throw new Error('O arquivo compactado está vazio ou não contém arquivos válidos.');
  }

  if (totalFilesFound > MAX_FILES_PER_PACKAGE) {
    throw new Error(`O pacote excede o limite máximo de ${MAX_FILES_PER_PACKAGE} arquivos por lote.`);
  }

  const ignoredFilesList: { name: string; reason: string }[] = [];
  const validEntries: { entry: AdmZip.IZipEntry; folderPath: string; cleanName: string }[] = [];

  let totalUncompressedSize = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName;

    // Protection against Zip Slip / Path Traversal
    const normalizedPath = path.normalize(entryName).replace(/^(\.\.[\/\\])+/, '');
    if (entryName.includes('..') || path.isAbsolute(entryName)) {
      ignoredFilesList.push({ name: entryName, reason: 'Bloqueado por segurança (Zip Slip / Path Traversal)' });
      continue;
    }

    // Protection against MacOS / System meta files
    const fileName = path.basename(entryName);
    if (
      fileName.startsWith('.') ||
      fileName.startsWith('__MACOSX') ||
      fileName.toLowerCase() === 'thumbs.db' ||
      fileName.toLowerCase() === 'desktop.ini'
    ) {
      ignoredFilesList.push({ name: entryName, reason: 'Arquivo de sistema / Oculto ignorado' });
      continue;
    }

    // Protection against password encrypted entries
    if ((entry as any).header?.encrypted) {
      ignoredFilesList.push({ name: entryName, reason: 'Arquivo compactado protegido por senha não suportado' });
      continue;
    }

    // Protection against Zip Bomb (large file or high compression ratio)
    const compressedSize = entry.header.compressedSize || 1;
    const compressionRatio = entry.header.size / compressedSize;
    if (compressionRatio > MAX_COMPRESSION_RATIO) {
      throw new Error(`Detecção de Zip Bomb: Taxa de compressão anormal (${compressionRatio.toFixed(1)}x) no arquivo: ${entryName}`);
    }

    if (entry.header.size > MAX_FILE_SIZE) {
      ignoredFilesList.push({ name: entryName, reason: `Arquivo excede o limite de tamanho individual de ${MAX_FILE_SIZE / (1024 * 1024)} MB` });
      continue;
    }

    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error(`O tamanho total descompactado excede o limite de segurança de ${MAX_TOTAL_UNCOMPRESSED_BYTES / (1024 * 1024 * 1024)} GB.`);
    }

    // Check supported file extension
    const ext = path.extname(fileName).toLowerCase();
    const isSupportedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);

    if (!isSupportedExt) {
      ignoredFilesList.push({ name: entryName, reason: `Formato de arquivo não suportado (${ext || 'sem extensão'})` });
      continue;
    }

    // Extract original folder path inside ZIP
    const folderParts = entryName.split('/').filter(Boolean);
    const folderPath = folderParts.length > 1 ? folderParts.slice(0, -1).join('/') : '';

    validEntries.push({
      entry,
      folderPath,
      cleanName: fileName,
    });
  }

  console.log('[ARCHIVE TRACE 26] EXTRACTION_COMPLETE');
  console.log('PACKAGE_EXTRACTION_OK');
  console.log('PACKAGE_INVENTORY_START');

  // Prepare initial items queue
  const itemsReport: MediaImportJobItem[] = validEntries.map((e, idx) => ({
    id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    filename: e.cleanName,
    originalName: e.cleanName,
    sizeBytes: e.entry.header.size,
    mimeType: '',
    status: 'WAITING',
    progress: 0,
  }));

  console.log('[ARCHIVE TRACE 27] INVENTORY_COMPLETE');
  console.log('PACKAGE_INVENTORY_OK');

  const now = new Date().toISOString();
  const systemUser: User = {
    id: options.userId || 'admin-system',
    email: options.userName || 'admin@admiramerican.com',
    name: options.userName || 'Administrador',
    role: 'owner',
    status: 'active',
    permissions: {} as any,
    joinedAt: now,
    lastLoginAt: now,
  };

  // Create real-time polling Job record in DB
  const importJobRecord = db.createImportJob(
    {
      jobName: options.jobName || `Importação ZIP: ${archiveFileName}`,
      status: 'UPLOADING', // Background worker will advance this
      totalItems: validEntries.length,
      uploadedItems: validEntries.length,
      processedItems: 0,
      failedItems: 0,
      duplicateItems: 0,
      items: itemsReport,
      archiveName: archiveFileName,
      archiveType: 'zip',
      totalFilesFound,
      validImagesCount: validEntries.length,
      ignoredFilesCount: ignoredFilesList.length,
      ignoredFilesList,
      exactDuplicatesCount: 0,
      probableDuplicatesCount: 0,
      possibleDuplicatesCount: 0,
      completedAt: undefined,
    },
    systemUser
  );

  // Save ZIP package to temp disk storage to offload memory and allow resumption
  const tempFilePath = path.join(TEMP_DIR, `${importJobRecord.id}.zip`);
  if (isPath) {
    if (archiveBufferOrPath !== tempFilePath) {
      fs.renameSync(archiveBufferOrPath, tempFilePath);
    }
  } else {
    fs.writeFileSync(tempFilePath, archiveBufferOrPath);
  }

  // Launch background processor asynchronously
  runArchiveImportWorker(importJobRecord.id, tempFilePath, systemUser, options).catch((err) => {
    console.error(`[BackgroundWorker] Critical error on job ${importJobRecord.id}:`, err);
  });

  // Return report IMMEDIATELY to prevent timeouts
  return {
    jobId: importJobRecord.id,
    archiveName: archiveFileName,
    totalFilesFound,
    validImagesCount: validEntries.length,
    ignoredFilesCount: ignoredFilesList.length,
    ignoredFilesList,
    exactDuplicatesCount: 0,
    probableDuplicatesCount: 0,
    possibleDuplicatesCount: 0,
    createdAssets: [],
    duplicateGroups: [],
    job: importJobRecord,
  };
}

/**
 * Asynchronous background worker that processes archive files in controlled batches.
 */
export async function runArchiveImportWorker(
  jobId: string,
  tempFilePath: string,
  systemUser: User,
  options: ArchiveProcessingOptions = {}
) {
  const workerStartTime = Date.now();
  console.log(`[BackgroundWorker] Job ${jobId} initialized.`);

  try {
    let job = db.getImportJob(jobId);
    if (!job) {
      console.error(`[BackgroundWorker] Job ${jobId} not found in database.`);
      return;
    }

    db.updateImportJob(jobId, { status: 'EXTRACTING' });

    // Open zip archive from disk
    let zip: AdmZip;
    try {
      zip = new AdmZip(tempFilePath);
    } catch (err) {
      throw new Error(`Falha ao abrir o ZIP temporário: ${(err as Error).message}`);
    }

    const entries = zip.getEntries();

    // Map entries by clean filename
    const entryMap = new Map<string, AdmZip.IZipEntry>();
    for (const e of entries) {
      if (!e.isDirectory) {
        entryMap.set(path.basename(e.entryName), e);
      }
    }

    db.updateImportJob(jobId, { status: 'CHECKING_DUPLICATES' });
    console.log('PACKAGE_DUPLICATE_SCAN_START');

    const existingMedia = db.getMedia().filter((m) => !m.isDeleted);
    console.log('PACKAGE_DUPLICATE_SCAN_OK');

    db.updateImportJob(jobId, { status: 'PROCESSING' });
    console.log('[ARCHIVE TRACE 28] MEDIA_PROCESS_START');
    console.log('PACKAGE_BATCH_UPLOAD_START');

    // Filter items to process (WAITING or ERROR)
    const itemsToProcess = job.items.filter((item) => item.status === 'WAITING' || item.status === 'ERROR');

    let processedCount = job.processedItems || 0;
    let failedCount = job.failedItems || 0;
    let duplicateCount = job.duplicateItems || 0;
    let exactDuplicatesCount = job.exactDuplicatesCount || 0;
    let probableDuplicatesCount = job.probableDuplicatesCount || 0;
    let possibleDuplicatesCount = job.possibleDuplicatesCount || 0;

    const createdAssets: MediaAsset[] = [];
    const newDuplicateGroups: DuplicateGroup[] = [];

    // Batch loop - 5 items concurrent
    const CONCURRENCY = 5;

    for (let i = 0; i < itemsToProcess.length; i += CONCURRENCY) {
      // Check if job was cancelled
      const currentJob = db.getImportJob(jobId);
      if (!currentJob || currentJob.status === 'CANCELLED') {
        console.log(`[BackgroundWorker] Job ${jobId} execution stopped because it was CANCELLED.`);
        break;
      }

      const batch = itemsToProcess.slice(i, i + CONCURRENCY);

      await Promise.all(
        batch.map(async (jobItem) => {
          const entry = entryMap.get(jobItem.filename);
          if (!entry) {
            jobItem.status = 'ERROR';
            jobItem.error = 'Arquivo ausente no ZIP';
            failedCount++;
            return;
          }

          let fileBuffer: Buffer;
          try {
            fileBuffer = entry.getData();
          } catch (err) {
            jobItem.status = 'ERROR';
            jobItem.error = 'Erro na extração física';
            failedCount++;
            return;
          }

          // Header sign validate (Magic Bytes)
          const headerCheck = isValidImageHeader(fileBuffer);
          if (!headerCheck.valid) {
            jobItem.status = 'ERROR';
            jobItem.error = 'Assinatura mágica inválida (MIME incompatível)';
            failedCount++;
            return;
          }

          jobItem.mimeType = headerCheck.mime;

          const sha256 = calculateSHA256(fileBuffer);
          const dHash = calculateDHash(fileBuffer);
          jobItem.sha256 = sha256;

          // Check if exact file hash already exists in storage to avoid redundant R2 uploads
          const existingExact = [...existingMedia, ...createdAssets].find(
            (m) => m.sha256 === sha256 && !m.isDeleted
          );

          let storageResult: { storageKey: string; publicUrl: string };

          if (existingExact) {
            // Content already persisted in R2: reuse existing storage location without re-uploading
            console.log(`[ARCHIVE TRACE] Exact SHA-256 duplicate found for ${jobItem.filename}. Reusing storage key ${existingExact.filename}`);
            storageResult = {
              storageKey: existingExact.filename,
              publicUrl: existingExact.url,
            };
          } else {
            // Save new unique image to Cloudflare R2
            try {
              const entryName = entry.entryName;
              const folderParts = entryName.split('/').filter(Boolean);
              const folderPath = folderParts.length > 1 ? folderParts.slice(0, -1).join('/') : '';
              const sanitizedName = jobItem.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
              const storageKey = `public/zip/${folderPath ? folderPath + '/' : ''}${Date.now()}_${sanitizedName}`;

              console.log(`[ARCHIVE TRACE 29] R2_UPLOAD_START: ${jobItem.filename}`);
              const uploadRes = await PublicMediaStorage.upload(storageKey, fileBuffer, headerCheck.mime);
              console.log(`[ARCHIVE TRACE 30] R2_UPLOAD_COMPLETE: ${jobItem.filename}`);
              storageResult = {
                storageKey: uploadRes.key,
                publicUrl: uploadRes.url,
              };
            } catch (err: any) {
              console.log(`[ARCHIVE TRACE ERROR] Stage: R2_UPLOAD, File: ${jobItem.filename}, Error: ${err.message}`);
              jobItem.status = 'ERROR';
              jobItem.error = `Erro R2: ${(err as Error).message}`;
              failedCount++;
              return;
            }
          }

          // Prepare metadata record
          const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const entryName = entry.entryName;
          const folderParts = entryName.split('/').filter(Boolean);
          const folderPath = folderParts.length > 1 ? folderParts.slice(0, -1).join('/') : '';

          const draftAsset: MediaAsset = {
            id: mediaId,
            filename: storageResult.storageKey,
            originalName: jobItem.filename,
            title: jobItem.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            url: storageResult.publicUrl,
            mimeType: headerCheck.mime,
            sizeBytes: fileBuffer.length,
            fileSize: `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
            altText: jobItem.filename,
            caption: folderPath ? `Importado do arquivo ZIP na pasta: ${folderPath}` : 'Importado via arquivo ZIP',
            tags: folderPath ? [folderPath.toLowerCase(), 'zip_import'] : ['zip_import'],
            createdAt: new Date().toISOString(),
            sha256,
            dHash,
            originalFolder: folderPath,
            originalPath: entryName,
            albumId: options.albumId,
            usageCount: 0,
            duplicateStatus: 'none',
          };

          // Duplication scan
          const allCandidates = [...existingMedia, ...createdAssets];
          let topMatch: {
            candidate: MediaAsset;
            similarityScore: number;
            classification: 'DUPLICATA_EXATA' | 'PROVAVEL_DUPLICATA' | 'POSSIVEL_DUPLICATA' | 'IMAGEM_SEMELHANTE';
          } | null = null;

          for (const candidate of allCandidates) {
            const cmp = compareMediaAssets(draftAsset, candidate);
            if (cmp.similarityScore >= 75) {
              if (!topMatch || cmp.similarityScore > topMatch.similarityScore) {
                topMatch = {
                  candidate,
                  similarityScore: cmp.similarityScore,
                  classification: cmp.classification,
                };
              }
            }
          }

          if (topMatch) {
            draftAsset.duplicateStatus = 'pending_review';
            draftAsset.duplicateMatchId = topMatch.candidate.id;
            draftAsset.similarityScore = topMatch.similarityScore;
            draftAsset.duplicateClassification = topMatch.classification;

            if (topMatch.classification === 'DUPLICATA_EXATA') exactDuplicatesCount++;
            else if (topMatch.classification === 'PROVAVEL_DUPLICATA') probableDuplicatesCount++;
            else possibleDuplicatesCount++;

            duplicateCount++;

            // Create/Update DuplicateGroup
            const existingGroupId = topMatch.candidate.duplicateGroupId;
            let duplicateGroupId = existingGroupId;

            if (!duplicateGroupId) {
              duplicateGroupId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              topMatch.candidate.duplicateGroupId = duplicateGroupId;
              topMatch.candidate.duplicateStatus = 'pending_review';
              db.updateMedia(topMatch.candidate.id, {
                duplicateGroupId,
                duplicateStatus: 'pending_review',
              }, systemUser);
            }

            draftAsset.duplicateGroupId = duplicateGroupId;

            // Combine all assets belonging to this group, ensuring unique IDs
            const groupMap = new Map<string, MediaAsset>();
            
            // Add existing group members from current scan candidates
            allCandidates.forEach(a => {
              if (a.duplicateGroupId === duplicateGroupId) {
                groupMap.set(a.id, a);
              }
            });
            
            // Explicitly add the match candidate and the new draft asset
            groupMap.set(topMatch.candidate.id, topMatch.candidate);
            groupMap.set(draftAsset.id, draftAsset);

            const groupAssets = Array.from(groupMap.values());
            const rec = generateDuplicateRecommendation(groupAssets);

            const dupGroupRecord: DuplicateGroup = {
              id: duplicateGroupId,
              groupNumber: String(db.getDuplicateGroups().length + 1).padStart(4, '0'),
              primaryMediaId: topMatch.candidate.id,
              mediaIds: groupAssets.map((a) => a.id),
              similarityScore: topMatch.similarityScore,
              classification: topMatch.classification,
              status: 'pending_review',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              recommendation: rec,
            };

            db.saveDuplicateGroup(dupGroupRecord);
            newDuplicateGroups.push(dupGroupRecord);
          }

          // Register in database
          console.log(`[ARCHIVE TRACE 31] DATABASE_REGISTER: ${draftAsset.originalName}`);
          const savedAsset = db.addMedia(draftAsset, systemUser);
          createdAssets.push(savedAsset);

          jobItem.status = topMatch ? 'DUPLICATE' : 'COMPLETED';
          jobItem.progress = 100;
          jobItem.mediaId = savedAsset.id;
          jobItem.mediaUrl = savedAsset.url;
          jobItem.isDuplicate = !!topMatch;
          jobItem.duplicateOfId = topMatch?.candidate.id;
          processedCount++;
        })
      );

      // Save real-time incremental checkpoints
      const progressPercent = Math.round(((i + batch.length) / itemsToProcess.length) * 100);
      console.log('PACKAGE_BATCH_UPLOAD_PROGRESS', { progressPercent, processedCount, failedCount, duplicateCount });

      db.updateImportJob(jobId, {
        processedItems: processedCount,
        duplicateItems: duplicateCount,
        failedItems: failedCount,
        items: job.items,
        exactDuplicatesCount,
        probableDuplicatesCount,
        possibleDuplicatesCount,
      });
    }

    // Refresh job status for final resolution
    const finalJob = db.getImportJob(jobId);
    if (finalJob && finalJob.status !== 'CANCELLED') {
      console.log('PACKAGE_BATCH_UPLOAD_COMPLETE');

      const totalDuplicates = exactDuplicatesCount + probableDuplicatesCount + possibleDuplicatesCount;
      const finalStatus = (totalDuplicates > 0) ? 'WAITING_DUPLICATE_REVIEW' : 'COMPLETED';
      const durationMs = Date.now() - workerStartTime;

      console.log(`[ARCHIVE TRACE 32] PROCESS_COMPLETE: ${job.archiveName}`);
      console.log('PACKAGE_PROCESS_COMPLETE', { durationMs, processedCount, duplicateCount });

      db.updateImportJob(jobId, {
        status: finalStatus,
        completedAt: new Date().toISOString(),
      });

      // Cleanup ZIP file on successful finish
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn(`[BackgroundWorker] Cleanup error on zip file:`, err);
      }

      // Event-based suggestions and clustering across imported assets
      if (createdAssets.length > 1) {
        clusterMediaAssetsWithGemini(createdAssets).catch(() => {});
      }

      // Record institutional Audit
      db.recordAuditLog(
        systemUser,
        'Sessão de Importação',
        'Photos',
        job.jobName,
        `Processamento finalizado do pacote ${job.archiveName}. ${processedCount} importados, ${failedCount} erros, ${duplicateCount} duplicidades.`
      );
    }
  } catch (err: any) {
    const durationMs = Date.now() - workerStartTime;
    console.log(`[ARCHIVE TRACE ERROR] Stage: BACKGROUND_WORKER, Error: ${err.message}, Elapsed: ${durationMs}ms`);
    console.error('PACKAGE_PROCESS_ERROR', {
      jobId,
      error: err.message,
      durationMs,
    });

    db.updateImportJob(jobId, {
      status: 'ERROR',
      completedAt: new Date().toISOString(),
    });
  }
}
