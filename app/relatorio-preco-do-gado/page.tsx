'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Minus, Info, 
  BarChart3, Globe, MapPin, Printer, 
  ChevronRight, Calendar, ArrowRightLeft,
  Loader2, Share2, Mail, LayoutGrid
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

export default function MercadoReportPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
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
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-[#2D5A27]/10 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
           <LayoutGrid className="text-[#2D5A27]" size={32} />
        </div>
        <Loader2 className="animate-spin text-[#2D5A27] mb-2" size={24} />
        <p className="text-[#666] font-medium animate-pulse">Consolidando dados do mercado...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-24 lg:pb-0">
      <div className="print:hidden">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
          onAdClick={() => router.push('/?ad=new')}
          onAdminClick={() => router.push('/')}
          onLogout={() => { logout(); router.push('/'); }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
        />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 lg:px-8 py-8">
        
        {/* Header Relatório */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest print:hidden">
              <BarChart3 size={18} /> Inteligência de Mercado
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              Boletim Semanal de Preços
            </h1>
            <div className="flex items-center gap-3 text-[#666] text-sm mt-1">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#E9ECEF] shadow-sm">
                <Calendar size={14} /> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 bg-[#2D5A27]/5 text-[#2D5A27] px-3 py-1 rounded-full border border-[#2D5A27]/10 font-bold">
                Edição RS #24
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E9ECEF] text-[#333] rounded-xl hover:bg-[#F8F9FA] transition-all font-bold text-sm shadow-sm"
            >
              <Printer size={18} /> Imprimir PDF
            </button>
            <button 
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl hover:bg-[#1E3D1A] transition-all font-bold text-sm shadow-lg shadow-[#2D5A27]/20"
            >
              <Share2 size={18} /> Compartilhar
            </button>
          </div>
        </div>

        {/* Resumo Executivo */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-bl-full -mr-8 -mt-8" />
            <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
              <Info className="text-[#2D5A27]" size={22} /> Resumo do Comportamento
            </h2>
            <p className="text-[#666] leading-relaxed relative z-10">
              O mercado gaúcho apresenta estabilidade nas principais praças pesquisadas. No <strong>Oeste do RS</strong>, os preços do Boi Gordo mantêm-se firmes devido à baixa oferta de animais terminados. Já na plataforma <strong>Gado Gaúcho</strong>, observamos ofertas direto da porteira com preços ligeiramente competitivos em relação à média dos leilões estaduais, indicando uma janela de oportunidade para compradores de reposição nas categorias de <strong>Terneiro</strong> e <strong>Terneira</strong>.
            </p>
          </div>
          
          <div className="bg-[#2D5A27] rounded-3xl p-8 text-white shadow-lg shadow-[#2D5A27]/20 flex flex-col justify-between">
            <div>
              <TrendingUp size={32} className="mb-4 text-[#87C036]" />
              <h3 className="text-lg font-bold mb-1">Destaque da Semana</h3>
              <p className="text-sm text-white/80 leading-snug">
                Novilha RS Oeste registrou a maior valorização entre as praças Scot Consultoria, com média de R$ 11,40/kg.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-2xl font-bold">+2.2%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">Variação Novilha</span>
            </div>
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
                       {stat.auctionAvg > 0 ? `R$ ${stat.auctionAvg.toFixed(2)}` : 'S/ DADOS'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#2D5A27]">
                       {stat.platformAvg > 0 ? `R$ ${stat.platformAvg.toFixed(2)}` : 'S/ DADOS'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 
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
                  <AreaChart data={reportData?.b3Futures || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
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
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <RechartsTooltip 
                      formatter={(v: any) => [`R$ ${v}/@`, 'Cotação Futura']}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
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
                  <strong>Análise B3:</strong> O mercado financeiro sinaliza uma curva de <strong>contango</strong> moderado até Abril/26, seguida de um ajuste baixista no inverno (Jun/Jul), refletindo a sazonalidade da safra de capim. A retomada de preços projetada para Outubro/26 indica expectativas de redução na oferta de animais de cocho.
                </p>
              </div>
           </div>

           <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm flex-1">
                <h3 className="font-bold text-[#333] mb-4 text-sm uppercase tracking-wider">Cotações Detalhadas B3</h3>
                <div className="space-y-4">
                  {reportData?.b3Futures?.slice(0, 4).map((f: any) => (
                    <div key={f.month} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                      <span className="text-sm font-bold text-[#666]">{f.month}</span>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#2D5A27]">R$ {f.price.toFixed(2)} /@</div>
                        <div className="text-[10px] text-[#999] font-bold">Eq. R$ {f.priceKg}/kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white shadow-xl flex flex-col items-center justify-center text-center gap-4">
                 <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Mail size={24} className="text-[#87C036]" />
                 </div>
                 <h3 className="font-bold">Receba este relatório por E-mail</h3>
                 <p className="text-xs text-white/60">Assine nosso informativo semanal e receba estas cotações toda segunda-feira.</p>
                 <button 
                  onClick={() => router.push('/precodogado')}
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
