import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Globe2,
  Shield,
  X,
  Save,
  Search,
  Languages,
  Link,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  FileCheck,
  Upload,
  Lock,
  Download,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Image,
  FolderOpen,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Ambassador, AmbassadorOnboardingStatus, AmbassadorEditorialStatus, PrivateDocument, Language } from '../../types';

export function AdminAmbassadors() {
  const { refreshAmbassadors } = useSite();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const canCreate = hasPermission('ambassadors.create');
  const canEdit = hasPermission('ambassadors.edit');
  const canDelete = hasPermission('ambassadors.delete');

  // Candidate Data State (Admin view includes private fields)
  const [candidates, setCandidates] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [editorialFilter, setEditorialFilter] = useState<string>('all');

  // Editor Modal State
  const [editingCandidate, setEditingCandidate] = useState<Ambassador | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'docs' | 'link' | 'ai' | 'status'>('public');
  const [activeLangTab, setActiveLangTab] = useState<Language>('pt');

  // Generated Link State for Onboarding
  const [generatedLink, setGeneratedLink] = useState<{ url: string; token: string; expiresAt: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // AI Bio Assistant State
  const [generatingBio, setGeneratingBio] = useState(false);
  const [aiBioResult, setAiBioResult] = useState<{ bio_pt: string; bio_en: string; bio_es: string } | null>(null);

  // Private Document Upload State (in Admin modal)
  const [adminDocType, setAdminDocType] = useState<string>('passport');
  const [adminDocFile, setAdminDocFile] = useState<File | null>(null);
  const [uploadingAdminDoc, setUploadingAdminDoc] = useState(false);

  // Form Field States
  // 1. Identification & Public Profile
  const [fullName, setFullName] = useState('');
  const [photo, setPhoto] = useState('');
  const [appointedDate, setAppointedDate] = useState('');
  const [editorialStatus, setEditorialStatus] = useState<AmbassadorEditorialStatus>('draft');
  const [onboardingStatus, setOnboardingStatus] = useState<AmbassadorOnboardingStatus>('novo');
  const [onboardingNotes, setOnboardingNotes] = useState('');

  // Translations (Role, Country, Specialty, Bio)
  const [formPt, setFormPt] = useState({ role: '', country: '', specialty: '', bio: '' });
  const [formEn, setFormEn] = useState({ role: '', country: '', specialty: '', bio: '' });
  const [formEs, setFormEs] = useState({ role: '', country: '', specialty: '', bio: '' });

  // 2. Private Personal Data
  const [passportNumber, setPassportNumber] = useState('');
  const [cpf, setCpf] = useState('');
  const [rgDni, setRgDni] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [address, setAddress] = useState('');
  const [curriculumSummary, setCurriculumSummary] = useState('');

  // Media Library Selection State
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaSelectorList, setMediaSelectorList] = useState<any[]>([]);
  const [loadingMediaSelector, setLoadingMediaSelector] = useState(false);
  const [mediaSelectorSearch, setMediaSelectorSearch] = useState('');
  const [uploadingPublicPhoto, setUploadingPublicPhoto] = useState(false);

  const openMediaSelector = async () => {
    setShowMediaSelector(true);
    setLoadingMediaSelector(true);
    try {
      const data = await api.getMedia();
      setMediaSelectorList(data);
    } catch (err: any) {
      error('Erro ao Carregar Mídia', err.message || 'Falha ao buscar biblioteca de mídia.');
    } finally {
      setLoadingMediaSelector(false);
    }
  };

  const handlePublicPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPublicPhoto(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const newAsset = await api.uploadMediaFile({
            fileName: file.name,
            fileData: base64String,
            mimeType: file.type,
            title: `Foto Oficial - ${fullName || 'Embaixador'}`,
            tags: ['ambassador', 'profile'],
          });
          setPhoto(newAsset.url);
          success('Sucesso!', 'Foto pública enviada e associada com sucesso.');
        } catch (err: any) {
          error('Erro no Envio', err.message || 'Falha ao enviar arquivo de foto pública.');
        } finally {
          setUploadingPublicPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      error('Erro', 'Falha ao carregar arquivo local.');
      setUploadingPublicPhoto(false);
    }
  };

  const loadAdminAmbassadors = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminAmbassadors();
      setCandidates(data);
    } catch (err: any) {
      error('Erro ao Carregar', err.message || 'Falha ao carregar registros de embaixadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminAmbassadors();
  }, []);

  const openNewModal = () => {
    setIsNew(true);
    setEditingCandidate({} as any);
    setActiveTab('public');
    setActiveLangTab('pt');
    setGeneratedLink(null);
    setAiBioResult(null);
    setAdminDocFile(null);
    setAdminDocType('passport');

    // CRITICAL: 100% EMPTY fields for new candidates (No prefilled fake data)
    setFullName('');
    setPhoto('');
    setAppointedDate(new Date().getFullYear().toString());
    setEditorialStatus('draft');
    setOnboardingStatus('novo');
    setOnboardingNotes('');

    setFormPt({ role: '', country: '', specialty: '', bio: '' });
    setFormEn({ role: '', country: '', specialty: '', bio: '' });
    setFormEs({ role: '', country: '', specialty: '', bio: '' });

    setPassportNumber('');
    setCpf('');
    setRgDni('');
    setBirthDate('');
    setBloodType('');
    setFatherName('');
    setMotherName('');
    setEmail('');
    setPhone('');
    setProfession('');
    setAddress('');
    setCurriculumSummary('');
  };

  const openEditModal = (cand: Ambassador) => {
    setIsNew(false);
    setEditingCandidate(cand);
    setActiveTab('public');
    setActiveLangTab('pt');
    setGeneratedLink(
      cand.onboardingToken
        ? {
            token: cand.onboardingToken,
            url: `${window.location.origin}/#ambassador-onboarding?token=${cand.onboardingToken}`,
            expiresAt: cand.tokenExpiresAt || '',
          }
        : null
    );
    setAiBioResult(null);
    setAdminDocFile(null);
    setAdminDocType('passport');

    setFullName(cand.fullName || cand.name || '');
    setPhoto(cand.photo || '');
    setAppointedDate(cand.appointedDate || '');
    setEditorialStatus(cand.editorialStatus || 'draft');
    setOnboardingStatus(cand.onboardingStatus || 'novo');
    setOnboardingNotes(cand.onboardingNotes || '');

    const tr = cand.translations || {};

    setFormPt({
      role: tr.pt?.role || (cand as any).rolePt || '',
      country: tr.pt?.country || (cand as any).countryPt || '',
      specialty: tr.pt?.specialty || '',
      bio: tr.pt?.bio || (cand as any).shortBiographyPt || (cand as any).bioPt || '',
    });

    setFormEn({
      role: tr.en?.role || cand.role || '',
      country: tr.en?.country || cand.country || '',
      specialty: tr.en?.specialty || cand.specialty || '',
      bio: tr.en?.bio || cand.shortBiography || cand.bio || cand.fullBiography || '',
    });

    setFormEs({
      role: tr.es?.role || (cand as any).roleEs || '',
      country: tr.es?.country || (cand as any).countryEs || '',
      specialty: tr.es?.specialty || '',
      bio: tr.es?.bio || (cand as any).shortBiographyEs || (cand as any).bioEs || '',
    });

    setPassportNumber(cand.passportNumber || '');
    setCpf(cand.cpf || '');
    setRgDni(cand.rgDni || '');
    setBirthDate(cand.birthDate || '');
    setBloodType(cand.bloodType || '');
    setFatherName(cand.fatherName || '');
    setMotherName(cand.motherName || '');
    setEmail(cand.email || '');
    setPhone(cand.phone || '');
    setProfession(cand.profession || '');
    setAddress(cand.address || '');
    setCurriculumSummary(cand.curriculumSummary || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      error('Preencha o Nome Completo', 'O nome completo do embaixador/candidato é obrigatório.');
      return;
    }

    const primaryRole = formPt.role.trim() || formEn.role.trim() || formEs.role.trim();
    const primaryCountry = formPt.country.trim() || formEn.country.trim() || formEs.country.trim();

    const translations = {
      pt: {
        role: formPt.role.trim() || primaryRole,
        country: formPt.country.trim() || primaryCountry,
        specialty: formPt.specialty.trim(),
        bio: formPt.bio.trim(),
      },
      en: {
        role: formEn.role.trim() || primaryRole,
        country: formEn.country.trim() || primaryCountry,
        specialty: formEn.specialty.trim(),
        bio: formEn.bio.trim(),
      },
      es: {
        role: formEs.role.trim() || primaryRole,
        country: formEs.country.trim() || primaryCountry,
        specialty: formEs.specialty.trim(),
        bio: formEs.bio.trim(),
      },
    };

    const payload: Partial<Ambassador> = {
      name: fullName.trim(),
      fullName: fullName.trim(),
      role: primaryRole,
      country: primaryCountry,
      photo: photo.trim(),
      specialty: formPt.specialty.trim() || formEn.specialty.trim(),
      appointedDate: appointedDate.trim(),
      editorialStatus,
      onboardingStatus,
      onboardingNotes: onboardingNotes.trim(),
      translations,
      passportNumber: passportNumber.trim(),
      cpf: cpf.trim(),
      rgDni: rgDni.trim(),
      birthDate: birthDate.trim(),
      bloodType: bloodType.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      profession: profession.trim(),
      address: address.trim(),
      curriculumSummary: curriculumSummary.trim(),
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.createAmbassador(payload);
        success('Cadastro Criado!', `O registro de ${fullName} foi inserido no sistema.`);
      } else if (editingCandidate) {
        await api.updateAmbassador(editingCandidate.id, payload);
        success('Cadastro Atualizado!', `Dados de ${fullName} foram armazenados.`);
      }

      await loadAdminAmbassadors();
      await refreshAmbassadors();
      setEditingCandidate(null);
    } catch (err: any) {
      error('Erro ao Salvar', err.message || 'Falha ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEditorialStatus = async (cand: Ambassador) => {
    if (!canEdit) return;
    const newStatus: AmbassadorEditorialStatus = cand.editorialStatus === 'published' ? 'draft' : 'published';
    try {
      await api.updateAmbassador(cand.id, { editorialStatus: newStatus });
      success(
        newStatus === 'published' ? 'Perfil Publicado!' : 'Perfil Ocultado!',
        `O perfil de ${cand.fullName || cand.name} agora está ${newStatus === 'published' ? 'público no site' : 'como rascunho privado'}.`
      );
      await loadAdminAmbassadors();
      await refreshAmbassadors();
    } catch (err: any) {
      error('Erro ao alterar status', err.message);
    }
  };

  const handleDelete = async (cand: Ambassador) => {
    if (!canDelete) {
      error('Acesso Negado', 'Permissão insuficiente para excluir embaixadores.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${cand.fullName || cand.name}?`)) return;

    try {
      await api.deleteAmbassador(cand.id);
      success('Registro Excluído', 'O cadastro foi removido com sucesso.');
      await loadAdminAmbassadors();
      await refreshAmbassadors();
    } catch (err: any) {
      error('Erro ao Excluir', err.message);
    }
  };

  const handleGenerateLink = async () => {
    if (!editingCandidate?.id) return;
    try {
      const res = await api.generateOnboardingLink(editingCandidate.id);
      setGeneratedLink(res);
      setOnboardingStatus('link_enviado');
      success('Link Gerado com Sucesso!', 'O link seguro de onboarding foi criado e ativado.');
      await loadAdminAmbassadors();
    } catch (err: any) {
      error('Erro ao Gerar Link', err.message);
    }
  };

  const handleRevokeLink = async () => {
    if (!editingCandidate?.id) return;
    try {
      await api.revokeOnboardingLink(editingCandidate.id);
      setGeneratedLink(null);
      success('Link Revogado!', 'O acesso via token externo foi cancelado.');
      await loadAdminAmbassadors();
    } catch (err: any) {
      error('Erro ao Revogar Link', err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    success('Copiado!', 'Link de onboarding copiado para a área de transferência.');
  };

  const handleGenerateBioAI = async () => {
    setGeneratingBio(true);
    try {
      const res = await api.generateBioAI({
        name: fullName,
        profession,
        experience: curriculumSummary,
        curriculumSummary,
      });

      setAiBioResult(res);
      success('Biografia Gerada com Sucesso!', 'A IA elaborou uma sugestão institucional. Revise antes de publicar.');
    } catch (err: any) {
      error('Erro na IA', err.message || 'Falha ao gerar sugestão de biografia.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const applyAiBioToForm = () => {
    if (!aiBioResult) return;
    setFormPt((prev) => ({ ...prev, bio: aiBioResult.bio_pt }));
    setFormEn((prev) => ({ ...prev, bio: aiBioResult.bio_en }));
    setFormEs((prev) => ({ ...prev, bio: aiBioResult.bio_es }));
    success('Biografia Aplicada!', 'A sugestão da IA foi copiada para os campos de perfil em 3 idiomas.');
  };

  const handleAdminDocumentUpload = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!adminDocFile || !editingCandidate?.id) return;

    setUploadingAdminDoc(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const newDoc = await api.uploadAdminPrivateDocument(editingCandidate.id, {
            type: adminDocType,
            fileName: adminDocFile.name,
            fileData: base64Data,
            mimeType: adminDocFile.type,
            fileSize: adminDocFile.size,
          });

          success('Documento Anexado!', `O arquivo "${adminDocFile.name}" foi salvo na pasta privada do candidato.`);
          setAdminDocFile(null);
          
          // Update local state immediately for better UX
          setEditingCandidate(prev => prev ? {
            ...prev,
            documents: [...(prev.documents || []), newDoc]
          } : null);

          await loadAdminAmbassadors();
        } catch (err: any) {
          error('Erro no Upload', err.message);
        } finally {
          setUploadingAdminDoc(false);
        }
      };
      reader.readAsDataURL(adminDocFile);
    } catch (err: any) {
      error('Erro de Leitura', 'Não foi possível ler o arquivo.');
      setUploadingAdminDoc(false);
    }
  };

  const handleDeleteAdminDocument = async (docId: string) => {
    if (!editingCandidate?.id) return;
    if (!window.confirm('Deseja excluir este documento privado?')) return;

    try {
      await api.deleteAdminPrivateDocument(editingCandidate.id, docId);
      success('Documento Excluído', 'O arquivo foi removido do armazenamento privado.');
      
      // Update local state immediately
      setEditingCandidate(prev => prev ? {
        ...prev,
        documents: (prev.documents || []).filter(d => d.id !== docId)
      } : null);

      await loadAdminAmbassadors();
    } catch (err: any) {
      error('Erro ao Excluir Documento', err.message);
    }
  };

  // Filter Logic
  const filteredCandidates = candidates.filter((c) => {
    const searchLower = search.toLowerCase();
    const nameMatch = (c.fullName || c.name || '').toLowerCase().includes(searchLower);
    const countryMatch = (c.country || '').toLowerCase().includes(searchLower);
    const roleMatch = (c.role || '').toLowerCase().includes(searchLower);
    const emailMatch = (c.email || '').toLowerCase().includes(searchLower);

    const matchesSearch = nameMatch || countryMatch || roleMatch || emailMatch;

    const matchesOnboarding =
      onboardingFilter === 'all' || (c.onboardingStatus || 'novo') === onboardingFilter;

    const matchesEditorial =
      editorialFilter === 'all' || (c.editorialStatus || 'draft') === editorialFilter;

    return matchesSearch && matchesOnboarding && matchesEditorial;
  });

  const getBadgeColorOnboarding = (status?: AmbassadorOnboardingStatus) => {
    switch (status) {
      case 'novo':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'link_enviado':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'analisando':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'pendencia':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'aguardando_publicacao':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'publicado':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getLabelOnboarding = (status?: AmbassadorOnboardingStatus) => {
    switch (status) {
      case 'novo':
        return 'Novo Cadastro';
      case 'link_enviado':
        return 'Link Enviado';
      case 'analisando':
        return 'Analisando Documentos';
      case 'pendencia':
        return 'Pendência Documental';
      case 'aguardando_publicacao':
        return 'Aguardando Publicação';
      case 'publicado':
        return 'Onboarding Concluído';
      default:
        return 'Novo Cadastro';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-heading text-slate-900 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-amber-600" /> Corpo Diplomático & Embaixadores
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão completa de onboarding, verificação documental privada, links externos seguros e status editorial.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openNewModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Novo Embaixador</span>
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de Cadastros</p>
          <p className="text-2xl font-bold text-slate-900">{candidates.length}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Em Onboarding / Análise</p>
          <p className="text-2xl font-bold text-amber-600">
            {candidates.filter((c) => (c.onboardingStatus || 'novo') !== 'publicado').length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Publicados no Site</p>
          <p className="text-2xl font-bold text-emerald-600">
            {candidates.filter((c) => c.editorialStatus === 'published').length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Links Externos Ativos</p>
          <p className="text-2xl font-bold text-purple-600">
            {candidates.filter((c) => c.tokenStatus === 'active').length}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, país, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Onboarding Status Filter */}
          <select
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">Status Onboarding: Todos</option>
            <option value="novo">Novo Cadastro</option>
            <option value="link_enviado">Link Enviado</option>
            <option value="analisando">Analisando Documentos</option>
            <option value="pendencia">Com Pendências</option>
            <option value="aguardando_publicacao">Aguardando Publicação</option>
            <option value="publicado">Onboarding Concluído</option>
          </select>

          {/* Editorial Status Filter */}
          <select
            value={editorialFilter}
            onChange={(e) => setEditorialFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">Visibilidade Editorial: Todos</option>
            <option value="draft">Rascunho (Privado)</option>
            <option value="published">Publicado (No Site)</option>
          </select>
        </div>
      </div>

      {/* Candidate List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Carregando registros do corpo diplomático...</div>
      ) : filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs space-y-2">
          <Users2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">Nenhum registro localizado</p>
          <p className="text-slate-400">Tente ajustar os filtros de busca ou crie um novo cadastro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((cand) => {
            const displayName = cand.fullName || cand.name || 'Candidato sem identificação';
            const pct = cand.completionPercentage || 0;
            const pendingCount = (cand.pendingItems || []).length;

            return (
              <div
                key={cand.id}
                className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColorOnboarding(
                        cand.onboardingStatus
                      )}`}
                    >
                      {getLabelOnboarding(cand.onboardingStatus)}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        cand.editorialStatus === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {cand.editorialStatus === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>

                  {/* Header Info */}
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        cand.photo ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200'
                      }
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/20 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate font-serif-heading">
                        {displayName}
                      </h3>
                      <p className="text-xs text-amber-700 font-medium truncate">
                        {cand.role || 'Cargo não informado'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{cand.country || 'País não informado'}</p>
                    </div>
                  </div>

                  {/* Onboarding Completion Progress */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Progresso Documental</span>
                      <span className="font-bold text-slate-800">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {pendingCount > 0 ? (
                      <p className="text-[10px] text-amber-600 font-medium">
                        {pendingCount} item(ns) pendente(s) no cadastro
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Requisitos documentais completos
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(cand)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar / Ficha
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={cand.editorialStatus === 'published' ? 'Despublicar do site' : 'Publicar no site'}
                      onClick={() => handleToggleEditorialStatus(cand)}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        title="Excluir cadastro"
                        onClick={() => handleDelete(cand)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor / Onboarding Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between gap-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-serif-heading text-white">
                    {isNew ? 'Registrar Novo Embaixador' : `Ficha de Onboarding: ${fullName || 'Candidato'}`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ID Imutável: <span className="font-mono text-amber-400">{editingCandidate.id || 'NOVO'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex items-center gap-2 overflow-x-auto text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('public')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'public'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Globe2 className="w-4 h-4" /> Perfil Público & Idiomas
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('private')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'private'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Lock className="w-4 h-4" /> Dados Pessoais Privados
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'docs'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Upload className="w-4 h-4" /> Documentos Privados ({editingCandidate.documents?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'link'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Link className="w-4 h-4" /> Link de Onboarding
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'ai'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Biografia por IA
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'status'
                    ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <FileCheck className="w-4 h-4" /> Status Onboarding & Pendências
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: Public Profile & Languages */}
              {activeTab === 'public' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nome Completo do Embaixador / Candidato <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Dr. Fernando Silva"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                        Foto Pública do Embaixador (Oficial)
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="relative w-20 h-20 bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shrink-0">
                          <img
                            src={photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200'}
                            alt="Preview Pública"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200';
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={photo}
                              onChange={(e) => setPhoto(e.target.value)}
                              placeholder="/media/leadership/nome.png"
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              key="btn-open-selector"
                              type="button"
                              onClick={openMediaSelector}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                              <span>Escolher da Biblioteca de Mídia</span>
                            </button>

                            <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingPublicPhoto ? 'Enviando...' : 'Enviar Nova Foto Pública'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePublicPhotoUpload}
                                className="hidden"
                                disabled={uploadingPublicPhoto}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            A foto pública oficial é exibida no cartão do embaixador e no portal público da ADMIR. Não confunda com documentos privados anexados.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Ano de Nomeação Diplomática</label>
                      <input
                        type="text"
                        value={appointedDate}
                        onChange={(e) => setAppointedDate(e.target.value)}
                        placeholder="Ex: 2024"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Status Editorial (Visibilidade)</label>
                      <select
                        value={editorialStatus}
                        onChange={(e) => setEditorialStatus(e.target.value as AmbassadorEditorialStatus)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      >
                        <option value="draft">Rascunho (NÃO aparece no site público)</option>
                        <option value="published">PUBLICADO (Visível no site público)</option>
                      </select>
                    </div>
                  </div>

                  {/* Language Selector Sub-tabs */}
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Languages className="w-4 h-4 text-amber-600" /> Traduções Institucionais do Perfil
                      </label>

                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLangTab(lang)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                              activeLangTab === lang
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language Form Fields */}
                    {activeLangTab === 'pt' && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Cargo Diplomático (PT)</label>
                            <input
                              type="text"
                              value={formPt.role}
                              onChange={(e) => setFormPt({ ...formPt, role: e.target.value })}
                              placeholder="Ex: Enviado Especial para a Paz"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">País / Delegação (PT)</label>
                            <input
                              type="text"
                              value={formPt.country}
                              onChange={(e) => setFormPt({ ...formPt, country: e.target.value })}
                              placeholder="Ex: Brasil"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Especialidade (PT)</label>
                            <input
                              type="text"
                              value={formPt.specialty}
                              onChange={(e) => setFormPt({ ...formPt, specialty: e.target.value })}
                              placeholder="Ex: Direitos Humanos e Diplomacia"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Biografia Institucional (PT)</label>
                          <textarea
                            rows={4}
                            value={formPt.bio}
                            onChange={(e) => setFormPt({ ...formPt, bio: e.target.value })}
                            placeholder="Biografia diplomática exibida no perfil público em português..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {activeLangTab === 'en' && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Diplomatic Role (EN)</label>
                            <input
                              type="text"
                              value={formEn.role}
                              onChange={(e) => setFormEn({ ...formEn, role: e.target.value })}
                              placeholder="Ex: Special Envoy for Peace"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Country / Delegation (EN)</label>
                            <input
                              type="text"
                              value={formEn.country}
                              onChange={(e) => setFormEn({ ...formEn, country: e.target.value })}
                              placeholder="Ex: United States"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Specialty (EN)</label>
                            <input
                              type="text"
                              value={formEn.specialty}
                              onChange={(e) => setFormEn({ ...formEn, specialty: e.target.value })}
                              placeholder="Ex: Human Rights & Diplomacy"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Institutional Biography (EN)</label>
                          <textarea
                            rows={4}
                            value={formEn.bio}
                            onChange={(e) => setFormEn({ ...formEn, bio: e.target.value })}
                            placeholder="Institutional biography shown in English..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {activeLangTab === 'es' && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Cargo Diplomático (ES)</label>
                            <input
                              type="text"
                              value={formEs.role}
                              onChange={(e) => setFormEs({ ...formEs, role: e.target.value })}
                              placeholder="Ex: Enviado Especial para la Paz"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">País / Delegación (ES)</label>
                            <input
                              type="text"
                              value={formEs.country}
                              onChange={(e) => setFormEs({ ...formEs, country: e.target.value })}
                              placeholder="Ex: Estados Unidos"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Especialidad (ES)</label>
                            <input
                              type="text"
                              value={formEs.specialty}
                              onChange={(e) => setFormEs({ ...formEs, specialty: e.target.value })}
                              placeholder="Ex: Derechos Humanos y Diplomacia"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Biografía Institucional (ES)</label>
                          <textarea
                            rows={4}
                            value={formEs.bio}
                            onChange={(e) => setFormEs({ ...formEs, bio: e.target.value })}
                            placeholder="Biografía institucional en español..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Private Personal Data */}
              {activeTab === 'private' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Armazenamento Restrito Diplomático</p>
                      <p className="mt-0.5">
                        Estes dados são estritamente confidenciais. Eles JAMAIS são expostos na API pública ou no website.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Passaporte Internacional</label>
                      <input
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                        placeholder="Número do passaporte"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">CPF</label>
                      <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">RG / DNI</label>
                      <input
                        type="text"
                        value={rgDni}
                        onChange={(e) => setRgDni(e.target.value)}
                        placeholder="Documento de identidade"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Data de Nascimento</label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Tipo Sanguíneo</label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      >
                        <option value="">Não informado</option>
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
                      <label className="text-xs font-semibold text-slate-700">E-mail Direto</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+55 (00) 00000-0000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Nome do Pai</label>
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Nome do pai"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Nome da Mãe</label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Nome da mãe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Profissão / Função Atual</label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Ex: Jurista Internacional, Professor"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Endereço Residencial Completo</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Endereço, cidade, estado, CEP e país"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Resumo Curricular do Candidato</label>
                      <textarea
                        rows={4}
                        value={curriculumSummary}
                        onChange={(e) => setCurriculumSummary(e.target.value)}
                        placeholder="Histórico completo fornecido pelo candidato para elaboração da biografia institucional..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Private Documents */}
              {activeTab === 'docs' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Anexar Documento Privado no Armazenamento Seguro
                    </h3>

                    {isNew ? (
                      <p className="text-xs text-slate-400 italic">
                        Salve o cadastro básico primeiro para habilitar o anexo de arquivos seguros.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-300">Tipo de Documento</label>
                          <select
                            value={adminDocType}
                            onChange={(e) => setAdminDocType(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="photo">Fotografia Privada</option>
                            <option value="passport">Passaporte</option>
                            <option value="cpf">CPF</option>
                            <option value="rg">RG / DNI</option>
                            <option value="blood_type">Comprovante Sanguíneo</option>
                            <option value="curriculum">Currículo PDF/DOC</option>
                            <option value="other">Outro Documento</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-300">Arquivo do Computador</label>
                          <input
                            key={editingCandidate?.id || 'new'}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setAdminDocFile(file);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-600 file:text-white"
                          />
                          {adminDocFile && (
                            <p className="text-[10px] text-amber-400 truncate mt-1 animate-pulse">
                              Arquivo pronto: {adminDocFile.name} ({Math.round(adminDocFile.size / 1024)} KB)
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleAdminDocumentUpload()}
                            disabled={uploadingAdminDoc || !adminDocFile}
                            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            {uploadingAdminDoc ? 'Enviando...' : 'Fazer Upload Seguro'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* List of Private Documents */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Documentos Anexados ({editingCandidate.documents?.length || 0})
                    </h3>

                    {(!editingCandidate.documents || editingCandidate.documents.length === 0) ? (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        Nenhum documento privado foi enviado ainda para este candidato.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {editingCandidate.documents.map((doc: PrivateDocument) => (
                          <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {doc.originalName || doc.fileName}
                                </p>
                                <p className="text-[11px] text-slate-500 capitalize">
                                  Tipo: <span className="font-semibold">{doc.type}</span> — Enviado em:{' '}
                                  {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/api/ambassadors/${editingCandidate.id}/documents/${doc.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Seguro</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDeleteAdminDocument(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Onboarding External Link */}
              {activeTab === 'link' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Link className="w-4 h-4" /> Link Seguro de Preenchimento Externo
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          generatedLink
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {generatedLink ? 'Token Ativo' : 'Não Gerado'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Gere um link protegido por token aleatório para enviar ao candidato. O candidato poderá preencher seus próprios dados pessoais e anexar passaporte/CPF sem ter acesso ao painel CMS.
                    </p>

                    {generatedLink ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <input
                            type="text"
                            readOnly
                            value={generatedLink.url}
                            className="flex-1 bg-transparent text-xs font-mono text-amber-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(generatedLink.url)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? 'Copiado' : 'Copiar URL'}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Token: <strong className="text-slate-200 font-mono">{generatedLink.token}</strong></span>
                          <span>Válido até: <strong className="text-slate-200">{new Date(generatedLink.expiresAt).toLocaleDateString()}</strong></span>
                        </div>

                        <button
                          type="button"
                          onClick={handleRevokeLink}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          Revogar Acesso do Link
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isNew}
                        onClick={handleGenerateLink}
                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>{isNew ? 'Salve o registro básico antes' : 'Gerar Link Seguro de Onboarding'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AI Biography Assistant */}
              {activeTab === 'ai' && (
                <div className="space-y-6 font-sans">
                  <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold font-serif-heading text-white">
                          Assistente de Redação Diplomática por IA
                        </h3>
                        <p className="text-xs text-slate-400">
                          Gera sugestões de biografias institucionais sobriedade profissional baseadas no resumo curricular.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-300">
                      <strong>Diretriz Estrita de Fidedignidade:</strong> A IA utiliza exclusivamente os dados fornecidos no resumo curricular. Não são inventados títulos ou distinções. A publicação depende de aprovação do administrador.
                    </div>

                    <button
                      type="button"
                      disabled={generatingBio}
                      onClick={handleGenerateBioAI}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{generatingBio ? 'Elaborando Sugestão com IA...' : 'Gerar Biografia Diplomática (3 Idiomas)'}</span>
                    </button>
                  </div>

                  {aiBioResult && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Sugestão Elaborada pela IA
                        </span>
                        <button
                          type="button"
                          onClick={applyAiBioToForm}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprovar e Copiar para o Perfil</span>
                        </button>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-700 uppercase">Português (PT):</span>
                          <p className="text-slate-800 leading-relaxed">{aiBioResult.bio_pt}</p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-700 uppercase">Inglês (EN):</span>
                          <p className="text-slate-800 leading-relaxed">{aiBioResult.bio_en}</p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-700 uppercase">Espanhol (ES):</span>
                          <p className="text-slate-800 leading-relaxed">{aiBioResult.bio_es}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Onboarding Status & Checklist */}
              {activeTab === 'status' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Status de Progresso do Processo de Onboarding
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Etapa de Onboarding</label>
                        <select
                          value={onboardingStatus}
                          onChange={(e) => setOnboardingStatus(e.target.value as AmbassadorOnboardingStatus)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="novo">Novo Cadastro</option>
                          <option value="link_enviado">Link Enviado</option>
                          <option value="analisando">Analisando Documentos</option>
                          <option value="pendencia">Com Pendências</option>
                          <option value="aguardando_publicacao">Aguardando Publicação</option>
                          <option value="publicado">Onboarding Concluído</option>
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Notas de Pendência / Orientações ao Candidato</label>
                        <textarea
                          rows={3}
                          value={onboardingNotes}
                          onChange={(e) => setOnboardingNotes(e.target.value)}
                          placeholder="Observações da Secretaria Executiva sobre documentos faltantes ou inconsistências..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
 
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Ficha do Embaixador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA SELECTOR MODAL */}
      {showMediaSelector && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold font-serif-heading text-slate-900">
                  Selecionar Foto da Biblioteca de Mídia
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecione uma imagem pública homologada para a fotografia oficial do Embaixador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-200/50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="px-5 py-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por título ou tag..."
                  value={mediaSelectorSearch}
                  onChange={(e) => setMediaSelectorSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-slate-50"
                />
              </div>
            </div>

            {/* Content grid */}
            <div className="p-5 overflow-y-auto flex-1 min-h-[300px]">
              {loadingMediaSelector ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Carregando mídias públicas...</span>
                </div>
              ) : (
                (() => {
                  const filteredList = mediaSelectorList.filter((m) => {
                    const term = mediaSelectorSearch.toLowerCase();
                    return (
                      (m.title || '').toLowerCase().includes(term) ||
                      (m.originalName || '').toLowerCase().includes(term) ||
                      (m.tags || []).some((t: string) => t.toLowerCase().includes(term))
                    );
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                        <span>Nenhuma imagem correspondente localizada na biblioteca.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {filteredList.map((item) => {
                        const isSelected = photo === item.url;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setPhoto(item.url);
                              setShowMediaSelector(false);
                            }}
                            className={`group relative text-left rounded-xl overflow-hidden border bg-slate-50 transition-all ${
                              isSelected
                                ? 'border-amber-500 ring-2 ring-amber-500/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                              <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200';
                                }}
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-amber-600/10 flex items-center justify-center backdrop-blur-[1px]">
                                  <div className="bg-amber-600 text-white p-1 rounded-full shadow-sm">
                                    <Check className="w-4 h-4 font-bold" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="p-2.5 space-y-1">
                              <h4 className="font-bold text-[10px] text-slate-900 truncate">
                                {item.title || item.originalName}
                              </h4>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {item.tags.slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} className="text-[8px] bg-slate-200/60 text-slate-600 px-1 py-0.2 rounded">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowMediaSelector(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
