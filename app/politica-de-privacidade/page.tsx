'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { ShieldCheck } from 'lucide-react';

export default function PoliticaPrivacidadePage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0 min-h-screen bg-[#F8F9FA]">
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
      
      <main className="max-w-4xl mx-auto px-4 lg:px-8 bg-white p-8 rounded-3xl border border-[#E9ECEF] mt-12 mb-12 w-full shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="text-[#2D5A27]" size={32} />
          <h1 className="text-3xl font-bold text-[#333]">Política de Privacidade</h1>
        </div>
        
        <p className="text-sm text-[#999] mb-8 font-medium">Última atualização: 23 de Abril de 2026</p>

        <div className="space-y-8 text-[#666] leading-relaxed">
          
          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">1. Nosso Compromisso com a Privacidade</h2>
            <p>
              O <strong>Gado Gaúcho</strong> tem o compromisso de respeitar a sua privacidade e garantir o sigilo de todas as informações que você nos fornece. Todos os dados cadastrados no nosso aplicativo são utilizados apenas para melhorar sua experiência de navegação e viabilizar a negociação segura entre pecuaristas, respeitando integralmente a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">2. Quais Dados Coletamos?</h2>
            <p className="mb-2">Para criar sua conta e permitir a interação na plataforma, solicitamos os seguintes dados pessoais básicos:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Nome Completo:</strong> Para identificação dentro da plataforma e nas negociações.</li>
              <li><strong>E-mail e Senha:</strong> Para garantir o acesso seguro à sua conta. (Sua senha é criptografada e não temos acesso a ela).</li>
              <li><strong>Número de Telefone:</strong> Para que compradores interessados possam entrar em contato com você via WhatsApp.</li>
              <li><strong>Cidade/Município:</strong> Para facilitar a busca e o transporte de lotes de gado na sua região.</li>
            </ul>
            <p className="mt-3">
              Não solicitamos dados sensíveis (como informações bancárias, CPF ou saúde) para o cadastro inicial, visto que nossa plataforma opera apenas como um classificado eletrônico e as transações ocorrem fora dela.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">3. Como Usamos Seus Dados?</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Facilitar o contato direto entre vendedor e comprador (o número de telefone ficará visível apenas nos anúncios que você publicar).</li>
              <li>Enviar notificações sobre o andamento dos seus anúncios ou mensagens recebidas.</li>
              <li>Prevenir fraudes e manter a segurança do ambiente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">4. Compartilhamento de Dados</h2>
            <p>
              Nós <strong>não vendemos, alugamos ou compartilhamos</strong> seus dados pessoais com terceiros para fins publicitários. Seus dados de contato (Nome e Telefone) só serão exibidos publicamente quando você optar por publicar um anúncio de venda de gado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">5. Uso de Cookies</h2>
            <p>
              Utilizamos cookies (pequenos arquivos de texto salvos no seu navegador) apenas para manter sua sessão logada e lembrar das suas preferências de busca. Você pode desativá-los nas configurações do seu navegador, mas isso pode limitar algumas funcionalidades do site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">6. Seus Direitos (Direitos do Titular)</h2>
            <p className="mb-2">Conforme a LGPD, você tem o direito de:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Confirmar a existência de tratamento de dados.</li>
              <li>Acessar e corrigir dados incompletos ou desatualizados através do seu painel.</li>
              <li><strong>Exclusão de Dados:</strong> Você pode solicitar a exclusão total da sua conta e de todos os seus dados a qualquer momento enviando um e-mail ou mensagem para nosso suporte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2D5A27] mb-3">7. Contato para Dúvidas</h2>
            <p>
              Se tiver qualquer dúvida sobre esta política ou sobre como tratamos seus dados, entre em contato conosco através do WhatsApp (51) 98192-6800.
            </p>
          </section>

        </div>

        <div className="mt-8 pt-8 border-t border-[#E9ECEF] flex gap-4">
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all cursor-pointer shadow-lg shadow-[#2D5A27]/20">
            Voltar ao Início
          </button>
          <button onClick={() => router.push('/termos')} className="px-6 py-3 bg-[#F8F9FA] text-[#666] font-bold rounded-xl hover:bg-[#E9ECEF] transition-all cursor-pointer">
            Ler Termos de Uso
          </button>
        </div>
      </main>

      {user && (
        <BottomNav />
      )}
    </div>
  );
}
