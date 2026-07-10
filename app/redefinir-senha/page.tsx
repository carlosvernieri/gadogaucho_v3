'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pkceCode, setPkceCode] = useState<string | null>(null);
  const [needConfirmation, setNeedConfirmation] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          console.log('Redefinir Senha: Código PKCE encontrado na URL.');
          if (isMounted) {
            setPkceCode(code);
            // Verificar se já temos sessão ativa antes de pedir confirmação
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setHasSession(true);
              setIsCheckingSession(false);
            } else {
              setNeedConfirmation(true);
              setIsCheckingSession(false);
            }
          }
          return;
        }
      }

      // Se não há código na URL, verifica sessão direta
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setHasSession(!!session);
        setIsCheckingSession(false);
      }
    };

    checkAuth();

    // Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        console.log('Redefinir Senha auth change:', event);
        if (session) {
          setHasSession(true);
          setNeedConfirmation(false);
          setIsCheckingSession(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleConfirmExchange = async () => {
    if (!pkceCode) return;
    setIsExchanging(true);
    setError(null);
    try {
      console.log('Trocando código PKCE por sessão manualmente...');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(pkceCode);
      if (exchangeError) {
        console.error('Erro ao trocar código:', exchangeError.message);
        setError(`Erro no link: ${exchangeError.message}. Talvez o link já tenha sido usado ou expirou.`);
        setNeedConfirmation(false);
        setHasSession(false);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
          setNeedConfirmation(false);
        } else {
          setError('Sessão de autenticação não encontrada após a validação do link.');
          setNeedConfirmation(false);
          setHasSession(false);
        }
      }
    } catch (err: any) {
      console.error('Erro inesperado no PKCE:', err);
      setError('Erro inesperado ao validar o link de recuperação.');
      setNeedConfirmation(false);
      setHasSession(false);
    } finally {
      setIsExchanging(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Terminar sessão para forçar o login com as novas credenciais
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('Ocorreu um erro ao atualizar sua senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/');
    setTimeout(() => {
      setAuthMode('login');
      setShowAuthModal(true);
    }, 300);
  };

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => {}}
        onAuthClick={(mode) => {
          setAuthMode(mode as 'login' | 'register');
          setShowAuthModal(true);
        }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <main className="flex-1 flex items-center justify-center px-4 py-16 bg-[#F8F9FA]">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-[#E9ECEF] relative overflow-hidden">
          {/* Decorative subtle background accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full -ml-8 -mb-8 blur-2xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {isCheckingSession ? (
              <motion.div
                key="checking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <RefreshCw className="w-12 h-12 text-[#2D5A27] animate-spin mb-4" />
                <h2 className="text-xl font-bold text-[#333] mb-2">Validando Sessão</h2>
                <p className="text-sm text-[#666] max-w-xs">
                  Aguarde um instante enquanto validamos seu link de recuperação de senha...
                </p>
              </motion.div>
            ) : needConfirmation ? (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-[#E9F0E8] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2D5A27]/10">
                  <Lock className="w-8 h-8 text-[#2D5A27]" />
                </div>
                <h2 className="text-2xl font-bold text-[#333] mb-4">Redefinir Senha</h2>
                <p className="text-[#666] text-sm leading-relaxed mb-8">
                  Para sua segurança e para evitar que sistemas automáticos de e-mail invalidem o seu link, clique no botão abaixo para confirmar e iniciar a redefinição de sua senha.
                </p>
                <button
                  onClick={handleConfirmExchange}
                  disabled={isExchanging}
                  className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExchanging ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Validando Link...
                    </>
                  ) : (
                    <>
                      Confirmar e Iniciar <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </motion.div>
            ) : !hasSession && !success ? (
              <motion.div
                key="no-session"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#333] mb-4">Link Expirado ou Inválido</h2>
                <p className="text-[#666] text-sm leading-relaxed mb-8">
                  {error || "Este link de redefinição de senha não é mais válido, já foi utilizado ou expirou. Por favor, faça uma nova solicitação no formulário de login."}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      router.push('/');
                      setTimeout(() => {
                        setAuthMode('forgot');
                        setShowAuthModal(true);
                      }, 300);
                    }}
                    className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Solicitar Novo Link
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-[#F8F9FA] text-[#666] font-bold rounded-xl hover:bg-[#E9ECEF] transition-all cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#333] mb-3">Senha Redefinida!</h2>
                <p className="text-[#666] text-sm leading-relaxed mb-8">
                  Sua senha foi atualizada com sucesso. Agora você já pode entrar na sua conta com suas novas credenciais.
                </p>
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Entrar na Conta <ArrowRight size={18} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#333] mb-2">Redefinir Senha</h2>
                  <p className="text-[#666] text-sm leading-relaxed">
                    Escolha uma senha forte de no mínimo 6 caracteres para garantir a segurança da sua conta.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Nova Senha <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#999]">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl pl-10 pr-10 py-3.5 text-sm outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999] hover:text-[#333] cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Confirmar Nova Senha <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#999]">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl pl-10 pr-10 py-3.5 text-sm outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999] hover:text-[#333] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-6 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
        />
      )}
    </div>
  );
}
