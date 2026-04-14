'use client';

import React from 'react';
import { LayoutGrid, Megaphone, Bell, ShieldCheck, LogOut, Menu, Heart, MessageSquare, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: any;
  onMenuClick: () => void;
  onAuthClick: (mode: 'login' | 'register') => void;
  onAdClick: () => void;
  onAdminClick: () => void;
  onLogout: () => void;
  onHomeClick: () => void;
  onFavoritesClick: () => void;
  onMyAdsClick?: () => void;
  onMessagesClick?: () => void;
}

export const Header = ({
  user,
  onMenuClick,
  onAuthClick,
  onAdClick,
  onAdminClick,
  onLogout,
  onHomeClick,
  onFavoritesClick,
  onMyAdsClick,
  onMessagesClick
}: HeaderProps) => {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E9ECEF] px-4 lg:px-8 py-4">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#333] cursor-pointer"
          >
            <Menu size={22} className="sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={onHomeClick}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white">
              <LayoutGrid size={22} className="sm:w-6 sm:h-6" />
            </div>
            <span className="text-[22px] sm:text-3xl font-normal text-[#2D5A27] tracking-tight font-logo">Gado Gaúcho</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={onAdClick}
                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-emerald-100 text-[#2D5A27] rounded-lg text-sm font-bold hover:bg-emerald-200 transition-all shadow-md shadow-emerald-800/10 cursor-pointer"
              >
                <Megaphone size={18} /> Anuncie aqui
              </button>

              <button
                onClick={() => router.push('/precodogado')}
                className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
                title="Cotações R$/kg"
              >
                <TrendingUp size={20} />
                <span className="hidden sm:inline">Cotações</span>
              </button>

              <div className="hidden lg:flex items-center gap-2">


                {user.is_admin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold"
                    title="Painel Administrativo"
                  >
                    <ShieldCheck size={20} />
                    <span className="hidden xl:inline">Admin</span>
                  </button>
                )}
                <button
                  onClick={onMyAdsClick}
                  className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
                  title="Meus Anúncios"
                >
                  <Megaphone size={20} />
                  <span className="hidden xl:inline">Meus Anúncios</span>
                </button>
                <button
                  onClick={onMessagesClick || (() => router.push('/mensagens'))}
                  className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
                  title="Mensagens"
                >
                  <MessageSquare size={20} />
                  <span className="hidden xl:inline">Mensagens</span>
                </button>
                <button
                  onClick={onFavoritesClick}
                  className="p-2 text-[#666] hover:bg-red-50 hover:text-[#DC3545] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
                  title="Meus Favoritos"
                >
                  <Heart size={20} />
                  <span className="hidden xl:inline">Favoritos</span>
                </button>
                {/* <button className="p-2 text-[#666] hover:text-[#333] relative cursor-pointer">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC3545] rounded-full border-2 border-white" />
                </button> */}
              </div>
              <div className="flex flex-row-reverse sm:flex-row items-center gap-3">
                <button
                  onClick={onLogout}
                  className="p-2 text-[#999] hover:text-[#333] transition-colors cursor-pointer"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAuthClick('register')}
                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-emerald-100 text-[#2D5A27] rounded-lg text-sm font-bold hover:bg-emerald-200 transition-all shadow-md shadow-emerald-800/10 cursor-pointer"
              >
                <Megaphone size={18} /> Anuncie aqui
              </button>
              <button
                onClick={() => onAuthClick('login')}
                className="flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 bg-[#2D5A27] text-[#FFF] rounded-lg text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </header >
  );
};
