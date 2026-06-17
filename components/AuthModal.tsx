'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify } from '@/lib/utils';
import { RS_CITIES } from '@/lib/data';

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
};

export function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    setUser,
    setFavorites
  } = useUser();

  const [authError, setAuthError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    password: '',
    confirmPassword: ''
  });

  const [captchaAuth, setCaptchaAuth] = useState({ num1: 0, num2: 0, answer: '' });

  const [citySearchAuth, setCitySearchAuth] = useState('');
  const [showAuthSuggestions, setShowAuthSuggestions] = useState(false);

  const citySuggestionsAuth = useMemo(() => {
    if (!showAuthSuggestions) return [];
    if (citySearchAuth.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAuth.toLowerCase()));
  }, [citySearchAuth, showAuthSuggestions]);

  useEffect(() => {
    if (showAuthModal && authMode === 'register') {
      setCaptchaAuth({
        num1: Math.floor(Math.random() * 10) + 1,
        num2: Math.floor(Math.random() * 10) + 1,
        answer: ''
      });
    }
  }, [showAuthModal, authMode]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset state on close
      setAuthError(null);
      setEmailSuccess(false);
      setSendingEmail(false);
      setAuthForm({
        name: '', phone: '', email: '', city: '', password: '', confirmPassword: ''
      });
      setCitySearchAuth('');
      setCaptchaAuth({ num1: 0, num2: 0, answer: '' });
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthModal]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEmailSuccess(false);

    if (authMode === 'forgot') {
      setSendingEmail(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({ email: authForm.email })
        });

        if (res.ok) {
          setEmailSuccess(true);
        } else {
          const err = await res.json();
          setAuthError(err.error || 'Erro ao enviar e-mail de recuperação.');
        }
      } catch (err) {
        console.error('Error sending reset e-mail:', err);
        setAuthError('Erro de conexão ao servidor.');
      } finally {
        setSendingEmail(false);
      }
      return;
    }

    if (authMode === 'register') {
      if (parseInt(captchaAuth.answer) !== captchaAuth.num1 + captchaAuth.num2) {
        setAuthError('Verificação de segurança incorreta. Tente novamente.');
        setCaptchaAuth({
          num1: Math.floor(Math.random() * 10) + 1,
          num2: Math.floor(Math.random() * 10) + 1,
          answer: ''
        });
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('As senhas não coincidem. Verifique e tente novamente.');
        return;
      }

      const rawPhone = authForm.phone.replace(/\D/g, '');
      if (rawPhone.length !== 11) {
        setAuthError('O telefone deve ter formato válido: (xx) xxxx xxxxx');
        return;
      }

      const { confirmPassword, ...restAuthForm } = authForm;
      const newUser = {
        ...restAuthForm
      };

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify(newUser)
        });
        if (res.ok) {
          const savedUser = await res.json();
          setUser(savedUser);

          fetch(`/api/favorites?userId=${savedUser.id}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));

          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao cadastrar');
          return;
        }
      } catch (error) {
        console.error('Error registering:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({
            email: authForm.email,
            password: authForm.password
          })
        });

        if (res.ok) {
          const foundUser = await res.json();
          setUser(foundUser);

          fetch(`/api/favorites?userId=${foundUser.id}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));

          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao fazer login');
          return;
        }
      } catch (error) {
        console.error('Error logging in:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    }
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAuthModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[#333]">
                  {authMode === 'login' ? 'Bem-vindo de volta' : authMode === 'register' ? 'Crie sua conta' : 'Recuperar Senha'}
                </h2>
                <button onClick={() => setShowAuthModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                    {authError}
                  </motion.div>
                )}

                {emailSuccess ? (
                  <div className="bg-green-50 border border-green-100 text-green-700 p-6 rounded-2xl text-xs mb-4 space-y-2 animate-in fade-in duration-200">
                    <p className="font-bold flex items-center gap-2 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Link de Recuperação Enviado!
                    </p>
                    <p className="text-[#555] leading-relaxed">
                      Enviamos as instruções para redefinir sua senha para o endereço <strong>{authForm.email}</strong>. 
                      Por favor, verifique sua caixa de entrada e pasta de spam.
                    </p>
                  </div>
                ) : (
                  <>
                    {authMode === 'register' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                            Nome Completo <span className="text-[#DC3545]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={authForm.name}
                            onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                            placeholder="Como quer ser chamado?"
                            className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                            Telefone <span className="text-[#DC3545]">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={authForm.phone}
                            onChange={(e) => setAuthForm({ ...authForm, phone: formatPhone(e.target.value) })}
                            placeholder="(00) 0000 00000"
                            className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                            Município <span className="text-[#DC3545]">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={citySearchAuth}
                              onChange={(e) => {
                                setCitySearchAuth(e.target.value);
                                setAuthForm({ ...authForm, city: e.target.value });
                                setShowAuthSuggestions(true);
                              }}
                              onFocus={() => setShowAuthSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowAuthSuggestions(false), 200)}
                              placeholder="Busque o município..."
                              className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                            />
                            {citySuggestionsAuth.length > 0 && (
                              <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                {citySuggestionsAuth.map((city: any) => (
                                  <button
                                    key={city.name}
                                    type="button"
                                    onMouseDown={() => {
                                      setAuthForm({ ...authForm, city: city.name });
                                      setCitySearchAuth(city.name);
                                      setShowAuthSuggestions(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                                  >
                                    <span>{city.name}</span>
                                    <span className="text-[10px] text-[#999]">RS</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                        E-mail <span className="text-[#DC3545]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                      />
                    </div>

                    {authMode !== 'forgot' && (
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Senha <span className="text-[#DC3545]">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                        />
                        {authMode === 'login' && (
                          <div className="flex justify-end mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode('forgot');
                                setAuthError(null);
                              }}
                              className="text-[10px] font-bold text-[#999] hover:text-[#2D5A27] transition-all cursor-pointer bg-transparent border-0 outline-none"
                            >
                              Esqueceu sua senha?
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {authMode === 'register' && (
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Confirmar Senha <span className="text-[#DC3545]">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={authForm.confirmPassword}
                          onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20"
                        />
                      </div>
                    )}

                    {authMode === 'register' && (
                      <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E9ECEF]">
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-2">
                          Segurança: Quanto é {captchaAuth.num1} + {captchaAuth.num2}? <span className="text-[#DC3545]">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={captchaAuth.answer}
                          onChange={(e) => setCaptchaAuth({ ...captchaAuth, answer: e.target.value })}
                          placeholder="Digite o resultado"
                          className="w-full bg-white border border-transparent focus:border-[#2D5A27] rounded-xl px-4 py-3 text-sm outline-none transition-all focus:shadow-sm"
                        />
                      </div>
                    )}

                    {authMode === 'register' && (
                      <div className="flex items-start gap-3 mt-4">
                        <input
                          type="checkbox"
                          id="lgpd-consent"
                          required
                          className="mt-1 w-4 h-4 rounded text-[#2D5A27] focus:ring-[#2D5A27] border-[#E9ECEF] cursor-pointer"
                        />
                        <label htmlFor="lgpd-consent" className="text-xs text-[#666] leading-tight cursor-pointer">
                          Li e concordo com os <a href="/termos" target="_blank" className="text-[#2D5A27] font-bold hover:underline">Termos de Uso</a> e a <a href="/politica-de-privacidade" target="_blank" className="text-[#2D5A27] font-bold hover:underline">Política de Privacidade</a> do Gado Gaúcho. Aceito o tratamento dos meus dados conforme a LGPD. <span className="text-[#DC3545]">*</span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                <button 
                  disabled={sendingEmail}
                  className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-4 cursor-pointer disabled:opacity-50"
                >
                  {authMode === 'login' ? 'Entrar' : authMode === 'register' ? 'Cadastrar' : (sendingEmail ? 'Enviando...' : 'Enviar Link de Recuperação')}
                </button>
              </form>

              <div className="mt-8 text-center">
                {authMode === 'forgot' ? (
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                      setEmailSuccess(false);
                    }}
                    className="text-sm font-bold text-[#2D5A27] hover:underline transition-colors cursor-pointer bg-transparent border-0 outline-none"
                  >
                    Voltar para o Login
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                    }}
                    className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors cursor-pointer bg-transparent border-0 outline-none"
                  >
                    {authMode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
