'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, TrendingDown, Minus, Info,
  BarChart3, Globe, MapPin, Printer,
  ChevronRight, Calendar, ArrowRightLeft,
  Share2, Mail
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { NewsletterModal } from '@/components/NewsletterModal';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function MercadoReportPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/market-report');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching market report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const marketAnalysis = React.useMemo(() => {
    if (!reportData) return null;

    const stats = reportData.categoryStats || [];
    const cepea = reportData.cepeaData;
    const b3 = reportData.b3Futures || [];
    const scot = reportData.scotData;

    // 1. Determine Overall Trend
    const upCount = stats.filter((s: any) => s.trend === 'up').length;
    const downCount = stats.filter((s: any) => s.trend === 'down').length;
    let mainTrend = 'estabilidade';
    if (upCount > downCount + 1) mainTrend = 'valorização';
    if (downCount > upCount + 1) mainTrend = 'retração';

    // 2. Find Highlight Category
    const highlight = [...stats].sort((a: any, b: any) => b.delta - a.delta)[0];

    // 3. Platform vs Auction Analysis
    const betterDirect = stats.filter((s: any) => s.platformAvg > 0 && s.platformAvg < s.auctionAvg).length;
    
    // 4. B3 Curve Analysis
    const firstB3 = b3[0]?.price || 0;
    const lastB3 = b3[b3.length - 1]?.price || 0;
    const b3Trend = lastB3 > firstB3 ? 'contango (alta)' : 'backwardation (baixa)';

    // Build Summary
    const summary = `O mercado gaúcho apresenta um cenário de ${mainTrend} nas principais praças pesquisadas. ` +
      `${cepea?.trend === 'up' ? 'Acompanhando a firmeza do Indicador CEPEA (SP),' : 'Apesar da oscilação no Indicador CEPEA (SP),'} ` +
      `o estado registra preços ${mainTrend === 'valorização' ? 'em ascensão' : 'sustentados'} principalmente pela ${highlight?.delta > 0 ? 'valorização do ' + highlight.category : 'baixa oferta de animais terminados'}. ` +
      `Na plataforma Gado Gaúcho, ${betterDirect > 2 ? 'existem excelentes oportunidades de compra direta da porteira com valores abaixo da média dos leilões' : 'as ofertas diretas acompanham o ritmo do atacado, mantendo a competitividade logística'}.`;

    const b3Analysis = `O mercado financeiro sinaliza uma curva de ${b3Trend} até ${b3[b3.length-1]?.month || 'o final do período'}, ` +
      `com o Boi Gordo projetado em R$ ${(lastB3 / 30).toFixed(2)} /kg (Eq. R$ ${lastB3.toFixed(2)} /@). Esta dinâmica reflete as expectativas ${lastB3 > firstB3 ? 'positivas quanto à demanda de exportação e entressafra' : 'de maior oferta de animais de pasto nos meses de inverno'}.`;

    return {
      summary,
      b3Analysis,
      highlight: {
        category: highlight?.category || 'Boi Gordo',
        delta: highlight?.delta || 0,
        price: highlight?.auctionAvg || 0
      }
    };
  }, [reportData]);

  const b3FuturesMapped = React.useMemo(() => {
    return (reportData?.b3Futures || []).map((f: any) => {
      const priceKgNum = typeof f.priceKg === 'number' ? f.priceKg : parseFloat(f.priceKg || 0);
      return {
        ...f,
        priceKgNum: priceKgNum || (f.price / 30)
      };
    });
  }, [reportData?.b3Futures]);


  if (loading) {
    return <LoadingScreen message="Consolidando dados do mercado..." />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-24 lg:pb-0">
      <div className="print:hidden">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
          onAdClick={() => router.push('/?ad=new')}
          onAdminClick={() => router.push('/admin')}
          onLogout={() => { logout(); router.push('/'); }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
        />

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
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 lg:px-8 py-8">

        {/* Header Relatório */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest print:hidden">
              <BarChart3 size={18} /> Inteligência de Mercado
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              Boletim Semanal de Preços
            </h1>
            <div className="flex items-center gap-3 text-[#666] text-sm mt-1">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#E9ECEF] shadow-sm">
                <Calendar size={14} /> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#E9ECEF] text-[#666] hover:text-[#2D5A27] hover:border-[#2D5A27] transition-all shadow-sm font-bold"
                title="Compartilhar Relatório"
              >
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </div>
        </div>

        {/* Resumo Executivo e Indicadores Rápidos */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-bl-full -mr-8 -mt-8" />
            <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
              <Info className="text-[#2D5A27]" size={22} /> Resumo do Comportamento
            </h2>
            <p className="text-[#666] leading-relaxed relative z-10 text-sm">
              {marketAnalysis?.summary}
            </p>
          </div>

          <div className="bg-[#2D5A27] rounded-3xl p-6 text-white shadow-lg shadow-[#2D5A27]/20 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold mb-1 opacity-80 uppercase tracking-widest text-[10px]">Destaque RS</h3>
              <p className="text-xs text-white leading-snug font-medium">
                {marketAnalysis?.highlight.category} registrou a maior valorização, com média de R$ {marketAnalysis?.highlight.price.toFixed(2)}/kg.
                <span className="opacity-75 text-[10px] block mt-0.5">Eq. R$ {(marketAnalysis!.highlight.price * 30).toFixed(2)}/@</span>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xl font-black">{marketAnalysis?.highlight.delta > 0 ? '+' : ''}{marketAnalysis?.highlight.delta}%</span>
              {marketAnalysis?.highlight.delta >= 0 ? <TrendingUp size={18} className="text-[#87C036]" /> : <TrendingDown size={18} className="text-red-400" />}
            </div>
          </div>
        </div>

        {/* Comparativo Principal */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-[#E9ECEF] bg-[#FDFDFD] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#333] flex items-center gap-2">
              <ArrowRightLeft className="text-[#2D5A27]" size={20} /> Comparativo de Mercado Gaúcho
            </h2>
            <div className="px-3 py-1 bg-[#2D5A27]/5 text-[#2D5A27] rounded-lg text-[10px] font-bold uppercase tracking-wider border border-[#2D5A27]/10">
              Dados Consolidados
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] text-[10px] uppercase tracking-widest text-[#999] font-bold border-b border-[#E9ECEF]">
                  <th className="px-6 py-4">Categoria Animal</th>
                  <th className="px-6 py-4 text-center">Média Leilões (Atacado)</th>
                  <th className="px-6 py-4 text-center">Média Gado Gaúcho (Oferta)</th>
                  <th className="px-6 py-4 text-center">Variação Semanal</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.categoryStats?.map((stat: any) => (
                  <tr key={stat.category} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA]/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#333]">{stat.category}</td>
                    <td className="px-6 py-4 text-center text-[#666] font-medium">
                      {stat.auctionAvg > 0 ? `R$ ${stat.auctionAvg.toFixed(2)} /kg` : 'S/ DADOS'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#2D5A27]">
                      {stat.platformAvg > 0 ? `R$ ${stat.platformAvg.toFixed(2)} /kg` : 'S/ DADOS'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
                          stat.trend === 'down' ? 'bg-red-50 text-red-600' :
                            'bg-gray-50 text-gray-500'
                        }`}>
                        {stat.trend === 'up' ? <TrendingUp size={12} /> :
                          stat.trend === 'down' ? <TrendingDown size={12} /> :
                            <Minus size={12} />}
                        {stat.delta === 0 ? 'ESTÁVEL' : `${stat.delta > 0 ? '+' : ''}${stat.delta}%`}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Referências Scot */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-[#E9ECEF] bg-[#FDFDFD] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#333] flex items-center gap-2">
              <Globe className="text-[#2171B5]" size={20} /> Referências Scot Consultoria (RS)
            </h2>
            <div className="px-3 py-1 bg-[#2171B5]/5 text-[#2171B5] rounded-lg text-[10px] font-bold uppercase tracking-wider border border-[#2171B5]/10">
              Benchmark Externo
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] text-[10px] uppercase tracking-widest text-[#999] font-bold border-b border-[#E9ECEF]">
                  <th className="px-6 py-4">Praça Scot</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-center">Preço à Vista</th>
                  <th className="px-6 py-4 text-center">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {/* Pelotas */}
                {reportData?.scotData?.pelotas?.map((item: any, idx: number) => (
                  <tr key={`pel-${idx}`} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA]/50 transition-colors">
                    {idx === 0 && (
                      <td rowSpan={reportData.scotData.pelotas.length} className="px-6 py-4 font-bold text-[#333] border-r border-[#F8F9FA]">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#999]" /> Pelotas
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-[#666] font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-center font-bold text-[#2D5A27]">R$ {item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center text-[10px] text-[#999] font-bold">R$/kg vivo</td>
                  </tr>
                ))}
                {/* Oeste */}
                {reportData?.scotData?.oeste?.map((item: any, idx: number) => (
                  <tr key={`oes-${idx}`} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA]/50 transition-colors">
                    {idx === 0 && (
                      <td rowSpan={reportData.scotData.oeste.length} className="px-6 py-4 font-bold text-[#333] border-r border-[#F8F9FA]">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#999]" /> RS Oeste
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-[#666] font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-center font-bold text-[#2D5A27]">R$ {item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center text-[10px] text-[#999] font-bold">R$/kg vivo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Indicador CEPEA - Agora abaixo da Scot */}
        <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Globe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest">Indicador CEPEA</span>
                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">
                  SP/B3
                </div>
              </div>
              <h3 className="text-xl font-black text-[#333]">
                R$ {typeof reportData?.cepeaData?.priceKg === 'string' ? parseFloat(reportData.cepeaData.priceKg).toFixed(2) : reportData?.cepeaData?.priceKg?.toFixed(2) || (reportData?.cepeaData?.price / 30).toFixed(2)} <span className="text-xs font-normal text-[#666]">/kg</span>
              </h3>
              <p className="text-[11px] text-[#999] font-semibold mt-0.5">
                Eq. R$ {reportData?.cepeaData?.price.toFixed(2)} <span className="text-[10px] font-normal text-[#aaa]">/@</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] font-bold text-[#999] uppercase mb-1">Variação Semanal</div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                <TrendingUp size={16} /> +{reportData?.cepeaData?.delta}%
              </div>
            </div>
            <div className="h-10 w-px bg-[#E9ECEF] hidden md:block" />
            <div className="text-[11px] text-[#666] max-w-[200px] leading-tight">
              Referência nacional do Boi Gordo para contratos na B3.
            </div>
          </div>
        </div>

        {/* Mercado Futuro B3 */}
        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          <div className="lg:col-span-3 bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
                  <BarChart3 className="text-[#2D5A27]" size={22} /> Expectativas Mercado Futuro (B3)
                </h2>
                <p className="text-sm text-[#999] mt-1">Curva futura do Boi Gordo (BGI) para os próximos meses</p>
              </div>
            </div>

            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={b3FuturesMapped} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2D5A27" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#999', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#999', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `R$${value.toFixed(2)}`}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-2xl border border-[#E9ECEF] shadow-lg text-xs font-bold min-w-[140px]">
                            <p className="text-[#666] mb-1.5">{data.month}</p>
                            <div className="space-y-1">
                              <div className="text-sm font-black text-[#2D5A27]">
                                R$ {data.priceKgNum?.toFixed(2)} <span className="text-[10px] font-normal text-[#999]">/kg</span>
                              </div>
                              <div className="text-[10px] text-[#777] font-semibold">
                                Eq. R$ {data.price?.toFixed(2)} <span className="text-[9px] font-normal text-[#aaa]">/@</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="priceKgNum"
                    stroke="#2D5A27"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    dot={{ r: 6, fill: '#2D5A27', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] flex items-start gap-3">
              <Info size={18} className="text-[#2171B5] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#666] leading-relaxed">
                <strong>Análise B3:</strong> {marketAnalysis?.b3Analysis}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm flex-1">
              <h3 className="font-bold text-[#333] mb-4 text-sm uppercase tracking-wider">Cotações Detalhadas B3</h3>
              <div className="space-y-4">
                {reportData?.b3Futures?.slice(0, 4).map((f: any) => {
                  const priceKgNum = typeof f.priceKg === 'number' ? f.priceKg : parseFloat(f.priceKg || 0);
                  const displayPriceKg = priceKgNum || (f.price / 30);
                  return (
                    <div key={f.month} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <span className="text-sm font-bold text-[#666]">{f.month}</span>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#2D5A27]">R$ {displayPriceKg.toFixed(2)} /kg</div>
                        <div className="text-[10px] text-[#999] font-bold">Eq. R$ {f.price.toFixed(2)} /@</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white shadow-xl flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Mail size={24} className="text-[#87C036]" />
              </div>
              <h3 className="font-bold">Receba este relatório por E-mail</h3>
              <p className="text-xs text-white/60">Assine nosso informativo semanal e receba estas cotações toda segunda-feira.</p>
              <button
                onClick={() => setShowNewsletterModal(true)}
                className="w-full py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#1E3D1A] transition-colors"
              >
                Assinar Newsletter
              </button>
            </div>
          </div>
        </div>

        {/* Footer Relatório */}
        <div className="mt-12 pt-8 border-t border-[#E9ECEF] text-center">
          <p className="text-[11px] text-[#999] uppercase tracking-widest font-bold">Gado Gaúcho Inteligência & Dados</p>
          <p className="text-xs text-[#999] mt-2 max-w-2xl mx-auto">
            Este relatório consolida informações de fontes públicas (Scot Consultoria, B3) e dados internos proprietários. Os preços de leilões referem-se às médias estaduais coletadas nas últimas 168 horas. O Gado Gaúcho não se responsabiliza por decisões comerciais baseadas nestes dados.
          </p>
        </div>

      </main>

      <div className="print:hidden">
        {user && (
          <BottomNav
            user={user}
            onAdClick={() => router.push('/?ad=new')}
            onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
          />
        )}
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        title="Boletim Semanal de Preços - Gado Gaúcho"
        onCopySuccess={() => { }}
      />

      <NewsletterModal
        isOpen={showNewsletterModal}
        onClose={() => setShowNewsletterModal(false)}
      />

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .rounded-3xl {
            border-radius: 12px !important;
          }
          .shadow-sm, .shadow-lg, .shadow-xl {
            box-shadow: none !important;
            border: 1px solid #E9ECEF !important;
          }
        }
      `}</style>
    </div>
  );
}
