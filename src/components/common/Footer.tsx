import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  Lock,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';

export function Footer() {
  const { navigateTo, openDonationModal, settings, language } = useSite();
  const { success, error } = useToast();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await api.subscribeNewsletter(name.trim(), email.trim());
      success(
        language === 'pt' ? 'Inscrição confirmada' : language === 'es' ? 'Suscripción confirmada' : 'Subscription confirmed',
        t('home.newsletterSuccess')
      );
      setEmail('');
      setName('');
    } catch (err: any) {
      error(
        language === 'pt' ? 'Erro ao subscrever' : language === 'es' ? 'Error al suscribirse' : 'Subscription error',
        err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      {/* Newsletter & Action Banner */}
      <div className="bg-slate-900 border-b border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase flex items-center gap-1.5 mb-2">
              <Mail className="w-3.5 h-3.5" />
              {t('home.newsletterTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold font-serif-heading text-white">
              {language === 'pt'
                ? 'Fique próximo do nosso trabalho.'
                : language === 'es'
                ? 'Permanezca cerca de nuestra misión.'
                : 'Stay close to the mission.'}
            </h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
              {t('home.newsletterBody')}
            </p>
          </div>

          <div className="lg:col-span-6">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  language === 'pt'
                    ? 'Seu Nome Completo'
                    : language === 'es'
                    ? 'Su Nombre Completo'
                    : 'Your Full Name'
                }
                className="px-4 py-3 bg-slate-800/90 border border-slate-700 text-white rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('home.newsletterPlaceholder')}
                className="px-4 py-3 bg-slate-800/90 border border-slate-700 text-white rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 flex-1"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                {submitting ? (language === 'pt' ? 'Inscrevendo...' : language === 'es' ? 'Suscribiendo...' : 'Subscribing...') : t('home.newsletterSubscribe')}
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-2">
              {t('home.newsletterNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Institution Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img
                  src="/media/branding/admir-logo-header.png"
                  alt="Logotipo oficial da ADMIR - American Diplomatic Mission of International Relations"
                  className="w-12 h-12 object-contain"
                  loading="lazy"
                />
              </div>
              <div>
                <div className="font-serif-heading font-bold text-white text-base leading-tight">
                  ADMIR
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {t('nav.diplomaticMission')}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed pr-6">
              {t('footer.description')}
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.address || '1200 G Street NW, Suite 800, Washington, DC 20005, USA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.phone || '+1 (202) 555-0198'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{settings.email || 'contact@admiramerican.com'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => openDonationModal()}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-700/50 px-3.5 py-2 rounded-lg hover:bg-amber-900/60 transition-colors cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                {t('home.donateCta')}
              </button>
            </div>
          </div>

          {/* About Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
              {t('footer.governance')}
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about', 'who-we-are')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.whoWeAre')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about', 'mission')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.mission')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about', 'leadership')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.leadership')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about', 'framework')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.framework')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about', 'missions')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('about.tabMissions')}
                </button>
              </li>
            </ul>
          </div>

          {/* Programs Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
              {t('footer.programs')}
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('program-detail', 'peace-ambassadors')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Embaixadores da Paz' : language === 'es' ? 'Embajadores de la Paz' : 'Peace Ambassadors'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('program-detail', 'educational-volunteers')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Voluntários Educacionais' : language === 'es' ? 'Voluntarios Educativos' : 'Educational Volunteers'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('program-detail', 'social-workers-and-counselors')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Assistência Psicossocial' : language === 'es' ? 'Asistencia Psicosocial' : 'Social Workers & Counselors'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('programs')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.allPrograms')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('ambassadors')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.ambassadors')}
                </button>
              </li>
            </ul>
          </div>

          {/* Action & Portal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
              {t('nav.getInvolved')}
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => openDonationModal()}
                  className="hover:text-amber-400 transition-colors font-medium text-amber-300 cursor-pointer"
                >
                  {t('nav.donate')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('get-involved', 'volunteer')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.volunteer')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('stories')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('nav.stories')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('contact')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t('footer.contactUs')}
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  {t('nav.cmsPanel')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} ADMIR — American Diplomatic Mission of International Relations. {t('footer.rights')}
          </div>

          <div className="flex items-center gap-6">
            <span>{t('footer.diplomaticDisclaimer')}</span>
            <span>•</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>{language === 'pt' ? 'Voltar ao Topo' : language === 'es' ? 'Volver Arriba' : 'Back to Top'}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
