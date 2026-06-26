'use client';

import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';

export const Badge = ({ children, variant = 'default', className = '' }: { children?: React.ReactNode, variant?: 'default' | 'verified' | 'seller-verified', className?: string }) => {
  const styles = {
    default: 'bg-white/90 text-[#333] text-[10px] font-bold px-2 py-1 rounded shadow-sm',
    verified: 'bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1',
    'seller-verified': 'bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1'
  };
  return (
    <div className={`${styles[variant]} ${className}`}>
      {variant === 'verified' && <Star size={12} fill="currentColor" />}
      {variant === 'seller-verified' && <ShieldCheck size={12} />}
      {children}
    </div>
  );
};
