'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator, Loader2, Share2, Check, Info,
  Plus, Trash2, ChevronDown, FlaskConical,
  Scale, Wallet, AlertTriangle, ShieldCheck,
  DollarSign, Beef, TrendingUp, Droplets, Sun, Snowflake
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { ShareModal } from '@/components/ShareModal';
import { Sidebar } from '@/components/Sidebar';
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
  AreaChart,
  Area,
  Legend,
  ReferenceLine
} from 'recharts';

// --- Catálogo de Ingredientes com valores nutricionais fixos ---
const INGREDIENT_CATALOG = [
  { id: 'farelo_trigo', name: 'Farelo de trigo', defaultBagKg: 25, defaultPrice: 35, proteina: 13, ndt: 75 },
  { id: 'farelo_arroz', name: 'Farelo de arroz', defaultBagKg: 30, defaultPrice: 40, proteina: 13, ndt: 69 },
  { id: 'farelo_milho', name: 'Farelo de milho', defaultBagKg: 25, defaultPrice: 44, proteina: 9, ndt: 85 },
  { id: 'farelo_soja', name: 'Farelo de soja', defaultBagKg: 40, defaultPrice: 128, proteina: 44, ndt: 82 },
  { id: 'milho_grao', name: 'Milho grão moído', defaultBagKg: 60, defaultPrice: 66, proteina: 9, ndt: 88 },
  { id: 'casca_soja', name: 'Casca de soja', defaultBagKg: 25, defaultPrice: 30, proteina: 12, ndt: 77 },
  { id: 'polpa_citrica', name: 'Polpa cítrica', defaultBagKg: 25, defaultPrice: 32, proteina: 7, ndt: 82 },
  { id: 'algodao_farelo', name: 'Farelo de algodão', defaultBagKg: 40, defaultPrice: 95, proteina: 38, ndt: 70 },
  { id: 'ureia', name: 'Ureia', defaultBagKg: 50, defaultPrice: 160, proteina: 281, ndt: 0 },
  { id: 'ureia_protegida', name: 'Ureia protegida', defaultBagKg: 25, defaultPrice: 120, proteina: 256, ndt: 0 },
  { id: 'sal_branco', name: 'Sal branco', defaultBagKg: 25, defaultPrice: 25.5, proteina: 0, ndt: 0 },
  { id: 'sal_mineral', name: 'Sal mineral', defaultBagKg: 25, defaultPrice: 65, proteina: 0, ndt: 0 },
  { id: 'nucleo', name: 'Núcleo mineral Supra 40/30% sal', defaultBagKg: 25, defaultPrice: 82, proteina: 0, ndt: 0 },
  { id: 'fosfato_bicalcico', name: 'Fosfato bicálcico', defaultBagKg: 25, defaultPrice: 95, proteina: 0, ndt: 0 },
  { id: 'calcario', name: 'Calcário calcítico', defaultBagKg: 25, defaultPrice: 12, proteina: 0, ndt: 0 },
  { id: 'enxofre', name: 'Enxofre ventilado', defaultBagKg: 25, defaultPrice: 45, proteina: 0, ndt: 0 },
  { id: 'melaço', name: 'Melaço em pó', defaultBagKg: 25, defaultPrice: 55, proteina: 4, ndt: 75 },
];

interface FormulationIngredient {
  catalogId: string;
  bagKg: number;
  price: number;
  qtyIn100kg: number;
}

// Chart color palette
const CHART_COLORS = [
  '#2D5A27', '#3B7A33', '#4E9A3F', '#6BB85A', '#8ED47A',
  '#2171B5', '#4292C6', '#6BAED6', '#9ECAE1', '#C6DBEF',
  '#D4A017', '#E8B838', '#F5CC59', '#FFE08A', '#FFF3C4',
  '#C0392B', '#E74C3C',
];

export default function ProteinadoCalculatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
      </div>
    }>
      <ProteinadoCalculatorContent />
    </Suspense>
  );
}

function ProteinadoCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Default formulation (matching user's spreadsheet)
  const [ingredients, setIngredients] = useState<FormulationIngredient[]>([
    { catalogId: 'farelo_milho', bagKg: 25, price: 44, qtyIn100kg: 48 },
    { catalogId: 'farelo_soja', bagKg: 40, price: 128, qtyIn100kg: 10 },
    { catalogId: 'nucleo', bagKg: 25, price: 82, qtyIn100kg: 25 },
    { catalogId: 'ureia', bagKg: 50, price: 160, qtyIn100kg: 10 },
    { catalogId: 'sal_branco', bagKg: 25, price: 25.5, qtyIn100kg: 7 },
  ]);

  // Lot data
  const [lotData, setLotData] = useState({
    animals: '40',
    startWeight: '180',
    consumptionRate: '0.2',
    sellPrice: '13.00',
    periodo: '180',
  });

  // Load initial state from URL parameters
  useEffect(() => {
    const i = searchParams.get('i');
    const a = searchParams.get('a');
    const sw = searchParams.get('sw');
    const ew = searchParams.get('ew');
    const c = searchParams.get('c');
    const s = searchParams.get('s');
    const p = searchParams.get('p');

    if (i) {
      try {
        const parsedIngredients = i.split(',').map(item => {
          const [catalogId, bagKg, price, qtyIn100kg] = item.split(':');
          return {
            catalogId,
            bagKg: parseFloat(bagKg) || 0,
            price: parseFloat(price) || 0,
            qtyIn100kg: parseFloat(qtyIn100kg) || 0,
          };
        });
        if (parsedIngredients.length > 0) {
          setIngredients(parsedIngredients);
        }
      } catch (e) {
        console.error('Error parsing shared ingredients', e);
      }
    }

    if (a || sw || ew || c || s) {
      setLotData(prev => ({
        ...prev,
        animals: a || prev.animals,
        startWeight: sw || prev.startWeight,
        consumptionRate: c || prev.consumptionRate,
        sellPrice: s || prev.sellPrice,
        periodo: p || prev.periodo,
      }));
    }
  }, [searchParams]);

  // Get catalog info for an ingredient
  const getCatalog = (catalogId: string) =>
    INGREDIENT_CATALOG.find(c => c.id === catalogId)!;

  // Available ingredients (not yet added)
  const availableIngredients = useMemo(
    () => INGREDIENT_CATALOG.filter(c => !ingredients.some(i => i.catalogId === c.id)),
    [ingredients]
  );

  // Calculations
  const calculations = useMemo(() => {
    const totalQty = ingredients.reduce((sum, i) => sum + i.qtyIn100kg, 0);

    const rows = ingredients.map(i => {
      const catalog = getCatalog(i.catalogId);
      const pricePerKg = i.bagKg > 0 ? i.price / i.bagKg : 0;
      
      // Normalizamos a quantidade de cada ingrediente para a base de 100kg 
      // para que a contribuição nutricional e de custos seja calculada corretamente,
      // independente do tamanho total da fórmula inserida (ex: 150kg).
      const qtyNormalized = totalQty > 0 ? (i.qtyIn100kg / totalQty) * 100 : 0;

      const costIn100kg = pricePerKg * qtyNormalized;
      const proteinaContrib = (catalog.proteina * qtyNormalized) / 100;
      const ndtContrib = (catalog.ndt * qtyNormalized) / 100;
      return {
        ...i,
        catalog,
        pricePerKg,
        costIn100kg,
        proteinaContrib,
        ndtContrib,
      };
    });

    const totalCost100kg = rows.reduce((s, r) => s + r.costIn100kg, 0);
    const totalProteina = rows.reduce((s, r) => s + r.proteinaContrib, 0);
    const totalNdt = rows.reduce((s, r) => s + r.ndtContrib, 0);

    const costPerKg = totalCost100kg / 100;
    const costPerBag25 = costPerKg * 25;

    const animals = parseFloat(lotData.animals) || 0;
    const startWt = parseFloat(lotData.startWeight) || 0;
    const consumptionRate = parseFloat(lotData.consumptionRate) || 0;
    const periodoDias = parseFloat(lotData.periodo) || 0;

    // --- Lógica de Projeção de Peso (Mover para o useMemo para automatizar Peso Final) ---
    const gainReference = [
      { rate: 0.1, invernoMin: 0.10, invernoMax: 0.25, veraoMin: 0.05, veraoMax: 0.15 },
      { rate: 0.2, invernoMin: 0.20, invernoMax: 0.40, veraoMin: 0.10, veraoMax: 0.25 },
      { rate: 0.3, invernoMin: 0.30, invernoMax: 0.50, veraoMin: 0.20, veraoMax: 0.35 },
      { rate: 0.4, invernoMin: 0.40, invernoMax: 0.60, veraoMin: 0.30, veraoMax: 0.45 },
      { rate: 0.5, invernoMin: 0.50, invernoMax: 0.80, veraoMin: 0.40, veraoMax: 0.60 },
      { rate: 1.0, invernoMin: 0.80, invernoMax: 1.20, veraoMin: 0.60, veraoMax: 0.90 },
    ];

    let bestMatch = gainReference[0];
    let bestDist = Math.abs(consumptionRate - gainReference[0].rate);
    for (const ref of gainReference) {
      const dist = Math.abs(consumptionRate - ref.rate);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = ref;
      }
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const startMonth = now.getMonth();
    const isWinterMonth = (monthIdx: number) => monthIdx >= 5 && monthIdx <= 8;

    let pastureWeight = startWt;
    let supplementWeight = startWt;
    const projectionData = [];

    projectionData.push({
      name: monthNames[startMonth],
      mes: 0,
      pasto: Math.round(pastureWeight * 10) / 10,
      suplemento: Math.round(supplementWeight * 10) / 10,
      isWinter: isWinterMonth(startMonth),
    });

    const totalMeses = Math.ceil(periodoDias / 30);
    for (let i = 1; i <= totalMeses; i++) {
      const monthIdx = (startMonth + i) % 12;
      const winter = isWinterMonth(monthIdx);
      const daysInMonth = (i === totalMeses && periodoDias % 30 !== 0) ? periodoDias % 30 : 30;

      const pastureGMD = winter ? 0.0 : 0.45;
      const suppGainExtra = consumptionRate <= 0 
        ? 0 
        : (winter
          ? (bestMatch.invernoMin + bestMatch.invernoMax) / 2
          : (bestMatch.veraoMin + bestMatch.veraoMax) / 2);

      pastureWeight += pastureGMD * daysInMonth;
      supplementWeight += (pastureGMD + suppGainExtra) * daysInMonth;

      projectionData.push({
        name: monthNames[monthIdx],
        mes: i,
        pasto: Math.round(pastureWeight * 10) / 10,
        suplemento: Math.round(supplementWeight * 10) / 10,
        isWinter: winter,
      });
    }

    const endWeightProjected = Math.round(supplementWeight * 10) / 10;
    const endWeightPasture = Math.round(pastureWeight * 10) / 10;
    const avgWeight = (startWt + endWeightProjected) / 2;

    const dailyConsumptionKg = (avgWeight * animals * consumptionRate) / 100;
    const dailyCost = dailyConsumptionKg * costPerKg;
    const monthlyCost = dailyCost * 30;
    const costPerAnimalDay = animals > 0 ? dailyCost / animals : 0;
    const costPerAnimalMonth = costPerAnimalDay * 30;
    const totalPeriodCost = dailyCost * (parseFloat(lotData.periodo) || 0);

    // Safety checks
    const ureiaIngredients = ingredients.filter(i => {
      const cat = getCatalog(i.catalogId);
      return cat.proteina >= 200; // Ureia-type
    });
    const ureiaQty = ureiaIngredients.reduce((s, i) => s + i.qtyIn100kg, 0);
    const ureiaPercent = totalQty > 0 ? (ureiaQty / totalQty) * 100 : 0;

    // How long 100kg lasts
    const daysPerBatch = dailyConsumptionKg > 0 ? 100 / dailyConsumptionKg : 0;

    return {
      rows,
      totalQty,
      totalCost100kg,
      totalProteina,
      totalNdt,
      costPerKg,
      costPerBag25,
      dailyConsumptionKg,
      dailyCost,
      monthlyCost,
      costPerAnimalDay,
      costPerAnimalMonth,
      totalPeriodCost,
      ureiaPercent,
      ureiaQty,
      daysPerBatch,
      isFormulationValid: Math.abs(totalQty - 100) < 0.01,
      isUreiaSafe: ureiaPercent <= 15,
      avgWeight,
      endWeightProjected,
      endWeightPasture,
      projectionData,
      finalDifference: (endWeightProjected - endWeightPasture).toFixed(0)
    };
  }, [ingredients, lotData]);

  // Handlers
  const addIngredient = (catalogId: string) => {
    const catalog = INGREDIENT_CATALOG.find(c => c.id === catalogId);
    if (!catalog) return;
    setIngredients(prev => [...prev, {
      catalogId,
      bagKg: catalog.defaultBagKg,
      price: catalog.defaultPrice,
      qtyIn100kg: 0,
    }]);
    setShowCatalog(false);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof FormulationIngredient, value: string) => {
    setIngredients(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: parseFloat(value) || 0 };
    }));
  };

  // Chart data
  const chartData = useMemo(() => {
    return calculations.rows
      .filter(r => r.costIn100kg > 0)
      .sort((a, b) => b.costIn100kg - a.costIn100kg)
      .map(r => ({
        name: r.catalog.name,
        custo: Math.round(r.costIn100kg * 100) / 100,
        percent: calculations.totalCost100kg > 0
          ? Math.round((r.costIn100kg / calculations.totalCost100kg) * 1000) / 10
          : 0,
      }));
  }, [calculations]);

  // Share URL
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const data = {
      i: ingredients.map(i => `${i.catalogId}:${i.bagKg}:${i.price}:${i.qtyIn100kg}`).join(','),
      a: lotData.animals,
      sw: lotData.startWeight,
      c: lotData.consumptionRate,
      s: lotData.sellPrice,
      p: lotData.periodo,
    };
    const params = new URLSearchParams(data);
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
  }, [ingredients, lotData]);

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

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest print:hidden">
              <FlaskConical size={18} /> Formulador Nutricional
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] tracking-tight">
              Calculadora de Proteinado
            </h1>
            <p className="text-[#666] text-sm mt-1">
              Monte sua formulação de suplemento proteico e analise custos e composição nutricional em tempo real.
            </p>
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E9ECEF] text-[#333] hover:bg-[#F8F9FA] transition-all font-bold text-sm shadow-sm print:hidden rounded-2xl"
          >
            <Share2 size={20} /> Compartilhar
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left Column - Inputs (5/12) */}
          <div className="lg:col-span-5 space-y-6 print:hidden min-w-0">

            {/* Ingredient Table */}
            <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-5 flex items-center gap-2 uppercase tracking-wider">
                <Scale size={18} className="text-[#2D5A27]" /> Ingredientes da Fórmula
              </h2>

              {/* Formulação Status */}
              <div className={`mb-5 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${calculations.isFormulationValid
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                <span>Total: {calculations.totalQty.toFixed(1)} kg</span>
                {calculations.isFormulationValid ? (
                  <ShieldCheck size={16} />
                ) : calculations.totalQty < 100 ? (
                  <span>{(100 - calculations.totalQty).toFixed(1)} kg restantes</span>
                ) : (
                  <span>Excesso: {(calculations.totalQty - 100).toFixed(1)} kg</span>
                )}
              </div>

              {/* Ingredient rows */}
              <div className="space-y-3">
                {ingredients.map((ing, idx) => {
                  const catalog = getCatalog(ing.catalogId);
                  const pricePerKg = ing.bagKg > 0 ? ing.price / ing.bagKg : 0;
                  return (
                    <motion.div
                      key={ing.catalogId}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-[#F8F9FA] rounded-xl p-3.5 border border-[#E9ECEF] group"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-black text-[#333] truncate">{catalog.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {catalog.proteina > 0 && (
                              <span className="text-[9px] font-bold bg-[#2D5A27]/10 text-[#2D5A27] px-1.5 py-0.5 rounded-full">
                                {catalog.proteina}% PB
                              </span>
                            )}
                            {catalog.ndt > 0 && (
                              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                                {catalog.ndt}% NDT
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 opacity-50 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-[#999] uppercase mb-1">Saco (kg)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={ing.bagKg || ''}
                            onChange={(e) => updateIngredient(idx, 'bagKg', e.target.value)}
                            className="w-full min-w-0 bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#999] uppercase mb-1">Preço (R$)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={ing.price || ''}
                            onChange={(e) => updateIngredient(idx, 'price', e.target.value)}
                            className="w-full min-w-0 bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-[#999] uppercase mb-1">Qtd (kg/100)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={ing.qtyIn100kg || ''}
                            onChange={(e) => updateIngredient(idx, 'qtyIn100kg', e.target.value)}
                            className="w-full min-w-0 bg-[#FFFDE7] border border-[#F9A825]/30 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#333] outline-none focus:border-[#F9A825]"
                          />
                        </div>
                      </div>
                      <div className="mt-1.5 text-[10px] text-[#999] font-medium text-right">
                        R$ {pricePerKg.toFixed(2)}/kg · Custo: R$ {(pricePerKg * ing.qtyIn100kg).toFixed(2)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Add ingredient */}
              <div className="mt-4 relative">
                <button
                  onClick={() => setShowCatalog(!showCatalog)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#2D5A27]/30 text-[#2D5A27] rounded-xl text-xs font-bold hover:bg-[#2D5A27]/5 transition-all"
                >
                  <Plus size={16} /> Adicionar Ingrediente
                  <ChevronDown size={14} className={`transition-transform ${showCatalog ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showCatalog && availableIngredients.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-[#E9ECEF] shadow-xl z-20 max-h-64 overflow-y-auto"
                    >
                      {availableIngredients.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => addIngredient(cat.id)}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#F8F9FA] transition-colors flex items-center justify-between border-b border-[#F8F9FA] last:border-0"
                        >
                          <span className="font-bold text-[#333]">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            {cat.proteina > 0 && (
                              <span className="text-[9px] font-bold bg-[#2D5A27]/10 text-[#2D5A27] px-1.5 py-0.5 rounded-full">
                                {cat.proteina}% PB
                              </span>
                            )}
                            <span className="text-[10px] text-[#999]">R$ {cat.defaultPrice.toFixed(2)}</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Lot Data */}
            <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-sm">
              <h2 className="text-sm font-bold text-[#333] mb-5 flex items-center gap-2 uppercase tracking-wider">
                <Beef size={18} className="text-[#8B4513]" /> Dados do Lote
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Nº de Animais</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={lotData.animals}
                      onChange={(e) => setLotData(p => ({ ...p, animals: e.target.value }))}
                      className="w-full min-w-0 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3 py-2.5 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Peso Inicial (kg)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={lotData.startWeight}
                      onChange={(e) => setLotData(p => ({ ...p, startWeight: e.target.value }))}
                      className="w-full min-w-0 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3 py-2.5 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 italic">Peso Final Projetado</label>
                    <div className="w-full bg-[#E9F0E8] border border-[#2D5A27]/20 rounded-xl px-3 py-2.5 text-sm font-black text-[#2D5A27]">
                      {calculations.endWeightProjected} kg
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Período (dias)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={lotData.periodo}
                      onChange={(e) => setLotData(p => ({ ...p, periodo: e.target.value }))}
                      className="w-full min-w-0 bg-[#FFFDE7] border border-[#F9A825]/30 rounded-xl px-3 py-2.5 text-sm font-bold text-[#333] outline-none focus:border-[#F9A825]"
                    />
                  </div>
                </div>
                <div className="px-3 py-2 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Peso Médio Projetado</span>
                    <span className="text-[8px] text-[#2D5A27] font-bold italic">Média entre Inicial e Máximo Projetado</span>
                  </div>
                  <span className="text-sm font-black text-[#333]">{calculations.avgWeight.toFixed(1)} kg</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Consumo (% do PV)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={lotData.consumptionRate}
                    onChange={(e) => setLotData(p => ({ ...p, consumptionRate: e.target.value }))}
                    className="w-full min-w-0 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3 py-2.5 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                  <p className="text-[10px] text-[#999] mt-1.5 italic">Proteinado típico: 0,05% a 0,15% do peso vivo.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Preço Venda (R$/kg vivo)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.50"
                    value={lotData.sellPrice}
                    onChange={(e) => setLotData(p => ({ ...p, sellPrice: e.target.value }))}
                    className="w-full min-w-0 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3 py-2.5 text-sm font-bold text-[#333] outline-none focus:border-[#2D5A27]"
                  />
                  <p className="text-[10px] text-[#999] mt-1.5 italic">Preço estimado da @ ou kg vivo na venda.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Results (7/12) */}
          <div className="lg:col-span-7 space-y-6 min-w-0">

            {/* Nutrition & Cost Cards */}
            <div className="grid sm:grid-cols-2 gap-6">

              {/* Composição Nutricional */}
              <div className="bg-[#2D5A27] rounded-[2.5rem] p-7 text-white shadow-xl shadow-[#2D5A27]/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] transition-all group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-5 opacity-70">
                    <FlaskConical size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Composição Nutricional</span>
                  </div>
                  <div className="flex items-end gap-6">
                    <div>
                      <div className="text-4xl font-black">{calculations.totalProteina.toFixed(1)}%</div>
                      <span className="text-xs opacity-60 font-medium">Proteína Bruta</span>
                    </div>
                    <div className="pb-1">
                      <div className="text-2xl font-bold opacity-80">{calculations.totalNdt.toFixed(1)}%</div>
                      <span className="text-xs opacity-60 font-medium">NDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custo da Mistura */}
              <div className="bg-white rounded-[2.5rem] p-7 border border-[#E9ECEF] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-bl-[100px] transition-all group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-5 text-[#999]">
                    <DollarSign size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Custo da Mistura</span>
                  </div>
                  <div className="text-3xl font-black text-[#333] mb-1 whitespace-nowrap">
                    R$ {calculations.costPerKg.toFixed(2)}<span className="text-base text-[#999] font-bold">/kg</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[#666] font-medium">
                    <span>100kg: R$ {calculations.totalCost100kg.toFixed(2)}</span>
                    <span>Saco 25kg: R$ {calculations.costPerBag25.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custo do Lote */}
            <div className="bg-white rounded-[2.5rem] p-7 border border-[#E9ECEF] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-5 border-b border-[#F8F9FA] gap-3">
                <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Wallet className="text-[#2D5A27]" size={22} /> Impacto no Lote
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-full font-bold text-[#666] whitespace-nowrap">
                    {calculations.dailyConsumptionKg.toFixed(1)} kg/dia
                  </span>
                  <span className="px-3 py-1.5 bg-[#E9F0E8] text-[#2D5A27] rounded-full font-black border border-[#2D5A27]/10 whitespace-nowrap">
                    Rende {calculations.daysPerBatch.toFixed(0)} dias/100kg
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Custo/Cab/Dia</span>
                  <div className="text-2xl font-black text-[#333] whitespace-nowrap">
                    R$ {calculations.costPerAnimalDay.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Custo/Cab/Mês</span>
                  <div className="text-2xl font-black text-[#333] whitespace-nowrap">
                    R$ {calculations.costPerAnimalMonth.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1">Custo Diário</span>
                  <div className="text-2xl font-black text-[#2D5A27] whitespace-nowrap">
                    R$ {calculations.dailyCost.toFixed(2)}
                  </div>
                  <span className="text-[11px] text-[#999] font-medium">Lote inteiro</span>
                </div>
                <div className="space-y-1 bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/10 -m-3">
                  <span className="text-[10px] font-bold text-[#2D5A27] uppercase tracking-widest block mb-1">Custo Mensal</span>
                  <div className="text-2xl font-black text-[#2D5A27] whitespace-nowrap">
                    R$ {calculations.monthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-[#2D5A27]/70 font-medium">Lote inteiro</span>
                </div>
              </div>
            </div>

            {/* Estimated Weight Gain Reference Table */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-7 border border-[#E9ECEF] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-5 border-b border-[#F8F9FA] gap-3">
                <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <TrendingUp className="text-[#2D5A27]" size={22} /> Ganho Adicional com Suplemento
                </h2>
                <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Ganho extra por faixa de consumo</span>
              </div>

              <div className="text-xs text-[#666] mb-5 leading-relaxed space-y-3">
                <p>
                  Ganho de peso <strong>adicional</strong> proporcionado pelo suplemento, além do que o animal já ganharia somente a pasto.
                  No <strong>inverno</strong>, o pasto nativo sozinho mantém ou perde peso (base ≈ 0 kg/dia). Nas <strong>demais estações</strong>, o pasto bom já proporciona ~0,4–0,5 kg/dia.
                </p>
                <div className="p-3 bg-[#E9F0E8]/50 border border-[#2D5A27]/20 rounded-xl text-[11px]">
                  <strong className="text-[#2D5A27]">Contexto RS:</strong> Diferente de regiões mais ao centro/norte do país, no Rio Grande do Sul não temos um longo período de "seca". O desafio nutricional equivalente ocorre no <strong>inverno</strong> (meses mais frios de junho, julho, agosto e setembro), marcado por geadas e quando o campo nativo perde qualidade, assumindo que não há pastagens cultivadas de inverno como aveia ou azevém.
                </div>
              </div>

              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-[11px] min-w-[520px]">
                  <thead>
                    <tr className="border-b-2 border-[#E9ECEF]">
                      <th className="text-left px-3 py-2.5 font-bold text-[#999] uppercase tracking-wider">Consumo (% PV)</th>
                      <th className="text-left px-3 py-2.5 font-bold text-[#999] uppercase tracking-wider">Tipo</th>
                      <th className="text-center px-3 py-2.5 font-bold uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1 text-blue-600"><Snowflake size={12} /> +Inverno</span>
                      </th>
                      <th className="text-center px-3 py-2.5 font-bold uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1 text-amber-600"><Sun size={12} /> +Verão</span>
                      </th>
                      <th className="text-left px-3 py-2.5 font-bold text-[#999] uppercase tracking-wider">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {[
                      { rate: 0.1, type: 'Sal proteinado', gmdInverno: '+0,10 – 0,25', gmdVerao: '+0,05 – 0,15', obj: 'Manutenção no inverno' },
                      { rate: 0.2, type: 'Sal proteinado (alto)', gmdInverno: '+0,20 – 0,40', gmdVerao: '+0,10 – 0,25', obj: 'Ganho moderado' },
                      { rate: 0.3, type: 'Proteico-energético', gmdInverno: '+0,30 – 0,50', gmdVerao: '+0,20 – 0,35', obj: 'Recria' },
                      { rate: 0.4, type: 'Proteico-energético', gmdInverno: '+0,40 – 0,60', gmdVerao: '+0,30 – 0,45', obj: 'Recria intensiva' },
                      { rate: 0.5, type: 'Supl. energético', gmdInverno: '+0,50 – 0,80', gmdVerao: '+0,40 – 0,60', obj: 'Semiconfinamento' },
                      { rate: 1.0, type: 'Ração / semiconf.', gmdInverno: '+0,80 – 1,20', gmdVerao: '+0,60 – 0,90', obj: 'Terminação' },
                    ].map((row) => {
                      const currentRate = parseFloat(lotData.consumptionRate) || 0;
                      const isActive = Math.abs(currentRate - row.rate) < 0.05;
                      return (
                        <tr
                          key={row.rate}
                          className={`transition-colors ${isActive
                            ? 'bg-[#2D5A27]/5 ring-1 ring-inset ring-[#2D5A27]/20'
                            : 'hover:bg-[#FAFAFA]'
                            }`}
                        >
                          <td className={`px-3 py-2.5 font-black ${isActive ? 'text-[#2D5A27]' : 'text-[#333]'}`}>
                            {row.rate.toFixed(1)}%
                            {isActive && <span className="ml-1.5 text-[8px] font-bold bg-[#2D5A27] text-white px-1.5 py-0.5 rounded-full align-middle">ATUAL</span>}
                          </td>
                          <td className="px-3 py-2.5 text-[#666] font-medium">{row.type}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${isActive ? 'text-blue-700' : 'text-blue-600'}`}>{row.gmdInverno}</span>
                            <span className="text-[#999] ml-0.5">kg/dia</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${isActive ? 'text-amber-700' : 'text-amber-600'}`}>{row.gmdVerao}</span>
                            <span className="text-[#999] ml-0.5">kg/dia</span>
                          </td>
                          <td className="px-3 py-2.5 text-[#666] font-medium">{row.obj}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 p-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl flex gap-3">
                <Info size={16} className="text-[#2D5A27] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#666] leading-relaxed italic">
                  <strong className="text-[#333]">Valores representam o ganho extra</strong> do suplemento sobre o que o animal já ganharia somente a pasto.
                  No <strong className="text-[#333]">inverno</strong> (base ≈ 0 kg/dia), o suplemento é praticamente todo o ganho.
                  No <strong className="text-[#333]">verão/primavera</strong> (base ≈ 0,4–0,5 kg/dia), o ganho adicional é menor pois o pasto já supre boa parte da demanda — mas o efeito combinado gera GMD total superior.
                </p>
              </div>
            </div>

            {/* Weight Gain Projection Chart */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-7 border border-[#E9ECEF] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 pb-5 border-b border-[#F8F9FA] gap-3">
                <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <TrendingUp className="text-[#2D5A27]" size={22} /> Projeção de Peso — {lotData.periodo} dias
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Consumo:</span>
                  <span className="text-xs font-black text-[#2D5A27] bg-[#2D5A27]/10 px-2.5 py-1 rounded-full">
                    {(parseFloat(lotData.consumptionRate) || 0).toFixed(1)}% PV
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#666] mb-5 leading-relaxed">
                Evolução estimada do peso médio dos animais ao longo do período de {lotData.periodo} dias.
                Linha <strong className="text-amber-600">amber tracejada</strong> = somente a pasto. Linha <strong className="text-[#2D5A27]">verde</strong> = com proteinado.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#F8F9FA] rounded-xl p-3 text-center border border-[#E9ECEF]">
                  <div className="text-[9px] font-bold text-[#999] uppercase tracking-wider mb-1">Peso Inicial</div>
                  <div className="text-lg font-black text-[#333]">{lotData.startWeight}<span className="text-xs text-[#999] font-bold"> kg</span></div>
                </div>
                <div className="bg-[#FFF7ED] rounded-xl p-3 text-center border border-amber-200">
                  <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">Só Pasto ({lotData.periodo}d)</div>
                  <div className="text-lg font-black text-amber-700">{calculations.endWeightPasture}<span className="text-xs text-amber-500 font-bold"> kg</span></div>
                </div>
                <div className="bg-[#E9F0E8] rounded-xl p-3 text-center border border-[#2D5A27]/20">
                  <div className="text-[9px] font-bold text-[#2D5A27] uppercase tracking-wider mb-1">Com Suplemento</div>
                  <div className="text-lg font-black text-[#2D5A27]">{calculations.endWeightProjected}<span className="text-xs text-[#2D5A27]/60 font-bold"> kg</span></div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={calculations.projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradSuplemento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2D5A27" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#E9ECEF' }}
                    tick={{ fontSize: 11, fill: '#666', fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                    tickFormatter={(v: number) => `${v}kg`}
                    domain={['dataMin - 10', 'dataMax + 10']}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1A1A1A',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }}
                    labelStyle={{ color: '#999', fontSize: 11, fontWeight: 700, marginBottom: 4 }}
                    formatter={(value: any, name: any) => [
                      `${Number(value ?? 0).toFixed(1)} kg`,
                      String(name) === 'pasto' ? 'Somente Pasto' : 'Com Suplemento'
                    ]}
                    labelFormatter={(label: any) => {
                      const point = calculations.projectionData.find(p => p.name === String(label));
                      return `${String(label)} ${point?.isWinter ? '(Inverno)' : '(Verão)'}`;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value: any) => String(value) === 'pasto' ? 'Somente a Pasto' : 'Com Proteinado'}
                  />
                  <Area
                    type="monotone"
                    dataKey="pasto"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    fill="url(#gradPasto)"
                    strokeDasharray="6 3"
                    dot={{ r: 3, fill: '#D97706', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#D97706', strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="suplemento"
                    stroke="#2D5A27"
                    strokeWidth={3}
                    fill="url(#gradSuplemento)"
                    dot={{ r: 3, fill: '#2D5A27', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#2D5A27', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-5 p-4 bg-gradient-to-r from-[#2D5A27]/5 to-[#2D5A27]/10 border border-[#2D5A27]/15 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2D5A27] rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="text-white" size={22} />
                </div>
                <div>
                  <div className="text-sm font-black text-[#2D5A27]">
                    +{calculations.finalDifference} kg a mais em {lotData.periodo} dias
                  </div>
                  <p className="text-[10px] text-[#666] mt-0.5">
                    com suplementação a {(parseFloat(lotData.consumptionRate) || 0).toFixed(1)}% PV vs somente a pasto
                  </p>
                </div>
              </div>

              {/* Profit Comparison */}
              {(() => {
                const sellPrice = parseFloat(lotData.sellPrice) || 0;
                const animals = parseFloat(lotData.animals) || 0;
                if (sellPrice <= 0 || animals <= 0) return null;

                const weightGainPasture = calculations.endWeightPasture - parseFloat(lotData.startWeight);
                const weightGainSupplement = calculations.endWeightProjected - parseFloat(lotData.startWeight);
                const extraKg = weightGainSupplement - weightGainPasture;

                // Revenue from weight gain over period (per animal × animals)
                const revenuePasture = weightGainPasture * sellPrice * animals;
                const revenueSupplement = weightGainSupplement * sellPrice * animals;

                // Supplement cost over period
                const supplementCostPeriod = calculations.totalPeriodCost;

                // Net profit (revenue minus supplement cost)
                const profitPasture = revenuePasture; // no supplement cost
                const profitSupplement = revenueSupplement - supplementCostPeriod;
                const profitDifference = profitSupplement - profitPasture;

                const extraRevenuePerAnimal = extraKg * sellPrice;
                const supplementCostPerAnimal = animals > 0 ? supplementCostPeriod / animals : 0;
                const netPerAnimal = extraRevenuePerAnimal - supplementCostPerAnimal;


                return (
                  <div className="mt-5 bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-[#2D5A27]/5 to-transparent border-b border-[#E9ECEF]">
                      <h3 className="text-sm font-bold text-[#333] flex items-center gap-2">
                        <DollarSign size={16} className="text-[#2D5A27]" /> Análise de Lucratividade ({lotData.periodo} dias)
                      </h3>
                      <p className="text-[10px] text-[#999] mt-1">Preço de venda: R$ {sellPrice.toFixed(2)}/kg vivo · {animals} animais</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E9ECEF]">
                      {/* Somente a Pasto */}
                      <div className="p-5">
                        <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Somente a Pasto
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Ganho de peso/cab</span>
                            <div className="text-base font-black text-[#333]">{weightGainPasture.toFixed(1)} kg</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Receita do lote</span>
                            <div className="text-base font-black text-amber-700">R$ {revenuePasture.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Custo suplemento</span>
                            <div className="text-base font-black text-[#333]">R$ 0</div>
                          </div>
                          <div className="pt-2 border-t border-[#F1F3F5]">
                            <span className="text-[10px] text-[#999] font-medium">Resultado</span>
                            <div className="text-lg font-black text-amber-700">R$ {profitPasture.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </div>
                        </div>
                      </div>

                      {/* Com Proteinado */}
                      <div className="p-5 bg-[#2D5A27]/[0.02]">
                        <div className="text-[9px] font-bold text-[#2D5A27] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#2D5A27]" />
                          Com Proteinado
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Ganho de peso/cab</span>
                            <div className="text-base font-black text-[#333]">{weightGainSupplement.toFixed(1)} kg</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Receita do lote</span>
                            <div className="text-base font-black text-[#2D5A27]">R$ {revenueSupplement.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#999] font-medium">Custo suplemento</span>
                            <div className="text-base font-black text-red-500">- R$ {supplementCostPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </div>
                          <div className="pt-2 border-t border-[#2D5A27]/10">
                            <span className="text-[10px] text-[#999] font-medium">Resultado</span>
                            <div className="text-lg font-black text-[#2D5A27]">R$ {profitSupplement.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom summary */}
                    <div className={`px-5 py-4 border-t border-[#E9ECEF] flex items-center justify-between ${profitDifference > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <div>
                        <div className={`text-sm font-black ${profitDifference > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {profitDifference > 0 ? '+' : ''}R$ {profitDifference.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {profitDifference > 0 ? 'de lucro extra' : 'de prejuízo'}
                        </div>
                        <p className="text-[10px] text-[#666] mt-0.5">
                          {profitDifference > 0 ? 'O proteinado se paga e gera retorno adicional' : 'O custo do suplemento supera a receita extra gerada'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-black ${netPerAnimal > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {netPerAnimal > 0 ? '+' : ''}R$ {netPerAnimal.toFixed(2)}/cab
                        </div>
                        <span className="text-[9px] text-[#999]">retorno líquido</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[#999] font-medium">
                <Snowflake size={12} className="text-blue-500" />
                <span>Inverno (Jun–Set): base ≈ 0 kg/dia</span>
                <span className="mx-1 hidden sm:inline">·</span>
                <Sun size={12} className="text-amber-500" />
                <span>Restante: ~0,45 kg/dia</span>
              </div>
            </div>

            {/* Cost Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-7 border border-[#E9ECEF] shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A] flex items-center gap-2 mb-6">
                  <Calculator className="text-[#2D5A27]" size={20} />
                  Composição do Custo
                </h2>

                <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44)}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 15, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#666', fontWeight: 700 }}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      }}
                      labelStyle={{ color: '#999', fontSize: 11, fontWeight: 700, marginBottom: 4 }}
                      formatter={(value, name) => [`R$ ${Number(value ?? 0).toFixed(2)}`, 'Custo/100kg']}
                    />
                    <Bar dataKey="custo" radius={[0, 8, 8, 0]} barSize={24}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Cost legend */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {chartData.map((item, index) => (
                    <span key={item.name} className="text-[10px] font-bold text-[#666] flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      {item.name}: {item.percent}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Alerts */}
            <div className="space-y-3">
              {!calculations.isUreiaSafe && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-red-600 text-sm mb-0.5">Atenção: Nível de Ureia Elevado</h4>
                    <p className="text-xs text-red-500 leading-relaxed">
                      A ureia representa <strong>{calculations.ureiaPercent.toFixed(1)}%</strong> da mistura ({calculations.ureiaQty}kg/100kg).
                      O limite recomendado é de <strong>15%</strong> para evitar toxicidade. Reduza a quantidade ou aumente outros ingredientes.
                    </p>
                  </div>
                </div>
              )}

              {!calculations.isFormulationValid && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-600 text-sm mb-0.5">
                      {calculations.totalQty < 100 ? "Formulação Incompleta" : "Formulação fora do padrão de 100kg"}
                    </h4>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      O total de ingredientes é de <strong>{calculations.totalQty.toFixed(1)}kg</strong>.{" "}
                      {calculations.totalQty < 100 ? (
                        "Ajuste as quantidades para totalizar exatamente 100kg para obter uma formulação padrão."
                      ) : (
                        "A fórmula excede os 100kg. Os valores de proteína, NDT e custos exibidos nos painéis foram normalizados automaticamente para a base proporcional correta."
                      )}
                    </p>
                  </div>
                </div>
              )}

              {calculations.isFormulationValid && calculations.isUreiaSafe && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-emerald-700 text-sm mb-0.5">Formulação Válida</h4>
                    <p className="text-xs text-emerald-600 leading-relaxed">
                      A mistura totaliza 100kg e todos os parâmetros de segurança estão dentro dos limites recomendados.
                      Proteína bruta: <strong>{calculations.totalProteina.toFixed(1)}%</strong> · NDT: <strong>{calculations.totalNdt.toFixed(1)}%</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

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
        title="Gado Gaúcho - Calculadora de Proteinado"
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
    </div>
  );
}
