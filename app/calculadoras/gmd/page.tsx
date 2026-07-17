'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator, TrendingUp, DollarSign, Clock,
  Target, Info, Printer, ChevronLeft,
  ArrowRight, ShieldCheck, PieChart,
  Activity, Scale, Wallet, Loader2, Share2, Check,
  Trash2, Plus, Bookmark, Layers, BarChart as RechartsBarIcon, Download
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
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
  AreaChart,
  BarChart,
  Bar,
  Legend,
  Cell
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

function runGmdCalculations(inputs: Record<string, string>) {
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
    ...numInputs,
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
}

interface SavedSimulation {
  id: string;
  user_id: string;
  name: string;
  calculator_type: string;
  inputs: Record<string, string>;
  created_at: string;
  updated_at: string;
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
    initialWeight: '200',
    finalWeight: '300',
    days: '150',
    purchasePriceKg: '15.00',
    dailyCostHead: '2.00',
    expectedSalePriceKg: '13.00'
  });

  // State variables for saving & comparison
  const [simulations, setSimulations] = useState<SavedSimulation[]>([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);
  const [savingSimulation, setSavingSimulation] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSimulationName, setNewSimulationName] = useState('');
  const [selectedSimsForCompare, setSelectedSimsForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

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

  // Load simulations from DB
  const fetchSimulations = async () => {
    if (!user) {
      setSimulations([]);
      return;
    }
    setLoadingSimulations(true);
    try {
      const res = await authenticatedFetch('/api/simulations?type=gmd');
      if (res.ok) {
        const data = await res.json();
        setSimulations(data);
      }
    } catch (err) {
      console.error('Error fetching simulations:', err);
    } finally {
      setLoadingSimulations(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, [user]);

  const handleSaveSimulation = async () => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (!newSimulationName.trim()) return;

    setSavingSimulation(true);
    try {
      const res = await authenticatedFetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSimulationName,
          calculator_type: 'gmd',
          inputs
        })
      });

      if (res.ok) {
        setNewSimulationName('');
        setShowSaveModal(false);
        setToastMessage('Simulação salva!');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
        fetchSimulations();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar simulação');
      }
    } catch (err) {
      console.error('Error saving simulation:', err);
      alert('Erro de conexão ao salvar simulação');
    } finally {
      setSavingSimulation(false);
    }
  };

  const handleDeleteSimulation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta simulação salva?')) return;

    try {
      const res = await authenticatedFetch(`/api/simulations/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToastMessage('Simulação excluída!');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
        setSelectedSimsForCompare(prev => prev.filter(item => item !== id));
        fetchSimulations();
      } else {
        alert('Erro ao excluir simulação');
      }
    } catch (err) {
      console.error('Error deleting simulation:', err);
    }
  };

  const handleLoadSimulation = (sim: SavedSimulation) => {
    setInputs(sim.inputs);
    setToastMessage(`Simulação "${sim.name}" carregada!`);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const toggleSelectForCompare = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (selectedSimsForCompare.length >= 4) {
        alert('Você pode comparar no máximo 4 simulações.');
        e.target.checked = false;
        return;
      }
      setSelectedSimsForCompare(prev => [...prev, id]);
    } else {
      setSelectedSimsForCompare(prev => prev.filter(item => item !== id));
    }
  };

  // Performance Calculations
  const calculations = useMemo(() => runGmdCalculations(inputs), [inputs]);

  // State for compared simulations loaded via URL
  const [urlComparedSims, setUrlComparedSims] = useState<any[]>([]);

  // Load compared simulations from URL if present on mount/search params change
  useEffect(() => {
    const compareDataParam = searchParams.get('compareData');
    if (compareDataParam) {
      try {
        const decoded = decodeURIComponent(escape(atob(compareDataParam)));
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((item: any, idx: number) => {
            const calcs = runGmdCalculations(item.inputs);
            return {
              id: `url-sim-${idx}`,
              name: item.name,
              inputs: item.inputs,
              calcs
            };
          });
          setUrlComparedSims(mapped);
          setShowCompareModal(true);
        }
      } catch (e) {
        console.error('Error parsing compareData from URL:', e);
      }
    }
  }, [searchParams]);

  // Comparison Data and Calculations
  const comparedSimsData = useMemo(() => {
    if (urlComparedSims.length > 0) {
      return urlComparedSims;
    }
    return selectedSimsForCompare.map(id => {
      const sim = simulations.find(s => s.id === id);
      if (!sim) return null;
      const calcs = runGmdCalculations(sim.inputs);
      return {
        id: sim.id,
        name: sim.name,
        inputs: sim.inputs,
        calcs
      };
    }).filter(Boolean) as Array<{
      id: string;
      name: string;
      inputs: Record<string, string>;
      calcs: ReturnType<typeof runGmdCalculations>;
    }>;
  }, [selectedSimsForCompare, simulations, urlComparedSims]);

  const handleCloseCompareModal = () => {
    setShowCompareModal(false);
    setUrlComparedSims([]);
    const params = new URLSearchParams(window.location.search);
    params.delete('compareData');
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState(null, '', newRelativePathQuery);
  };

  const handlePrintCompare = () => {
    window.print();
  };

  const handleShareCompare = () => {
    try {
      const compareDataArray = comparedSimsData.map(s => ({
        name: s.name,
        inputs: s.inputs
      }));
      const json = JSON.stringify(compareDataArray);
      const base64 = btoa(unescape(encodeURIComponent(json)));
      const params = new URLSearchParams(window.location.search);
      params.set('compareData', base64);
      const shareLink = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
      
      navigator.clipboard.writeText(shareLink);
      alert('Link de comparação copiado para a área de transferência!');
    } catch (err) {
      console.error('Error generating share link:', err);
      alert('Erro ao gerar link de compartilhamento.');
    }
  };

  // Find best values to highlight
  const bestValues = useMemo(() => {
    if (comparedSimsData.length === 0) {
      return {
        maxGmd: 0,
        minBreakEven: 999999,
        maxRoi: 0,
        maxMonthlyProfitability: 0,
        maxProfitPerHead: 0,
        maxTotalBatchProfit: 0,
        minTotalBatchInvestment: 999999999,
      };
    }
    
    return {
      maxGmd: Math.max(...comparedSimsData.map(s => s.calcs.gmd)),
      minBreakEven: Math.min(...comparedSimsData.map(s => s.calcs.breakEvenGmd)),
      maxRoi: Math.max(...comparedSimsData.map(s => s.calcs.roi)),
      maxMonthlyProfitability: Math.max(...comparedSimsData.map(s => s.calcs.monthlyProfitability)),
      maxProfitPerHead: Math.max(...comparedSimsData.map(s => s.calcs.profitPerHead)),
      maxTotalBatchProfit: Math.max(...comparedSimsData.map(s => s.calcs.totalBatchProfit)),
      minTotalBatchInvestment: Math.min(...comparedSimsData.map(s => s.calcs.totalBatchInvestment)),
    };
  }, [comparedSimsData]);

  const comparisonChartData = useMemo(() => {
    return comparedSimsData.map(s => ({
      name: s.name,
      'ROI (%)': parseFloat(s.calcs.roi.toFixed(1)),
      'Lucro Total (kR$)': Math.round(s.calcs.totalBatchProfit / 1000),
      'Investimento (kR$)': Math.round(s.calcs.totalBatchInvestment / 1000)
    }));
  }, [comparedSimsData]);

  interface RowItem {
    label: string;
    format: (s: any) => string;
    isBest?: (s: any) => boolean;
    highlightClass?: string;
  }

  interface RowGroup {
    category: string;
    items: RowItem[];
  }

  const rows: RowGroup[] = [
    {
      category: 'Dados do Lote (Entradas)',
      items: [
        { label: 'Qtd de Animais', format: (s: any) => `${s.calcs.animalCount}` },
        { label: 'Peso Entrada (kg)', format: (s: any) => `${s.calcs.initialWeight} kg` },
        { label: 'Peso Final (kg)', format: (s: any) => `${s.calcs.finalWeight} kg` },
        { label: 'Período (dias)', format: (s: any) => `${s.calcs.days} dias` },
        { label: 'Preço Compra (R$/kg)', format: (s: any) => `R$ ${s.calcs.purchasePriceKg.toFixed(2)}` },
        { label: 'Custo Diário/Cabeça', format: (s: any) => `R$ ${s.calcs.dailyCostHead.toFixed(2)}` },
        { label: 'Preço Venda Esperado', format: (s: any) => `R$ ${s.calcs.expectedSalePriceKg.toFixed(2)}` },
      ]
    },
    {
      category: 'Indicadores Zootécnicos',
      items: [
        { 
          label: 'GMD (Ganho Médio Diário)', 
          format: (s: any) => `${s.calcs.gmd.toFixed(3)} kg/dia`,
          isBest: (s: any) => s.calcs.gmd === bestValues.maxGmd && bestValues.maxGmd > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'GMD de Equilíbrio (Break-even)', 
          format: (s: any) => `${s.calcs.breakEvenGmd.toFixed(3)} kg/dia`,
          isBest: (s: any) => s.calcs.breakEvenGmd === bestValues.minBreakEven && bestValues.minBreakEven > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
      ]
    },
    {
      category: 'Indicadores Financeiros',
      items: [
        { 
          label: 'ROI (Retorno s/ Investimento)', 
          format: (s: any) => `${s.calcs.roi.toFixed(1)}%`,
          isBest: (s: any) => s.calcs.roi === bestValues.maxRoi && bestValues.maxRoi > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Rentabilidade Mensal', 
          format: (s: any) => `${s.calcs.monthlyProfitability.toFixed(2)}%`,
          isBest: (s: any) => s.calcs.monthlyProfitability === bestValues.maxMonthlyProfitability && bestValues.maxMonthlyProfitability > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Lucro por Cabeça', 
          format: (s: any) => `R$ ${s.calcs.profitPerHead.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isBest: (s: any) => s.calcs.profitPerHead === bestValues.maxProfitPerHead && bestValues.maxProfitPerHead > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Investimento Total', 
          format: (s: any) => `R$ ${s.calcs.totalBatchInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          isBest: (s: any) => s.calcs.totalBatchInvestment === bestValues.minTotalBatchInvestment && bestValues.minTotalBatchInvestment > 0,
          highlightClass: 'text-blue-600 font-black bg-blue-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Lucro Total do Lote', 
          format: (s: any) => `R$ ${s.calcs.totalBatchProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          isBest: (s: any) => s.calcs.totalBatchProfit === bestValues.maxTotalBatchProfit && bestValues.maxTotalBatchProfit > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
      ]
    }
  ];

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

            {/* Bloco Simulações Salvas */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center justify-between uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Bookmark size={18} className="text-[#2D5A27]" /> Minhas Simulações
                </div>
                {user && simulations.length > 0 && (
                  <span className="text-[10px] bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-1 rounded-full font-black">
                    {simulations.length} salvas
                  </span>
                )}
              </h2>

              <div className="space-y-4">
                {/* Botão de Salvar Simulação Atual */}
                <button
                  onClick={() => {
                    if (!user) {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    } else {
                      setShowSaveModal(true);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 text-[#2D5A27] font-bold text-sm rounded-xl transition-all border border-[#2D5A27]/10 cursor-pointer"
                >
                  <Plus size={16} /> Salvar Simulação Atual
                </button>

                {!user ? (
                  <div className="text-center py-6 px-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] border-dashed">
                    <p className="text-xs text-[#666] mb-4">
                      Entre na sua conta para salvar suas simulações e comparar múltiplos projetos.
                    </p>
                    <button
                      onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                      className="px-4 py-2 bg-[#2D5A27] text-white hover:bg-[#20401C] rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Fazer Login
                    </button>
                  </div>
                ) : loadingSimulations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-[#2D5A27]" size={24} />
                  </div>
                ) : simulations.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF]">
                    <p className="text-xs text-[#999] italic">Nenhuma simulação salva ainda. Configure os parâmetros acima e salve.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {simulations.map(sim => {
                      const isSelected = selectedSimsForCompare.includes(sim.id);
                      const simCalcs = runGmdCalculations(sim.inputs);
                      return (
                        <div
                          key={sim.id}
                          onClick={() => handleLoadSimulation(sim)}
                          className="group relative flex items-center justify-between p-3 bg-[#F8F9FA] hover:bg-[#E9F0E8] border border-[#E9ECEF] hover:border-[#2D5A27]/20 rounded-xl cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-8" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectForCompare(sim.id, e)}
                              className="w-4 h-4 rounded border-[#E9ECEF] text-[#2D5A27] focus:ring-[#2D5A27] cursor-pointer"
                            />
                            <div className="min-w-0" onClick={() => handleLoadSimulation(sim)}>
                              <div className="font-bold text-[#333] text-xs truncate group-hover:text-[#2D5A27] transition-colors">
                                {sim.name}
                              </div>
                              <div className="text-[10px] text-[#999] mt-0.5">
                                {simCalcs.animalCount} animais · ROI: {simCalcs.roi.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSimulation(sim.id, e)}
                            className="text-[#999] hover:text-red-500 p-1.5 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Excluir simulação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão de Comparação de Projetos */}
                {user && selectedSimsForCompare.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedSimsForCompare.length < 2) {
                        alert('Selecione pelo menos 2 simulações para comparar.');
                        return;
                      }
                      setShowCompareModal(true);
                    }}
                    disabled={selectedSimsForCompare.length < 2}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm rounded-xl transition-all shadow-sm ${
                      selectedSimsForCompare.length >= 2
                        ? 'bg-[#2171B5] hover:bg-[#1E62A0] text-white cursor-pointer'
                        : 'bg-[#E9ECEF] text-[#999] cursor-not-allowed'
                    }`}
                  >
                    <Layers size={16} /> Comparar Selecionadas ({selectedSimsForCompare.length})
                  </button>
                )}
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

      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-[#E9ECEF] shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-[#1A1A1A] mb-4">Salvar Simulação</h3>
              <p className="text-sm text-[#666] mb-6">Dê um nome para identificar este lote de simulação posteriormente.</p>
              <input
                type="text"
                placeholder="Ex: Confinamento Inverno 2026"
                value={newSimulationName}
                onChange={(e) => setNewSimulationName(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27] mb-6"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-6 py-3 border border-[#E9ECEF] text-[#666] hover:bg-[#F8F9FA] rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSimulation}
                  disabled={savingSimulation || !newSimulationName.trim()}
                  className="px-6 py-3 bg-[#2D5A27] text-white hover:bg-[#20401C] rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  {savingSimulation ? <Loader2 className="animate-spin" size={16} /> : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 overflow-y-auto compare-modal-overlay">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white rounded-[2.5rem] border border-[#E9ECEF] shadow-2xl w-full max-w-5xl my-8 overflow-hidden flex flex-col compare-modal-content"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-[#E9ECEF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#1A1A1A] flex items-center gap-2">
                    <Layers className="text-[#2D5A27]" size={24} /> Comparativo de Projetos
                  </h3>
                  <p className="text-xs text-[#666] mt-1">Comparação detalhada lado a lado das simulações selecionadas.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 no-print">
                  <button
                    onClick={handlePrintCompare}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] hover:bg-[#20401C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Baixar relatório em PDF"
                  >
                    <Download size={14} /> Baixar PDF
                  </button>
                  <button
                    onClick={handleCloseCompareModal}
                    className="p-2 hover:bg-[#F8F9FA] rounded-full text-[#999] hover:text-[#333] transition-colors cursor-pointer text-xl font-bold flex items-center justify-center w-8 h-8 ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(80vh-100px)] space-y-8 compare-modal-body">
                {/* Table Container */}
                <div className="overflow-x-auto border border-[#E9ECEF] rounded-[2rem] bg-white">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                        <th className="p-4 sm:p-5 text-[11px] font-black text-[#999] uppercase tracking-wider w-[250px]">Indicadores</th>
                        {comparedSimsData.map((sim, i) => (
                          <th key={sim.id} className="p-4 sm:p-5 text-sm font-black text-[#1A1A1A] text-center border-l border-[#E9ECEF] min-w-[120px]">
                            <div className="truncate max-w-[150px] mx-auto text-ellipsis" title={sim.name}>
                              {sim.name}
                            </div>
                            <span className="text-[10px] text-[#999] font-normal uppercase tracking-widest mt-1 block">Projeto {i + 1}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((categoryGroup, groupIdx) => (
                        <React.Fragment key={groupIdx}>
                          {/* Category Divider Header */}
                          <tr className="bg-[#2D5A27]/5">
                            <td colSpan={comparedSimsData.length + 1} className="p-3 text-[10px] font-black text-[#2D5A27] uppercase tracking-widest">
                              {categoryGroup.category}
                            </td>
                          </tr>
                          {categoryGroup.items.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-[#E9ECEF] hover:bg-[#F8F9FA] transition-colors">
                              <td className="p-4 text-xs font-bold text-[#666]">{row.label}</td>
                              {comparedSimsData.map(sim => {
                                const isBest = row.isBest ? row.isBest(sim) : false;
                                return (
                                  <td key={sim.id} className="p-4 text-xs font-bold text-center border-l border-[#E9ECEF]">
                                    <span className={isBest ? (row.highlightClass || '') : 'text-[#333]'}>
                                      {row.format(sim)}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Chart Section */}
                <div className="bg-[#F8F9FA] rounded-[2rem] p-6 border border-[#E9ECEF] compare-chart-container">
                  <h4 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                    <RechartsBarIcon className="text-[#2D5A27]" size={18} /> Comparação Gráfica (ROI & Lucro)
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: '#1A1A1A',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                          }}
                          labelStyle={{ color: '#999', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}
                          itemStyle={{ fontSize: 12, fontWeight: 700, color: '#fff' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="ROI (%)" fill="#2D5A27" radius={[8, 8, 0, 0]}>
                          {comparisonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry['ROI (%)'] === bestValues.maxRoi ? '#2D5A27' : '#5E9F57'} />
                          ))}
                        </Bar>
                        <Bar dataKey="Lucro Total (kR$)" fill="#2171B5" radius={[8, 8, 0, 0]}>
                          {comparisonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry['Lucro Total (kR$)'] === Math.round(bestValues.maxTotalBatchProfit / 1000) ? '#2171B5' : '#639ECE'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-[#999] text-center mt-4 italic">
                    * O lucro total está exibido em milhares de Reais (kR$). O projeto com a barra mais escura representa o de melhor desempenho na métrica correspondente.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-[#F8F9FA] border-t border-[#E9ECEF] flex justify-end no-print">
                <button
                  onClick={handleCloseCompareModal}
                  className="px-8 py-3 bg-[#2D5A27] text-white hover:bg-[#20401C] rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  Fechar Comparação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          /* Reset elements for full page width printing */
          html, body {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide non-printable elements */
          header, main, nav, footer, .no-print, .bottom-nav-class, .print\\:hidden, button, .compare-modal-overlay button {
            display: none !important;
          }
          
          /* Show only the modal content and override fixed/absolute positioning */
          .compare-modal-overlay {
            position: static !important;
            background: #fff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            z-index: auto !important;
          }
          
          .compare-modal-content {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          
          .compare-modal-body {
            max-height: none !important;
            overflow: visible !important;
            padding: 10px 0 !important;
            display: block !important;
          }
          
          /* Typography / Header styling for print */
          h3 {
            font-size: 20pt !important;
            color: #1a3a1e !important;
            margin-bottom: 5px !important;
          }
          
          p {
            font-size: 10pt !important;
            color: #444 !important;
          }
          
          /* Table formatting for A4 print */
          .overflow-x-auto {
            overflow: visible !important;
            margin-bottom: 25px !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            margin-top: 15px !important;
          }
          
          th, td {
            border: 1px solid #dcdcdc !important;
            padding: 8px 10px !important;
            font-size: 9.5pt !important;
            text-align: left !important;
            color: #222 !important;
          }
          
          th {
            background-color: #f7f9f7 !important;
            font-weight: bold !important;
            text-align: center !important;
          }
          
          td {
            text-align: center !important;
          }
          
          td:first-child, th:first-child {
            text-align: left !important;
            font-weight: bold !important;
            background-color: #fafafa !important;
          }
          
          /* Highlight columns/best values */
          .text-blue-600, .text-emerald-600, .bg-blue-50, .bg-emerald-50, .bg-emerald-50\\/100, .bg-blue-50\\/100 {
            background-color: #e2ece9 !important;
            color: #137333 !important;
            font-weight: 900 !important;
            border: 1.5px solid #137333 !important;
          }
          
          .text-emerald-600 {
            color: #137333 !important;
          }
          
          .text-blue-600 {
            color: #1a73e8 !important;
          }
          
          /* Charts styling */
          .compare-chart-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 30px !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 8px !important;
            padding: 20px !important;
            background: #fff !important;
          }
          
          /* Fix Recharts SVG sizing on print */
          .recharts-responsive-container {
            width: 650px !important;
            height: 320px !important;
            margin: 0 auto !important;
            display: block !important;
          }
          
          .recharts-surface {
            width: 650px !important;
            height: 320px !important;
          }
          
          /* Keep some branding info visible at the bottom of the printed page */
          .compare-modal-content::after {
            content: "Relatório gerado por Gado Gaúcho (gadogaucho.com.br) - Ferramenta de Análise de Pecuária" !important;
            display: block !important;
            text-align: center !important;
            font-size: 8pt !important;
            color: #888 !important;
            margin-top: 40px !important;
            border-top: 1px solid #eaeaea !important;
            padding-top: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
