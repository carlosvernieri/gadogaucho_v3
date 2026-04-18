'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp, Bell, Share2, Search, Mail, Loader2, CheckCircle2, MapPin, X, Calendar } from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { RS_CITIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { ShareModal } from '@/components/ShareModal';
import { Sidebar } from '@/components/Sidebar';
import { NewsletterModal } from '@/components/NewsletterModal';

// formatPhone removido (movido para NewsletterModal)

// mockPraças removido para uso de dados reais via API

export default function PrecoDoGadoPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  // States for Newsletter Modal
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  // State for Share Modal
  const [showShareModal, setShowShareModal] = useState(false);

  // State for Market Data
  const [praças, setPraças] = useState<any[]>([]);
  const [loadingPraças, setLoadingPraças] = useState(true);

  // State for Global Navigation Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoadingPraças(true);
        const res = await fetch('/api/market-quotes');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPraças(data);
        }
      } catch (err) {
        console.error('Error fetching market quotes:', err);
      } finally {
        setLoadingPraças(false);
      }
    };
    fetchQuotes();
  }, []);

  // Newsletter logic removed (moved to NewsletterModal)

  const toggleCity = (cidade: string) => {
    if (expandedCity === cidade) {
      setExpandedCity(null);
    } else {
      setExpandedCity(cidade);
    }
  };

  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="text-emerald-600" />;
      case 'down': return <TrendingDown size={16} className="text-red-500" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const renderChart = (history: any[]) => (
    <div className="w-full h-[250px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `R$${value.toFixed(2)}`} />
          <RechartsTooltip
            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #E9ECEF', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="vaca" name="Vaca" stroke="#2D5A27" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="novilha" name="Novilha" stroke="#87C036" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="terneira" name="Terneira" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="terneiro" name="Terneiro" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0 bg-[#F8F9FA]">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full px-4 lg:px-8 py-8 relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={null}
          onSelectCategory={(cat) => {
            if (cat) router.push(`/?category=${encodeURIComponent(cat)}`);
            else router.push('/');
          }}
          searchQuery=""
          onSearchChange={() => { }}
          listingsCount={0}
          getCategoryCount={() => 0}
          citySearch=""
          onCitySearchChange={() => { }}
          maxDistance={100}
          onMaxDistanceChange={() => { }}
          onUseMyLocation={() => { }}
          citySuggestions={[]}
          onSelectCity={() => { }}
          showSuggestions={false}
          setShowSuggestions={() => { }}
          isDesktopHidden={true}
        />

        <main className="flex-1 min-w-0 w-full max-w-5xl mx-auto mt-4 lg:mt-0">

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight mb-2">
              Cotação e Inteligência de Mercado
            </h1>
            <p className="text-[#666] leading-relaxed">
              Consulte os preços médios do Quilo Vivo (R$/kg) nas principais praças pecuárias do Rio Grande do Sul.
            </p>
          </div>

          {/* Action Buttons Header */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => setShowNewsletterModal(true)}
              className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-[#2D5A27]/20"
            >
              <Mail size={18} /> Assinar Boletim (Grátis)
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-10 h-10 rounded-full bg-white border border-[#E9ECEF] flex items-center justify-center text-[#666] hover:text-[#2D5A27] hover:border-[#2D5A27] transition-all shadow-sm"
              title="Compartilhar"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden shadow-sm">

            <div className="p-6 border-b border-[#E9ECEF] flex flex-col md:flex-row md:items-center justify-between bg-[#FDFDFD] gap-2">
              <h2 className="text-xl font-bold text-[#2D5A27] flex items-center gap-2">
                Tabela de Preços (RS)
              </h2>
              <div className="text-sm font-medium text-[#999] flex items-center gap-1">
                <Info size={16} /> Última atualização: Hoje
              </div>
            </div>

            {/* Versão Desktop (Tabela Clássica com Accordion) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[11px] uppercase tracking-wider text-[#666]">
                    <th className="p-4 font-bold">Praça Geográfica</th>
                    <th className="p-4 font-bold text-center">Vaca</th>
                    <th className="p-4 font-bold text-center">Novilha</th>
                    <th className="p-4 font-bold text-center">Terneira</th>
                    <th className="p-4 font-bold text-center">Terneiro</th>
                    <th className="p-4 text-center font-bold">Tendência</th>
                    <th className="p-4 text-center font-bold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPraças ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin text-[#2D5A27]" />
                          <span className="text-sm text-[#999]">Carregando cotações reais...</span>
                        </div>
                      </td>
                    </tr>
                  ) : praças.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#999] text-sm italic">
                        Nenhuma cotação disponível no momento.
                      </td>
                    </tr>
                  ) : praças.map((praca, idx) => (
                    <React.Fragment key={praca.cidade}>
                      <tr
                        onClick={() => toggleCity(praca.cidade)}
                        className={`border-b border-[#E9ECEF] hover:bg-[#F8F9FA] transition-colors cursor-pointer ${idx === praças.length - 1 && expandedCity !== praca.cidade ? 'border-b-0' : ''}`}
                      >
                        <td className="p-4 font-bold text-[#333] whitespace-nowrap">
                          {praca.cidade}
                        </td>
                        <td className="p-4 text-center text-[#666] font-medium">
                          R$ {praca.vaca.toFixed(2)}
                        </td>
                        <td className="p-4 text-center text-[#666] font-medium">
                          R$ {praca.novilha.toFixed(2)}
                        </td>
                        <td className="p-4 text-center text-[#666] font-medium">
                          R$ {praca.terneira.toFixed(2)}
                        </td>
                        <td className="p-4 text-center text-[#666] font-medium">
                          R$ {praca.terneiro.toFixed(2)}
                        </td>
                        <td className="p-4 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white border border-[#E9ECEF] flex items-center justify-center shadow-sm">
                            {renderTrendIcon(praca.tendencia)}
                          </div>
                        </td>
                        <td className="p-4 text-[#999]">
                          {expandedCity === praca.cidade ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </td>
                      </tr>

                      {/* Gaveta do Accordion Desktop */}
                      {expandedCity === praca.cidade && (
                        <tr className="bg-[#FDFDFD] border-b border-[#E9ECEF]">
                          <td colSpan={7} className="p-0">
                            <div className="p-6 lg:p-8 flex flex-col items-center">
                              <h3 className="text-[#333] font-bold text-lg mb-2">Evolução Gráfica - {praca.cidade}</h3>
                              <p className="text-sm text-[#666] mb-4">Veja a flutuação do Kg Vivo nas últimas 4 semanas de amostragem.</p>
                              {renderChart(praca.history)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Versão Mobile (Cards Responsivos com Accordion) */}
            <div className="md:hidden flex flex-col">
              {praças.map((praca, idx) => (
                <div key={praca.cidade} className={`flex flex-col ${idx !== praças.length - 1 ? 'border-b border-[#E9ECEF]' : ''}`}>

                  {/* Cabeçalho do Card (Clicável) */}
                  <div
                    className="p-5 flex flex-col gap-4 cursor-pointer hover:bg-[#F8F9FA] transition-colors active:bg-[#E9ECEF]"
                    onClick={() => toggleCity(praca.cidade)}
                  >
                    <div className="flex items-center justify-between border-b border-[#F8F9FA] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#333] text-lg">{praca.cidade}</span>
                        <div className="w-8 h-8 rounded-full bg-[#F8F9FA] border border-[#E9ECEF] flex items-center justify-center shadow-sm">
                          {renderTrendIcon(praca.tendencia)}
                        </div>
                      </div>
                      <div className="text-[#999]">
                        {expandedCity === praca.cidade ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                      <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Vaca</span>
                        <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.vaca.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Novilha</span>
                        <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.novilha.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Terneira</span>
                        <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.terneira.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Terneiro</span>
                        <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.terneiro.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gaveta do Accordion Mobile */}
                  {expandedCity === praca.cidade && (
                    <div className="p-4 bg-[#FDFDFD] border-t border-[#E9ECEF] flex flex-col items-center">
                      <h3 className="text-[#333] font-bold text-center">Histórico Gráfico</h3>
                      <span className="text-xs text-[#666] text-center mb-2">Últimas 4 semanas</span>
                      {renderChart(praca.history)}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>

          {/* Helper Note removed as data is now real */}

        </main>
      </div>

      {/* Newsletter Modal Reutilizável */}
      <NewsletterModal
        isOpen={showNewsletterModal}
        onClose={() => setShowNewsletterModal(false)}
      />

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}

      {/* Modal de Compartilhamento Premium */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== 'undefined' ? window.location.href : 'https://app.gadogaucho.com/precodogado'}
        title="Confira a cotação atualizada do gado nas praças do RS pelo Gado Gaúcho!"
        onCopySuccess={() => alert('Link das cotações copiado para a área de transferência!')}
      />
    </div>
  );
}
