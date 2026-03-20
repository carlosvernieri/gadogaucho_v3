'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, Phone, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';

interface InterestFormProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingTitle: string;
}

export const InterestForm = ({ isOpen, onClose, listingId, listingTitle }: InterestFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: `Olá, tenho interesse no anúncio: ${listingTitle}. Gostaria de mais informações.`
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Sending message for listing:', listingId, formData);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: Number(listingId),
          ...formData
        })
      });

      const result = await response.json();
      console.log('Message response:', result);

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          setFormData({
            name: '',
            phone: '',
            email: '',
            message: `Olá, tenho interesse no anúncio: ${listingTitle}. Gostaria de mais informações.`
          });
        }, 3000);
      } else {
        alert(`Erro ao enviar mensagem: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro de conexão ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] p-8 z-[120] shadow-2xl overflow-hidden"
          >
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold text-[#333] mb-2">Mensagem Enviada!</h2>
                <p className="text-[#666]">O vendedor entrará em contato em breve.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                      <Send size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#333]">Tenho Interesse</h2>
                      <p className="text-xs text-[#999]">Envie seus dados para o vendedor</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-[#999] hover:text-[#333] transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666] uppercase ml-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome"
                        className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl focus:outline-none focus:border-[#2D5A27] transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#666] uppercase ml-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl focus:outline-none focus:border-[#2D5A27] transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#666] uppercase ml-1">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                        <input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="seu@email.com"
                          className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl focus:outline-none focus:border-[#2D5A27] transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666] uppercase ml-1">Mensagem</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 text-[#999]" size={18} />
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl focus:outline-none focus:border-[#2D5A27] transition-all text-sm resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-2xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} /> Enviar Mensagem
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
