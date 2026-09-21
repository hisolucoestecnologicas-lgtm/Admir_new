import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Heart,
  CheckCircle2,
  Shield,
  Send,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';

export function GetInvolvedView() {
  const { selectedParam, openDonationModal, language } = useSite();
  const { success, error } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'volunteer' | 'ambassador' | 'partner'>('volunteer');

  useEffect(() => {
    if (selectedParam && ['volunteer', 'ambassador', 'partner'].includes(selectedParam)) {
      setActiveTab(selectedParam as any);
    }
  }, [selectedParam]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [experience, setExperience] = useState('');
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
        organization: organization.trim() || `Country: ${country}`,
        inquiryType: activeTab === 'volunteer' ? 'volunteer' : activeTab === 'ambassador' ? 'partnership' : 'partnership',
        subject: `Application: ${activeTab.toUpperCase()} - ${name.trim()} (${country || 'Global'})`,
        message: `Field/Specialty: ${experience}\n\nMotivation & Dossier:\n${message}`,
      });

      success(t('getInvolved.successTitle'), t('getInvolved.successMessage'));

      setName('');
      setEmail('');
      setOrganization('');
      setCountry('');
      setExperience('');
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
            src="https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=1600&auto=format&fit=crop"
            alt="Get Involved Banner"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            {t('getInvolved.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-serif-heading text-white">
            {t('getInvolved.title')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            {t('getInvolved.subtitle')}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-20 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-3">
          {[
            { id: 'volunteer', label: t('getInvolved.tabVolunteer'), icon: Users },
            { id: 'ambassador', label: t('getInvolved.tabAmbassador'), icon: Shield },
            { id: 'partner', label: t('getInvolved.tabPartner'), icon: Building },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 text-amber-400" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Information */}
        <div className="lg:col-span-5 space-y-6">
          {activeTab === 'volunteer' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('getInvolved.volunteerScope')}</span>
              <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
                {t('getInvolved.volunteerTitle')}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('getInvolved.volunteerDesc')}
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('getInvolved.volunteerPoint1')}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('getInvolved.volunteerPoint2')}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('getInvolved.volunteerPoint3')}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ambassador' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('getInvolved.ambassadorScope')}</span>
              <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
                {t('getInvolved.ambassadorTitle')}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('getInvolved.ambassadorDesc')}
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('getInvolved.ambassadorPoint1')}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('getInvolved.ambassadorPoint2')}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'partner' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('getInvolved.partnerScope')}</span>
              <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
                {t('getInvolved.partnerTitle')}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('getInvolved.partnerDesc')}
              </p>
            </div>
          )}

          {/* Quick Gift Box */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
            <h4 className="font-bold text-sm text-amber-400 font-serif-heading">{t('getInvolved.preferFinancial')}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('getInvolved.financialDesc')}
            </p>
            <button
              type="button"
              onClick={() => openDonationModal()}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              {t('getInvolved.makeDirectDonation')}
            </button>
          </div>
        </div>

        {/* Right Application Form */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-2xl font-bold font-serif-heading text-slate-900">
              {activeTab === 'volunteer' && t('getInvolved.formVolunteerTitle')}
              {activeTab === 'ambassador' && t('getInvolved.formAmbassadorTitle')}
              {activeTab === 'partner' && t('getInvolved.formPartnerTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('getInvolved.formSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('contact.fullName')} *</label>
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
                  placeholder={t('getInvolved.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t('getInvolved.countryOfResidence')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('getInvolved.countryOfResidence')}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {activeTab === 'partner' ? t('getInvolved.institutionLabel') : t('getInvolved.professionLabel')}
                </label>
                <input
                  type="text"
                  placeholder={activeTab === 'partner' ? t('getInvolved.institutionLabel') : t('getInvolved.professionLabel')}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('getInvolved.statementLabel')} *
              </label>
              <textarea
                required
                rows={5}
                placeholder={t('getInvolved.message')}
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
                t('getInvolved.submitting')
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>{t('getInvolved.submitBtn')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
