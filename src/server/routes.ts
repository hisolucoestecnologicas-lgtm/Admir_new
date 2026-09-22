import express, { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { db, RequestMetadata } from './db';
import { PublicMediaStorage } from './storage';
import { PrivateDocumentStorage } from './privateStorage';
import { GranularPermissions, User } from '../types';
import { defaultAIProvider } from './aiProvider';
import { communicationChannels } from './communicationChannels';
import { syncService } from './syncService';
import {
  savePrivateDocumentToFirestore,
  getPrivateDocumentFromFirestore,
  deletePrivateDocumentFromFirestore,
} from './firebaseStore';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '20mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-memory rate limiting map for Assistant Chat (Max 15 requests per 5 minutes per IP)
const assistantRateLimitMap = new Map<string, number[]>();

function checkAssistantRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 15;

  let timestamps = assistantRateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (timestamps.length >= maxRequests) {
    return false;
  }

  timestamps.push(now);
  assistantRateLimitMap.set(ip, timestamps);
  return true;
}

// Helper to extract request metadata
function getReqMeta(req: Request): RequestMetadata {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown Client',
  };
}

// Session resolution & RBAC Middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

function resolveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const userIdHeader = req.headers['x-user-id'] as string;

  let userId: string | null = null;

  if (userIdHeader) {
    userId = userIdHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.replace('Bearer ', '').trim();
  }

  if (userId) {
    const user = db.getUserById(userId);
    if (user && user.status === 'active') {
      req.user = user;
    }
  }

  next();
}

apiRouter.use(resolveUser);

// Require authenticated user
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado. Por favor, faça login.' });
  }
  next();
}

// Require specific granular permission
function requirePermission(permKey: keyof GranularPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    // Owner has absolute bypass
    if (req.user.role === 'owner') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions[permKey]) {
      return res.status(403).json({
        error: `Acesso negado: permissão '${permKey}' obrigatória para esta operação.`,
      });
    }

    next();
  };
}

/* =========================================================================
   PUBLIC ENDPOINTS
========================================================================= */

// Health
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', institution: 'ADMIR', timestamp: new Date().toISOString() });
});

// Site Settings
apiRouter.get('/settings', (req, res) => {
  res.json(db.getSettings());
});

// Public Maintenance Status
apiRouter.get('/maintenance/status', (req, res) => {
  const current = db.getMaintenanceSettings();
  res.json({
    global: current.global,
    pages: current.pages,
    updatedAt: current.updatedAt,
  });
});

// Public Programs
apiRouter.get('/programs', (req, res) => {
  const includeAll = req.query.all === 'true';
  res.json(db.getPrograms(includeAll));
});

apiRouter.get('/programs/:slugOrId', (req, res) => {
  const item = db.getProgramBySlug(req.params.slugOrId) || db.getProgramById(req.params.slugOrId);
  if (!item) return res.status(404).json({ error: 'Program not found' });
  res.json(item);
});

// Public Stories
apiRouter.get('/stories', (req, res) => {
  const includeDrafts = req.query.drafts === 'true';
  res.json(db.getStories(includeDrafts));
});

apiRouter.get('/stories/:slugOrId', (req, res) => {
  const item = db.getStoryBySlug(req.params.slugOrId) || db.getStoryById(req.params.slugOrId);
  if (!item) return res.status(404).json({ error: 'Story not found' });
  res.json(item);
});

// Public Ambassadors (Returns published profiles with public fields only)
apiRouter.get('/ambassadors', (req, res) => {
  res.json(db.getAmbassadors(false));
});

apiRouter.get('/ambassadors/:id', (req, res) => {
  const item = db.getAmbassadorById(req.params.id, true);
  if (!item) return res.status(404).json({ error: 'Embaixador não encontrado ou perfil não publicado' });
  res.json(item);
});

// Candidate External Onboarding (Token Protected)
apiRouter.get('/ambassador-onboarding/:token', (req, res) => {
  const candidate = db.getAmbassadorByOnboardingToken(req.params.token);
  if (!candidate) {
    return res.status(404).json({ error: 'Link de onboarding inválido, expirado ou revogado pela administração.' });
  }

  // Return token-scoped candidate data safely (without other candidate/admin data)
  res.json({
    id: candidate.id,
    fullName: candidate.fullName,
    passportNumber: candidate.passportNumber || '',
    cpf: candidate.cpf || '',
    rgDni: candidate.rgDni || '',
    birthDate: candidate.birthDate || '',
    bloodType: candidate.bloodType || '',
    fatherName: candidate.fatherName || '',
    motherName: candidate.motherName || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    profession: candidate.profession || '',
    address: candidate.address || '',
    curriculumSummary: candidate.curriculumSummary || '',
    photo: candidate.photo || '',
    onboardingStatus: candidate.onboardingStatus,
    completionPercentage: candidate.completionPercentage,
    pendingItems: candidate.pendingItems,
    documents: (candidate.documents || []).map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      originalName: d.originalName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadDate: d.uploadDate,
    })),
  });
});

apiRouter.put('/ambassador-onboarding/:token', (req, res) => {
  try {
    const { submitForAnalysis, ...updates } = req.body;
    const updated = db.updateAmbassadorByToken(req.params.token, updates, Boolean(submitForAnalysis));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao atualizar cadastro via token de onboarding' });
  }
});

