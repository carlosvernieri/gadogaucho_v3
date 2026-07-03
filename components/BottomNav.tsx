'use client';

import React from 'react';
import { Home, Heart, MessageSquare, PlusCircle, User, Megaphone } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';

interface BottomNavProps {
  user?: any;
  onAdClick?: () => void;
  onAuthClick?: () => void;
}

export const BottomNav = ({ user: defaultUser, onAdClick: defaultOnAdClick, onAuthClick: defaultOnAuthClick }: BottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user: contextUser, setShowAdModal, setAuthMode, setShowAuthModal, unreadCount } = useUser();
  const user = defaultUser || contextUser;

  const handleAuth = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleAd = () => {
    setShowAdModal(true);
  };

  const navItems = [
    { icon: Home, label: 'Início', path: '/', action: () => router.push('/') },
    { icon: Heart, label: 'Favoritos', path: '/favoritos', action: () => user ? router.push('/favoritos') : handleAuth() },
    ...(user ? [{ icon: PlusCircle, label: 'Anunciar', path: null, action: handleAd, primary: true }] : []),
    { icon: MessageSquare, label: 'Mensagens', path: '/mensagens', action: () => user ? router.push('/mensagens') : handleAuth() },
    { icon: User, label: 'Meu Painel', path: '/meus-anuncios', action: () => user ? router.push('/meus-anuncios') : handleAuth() },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 mx-auto max-w-md w-full bg-white border-t border-[#E9ECEF] pt-2 pb-5 px-6 z-[100] flex items-center transform-gpu shadow-[0_-10px_30px_rgba(0,0,0,0.03)] pb-[calc(env(safe-area-inset-bottom)+12px)] print:hidden">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.path === pathname;

        if (item.primary) {
          return (
            <div key={index} className="flex-1 flex justify-center">
              <button
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-8 bg-[#2D5A27] text-white w-14 h-14 shrink-0 rounded-full shadow-lg shadow-[#2D5A27]/30 cursor-pointer"
              >
                <Icon size={24} />
              </button>
            </div>
          );
        }

        return (
          <button
            key={index}
            onClick={item.action}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-colors cursor-pointer ${isActive ? 'text-[#2D5A27]' : 'text-[#999]'}`}
          >
            <div className="relative">
              <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              {item.label === 'Mensagens' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC3545] text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter w-full text-center truncate px-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
