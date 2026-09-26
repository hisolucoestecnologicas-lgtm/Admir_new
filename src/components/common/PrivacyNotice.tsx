import React, { useState, useEffect } from 'react';
import { Lock, Shield, ShieldCheck, X, FileText, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';

export type PrivacyContextType =
  | 'ambassador_private_data'
  | 'ambassador_docs'
  | 'ambassador_onboarding'
  | 'donations'
  | 'admin_users'
  | 'contact'
  | 'general';

interface PrivacyNoticeProps {
  context?: PrivacyContextType;
  theme?: 'light' | 'dark';
  variant?: 'banner' | 'compact' | 'inline';
  className?: string;
  customPurpose?: string;
  customCategories?: string[];
  hasSensitiveData?: boolean;
}

interface ContextConfig {
  contextName: string;
  purpose: string;
  dataCategories: string[];
  sensitiveDataNote: string | null;
  legalBases: string[];
  sharing: string;
  retention: string;
}

const CONTEXT_DETAILS: Record<PrivacyContextType, ContextConfig> = {
  ambassador_private_data: {
    contextName: 'Dados Pessoais Privados de Embaixadores e Candidatos',
    purpose:
      'Identificação diplomática oficial, emissão de credenciais institucionais, validação cadastral para missões internacionais e histórico funcional na ADMIR.',
    dataCategories: [
      'Identificação civil e internacional (Passaporte, CPF, RG ou DNI estrangeiro)',
      'Dados de qualificação (Data de nascimento, filiação: nome do pai e nome da mãe)',
      'Contato e localização (Telefone, e-mail e endereço residencial completo)',
      'Perfil profissional e histórico curricular detalhado',
    ],
    sensitiveDataNote:
      'Inclui dados classificados como sensíveis pela LGPD (Art. 5º, II): tipo sanguíneo e fator Rh (essenciais para missões diplomáticas e de ajuda humanitária em áreas remotas ou de risco), além de cópias de documentos oficiais contendo filiação e dados biométricos/fotográficos.',
    legalBases: [
      'Execução de procedimentos preliminares relacionados ao vínculo institucional e estatutário com a ADMIR (Art. 7º, V da LGPD)',
      'Cumprimento de obrigação legal ou regulatória perante autoridades governamentais e diplomáticas (Art. 7º, II da LGPD)',
      'Tratamento de dados sensíveis indispensável para a proteção da vida ou incolumidade física do titular em missões humanitárias (Art. 11, II, "e" da LGPD) e execução estatutária (Art. 11, II, "d")',
    ],
    sharing:
      'Os dados não são comercializados nem divulgados publicamente. O compartilhamento é restrito a missões consulares, órgãos governamentais de imigração ou segurança de Estado estritamente quando indispensável para a atuação diplomática oficial ou por ordem judicial expressa.',
    retention:
      'Mantidos durante a vigência do vínculo institucional ou representação diplomática e, após seu encerramento, pelo prazo prescricional e legal aplicável para guarda de arquivos históricos institucionais.',
  },
  ambassador_docs: {
    contextName: 'Armazenamento Seguro de Documentos Pessoais',
    purpose:
      'Comprovação de identidade civil e internacional, verificação de idoneidade, validação de competência técnica para representação diplomática e custódia segura de dossiês documentais.',
    dataCategories: [
      'Cópias digitalizadas de passaportes e vistos consulares',
      'Documentos nacionais de identidade (RG, DNI, CPF)',
      'Comprovantes de residência e domicílio fiscal',
      'Laudos ou certidões de tipo sanguíneo',
      'Diplomas acadêmicos, certidões e currículos documentados',
    ],
    sensitiveDataNote:
      'Os arquivos anexados podem conter dados pessoais sensíveis (exames médicos/sanguíneos e fotografias biométricas de identificação). O armazenamento é segregado em repositório privado com regras restritas de acesso no servidor ("deny-by-default"), isolado integralmente do repositório de mídia pública.',
    legalBases: [
      'Cumprimento de exigências institucionais e regulatórias de credenciamento diplomático (Art. 7º, II da LGPD)',
      'Execução de procedimentos institucionais para formalização de representação oficial (Art. 7º, V da LGPD)',
      'Tratamento de dados sensíveis de saúde para salvaguarda em operações humanitárias (Art. 11, II, "e" da LGPD)',
    ],
    sharing:
      'Acesso restrito exclusivamente a administradores autorizados com perfil de gestão. Não há indexação em motores de busca, nem exposição em URLs públicas ou APIs abertas.',
    retention:
      'Custodiados em conformidade com as diretrizes do arquivo institucional permanente da ADMIR, com possibilidade de eliminação ou expurgo seguro mediante solicitação do titular e inexistência de obrigação legal de guarda.',
  },
  ambassador_onboarding: {
    contextName: 'Ficha de Ingresso & Onboarding de Candidato a Embaixador',
    purpose:
      'Recepção da candidatura diplomática, conferência documental pela Secretaria Executiva, avaliação de elegibilidade e formalização do processo de admissão na ADMIR.',
    dataCategories: [
      'Dados de identificação e contato (Nome completo, passaporte, CPF, RG/DNI, e-mail, telefone)',
      'Dados familiares e de nascimento (Data de nascimento, nome do pai e nome da mãe)',
      'Dados de localização e ocupação (Endereço completo, profissão e resumo curricular)',
      'Documentos comprobatórios digitalizados em anexo',
    ],
    sensitiveDataNote:
      'Informações de saúde (tipo sanguíneo) e fotos de documentos oficiais com biometria facial são tratadas com cautela redobrada, armazenadas exclusivamente em ambiente com controle de acesso estrito e protegidas por token individual criptográfico e revogável.',
    legalBases: [
      'Procedimentos preliminares a vínculo institucional formal solicitados pelo próprio titular (Art. 7º, V da LGPD)',
      'Legítimo interesse institucional na verificação de idoneidade para funções de representação internacional (Art. 7º, IX da LGPD)',
      'Salvaguarda da integridade física do titular e execução estatutária para dados sensíveis (Art. 11 da LGPD)',
    ],
    sharing:
      'O link de acesso ao onboarding possui chave criptográfica única, de uso individual. Os dados são acessíveis apenas pelo candidato e pela equipe de auditoria e admissão da ADMIR.',
    retention:
      'Durante o processo de seleção e, em caso de ingresso efetivo, incorporados ao dossiê de Embaixador. Em caso de não admissão, os dados são descartados de forma segura após o encerramento do processo.',
  },
  donations: {
    contextName: 'Registro e Gestão de Contribuições e Doações',
    purpose:
      'Processamento de repasses humanitários, emissão de recibos fiscais/contábeis, prestação de contas institucional e prevenção à lavagem de dinheiro.',
    dataCategories: [
      'Nome completo ou razão social do doador',
      'Endereço de e-mail e dados de contato',
      'Identificador da transação financeira, valor, moeda, data e causa selecionada',
      'Mensagens ou dedicatórias voluntárias inseridas pelo doador',
    ],
    sensitiveDataNote:
      'Não há coleta de dados sensíveis na operação de doação. Dados integrais de cartão de crédito e senhas financeiras NUNCA são armazenados pela ADMIR — o processamento é conduzido diretamente por gateways de pagamento certificados (PCI-DSS).',
    legalBases: [
      'Execução de contrato/transação de doação e cumprimento das obrigações assumidas com o doador (Art. 7º, V da LGPD)',
      'Cumprimento de obrigações legais, fiscais e regulatórias de contabilidade perante os órgãos de controle (Art. 7º, II da LGPD)',
      'Legítimo interesse para envio de comprovantes e informativos de prestação de contas (Art. 7º, IX da LGPD)',
    ],
    sharing:
      'Compartilhamento necessário e restrito com instituições financeiras e processadores de pagamento homologados, além de órgãos de auditoria contábil e fiscal quando exigido por lei.',
    retention:
      'Os registros de doação são mantidos pelos prazos exigidos pela legislação contábil, fiscal e regulatória aplicável a entidades sem fins lucrativos e missões diplomáticas.',
  },
  admin_users: {
    contextName: 'Gestão de Usuários e Acessos Administrativos (CMS)',
    purpose:
      'Controle de segurança do painel administrativo, concessão de acessos por privilégio mínimo (RBAC), auditoria de operações e autenticação segura via Firebase/Auth.',
    dataCategories: [
      'Nome institucional do colaborador ou administrador',
      'E-mail corporativo ou oficial de autenticação',
      'Identificador único de autenticação (Firebase Auth UID)',
      'Papel administrativo (Role) e matriz de permissões granulares',
      'Registros de data/hora de login, convites emitidos e logs de auditoria de ações',
    ],
    sensitiveDataNote: null,
    legalBases: [
      'Execução de obrigações estatutárias e institucionais com a ADMIR (Art. 7º, V da LGPD)',
      'Legítimo interesse na segurança da informação, integridade dos sistemas e prevenção a fraudes (Art. 7º, IX da LGPD)',
      'Cumprimento de obrigação legal de guarda de logs e trilhas de auditoria (Art. 7º, II da LGPD e Marco Civil da Internet)',
    ],
    sharing:
      'Restrito à infraestrutura interna de controle e provedores seguros de autenticação em nuvem (Firebase). Sem qualquer divulgação pública ou compartilhamento externo.',
    retention:
      'Os dados cadastrais são mantidos enquanto o usuário mantiver vínculo ativo. Logs de auditoria são conservados pelo período legal para fins de rastreabilidade de segurança.',
  },
  contact: {
    contextName: 'Canais de Contato, Parcerias e Voluntariado',
    purpose:
      'Atendimento a solicitações institucionais, esclarecimento de dúvidas, análise de propostas de voluntariado e estabelecimento de parcerias humanitárias.',
    dataCategories: [
      'Nome completo',
      'E-mail institucional ou pessoal de resposta',
      'Telefone de contato (quando fornecido)',
      'Organização, país de residência e mensagem/proposta enviada',
    ],
    sensitiveDataNote: null,
    legalBases: [
      'Procedimentos preliminares a pedido do titular para atendimento à solicitação (Art. 7º, V da LGPD)',
      'Legítimo interesse da instituição em responder adequadamente às comunicações recebidas (Art. 7º, IX da LGPD)',
    ],
    sharing:
      'As mensagens são encaminhadas unicamente à equipe interna responsável pelo departamento pertinente ao assunto (Relações Institucionais, Voluntariado ou Secretaria).',
    retention:
      'Mantidos pelo tempo necessário para resolução da demanda e histórico de comunicações diplomáticas.',
  },
  general: {
    contextName: 'Tratamento Geral de Dados Pessoais na ADMIR',
    purpose:
      'Desenvolvimento e sustentação das atividades humanitárias, diplomáticas e institucionais da ADMIR em estrita consonância com a legislação de proteção de dados.',
    dataCategories: [
      'Dados cadastrais e identificadores necessários à finalidade específica informada ao titular no momento da coleta',
    ],
    sensitiveDataNote: null,
    legalBases: [
      'Bases legais aplicáveis previstas nos Arts. 7º e 11 da Lei nº 13.709/2018 (LGPD), incluindo cumprimento de obrigações legais, execução estatutária e legítimo interesse institucional.',
    ],
    sharing:
      'Não há compartilhamento para fins comerciais. Transferências ocorrem unicamente mediante respaldo legal específico ou obrigação de autoridades governamentais.',
    retention:
      'Guardados apenas pelo período estritamente necessário ao atendimento das finalidades informadas e cumprimento de deveres legais de preservação de registros.',
  },
};

export function PrivacyNotice({
  context = 'general',
  theme = 'light',
  variant = 'banner',
  className = '',
  customPurpose,
  customCategories,
  hasSensitiveData,
}: PrivacyNoticeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const config = CONTEXT_DETAILS[context] || CONTEXT_DETAILS.general;

  // Visual styles by theme and variant
  const isDark = theme === 'dark';

  if (variant === 'inline') {
    return (
      <>
        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} ${className}`}>
          <Lock className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>Tratamento em conformidade com a LGPD (Lei nº 13.709/2018).</span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`font-semibold underline hover:no-underline cursor-pointer ${
              isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
            }`}
          >
            Saiba mais sobre Privacidade e LGPD
          </button>
        </div>

        {modalOpen && (
          <PrivacyLGPDModal
            context={context}
            config={config}
            onClose={() => setModalOpen(false)}
            customPurpose={customPurpose}
            customCategories={customCategories}
            hasSensitiveData={hasSensitiveData}
          />
        )}
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div
          className={`rounded-2xl p-4 border flex items-start gap-3 text-xs ${
            isDark
              ? 'bg-slate-900/90 border-slate-700/80 text-slate-300'
              : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
          } ${className}`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5 font-bold tracking-wide text-[11px] uppercase">
              <span className={isDark ? 'text-amber-400' : 'text-amber-900'}>
                PRIVACIDADE E PROTEÇÃO DE DADOS — LGPD
              </span>
            </div>
            <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Os dados pessoais informados nesta área são tratados de acordo com a Lei nº 13.709/2018 (LGPD),
              exclusivamente para as finalidades institucionais informadas ao titular e demais hipóteses legais aplicáveis.
              O acesso é restrito a pessoas autorizadas, com aplicação de medidas técnicas e administrativas de segurança.
              Os dados não serão disponibilizados publicamente ou compartilhados com terceiros, salvo quando necessário
              para a finalidade informada, mediante base legal aplicável ou por obrigação legal ou regulatória.
            </p>
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={`inline-flex items-center gap-1 text-[11px] font-bold underline hover:no-underline transition-colors cursor-pointer ${
                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <span>Saiba mais sobre Privacidade e LGPD</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {modalOpen && (
          <PrivacyLGPDModal
            context={context}
            config={config}
            onClose={() => setModalOpen(false)}
            customPurpose={customPurpose}
            customCategories={customCategories}
            hasSensitiveData={hasSensitiveData}
          />
        )}
      </>
    );
  }

  // Standard Banner Variant
  return (
    <>
      <div
        className={`rounded-2xl p-4 sm:p-5 border flex items-start gap-3 sm:gap-4 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-200'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        } ${className}`}
      >
        <div
          className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-800'
          }`}
        >
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-bold tracking-wide text-xs uppercase flex items-center gap-1.5 ${
                isDark ? 'text-amber-400' : 'text-amber-900'
              }`}
            >
              PRIVACIDADE E PROTEÇÃO DE DADOS — LGPD
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-amber-200/60 text-amber-900'
              }`}
            >
              Lei Federal nº 13.709/2018
            </span>
          </div>

          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Os dados pessoais informados nesta área são tratados de acordo com a Lei nº 13.709/2018 (LGPD),
            exclusivamente para as finalidades institucionais informadas ao titular e demais hipóteses legais aplicáveis. O
            acesso é restrito a pessoas autorizadas, com aplicação de medidas técnicas e administrativas de segurança. Os
            dados não serão disponibilizados publicamente ou compartilhados com terceiros, salvo quando necessário para a
            finalidade informada, mediante base legal aplicável ou por obrigação legal ou regulatória.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold underline hover:no-underline transition-colors cursor-pointer ${
                isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <span>Saiba mais sobre Privacidade e LGPD</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <PrivacyLGPDModal
          context={context}
          config={config}
          onClose={() => setModalOpen(false)}
          customPurpose={customPurpose}
          customCategories={customCategories}
          hasSensitiveData={hasSensitiveData}
        />
      )}
    </>
  );
}

interface PrivacyLGPDModalProps {
  context: PrivacyContextType;
  config: ContextConfig;
  onClose: () => void;
  customPurpose?: string;
  customCategories?: string[];
  hasSensitiveData?: boolean;
}

export function PrivacyLGPDModal({
  config,
  onClose,
  customPurpose,
  customCategories,
  hasSensitiveData,
}: PrivacyLGPDModalProps) {
  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const purpose = customPurpose || config.purpose;
  const categories = customCategories || config.dataCategories;
  const hasSens = hasSensitiveData !== undefined ? hasSensitiveData : Boolean(config.sensitiveDataNote);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 text-slate-900 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Lock className="w-3 h-3" />
              <span>Conformidade Legal Institucional</span>
            </div>
            <h2 id="privacy-modal-title" className="text-xl sm:text-2xl font-bold font-serif-heading">
              Privacidade e Proteção de Dados
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Os dados pessoais tratados por este sistema devem observar a Lei nº 13.709/2018 — Lei Geral de Proteção de
              Dados Pessoais (LGPD).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-xs leading-relaxed text-slate-700 divide-y divide-slate-100">
          {/* Context Badge */}
          <div className="pb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Área em Análise: {config.contextName}</span>
            </div>
          </div>

          {/* Section 1: Finalidade do tratamento */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                1
              </span>
              Finalidade do Tratamento
            </h3>
            <p className="text-slate-600 pl-7">{purpose}</p>
          </div>

          {/* Section 2: Dados tratados */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              Dados Tratados
            </h3>
            <ul className="space-y-1.5 pl-7">
              {categories.map((cat, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                  <span>{cat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Dados pessoais sensíveis */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                3
              </span>
              Dados Pessoais Sensíveis
            </h3>
            <div className="pl-7">
              {hasSens && config.sensitiveDataNote ? (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-1 text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Atenção: Tratamento de Dados Pessoais Sensíveis Identificado</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">{config.sensitiveDataNote}</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Esta funcionalidade não realiza tratamento rotineiro de dados pessoais sensíveis.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Base legal */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                4
              </span>
              Base Legal
            </h3>
            <div className="pl-7 space-y-2">
              <p className="text-slate-600">
                O tratamento de dados pessoais pela ADMIR fundamenta-se estritamente nas hipóteses legalmente previstas
                na Lei nº 13.709/2018 (LGPD), sem presunção de consentimento genérico quando outras bases legais forem
                aplicáveis:
              </p>
              <ul className="space-y-1.5">
                {config.legalBases.map((base, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <span>{base}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 5: Compartilhamento */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                5
              </span>
              Compartilhamento
            </h3>
            <p className="text-slate-600 pl-7">{config.sharing}</p>
          </div>

          {/* Section 6: Segurança */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                6
              </span>
              Medidas de Segurança
            </h3>
            <div className="pl-7 space-y-2 text-slate-600">
              <p>
                São adotadas medidas técnicas e administrativas destinadas à proteção dos dados pessoais contra acessos
                não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração ou difusão:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="font-bold text-slate-900 block">Controle RBAC Restrito</span>
                  <span className="text-[11px] text-slate-500">
                    Acesso restrito ao nível do servidor com privilégio mínimo e bloqueio por padrão.
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="font-bold text-slate-900 block">Isolamento de Documentos</span>
                  <span className="text-[11px] text-slate-500">
                    Segregação integral entre mídia pública e repositório de documentos privados.
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="font-bold text-slate-900 block">Trilha de Auditoria</span>
                  <span className="text-[11px] text-slate-500">
                    Registro de logs imutáveis para operações sensíveis, alterações e downloads.
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="font-bold text-slate-900 block">Criptografia em Trânsito</span>
                  <span className="text-[11px] text-slate-500">
                    Comunicações protegidas por protocolos criptográficos seguros (TLS/HTTPS).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Retenção */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                7
              </span>
              Retenção e Descarte
            </h3>
            <p className="text-slate-600 pl-7">{config.retention}</p>
          </div>

          {/* Section 8: Direitos do Titular & Canal DPO */}
          <div className="pt-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">
                8
              </span>
              Direitos do Titular & Canal de Atendimento (DPO / Encarregado)
            </h3>
            <div className="pl-7 space-y-3">
              <p className="text-slate-600">
                Nos termos do Art. 18 da LGPD, o titular de dados possui os seguintes direitos garantidos perante a ADMIR:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  • Confirmação da existência de tratamento
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">• Acesso facilitado aos dados</div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  • Correção de dados incompletos ou inexatos
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  • Anonimização, bloqueio ou eliminação
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  • Portabilidade a outra entidade quando aplicável
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  • Informação sobre compartilhamentos
                </div>
              </div>

              {/* DPO / Institutional contact */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                    Canal Oficial do Encarregado de Dados (DPO)
                  </span>
                  <p className="text-xs text-slate-300">
                    Para exercer seus direitos ou esclarecer dúvidas sobre proteção de dados:
                  </p>
                </div>
                <a
                  href="mailto:dpo@admiramerican.com"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>dpo@admiramerican.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>American Diplomatic Mission of International Relations — ADMIR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Entendido e Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
