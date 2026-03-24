'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Loader2, CheckCircle2, Info, AlertCircle } from 'lucide-react';

// Simple toast implementation
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const event = new CustomEvent('app-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const ToastContainer = () => {
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  React.useEffect(() => {
    const handleToast = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] w-full max-w-xs px-4"
        >
          <div className={`
            flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md
            ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 
              toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : 
              'bg-blue-50/90 border-blue-200 text-blue-800'}
          `}>
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-600 shrink-0" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-600 shrink-0" />}
            <span className="text-sm font-bold leading-tight">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  type?: 'danger' | 'info' | 'warning' | 'success';
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
  type = 'info'
}: ConfirmModalProps) => {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          icon: 'text-amber-600',
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50',
          icon: 'text-emerald-600',
          button: 'bg-[#2D5A27] hover:bg-[#1E3D1A] shadow-[#2D5A27]/20'
        };
      default:
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 ${colors.bg} rounded-2xl flex items-center justify-center ${colors.icon}`}>
                  <AlertTriangle size={24} />
                </div>
                <button onClick={onClose} className="text-[#999] hover:text-[#333] cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-[#333] mb-2">{title}</h3>
              <p className="text-[#666] text-sm leading-relaxed mb-8">{message}</p>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 bg-[#F8F9FA] text-[#666] font-bold rounded-xl hover:bg-[#E9ECEF] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${colors.button}`}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
