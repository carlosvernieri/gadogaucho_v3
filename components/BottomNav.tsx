'use client';

import React from 'react';
import { Home, Heart, MessageSquare, PlusCircle, User } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface BottomNavProps {
  user: any;
  onAdClick: () => void;
  onAuthClick: () => void;
}

export const BottomNav = ({ user, onAdClick, onAuthClick }: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Início', path: '/', action: () => router.push('/') },
    { icon: Heart, label: 'Favoritos', path: '/favoritos', action: () => user ? router.push('/favoritos') : onAuthClick() },
    { icon: PlusCircle, label: 'Anunciar', path: null, action: onAdClick, primary: true },
    { icon: MessageSquare, label: 'Mensagens', path: '/mensagens', action: () => user ? router.push('/mensagens') : onAuthClick() },
    { icon: User, label: 'Perfil', path: '/meus-anuncios', action: () => user ? router.push('/meus-anuncios') : onAuthClick() },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E9ECEF] px-2 py-2 z-40 flex items-center justify-around pb-safe">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.path === pathname;
        
        if (item.primary) {
          return (
            <button
              key={index}
              onClick={item.action}
              className="flex flex-col items-center justify-center -mt-8 bg-[#2D5A27] text-white w-14 h-14 rounded-full shadow-lg shadow-[#2D5A27]/30 cursor-pointer"
            >
              <Icon size={24} />
            </button>
          );
        }

        return (
          <button
            key={index}
            onClick={item.action}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-colors cursor-pointer ${isActive ? 'text-[#2D5A27]' : 'text-[#999]'}`}
          >
            <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
