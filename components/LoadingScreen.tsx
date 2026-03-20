'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
  showLogo?: boolean;
}

export const LoadingScreen = ({ 
  fullScreen = true, 
  message = "Carregando...", 
  showLogo = true 
}: LoadingScreenProps) => {
  const content = (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? '' : 'py-20 w-full'}`}>
      {showLogo && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.1, 1],
            opacity: 1,
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="w-16 h-16 bg-[#2D5A27] rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#2D5A27]/20"
        >
          <LayoutGrid size={32} />
        </motion.div>
      )}
      
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-xl font-bold text-[#333] tracking-tight">{message}</h2>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2.5 h-2.5 bg-[#2D5A27] rounded-full shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
