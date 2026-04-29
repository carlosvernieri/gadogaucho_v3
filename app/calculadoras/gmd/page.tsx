'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator, TrendingUp, DollarSign, Clock,
  Target, Info, Printer, ChevronLeft,
  ArrowRight, ShieldCheck, PieChart,
  Activity, Scale, Wallet, Loader2, Share2, Check
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { ShareModal } from '@/components/ShareModal';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export default function GMDCalculatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
      </div>
    }>
      <GMDCalculatorContent />
    </Suspense>
  );
}

function GMDCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  // Load initial state from URL parameters
  useEffect(() => {
    const params = {
      ac: searchParams.get('ac'),
      iw: searchParams.get('iw'),
      fw: searchParams.get('fw'),
      d: searchParams.get('d'),
      pk: searchParams.get('pk'),
      ch: searchParams.get('ch'),
      sk: searchParams.get('sk'),
    };

    if (Object.values(params).some(v => v !== null)) {
      setInputs(prev => ({
        ...prev,
        animalCount: params.ac || prev.animalCount,
        initialWeight: params.iw || prev.initialWeight,
        finalWeight: params.fw || prev.finalWeight,
        days: params.d || prev.days,
        purchasePriceKg: params.pk || prev.purchasePriceKg,
        dailyCostHead: params.ch || prev.dailyCostHead,
        expectedSalePriceKg: params.sk || prev.expectedSalePriceKg,
      }));
    }
  }, [searchParams]);

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

  // Chart Data: accumulated profit per day for the full lot
  const chartData = useMemo(() => {
    const numInputs = {
      animalCount: parseFloat(inputs.animalCount) || 0,
      initialWeight: parseFloat(inputs.initialWeight) || 0,
      finalWeight: parseFloat(inputs.finalWeight) || 0,
      days: parseFloat(inputs.days) || 0,
      purchasePriceKg: parseFloat(inputs.purchasePriceKg) || 0,
      dailyCostHead: parseFloat(inputs.dailyCostHead) || 0,
      expectedSalePriceKg: parseFloat(inputs.expectedSalePriceKg) || 0,
    };

    if (numInputs.days <= 0 || numInputs.animalCount <= 0) return [];

    const totalInvestment = numInputs.initialWeight * numInputs.purchasePriceKg * numInputs.animalCount;
    const dailyCostTotal = numInputs.dailyCostHead * numInputs.animalCount;
    const gmd = numInputs.days > 0 ? (numInputs.finalWeight - numInputs.initialWeight) / numInputs.days : 0;

    // Generate one point per day (or every N days if period is long)
    const step = numInputs.days <= 120 ? 1 : Math.ceil(numInputs.days / 120);
    const points: { dia: number; lucro: number; custo: number; receita: number }[] = [];

    for (let d = 0; d <= numInputs.days; d += step) {
      const currentWeight = numInputs.initialWeight + gmd * d;
      const revenueSoFar = currentWeight * numInputs.expectedSalePriceKg * numInputs.animalCount;
      const costSoFar = totalInvestment + dailyCostTotal * d;
      const profit = revenueSoFar - costSoFar;
      points.push({ dia: d, lucro: Math.round(profit), custo: Math.round(costSoFar), receita: Math.round(revenueSoFar) });
    }

    // Always include the final day
    if (points[points.length - 1]?.dia !== numInputs.days) {
      const currentWeight = numInputs.finalWeight;
      const revenueSoFar = currentWeight * numInputs.expectedSalePriceKg * numInputs.animalCount;
      const costSoFar = totalInvestment + dailyCostTotal * numInputs.days;
      points.push({ dia: numInputs.days, lucro: Math.round(revenueSoFar - costSoFar), custo: Math.round(costSoFar), receita: Math.round(revenueSoFar) });
    }

    return points;
  }, [inputs]);

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams();
    params.set('ac', inputs.animalCount);
    params.set('iw', inputs.initialWeight);
    params.set('fw', inputs.finalWeight);
    params.set('d', inputs.days);
    params.set('pk', inputs.purchasePriceKg);
    params.set('ch', inputs.dailyCostHead);
    params.set('sk', inputs.expectedSalePriceKg);

    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
  }, [inputs]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-24 lg:pb-0">
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-8">

        {/* Header Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest print:hidden">
              <Calculator size={18} /> Simulador Estratégico
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] tracking-tight">
              Calculadora de GMD & Lucro
            </h1>
            <p className="text-[#666] text-sm mt-1">
              Analise a viabilidade zootécnica e financeira do seu lote em tempo real.
            </p>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E9ECEF] text-[#333] hover:bg-[#F8F9FA] transition-all font-bold text-sm shadow-sm print:hidden rounded-2xl"
          >
            <Share2 size={20} /> Compartilhar Resultado
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Coluna de Inputs (4/12) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">

            {/* Bloco Zootécnico */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Scale size={18} className="text-[#2D5A27]" /> Dados do Lote
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
                  </div>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-[#F8F9FA] gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    <PieChart className="text-[#2D5A27]" size={24} /> Resumo Financeiro do Lote
                  </h2>
                  <p className="text-[10px] text-[#999] uppercase tracking-wider font-medium md:hidden">Impacto financeiro estimado</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="px-3 py-1.5 bg-[#F8F9FA] border border-[#E9ECEF] text-[#666] rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-sm">
                    ROI: {calculations.roi.toFixed(1)}%
                  </div>
                  <div className="px-3 py-1.5 bg-[#E9F0E8] text-[#2D5A27] rounded-full text-xs font-black uppercase tracking-wider border border-[#2D5A27]/10 whitespace-nowrap shadow-sm">
                    Rent. Mensal: {calculations.monthlyProfitability.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Lucro p/ Cabeça</span>
                  <div className={`text-2xl font-black whitespace-nowrap ${calculations.profitPerHead >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    R$ {calculations.profitPerHead.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Margem Líquida</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Resultado Diário</span>
                  <div className={`text-2xl font-black whitespace-nowrap ${calculations.profitDay >= 0 ? 'text-[#333]' : 'text-red-500'}`}>
                    R$ {calculations.profitDay.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Por animal/dia</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-2">Resultado Mensal</span>
                  <div className={`text-2xl font-black whitespace-nowrap ${calculations.profitMonth >= 0 ? 'text-[#333]' : 'text-red-500'}`}>
                    R$ {calculations.profitMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Por animal/mês</span>
                </div>

                <div className="space-y-1 bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/10 -m-4">
                  <span className="text-[10px] font-bold text-[#2D5A27] uppercase tracking-widest block mb-2">Lucro Mensal Lote</span>
                  <div className={`text-2xl font-black whitespace-nowrap ${calculations.totalBatchProfitMonth >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                    R$ {calculations.totalBatchProfitMonth.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-[#2D5A27]/70 font-medium">Total do lote/mês</span>
                </div>
              </div>

              {/* Total Pack */}
              <div className="mt-12 p-8 bg-[#F8F9FA] rounded-[2rem] border border-[#E9ECEF] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Lucro Total do Lote ({inputs.animalCount} animais)</span>
                  <div className={`text-3xl font-black ${calculations.totalBatchProfit >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                    R$ {calculations.totalBatchProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="h-px w-full sm:h-20 sm:w-px bg-[#E9ECEF]" />
                <div className="flex flex-col text-center sm:text-right">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Investimento Total Estimado</span>
                  <div className="text-3xl font-bold text-[#333]">
                    R$ {calculations.totalBatchInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Evolução do Lucro */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-[#E9ECEF] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                      <TrendingUp className="text-[#2D5A27]" size={20} />
                      Evolução do Lucro do Lote
                    </h2>
                    <p className="text-[11px] text-[#999] mt-0.5">Projeção acumulada dia a dia · {inputs.animalCount} animais</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-[#2D5A27] inline-block" />Lucro</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-[#E9ECEF] inline-block border border-[#ccc]" />Custo</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2D5A27" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                      tickFormatter={(v) => `Dia ${v}`}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      }}
                      labelStyle={{ color: '#999', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}
                      itemStyle={{ fontSize: 12, fontWeight: 700 }}
                      labelFormatter={(v) => `Dia ${v}`}
                      formatter={(value, name) => [
                        `R$ ${Number(value ?? 0).toLocaleString('pt-BR')}`,
                        name === 'lucro' ? 'Lucro Acum.' : 'Custo Acum.'
                      ]}
                    />
                    <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Break-even', position: 'insideTopLeft', fill: '#EF4444', fontSize: 10, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="custo" stroke="#CBD5E1" strokeWidth={1.5} fill="url(#gradCusto)" dot={false} />
                    <Area type="monotone" dataKey="lucro" stroke="#2D5A27" strokeWidth={2.5} fill="url(#gradLucro)" dot={false} activeDot={{ r: 5, fill: '#2D5A27', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Break-even insight */}
                {(() => {
                  const breakEvenPoint = chartData.find((p, i) => i > 0 && chartData[i - 1].lucro < 0 && p.lucro >= 0);
                  return breakEvenPoint ? (
                    <p className="text-center text-xs text-[#666] mt-4 font-medium">
                      📍 O lote começa a gerar lucro por volta do <strong className="text-[#2D5A27]">dia {breakEvenPoint.dia}</strong>
                    </p>
                  ) : chartData[0]?.lucro >= 0 ? (
                    <p className="text-center text-xs text-emerald-600 mt-4 font-medium">
                      ✅ O lote já começa com saldo positivo desde o primeiro dia.
                    </p>
                  ) : (
                    <p className="text-center text-xs text-red-500 mt-4 font-medium">
                      ⚠️ Com os parâmetros atuais, o lote não atingirá o break-even no período informado.
                    </p>
                  );
                })()}
              </div>
            )}

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

        {user && (
          <BottomNav
            user={user}
            onAdClick={() => router.push('/?ad=new')}
            onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
          />
        )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title="Gado Gaúcho - Calculadora GMD & Lucro"
        onCopySuccess={() => {
          setToastMessage('Link copiado!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#333] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2"
          >
            <Check size={18} className="text-[#28A745]" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

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
