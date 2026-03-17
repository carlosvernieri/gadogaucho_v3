'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'verified' }) => {
  const styles = {
    default: 'bg-white/90 text-[#333] text-[10px] font-bold px-2 py-1 rounded shadow-sm',
    verified: 'bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1'
  };
  return (
    <div className={styles[variant]}>
      {variant === 'verified' && <ShieldCheck size={12} />}
      {children}
    </div>
  );
};
