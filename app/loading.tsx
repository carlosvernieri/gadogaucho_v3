'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center">
      <div
        className="w-16 h-16 bg-[#2D5A27] rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#2D5A27]/20 animate-bounce"
      >
        <LayoutGrid size={32} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold text-[#333] tracking-tight">Gado Gaúcho</h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#2D5A27] rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
