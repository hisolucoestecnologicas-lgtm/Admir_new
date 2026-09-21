import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Building,
  Shield,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import { getLocalizedSettings } from '../../lib/i18nHelper';
import { api } from '../../lib/api';

export function ContactView() {
  const { settings, language } = useSite();
  const { success, error } = useToast();
  const { t } = useTranslation();

  const localizedSettings = getLocalizedSettings(settings, language);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [inquiryType, setInquiryType] = useState<'general' | 'diplomatic' | 'partnership' | 'press' | 'volunteer'>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      error(t('common.requiredFieldsError'));
      return;
    }

    setSubmitting(true);
    try {
      await api.submitContact({
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim(),
        inquiryType,
        subject: subject.trim() || 'General Institutional Inquiry',
        message: message.trim(),
      });

      success(t('contact.successTitle'), t('contact.successMessage'));
      setName('');
      setEmail('');
      setOrganization('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      error(t('common.errorSubmitting'), err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1600&auto=format&fit=crop"
            alt="Contact ADMIR"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            {t('contact.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('contact.heroTitle')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('contact.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Information Cards */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official Headquarters Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-serif-heading text-lg">
                  {t('contact.hqTitle')}
                </h3>
                <div className="text-xs text-slate-500">{t('contact.headquartersSub')}</div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span>{t('contact.hqAddress')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('contact.phoneNumber')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('contact.emailAddress')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('contact.workingHours')}</span>
              </div>
            </div>
          </div>

          {/* Neutrality & Status Notice */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              {t('contact.protocolTitle')}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('contact.protocolDesc')}
            </p>
          </div>
        </div>

        {/* Right Inquiry Form */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
              {t('contact.formTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('contact.formSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.name')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('contact.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.email')} *</label>
                <input
                  type="email"
                  required
                  placeholder={t('contact.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.organization')}</label>
                <input
                  type="text"
                  placeholder={t('contact.organization')}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.inquiryType')}</label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-800"
                >
                  <option value="general">{t('contact.inquiryGeneral')}</option>
                  <option value="diplomatic">{t('contact.inquiryDiplomatic')}</option>
                  <option value="partnership">{t('contact.inquiryPartnership')}</option>
                  <option value="volunteer">{t('contact.inquiryVolunteer')}</option>
                  <option value="press">{t('contact.inquiryPress')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.subject')} *</label>
              <input
                type="text"
                required
                placeholder={t('contact.subject')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.message')} *</label>
              <textarea
                required
                rows={5}
                placeholder={t('contact.message')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {submitting ? (
                t('contact.sending')
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>{t('contact.submitBtn')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
