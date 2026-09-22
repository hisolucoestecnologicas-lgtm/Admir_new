import { Firestore } from '@google-cloud/firestore';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

(global as any).__startup_timers = (global as any).__startup_timers || {};
(global as any).__startup_timers.firebaseStoreInitStart = performance.now();

// Load project configurations
let projectId = 'second-course-v3skh';
let databaseId = 'ai-studio-remixremixadmira-f0c0c025-03d6-4da1-8bec-59fc4e7728cb';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) projectId = config.projectId;
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn('[FirebaseStore] Failed to load config from JSON, using defaults:', e);
}

console.log(`[FirebaseStore] Initializing Firestore for Project: ${projectId}, Database: ${databaseId}`);

const firestore = new Firestore({
  projectId,
  databaseId,
});

(global as any).__startup_timers.firebaseStoreInitEnd = performance.now();

const CHUNK_SIZE = 500 * 1024; // 500 KB per chunk (safe under 1 MB limit)

export async function savePrivateDocumentToFirestore(
  ambassadorId: string,
  docId: string,
  base64Data: string
): Promise<void> {
  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  const totalLength = cleanBase64.length;
  const numChunks = Math.ceil(totalLength / CHUNK_SIZE);

  console.log(`[FirebaseStore] Saving document ${docId} for ${ambassadorId} in ${numChunks} chunks...`);

  // Write metadata document
  const docRef = firestore.collection('private_documents').doc(docId);
  await docRef.set({
    docId,
    ambassadorId,
    totalChunks: numChunks,
    totalLength,
    uploadedAt: new Date().toISOString(),
  });

  // Write chunks in parallel or batch
  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalLength);
    const chunkData = cleanBase64.slice(start, end);

    await docRef.collection('chunks').doc(`chunk_${i}`).set({
      index: i,
      data: chunkData,
    });
  }

  console.log(`[FirebaseStore] Document ${docId} successfully saved to Firestore.`);
}

export async function getPrivateDocumentFromFirestore(docId: string): Promise<string> {
  console.log(`[FirebaseStore] Fetching document ${docId} from Firestore...`);
  const docRef = firestore.collection('private_documents').doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error('Document metadata not found in Firestore.');
  }

  const meta = docSnap.data();
  const numChunks = meta?.totalChunks || 0;

  if (numChunks === 0) {
    return '';
  }

  const chunks: string[] = new Array(numChunks);

  // Load all chunks
  for (let i = 0; i < numChunks; i++) {
    const chunkSnap = await docRef.collection('chunks').doc(`chunk_${i}`).get();
    if (!chunkSnap.exists) {
      throw new Error(`Document chunk ${i} not found in Firestore.`);
    }
    chunks[i] = chunkSnap.data()?.data || '';
  }

  console.log(`[FirebaseStore] Reassembled ${numChunks} chunks for document ${docId}.`);
  return chunks.join('');
}

export async function deletePrivateDocumentFromFirestore(docId: string): Promise<void> {
  console.log(`[FirebaseStore] Deleting document ${docId} from Firestore...`);
  const docRef = firestore.collection('private_documents').doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.log(`[FirebaseStore] Document ${docId} not found, skipping Firestore deletion.`);
    return;
  }

  const meta = docSnap.data();
  const numChunks = meta?.totalChunks || 0;

  // Delete chunks
  for (let i = 0; i < numChunks; i++) {
    await docRef.collection('chunks').doc(`chunk_${i}`).delete();
  }

  // Delete metadata doc
  await docRef.delete();
  console.log(`[FirebaseStore] Document ${docId} successfully removed from Firestore.`);
}
