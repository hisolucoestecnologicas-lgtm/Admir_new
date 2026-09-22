import { performance } from 'perf_hooks';
console.log(`[ADMIR STARTUP] PROCESS START - Timestamp: ${new Date().toISOString()} - 0 ms`);
(global as any).__startup_timers = (global as any).__startup_timers || {
  processStart: 0,
};

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes';

async function startServer() {
  (global as any).__startup_timers.startServerStart = performance.now();
  const app = express();
  const PORT = 3000;

  // Mount API router FIRST before frontend
  app.use('/api', apiRouter);
  (global as any).__startup_timers.routesReady = performance.now();

  // Serve public static assets (media, documents, icons)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  (global as any).__startup_timers.middlewareReady = performance.now();

  (global as any).__startup_timers.listenCall = performance.now();
  app.listen(PORT, '0.0.0.0', () => {
    (global as any).__startup_timers.listenCallback = performance.now();
    console.log(`[ADMIR Server] Running on http://0.0.0.0:${PORT}`);

    const timers = (global as any).__startup_timers;
    const procToDbStart = (timers.dbInitStart || 0).toFixed(2);
    const dbLoadTime = ((timers.loadDatabaseEnd || 0) - (timers.loadDatabaseStart || 0)).toFixed(2);
    const firestoreTime = ((timers.firebaseStoreInitEnd || 0) - (timers.firebaseStoreInitStart || 0)).toFixed(2);
    const listenCallTime = (timers.listenCall || 0).toFixed(2);
    const listenCallbackTime = (timers.listenCallback || 0).toFixed(2);
    const totalTime = (timers.listenCallback || 0).toFixed(2);

    console.log(`
PROCESS → DB START:
${procToDbStart} ms

DB loadDatabase:
${dbLoadTime} ms

FIRESTORE INIT:
${firestoreTime} ms

startServer:
${((timers.routesReady || 0) - (timers.startServerStart || 0)).toFixed(2)} ms

MIDDLEWARE:
${((timers.middlewareReady || 0) - (timers.routesReady || 0)).toFixed(2)} ms

LISTEN CALL:
${listenCallTime} ms desde process start

LISTEN CALLBACK:
${listenCallbackTime} ms desde process start

TOTAL ATÉ PORTA ABERTA:
${totalTime} ms
    `);

    console.log(`
=== STARTUP PERFORMANCE MEASUREMENT ===

PROCESS START:
0 ms

DATABASE INIT START:
${(timers.dbInitStart || 0).toFixed(2)} ms

DATABASE INIT END:
${(timers.dbInitEnd || 0).toFixed(2)} ms

DATABASE TOTAL:
${((timers.dbInitEnd || 0) - (timers.dbInitStart || 0)).toFixed(2)} ms

FIRESTORE INIT START:
${(timers.firebaseStoreInitStart || 0).toFixed(2)} ms

FIRESTORE INIT END:
${(timers.firebaseStoreInitEnd || 0).toFixed(2)} ms

FIRESTORE TOTAL:
${((timers.firebaseStoreInitEnd || 0) - (timers.firebaseStoreInitStart || 0)).toFixed(2)} ms

STARTSERVER:
${(timers.startServerStart || 0).toFixed(2)} ms

ROUTES READY:
${(timers.routesReady || 0).toFixed(2)} ms

LISTEN CALL:
${(timers.listenCall || 0).toFixed(2)} ms

LISTEN CALLBACK:
${(timers.listenCallback || 0).toFixed(2)} ms

TOTAL UNTIL LISTEN:
${(timers.listenCall || 0).toFixed(2)} ms
    `);
  });
}

startServer();
