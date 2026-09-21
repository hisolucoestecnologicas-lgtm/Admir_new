import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';

export function AdminLogin() {
  const { login, loginWithGoogleAuth } = useAuth();
  const { success, error } = useToast();
  const { navigateTo } = useSite();

  const [email, setEmail] = useState('owner@admiramerican.com');
  const [password, setPassword] = useState('admir2026MasterKey');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      success(
        'Acesso Autorizado',
        `Bem-vindo(a), ${user.name}! Sessão administrativa iniciada com perfil ${user.role.toUpperCase()}.`
      );
    } catch (err: any) {
      error('Falha de Autenticação', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogleAuth();
      success(
        'Conexão Google Bem-sucedida',
        `Bem-vindo(a), ${user.name}! Sessão administrativa iniciada via Firebase Google Auth com perfil ${user.role.toUpperCase()}.`
      );
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      // Friendly message for cancelled popup or real errors
      if (err.code === 'auth/popup-closed-by-user') {
        error('Autenticação Cancelada', 'A janela de login do Google foi fechada antes da conclusão.');
      } else {
        error('Falha na Conexão Google', err.message || 'Não foi possível autenticar com o Google via Firebase.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const setTestAccount = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-700 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-amber-950/20">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black font-serif-heading text-white tracking-tight">
            ADMIR CMS
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
            Diplomatic Portal & Institutional Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Diplomatic Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="name@admiramerican.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Passphrase / Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
            >
              {loading ? (
                'Autenticando...'
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Acessar Painel Diplomático</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <div className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest absolute">
              ou
            </div>
          </div>

          {/* Google Sign-In with Firebase */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="text-slate-600 font-medium">Conectando via Google...</span>
            ) : (
              <>
                {/* Official Google Vector Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>Conectar com Google</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  Firebase
                </span>
              </>
            )}
          </button>

          {/* Preset Test Credentials */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
              Credenciais de Acesso Pré-Configuradas:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestAccount('owner@admiramerican.com', 'admir2026MasterKey')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Dono do Site
                </div>
                <div className="text-[10px] text-slate-400">Poder absoluto</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('admin@admiramerican.com', 'adminPass2026')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-slate-200">Administrador</div>
                <div className="text-[10px] text-slate-400">Gestão operacional</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('editor@admiramerican.com', 'editorPass2026')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-slate-200">Editor</div>
                <div className="text-[10px] text-slate-400">Conteúdo & Notícias</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('viewer@admiramerican.com', 'viewerPass2026')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-slate-200">Visualizador</div>
                <div className="text-[10px] text-slate-400">Somente leitura</div>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Public Site */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Voltar para o Site Público ADMIR
          </button>
        </div>
      </div>
    </div>
  );
}
