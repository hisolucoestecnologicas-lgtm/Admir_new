import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import { PrivacyNotice } from '../common/PrivacyNotice';

export function DonateView() {
  const { language } = useSite();
  const { success, error } = useToast();
  const { t } = useTranslation();

  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [cause, setCause] = useState<string>('General Humanitarian Fund');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [publicConsent, setPublicConsent] = useState<boolean>(false);
  const [provider, setProvider] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState<boolean>(false);
  const [completed, setCompleted] = useState<{ id?: string; txnId: string; amount: number } | null>(null);

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const IMPACT_TIERS = [
    { amount: 25, title: t('donate.tier25Title'), desc: t('donate.tier25Desc') },
    { amount: 50, title: t('donate.tier50Title'), desc: t('donate.tier50Desc') },
    { amount: 100, title: t('donate.tier100Title'), desc: t('donate.tier100Desc') },
    { amount: 250, title: t('donate.tier250Title'), desc: t('donate.tier250Desc') },
    { amount: 500, title: t('donate.tier500Title'), desc: t('donate.tier500Desc') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveAmount <= 0) {
      error(
        language === 'pt'
          ? 'Informe um valor válido para sua contribuição.'
          : language === 'es'
          ? 'Ingrese un monto válido para su contribución.'
          : 'Please enter a valid contribution amount.'
      );
      return;
    }
    if (!donorName.trim() || !donorEmail.trim()) {
      error(
        language === 'pt'
          ? 'Nome e e-mail são obrigatórios.'
          : language === 'es'
          ? 'El nombre y correo electrónico son obligatorios.'
          : 'Name and email are required.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitDonation({
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        donationType: frequency,
        amount: effectiveAmount,
        currency: 'USD',
        cause,
        anonymous,
        publicConsent,
        provider,
      });

      if (res.url) {
        window.location.href = res.url;
        return;
      }

      if (res.transactionId) {
        setCompleted({
          txnId: res.transactionId,
          amount: effectiveAmount,
        });
        success(
          language === 'pt' ? 'Doação confirmada com sucesso!' : language === 'es' ? '¡Donación confirmada con éxito!' : 'Donation confirmed successfully!',
          `${language === 'pt' ? 'ID da transação' : language === 'es' ? 'ID de transacción' : 'Transaction ID'}: ${res.transactionId}`
        );
      }
    } catch (err: any) {
      error(
        language === 'pt' ? 'Erro ao processar doação' : language === 'es' ? 'Error al procesar donación' : 'Donation processing error',
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Banner */}
      <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop"
            alt="Donate Banner"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current" />
            {t('donate.badge')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-black font-serif-heading text-white">
            {t('donate.title')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('donate.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Donation Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Direct Interactive Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
            {completed ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold font-serif-heading text-slate-900">
                  {t('donate.receiptConfirmed')}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {language === 'pt' ? 'Obrigado,' : language === 'es' ? 'Gracias,' : 'Thank you,'}{' '}
                  <strong>{donorName}</strong>.{' '}
                  {language === 'pt'
                    ? `Sua contribuição de $${completed.amount} USD foi confirmada com sucesso. ID da transação:`
                    : language === 'es'
                    ? `Su donación de $${completed.amount} USD fue confirmada con éxito. ID de transacción:`
                    : `Your gift of $${completed.amount} USD has been securely credited. Transaction ID:`}{' '}
                  <span className="font-mono font-bold text-slate-900">{completed.txnId}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setCompleted(null)}
                  className="mt-4 bg-slate-900 text-white font-medium px-6 py-2.5 rounded-xl text-sm cursor-pointer"
                >
                  {t('donate.makeAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-serif-heading text-slate-900">
                    {t('donate.chooseGift')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('donate.chooseGiftSub')}
                  </p>
                </div>

                {/* Frequency Switch */}
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setFrequency('one-time')}
                    className={`py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                      frequency === 'one-time'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('donate.giveOnce')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('monthly')}
                    className={`py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      frequency === 'monthly'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    {t('donate.monthlyGuardian')}
                  </button>
                </div>

                {/* Amounts Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {[25, 50, 100, 250, 500].map((amt) => {
                    const isSelected = selectedAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-3 rounded-xl font-black text-sm border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-500/40'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        ${amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    placeholder={t('donate.otherCustomAmount')}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Cause Allocation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t('donate.designationLabel')}
                  </label>
                  <select
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-800"
                  >
                    <option value="General Humanitarian Fund">{t('donate.causeGeneral')}</option>
                    <option value="Peace Ambassadors Program">{t('donate.causePeace')}</option>
                    <option value="Educational Volunteers">{t('donate.causeEducation')}</option>
                    <option value="Social Workers Network">{t('donate.causeSocial')}</option>
                    <option value="Disaster Emergency Relief">{t('donate.causeDisaster')}</option>
                  </select>
                </div>

                {/* Donor Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t('donate.donorName')} *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Roosevelt"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t('donate.donorEmail')} *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. donor@institution.org"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t('donate.tributeLabel')}</label>
                  <input
                    type="text"
                    placeholder={language === 'pt' ? 'Em homenagem a...' : language === 'es' ? 'En honor a...' : 'In memory of / In honor of...'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Payment Provider Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    {language === 'pt' ? 'Método de Pagamento' : language === 'es' ? 'Método de Pago' : 'Payment Method'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProvider('stripe')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        provider === 'stripe'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>Stripe (Credit / Debit Card)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('paypal')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        provider === 'paypal'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>PayPal</span>
                    </button>
                  </div>
                </div>

                {/* Checkboxes: Anonymous & Public Consent */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span>{language === 'pt' ? 'Manter doação anônima no mural público' : language === 'es' ? 'Mantener donación anónima en el muro público' : 'Keep donation anonymous on public ledger'}</span>
                  </label>
                  <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publicConsent}
                      onChange={(e) => setPublicConsent(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span>{language === 'pt' ? 'Autorizo publicação do nome institucional nos relatórios de transparência' : language === 'es' ? 'Autorizo publicación del nombre en informes de transparencia' : 'I consent to public transparency listing of my institutional contribution'}</span>
                  </label>
                </div>

                <PrivacyNotice context="donations" theme="light" variant="compact" />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || effectiveAmount <= 0}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 cursor-pointer"
                >
                  {loading ? (
                    language === 'pt' ? 'Processando Contribuição...' : language === 'es' ? 'Procesando Donación...' : 'Processing Transaction...'
                  ) : (
                    <>
                      <Heart className="w-5 h-5 fill-white" />
                      <span>{t('donate.donateButton')} ${effectiveAmount} USD</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('donate.securityAssurance')}</span>
                </div>
              </form>
            )}
          </div>

          {/* Right Impact Explanations */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{t('donate.directImpact')}</span>
              <h3 className="text-2xl font-bold font-serif-heading text-slate-900">
                {t('donate.directImpactTitle')}
              </h3>
              <div className="space-y-4 pt-2">
                {IMPACT_TIERS.map((tier) => (
                  <div key={tier.amount} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="text-base font-extrabold text-amber-700 font-serif-heading shrink-0 w-12">
                      ${tier.amount}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{tier.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{tier.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Transparency Statement */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                {t('donate.transparency')}
              </div>
              <h4 className="text-lg font-bold font-serif-heading">
                {t('donate.transparencyTitle')}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('donate.transparencyDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
