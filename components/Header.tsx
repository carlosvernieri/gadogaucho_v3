'use client';

import React from 'react';
import { LayoutGrid, Megaphone, Bell, ShieldCheck, LogOut, Menu, Heart, MessageSquare, TrendingUp, BarChart3, Calculator } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUser } from '@/context/UserContext';

interface HeaderProps {
  user?: any;
  onMenuClick?: () => void;
  onAuthClick?: (mode: 'login' | 'register') => void;
  onAdClick?: () => void;
  onAdminClick?: () => void;
  onLogout?: () => void;
  onHomeClick: () => void;
  onFavoritesClick: () => void;
  onMyAdsClick?: () => void;
  onMessagesClick?: () => void;
}

export const Header = ({
  user: defaultUser,
  onMenuClick,
  onAuthClick: defaultOnAuthClick,
  onAdClick: defaultOnAdClick,
  onAdminClick,
  onLogout: defaultOnLogout,
  onHomeClick,
  onFavoritesClick,
  onMyAdsClick,
  onMessagesClick
}: HeaderProps) => {
  const router = useRouter();
  const { user: contextUser, setShowAdModal, setAuthMode, setShowAuthModal, logout, unreadCount } = useUser();
  const user = defaultUser || contextUser;

  const handleAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleAd = () => {
    setShowAdModal(true);
  };

  const handleLogout = () => {
    if (defaultOnLogout) defaultOnLogout();
    logout();
    router.push('/');
  };

  const handleHome = () => {
    if (onHomeClick) onHomeClick();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E9ECEF] px-3 sm:px-4 lg:px-8 py-4 print:hidden">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#333] cursor-pointer"
          >
            <Menu size={22} className="sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleHome}>
            <div className="hidden sm:flex w-10 h-10 bg-[#2D5A27] rounded-xl items-center justify-center text-white">
              <LayoutGrid size={22} className="sm:w-6 sm:h-6" />
            </div>
            <span className="text-[24.5px] sm:text-3xl font-normal text-[#2D5A27] tracking-tight font-logo">Gado Gaúcho</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4">
          {/* Cotações - sempre visível */}
          <button
            onClick={() => router.push('/precodogado')}
            className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
            title="Cotações R$/kg"
          >
            <TrendingUp size={20} />
            <span className="hidden sm:inline">Cotações</span>
          </button>

          <button
            onClick={() => router.push('/relatorio-preco-do-gado')}
            className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
            title="Boletim de Inteligência"
          >
            <BarChart3 size={20} />
            <span className="hidden sm:inline">Boletim</span>
          </button>

          <button
            onClick={() => router.push('/calculadoras')}
            className="p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#2D5A27] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-medium"
            title="Nossas Calculadoras Técnicas"
          >
            <Calculator size={20} />
            <span className="hidden sm:inline">Calculadoras</span>
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={handleAd}
                className="hidden sm:flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 bg-[#2D5A27] text-white rounded-lg text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
              >
                <Megaphone size={18} /> Anuncie aqui
              </button>

              <div className="hidden lg:flex items-center gap-2">


                {user.is_admin && (
                  <button
                    onClick={onAdminClick || (() => router.push('/admin'))}
                    className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold"
                    title="Painel Administrativo"
                  >
                    <ShieldCheck size={20} />
                    <span className="hidden xl:inline">Admin</span>
                  </button>
                )}
                <button
                  onClick={onMyAdsClick || (() => router.push('/meus-anuncios'))}
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
                  <div className="relative">
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#DC3545] text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-sm shadow-[#DC3545]/40">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline">Mensagens</span>
                </button>
                <button
                  onClick={onFavoritesClick || (() => router.push('/favoritos'))}
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
                  onClick={handleLogout}
                  className="p-2 text-[#999] hover:text-[#333] transition-colors cursor-pointer"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAuth('register')}
                className="hidden sm:flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 bg-[#2D5A27] text-white rounded-lg text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
              >
                <Megaphone size={18} /> Anuncie aqui
              </button>
              <button
                onClick={() => handleAuth('login')}
                className="flex items-center gap-2 px-3.5 py-2 sm:px-6 sm:py-2.5 bg-[#2D5A27] text-[#FFF] rounded-lg text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer"
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
