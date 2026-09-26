import React, { useEffect, useState, useRef } from 'react';
import {
  Shield,
  FileCheck,
  Upload,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  User,
  Heart,
  Globe,
  Trash2,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { PrivacyNotice } from '../common/PrivacyNotice';
import {
  maskCPF,
  validateCPF,
  formatPhone,
  validateEmail,
  validateBirthDate,
} from '../../utils/validation';
import { CountryDocumentRule } from '../../types';

export function AmbassadorOnboardingView() {
  const { selectedParam } = useSite();
  const { success, error } = useToast();

  const token = selectedParam || new URLSearchParams(window.location.search).get('token') || '';

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [applicableRules, setApplicableRules] = useState<CountryDocumentRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form Fields State
  const [form, setForm] = useState({
    fullName: '',
    passportNumber: '',
    cpf: '',
    rgDni: '',
    birthDate: '',
    bloodType: '',
    fatherName: '',
    motherName: '',
    email: '',
    phone: '',
    profession: '',
    address: '',
    curriculumSummary: '',
  });

  // Document Upload State
  const [docType, setDocType] = useState<string>('passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'camera' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, method: 'file' | 'camera') => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      error('Arquivo muito grande', 'O limite máximo para upload é de 10 MB por arquivo.');
      return;
    }

    // Validate image format for camera
    if (method === 'camera' && !file.type.startsWith('image/')) {
      error('Formato inválido', 'A captura por câmera aceita apenas arquivos de imagem.');
      return;
    }

    setSelectedFile(file);
    setUploadMethod(method);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadMethod(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setValid(false);
      return;
    }

    const loadCandidate = async () => {
      setLoading(true);
      try {
        const data = await api.getOnboardingCandidate(token);
        setCandidate(data);
        setForm({
          fullName: data.fullName || '',
          passportNumber: data.passportNumber || '',
          cpf: data.cpf || '',
          rgDni: data.rgDni || '',
          birthDate: data.birthDate || '',
          bloodType: data.bloodType || '',
          fatherName: data.fatherName || '',
          motherName: data.motherName || '',
          email: data.email || '',
          phone: data.phone || '',
          profession: data.profession || '',
          address: data.address || '',
          curriculumSummary: data.curriculumSummary || '',
        });
        const rules: CountryDocumentRule[] = data.applicableRules || [];
        setApplicableRules(rules);
        if (rules.length > 0) {
          setSelectedRuleId(rules[0].id);
          setDocType(rules[0].documentCode);
        }
        setValid(true);
      } catch (err: any) {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'cpf') {
      formattedValue = maskCPF(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }
    setForm((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const validateFormData = (): boolean => {
    if (form.cpf.trim() && !validateCPF(form.cpf)) {
      error('CPF Inválido', 'O CPF informado não atende aos dígitos verificadores.');
      return false;
    }
    if (form.email.trim() && !validateEmail(form.email)) {
      error('E-mail Inválido', 'Informe um endereço de e-mail válido (ex: nome@dominio.com).');
      return false;
    }
    if (form.birthDate.trim()) {
      const bd = validateBirthDate(form.birthDate);
      if (!bd.valid) {
        error('Data de Nascimento Inválida', bd.message || 'Verifique a data informada.');
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!token) return;
    if (!validateFormData()) return;

    setSaving(true);
    try {
      const updated = await api.updateOnboardingCandidate(token, form, false);
      setCandidate(updated);
      success('Rascunho Salvo!', 'Suas informações foram armazenadas em ambiente diplomático seguro.');
    } catch (err: any) {
      error('Erro ao Salvar', err.message || 'Falha ao salvar rascunho do cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForAnalysis = async () => {
    if (!token) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      error('Preenchimento Incompleto', 'Por favor, informe ao menos seu nome completo e e-mail.');
      return;
    }
    if (!validateFormData()) return;

    setSubmitting(true);
    try {
      const updated = await api.updateOnboardingCandidate(token, form, true);
      setCandidate(updated);
      success(
        'Cadastro Enviado!',
        'Seu formulário e documentos foram enviados para análise da Secretaria Executiva da ADMIR.'
      );
    } catch (err: any) {
      error('Erro ao Enviar', err.message || 'Falha ao enviar cadastro para análise.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !token) {
      error('Arquivo não Selecionado', 'Por favor, escolha um arquivo do seu dispositivo.');
      return;
    }

    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          await api.uploadOnboardingDocument(token, {
            type: docType,
            ruleId: selectedRuleId || undefined,
            documentCode: docType,
            fileName: selectedFile.name,
            fileData: base64Data,
            mimeType: selectedFile.type,
            fileSize: selectedFile.size,
          });

          success('Documento Anexado!', `O arquivo "${selectedFile.name}" foi enviado com sucesso.`);
          setSelectedFile(null);

          // Refresh candidate data
          const reloaded = await api.getOnboardingCandidate(token);
          setCandidate(reloaded);
        } catch (err: any) {
          error('Erro no Envio', err.message || 'Falha ao enviar documento privado.');
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      error('Erro de Leitura', 'Não foi possível ler o arquivo selecionado.');
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Validando credenciais do link diplomático...</p>
      </div>
    );
  }

  if (!valid || !candidate) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold font-serif-heading text-white">
              Link de Onboarding Inválido
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O link de acesso fornecido não é válido, expirou ou foi revogado pela administração da ADMIR.
            </p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300">
            <p className="font-semibold text-amber-400 mb-1">Como proceder?</p>
            <p>
              Entre em contato com a Secretaria Executiva da Missão Diplomática para solicitar um novo link de onboarding.
            </p>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-3 rounded-xl transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>Ir para a Página Inicial da ADMIR</span>
          </a>
        </div>
      </div>
    );
  }

  const completionPercentage = candidate.completionPercentage || 0;
  const pendingItems = candidate.pendingItems || [];
  const documents = candidate.documents || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Diplomatic Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
                  <Lock className="w-3 h-3" /> ADMIR — Formulário Diplomático Privado
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif-heading text-white">
                  Ingresso & Onboarding de Embaixador
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Preencha os dados institucionais, pessoais e anexe a documentação comprobatória para registro na Missão Diplomática.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 text-center shrink-0 w-full sm:w-auto">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Status do Processo
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm font-bold text-amber-300 capitalize">
                  {candidate.onboardingStatus === 'analisando'
                    ? 'Em Análise'
                    : candidate.onboardingStatus === 'pendencia'
                    ? 'Com Pendências'
                    : candidate.onboardingStatus === 'publicado'
                    ? 'Concluído'
                    : 'Em Preenchimento'}
                </span>
              </div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-amber-400" /> Progresso da Documentação
              </span>
              <span className="text-amber-400 font-bold">{completionPercentage}% Concluído</span>
            </div>
            <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {pendingItems.length > 0 ? (
              <p className="text-[11px] text-slate-400">
                <strong className="text-amber-400">{pendingItems.length} itens pendentes:</strong>{' '}
                {pendingItems.slice(0, 4).join(', ')}
                {pendingItems.length > 4 && '...'}
              </p>
            ) : (
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Todos os requisitos documentais foram atendidos!
              </p>
            )}
          </div>
        </div>

        {candidate.onboardingStatus === 'analisando' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3 text-amber-200">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-300 text-sm">Formulário sob Análise Diplomática</p>
              <p>
                Seu cadastro foi enviado com sucesso e está sendo analisado pela Secretaria Executiva. Você pode continuar atualizando seus dados se necessário.
              </p>
            </div>
          </div>
        )}

        {/* LGPD Privacy Notice for Onboarding */}
        <PrivacyNotice context="ambassador_onboarding" theme="dark" variant="banner" />

        {/* SECTION 1: Personal Data */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold font-serif-heading text-white">
              1. Dados Pessoais & Identificação
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nome Completo <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Conforme documento oficial de identidade ou passaporte"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                E-mail de Contato <span className="text-amber-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Telefone / WhatsApp <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+55 (00) 00000-0000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Passaporte <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                name="passportNumber"
                value={form.passportNumber}
                onChange={handleChange}
                placeholder="Número do passaporte (opcional)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                CPF <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                RG / DNI <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="rgDni"
                value={form.rgDni}
                onChange={handleChange}
                placeholder="Documento de identidade nacional"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Data de Nascimento <span className="text-amber-400">*</span>
              </label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Tipo Sanguíneo <span className="text-amber-400">*</span>
              </label>
              <select
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="">Selecione o tipo sanguíneo</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nome do Pai <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                placeholder="Nome completo do pai"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nome da Mãe <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
                placeholder="Nome completo da mãe"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Profissão / Cargo Atual <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="profession"
                value={form.profession}
                onChange={handleChange}
                placeholder="Ex: Advogado, Médico, Jurista, Professor"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Endereço Residencial Completo <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Rua/Avenida, número, complemento, bairro, cidade, estado, CEP e país"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Curriculum Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold font-serif-heading text-white">
              2. Resumo Curricular & Histórico Profissional
            </h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Resumo da Trajetória Profissional <span className="text-amber-400">*</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Descreva sucintamente sua formação acadêmica, cargos relevantes, atuação humanitária e histórico profissional.
            </p>
            <textarea
              name="curriculumSummary"
              rows={5}
              value={form.curriculumSummary}
              onChange={handleChange}
              placeholder="Ex: Formado em Direito Internacional pela Universidade... Com 15 anos de atuação em direitos humanos, tendo atuado como..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* SECTION 3: Private Document Attachments */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold font-serif-heading text-white">
                3. Documentos Comprobatórios Privados
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-[11px] text-slate-300">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>País do Cadastro: <strong className="text-white">{candidate.country || 'Padrão Internacional'}</strong></span>
            </div>
          </div>

          <PrivacyNotice context="ambassador_docs" theme="dark" variant="compact" />

          {/* DYNAMIC COUNTRY DOCUMENT REQUIREMENTS CHECKLIST */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Requisitos Documentais Internacionais
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Documentação orientativa para instrução cadastral de representação na ADMIR ({candidate.country || 'Padrão Internacional'}).
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {applicableRules.length} {applicableRules.length === 1 ? 'requisito configurado' : 'requisitos configurados'}
              </span>
            </div>

            <div className="space-y-3">
              {applicableRules.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  Carregando requisitos aplicáveis ao seu país...
                </p>
              ) : (
                applicableRules.map((rule) => {
                  const isUploaded = documents.some(
                    (d: any) =>
                      d.ruleId === rule.id ||
                      d.documentCode === rule.documentCode ||
                      d.type === rule.documentCode ||
                      (rule.documentCode === 'photo' && ((candidate.photo && candidate.photo.trim().length > 0) || d.type === 'photo')) ||
                      (rule.documentCode === 'passport' && (d.type === 'passport' || d.type === 'rg'))
                  );

                  return (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isUploaded
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-200'
                          : rule.isRequired
                          ? 'bg-slate-900/60 border-amber-500/20 text-slate-300'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {isUploaded ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : rule.isRequired ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">{rule.documentName}</span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  rule.isRequired
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {rule.isRequired ? 'Obrigatório no fluxo ADMIR' : 'Opcional / Complementar'}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                ({rule.category})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {rule.candidateInstructions || rule.description}
                            </p>
                            {rule.allowedFormats && rule.allowedFormats.length > 0 && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                Formatos aceitos: {rule.allowedFormats.map((f) => f.split('/').pop()?.toUpperCase()).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          {isUploaded ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Anexado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDocType(rule.documentCode);
                                setSelectedRuleId(rule.id);
                                fileInputRef.current?.click();
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-600 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" /> Anexar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upload Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Anexar Novo Documento</h3>
            
            <div className="space-y-4">
              {/* Document Type Dropdown */}
              <div className="max-w-md space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Tipo de Documento</label>
                <select
                  value={docType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDocType(val);
                    const matchedRule = applicableRules.find((r) => r.documentCode === val);
                    setSelectedRuleId(matchedRule ? matchedRule.id : '');
                    handleRemoveFile();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  {applicableRules.map((rule) => (
                    <option key={rule.id} value={rule.documentCode}>
                      {rule.documentName} {rule.isRequired ? '(*Obrigatório)' : '(Opcional)'}
                    </option>
                  ))}
                  <option value="other">Outro Documento Comprobatório</option>
                </select>
              </div>

              {/* Action Choices if no file selected */}
              {!selectedFile ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300 block">Selecione o Método de Envio</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Choose File Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 rounded-xl transition-all group text-center cursor-pointer space-y-2"
                    >
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-200 block">Escolher Arquivo</span>
                        <span className="text-[10px] text-slate-400 block">PDF, Imagens, DOC (Máx 10MB)</span>
                      </div>
                    </button>

                    {/* Take Photo Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 rounded-xl transition-all group text-center cursor-pointer space-y-2"
                    >
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-200 block">Tirar Foto</span>
                        <span className="text-[10px] text-slate-400 block">Usar câmera do celular ou webcam</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview Container if file selected */
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Documento Selecionado
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded capitalize">
                      Modo: {uploadMethod === 'camera' ? 'Captura de Câmera' : 'Arquivo Local'}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Render Image Preview if type is image */}
                    {previewUrl ? (
                      <div className="relative w-full md:w-44 h-28 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Preview do Documento"
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      /* Document Icon */
                      <div className="w-full md:w-44 h-28 bg-slate-950 rounded-lg border border-slate-800 shrink-0 flex flex-col items-center justify-center text-slate-400 space-y-1">
                        <FileText className="w-8 h-8 text-amber-500" />
                        <span className="text-[10px] font-mono">.{selectedFile.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                    )}

                    {/* File Info & Action Sub-buttons */}
                    <div className="flex-1 w-full space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate break-all">{selectedFile.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <span>Tamanho: <strong className="text-slate-200">{formatSize(selectedFile.size)}</strong></span>
                          <span>Tipo: <strong className="text-slate-200">{selectedFile.type || 'Desconhecido'}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {uploadMethod === 'camera' ? (
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Tirar novamente</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Escolher outro</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="bg-red-950/40 hover:bg-red-950/80 text-red-400 hover:text-red-300 border border-red-900/30 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-500/90 leading-relaxed bg-amber-500/5 p-2 rounded border border-amber-500/10">
                    * Verifique se as informações do documento estão nítidas e totalmente legíveis antes de salvar.
                  </p>

                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={uploadingDoc}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadingDoc ? 'Enviando Documento...' : 'Confirmar e Anexar Documento Seguro'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e, 'file')}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={(e) => handleFileChange(e, 'camera')}
              className="hidden"
            />
          </div>

          {/* Current Attached Documents List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">Documentos Anexados ({documents.length})</h3>
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl border border-slate-800">
                Nenhum documento anexado até o momento. Por favor, envie os documentos aplicáveis ao seu cadastro (o passaporte é opcional).
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map((d: any) => (
                  <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{d.originalName || d.fileName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">Tipo: {d.type}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Anexado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-6 py-3.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{saving ? 'Salvando Rascunho...' : 'Salvar e Continuar Depois'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitForAnalysis}
            disabled={saving || submitting}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold px-8 py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Enviando...' : 'Enviar Cadastro para Análise da ADMIR'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
