import {
  SiteSettings,
  Program,
  Story,
  Ambassador,
  PrivateDocument,
  MediaAsset,
  Donation,
  Task,
  TaskChecklistItem,
  TaskComment,
  TaskAttachment,
  TaskDependency,
  TaskWorkspace,
  TaskWorkflow,
  TaskWorkflowStage,
  AuditLog,
  User,
  AdminInvite,
  UserRole,
  GranularPermissions,
  ContactMessage,
  AssistantSettings,
  AssistantFaqItem,
  ContactRequest,
  MaintenanceSettings,
  MaintenanceConfig,
} from '../types';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('admir_auth_token');
    if (token) {
      headers['x-user-id'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      let errorMsg = `Erro na requisição (${res.status})`;
      if (contentType.includes('application/json')) {
        try {
          const data = await res.json();
          if (data && data.error) errorMsg = data.error;
        } catch (e) {
          // ignore
        }
      } else {
        try {
          const text = await res.text();
          if (text && !text.includes('<!doctype') && !text.includes('<html')) {
            errorMsg = text.slice(0, 150);
          }
        } catch (e) {
          // ignore
        }
      }
      throw new Error(errorMsg);
    }

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error(`Endpoint '${url}' retornou HTML em vez de JSON.`);
      }
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        throw new Error(`Resposta inválida do servidor para '${url}'.`);
      }
    }

    return res.json();
  }

  // --- PUBLIC ---
  public async getSettings(): Promise<SiteSettings> {
    return this.request<SiteSettings>('/api/settings');
  }

  public async getPrograms(all = false): Promise<Program[]> {
    return this.request<Program[]>(`/api/programs${all ? '?all=true' : ''}`);
  }

  public async getProgram(slugOrId: string): Promise<Program> {
    return this.request<Program>(`/api/programs/${slugOrId}`);
  }

  public async getStories(drafts = false): Promise<Story[]> {
    return this.request<Story[]>(`/api/stories${drafts ? '?drafts=true' : ''}`);
  }

  public async getStory(slugOrId: string): Promise<Story> {
    return this.request<Story>(`/api/stories/${slugOrId}`);
  }

  public async getAmbassadors(all = false): Promise<Ambassador[]> {
    return this.request<Ambassador[]>(`/api/ambassadors${all ? '?all=true' : ''}`);
  }

  public async getAmbassador(id: string): Promise<Ambassador> {
    return this.request<Ambassador>(`/api/ambassadors/${id}`);
  }



  public async subscribeNewsletter(name: string, email: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  }

  public async submitContact(data: Partial<ContactMessage>): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- AUTH ---
  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('admir_auth_token', res.token);
    localStorage.setItem('admir_current_user_id', res.user.id);
    return res;
  }


  public async loginWithGoogle(payload: {
    email: string;
    displayName: string | null;
    photoURL: string | null;
    firebaseUid: string;
  }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('admir_auth_token', res.token);
    localStorage.setItem('admir_current_user_id', res.user.id);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('admir_auth_token');
      localStorage.removeItem('admir_current_user_id');
    }
  }

  // --- INVITES ---
  public async checkInvite(token: string): Promise<{ email: string; role: UserRole; expiresAt: string }> {
    return this.request(`/api/invites/check/${token}`);
  }

  public async acceptInvite(token: string, name: string, password: string): Promise<{ user: User }> {
    const res = await this.request<{ user: User }>('/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token, name, password }),
    });
    localStorage.setItem('admir_auth_token', res.user.id);
    return res;
  }

  // --- CMS: SETTINGS ---
  public async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.request<SiteSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- CMS: PROGRAMS ---
  public async createProgram(data: Partial<Program>): Promise<Program> {
    return this.request<Program>('/api/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateProgram(id: string, data: Partial<Program>): Promise<Program> {
    return this.request<Program>(`/api/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteProgram(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/programs/${id}`, {
      method: 'DELETE',
    });
  }

  public async reorderPrograms(orderedIds: string[]): Promise<Program[]> {
    return this.request<Program[]>('/api/programs/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  }

  // --- CMS: STORIES ---
  public async createStory(data: Partial<Story>): Promise<Story> {
    return this.request<Story>('/api/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateStory(id: string, data: Partial<Story>): Promise<Story> {
    return this.request<Story>(`/api/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async duplicateStory(id: string): Promise<Story> {
    return this.request<Story>(`/api/stories/${id}/duplicate`, {
      method: 'POST',
    });
  }

  public async deleteStory(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/stories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- CMS: AMBASSADORS ---
  public async getAdminAmbassadors(): Promise<Ambassador[]> {
    return this.request<Ambassador[]>('/api/admin/ambassadors');
  }

  public async createAmbassador(data: Partial<Ambassador>): Promise<Ambassador> {
    return this.request<Ambassador>('/api/ambassadors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateAmbassador(id: string, data: Partial<Ambassador>): Promise<Ambassador> {
    return this.request<Ambassador>(`/api/ambassadors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteAmbassador(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/ambassadors/${id}`, {
      method: 'DELETE',
    });
  }

  public async generateOnboardingLink(id: string): Promise<{ token: string; url: string; expiresAt: string }> {
    return this.request<{ token: string; url: string; expiresAt: string }>(`/api/ambassadors/${id}/generate-link`, {
      method: 'POST',
    });
  }

  public async revokeOnboardingLink(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/ambassadors/${id}/revoke-link`, {
      method: 'POST',
    });
  }

  public async uploadAdminPrivateDocument(
    id: string,
    docData: { type: string; fileName: string; fileData: string; mimeType: string; fileSize: number }
  ): Promise<PrivateDocument> {
    return this.request<PrivateDocument>(`/api/ambassadors/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(docData),
    });
  }

  public async deleteAdminPrivateDocument(id: string, docId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/ambassadors/${id}/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  public async generateBioAI(payload: {
    name?: string;
    profession?: string;
    experience?: string;
    curriculumSummary?: string;
  }): Promise<{ bio_pt: string; bio_en: string; bio_es: string; originalSummary: string }> {
    return this.request<{ bio_pt: string; bio_en: string; bio_es: string; originalSummary: string }>(
      '/api/ambassadors/generate-bio',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  // --- EXTERNAL ONBOARDING CANDIDATE ---
  public async getOnboardingCandidate(token: string): Promise<any> {
    return this.request(`/api/ambassador-onboarding/${token}`);
  }

  public async updateOnboardingCandidate(
    token: string,
    data: Partial<Ambassador>,
    submitForAnalysis = false
  ): Promise<Ambassador> {
    return this.request<Ambassador>(`/api/ambassador-onboarding/${token}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, submitForAnalysis }),
    });
  }

  public async uploadOnboardingDocument(
    token: string,
    docData: { type: string; fileName: string; fileData: string; mimeType: string; fileSize: number }
  ): Promise<PrivateDocument> {
    return this.request<PrivateDocument>(`/api/ambassador-onboarding/${token}/upload`, {
      method: 'POST',
      body: JSON.stringify(docData),
    });
  }

  // --- CMS: MEDIA ---
  public async getMedia(): Promise<MediaAsset[]> {
    return this.request<MediaAsset[]>('/api/media');
  }

  public async uploadMedia(asset: Partial<MediaAsset>): Promise<MediaAsset> {
    return this.request<MediaAsset>('/api/media', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  public async uploadMediaFile(data: {
    fileName: string;
    fileData: string;
    mimeType?: string;
    title?: string;
    tags?: string[];
  }): Promise<MediaAsset> {
    return this.request<MediaAsset>('/api/media/upload-file', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateMedia(id: string, data: Partial<MediaAsset>): Promise<MediaAsset> {
    return this.request<MediaAsset>(`/api/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteMedia(id: string): Promise<{ success: boolean; usageCount: number }> {
    return this.request<{ success: boolean; usageCount: number }>(`/api/media/${id}`, {
      method: 'DELETE',
    });
  }

  // --- CMS: DONATIONS ---
  public async getDonations(filters?: { search?: string; period?: string; status?: string; type?: string }): Promise<{
    donations: Donation[];
    stats: { totalRaised: number; monthlyPledges: number; donationsReceived: number };
  }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);

    return this.request(`/api/donations?${params.toString()}`);
  }

  public async submitDonation(data: {
    amount: number;
    currency?: string;
    donationType?: 'one-time' | 'monthly';
    donorName: string;
    donorEmail: string;
    cause?: string;
    message?: string;
    anonymous?: boolean;
    publicConsent?: boolean;
    provider?: 'stripe' | 'paypal';
  }): Promise<{ id?: string; amount?: number; url?: string; transactionId?: string; message?: string }> {
    return this.request('/api/donations/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async refundDonation(id: string): Promise<{ success: boolean; donation: Donation }> {
    return this.request(`/api/donations/${id}/refund`, {
      method: 'POST',
    });
  }

  // --- CMS: TASKS ---
  public async getWorkspaces(): Promise<TaskWorkspace[]> {
    return this.request<TaskWorkspace[]>('/api/tasks/workspaces');
  }

  public async getWorkflows(workspaceId?: string, all?: boolean): Promise<TaskWorkflow[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (all) params.append('all', 'true');
    const query = params.toString();
    return this.request<TaskWorkflow[]>(`/api/tasks/workflows${query ? `?${query}` : ''}`);
  }

  public async createWorkflow(data: { workspaceId?: string; name: string; active?: boolean }): Promise<TaskWorkflow> {
    return this.request<TaskWorkflow>('/api/tasks/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateWorkflow(id: string, data: { name?: string; active?: boolean; orderIndex?: number }): Promise<TaskWorkflow> {
    return this.request<TaskWorkflow>(`/api/tasks/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteWorkflow(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  public async reorderWorkflows(orderedIds: string[]): Promise<TaskWorkflow[]> {
    return this.request<TaskWorkflow[]>('/api/tasks/workflows/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  }

  public async getStages(workflowId: string, all?: boolean): Promise<TaskWorkflowStage[]> {
    const query = all ? '?all=true' : '';
    return this.request<TaskWorkflowStage[]>(`/api/tasks/workflows/${workflowId}/stages${query}`);
  }

  public async createStage(workflowId: string, data: { name: string; isInitial?: boolean; isFinal?: boolean; active?: boolean }): Promise<TaskWorkflowStage> {
    return this.request<TaskWorkflowStage>(`/api/tasks/workflows/${workflowId}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateStage(id: string, data: { name?: string; isInitial?: boolean; isFinal?: boolean; active?: boolean; orderIndex?: number }): Promise<TaskWorkflowStage> {
    return this.request<TaskWorkflowStage>(`/api/tasks/stages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteStage(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/stages/${id}`, {
      method: 'DELETE',
    });
  }

  public async reorderStages(workflowId: string, orderedIds: string[]): Promise<TaskWorkflowStage[]> {
    return this.request<TaskWorkflowStage[]>(`/api/tasks/workflows/${workflowId}/stages/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  }

  public async getTasks(workspaceId?: string, workflowId?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (workspaceId && workspaceId.trim()) params.append('workspaceId', workspaceId.trim());
    if (workflowId && workflowId.trim()) params.append('workflowId', workflowId.trim());
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<Task[]>(`/api/tasks${q}`);
  }

  public async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/api/tasks/${id}`);
  }

  public async getEligibleTaskUsers(workspaceId?: string, workflowId?: string, search?: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    title?: string;
    avatar?: string;
  }>> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (workflowId) params.append('workflowId', workflowId);
    if (search) params.append('search', search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/api/tasks/eligible-users${q}`);
  }

  public async createTask(data: Partial<Task>): Promise<Task> {
    return this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteTask(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  public async addChecklistItem(taskId: string, title: string): Promise<TaskChecklistItem> {
    return this.request<TaskChecklistItem>(`/api/tasks/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  public async updateChecklistItem(
    taskId: string,
    itemId: string,
    data: { title?: string; completed?: boolean; orderIndex?: number }
  ): Promise<TaskChecklistItem> {
    return this.request<TaskChecklistItem>(`/api/tasks/${taskId}/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteChecklistItem(taskId: string, itemId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}/checklist/${itemId}`, {
      method: 'DELETE',
    });
  }

  public async addTaskComment(taskId: string, content: string): Promise<TaskComment> {
    return this.request<TaskComment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  public async updateTaskComment(taskId: string, commentId: string, content: string): Promise<TaskComment> {
    return this.request<TaskComment>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  public async deleteTaskComment(taskId: string, commentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  public async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return this.request<TaskAttachment[]>(`/api/tasks/${taskId}/attachments`);
  }

  public async addTaskAttachment(
    taskId: string,
    data: { mediaId?: string; url: string; originalName: string; mimeType?: string; sizeBytes?: number }
  ): Promise<TaskAttachment> {
    return this.request<TaskAttachment>(`/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async deleteTaskAttachment(taskId: string, attachmentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  public async getAllTaskDependencies(): Promise<{ dependencies: TaskDependency[]; blockedTaskIds: string[] }> {
    return this.request<{ dependencies: TaskDependency[]; blockedTaskIds: string[] }>('/api/tasks/dependencies/all');
  }

  public async getTaskDependencies(taskId: string): Promise<{
    dependencies: TaskDependency[];
    dependentTasks: TaskDependency[];
    isBlocked: boolean;
    blockingCount: number;
    blockingDependencies: Array<{
      dependencyId: string;
      dependsOnTaskId: string;
      dependsOnTaskTitle: string;
      workflowName: string;
      stageName: string;
      isFinal: boolean;
    }>;
  }> {
    return this.request(`/api/tasks/${taskId}/dependencies`);
  }

  public async addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency> {
    return this.request<TaskDependency>(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ dependsOnTaskId }),
    });
  }

  public async removeTaskDependency(taskId: string, depId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}/dependencies/${depId}`, {
      method: 'DELETE',
    });
  }

  // --- CMS: ADMINS & PERMISSIONS ---
  public async getAdmins(): Promise<{ users: User[]; invites: AdminInvite[] }> {
    return this.request<{ users: User[]; invites: AdminInvite[] }>('/api/admins');
  }

  public async inviteAdmin(email: string, role: UserRole, permissions: GranularPermissions): Promise<AdminInvite> {
    return this.request<AdminInvite>('/api/admins/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, permissions }),
    });
  }

  public async resendInvite(id: string): Promise<AdminInvite> {
    return this.request<AdminInvite>(`/api/admins/invites/${id}/resend`, {
      method: 'POST',
    });
  }

  public async cancelInvite(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/admins/invites/${id}/cancel`, {
      method: 'POST',
    });
  }

  public async updateUserPermissions(userId: string, role: UserRole, permissions: GranularPermissions): Promise<User> {
    return this.request<User>(`/api/admins/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    });
  }

  public async removeUserAccess(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/admins/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // --- CMS: HISTORY ---
  public async getHistory(filters?: { person?: string; type?: string; module?: string; search?: string }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.person) params.append('person', filters.person);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.module) params.append('module', filters.module);
    if (filters?.search) params.append('search', filters.search);

    return this.request<AuditLog[]>(`/api/history?${params.toString()}`);
  }

  // --- ASSISTANTE VIRTUAL & CANAIS ---
  public async getAssistantPublicSettings(): Promise<Partial<AssistantSettings>> {
    return this.request<Partial<AssistantSettings>>('/api/assistant/settings');
  }

  public async sendAssistantChat(
    message: string,
    language = 'pt',
    history: { role: 'user' | 'assistant'; text: string }[] = []
  ): Promise<{
    answer: string;
    confidence: 'high' | 'low' | 'unknown';
    suggestHumanSupport: boolean;
    detectedHumanRequest?: boolean;
  }> {
    return this.request('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language, history }),
    });
  }

  public async escalateAssistantRequest(data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    conversationSummary?: string;
    language?: string;
    channel?: string;
  }): Promise<{ success: boolean; protocol?: string; channelPending?: boolean; message?: string }> {
    return this.request('/api/assistant/escalate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async sendAssistantFeedback(rating: 'positive' | 'negative', messageText?: string, language = 'pt'): Promise<{ success: boolean }> {
    return this.request('/api/assistant/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating, messageText, language }),
    });
  }

  public async getAssistantFaqs(includeAll = false): Promise<AssistantFaqItem[]> {
    return this.request<AssistantFaqItem[]>(`/api/assistant/faqs${includeAll ? '?all=true' : ''}`);
  }

  // Admin Assistant API
  public async getAdminAssistantSettings(): Promise<AssistantSettings> {
    return this.request<AssistantSettings>('/api/admin/assistant/settings');
  }

  public async updateAdminAssistantSettings(settings: Partial<AssistantSettings>): Promise<AssistantSettings> {
    return this.request<AssistantSettings>('/api/admin/assistant/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public async createAssistantFaq(faq: Omit<AssistantFaqItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssistantFaqItem> {
    return this.request<AssistantFaqItem>('/api/admin/assistant/faqs', {
      method: 'POST',
      body: JSON.stringify(faq),
    });
  }

  public async updateAssistantFaq(id: string, faq: Partial<AssistantFaqItem>): Promise<AssistantFaqItem> {
    return this.request<AssistantFaqItem>(`/api/admin/assistant/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(faq),
    });
  }

  public async deleteAssistantFaq(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/admin/assistant/faqs/${id}`, {
      method: 'DELETE',
    });
  }

  public async getContactRequests(status?: string, search?: string): Promise<ContactRequest[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.request<ContactRequest[]>(`/api/admin/assistant/requests?${params.toString()}`);
  }

  public async updateContactRequestStatus(id: string, status: string, notes?: string): Promise<ContactRequest> {
    return this.request<ContactRequest>(`/api/admin/assistant/requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  public async getAssistantAnalytics(): Promise<{
    totalRequests: number;
    newRequests: number;
    inProgressRequests: number;
    closedRequests: number;
    publishedFaqs: number;
    draftFaqs: number;
    totalFeedbacks: number;
    satisfactionRate: number;
  }> {
    return this.request('/api/admin/assistant/analytics');
  }

  // --- CENTRAL DE MANUTENÇÃO ---
  public async getPublicMaintenanceStatus(): Promise<{
    global: MaintenanceConfig;
    pages: Record<string, MaintenanceConfig>;
    updatedAt: string;
  }> {
    return this.request('/api/maintenance/status');
  }

  public async getMaintenanceSettings(): Promise<MaintenanceSettings> {
    return this.request<MaintenanceSettings>('/api/admin/maintenance');
  }

  public async updateMaintenanceSettings(settings: Partial<MaintenanceSettings>): Promise<MaintenanceSettings> {
    return this.request<MaintenanceSettings>('/api/admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public async toggleGlobalMaintenance(enabled: boolean): Promise<MaintenanceSettings> {
    return this.request<MaintenanceSettings>('/api/admin/maintenance/global', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  public async togglePageMaintenance(pageKey: string, enabled: boolean): Promise<MaintenanceSettings> {
    return this.request<MaintenanceSettings>(`/api/admin/maintenance/page/${pageKey}`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  public async updatePageMaintenance(pageKey: string, config: Partial<MaintenanceConfig>, enabled?: boolean): Promise<MaintenanceSettings> {
    return this.request<MaintenanceSettings>(`/api/admin/maintenance/page/${pageKey}`, {
      method: 'POST',
      body: JSON.stringify({ config, enabled }),
    });
  }
}

export const api = new ApiClient();
