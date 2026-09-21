import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Shield,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Minimize2,
  Bot,
  HelpCircle,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { api } from '../../lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  confidence?: 'high' | 'low' | 'unknown';
  suggestHumanSupport?: boolean;
  feedbackGiven?: 'positive' | 'negative';
}

export function AssistantChatWidget() {
  const { language } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [assistantSettings, setAssistantSettings] = useState<any>(null);

  // Escalation Form State
  const [escalateName, setEscalateName] = useState('');
  const [escalateEmail, setEscalateEmail] = useState('');
  const [escalatePhone, setEscalatePhone] = useState('');
  const [escalateSubject, setEscalateSubject] = useState('');
  const [escalateMessage, setEscalateMessage] = useState('');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [submittingEscalation, setSubmittingEscalation] = useState(false);
  const [escalationResult, setEscalationResult] = useState<{
    protocol?: string;
    message?: string;
    channelPending?: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Assistant Settings on Mount
  useEffect(() => {
    api
      .getAssistantPublicSettings()
      .then((settings) => {
        setAssistantSettings(settings);
      })
      .catch((err) => {
        console.warn('Could not fetch assistant settings:', err);
      });
  }, []);

  // Initialize Welcome Message when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome =
        language === 'pt'
          ? assistantSettings?.welcomeMessagePt || 'Olá! Sou o Assistente Virtual da ADMIR. Posso ajudar com informações públicas oficiais. Como posso ajudar?'
          : language === 'es'
          ? assistantSettings?.welcomeMessageEs || '¡Hola! Soy el Asistente Virtual de ADMIR. Puedo ayudar con información pública oficial. ¿Cómo puedo ayudarle?'
          : assistantSettings?.welcomeMessageEn || 'Hello! I am the ADMIR Virtual Assistant. I can help with official public information. How may I help you?';

      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: welcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, language, assistantSettings]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, showEscalationForm]);

  if (assistantSettings && assistantSettings.enabled === false) {
    return null; // Disabled by admin
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({ role: m.sender, text: m.text }));

      const res = await api.sendAssistantChat(query, language, historyPayload);

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: res.confidence,
        suggestHumanSupport: res.suggestHumanSupport || res.detectedHumanRequest,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If user directly requested human support or confidence is low, prefill escalation message
      if (res.suggestHumanSupport || res.detectedHumanRequest) {
        setEscalateSubject(`Solicitação via Assistente: ${query.substring(0, 40)}...`);
        setEscalateMessage(`Dúvida inicial do cidadão: "${query}"\n\nResposta preliminar da IA: "${res.answer.substring(0, 200)}..."`);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: err.message || 'Desculpe, ocorreu uma instabilidade. Você pode encaminhar sua dúvida para nossa equipe de atendimento.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: 'unknown',
          suggestHumanSupport: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (msgId: string, rating: 'positive' | 'negative') => {
    const target = messages.find((m) => m.id === msgId);
    if (!target) return;

    try {
      await api.sendAssistantFeedback(rating, target.text, language);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedbackGiven: rating } : m))
      );
    } catch (e) {
      // ignore
    }
  };

  const handleEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateName.trim() || !escalateEmail.trim() || !escalateMessage.trim()) return;

    setSubmittingEscalation(true);
    setEscalationResult(null);

    const conversationSummary = includeHistory
      ? messages.map((m) => `[${m.sender.toUpperCase()}]: ${m.text}`).join('\n')
      : undefined;

    try {
      const res = await api.escalateAssistantRequest({
        name: escalateName.trim(),
        email: escalateEmail.trim(),
        phone: escalatePhone.trim() || undefined,
        subject: escalateSubject.trim() || 'Atendimento Humanizado ADMIR',
        message: escalateMessage.trim(),
        conversationSummary,
        language,
        channel: 'email',
      });

      setEscalationResult({
        protocol: res.protocol,
        message: res.message,
        channelPending: res.channelPending,
      });

      // Add receipt message in chat
      if (res.protocol) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-protocol-${Date.now()}`,
            sender: 'assistant',
            text: `✅ Sua solicitação foi registrada sob o protocolo oficial **${res.protocol}**. Nossa equipe de diplomacia humanitária analisará sua mensagem e responderá no e-mail **${escalateEmail}**.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setEscalationResult({
        message: err.message || 'Falha ao registrar solicitação. Tente novamente.',
      });
    } finally {
      setSubmittingEscalation(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-slate-900 hover:bg-slate-800 text-white p-3.5 sm:p-4 rounded-full shadow-2xl border-2 border-amber-500/80 transition-all duration-300 hover:scale-105 group flex items-center gap-2.5"
          aria-label="Abrir Assistente Virtual ADMIR"
          title="Assistente Virtual ADMIR"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-amber-400 group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <span className="hidden sm:inline text-xs font-bold tracking-wider uppercase pr-1 text-slate-100">
            Atendimento ADMIR
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-24px)] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Assistente ADMIR</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Base Institucional de Dados Públicos</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Institutional Transparency Notice */}
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-3.5 py-1.5 text-[11px] text-amber-900 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Transparência:</strong> Assistente de IA treinado exclusivamente em informações públicas autorizadas da ADMIR.
            </p>
          </div>

          {/* Main Content Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-amber-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Timestamp & Feedback for Assistant */}
                  <div
                    className={`mt-1.5 text-[10px] flex items-center justify-between gap-2 ${
                      msg.sender === 'user' ? 'text-amber-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {msg.sender === 'assistant' && msg.id !== 'welcome-msg' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFeedback(msg.id, 'positive')}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            msg.feedbackGiven === 'positive' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                          }`}
                          title="Resposta útil"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'negative')}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            msg.feedbackGiven === 'negative' ? 'text-rose-600 font-bold' : 'text-slate-400'
                          }`}
                          title="Resposta pouco útil"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggest Escalation Button when AI indicates or detects user request */}
                {msg.sender === 'assistant' && msg.suggestHumanSupport && (
                  <button
                    onClick={() => setShowEscalationForm(true)}
                    className="mt-2 text-xs font-semibold text-amber-700 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Solicitar Atendimento Humano via E-mail
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Consultando base institucional oficial...</span>
              </div>
            )}

            {/* Escalation Form Box */}
            {showEscalationForm && (
              <div className="bg-white rounded-xl border border-amber-300 p-4 shadow-md space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    Escalonamento para Atendimento Humano
                  </div>
                  <button
                    onClick={() => setShowEscalationForm(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {escalationResult ? (
                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      escalationResult.protocol
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    <p className="font-semibold">{escalationResult.message}</p>
                    {escalationResult.protocol && (
                      <p className="mt-1 font-mono font-bold text-emerald-700 text-sm">
                        Protocolo: {escalationResult.protocol}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setShowEscalationForm(false);
                        setEscalationResult(null);
                      }}
                      className="mt-2.5 text-xs font-bold text-slate-800 underline hover:text-slate-900"
                    >
                      Voltar ao Chat
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEscalationSubmit} className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Seu Nome *</label>
                      <input
                        type="text"
                        required
                        value={escalateName}
                        onChange={(e) => setEscalateName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Seu E-mail *</label>
                      <input
                        type="email"
                        required
                        value={escalateEmail}
                        onChange={(e) => setEscalateEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Telefone (opcional)</label>
                      <input
                        type="text"
                        value={escalatePhone}
                        onChange={(e) => setEscalatePhone(e.target.value)}
                        placeholder="+55 (11) 99999-9999"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Assunto</label>
                      <input
                        type="text"
                        value={escalateSubject}
                        onChange={(e) => setEscalateSubject(e.target.value)}
                        placeholder="Assunto do atendimento"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Mensagem *</label>
                      <textarea
                        required
                        rows={2}
                        value={escalateMessage}
                        onChange={(e) => setEscalateMessage(e.target.value)}
                        placeholder="Descreva detalhadamente sua dúvida ou solicitação..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="chkHist"
                        checked={includeHistory}
                        onChange={(e) => setIncludeHistory(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="chkHist" className="text-[11px] text-slate-600 cursor-pointer">
                        Anexar histórico desta conversa para agilizar o atendimento
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowEscalationForm(false)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingEscalation}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {submittingEscalation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Enviar Solicitação
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida sobre a ADMIR..."
                maxLength={500}
                disabled={loading}
                className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-40 shrink-0 shadow-sm"
                title="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>ADMIR Diplomatic AI Assistant</span>
              <button
                onClick={() => setShowEscalationForm(true)}
                className="hover:text-amber-600 font-medium underline flex items-center gap-1"
              >
                Atendimento Humano
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
