'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';

export default function TermosPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => {}}
        onAuthClick={(mode) => { setAuthMode(mode as 'login'|'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />
      <main className="max-w-4xl mx-auto px-4 lg:px-8 bg-white p-8 rounded-3xl border border-[#E9ECEF] mt-12 mb-12 w-full">
        <h1 className="text-3xl font-bold text-[#333] mb-8">Termos de Uso</h1>
        
        <div className="space-y-6 text-[#666] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">1. Aceitação</h2>
            <p>Ao utilizar a plataforma Gado Gaúcho, você concorda com os termos aqui expostos. A plataforma atua apenas como um classificado eletrônico, não participando, endossando ou se responsabilizando pelas transações realizadas entre os usuários.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">2. Responsabilidade sobre os Anúncios</h2>
            <p>Toda a informação contida nos anúncios, incluindo origem do gado, peso, valores nutricionais e saúde animal, é de estrita responsabilidade do usuário vendedor. O Gado Gaúcho não audita a veracidade das informações.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">3. Uso Seguro</h2>
            <p>Recomendamos a todos os compradores prudência e checagem da procedência animal através de visitas in-loco e emissão correta da Guia de Trânsito Animal (GTA). A Gado Gaúcho nunca solicita senhas, pagamentos por fora ou comissões não declaradas no escopo do portal.</p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-[#E9ECEF]">
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#F8F9FA] text-[#666] font-bold rounded-xl hover:bg-[#E9ECEF] transition-all cursor-pointer">
            Concordar e Voltar
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
