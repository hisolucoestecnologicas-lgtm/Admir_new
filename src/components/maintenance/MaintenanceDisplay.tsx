import React, { useState, useEffect } from 'react';
import { MaintenanceConfig } from '../../types';
import { getMaintenanceThemeById, MAINTENANCE_THEMES } from '../../data/maintenanceThemes';
import {
  Wrench,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Globe,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface MaintenanceDisplayProps {
  config: MaintenanceConfig;
  pageTitle?: string;
  isPreview?: boolean;
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
  onNavigateHome?: () => void;
  onRefresh?: () => void;
}

export function MaintenanceDisplay({
  config,
  pageTitle,
  isPreview = false,
  previewDevice = 'desktop',
  onNavigateHome,
  onRefresh,
}: MaintenanceDisplayProps) {
  const theme = getMaintenanceThemeById(config.themeId);

  // Live countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    if (!config.showCountdown || !config.estimatedReturnDate) return;

    const calculateTime = () => {
      const target = new Date(config.estimatedReturnDate!).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config.showCountdown, config.estimatedReturnDate]);

  // Set page meta if not in preview
  useEffect(() => {
    if (isPreview) return;

    const originalTitle = document.title;
    document.title = `${config.title || 'Em Manutenção'} — ADMIR`;

    // Ensure meta robots noindex
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    let createdRobots = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
      createdRobots = true;
    }
    const prevRobotsContent = metaRobots.content;
    metaRobots.content = 'noindex, nofollow, noarchive';

    return () => {
      document.title = originalTitle;
      if (createdRobots) {
        metaRobots.remove();
      } else {
        metaRobots.content = prevRobotsContent;
      }
    };
  }, [config.title, isPreview]);

  const defaultLogo = '/adm_logo.png';
  const logoUrl = config.customLogoUrl || defaultLogo;

  const handleButtonClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    if (config.buttonUrl) {
      if (config.buttonUrl.startsWith('http')) {
        window.location.href = config.buttonUrl;
      } else {
        window.location.hash = config.buttonUrl.replace(/^\/?#?/, '');
      }
    } else {
      window.location.hash = 'home';
    }
  };

  // Content render
  const content = (
    <div
      id="maintenance-display-wrapper"
      className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 md:p-12 relative overflow-hidden transition-all duration-300 ${theme.bgClass}`}
    >
      {/* Background Decorators */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Top Header / Brand */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-current/10">
        <div className="flex items-center gap-3">
          {config.showLogo && (
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="ADMIR Seal"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="hidden sm:block">
                <div className="font-serif font-bold text-sm tracking-wider uppercase">ADMIR</div>
                <div className="text-[10px] tracking-widest uppercase opacity-70">
                  American Diplomatic Mission
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              theme.isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Manutenção Programada
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Recarregar status"
              className="p-1.5 rounded-lg border border-current/20 hover:bg-current/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Center Main Stage */}
      <main className="relative z-10 w-full max-w-3xl mx-auto my-auto py-8 sm:py-12 flex flex-col items-center text-center">
        {/* Theme Badge / Icon */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${theme.cardClass}`}
        >
          <Wrench
            className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce"
            style={{ color: theme.accentColor || theme.defaultIconColor, animationDuration: '2.5s' }}
          />
        </div>

        {/* Page Context Badge if specific page */}
        {pageTitle && (
          <div className="mb-3">
            <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-md bg-current/10 text-current opacity-80">
              Seção: {pageTitle}
            </span>
          </div>
        )}

        {/* Main Title */}
        <h1
          className={`text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 ${theme.titleClass || 'font-sans'}`}
        >
          {config.title || 'Sistema Temporariamente em Manutenção'}
        </h1>

        {/* Rich Text / Description Message */}
        <div
          className={`prose prose-sm sm:prose-base max-w-2xl mb-8 leading-relaxed opacity-90 ${
            theme.isDark ? 'prose-invert' : ''
          }`}
          dangerouslySetInnerHTML={{
            __html:
              config.message ||
              '<p>Estamos realizando melhorias estruturais e atualizações técnicas para oferecer uma experiência mais segura e eficiente.</p>',
          }}
        />

        {/* Estimated Return Date Card */}
        {config.showEstimatedReturn && config.estimatedReturnDate && (
          <div
            className={`w-full max-w-lg mb-8 p-4 sm:p-6 rounded-2xl ${theme.cardClass} shadow-md`}
          >
            <div className="flex items-center justify-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider opacity-75">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Previsão de Retorno</span>
            </div>
            <div className="text-base sm:text-lg font-semibold">
              {new Date(config.estimatedReturnDate).toLocaleString('pt-BR', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </div>

            {/* Countdown Display */}
            {config.showCountdown && (
              <div className="mt-4 pt-4 border-t border-current/10">
                {timeLeft.isPast ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-500">
                    <Sparkles className="w-4 h-4" />
                    <span>Finalizando ajustes finais de publicação...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div className="p-2 sm:p-3 rounded-xl bg-current/5 border border-current/10">
                      <span className="block text-lg sm:text-2xl font-bold font-mono">
                        {String(timeLeft.days).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Dias</span>
                    </div>
                    <div className="p-2 sm:p-3 rounded-xl bg-current/5 border border-current/10">
                      <span className="block text-lg sm:text-2xl font-bold font-mono">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Horas</span>
                    </div>
                    <div className="p-2 sm:p-3 rounded-xl bg-current/5 border border-current/10">
                      <span className="block text-lg sm:text-2xl font-bold font-mono">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Min</span>
                    </div>
                    <div className="p-2 sm:p-3 rounded-xl bg-current/5 border border-current/10">
                      <span className="block text-lg sm:text-2xl font-bold font-mono text-amber-500">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Seg</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {config.showButton && (
          <div className="mb-8">
            <button
              onClick={handleButtonClick}
              id="maintenance-action-btn"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 ${
                theme.isDark
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{config.buttonLabel || 'Voltar ao Início'}</span>
            </button>
          </div>
        )}

        {/* Contact Support Section */}
        {config.showContact && (
          <div
            className={`w-full max-w-lg p-5 rounded-2xl text-left ${theme.cardClass}`}
          >
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider opacity-80">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Canais Oficiais de Atendimento Diplomático</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 opacity-90">
                <Mail className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span className="font-mono select-all">contact@admiramerican.org</span>
              </div>
              <div className="flex items-center gap-2.5 opacity-90">
                <Phone className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span>Secretaria Executiva: +1 (202) 555-0199</span>
              </div>
              <div className="flex items-center gap-2.5 opacity-75 text-[11px]">
                <MapPin className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                <span>Sede Internacional: Washington, D.C. — Estados Unidos</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto pt-6 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-75">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" />
          <span>© {new Date().getFullYear()} ADMIR — American Diplomatic Mission of International Relations</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Protocolo de Segurança Ativo</span>
          <span>•</span>
          <span>Acesso Administrativo Preservado</span>
        </div>
      </footer>

      {/* Custom CSS Injected safely */}
      {config.customCss && (
        <style dangerouslySetInnerHTML={{ __html: config.customCss }} />
      )}
    </div>
  );

  // If in Preview Mode inside Admin panel, wrap in frame simulation
  if (isPreview) {
    const frameWidths = {
      desktop: 'w-full',
      tablet: 'max-w-[768px] mx-auto border-4 border-slate-700 rounded-3xl overflow-hidden shadow-2xl my-4',
      mobile: 'max-w-[375px] mx-auto border-4 border-slate-700 rounded-3xl overflow-hidden shadow-2xl my-4',
    };

    return (
      <div className="w-full bg-slate-900/50 p-2 sm:p-6 rounded-2xl overflow-y-auto max-h-[80vh] flex flex-col items-center">
        <div className={`transition-all duration-300 w-full ${frameWidths[previewDevice]}`}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
