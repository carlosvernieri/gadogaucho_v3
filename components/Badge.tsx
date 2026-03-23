'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'verified' | 'seller-verified', className?: string }) => {
  const styles = {
    default: 'bg-white/90 text-[#333] text-[10px] font-bold px-2 py-1 rounded shadow-sm',
    verified: 'bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1',
    'seller-verified': 'bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1'
  };
  return (
    <div className={`${styles[variant]} ${className}`}>
      {(variant === 'verified' || variant === 'seller-verified') && <ShieldCheck size={variant === 'seller-verified' ? 10 : 12} />}
      {children}
    </div>
  );
};
