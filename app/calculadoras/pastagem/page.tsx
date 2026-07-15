'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator, Loader2, Share2, Check, Info,
  Plus, Trash2, ChevronDown, Leaf,
  Scale, Wallet, AlertTriangle, ShieldCheck,
  DollarSign, Beef, TrendingUp, Sun, Snowflake,
  Sprout, Tractor, Plane, LayoutDashboard,
  Bookmark, Layers, BarChart as RechartsBarIcon
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { ShareModal } from '@/components/ShareModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

// --- Tipos e Categorias ---
type Category = 'Maquinário' | 'Insumos' | 'Serviços' | 'Outros';

interface CostItem {
  id: string;
  category: Category;
  description: string;
  unitPrice: number;
  quantity: number;
}

const CATEGORY_COLORS: Record<Category, string> = {
  'Maquinário': '#D4A017', // Gold/Tractor
  'Insumos': '#2D5A27',    // Green/Pasture
  'Serviços': '#2171B5',   // Blue/Drone
  'Outros': '#666666'      // Gray
};

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  'Maquinário': <Tractor size={14} />,
  'Insumos': <Sprout size={14} />,
  'Serviços': <Plane size={14} />,
  'Outros': <LayoutDashboard size={14} />
};

function runPastagemCalculations(inputs: {
  areaHa: string;
  items: CostItem[];
  gainData: {
    gmdExtra: string;
    lotacao: string;
    valorVenda: string;
    diasPastejo: string;
  };
}) {
  const area = parseFloat(inputs.areaHa) || 1;
  const totalCost = inputs.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const costPerHa = totalCost / area;

  const gmd = parseFloat(inputs.gainData.gmdExtra) || 0;
  const lot = parseFloat(inputs.gainData.lotacao) || 0;
  const valor = parseFloat(inputs.gainData.valorVenda) || 0;
  const dias = parseFloat(inputs.gainData.diasPastejo) || 0;

  const extraKgPerHaDay = gmd * lot;
  const extraRevenuePerHaDay = extraKgPerHaDay * valor;
  const daysToPayback = extraRevenuePerHaDay > 0 ? costPerHa / extraRevenuePerHaDay : 0;

  const totalExtraRevenue = extraRevenuePerHaDay * dias;
  const roi = costPerHa > 0 ? ((totalExtraRevenue - costPerHa) / costPerHa) * 100 : 0;

  return {
    area,
    totalCost,
    costPerHa,
    gmd,
    lot,
    valor,
    dias,
    daysToPayback,
    extraRevenuePerHaMonth: extraRevenuePerHaDay * 30,
    roi,
    totalExtraRevenue,
    totalExtraRevenueBatch: totalExtraRevenue * area,
    totalCostBatch: totalCost
  };
}

interface SavedSimulation {
  id: string;
  user_id: string;
  name: string;
  calculator_type: string;
  inputs: {
    areaHa: string;
    items: CostItem[];
    gainData: {
      gmdExtra: string;
      lotacao: string;
      valorVenda: string;
      diasPastejo: string;
    };
  };
  created_at: string;
  updated_at: string;
}

export default function PastagemCalculatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
      </div>
    }>
      <PastagemCalculatorContent />
    </Suspense>
  );
}

function PastagemCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setShowAdModal, setShowAuthModal, setAuthMode } = useUser();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // --- Estado Inicial (Exemplo de Pastagem de Inverno - RS) ---
  const [areaHa, setAreaHa] = useState<string>('1');
  const [items, setItems] = useState<CostItem[]>([
    { id: '1', category: 'Maquinário', description: 'Trator - Aragem', unitPrice: 145, quantity: 1 },
    { id: '2', category: 'Maquinário', description: 'Trator - Gradagem', unitPrice: 140, quantity: 1 },
    { id: '3', category: 'Insumos', description: 'Adubo 5.20.20', unitPrice: 168.50, quantity: 3 },
    { id: '4', category: 'Insumos', description: 'Semente de Aveia Preta', unitPrice: 95, quantity: 1 },
    { id: '5', category: 'Insumos', description: 'Semente de Azevém', unitPrice: 117, quantity: 1 },
    { id: '6', category: 'Serviços', description: 'Drone p/ Adubo', unitPrice: 180, quantity: 1 },
    { id: '7', category: 'Serviços', description: 'Drone p/ Sementes', unitPrice: 100, quantity: 1 },
    { id: '8', category: 'Maquinário', description: 'Tapar Sementes (Trator)', unitPrice: 140, quantity: 1 },
    { id: '9', category: 'Insumos', description: 'Ureia', unitPrice: 225.50, quantity: 1 },
    { id: '10', category: 'Serviços', description: 'Drone p/ Ureia', unitPrice: 100, quantity: 1 },
  ]);

  // --- Dados de Estimativa de Ganho ---
  const [gainData, setGainData] = useState({
    gmdExtra: '0.700', // Ganho extra por dia por animal vs campo nativo
    lotacao: '2.5',    // Animais por hectare
    valorVenda: '13.00', // R$ por kg vivo
    diasPastejo: '120'  // Dias estimados de uso da pastagem
  });

  // State variables for saving & comparison
  const [simulations, setSimulations] = useState<SavedSimulation[]>([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);
  const [savingSimulation, setSavingSimulation] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSimulationName, setNewSimulationName] = useState('');
  const [selectedSimsForCompare, setSelectedSimsForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // --- Carregar da URL ---
  useEffect(() => {
    const data = searchParams.get('d');
    const area = searchParams.get('a');
    const gain = searchParams.get('g');

    if (area) setAreaHa(area);
    if (gain) {
      const [ge, l, v, dp] = gain.split(':');
      setGainData({
        gmdExtra: ge,
        lotacao: l,
        valorVenda: v,
        diasPastejo: dp || '120'
      });
    }
    if (data) {
      try {
        const parsed = data.split(',').map((item, idx) => {
          const [cat, desc, price, qty] = item.split(':');
          return {
            id: String(idx),
            category: cat as Category,
            description: desc,
            unitPrice: parseFloat(price),
            quantity: parseFloat(qty)
          };
        });
        if (parsed.length > 0) setItems(parsed);
      } catch (e) {
        console.error('Erro ao ler dados da URL');
      }
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
      const res = await fetch('/api/simulations?type=pastagem');
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
      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSimulationName,
          calculator_type: 'pastagem',
          inputs: {
            areaHa,
            items,
            gainData
          }
        })
      });

      if (res.ok) {
        setNewSimulationName('');
        setShowSaveModal(false);
        setToastMessage('Orçamento salvo!');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
        fetchSimulations();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar orçamento');
      }
    } catch (err) {
      console.error('Error saving simulation:', err);
      alert('Erro de conexão ao salvar orçamento');
    } finally {
      setSavingSimulation(false);
    }
  };

  const handleDeleteSimulation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este orçamento salvo?')) return;

    try {
      const res = await fetch(`/api/simulations/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToastMessage('Orçamento excluído!');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
        setSelectedSimsForCompare(prev => prev.filter(item => item !== id));
        fetchSimulations();
      } else {
        alert('Erro ao excluir orçamento');
      }
    } catch (err) {
      console.error('Error deleting simulation:', err);
    }
  };

  const handleLoadSimulation = (sim: SavedSimulation) => {
    setAreaHa(sim.inputs.areaHa || '1');
    setItems(sim.inputs.items || []);
    setGainData(sim.inputs.gainData || { gmdExtra: '0.700', lotacao: '2.5', valorVenda: '13.00', diasPastejo: '120' });
    setToastMessage(`Orçamento "${sim.name}" carregado!`);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const toggleSelectForCompare = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (selectedSimsForCompare.length >= 4) {
        alert('Você pode comparar no máximo 4 orçamentos.');
        e.target.checked = false;
        return;
      }
      setSelectedSimsForCompare(prev => [...prev, id]);
    } else {
      setSelectedSimsForCompare(prev => prev.filter(item => item !== id));
    }
  };

  // --- Cálculos ---
  const calculations = useMemo(() => {
    const calcs = runPastagemCalculations({ areaHa, items, gainData });

    // Categorias para o gráfico
    const categoryTotals = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + (item.unitPrice * item.quantity);
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percent: ((value / calcs.totalCost) * 100).toFixed(0)
    }));

    // Dados do Gráfico de Evolução (Break-even)
    const extraKgPerHaDay = calcs.gmd * calcs.lot;
    const extraRevenuePerHaDay = extraKgPerHaDay * calcs.valor;
    const daysToShow = Math.max(120, isFinite(calcs.daysToPayback) && calcs.daysToPayback > 0 ? Math.ceil(calcs.daysToPayback * 1.5) : 180);
    const evolutionStep = Math.ceil(daysToShow / 20);
    const chartDataEvolution = [];

    // Garantir que o dia do payback esteja no gráfico para precisão visual
    const points = new Set([0]);
    for (let d = evolutionStep; d <= daysToShow; d += evolutionStep) points.add(d);
    if (isFinite(calcs.daysToPayback) && calcs.daysToPayback > 0 && calcs.daysToPayback < daysToShow) {
      points.add(Math.floor(calcs.daysToPayback));
      points.add(Math.ceil(calcs.daysToPayback));
    }
    points.add(daysToShow);

    const sortedPoints = Array.from(points).sort((a, b) => a - b);

    for (const d of sortedPoints) {
      const rec = extraRevenuePerHaDay * d;
      chartDataEvolution.push({
        dia: d,
        receita: Math.round(rec),
        custo: Math.round(calcs.costPerHa),
        lucro: Math.round(rec - calcs.costPerHa)
      });
    }

    return {
      ...calcs,
      chartData,
      chartDataEvolution,
      daysToShow
    };
  }, [items, areaHa, gainData]);

  // Comparison Data and Calculations
  const comparedSimsData = useMemo(() => {
    return selectedSimsForCompare.map(id => {
      const sim = simulations.find(s => s.id === id);
      if (!sim) return null;
      const calcs = runPastagemCalculations(sim.inputs);
      return {
        id: sim.id,
        name: sim.name,
        inputs: sim.inputs,
        calcs
      };
    }).filter(Boolean) as Array<{
      id: string;
      name: string;
      inputs: SavedSimulation['inputs'];
      calcs: ReturnType<typeof runPastagemCalculations>;
    }>;
  }, [selectedSimsForCompare, simulations]);

  // Find best values to highlight
  const bestValues = useMemo(() => {
    if (comparedSimsData.length === 0) {
      return {
        minCostPerHa: 99999999,
        minTotalCost: 99999999,
        minPayback: 999999,
        maxRoi: 0,
        maxRevenuePerHaMonth: 0,
        maxTotalExtraRevenueBatch: 0
      };
    }
    return {
      minCostPerHa: Math.min(...comparedSimsData.map(s => s.calcs.costPerHa)),
      minTotalCost: Math.min(...comparedSimsData.map(s => s.calcs.totalCost)),
      minPayback: Math.min(...comparedSimsData.map(s => s.calcs.daysToPayback)),
      maxRoi: Math.max(...comparedSimsData.map(s => s.calcs.roi)),
      maxRevenuePerHaMonth: Math.max(...comparedSimsData.map(s => s.calcs.extraRevenuePerHaMonth)),
      maxTotalExtraRevenueBatch: Math.max(...comparedSimsData.map(s => s.calcs.totalExtraRevenueBatch))
    };
  }, [comparedSimsData]);

  const comparisonChartData = useMemo(() => {
    return comparedSimsData.map(s => ({
      name: s.name,
      'ROI (%)': parseFloat(s.calcs.roi.toFixed(1)),
      'Investimento total (R$)': Math.round(s.calcs.totalCost),
      'Retorno Extra Total (R$)': Math.round(s.calcs.totalExtraRevenueBatch)
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
      category: 'Dados e Entradas do Pasto',
      items: [
        { label: 'Área do Pasto (ha)', format: (s: any) => `${s.inputs.areaHa} ha` },
        { label: 'GMD Extra (kg/dia)', format: (s: any) => `${s.inputs.gainData.gmdExtra} kg/dia` },
        { label: 'Lotação (cab/ha)', format: (s: any) => `${s.inputs.gainData.lotacao} cab/ha` },
        { label: 'R$ / kg Vivo', format: (s: any) => `R$ ${parseFloat(s.inputs.gainData.valorVenda).toFixed(2)}` },
        { label: 'Período Pastejo (dias)', format: (s: any) => `${s.inputs.gainData.diasPastejo} dias` },
      ]
    },
    {
      category: 'Indicadores Financeiros',
      items: [
        { 
          label: 'Investimento Total', 
          format: (s: any) => `R$ ${s.calcs.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isBest: (s: any) => s.calcs.totalCost === bestValues.minTotalCost && bestValues.minTotalCost < 99999999,
          highlightClass: 'text-blue-600 font-black bg-blue-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Custo por Hectare', 
          format: (s: any) => `R$ ${s.calcs.costPerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isBest: (s: any) => s.calcs.costPerHa === bestValues.minCostPerHa && bestValues.minCostPerHa < 99999999,
          highlightClass: 'text-blue-600 font-black bg-blue-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Receita Extra / Mês / ha', 
          format: (s: any) => `R$ ${s.calcs.extraRevenuePerHaMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isBest: (s: any) => s.calcs.extraRevenuePerHaMonth === bestValues.maxRevenuePerHaMonth && bestValues.maxRevenuePerHaMonth > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Retorno Extra Total Lote', 
          format: (s: any) => `R$ ${s.calcs.totalExtraRevenueBatch.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          isBest: (s: any) => s.calcs.totalExtraRevenueBatch === bestValues.maxTotalExtraRevenueBatch && bestValues.maxTotalExtraRevenueBatch > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'Payback (Dias)', 
          format: (s: any) => `${Math.ceil(s.calcs.daysToPayback)} dias`,
          isBest: (s: any) => s.calcs.daysToPayback === bestValues.minPayback && bestValues.minPayback > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
        { 
          label: 'ROI Estimado (%)', 
          format: (s: any) => `${s.calcs.roi.toFixed(1)}%`,
          isBest: (s: any) => s.calcs.roi === bestValues.maxRoi && bestValues.maxRoi > 0,
          highlightClass: 'text-emerald-600 font-black bg-emerald-50 rounded-lg px-2 py-0.5'
        },
      ]
    }
  ];

  // --- Handlers ---
  const addItem = () => {
    const newItem: CostItem = {
      id: Date.now().toString(),
      category: 'Insumos',
      description: 'Novo Item',
      unitPrice: 0,
      quantity: 0
    };
    setItems([newItem, ...items]);
  };

  const updateItem = (id: string, field: keyof CostItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin + window.location.pathname;
    const d = items.map(i => `${i.category}:${i.description}:${i.unitPrice}:${i.quantity}`).join(',');
    const g = `${gainData.gmdExtra}:${gainData.lotacao}:${gainData.valorVenda}:${gainData.diasPastejo}`;
    const params = new URLSearchParams({ a: areaHa, d, g });
    return `${baseUrl}?${params.toString()}`;
  }, [items, areaHa, gainData]);

  const handleShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 lg:pb-8">
      <Header
        onMenuClick={() => { }}
        user={user}
        onLogout={() => { }}
        onAuthClick={() => { }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/admin')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <main className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-8">
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest">
              <Leaf size={18} /> Investimento em Pastagem
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] tracking-tight">
              Custo de Formação de Pasto
            </h1>
            <p className="text-[#666] text-sm mt-1">
              Planeje o orçamento do plantio e estime o retorno financeiro por hectare.
            </p>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E9ECEF] text-[#333] hover:bg-[#F8F9FA] transition-all font-bold text-sm shadow-sm rounded-2xl"
          >
            <Share2 size={20} /> Compartilhar Orçamento
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Coluna Esquerda: Itens */}
          <div className="lg:col-span-7 space-y-6 min-w-0">

            {/* Tabela de Custos */}
            <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-[#333] flex items-center gap-2 uppercase tracking-wider">
                  <Scale size={18} className="text-[#2D5A27]" /> Itens do Orçamento
                </h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A27]/5 text-[#2D5A27] rounded-xl text-xs font-bold hover:bg-[#2D5A27]/10 transition-all"
                >
                  <Plus size={14} /> Novo Item
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E9ECEF] group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                            className="text-[10px] font-bold uppercase bg-white border border-[#E9ECEF] rounded-lg px-2 py-1.5 outline-none focus:border-[#2D5A27] shadow-sm"
                          >
                            <option value="Maquinário">🚜 Maquinário</option>
                            <option value="Insumos">🌱 Insumos</option>
                            <option value="Serviços">🛸 Serviços</option>
                            <option value="Outros">📦 Outros</option>
                          </select>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Descrição do item"
                            className="flex-1 min-w-[120px] bg-transparent font-bold text-[#333] text-sm border-b border-transparent focus:border-[#2D5A27] outline-none py-1"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-2 transition-colors bg-red-50 sm:bg-transparent rounded-lg sm:rounded-none"
                          title="Remover Item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="min-w-0">
                          <label className="block text-[9px] font-bold text-[#999] uppercase mb-1">Preço Unitário (R$)</label>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-[#E9ECEF] rounded-xl px-3 py-2 text-xs font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="block text-[9px] font-bold text-[#999] uppercase mb-1">Quantidade Total</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-[#E9ECEF] rounded-xl px-3 py-2 text-xs font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 bg-[#2D5A27]/5 rounded-xl px-3 py-2 flex flex-col justify-center">
                          <label className="block text-[9px] font-bold text-[#2D5A27] uppercase">Subtotal</label>
                          <div className="text-sm font-black text-[#2D5A27]">
                            R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resultados e Estimativa de Ganho */}
          <div className="lg:col-span-5 space-y-6 min-w-0">

            {/* Cards de Totais */}
            <div className="bg-[#2D5A27] rounded-[2.5rem] p-7 text-white shadow-xl shadow-[#2D5A27]/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] transition-all group-hover:scale-110" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-70">
                  <DollarSign size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Investimento Total</span>
                </div>
                <div className="text-4xl font-black mb-1">
                  R$ {calculations.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm font-medium opacity-80">
                  Média de R$ {calculations.costPerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por hectare
                </div>
              </div>
            </div>

            {/* Estimativa de Ganho Adicional (Movido para cima do Payback) */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-5 flex items-center gap-2 uppercase tracking-wider">
                <Beef size={18} className="text-[#8B4513]" /> Retorno sobre o Pasto
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 italic">
                    GMD Extra Esperado (kg/dia)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={gainData.gmdExtra}
                    onChange={(e) => setGainData(p => ({ ...p, gmdExtra: e.target.value }))}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                  />
                  <p className="text-[9px] text-[#999] mt-1">Quanto a mais o animal ganha por dia nesse pasto vs o antigo.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 italic">Lotação (cab/ha)</label>
                    <input
                      type="number"
                      value={gainData.lotacao}
                      onChange={(e) => setGainData(p => ({ ...p, lotacao: e.target.value }))}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 italic">R$ / kg Vivo</label>
                    <input
                      type="number"
                      value={gainData.valorVenda}
                      onChange={(e) => setGainData(p => ({ ...p, valorVenda: e.target.value }))}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 italic">Estimativa de Dias de Pastejo</label>
                  <input
                    type="number"
                    value={gainData.diasPastejo}
                    onChange={(e) => setGainData(p => ({ ...p, diasPastejo: e.target.value }))}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm font-bold text-[#333] focus:border-[#2D5A27] outline-none"
                  />
                  <p className="text-[9px] text-[#999] mt-1">Total de dias que os animais utilizarão esta pastagem.</p>
                </div>

                <div className="mt-4 p-4 bg-[#E9F0E8] border border-[#2D5A27]/20 rounded-2xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-[#2D5A27] uppercase">Receita Extra / Mês</span>
                    <span className="text-lg font-black text-[#2D5A27]">
                      R$ {calculations.extraRevenuePerHaMonth.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/ha
                    </span>
                  </div>
                  <p className="text-[9px] text-[#2D5A27]/70 italic leading-tight">
                    Cálculo baseado no ganho de peso adicional gerado por hectare a cada 30 dias.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-7 border border-[#E9ECEF] shadow-sm flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 text-[#999]">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Retorno do Investimento</span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-2xl font-black text-[#333]">
                      {calculations.daysToPayback > 0
                        ? `${Math.ceil(calculations.daysToPayback)} dias`
                        : 'N/A'}
                    </div>
                    <span className="text-[10px] text-[#999] font-bold uppercase tracking-widest block mt-1">Payback</span>
                  </div>

                  <div>
                    <div className={`text-2xl font-black ${calculations.roi >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                      {calculations.roi.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-[#999] font-bold uppercase tracking-widest block mt-1">ROI Estimado</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                <Wallet className="text-amber-600" size={28} />
              </div>
            </div>

            {/* Gráfico de Evolução do Lucro (Semelhante à calculadora GMD) */}
            {calculations.chartDataEvolution.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-bold text-[#333] flex items-center gap-2 uppercase tracking-wider">
                      <TrendingUp size={18} className="text-[#2D5A27]" /> Evolução Financeira
                    </h2>
                    <p className="text-[10px] text-[#999] mt-0.5">Projeção por hectare ao longo do tempo</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-full bg-[#2D5A27]" /> Lucro</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-full bg-[#E9ECEF] border" /> Custo</span>
                  </div>
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={calculations.chartDataEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        type="number"
                        domain={[0, 'dataMax']}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                        tickFormatter={(v) => `D${v}`}
                        ticks={[0, Math.round(calculations.daysToShow / 2), calculations.daysToShow]}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                        tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1A1A1A',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        }}
                        labelStyle={{ color: '#999', fontSize: 10, fontWeight: 700, marginBottom: 4 }}
                        itemStyle={{ fontSize: 12, fontWeight: 700, color: '#fff' }}
                        labelFormatter={(v) => `Dia ${v}`}
                        formatter={(value, name) => [
                          `R$ ${Number(value).toLocaleString('pt-BR')}`,
                          name === 'lucro' ? 'Lucro Acum.' : (name === 'receita' ? 'Receita' : 'Custo Inicial')
                        ]}
                      />
                      <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="custo" stroke="#CBD5E1" strokeWidth={1.5} fill="url(#gradCusto)" dot={false} />
                      <Area type="monotone" dataKey="lucro" stroke="#2D5A27" strokeWidth={2.5} fill="url(#gradLucro)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {calculations.daysToPayback > 0 ? (
                  <p className="text-center text-[10px] text-[#666] mt-4 font-medium italic">
                    📍 Break-even estimado em <strong className="text-[#2D5A27]">{Math.ceil(calculations.daysToPayback)} dias</strong>
                  </p>
                ) : null}
              </div>
            )}

            {/* Gráfico de Distribuição de Custos */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm min-h-[300px]">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <LayoutDashboard size={18} className="text-[#2D5A27]" /> Composição do Custo
              </h2>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={calculations.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {calculations.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {calculations.chartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] }} />
                    <span className="text-[10px] font-bold text-[#666]">{item.name} ({item.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco Simulações Salvas */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-6 flex items-center justify-between uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Bookmark size={18} className="text-[#2D5A27]" /> Meus Orçamentos Salvos
                </div>
                {user && simulations.length > 0 && (
                  <span className="text-[10px] bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-1 rounded-full font-black">
                    {simulations.length} salvos
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
                  <Plus size={16} /> Salvar Orçamento Atual
                </button>

                {!user ? (
                  <div className="text-center py-6 px-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] border-dashed">
                    <p className="text-xs text-[#666] mb-4">
                      Entre na sua conta para salvar seus orçamentos e comparar múltiplos projetos de pasto.
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
                    <p className="text-xs text-[#999] italic">Nenhum orçamento salvo ainda. Crie itens acima e salve.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {simulations.map(sim => {
                      const isSelected = selectedSimsForCompare.includes(sim.id);
                      const simCalcs = runPastagemCalculations(sim.inputs);
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
                                {sim.inputs.areaHa} ha · Inv: R$ {simCalcs.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSimulation(sim.id, e)}
                            className="text-[#999] hover:text-red-500 p-1.5 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Excluir orçamento"
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
                        alert('Selecione pelo menos 2 orçamentos para comparar.');
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
                    <Layers size={16} /> Comparar Selecionados ({selectedSimsForCompare.length})
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title="Orçamento de Formação de Pastagem - Gado Gaúcho"
        onCopySuccess={() => {
          setToastMessage('Link de orçamento copiado!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

      {user && (
        <BottomNav 
          user={user}
          onAdClick={() => setShowAdModal(true)}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}

      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-[#E9ECEF] shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-[#1A1A1A] mb-4">Salvar Orçamento de Pastagem</h3>
              <p className="text-sm text-[#666] mb-6">Dê um nome para identificar este orçamento de pasto posteriormente.</p>
              <input
                type="text"
                placeholder="Ex: Formação Tifton 2026"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white rounded-[2.5rem] border border-[#E9ECEF] shadow-2xl w-full max-w-5xl my-8 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-[#E9ECEF] flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#1A1A1A] flex items-center gap-2">
                    <Layers className="text-[#2D5A27]" size={24} /> Comparativo de Projetos de Pasto
                  </h3>
                  <p className="text-xs text-[#666] mt-1">Comparação detalhada lado a lado dos orçamentos de pastagem.</p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-2 hover:bg-[#F8F9FA] rounded-full text-[#999] hover:text-[#333] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(80vh-100px)] space-y-8">
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
                <div className="bg-[#F8F9FA] rounded-[2rem] p-6 border border-[#E9ECEF]">
                  <h4 className="text-sm font-bold text-[#333] mb-6 flex items-center gap-2 uppercase tracking-wider">
                    <RechartsBarIcon className="text-[#2D5A27]" size={18} /> Comparação Gráfica (Investimento & Retorno)
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
                        <Bar dataKey="Investimento total (R$)" fill="#EF4444" radius={[8, 8, 0, 0]}>
                          {comparisonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry['Investimento total (R$)'] === bestValues.minTotalCost ? '#D13232' : '#F87171'} />
                          ))}
                        </Bar>
                        <Bar dataKey="Retorno Extra Total (R$)" fill="#2171B5" radius={[8, 8, 0, 0]}>
                          {comparisonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry['Retorno Extra Total (R$)'] === bestValues.maxTotalExtraRevenueBatch ? '#2171B5' : '#639ECE'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-[#999] text-center mt-4 italic">
                    * O projeto com a barra mais escura representa o de melhor desempenho na métrica correspondente (menor investimento total ou maior ROI/retorno).
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-[#F8F9FA] border-t border-[#E9ECEF] flex justify-end">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-8 py-3 bg-[#2D5A27] text-white hover:bg-[#20401C] rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  Fechar Comparação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
