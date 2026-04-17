'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator, TrendingUp, DollarSign, Clock,
  Target, Info, Printer, ChevronLeft,
  ArrowRight, ShieldCheck, PieChart,
  Activity, Scale, Wallet, Loader2
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';

export default function GMDCalculatorPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [marketPrices, setMarketPrices] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Form State - Using strings to allow empty inputs in UI
  const [inputs, setInputs] = useState<Record<string, string>>({
    animalCount: '50',
    initialWeight: '320',
    finalWeight: '440',
    days: '120',
    purchasePriceKg: '10.50',
    dailyCostHead: '3.50',
    expectedSalePriceKg: '11.80'
  });

  // Fetch Market Prices for Suggestion
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoadingPrices(true);
        const res = await fetch('/api/market-report');
        const data = await res.json();
        setMarketPrices(data);

        // Suggest sale price based on Boi Gordo avg if available
        const boiAvg = data.categoryStats?.find((s: any) => s.category === 'Boi Gordo')?.auctionAvg;
        if (boiAvg > 0) {
          setInputs(prev => ({ ...prev, expectedSalePriceKg: boiAvg.toString() }));
        }
      } catch (err) {
        console.error('Error fetching market prices:', err);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchPrices();
  }, []);

  // Performance Calculations
  const calculations = useMemo(() => {
    const numInputs = {
      animalCount: parseFloat(inputs.animalCount) || 0,
      initialWeight: parseFloat(inputs.initialWeight) || 0,
      finalWeight: parseFloat(inputs.finalWeight) || 0,
      days: parseFloat(inputs.days) || 0,
      purchasePriceKg: parseFloat(inputs.purchasePriceKg) || 0,
      dailyCostHead: parseFloat(inputs.dailyCostHead) || 0,
      expectedSalePriceKg: parseFloat(inputs.expectedSalePriceKg) || 0,
    };

    const totalGain = numInputs.finalWeight - numInputs.initialWeight;
    const gmd = numInputs.days > 0 ? totalGain / numInputs.days : 0;

    const costPurchase = numInputs.initialWeight * numInputs.purchasePriceKg;
    const costOperational = numInputs.days * numInputs.dailyCostHead;
    const totalCostPerHead = costPurchase + costOperational;

    const revenuePerHead = numInputs.finalWeight * numInputs.expectedSalePriceKg;
    const profitPerHead = revenuePerHead - totalCostPerHead;

    const profitDay = numInputs.days > 0 ? profitPerHead / numInputs.days : 0;
    const profitMonth = profitDay * 30;

    const roi = totalCostPerHead > 0 ? (profitPerHead / totalCostPerHead) * 100 : 0;

    const breakEvenGmd = (numInputs.days > 0 && numInputs.expectedSalePriceKg > 0)
      ? ((totalCostPerHead / numInputs.expectedSalePriceKg) - numInputs.initialWeight) / numInputs.days
      : 0;

    return {
      totalGain,
      gmd,
      costPurchase,
      costOperational,
      totalCostPerHead,
      revenuePerHead,
      profitPerHead,
      profitDay,
      profitMonth,
      roi,
      monthlyProfitability: numInputs.days > 0 ? (roi / numInputs.days) * 30 : 0,
      breakEvenGmd,
      totalBatchProfit: profitPerHead * numInputs.animalCount,
      totalBatchInvestment: totalCostPerHead * numInputs.animalCount,
      totalBatchProfitMonth: profitMonth * numInputs.animalCount
    };
  }, [inputs]);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-24 lg:pb-0">
      <div className="print:hidden">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); }}
          onAdClick={() => router.push('/?ad=new')}
          onAdminClick={() => { }}
          onLogout={() => { logout(); router.push('/'); }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
        />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-8">

        {/* Header Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest print:hidden">
              <Calculator size={18} /> Simulador Estratégico
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              Calculadora de GMD & Lucro
            </h1>
            <p className="text-[#666] text-sm mt-1">
              Analise a viabilidade zootécnica e financeira do seu lote em tempo real.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E9ECEF] text-[#333] rounded-2xl hover:bg-[#F8F9FA] transition-all font-bold text-sm shadow-sm print:hidden"
          >
            <Printer size={20} /> Gerar Laudo de Lote (PDF)
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Coluna de Inputs (4/12) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">

            {/* Bloco Zootécnico */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Scale size={18} className="text-[#2D5A27]" /> Dados Biológicos
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Qtd de Animais</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={inputs.animalCount}
                    onChange={(e) => handleInputChange('animalCount', e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Peso Entrada (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.initialWeight}
                      onChange={(e) => handleInputChange('initialWeight', e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Peso Final (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inputs.finalWeight}
                      onChange={(e) => handleInputChange('finalWeight', e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Período (dias)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={inputs.days}
                    onChange={(e) => handleInputChange('days', e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco Financeiro */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Wallet size={18} className="text-[#2171B5]" /> Custos & Venda
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Preço Compra (R$/kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={inputs.purchasePriceKg}
                    onChange={(e) => handleInputChange('purchasePriceKg', e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Custo Diário/Cabeça (R$)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.10"
                    value={inputs.dailyCostHead}
                    onChange={(e) => handleInputChange('dailyCostHead', e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                  <p className="text-[10px] text-[#999] mt-2 italic">Inclui ração, manejo e sanidade.</p>
                </div>
                <div className="pt-4 border-t border-[#F8F9FA]">
                  <label className="block text-[11px] font-bold text-[#999] uppercase mb-2">Preço Venda Esperado (R$/kg)</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={inputs.expectedSalePriceKg}
                      onChange={(e) => handleInputChange('expectedSalePriceKg', e.target.value)}
                      className="w-full bg-[#E9F0E8] border border-[#2D5A27]/20 rounded-xl px-4 py-3 text-sm font-black text-[#2D5A27] outline-none focus:border-[#2D5A27]"
                    />
                    {loadingPrices && <Loader2 className="absolute right-4 top-3.5 animate-spin text-[#2D5A27]/40" size={16} />}
                  </div>
                  <p className="text-[10px] text-[#2D5A27] font-bold mt-2 uppercase tracking-wider">Referência sugerida via Mercado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna de Resultados (8/12) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Cards de Desempenho Principal */}
            <div className="grid sm:grid-cols-2 gap-6">

              <div className="bg-[#2D5A27] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#2D5A27]/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] transition-all group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 opacity-70">
                    <Activity size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ganho Médio Diário</span>
                  </div>
                  <div className="text-5xl font-black mb-1">
                    {calculations.gmd.toFixed(3)} <span className="text-xl opacity-60">kg/dia</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">Total de {calculations.totalGain}kg ganhos em {inputs.days} dias.</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-[#E9ECEF] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-bl-[100px] transition-all group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-[#999]">
                    <Target size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ponto de Equilíbrio (GMD)</span>
                  </div>
                  <div className="text-5xl font-black mb-1 text-[#333]">
                    {calculations.breakEvenGmd.toFixed(3)} <span className="text-xl text-[#999]">kg/dia</span>
                  </div>
                  <p className="text-xs text-[#666] font-medium leading-tight">Ganho necessário para cobrir os custos e o ágio da compra.</p>
                </div>
              </div>

            </div>

            {/* Dashboard Financeiro */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-[#E9ECEF] shadow-sm">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#F8F9FA]">
                <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <PieChart className="text-[#2D5A27]" size={24} /> Resumo Financeiro do Lote
                </h2>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-[#F8F9FA] border border-[#E9ECEF] text-[#666] rounded-full text-[10px] font-bold uppercase tracking-wider">
                    ROI: {calculations.roi.toFixed(1)}%
                  </div>
                  <div className="px-4 py-1.5 bg-[#E9F0E8] text-[#2D5A27] rounded-full text-xs font-black uppercase tracking-wider border border-[#2D5A27]/10">
                    Rent. Mensal: {calculations.monthlyProfitability.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Lucro p/ Cabeça</span>
                  <div className={`text-2xl font-black ${calculations.profitPerHead >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    R$ {calculations.profitPerHead.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Margem Líquida</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Resultado Diário</span>
                  <div className={`text-2xl font-black ${calculations.profitDay >= 0 ? 'text-[#333]' : 'text-red-500'}`}>
                    R$ {calculations.profitDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Por animal/dia</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Resultado Mensal</span>
                  <div className={`text-2xl font-black ${calculations.profitMonth >= 0 ? 'text-[#333]' : 'text-red-500'}`}>
                    R$ {calculations.profitMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Por animal/mês</span>
                </div>

                <div className="space-y-1 bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/10 -m-4">
                  <span className="text-[10px] font-bold text-[#2D5A27] uppercase tracking-widest block mb-2">Lucro Mensal Lote</span>
                  <div className={`text-2xl font-black ${calculations.totalBatchProfitMonth >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                    R$ {calculations.totalBatchProfitMonth.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-[#2D5A27]/70 font-medium">Total do lote/mês</span>
                </div>
              </div>

              {/* Total Pack */}
              <div className="mt-12 p-8 bg-[#F8F9FA] rounded-[2rem] border border-[#E9ECEF] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Lucro Total do Lote ({inputs.animalCount} animais)</span>
                  <div className={`text-4xl font-black ${calculations.totalBatchProfit >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                    R$ {calculations.totalBatchProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="h-px w-full sm:h-20 sm:w-px bg-[#E9ECEF]" />
                <div className="flex flex-col text-center sm:text-right">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Investimento Total Estimado</span>
                  <div className="text-3xl font-bold text-[#333]">
                    R$ {calculations.totalBatchInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta de Estratégia */}
            <div className="p-6 bg-[#2171B5]/5 border border-[#2171B5]/10 rounded-3xl flex items-start gap-4">
              <Info className="text-[#2171B5] shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-[#2171B5] text-sm mb-1 uppercase tracking-tight">Análise de Viabilidade</h4>
                <p className="text-xs text-[#666] leading-relaxed">
                  Com um preço de venda de <strong>R$ {(parseFloat(inputs.expectedSalePriceKg) || 0).toFixed(2)}/kg</strong>, o seu ponto de equilíbrio é de <strong>{calculations.breakEvenGmd.toFixed(3)}kg/dia</strong>.
                  {calculations.gmd > calculations.breakEvenGmd
                    ? " O seu GMD planejado está acima do equilíbrio, o que indica uma operação lucrativa."
                    : " Atenção: seu GMD planejado está abaixo do equilíbrio. Verifique os custos diários ou negocie melhor a venda."}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Rodapé Relatório p/ Impressão */}
        <div className="hidden print:block mt-12 pt-8 border-t border-[#E9ECEF] text-center">
          <h3 className="font-black text-[#2D5A27] text-xl mb-2 flex items-center justify-center gap-2">
            Gado Gaúcho <span className="text-[#999] font-normal text-sm">| Análise Estratégica de Lote</span>
          </h3>
          <p className="text-xs text-[#999] max-w-2xl mx-auto">
            Este relatório é uma simulação matemática baseada nos parâmetros fornecidos e referências de mercado capturadas. O Gado Gaúcho não garante rentabilidade futura, servindo apenas como ferramenta de apoio à tomada de decisão legislada pelo produtor.
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
          html, body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
      `}</style>
    </div>
  );
}
