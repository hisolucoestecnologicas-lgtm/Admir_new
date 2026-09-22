import React, { useState, useEffect } from 'react';
import { Heart, ShieldCheck, CheckCircle, X, Sparkles } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export function DonationModal() {
  const { isDonationModalOpen, closeDonationModal, donationPreset, language, getMaintenanceForView } = useSite();
  const { success, error } = useToast();
  const { t } = useTranslation();

  const donateMaintenance = getMaintenanceForView('donate');

  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [cause, setCause] = useState<string>('General Humanitarian Fund');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<{ id: string; amount: number; transactionId: string } | null>(null);

  useEffect(() => {
    if (donateMaintenance.inMaintenance && isDonationModalOpen) {
      closeDonationModal();
    }
  }, [donateMaintenance.inMaintenance, isDonationModalOpen, closeDonationModal]);

  useEffect(() => {
    if (donationPreset.amount) {
      setSelectedAmount(donationPreset.amount);
      setCustomAmount('');
    }
    if (donationPreset.cause) {
      setCause(donationPreset.cause);
    }
    if (isDonationModalOpen) {
      setCompletedTxn(null);
    }
  }, [donationPreset, isDonationModalOpen]);

  if (!isDonationModalOpen || donateMaintenance.inMaintenance) return null;

  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0) {
      error(
        language === 'pt'
          ? 'Por favor, informe um valor válido para a doação.'
          : language === 'es'
          ? 'Por favor ingrese un monto válido para la donación.'
          : 'Please enter a valid donation amount.'
      );
      return;
    }
    if (!donorName.trim() || !donorEmail.trim()) {
      error(
        language === 'pt'
          ? 'Nome e e-mail são obrigatórios.'
          : language === 'es'
          ? 'Nombre y correo electrónico son requeridos.'
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
        amount: currentAmount,
        currency: 'USD',
        cause,
        message: message.trim(),
      });

      if (res.url) {
        window.location.href = res.url;
        return;
      }

      setCompletedTxn({
        id: res.id || 'don-test',
        amount: res.amount || currentAmount,
        transactionId: res.transactionId || 'TXN-ADM-999999',
      });

      success(
        language === 'pt' ? 'Doação concluída com sucesso!' : language === 'es' ? '¡Donación completada con éxito!' : 'Donation successful!',
        `${language === 'pt' ? 'Agradecemos seu apoio inestimável à missão humanitária da ADMIR. Recibo gerado' : language === 'es' ? 'Agradecemos su apoyo a la misión humanitaria de ADMIR. Recibo' : 'Thank you for your generous gift. Receipt'}: ${res.transactionId}`
      );
    } catch (err: any) {
      error(
        language === 'pt' ? 'Falha ao processar doação' : language === 'es' ? 'Error al procesar la donación' : 'Donation processing failed',
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={closeDonationModal}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            {t('modal.admirFullTitle')}
          </div>
          <h2 className="text-2xl font-bold font-serif-heading text-white">
            {t('modal.generosityHeadline')}
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            {t('modal.generositySub')}
          </p>
        </div>

        {completedTxn ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-serif-heading">
              {t('donate.receiptConfirmed')}
            </h3>
            <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto">
              {language === 'pt' ? 'Obrigado,' : language === 'es' ? 'Gracias,' : 'Thank you,'}{' '}
              <strong className="text-slate-900 font-semibold">{donorName}</strong>.{' '}
              {language === 'pt'
                ? `Sua contribuição de $${completedTxn.amount} USD foi processada com segurança. Um comprovante institucional foi emitido para`
                : language === 'es'
                ? `Su contribución de $${completedTxn.amount} USD fue procesada con seguridad. Un comprobante institucional fue enviado a`
                : `Your contribution of $${completedTxn.amount} USD has been securely processed. An official acknowledgment has been sent to`}{' '}
              <strong>{donorEmail}</strong>.
            </p>
            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono inline-block">
              Transaction ID: <span className="text-slate-900 font-bold">{completedTxn.transactionId}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={closeDonationModal}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
              >
                {t('modal.closeWindow')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Frequency Switch */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setFrequency('one-time')}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
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
                className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  frequency === 'monthly'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                {t('donate.monthlyGuardian')}
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('modal.selectAmount')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = selectedAmount === amt && !customAmount;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-500/30'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      ${amt}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div className="mt-3 relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder={t('donate.otherCustomAmount')}
                  min="5"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Cause Allocation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('donate.designationLabel')}
              </label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-800"
              >
                <option value="General Humanitarian Fund">{t('donate.causeGeneral')}</option>
                <option value="Peace Ambassadors Program">{t('donate.causePeace')}</option>
                <option value="Educational Volunteers">{t('donate.causeEducation')}</option>
                <option value="Social Workers & Counselors">{t('donate.causeSocial')}</option>
                <option value="Disaster Emergency Relief">{t('donate.causeDisaster')}</option>
              </select>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('donate.donorName')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('donate.donorEmail')} *</label>
                <input
                  type="email"
                  required
                  placeholder="maria@example.org"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dedicated Message */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t('donate.tributeLabel')}
              </label>
              <input
                type="text"
                placeholder={language === 'pt' ? 'Em homenagem a...' : language === 'es' ? 'En honor a...' : 'In honor of...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Security Assurance */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('donate.securityAssurance')}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || currentAmount <= 0}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                language === 'pt' ? 'Processando Contribuição...' : language === 'es' ? 'Procesando Donación...' : 'Processing Gift...'
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-current" />
                  <span>{t('donate.donateButton')} ${currentAmount} USD</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
