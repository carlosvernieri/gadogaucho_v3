'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Copy, Facebook, Instagram, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onCopySuccess: () => void;
}

export const ShareModal = ({ isOpen, onClose, url, title, onCopySuccess }: ShareModalProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle size={24} />,
      color: 'bg-[#25D366]',
      link: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: <Facebook size={24} />,
      color: 'bg-[#1877F2]',
      link: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      name: 'Instagram',
      icon: <Instagram size={24} />,
      color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
      link: `https://www.instagram.com/` // Instagram doesn't have a direct share URL for web, usually just opens the app
    },
    {
      name: 'Copiar Link',
      icon: <Copy size={24} />,
      color: 'bg-[#666]',
      action: () => {
        navigator.clipboard.writeText(url);
        onCopySuccess();
        onClose();
      }
    }
  ];

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-8 z-[120] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                  <Share2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#333]">Compartilhar</h2>
                  <p className="text-xs text-[#999]">Espalhe essa oferta para seus contatos</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-[#999] hover:text-[#333] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => {
                    if (option.action) {
                      option.action();
                    } else if (option.link) {
                      window.open(option.link, '_blank');
                    }
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-[#E9ECEF] hover:border-[#2D5A27] hover:bg-[#F8F9FA] transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${option.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    {option.icon}
                  </div>
                  <span className="text-sm font-bold text-[#333]">{option.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] flex items-center justify-between gap-4">
              <span className="text-xs text-[#666] truncate flex-1">{url}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  onCopySuccess();
                  onClose();
                }}
                className="text-xs font-bold text-[#2D5A27] hover:underline whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
            
            <p className="mt-6 text-center text-[10px] text-[#999] uppercase tracking-widest font-bold">
              Dica: No Instagram, cole o link na sua bio ou nos stories.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
