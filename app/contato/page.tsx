'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';

export default function ContatoPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => {}}
        onAuthClick={(mode) => { setAuthMode(mode as 'login'|'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />
      <main className="max-w-3xl mx-auto px-4 lg:px-8 bg-white min-h-[50vh] p-8 rounded-3xl border border-[#E9ECEF] mt-12 w-full">
        <h1 className="text-3xl font-bold text-[#333] mb-6">Entre em Contato</h1>
        <p className="text-[#666] leading-relaxed mb-6">
          Nossa equipe está pronta para te atender. Para dúvidas, relatos de uso indevido, problemas técnicos ou 
          apoio com sua negociação de gado, utilize os canais abaixo.
        </p>
        
        <div className="bg-[#F8F9FA] p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-[#2D5A27]">WhatsApp Geral</h3>
            <p className="text-[#666] mt-1">+55 51 98192-6800</p>
          </div>
          <hr className="border-[#E9ECEF]" />
          <div>
            <h3 className="font-bold text-[#2D5A27]">Redes Sociais</h3>
            <p className="text-[#666] mt-1">@gadogaucho</p>
          </div>
        </div>
        
        <div className="mt-8">
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#F8F9FA] text-[#666] font-bold rounded-xl hover:bg-[#E9ECEF] transition-all cursor-pointer">
            Voltar para o Início
          </button>
        </div>
      </main>

      {user && (
        <BottomNav 
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}
    </div>
  );
}