apiRouter.post('/ambassador-onboarding/:token/upload', async (req, res) => {
  try {
    const candidate = db.getAmbassadorByOnboardingToken(req.params.token);
    if (!candidate) {
      return res.status(404).json({ error: 'Link de onboarding inválido ou expirado.' });
    }

    const { type, fileName, fileData, mimeType, fileSize } = req.body;
    if (!fileData || !type) {
      return res.status(400).json({ error: 'Arquivo e tipo de documento são obrigatórios.' });
    }

    const privateDir = path.join(process.cwd(), 'data', 'private_documents', candidate.id);
    if (!fs.existsSync(privateDir)) {
      fs.mkdirSync(privateDir, { recursive: true });
    }

    const safeName = `${Date.now()}-${(fileName || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(privateDir, safeName);

    // Save base64 file data
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const newDoc = db.addPrivateDocumentToAmbassador(candidate.id, {
      type: type || 'other',
      fileName: safeName,
      originalName: fileName || 'documento',
      fileSize: fileSize || Buffer.byteLength(base64Data, 'base64'),
      mimeType: mimeType || 'application/octet-stream',
      path: filePath,
    });

    // Save persistently to Firestore
    try {
      await savePrivateDocumentToFirestore(candidate.id, newDoc.id, fileData);
    } catch (fsErr: any) {
      console.warn(`[OnboardingUpload] Failed to save copy to Firestore:`, fsErr);
    }

    res.status(201).json(newDoc);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha no envio de documento privado' });
  }
});

// Public Donations submission
apiRouter.post('/donations/submit', (req, res) => {
  const m = db.getMaintenanceSettings();
  if (m.global?.enabled || m.pages?.donate?.enabled) {
    return res.status(503).json({ error: 'Área de doações temporariamente em manutenção.' });
  }

  const { donorName, donorEmail, donationType, amount, currency, cause, message } = req.body;
  if (!donorName || !donorEmail || !amount) {
    return res.status(400).json({ error: 'Nome, e-mail e valor da doação são obrigatórios.' });
  }

  const donation = db.recordDonation({
    donorName,
    donorEmail,
    donationType: donationType || 'one-time',
    amount: Number(amount),
    currency: currency || 'USD',
    status: 'completed',
    cause: cause || 'General Humanitarian Fund',
    message: message || '',
  });

  res.status(201).json(donation);
});

// Public Newsletter
apiRouter.post('/newsletter/subscribe', (req, res) => {
  const { name, email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail válido obrigatório.' });
  }
  const sub = db.addNewsletterSubscriber(name || 'Global Supporter', email);
  res.status(201).json({ success: true, message: 'Inscrição confirmada na rede diplomática ADMIR.', sub });
});

// Public Contact Form
apiRouter.post('/contact/submit', (req, res) => {
  const { name, email, subject, message, organization, inquiryType } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e mensagem.' });
  }
  const msg = db.addContactMessage({
    name,
    email,
    subject: subject || 'Institutional Inquiry',
    message,
    organization,
    inquiryType: inquiryType || 'general',
    submittedAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, message: 'Mensagem enviada à Missão Diplomática com sucesso.', msg });
});

/* =========================================================================
   ASSISTENTE VIRTUAL INSTITUCIONAL & CANAIS MULTICANAL
========================================================================= */

// Public: Get public assistant settings
apiRouter.get('/assistant/settings', (req, res) => {
  const settings = db.getAssistantSettings();
  res.json({
    enabled: settings.enabled,
    displayName: settings.displayName,
    welcomeMessagePt: settings.welcomeMessagePt,
    welcomeMessageEn: settings.welcomeMessageEn,
    welcomeMessageEs: settings.welcomeMessageEs,
    allowHumanEscalation: settings.allowHumanEscalation,
    defaultChannel: settings.defaultChannel,
  });
});

// Public: Assistant Chat Endpoint
apiRouter.post('/assistant/chat', async (req: Request, res: Response) => {
  try {
    const settings = db.getAssistantSettings();
    if (!settings.enabled) {
      return res.status(503).json({
        error: 'O Assistente Virtual da ADMIR está desativado temporariamente para manutenção institucional.',
      });
    }

    const reqMeta = getReqMeta(req);
    const clientIp = reqMeta.ipAddress || '127.0.0.1';

    if (!checkAssistantRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Limite de mensagens atingido (máximo de 15 mensagens a cada 5 minutos). Aguarde alguns instantes.',
      });
    }

    const { message, language = 'pt', history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem vazia. Digite sua dúvida ou mensagem.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Mensagem excede o limite de 500 caracteres por envio.' });
    }

    const context = db.buildAssistantKnowledgeContext(message);

    const result = await defaultAIProvider.generateChatResponse({
      message: message.trim(),
      context,
      language,
      history,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Assistant Chat Error]:', err);
    res.status(500).json({
      answer: 'Ocorreu uma falha no processamento. Se desejar, posso encaminhar sua mensagem para a nossa equipe de atendimento.',
      confidence: 'unknown',
      suggestHumanSupport: true,
    });
  }
});

// Public: Escalate to Human Support
apiRouter.post('/assistant/escalate', async (req: Request, res: Response) => {
  try {
    const settings = db.getAssistantSettings();
    if (!settings.allowHumanEscalation) {
      return res.status(403).json({ error: 'Atendimento humano desativado no momento.' });
    }

    const { name, email, phone, subject, message, conversationSummary, language = 'pt', channel = 'email' } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nome, e-mail e mensagem são obrigatórios.' });
    }

    const reqMeta = getReqMeta(req);

    const contactReq = db.recordContactRequest(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        subject: subject ? subject.trim() : 'Solicitação via Assistente Virtual ADMIR',
        message: message.trim(),
        conversationSummary: conversationSummary ? conversationSummary.substring(0, 1000) : undefined,
        language,
        channel,
      },
      reqMeta
    );

    const channelHandler = communicationChannels[channel as 'email' | 'whatsapp' | 'telegram'] || communicationChannels.email;
    const sendResult = await channelHandler.sendRequest(contactReq, settings);

    if (!sendResult.success) {
      return res.json({
        success: false,
        protocol: contactReq.protocol,
        channelPending: sendResult.channelPending,
        message: sendResult.message || 'Solicitação registrada, mas o canal de envio está pendente de configuração.',
      });
    }

    res.status(201).json({
      success: true,
      protocol: contactReq.protocol,
      message: `Solicitação registrada com sucesso! Seu protocolo é ${contactReq.protocol}. Um diplomata/atendente responderá em breve.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Public: Record Chat Feedback
apiRouter.post('/assistant/feedback', (req, res) => {
  const { rating, messageText, language } = req.body;
  if (rating !== 'positive' && rating !== 'negative') {
    return res.status(400).json({ error: 'Avaliação inválida.' });
  }
  db.recordChatFeedback(rating, messageText, language);
  res.json({ success: true });
});

// Public: Get Published FAQs
apiRouter.get('/assistant/faqs', (req, res) => {
  const includeAll = req.query.all === 'true';
  let isAuthorizedForDrafts = false;

  if (includeAll) {
    resolveUser(req as AuthenticatedRequest, res, () => {});
    if (
      (req as AuthenticatedRequest).user &&
      ((req as AuthenticatedRequest).user?.permissions?.['assistant.view'] || (req as AuthenticatedRequest).user?.role === 'owner')
    ) {
      isAuthorizedForDrafts = true;
    }
  }

  const faqs = db.getAssistantFaqs(isAuthorizedForDrafts);
  res.json(faqs);
});

/* =========================================================================
   ADMIN ASSISTANT MANAGEMENT (RBAC ENFORCED)
========================================================================= */

// Admin: Get Full Settings
apiRouter.get('/admin/assistant/settings', requirePermission('assistant.view'), (req, res) => {
  res.json(db.getAssistantSettings());
});

// Admin: Update Settings
apiRouter.put('/admin/assistant/settings', requirePermission('assistant.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateAssistantSettings(req.body, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Create FAQ
apiRouter.post('/admin/assistant/faqs', requirePermission('assistant.edit'), (req: AuthenticatedRequest, res) => {
  const { questionPt, answerPt, category, status, questionEn, answerEn, questionEs, answerEs } = req.body;
  if (!questionPt || !answerPt) {
    return res.status(400).json({ error: 'Pergunta e resposta em Português são obrigatórias.' });
  }

  try {
    const created = db.createAssistantFaq(
      {
        questionPt,
        answerPt,
        questionEn,
        answerEn,
        questionEs,
        answerEs,
        category: category || 'Geral',
        status: status === 'draft' ? 'draft' : 'published',
      },
      req.user!,
      getReqMeta(req)
    );
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Update FAQ
apiRouter.put('/admin/assistant/faqs/:id', requirePermission('assistant.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateAssistantFaq(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Delete FAQ
apiRouter.delete('/admin/assistant/faqs/:id', requirePermission('assistant.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteAssistantFaq(req.params.id, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'FAQ não encontrada.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: List Contact Requests
apiRouter.get('/admin/assistant/requests', requirePermission('assistant.manage_requests'), (req, res) => {
  const { status, search } = req.query as Record<string, string>;
  const requests = db.getContactRequests(status, search);
  res.json(requests);
});

// Admin: Update Request Status & Notes
apiRouter.put('/admin/assistant/requests/:id/status', requirePermission('assistant.manage_requests'), (req: AuthenticatedRequest, res) => {
  const { status, notes } = req.body;
  if (!status || !['novo', 'em_atendimento', 'respondido', 'encerrado'].includes(status)) {
    return res.status(400).json({ error: 'Status de atendimento inválido.' });
  }

  try {
    const updated = db.updateContactRequestStatus(req.params.id, status, notes, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Analytics
apiRouter.get('/admin/assistant/analytics', requirePermission('assistant.view'), (req, res) => {
  const analytics = db.getAssistantAnalytics();
  res.json(analytics);
});

// Check invite token
apiRouter.get('/invites/check/:token', (req, res) => {
  const invites = db.getInvites();
  const inv = invites.find((i) => i.token === req.params.token && i.status === 'pending');
  if (!inv) {
    return res.status(404).json({ error: 'Convite inválido ou expirado.' });
  }
  res.json({ email: inv.email, role: inv.role, expiresAt: inv.expiresAt });
});

// Accept invite
apiRouter.post('/invites/accept', (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password || password.length < 6) {
    return res.status(400).json({ error: 'Preencha nome e senha com no mínimo 6 caracteres.' });
  }

  try {
    const newUser = db.acceptInvite(token, name, password, getReqMeta(req));
    res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Authentication: Login with Credentials
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais diplomáticas inválidas ou usuário inativo.' });
  }

  db.recordAuditLog(
    user,
    'Login',
    'Auth',
    user.email,
    'Sessão iniciada no painel administrativo ADMIR via senha',
    getReqMeta(req)
  );

  res.json({ success: true, user, token: user.id });
});

// Authentication: Login with Google via Firebase
apiRouter.post('/auth/google', (req, res) => {
  const { email, displayName, photoURL, firebaseUid } = req.body;
  if (!email || !firebaseUid) {
    return res.status(400).json({ error: 'Dados de autenticação do Google incompletos.' });
  }

  try {
    const user = db.authenticateOrRegisterGoogle(
      { email, displayName, photoURL, firebaseUid },
      getReqMeta(req)
    );

    db.recordAuditLog(
      user,
      'Login',
      'Auth',
      user.email,
      `Sessão administrativa iniciada via Google Auth (Firebase UID: ${firebaseUid})`,
      getReqMeta(req)
    );

    res.json({ success: true, user, token: user.id });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Falha ao autenticar com o Google.' });
  }
});


// Authentication: Current User
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Authentication: Logout
apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    db.recordAuditLog(req.user, 'Logout', 'Auth', req.user.email, 'Sessão encerrada pelo usuário', getReqMeta(req));
  }
  res.json({ success: true });
});

/* =========================================================================
   PROTECTED CMS ENDPOINTS (RBAC ENFORCED)
========================================================================= */

// Update Site Settings / Home texts
apiRouter.put('/settings', requirePermission('home.edit_texts'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateSettings(req.body, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Central de Manutenção (Protected CMS Endpoints)
apiRouter.get('/admin/maintenance', requirePermission('maintenance.view'), (req: AuthenticatedRequest, res) => {
  try {
    res.json(db.getMaintenanceSettings());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/maintenance', requirePermission('maintenance.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateMaintenanceSettings(req.body, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/maintenance/global', requirePermission('maintenance.toggle'), (req: AuthenticatedRequest, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'O parâmetro enabled (boolean) é obrigatório.' });
    }
    const updated = db.toggleGlobalMaintenance(enabled, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/maintenance/page/:pageKey', requirePermission('maintenance.toggle'), (req: AuthenticatedRequest, res) => {
  try {
    const { pageKey } = req.params;
    const { enabled, config } = req.body;

    if (config && typeof config === 'object') {
      const updated = db.updatePageMaintenance(pageKey, { ...config, ...(typeof enabled === 'boolean' ? { enabled } : {}) }, req.user!, getReqMeta(req));
      return res.json(updated);
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'O parâmetro enabled (boolean) ou config é obrigatório.' });
    }

    const updated = db.togglePageMaintenance(pageKey, enabled, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Programs Management
apiRouter.post('/programs', requirePermission('programs.create'), (req: AuthenticatedRequest, res) => {
  try {
    const prog = db.createProgram(req.body, req.user!, getReqMeta(req));
    res.status(201).json(prog);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/programs/:id', requirePermission('programs.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const prog = db.updateProgram(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(prog);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/programs/:id', requirePermission('programs.delete'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteProgram(req.params.id, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Program not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/programs/reorder', requirePermission('programs.reorder'), (req: AuthenticatedRequest, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });
  const list = db.reorderPrograms(orderedIds, req.user!, getReqMeta(req));
  res.json(list);
});

// News & Stories Management
apiRouter.post('/stories', requirePermission('news.create'), (req: AuthenticatedRequest, res) => {
  try {
    const story = db.createStory(req.body, req.user!, getReqMeta(req));
    res.status(201).json(story);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/stories/:id', requirePermission('news.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const story = db.updateStory(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(story);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/stories/:id/duplicate', requirePermission('news.create'), (req: AuthenticatedRequest, res) => {
  try {
    const duplicate = db.duplicateStory(req.params.id, req.user!, getReqMeta(req));
    res.status(201).json(duplicate);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/stories/:id', requirePermission('news.delete'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteStory(req.params.id, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Story not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Ambassadors Management (Protected CMS Endpoints)
apiRouter.get('/admin/ambassadors', requirePermission('ambassadors.view'), (req: AuthenticatedRequest, res) => {
  res.json(db.getAmbassadors(true));
});

apiRouter.post('/ambassadors', requirePermission('ambassadors.create'), (req: AuthenticatedRequest, res) => {
  try {
    const amb = db.createAmbassador(req.body, req.user!, getReqMeta(req));
    res.status(201).json(amb);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/ambassadors/:id', requirePermission('ambassadors.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const amb = db.updateAmbassador(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(amb);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/ambassadors/:id', requirePermission('ambassadors.delete'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteAmbassador(req.params.id, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Ambassador not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Token Management for Onboarding
apiRouter.post('/ambassadors/:id/generate-link', requirePermission('ambassadors.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const result = db.generateAmbassadorOnboardingToken(req.params.id, req.user!, getReqMeta(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/ambassadors/:id/revoke-link', requirePermission('ambassadors.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.revokeAmbassadorOnboardingToken(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Private Document Upload & Management (Admin)
apiRouter.post('/ambassadors/:id/documents', requirePermission('ambassadors.edit'), async (req: AuthenticatedRequest, res) => {
  try {
    const ambassadorId = req.params.id;
    const { type, fileName, fileData, mimeType, fileSize } = req.body;

    if (!fileData || !type) {
      return res.status(400).json({ error: 'Arquivo e tipo de documento são obrigatórios.' });
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const safeName = (fileName || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `private/ambassadors/${ambassadorId}/${docId}/${safeName}`;

    let storageProvider: 'R2_PRIVATE' | 'FILESYSTEM' = 'FILESYSTEM';
    let finalPath = '';

    if (PrivateDocumentStorage.isConfigured()) {
      try {
        await PrivateDocumentStorage.upload(storageKey, buffer, mimeType || 'application/pdf');
        storageProvider = 'R2_PRIVATE';
        finalPath = storageKey;
      } catch (err: any) {
        console.error(`[AdminDocUpload] R2 Private upload failed:`, err.message);
        // Fallback to filesystem only if explicitly allowed or in transition
        // BUT instructions say: "NÃO utilizar filesystem como fallback silencioso em PRODUÇÃO"
        // Since this is the implementation of R2_PRIVATE, we should fail if it's configured but fails.
        return res.status(500).json({ error: 'Falha no armazenamento persistente seguro (R2).' });
      }
    } else {
      // Legacy filesystem fallback if R2 is NOT configured
      const privateDir = path.join(process.cwd(), 'data', 'private_documents', ambassadorId);
      if (!fs.existsSync(privateDir)) {
        fs.mkdirSync(privateDir, { recursive: true });
      }
      const fsSafeName = `${Date.now()}-${safeName}`;
      finalPath = path.join(privateDir, fsSafeName);
      fs.writeFileSync(finalPath, buffer);
      storageProvider = 'FILESYSTEM';
    }

    const newDoc = db.addPrivateDocumentToAmbassador(ambassadorId, {
      type: type || 'other',
      fileName: storageProvider === 'R2_PRIVATE' ? safeName : path.basename(finalPath),
      originalName: fileName || 'documento',
      fileSize: fileSize || buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      path: finalPath,
      storageProvider,
      storageKey: storageProvider === 'R2_PRIVATE' ? finalPath : undefined,
    });

    // Save copy to Firestore (legacy chunks) - keep for now as requested
    try {
      await savePrivateDocumentToFirestore(ambassadorId, newDoc.id, fileData);
    } catch (fsErr: any) {
      console.warn(`[AdminDocUpload] Failed to save copy to Firestore:`, fsErr);
    }

    db.recordAuditLog(
      req.user!,
      'Upload',
      'Ambassadors',
      ambassadorId,
      `Documento privado de tipo "${type}" enviado para o embaixador ID ${ambassadorId} (Storage: ${storageProvider})`,
      getReqMeta(req)
    );

    res.status(201).json(newDoc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/ambassadors/:id/documents/:docId', requirePermission('ambassadors.edit'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id: ambId, docId } = req.params;
    const amb = db.getAmbassadorById(ambId);
    if (!amb) return res.status(404).json({ error: 'Embaixador não encontrado' });

    const doc = (amb.documents || []).find(d => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

    // 1. Delete from storage
    if (doc.storageProvider === 'R2_PRIVATE' && doc.path) {
      try {
        await PrivateDocumentStorage.delete(doc.path);
      } catch (err: any) {
        console.error(`[AdminDocDelete] Failed to delete from R2:`, err.message);
      }
    } else if (doc.path && fs.existsSync(doc.path)) {
      try {
        fs.unlinkSync(doc.path);
      } catch (err) {
        console.warn(`[AdminDocDelete] Local file delete failed:`, err);
      }
    }

    // 2. Delete from database
    const ok = db.removePrivateDocumentFromAmbassador(ambId, docId);
    if (!ok) return res.status(404).json({ error: 'Falha ao remover do banco de dados' });

    // 3. Delete from Firestore
    try {
      await deletePrivateDocumentFromFirestore(docId);
    } catch (fsErr: any) {
      console.warn(`[AdminDocDelete] Failed to delete from Firestore:`, fsErr);
    }

    db.recordAuditLog(
      req.user!,
      'Exclusão',
      'Ambassadors',
      ambId,
      `Documento privado ID ${docId} removido do embaixador (Tipo: ${doc.type})`,
      getReqMeta(req)
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Secure Private Document Download Route (Enforces Admin Auth OR Matching Candidate Token)
apiRouter.get('/ambassadors/:id/documents/:docId/download', async (req: AuthenticatedRequest, res) => {
  const { id: ambId, docId } = req.params;
  const tokenQuery = req.query.token as string;

  const amb = db.getAmbassadorById(ambId);
  if (!amb) return res.status(404).json({ error: 'Embaixador não encontrado' });

  // Security Check: Must be authenticated admin WITH ambassadors.view permission OR valid onboarding token
  let isAuthorized = false;

  // Check admin session
  resolveUser(req, res, () => {});
  if (req.user && (req.user.permissions?.['ambassadors.view'] || req.user.role === 'owner')) {
    isAuthorized = true;
  } else if (tokenQuery && amb.onboardingToken === tokenQuery && amb.tokenStatus === 'active') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Acesso negado. Documento diplomático privado reservado.' });
  }

  const doc = (amb.documents || []).find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

  // 1. Try R2 Private Storage if applicable
  if (doc.storageProvider === 'R2_PRIVATE' && doc.path) {
    try {
      const { body, contentType, contentLength } = await PrivateDocumentStorage.read(doc.path);
      res.setHeader('Content-Type', contentType || doc.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || doc.fileName)}"`);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      
      return body.pipe(res);
    } catch (err: any) {
      console.error(`[Download] R2 Private retrieval failed for ${docId}:`, err.message);
      // If R2 fails, we DON'T fallback to local if it was supposed to be in R2
      return res.status(500).json({ error: 'Erro ao recuperar documento do armazenamento seguro (R2).' });
    }
  }

  // 2. Legacy fallback: Try Firestore
  try {
    const base64Data = await getPrivateDocumentFromFirestore(docId);
    if (base64Data) {
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || doc.fileName)}"`);
      return res.send(buffer);
    }
  } catch (err: any) {
    console.warn(`[Download] Firestore retrieval failed, falling back to disk for ${docId}:`, err.message);
  }

  // 3. Legacy fallback: Local filesystem
  const filePath = doc.path && doc.path.startsWith('/') ? doc.path : path.join(process.cwd(), 'data', 'private_documents', ambId, doc.fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || doc.fileName)}"`);
    return res.sendFile(filePath);
  }

  return res.status(404).json({ error: 'Arquivo não localizado em nenhum dos armazenamentos seguros' });
});

// AI Biography Generator Route (Server-side @google/genai with strict anti-hallucination prompt)
apiRouter.post('/ambassadors/generate-bio', requirePermission('ambassadors.edit'), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, profession, experience, curriculumSummary } = req.body;
    if (!curriculumSummary && !profession && !experience) {
      return res.status(400).json({ error: 'Forneça ao menos a profissão ou resumo curricular para a IA.' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Fallback structured text generation if GEMINI_API_KEY is not set
      const summaryText = curriculumSummary || experience || '';
      const fallbackBioPt = `Profissional de elevada reputação na área de ${profession || 'suas especialidades'}. ${summaryText.substring(0, 280)}`;
      const fallbackBioEn = `Distinguished professional in the field of ${profession || 'their specialty'}. ${summaryText.substring(0, 280)}`;
      const fallbackBioEs = `Profesional con destacada trayectoria en la disciplina de ${profession || 'su especialidad'}. ${summaryText.substring(0, 280)}`;

      return res.json({
        bio_pt: fallbackBioPt,
        bio_en: fallbackBioEn,
        bio_es: fallbackBioEs,
        originalSummary: summaryText,
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Você é um redator institucional especializado da ADMIR (American Diplomatic Mission of International Relations).
Sua tarefa é elaborar uma SUGESTÃO curta e diplomática de biografia em 3 idiomas (Português, Inglês e Espanhol) para o perfil público do embaixador.

NOME DO EMBAIXADOR: ${name || 'Candidato'}
PROFISSÃO: ${profession || 'Não informada'}
RESUMO CURRICULAR / EXPERIÊNCIA:
${curriculumSummary || experience || 'Não informado'}

REGRAS ESTRITAS DE REVISÃO E FIELIDADE:
1. Baseie-se EXCLUSIVAMENTE nas informações curriculares fornecidas acima.
2. É ABSOLUTAMENTE PROIBIDO inventar cargos diplomáticos, ordens de mérito, condecorações, pós-graduações, comendas ou laços institucionais que não existam no texto original.
3. Se o candidato não possuir título prévio, refira-se ao seu histórico profissional com sobriedade.
4. Mantenha o tom sóbrio, diplomático, formal e em terceira pessoa.
5. Responda ESTRITAMENTE em formato JSON puro, sem textos adicionais, com as chaves:
{
  "bio_pt": "biografia em português...",
  "bio_en": "biography in English...",
  "bio_es": "biografía en español..."
}`;

    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash'];
    let response;
    let lastError: any;

    const isRecuperavel = (err: any) => {
      if (!err) return false;
      const status = err.status || err.statusCode || (err.error && err.error.code);
      if (status === 503 || status === 429) {
        return true;
      }
      const msg = String(err.message || err.stack || err).toLowerCase();
      return (
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('unavailable') ||
        msg.includes('overloaded') ||
        msg.includes('experiencing high demand') ||
        msg.includes('limit') ||
        msg.includes('quota') ||
        msg.includes('resource_exhausted') ||
        msg.includes('service unavailable')
      );
    };

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        if (response) {
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Suggestion Warning]: Model ${modelName} failed.`, err);
        lastError = err;

        // Stop immediately if error is unrecoverable (e.g. 400, 401, 403, missing key)
        if (!isRecuperavel(err)) {
          console.error(`[AI Suggestion Critical]: Unrecoverable error using ${modelName}. Stopping fallback loop.`);
          throw err;
        }
      }
    }

    if (!response) {
      return res.status(503).json({ 
        error: 'Serviço de IA temporariamente indisponível. Por favor, tente novamente mais tarde.' 
      });
    }

    const text = response.text || '';
    let parsed: any = {};
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      parsed = {
        bio_pt: text,
        bio_en: text,
        bio_es: text,
      };
    }

    db.recordAuditLog(
      req.user!,
      'Alteração',
      'Ambassadors',
      name || 'Candidato',
      'Sugestão de biografia diplomática gerada via IA para revisão humana',
      getReqMeta(req)
    );

    res.json({
      bio_pt: parsed.bio_pt || text,
      bio_en: parsed.bio_en || text,
      bio_es: parsed.bio_es || text,
      originalSummary: curriculumSummary || experience || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao gerar sugestão de biografia com IA' });
  }
});

// Media Library
apiRouter.get('/media', requirePermission('media.view'), (req, res) => {
  res.json(db.getMedia());
});

/**
 * Proxy route to serve R2 public media securely.
 * Note: Key can include subdirectories.
 */
apiRouter.get('/media/proxy/*', async (req, res) => {
  try {
    const key = (req.params as any)[0];
    if (!key) return res.status(400).json({ error: 'Key is required' });

    if (!PublicMediaStorage.isConfigured()) {
      return res.status(503).json({ error: 'Cloudflare R2 is not configured on this environment.' });
    }

    const { body, contentType, contentLength } = await PublicMediaStorage.read(key);
    
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Pipe the readable stream to the response
    body.pipe(res);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Arquivo não encontrado no storage persistente.' });
    }
    console.error('[R2Proxy] Error:', err);
    res.status(500).json({ error: 'Erro ao recuperar arquivo do storage persistente.' });
  }
});


apiRouter.post('/media/upload-file', requirePermission('media.upload'), async (req: AuthenticatedRequest, res) => {
  try {
    const { fileName, fileData, mimeType, title, tags } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Arquivo e nome do arquivo são obrigatórios.' });
    }

    if (!PublicMediaStorage.isConfigured()) {
      return res.status(503).json({ error: 'Cloudflare R2 não está configurado para armazenamento persistente.' });
    }

    // Determine safe file name and object key
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objectKey = `public/media/${safeName}`;
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const finalMimeType = mimeType || 'image/jpeg';

    // 1. Upload to Cloudflare R2
    const storageResult = await PublicMediaStorage.upload(objectKey, buffer, finalMimeType);

    // 2. Register in database with the proxy URL
    const asset = db.addMedia(
      {
        filename: safeName,
        originalName: fileName,
        url: storageResult.url, // e.g. /api/media/proxy/public/media/123-file.jpg
        mimeType: finalMimeType,
        sizeBytes: buffer.length,
        altText: title || 'Uploaded Public Media',
        caption: '',
        tags: Array.isArray(tags) ? tags : [],
      },
      req.user!,
      getReqMeta(req)
    );

    res.status(201).json(asset);
  } catch (err: any) {
    console.error('[MediaUpload] R2 Error:', err);
    res.status(500).json({ error: err.message || 'Falha ao fazer upload de arquivo para o storage persistente' });
  }
});


apiRouter.post('/media', requirePermission('media.upload'), (req: AuthenticatedRequest, res) => {
  const { filename, originalName, url, mimeType, sizeBytes, altText, caption, tags } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL ou arquivo é obrigatório.' });
  }

  // File size validation (limit 15MB)
  if (sizeBytes && sizeBytes > 15 * 1024 * 1024) {
    return res.status(400).json({ error: 'Arquivo excede o limite máximo permitido de 15MB.' });
  }

  const asset = db.addMedia(
    {
      filename: filename || `admir-${Date.now()}.jpg`,
      originalName: originalName || 'Uploaded Media',
      url,
      mimeType: mimeType || 'image/jpeg',
      sizeBytes: sizeBytes || 500000,
      altText: altText || '',
      caption: caption || '',
      tags: Array.isArray(tags) ? tags : [],
    },
    req.user!,
    getReqMeta(req)
  );

  res.status(201).json(asset);
});

apiRouter.put('/media/:id', requirePermission('media.edit_metadata'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateMedia(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/media/:id', requirePermission('media.delete'), async (req: AuthenticatedRequest, res) => {
  try {
    const mediaList = db.getMedia();
    const item = mediaList.find((m) => m.id === req.params.id);

    if (item) {
      // If it's an R2 file, delete from R2 as well
      if (item.url.startsWith('/api/media/proxy/')) {
        const key = item.url.replace('/api/media/proxy/', '');
        try {
          if (PublicMediaStorage.isConfigured()) {
            await PublicMediaStorage.delete(key);
          }
        } catch (storageErr) {
          console.error('[MediaDelete] Failed to delete from R2 (non-fatal):', storageErr);
        }
      } else {
        // Legacy local file cleanup (optional, but good practice if we want to reclaim space)
        // Note: The user said "NÃO migre os assets existentes", but didn't say not to delete them if requested.
        // However, standard safety says don't touch filesystem if not explicitly told.
        // But the previous implementation (in earlier turns probably) didn't even delete local files.
        // Let's stick to R2 cleanup for now.
      }
    }

    const result = db.deleteMedia(req.params.id, req.user!, getReqMeta(req));
    res.json(result);
  } catch (err: any) {
    console.error('[MediaDelete] Error:', err);
    res.status(400).json({ error: err.message });
  }
});


// Donations Panel
apiRouter.get('/donations', requirePermission('donations.view'), (req, res) => {
  const { search, period, status, type } = req.query as Record<string, string>;
  const list = db.getDonations(search, period, status, type);

  // Compute summary stats
  const totalRaised = list
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + d.amount, 0);

  const monthlyPledges = list
    .filter((d) => d.status === 'completed' && d.donationType === 'monthly')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCount = list.length;

  res.json({
    donations: list,
    stats: {
      totalRaised,
      monthlyPledges,
      donationsReceived: totalCount,
    },
  });
});

apiRouter.get('/donations/export/csv', requirePermission('donations.export'), (req, res) => {
  const donations = db.getDonations();
  const headers = ['ID', 'Data', 'Doador', 'Email', 'Tipo', 'Valor', 'Moeda', 'Status', 'Causa', 'ID Transacao'];
  const rows = donations.map((d) => [
    d.id,
    d.date,
    `"${d.donorName.replace(/"/g, '""')}"`,
    d.donorEmail,
    d.donationType,
    d.amount,
    d.currency,
    d.status,
    `"${(d.cause || '').replace(/"/g, '""')}"`,
    d.transactionId,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="admir-donations.csv"');
  res.send(csv);
});

// Donation Checkout (Stripe & PayPal)
apiRouter.post('/donations/checkout', async (req: Request, res: Response) => {
  try {
    const m = db.getMaintenanceSettings();
    if (m.global?.enabled || m.pages?.donate?.enabled) {
      return res.status(503).json({ error: 'Área de doações temporariamente em manutenção.' });
    }

    const { amount, currency = 'USD', donationType = 'one-time', donorName, donorEmail, cause = 'General Humanitarian Fund', anonymous = false, publicConsent = false, provider = 'stripe' } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid donation amount.' });
    }
    if (!donorName || !donorEmail) {
      return res.status(400).json({ error: 'Donor name and email are required.' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isLive = Boolean(stripeKey && !stripeKey.startsWith('sk_test_placeholder'));

    if (provider === 'stripe' && stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-28.acacia' as any });
      const unitAmount = Math.round(numAmount * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `ADMIR Donation - ${cause}`,
                description: `${donationType === 'monthly' ? 'Monthly Guardian Pledge' : 'One-Time Contribution'} supporting ADMIR initiatives.`,
              },
              unit_amount: unitAmount,
              ...(donationType === 'monthly' ? { recurring: { interval: 'month' } } : {}),
            },
            quantity: 1,
          },
        ],
        mode: donationType === 'monthly' ? 'subscription' : 'payment',
        customer_email: donorEmail,
        success_url: `${req.protocol}://${req.get('host')}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/donate/cancel`,
        metadata: {
          donorName,
          donorEmail,
          cause,
          anonymous: anonymous ? 'true' : 'false',
          publicConsent: publicConsent ? 'true' : 'false',
        },
      });

      db.recordDonation({
        donorName: anonymous ? 'Anonymous Donor' : donorName,
        donorEmail,
        donationType,
        amount: numAmount,
        currency,
        status: 'pending',
        cause,
        provider: 'stripe',
        providerCustomerId: session.customer as string || undefined,
        providerSubscriptionId: session.subscription as string || undefined,
        environment: isLive ? 'live' : 'test',
        anonymous,
        publicConsent,
      });

      return res.json({ url: session.url, sessionId: session.id });
    }

    // Sandbox / Test simulation mode when live keys not configured
    const donation = db.recordDonation({
      donorName: anonymous ? 'Anonymous Donor' : donorName,
      donorEmail,
      donationType,
      amount: numAmount,
      currency,
      status: 'completed',
      cause,
      provider: provider === 'paypal' ? 'paypal' : 'stripe',
      environment: 'test',
      anonymous,
      publicConsent,
    });

    res.json({
      id: donation.id,
      amount: donation.amount,
      url: `${req.protocol}://${req.get('host')}/donate/success?session_id=${donation.transactionId}`,
      transactionId: donation.transactionId,
      message: 'Donation processed in Sandbox/Test simulation mode.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe Webhook Endpoint
apiRouter.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && sig) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-28.acacia' as any });
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).send('Invalid payload');
    }
  }

  if (event.id && db.isPaymentEventProcessed(event.id)) {
    return res.json({ received: true, note: 'Already processed (Idempotent)' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const txRef = session.payment_intent as string || session.id;
    db.updateDonationStatusByTransaction(txRef, 'completed');
  } else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const txRef = invoice.payment_intent as string || invoice.id;
    db.updateDonationStatusByTransaction(txRef, 'completed');
  }

  if (event.id) {
    db.recordPaymentEvent({
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type,
      transactionReference: event.id,
      processed: true,
    });
  }

  res.json({ received: true });
});

// PayPal Webhook Endpoint
apiRouter.post('/webhooks/paypal', express.json(), async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventId = event?.id || `pp-${Date.now()}`;

    if (db.isPaymentEventProcessed(eventId)) {
      return res.json({ received: true, note: 'Already processed (Idempotent)' });
    }

    const eventType = event?.event_type;
    const resource = event?.resource;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const txRef = resource?.id || resource?.custom_id;
      if (txRef) {
        db.updateDonationStatusByTransaction(txRef, 'completed');
      }
    }

    db.recordPaymentEvent({
      provider: 'paypal',
      providerEventId: eventId,
      eventType: eventType || 'UNKNOWN',
      transactionReference: resource?.id || 'N/A',
      processed: true,
    });

    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Refund Donation (Admin)
apiRouter.post('/donations/:id/refund', requirePermission('donations.refund'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const refunded = db.refundDonation(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: true, donation: refunded });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Tasks Kanban - Workspaces/Workflows/Stages
apiRouter.get('/tasks/workspaces', requirePermission('tasks.view'), (req, res) => {
  res.json(db.getWorkspaces());
});

apiRouter.get('/tasks/workspaces/:workspaceId/workflows', requirePermission('tasks.view'), (req, res) => {
  const includeInactive = req.query.all === 'true';
  res.json(db.getWorkflows(req.params.workspaceId, includeInactive));
});

apiRouter.get('/tasks/workflows', requirePermission('tasks.view'), (req, res) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  const includeInactive = req.query.all === 'true';
  res.json(db.getWorkflows(workspaceId, includeInactive));
});

apiRouter.post('/tasks/workflows', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const workflow = db.createWorkflow(req.body, req.user!, getReqMeta(req));
    res.status(201).json(workflow);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/workflows/:id', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const workflow = db.updateWorkflow(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(workflow);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/workflows/:id', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteWorkflow(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/workflows/reorder', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const workflows = db.reorderWorkflows(req.body.orderedIds, req.user!, getReqMeta(req));
    res.json(workflows);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/tasks/workflows/:workflowId/stages', requirePermission('tasks.view'), (req, res) => {
  const includeInactive = req.query.all === 'true';
  res.json(db.getStages(req.params.workflowId, includeInactive));
});

apiRouter.post('/tasks/workflows/:workflowId/stages', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const stage = db.createStage(req.params.workflowId, req.body, req.user!, getReqMeta(req));
    res.status(201).json(stage);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/stages/:id', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const stage = db.updateStage(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(stage);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/stages/:id', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteStage(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/workflows/:workflowId/stages/reorder', requirePermission('tasks.manage_workflows'), (req: AuthenticatedRequest, res) => {
  try {
    const stages = db.reorderStages(req.params.workflowId, req.body.orderedIds, req.user!, getReqMeta(req));
    res.json(stages);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Tasks Kanban - Tasks
apiRouter.get('/tasks/eligible-users', requirePermission('tasks.view'), (req, res) => {
  const { workspaceId, workflowId, search } = req.query as Record<string, string>;
  res.json(db.getEligibleTaskUsers(workspaceId, workflowId, search));
});

apiRouter.get('/tasks/dependencies/all', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  try {
    const dependencies = db.getTaskDependencies();
    const tasks = db.getTasks();
    const blockedTaskIds = tasks.filter(t => db.isTaskBlocked(t.id).isBlocked).map(t => t.id);
    res.json({ dependencies, blockedTaskIds });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/tasks', requirePermission('tasks.view'), (req, res) => {
  const { workspaceId, workflowId } = req.query as Record<string, string>;
  res.json(db.getTasks(workspaceId, workflowId));
});

apiRouter.get('/tasks/:id', requirePermission('tasks.view'), (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }
  res.json(task);
});

apiRouter.post('/tasks', requirePermission('tasks.create'), (req: AuthenticatedRequest, res) => {
  try {
    const task = db.createTask(req.body, req.user!, getReqMeta(req));
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const task = db.updateTask(req.params.id, req.body, req.user!, getReqMeta(req));
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id', requirePermission('tasks.delete'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteTask(req.params.id, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/:id/checklist', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Título do item obrigatório.' });
  try {
    const item = db.addChecklistItem(req.params.id, title, req.user!, getReqMeta(req));
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id/checklist/:itemId', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  const { title, completed, orderIndex } = req.body;
  try {
    const item = db.updateChecklistItem(req.params.id, req.params.itemId, { title, completed, orderIndex }, req.user!, getReqMeta(req));
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/tasks/:id/checklist/:itemId', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  const { title, completed, orderIndex } = req.body;
  try {
    const item = db.updateChecklistItem(req.params.id, req.params.itemId, { title, completed, orderIndex }, req.user!, getReqMeta(req));
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id/checklist/:itemId', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteChecklistItem(req.params.id, req.params.itemId, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/:id/comments', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Conteúdo do comentário obrigatório.' });
  try {
    const comment = db.addTaskComment(req.params.id, content, req.user!, getReqMeta(req));
    res.status(201).json(comment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id/comments/:commentId', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Conteúdo do comentário obrigatório.' });
  try {
    const comment = db.updateTaskComment(req.params.id, req.params.commentId, content, req.user!, getReqMeta(req));
    res.json(comment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/tasks/:id/comments/:commentId', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Conteúdo do comentário obrigatório.' });
  try {
    const comment = db.updateTaskComment(req.params.id, req.params.commentId, content, req.user!, getReqMeta(req));
    res.json(comment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id/comments/:commentId', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteTaskComment(req.params.id, req.params.commentId, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Comentário não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Task Attachments
apiRouter.get('/tasks/:id/attachments', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  const task = db.getTasks().find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  res.json(task.attachments || []);
});

apiRouter.post('/tasks/:id/attachments', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  const { url, originalName, mimeType, sizeBytes, mediaId } = req.body;
  if (!url || !url.trim()) return res.status(400).json({ error: 'URL ou arquivo é obrigatório.' });
  if (!originalName || !originalName.trim()) return res.status(400).json({ error: 'Nome do arquivo é obrigatório.' });

  try {
    const attachment = db.addTaskAttachment(
      req.params.id,
      { url, originalName, mimeType, sizeBytes, mediaId },
      req.user!,
      getReqMeta(req)
    );
    res.status(201).json(attachment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id/attachments/:attachmentId', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.deleteTaskAttachment(req.params.id, req.params.attachmentId, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Anexo não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Task Dependencies
apiRouter.get('/tasks/:id/dependencies', requirePermission('tasks.view'), (req: AuthenticatedRequest, res) => {
  try {
    const dependencies = db.getTaskDependencies(req.params.id);
    const dependentTasks = db.getDependentTasks(req.params.id);
    const blockStatus = db.isTaskBlocked(req.params.id);
    res.json({
      dependencies,
      dependentTasks,
      isBlocked: blockStatus.isBlocked,
      blockingCount: blockStatus.blockingCount,
      blockingDependencies: blockStatus.blockingDependencies,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/tasks/:id/dependencies', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  const { dependsOnTaskId } = req.body;
  if (!dependsOnTaskId) {
    return res.status(400).json({ error: 'ID da tarefa de dependência é obrigatório.' });
  }

  try {
    const dep = db.addTaskDependency(req.params.id, dependsOnTaskId, req.user!, getReqMeta(req));
    res.status(201).json(dep);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id/dependencies/:depId', requirePermission('tasks.edit'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.removeTaskDependency(req.params.id, req.params.depId, req.user!, getReqMeta(req));
    if (!ok) return res.status(404).json({ error: 'Dependência não encontrada.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Administrators Management
apiRouter.get('/admins', requirePermission('admins.view'), (req, res) => {
  res.json({
    users: db.getUsers(),
    invites: db.getInvites(),
  });
});

apiRouter.post('/admins/invite', requirePermission('admins.invite'), (req: AuthenticatedRequest, res) => {
  const { email, role, permissions } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail válido obrigatório.' });
  }

  try {
    const invite = db.createInvite(email, role || 'editor', permissions, req.user!, getReqMeta(req));
    res.status(201).json(invite);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admins/invites/:id/resend', requirePermission('admins.resend_invite'), (req: AuthenticatedRequest, res) => {
  try {
    const invite = db.resendInvite(req.params.id, req.user!, getReqMeta(req));
    res.json(invite);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admins/invites/:id/cancel', requirePermission('admins.cancel_invite'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.cancelInvite(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/admins/users/:id/permissions', requirePermission('admins.change_permissions'), (req: AuthenticatedRequest, res) => {
  const { role, permissions } = req.body;
  try {
    const updated = db.updateUserPermissions(req.params.id, role, permissions, req.user!, getReqMeta(req));
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/admins/users/:id', requirePermission('admins.remove_access'), (req: AuthenticatedRequest, res) => {
  try {
    const ok = db.removeUserAccess(req.params.id, req.user!, getReqMeta(req));
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// History / Audit Log
apiRouter.get('/history', requirePermission('history.view'), (req, res) => {
  const { person, type, module, search } = req.query as Record<string, string>;
  const logs = db.getAuditLogs(person, type, module, search);
  res.json(logs);
});

apiRouter.get('/history/export', requirePermission('history.export'), (req, res) => {
  const logs = db.getAuditLogs();
  const headers = ['ID', 'Data/Hora', 'Usuário', 'Email', 'Ação', 'Módulo', 'Registro Afetado', 'Detalhes', 'IP', 'Dispositivo'];
  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    `"${l.userName.replace(/"/g, '""')}"`,
    l.userEmail,
    l.action,
    l.module,
    `"${(l.affectedRecord || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
    l.ipAddress,
    `"${(l.device || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="admir-audit-log.csv"');
  res.send(csv);
});

/* =========================================================================
   SYNCHRONIZATION (PRODUÇÃO → DEV / HOMOLOGAÇÃO) ENDPOINTS
   ========================================================================= */

// Get status & available modules
apiRouter.get('/sync/status', requirePermission('sync.view'), (req: AuthenticatedRequest, res) => {
  try {
    const status = syncService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test connection to Production source (READ-ONLY)
apiRouter.post('/sync/test-connection', requirePermission('sync.view'), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await syncService.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// READ-ONLY export of current data (used when this instance is queried as source)
apiRouter.get('/sync/export-source', (req: Request, res) => {
  const syncToken = process.env.PROD_SYNC_TOKEN || process.env.ADMIR_PROD_SYNC_TOKEN;
  const authHeader = req.headers['authorization'];
  const tokenHeader = req.headers['x-sync-token'];

  // Check token if configured
  if (syncToken) {
    const provided = tokenHeader || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null);
    if (provided !== syncToken) {
      return res.status(401).json({ error: 'Token de sincronização inválido ou ausente.' });
    }
  }

  try {
    const data = syncService.exportSourceData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dry Run / Preview Analysis
apiRouter.post('/sync/preview', requirePermission('sync.preview'), async (req: AuthenticatedRequest, res) => {
  const { selectedModules, isFullBase, snapshotData } = req.body;
  try {
    const preview = await syncService.analyzePreview(selectedModules || [], Boolean(isFullBase), snapshotData);
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Execute Sync (Produção → Dev) with automatic target backup
apiRouter.post('/sync/execute', requirePermission('sync.execute'), async (req: AuthenticatedRequest, res) => {
  const { selectedModules, strategy, snapshotData } = req.body;

  if (!selectedModules || !Array.isArray(selectedModules) || selectedModules.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um módulo para sincronização.' });
  }

  try {
    const result = await syncService.executeSync(
      selectedModules,
      strategy || 'source_wins',
      req.user!,
      getReqMeta(req),
      snapshotData
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get available backups
apiRouter.get('/sync/backups', requirePermission('sync.view'), (req: AuthenticatedRequest, res) => {
  try {
    const backups = syncService.getBackups();
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore a target backup snapshot
apiRouter.post('/sync/restore/:backupId', requirePermission('sync.restore'), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await syncService.restoreBackup(req.params.backupId, req.user!, getReqMeta(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get sync execution history
apiRouter.get('/sync/history', requirePermission('sync.view'), (req: AuthenticatedRequest, res) => {
  try {
    const history = syncService.getHistory();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

