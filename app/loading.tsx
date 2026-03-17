'use client';

import React from 'react';
import { motion } from 'motion/react';
import { LayoutGrid } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 bg-[#2D5A27] rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#2D5A27]/20"
      >
        <LayoutGrid size={32} />
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold text-[#333] tracking-tight">Gado Gaúcho</h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 bg-[#2D5A27] rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
