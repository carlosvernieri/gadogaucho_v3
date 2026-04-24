'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator, Loader2, Share2, Check, Info,
  Plus, Trash2, ChevronDown, Leaf,
  Scale, Wallet, AlertTriangle, ShieldCheck,
  DollarSign, Beef, TrendingUp, Sun, Snowflake,
  Sprout, Tractor, Plane, LayoutDashboard
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
  const { user } = useUser();
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

  // --- Cálculos ---
  const calculations = useMemo(() => {
    const area = parseFloat(areaHa) || 1;
    const totalCost = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const costPerHa = totalCost / area;

    // Categorias para o gráfico
    const categoryTotals = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + (item.unitPrice * item.quantity);
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percent: ((value / totalCost) * 100).toFixed(0)
    }));

    // Payback e Ganho
    const gmd = parseFloat(gainData.gmdExtra) || 0;
    const lot = parseFloat(gainData.lotacao) || 0;
    const valor = parseFloat(gainData.valorVenda) || 0;
    const dias = parseFloat(gainData.diasPastejo) || 0;

    const extraKgPerHaDay = gmd * lot;
    const extraRevenuePerHaDay = extraKgPerHaDay * valor;
    const daysToPayback = extraRevenuePerHaDay > 0 ? costPerHa / extraRevenuePerHaDay : 0;

    // Cálculo de ROI
    const totalExtraRevenue = extraRevenuePerHaDay * dias;
    const roi = costPerHa > 0 ? ((totalExtraRevenue - costPerHa) / costPerHa) * 100 : 0;

    // Dados do Gráfico de Evolução (Break-even)
    const daysToShow = Math.max(120, isFinite(daysToPayback) && daysToPayback > 0 ? Math.ceil(daysToPayback * 1.5) : 180);
    const evolutionStep = Math.ceil(daysToShow / 20);
    const chartDataEvolution = [];
    
    // Garantir que o dia do payback esteja no gráfico para precisão visual
    const points = new Set([0]);
    for (let d = evolutionStep; d <= daysToShow; d += evolutionStep) points.add(d);
    if (isFinite(daysToPayback) && daysToPayback > 0 && daysToPayback < daysToShow) {
      points.add(Math.floor(daysToPayback));
      points.add(Math.ceil(daysToPayback));
    }
    points.add(daysToShow);
    
    const sortedPoints = Array.from(points).sort((a, b) => a - b);

    for (const d of sortedPoints) {
      const rec = extraRevenuePerHaDay * d;
      chartDataEvolution.push({
        dia: d,
        receita: Math.round(rec),
        custo: Math.round(costPerHa),
        lucro: Math.round(rec - costPerHa)
      });
    }

    return {
      totalCost,
      costPerHa,
      chartData,
      daysToPayback,
      extraRevenuePerHaMonth: extraRevenuePerHaDay * 30,
      chartDataEvolution,
      roi
    };
  }, [items, areaHa, gainData]);

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
        onAdminClick={() => router.push('/')}
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
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                          className="text-[10px] font-bold uppercase bg-white border border-[#E9ECEF] rounded-lg px-2 py-1 outline-none focus:border-[#2D5A27]"
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
                          className="flex-1 min-w-[150px] bg-transparent font-bold text-[#333] text-sm border-b border-transparent focus:border-[#2D5A27] outline-none"
                        />
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-1 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
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
                  <div className="flex items-center gap-2 mb-1 text-[#999]">
                    <TrendingUp size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Retorno do Investimento</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-black text-[#333]">
                      {calculations.daysToPayback > 0
                        ? `${Math.ceil(calculations.daysToPayback)} dias`
                        : 'N/A'}
                    </div>
                    <span className="text-[10px] text-[#999] font-bold uppercase">Payback</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#F8F9FA] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#999] uppercase">ROI Estimado:</span>
                    <span className={`text-sm font-black ${calculations.roi >= 0 ? 'text-[#2D5A27]' : 'text-red-500'}`}>
                      {calculations.roi.toFixed(1)}%
                    </span>
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
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                          tickFormatter={(v) => `D${v}`}
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

      <BottomNav />
    </div>
  );
}
