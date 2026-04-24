'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Phone, Mail, Briefcase, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

interface SuggestCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPhone = (val: string) => {
  if (!val) return '';
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 2) v = `(${v.substring(0, 2)}) ` + v.substring(2);
  if (v.length > 7) v = v.substring(0, 9) + ' ' + v.substring(9);
  return v;
};

export function SuggestCalculatorModal({ isOpen, onClose }: SuggestCalculatorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profession: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawPhone = formData.phone.replace(/\D/g, '');
    if (rawPhone.length < 11) {
      alert('Por favor, informe um telefone válido com DDD (11 dígitos).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/suggest-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          setFormData({ name: '', phone: '', email: '', profession: '', description: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao enviar sugestão:', error);
      alert('Ocorreu um erro ao enviar sua sugestão. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {isSuccess ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-[#1A1A1A] mb-4">Sugestão Enviada!</h2>
                <p className="text-[#666]">
                  Obrigado por contribuir com o Gado Gaúcho. Nossa equipe técnica analisará sua sugestão em breve.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-8 py-6 border-b border-[#F1F3F5] flex items-center justify-between bg-gradient-to-r from-[#2D5A27]/5 to-transparent">
                  <div>
                    <h2 className="text-xl font-black text-[#1A1A1A]">Sugerir Calculadora</h2>
                    <p className="text-xs text-[#999] font-bold uppercase tracking-wider mt-1">Nova ferramenta técnica</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#999] hover:bg-[#F8F9FA] hover:text-[#333] transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Nome */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-2 px-1">
                        <User size={12} className="text-[#2D5A27]" /> Nome Completo
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
                        placeholder="Como podemos te chamar?"
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-2 px-1">
                        <Phone size={12} className="text-[#2D5A27]" /> WhatsApp
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
                        placeholder="(00) 00000 0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* E-mail */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-2 px-1">
                        <Mail size={12} className="text-[#2D5A27]" /> E-mail
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
                        placeholder="exemplo@email.com"
                      />
                    </div>

                    {/* Profissão */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-2 px-1">
                        <Briefcase size={12} className="text-[#2D5A27]" /> Profissão
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.profession}
                        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
                        placeholder="Ex: Produtor, Veterinário..."
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-2 px-1">
                      <MessageSquare size={12} className="text-[#2D5A27]" /> Descreva a ferramenta que necessita
                    </label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-[#2D5A27] focus:bg-white transition-all resize-none"
                      placeholder="Explique como a calculadora deve funcionar e quais dados ela deve processar..."
                    />
                  </div>

                  {/* Submit */}
                  <button
                    disabled={isSubmitting}
                    className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#1E3D1A] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-[#2D5A27]/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Enviar Sugestão
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
