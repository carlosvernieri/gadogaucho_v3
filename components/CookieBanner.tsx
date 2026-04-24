'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cookie } from 'lucide-react';

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't accepted yet
    const hasAccepted = localStorage.getItem('gg_cookie_consent');
    if (!hasAccepted) {
      // Small delay so it doesn't pop up immediately on page load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('gg_cookie_consent', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 lg:p-6 pb-24 lg:pb-6 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-[#E9ECEF] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pointer-events-auto">
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                <Cookie className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#333] mb-1">Aviso de Cookies e Privacidade</h3>
                <p className="text-xs text-[#666] leading-relaxed max-w-2xl">
                  Utilizamos cookies para melhorar sua experiência, personalizar anúncios e garantir a segurança do nosso ambiente. Ao continuar navegando, você concorda com a nossa <a href="/politica-de-privacidade" className="text-[#2D5A27] font-bold hover:underline">Política de Privacidade</a> (LGPD).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setShow(false)}
                className="p-2 text-[#999] hover:text-[#333] rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={20} />
              </button>
              <button 
                onClick={acceptCookies}
                className="flex-1 md:flex-none px-6 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all cursor-pointer shadow-lg shadow-[#2D5A27]/20 whitespace-nowrap text-sm"
              >
                Aceitar e Continuar
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
