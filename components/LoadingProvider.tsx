'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';

interface LoadingContextType {
  setIsLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading must be used within a LoadingProvider');
  return context;
};

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  // Hide loading screen when the path changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ setIsLoading }}>
      {isLoading && (
        <div
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
        >
          <div
            className="w-16 h-16 bg-[#2D5A27] rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#2D5A27]/20 animate-pulse"
          >
            <LayoutGrid size={32} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-bold text-[#333] tracking-tight">Carregando...</h2>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-[#2D5A27] rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
};
