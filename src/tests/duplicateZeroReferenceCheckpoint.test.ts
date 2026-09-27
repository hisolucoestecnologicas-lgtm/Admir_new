import http from 'http';
import express from 'express';
import { apiRouter } from '../server/routes';
import { db } from '../server/db';
import { User, MediaAsset } from '../types';

async function runCheckpoint() {
  console.log('===============================================================');
  console.log('ADMIR — BIBLIOTECA DE MÍDIA — CHECKPOINT CONSOLIDAÇÃO ZERO REFERÊNCIAS');
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

  // Spin up test server
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api', apiRouter);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // --- 1. BASELINE REGISTRATION ---
    console.log('--- 1. REGISTRO DE BASELINE ---');
    const initialAmbassadors = db.getAmbassadors(false).length;
    const initialRules = db.getCountryDocumentRules().length;
    const initialMedia = db.getMedia(false).length;
    const initialTrashedMedia = db.getTrashedMedia().length;
    const initialDuplicateGroups = db.getDuplicateGroups().length;
    const initialAuditLogs = db.getAuditLogs().length;

    console.log(`  • Embaixadores Iniciais: ${initialAmbassadors}`);
    console.log(`  • Regras Documentais Iniciais: ${initialRules}`);
    console.log(`  • Mídias Ativas Iniciais: ${initialMedia}`);
    console.log(`  • Mídias na Lixeira Iniciais: ${initialTrashedMedia}`);
    console.log(`  • Grupos de Duplicidade Iniciais: ${initialDuplicateGroups}`);
    console.log(`  • Logs de Auditoria Iniciais: ${initialAuditLogs}`);

    assert(initialRules === 13, 'Baseline: 13 regras documentais existentes preservadas');
    assert(initialAmbassadors >= 100, 'Baseline: Embaixadores carregados corretamente');

    // Setup Test Admin Token & Unauthorized Token
    const authorizedAdmin: User = {
      id: 'usr-admin-test',
      email: 'admin.test@admir.org',
      name: 'Admin Teste',
      role: 'manager',
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: {
        'media.view': true,
        'media.delete_duplicates': true,
        'media.review_duplicates': true,
      } as any,
    };

    const restrictedUser: User = {
      id: 'usr-restricted-test',
      email: 'viewer.test@admir.org',
      name: 'Viewer Teste',
      role: 'viewer',
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: {
        'media.view': true,
        'media.delete_duplicates': false,
        'media.review_duplicates': false,
      } as any,
    };

    // Register in DB users
    (db as any).data.users.push(authorizedAdmin, restrictedUser);

    const adminToken = authorizedAdmin.id;
    const restrictedToken = restrictedUser.id;

    // --- 2. RBAC NEGATIVE TESTS ---
    console.log('\n--- 2. RBAC NEGATIVO (media.delete_duplicates) ---');
    const rbacRes = await fetch(`${baseUrl}/api/media/consolidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restrictedToken}`,
      },
      body: JSON.stringify({ masterMediaId: 'm1', targetMediaIds: ['m2'] }),
    });
    assert(rbacRes.status === 403, `POST /api/media/consolidate retorna 403 sem permissão (Status: ${rbacRes.status})`);

    const rbacDryRunRes = await fetch(`${baseUrl}/api/media/consolidate-dry-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restrictedToken}`,
      },
      body: JSON.stringify({ masterMediaId: 'm1', targetMediaIds: ['m2'] }),
    });
    assert(rbacDryRunRes.status === 403, `POST /api/media/consolidate-dry-run retorna 403 sem permissão (Status: ${rbacDryRunRes.status})`);

    // --- 3. DRY RUN & USAGE DETECTION TEST ---
    console.log('\n--- 3. TESTE DE DRY RUN E DETECÇÃO DE USOS ---');
    const ts = Date.now();
    const originalSettingsHeroBg = db.getSettings().heroBgImage;
    const originalAmbassadorPhoto = db.getAmbassadors(false)[0]?.photo;

    const testMasterA: MediaAsset = {
      id: `test_media_a_${ts}`,
      filename: `test-master-a-${ts}.webp`,
      originalName: `test-master-a-${ts}.webp`,
      url: `https://cdn.admir.org/media/test-master-a-${ts}.webp`,
      thumbUrl: `https://cdn.admir.org/media/test-master-a-${ts}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 80000,
      fileSize: '80 KB',
      dimensions: '1920x1080',
      title: 'Foto Mestre A',
      altText: 'Foto Mestre A',
      caption: '',
      tags: ['institucional'],
      category: 'INSTITUCIONAL',
      createdAt: new Date().toISOString(),
      sha256: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const testTargetB: MediaAsset = {
      id: `test_media_b_${ts}`,
      filename: `test-redundant-b-${ts}.webp`,
      originalName: `test-redundant-b-${ts}.webp`,
      url: `https://cdn.admir.org/media/test-redundant-b-${ts}.webp`,
      thumbUrl: `https://cdn.admir.org/media/test-redundant-b-${ts}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 80000,
      fileSize: '80 KB',
      dimensions: '1920x1080',
      title: 'Foto Redundante B',
      altText: 'Foto Redundante B',
      caption: '',
      tags: ['institucional'],
      category: 'INSTITUCIONAL',
      createdAt: new Date().toISOString(),
      sha256: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
    };

    // Inject assets
    (db as any).data.media.unshift(testMasterA, testTargetB);
    
    // Put Master A in Settings Hero
    (db as any).data.settings.heroBgImage = testMasterA.url;
    // Put Target B in Ambassador Photo
    const amb0 = (db as any).data.ambassadors[0];
    amb0.photo = testTargetB.url;
    (db as any).save();

    // Verify initial usages
    const usagesA = db.getMediaUsageLocations(testMasterA);
    const usagesB = db.getMediaUsageLocations(testTargetB);
    assert(usagesA.length > 0, `Mídia Mestre A possui uso ativo registrado (Total: ${usagesA.length})`);
    assert(usagesB.length > 0, `Mídia Redundante B possui uso ativo registrado (Total: ${usagesB.length})`);

    // Dry Run Test via API
    const dryRunRes = await fetch(`${baseUrl}/api/media/consolidate-dry-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ masterMediaId: testMasterA.id, targetMediaIds: [testTargetB.id] }),
    });
    assert(dryRunRes.status === 200, `Dry run via API retorna HTTP 200 (Status: ${dryRunRes.status})`);
    const dryRunData = await dryRunRes.json();
    assert(dryRunData.totalChanges >= 1, `Dry run identifica ${dryRunData.totalChanges} referências a serem migradas`);

    // --- 4. CONTROLLED CONSOLIDATION B -> A (ZERO REFERENCES GATE) ---
    console.log('\n--- 4. CONSOLIDAÇÃO B -> A E ZERO-REFERENCE GATE ---');
    const consolidateRes = await fetch(`${baseUrl}/api/media/consolidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ masterMediaId: testMasterA.id, targetMediaIds: [testTargetB.id] }),
    });
    assert(consolidateRes.status === 200, `Consolidação via API retorna HTTP 200 (Status: ${consolidateRes.status})`);
    const consolidateData = await consolidateRes.json();
    assert(consolidateData.success === true, 'Consolidação reportou sucesso total');
    assert(consolidateData.updatedReferencesCount >= 1, `Migração de referências contabilizada (${consolidateData.updatedReferencesCount} referências migradas)`);

    // Verify State After Consolidation:
    // 1. Settings still points to Master A
    assert((db as any).data.settings.heroBgImage === testMasterA.url, 'Uso original do Mestre A no Hero permanece intacto');
    // 2. Ambassador photo now points to Master A
    assert(amb0.photo === testMasterA.url, 'Uso prévio da Redundância B agora aponta para Mestre A');
    // 3. Redundant B has ZERO remaining active references
    const remainingBUsages = db.getMediaUsageLocations(testTargetB);
    assert(remainingBUsages.length === 0, `Mídia B possui exatamente ZERO referências ativas (Obtido: ${remainingBUsages.length})`);
    // 4. Redundant B is SOFT-DELETED
    const freshB = (db as any).data.media.find((m: any) => m.id === testTargetB.id);
    assert(freshB?.isDeleted === true, 'Mídia Redundante B foi movida para a Lixeira (isDeleted: true)');
    assert(!!freshB?.deletedAt, 'deletedAt registrado na Mídia B');
    // 5. Master A remains ACTIVE
    const freshA = (db as any).data.media.find((m: any) => m.id === testMasterA.id);
    assert(freshA?.isDeleted === false, 'Mídia Mestre A permanece ATIVA (isDeleted: false)');

    // --- 5. NEGATIVE SAFETY GATE: PREVENT SOFT DELETE IF REFERENCES REMAIN ---
    console.log('\n--- 5. NEGATIVE SAFETY GATE (SE REFERÊNCIAS PERSISTIREM, NÃO DELETAR) ---');
    const testMasterC: MediaAsset = {
      id: `test_media_c_${ts}`,
      filename: `test-master-c-${ts}.webp`,
      originalName: `test-master-c-${ts}.webp`,
      url: `https://cdn.admir.org/media/test-master-c-${ts}.webp`,
      thumbUrl: `https://cdn.admir.org/media/test-master-c-${ts}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 50000,
      fileSize: '50 KB',
      dimensions: '800x600',
      title: 'Mestre C',
      altText: 'Mestre C',
      caption: '',
      tags: ['institucional'],
      category: 'INSTITUCIONAL',
      createdAt: new Date().toISOString(),
    };

    const testTargetD: MediaAsset = {
      id: `test_media_d_${ts}`,
      filename: `test-target-d-${ts}.webp`,
      originalName: `test-target-d-${ts}.webp`,
      url: `https://cdn.admir.org/media/test-target-d-${ts}.webp`,
      thumbUrl: `https://cdn.admir.org/media/test-target-d-${ts}.webp`,
      mimeType: 'image/webp',
      sizeBytes: 50000,
      fileSize: '50 KB',
      dimensions: '800x600',
      title: 'Alvo D com referência bloqueada',
      altText: 'Alvo D',
      caption: '',
      tags: ['institucional'],
      category: 'INSTITUCIONAL',
      createdAt: new Date().toISOString(),
    };

    (db as any).data.media.unshift(testMasterC, testTargetD);
    // Bind target D to a story
    if ((db as any).data.stories.length > 0) {
      (db as any).data.stories[0].featuredPhoto = testTargetD.url;
    }
    (db as any).save();

    // Mock an artificial blocker where target D is still in use after a failed/partial replace
    // We test consolidateMedia logic when remainingLocations > 0
    const originalReplaceMediaReferences = db.replaceMediaReferences;
    // Temporarily stub replaceMediaReferences to simulate migration failure:
    (db as any).replaceMediaReferences = () => 0; // Does not replace references

    const blockedConsolidation = db.consolidateMedia(testMasterC.id, [testTargetD.id], authorizedAdmin);
    assert(blockedConsolidation.success === false, 'Consolidação com referências remanescentes NÃO reporta sucesso');
    assert(
      Boolean(blockedConsolidation.warnings?.some((w) => w.includes('Consolidação incompleta'))),
      'Alerta de "Consolidação incompleta" gerado adequadamente'
    );
    const freshD = (db as any).data.media.find((m: any) => m.id === testTargetD.id);
    assert(freshD?.isDeleted !== true, 'Mídia D NÃO foi enviada para a Lixeira devido ao Zero-Reference Gate (isDeleted !== true)');

    // Restore original function
    db.replaceMediaReferences = originalReplaceMediaReferences;

    // --- 6. CHECK DELETE SAFETY ENDPOINT TEST ---
    console.log('\n--- 6. TESTE DO ENDPOINT /api/media/check-delete-safety ---');
    const safetyRes = await fetch(`${baseUrl}/api/media/check-delete-safety`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ mediaIds: [testMasterA.id, testMasterC.id] }),
    });
    assert(safetyRes.status === 200, `POST /api/media/check-delete-safety retorna HTTP 200 (Status: ${safetyRes.status})`);
    const safetyData = await safetyRes.json();
    assert(safetyData.usedCount >= 1, `Mídias em uso identificadas corretamente (${safetyData.usedCount} em uso)`);
    assert(safetyData.blockedItems.some((b: any) => b.id === testMasterA.id), 'Mestre A em uso está listado como bloqueado para exclusão direta');

    // --- 7. AUDIT LOG VALIDATION ---
    console.log('\n--- 7. AUDITORIA DA CONSOLIDAÇÃO ---');
    const recentLogs = db.getAuditLogs().slice(0, 5);
    const consolidationLog = recentLogs.find((l) => (l.action as string) === 'Consolidação de Mídia' || l.details?.includes('Consolidação'));
    assert(!!consolidationLog, 'Registro de auditoria para "Consolidação de Mídia" gravado com sucesso');
    assert(consolidationLog?.module === 'Photos', 'Módulo da auditoria classificado como "Photos"');

    // --- 8. CLEANUP & BASELINE INTEGRITY CHECK ---
    console.log('\n--- 8. CLEANUP DE RESÍDUOS DE TESTE ---');
    // Restore original settings & ambassador photo
    (db as any).data.settings.heroBgImage = originalSettingsHeroBg;
    if (amb0) amb0.photo = originalAmbassadorPhoto;
    if ((db as any).data.stories.length > 0) {
      (db as any).data.stories[0].featuredPhoto = 'https://picsum.photos/id/1018/800/600';
    }

    // Remove test media assets and test users
    const testIds = [testMasterA.id, testTargetB.id, testMasterC.id, testTargetD.id];
    (db as any).data.media = (db as any).data.media.filter((m: any) => !testIds.includes(m.id));
    (db as any).data.users = (db as any).data.users.filter((u: any) => u.id !== authorizedAdmin.id && u.id !== restrictedUser.id);
    if ((db as any).data.duplicateGroups) {
      (db as any).data.duplicateGroups = (db as any).data.duplicateGroups.filter(
        (g: any) => !g.mediaIds.some((id: string) => testIds.includes(id))
      );
    }
    (db as any).save();

    // Verify baseline
    const finalAmbassadors = db.getAmbassadors(false).length;
    const finalRules = db.getCountryDocumentRules().length;
    const finalMedia = db.getMedia(false).length;

    console.log('--- COMPARAÇÃO DE BASELINE PÓS-CLEANUP ---');
    console.log(`  • Embaixadores: Antes = ${initialAmbassadors}, Depois = ${finalAmbassadors}`);
    console.log(`  • Regras Documentais: Antes = ${initialRules}, Depois = ${finalRules}`);
    console.log(`  • Mídias Ativas: Antes = ${initialMedia}, Depois = ${finalMedia}`);

    assert(finalAmbassadors === initialAmbassadors, `Baseline de Embaixadores preservado (${finalAmbassadors} = ${initialAmbassadors})`);
    assert(finalRules === initialRules, `Baseline de 13 regras documentais preservado (${finalRules} = ${initialRules})`);
    assert(finalMedia === initialMedia, `Baseline de Mídias Ativas preservado (${finalMedia} = ${initialMedia})`);

    console.log('\n===============================================================');
    console.log(`TOTAL DE TESTES DE CONSOLIDAÇÃO EXECUTADOS: ${passed + failed}`);
    console.log(`PASSARAM: ${passed}`);
    console.log(`FALHARAM: ${failed}`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runCheckpoint().catch((err) => {
  console.error('Fatal checkpoint error:', err);
  process.exit(1);
});
