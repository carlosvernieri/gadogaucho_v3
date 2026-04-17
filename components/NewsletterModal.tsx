'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Mail, X, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RS_CITIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const NewsletterModal = ({ isOpen, onClose }: NewsletterModalProps) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', city: '' });
  
  // City Autocomplete States
  const [citySearch, setCitySearch] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Captcha States
  const [captchaParams, setCaptchaParams] = useState({ n1: 0, n2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    if (isOpen && !success) {
      setCaptchaParams({ 
        n1: Math.floor(Math.random() * 9) + 1, 
        n2: Math.floor(Math.random() * 9) + 1 
      });
      setCaptchaAnswer('');
    }
  }, [isOpen, success]);

  const citySuggestions = useMemo(() => {
    if (!showCitySuggestions) return [];
    if (citySearch.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch, showCitySuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseInt(captchaAnswer) !== (captchaParams.n1 + captchaParams.n2)) {
      alert('Resposta matemática incorreta. Tente novamente para confirmar que é humano.');
      return;
    }

    if (!formData.name || !formData.phone || !formData.email || !formData.city) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any).from('newsletter').insert([{
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        city: formData.city
      }]);
      
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('Error inserting newsletter:', err);
      alert('Ocorreu um erro ao assinar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-[#E9ECEF] flex items-center justify-between sticky top-0 bg-white z-20">
              <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                <Mail className="text-[#2D5A27]" size={20} /> Assinar Boletim Diário
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-[#999] hover:text-[#333] hover:bg-[#F8F9FA] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {success ? (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold text-[#333] mb-2">Inscrição Concluída!</h4>
                  <p className="text-[#666]">Você começará a receber nossos alertas de mercado na sua caixa de entrada e telefone diariamente.</p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-8 py-2.5 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <p className="text-sm text-[#666] mb-2 leading-relaxed">
                    Assine grátis para receber variações de preço do gado gordo direto das principais praças da região sul.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-[#666] mb-1">Seu Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                      placeholder="Ex: João da Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#666] mb-1">Seu WhatsApp</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => {
                        const val = formatPhone(e.target.value);
                        setFormData({ ...formData, phone: val });
                      }}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                      placeholder="(51) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#666] mb-1">Endereço de E-mail</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                      placeholder="contato@fazenda.com.br"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold text-[#666] mb-1">Seu Município Principal (RS)</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                      <input
                        type="text"
                        required
                        value={citySearch}
                        onChange={(e) => {
                          setCitySearch(e.target.value);
                          setShowCitySuggestions(true);
                          setFormData(prev => ({ ...prev, city: e.target.value }));
                        }}
                        onFocus={() => setShowCitySuggestions(true)}
                        placeholder="Digite sua cidade"
                        className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                      />
                    </div>

                    {showCitySuggestions && citySuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-[#E9ECEF] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {citySuggestions.map((city) => (
                          <div
                            key={city.name}
                            className="px-4 py-3 hover:bg-[#F8F9FA] cursor-pointer text-sm border-b border-[#F8F9FA] last:border-b-0"
                            onClick={() => {
                              setCitySearch(city.name);
                              setFormData(prev => ({ ...prev, city: city.name }));
                              setShowCitySuggestions(false);
                            }}
                          >
                            <span className="font-bold text-[#333]">{city.name}</span>
                            <span className="text-[#999] text-xs ml-2">RS</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 p-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-[#333] shrink-0">
                      Segurança: Quanto é <span className="text-[#2D5A27]">{captchaParams.n1} + {captchaParams.n2}</span>?
                    </span>
                    <input
                      type="number"
                      required
                      value={captchaAnswer}
                      onChange={e => setCaptchaAnswer(e.target.value)}
                      className="w-16 px-2 py-2 text-center border border-[#E9ECEF] rounded-lg text-sm bg-white font-bold text-[#2D5A27]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-colors mt-2 disabled:bg-[#999] flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : 'Confirmar Assinatura'}
                  </button>
                  <p className="text-center text-[11px] text-[#999]">Você pode se descadastrar dessa lista a qualquer hora.</p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
