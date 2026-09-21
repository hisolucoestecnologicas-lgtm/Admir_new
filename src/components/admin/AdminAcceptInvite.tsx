import React, { useState, useEffect } from 'react';
import { Shield, Key, UserCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';

export function AdminAcceptInvite() {
  const { selectedParam, navigateTo } = useSite();
  const { refreshUser, loginWithGoogleAuth } = useAuth();
  const { success, error } = useToast();

  const token = selectedParam || '';

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setLoadingInvite(false);
        return;
      }
      try {
        const res = await api.checkInvite(token);
        setInviteData(res);
      } catch (err: any) {
        error('Convite inválido', err.message);
      } finally {
        setLoadingInvite(false);
      }
    }
    verify();
  }, [token, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      error('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.acceptInvite(token, name.trim(), password);
      await refreshUser();
      success('Conta Ativada!', 'Seu acesso administrativo foi configurado com sucesso.');
      navigateTo('admin');
    } catch (err: any) {
      error('Erro ao aceitar convite', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptWithGoogle = async () => {
    setGoogleSubmitting(true);
    try {
      await loginWithGoogleAuth();
      success('Conta Ativada com Google!', 'Seu acesso administrativo foi validado e vinculado à sua conta Google via Firebase.');
      navigateTo('admin');
    } catch (err: any) {
      error('Falha ao conectar com Google', err.message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <p className="text-sm text-slate-400">Verificando credencial de convite diplomático...</p>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-white space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-serif-heading">Convite Inválido ou Expirado</h2>
          <p className="text-xs text-slate-400">
            Este link de acesso único já foi utilizado ou sua validade de 48 horas expirou. Solicite um novo convite ao Dono do Site.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('admin')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl text-xs transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-500 mx-auto flex items-center justify-center text-amber-400">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-serif-heading">Ativar Acesso Diplomático</h1>
          <p className="text-xs text-slate-400">
            Você foi convidado(a) como <strong className="text-amber-400 uppercase">{inviteData.role}</strong> para o e-mail <strong>{inviteData.email}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dra. Juliana Silveira"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Criar Senha Segura *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha criada"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || googleSubmitting}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {submitting ? 'Ativando...' : 'Concluir Ativação e Entrar no Painel'}
          </button>
        </form>

        {/* Alternative: Activate with Google */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <div className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest absolute">
              ou vincule sua conta
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcceptWithGoogle}
            disabled={googleSubmitting || submitting}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {googleSubmitting ? (
              'Conectando com Google...'
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Ativar Imediatamente com Google (Firebase)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
