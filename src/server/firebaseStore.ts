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

export async function saveEntityDocumentToFirestore(
  env: 'production' | 'development',
  docId: string,
  docData: any,
  expectedRevision?: number
): Promise<number> {
  const collectionName = env === 'production' ? 'prod_app_state' : 'dev_app_state';
  const docRef = firestore.collection(collectionName).doc(docId);

  return await firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    let newRev = 1;
    if (snap.exists) {
      const currentData = snap.data();
      const currentRev = (currentData && currentData._revision) || 0;
      if (expectedRevision !== undefined && currentRev > expectedRevision) {
        throw new Error(`[STALE_STATE_OVERWRITE] Blocked stale write to document "${docId}": current revision ${currentRev} is newer than expected ${expectedRevision}`);
      }
      newRev = currentRev + 1;
    }

    const payload = {
      ...docData,
      _revision: newRev,
      updatedAt: new Date().toISOString(),
    };

    transaction.set(docRef, payload);
    return newRev;
  });
}

/**
 * Loads entire application persistent state from Firestore by environment namespace.
 * Namespace ensures strict isolation between Production ('prod_app_state') and Development ('dev_app_state').
 */
export async function loadAppStateFromFirestore(env: 'production' | 'development'): Promise<any | null> {
  const collectionName = env === 'production' ? 'prod_app_state' : 'dev_app_state';
  console.log(`[FirebaseStore] Loading state from external persistent collection: "${collectionName}"...`);
  
  try {
    const colRef = firestore.collection(collectionName);
    const snapshot = await colRef.get();

    if (snapshot.empty) {
      console.log(`[FirebaseStore] Collection "${collectionName}" is empty in Firestore.`);
      return null;
    }

    const state: any = { _revisions: {} };
    snapshot.forEach((doc) => {
      const docData = doc.data();
      if (docData._revision) {
        state._revisions[doc.id] = docData._revision;
      }
      Object.assign(state, docData);
    });

    console.log(`[FirebaseStore] Successfully loaded persistent state from "${collectionName}".`);
    return state;
  } catch (err: any) {
    console.error(`[FirebaseStore] Error loading state from "${collectionName}":`, err.message || err);
    throw err;
  }
}

/**
 * Saves application state to external Firestore by environment namespace.
 */
export async function saveAppStateToFirestore(env: 'production' | 'development', state: any): Promise<void> {
  const collectionName = env === 'production' ? 'prod_app_state' : 'dev_app_state';
  console.log(`[FirebaseStore] Persisting state to external collection: "${collectionName}"...`);

  try {
    const colRef = firestore.collection(collectionName);
    const batch = firestore.batch();

    // 1. Core Settings & Rules
    batch.set(colRef.doc('core'), {
      settings: state.settings || {},
      maintenanceSettings: state.maintenanceSettings || {},
      countryDocumentRules: state.countryDocumentRules || [],
      assistantSettings: state.assistantSettings || {},
      updatedAt: new Date().toISOString()
    });

    // 2. Ambassadors
    batch.set(colRef.doc('ambassadors'), {
      ambassadors: state.ambassadors || [],
      updatedAt: new Date().toISOString()
    });

    // 3. Stories
    batch.set(colRef.doc('stories'), {
      stories: state.stories || [],
      updatedAt: new Date().toISOString()
    });

    // 4. Programs
    batch.set(colRef.doc('programs'), {
      programs: state.programs || [],
      updatedAt: new Date().toISOString()
    });

    // 5. Media & Albums
    batch.set(colRef.doc('media'), {
      media: state.media || [],
      albums: state.albums || [],
      duplicateGroups: state.duplicateGroups || [],
      namingConfig: state.namingConfig || null,
      updatedAt: new Date().toISOString()
    });

    // 6. Tasks
    batch.set(colRef.doc('tasks'), {
      tasks: state.tasks || [],
      taskWorkspaces: state.taskWorkspaces || [],
      taskWorkflows: state.taskWorkflows || [],
      taskWorkflowStages: state.taskWorkflowStages || [],
      taskDependencies: state.taskDependencies || [],
      taskTicketCounter: state.taskTicketCounter || 0,
      updatedAt: new Date().toISOString()
    });

    // 7. Users & Invites
    batch.set(colRef.doc('users'), {
      users: state.users || [],
      invites: state.invites || [],
      updatedAt: new Date().toISOString()
    });

    // 8. Donations
    batch.set(colRef.doc('donations'), {
      donations: state.donations || [],
      paymentEvents: state.paymentEvents || [],
      updatedAt: new Date().toISOString()
    });

    // 9. Audit & Comms
    batch.set(colRef.doc('audit'), {
      auditLogs: state.auditLogs || [],
      newsletterSubscribers: state.newsletterSubscribers || [],
      contactMessages: state.contactMessages || [],
      contactRequests: state.contactRequests || [],
      assistantFaqs: state.assistantFaqs || [],
      assistantFeedbacks: state.assistantFeedbacks || [],
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    console.log(`[FirebaseStore] Successfully persisted state to "${collectionName}".`);
  } catch (err: any) {
    console.error(`[FirebaseStore] Error persisting state to "${collectionName}":`, err.message || err);
    throw err;
  }
}

