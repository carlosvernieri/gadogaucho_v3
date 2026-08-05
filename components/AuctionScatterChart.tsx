'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Filter,
  Calendar,
  DollarSign,
  Scale,
  Layers,
  RefreshCw,
  Info,
  ChevronDown
} from 'lucide-react';
import { Spinner } from '@/components/Spinner';

export const CATEGORY_COLORS: Record<string, string> = {
  'Terneiro': '#2563eb',       // Blue
  'Terneira': '#db2777',       // Pink/Magenta
  'Novilho': '#7c3aed',        // Purple
  'Novilha': '#ea580c',        // Orange
  'Vaca': '#059669',          // Emerald Green
  'Vaca com Cria': '#10b981',   // Mint Green
  'Vaca Prenha': '#0d9488',    // Teal
  'Boi Gordo': '#dc2626',      // Red
  'Touro': '#9333ea',          // Deep Purple
  'Vaquilhona': '#0284c7',      // Sky Blue
  'Outros': '#6b7280'          // Gray
};

const FALLBACK_COLORS = [
  '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#059669',
  '#10b981', '#0d9488', '#dc2626', '#9333ea', '#0284c7',
  '#f59e0b', '#84cc16', '#06b6d4', '#6366f1', '#a855f7'
];

export function getCategoryColor(categoryName: string, index: number = 0): string {
  if (!categoryName) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  
  // Direct match
  if (CATEGORY_COLORS[categoryName]) {
    return CATEGORY_COLORS[categoryName];
  }
  
  // Soft match (case-insensitive or partial)
  const norm = categoryName.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (key.toLowerCase() === norm || norm.includes(key.toLowerCase())) {
      return val;
    }
  }

  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface OfferData {
  id: number;
  auction_id: number;
  category: string;
  breed?: string;
  price_kg: number;
  price?: number;
  avg_weight: number;
  batch_size: number;
  seller_name?: string;
  seller_city?: string;
  auction?: any;
}

export function AuctionScatterChart() {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | '90d' | 'all'>('14d');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlaza, setSelectedPlaza] = useState<string>('all');

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auction-offers?includeAuction=true');
      if (res.ok) {
        const data = await res.json();
        setOffers(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch auction offers:', res.status, await res.text());
        setOffers([]);
      }
    } catch (error) {
      console.error('Error fetching auction offers for scatter plot:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Filter offers based on dateRange, categories, plaza
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      // 1. Weight and Price/kg check
      const weight = Number(o.avg_weight);
      const priceKg = Number(o.price_kg);
      if (isNaN(weight) || weight <= 0 || isNaN(priceKg) || priceKg <= 0) {
        return false;
      }

      const rawAuction = Array.isArray(o.auction) ? o.auction[0] : o.auction;
      const rawPlaza = Array.isArray(rawAuction?.plaza) ? rawAuction?.plaza[0] : rawAuction?.plaza;

      // 2. Date Filter (using start of day cutoff for full calendar day coverage)
      if (dateRange !== 'all' && rawAuction?.auction_date) {
        const dateStr = String(rawAuction.auction_date).replace(' ', 'T');
        const auctionTime = new Date(dateStr).getTime();

        if (!isNaN(auctionTime)) {
          const limitDays = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - limitDays);
          cutoff.setHours(0, 0, 0, 0);

          if (auctionTime < cutoff.getTime()) {
            return false;
          }
        }
      }

      // 3. Category filter (flexible soft match for singular/plural/case)
      if (selectedCategories.length > 0) {
        const offerCat = (o.category || '').trim().toLowerCase();
        const matches = selectedCategories.some(cat => {
          const selCat = cat.trim().toLowerCase();
          return offerCat === selCat || offerCat.includes(selCat) || selCat.includes(offerCat);
        });
        if (!matches) return false;
      }

      // 4. Plaza filter
      if (selectedPlaza !== 'all') {
        const plazaName = rawPlaza?.name || '';
        if (plazaName.toLowerCase() !== selectedPlaza.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [offers, dateRange, selectedCategories, selectedPlaza]);

  // Extract list of all unique categories available in raw data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    offers.forEach(o => {
      if (o.category) cats.add(o.category.trim());
    });
    return Array.from(cats).sort();
  }, [offers]);

  // Extract list of all unique plazas available in raw data
  const availablePlazas = useMemo(() => {
    const plazas = new Set<string>();
    offers.forEach(o => {
      const rawAuction = Array.isArray(o.auction) ? o.auction[0] : o.auction;
      const rawPlaza = Array.isArray(rawAuction?.plaza) ? rawAuction?.plaza[0] : rawAuction?.plaza;
      const name = rawPlaza?.name;
      if (name) plazas.add(name);
    });
    return Array.from(plazas).sort();
  }, [offers]);

  // Group filtered data by Category for rendering separate Scatter series in Recharts
  const groupedData = useMemo(() => {
    const map: Record<string, OfferData[]> = {};
    filteredOffers.forEach(item => {
      const cat = item.category || 'Outros';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [filteredOffers]);

  // Calculate summary metrics
  const stats = useMemo(() => {
    if (filteredOffers.length === 0) {
      return { totalOffers: 0, avgWeight: 0, avgPriceKg: 0, totalAnimals: 0 };
    }
    const totalOffers = filteredOffers.length;
    const sumWeight = filteredOffers.reduce((acc, curr) => acc + (curr.avg_weight || 0), 0);
    const sumPriceKg = filteredOffers.reduce((acc, curr) => acc + (curr.price_kg || 0), 0);
    const totalAnimals = filteredOffers.reduce((acc, curr) => acc + (curr.batch_size || 1), 0);

    return {
      totalOffers,
      avgWeight: (sumWeight / totalOffers).toFixed(1),
      avgPriceKg: (sumPriceKg / totalOffers).toFixed(2),
      totalAnimals
    };
  }, [filteredOffers]);

  const toggleCategoryFilter = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: OfferData = payload[0].payload;
      const color = getCategoryColor(data.category);
      const rawAuction = Array.isArray(data.auction) ? data.auction[0] : data.auction;
      const rawPlaza = Array.isArray(rawAuction?.plaza) ? rawAuction?.plaza[0] : rawAuction?.plaza;

      const auctionDateStr = rawAuction?.auction_date
        ? new Date(String(rawAuction.auction_date).replace(' ', 'T')).toLocaleDateString('pt-BR')
        : 'Desconhecida';
      const plazaName = rawPlaza?.name || 'Não informada';

      return (
        <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-xl text-xs space-y-2 max-w-xs z-50">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F8F9FA]">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="font-bold text-[#333] text-sm">{data.category}</span>
            {data.breed && (
              <span className="text-[10px] bg-gray-100 text-[#666] px-2 py-0.5 rounded-full font-medium">
                {data.breed}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[#666]">
            <div>
              <span className="text-[10px] text-[#999] block uppercase font-bold">Peso Médio</span>
              <span className="font-bold text-[#333] text-sm">{data.avg_weight} kg</span>
            </div>
            <div>
              <span className="text-[10px] text-[#999] block uppercase font-bold">Preço / kg</span>
              <span className="font-bold text-[#2D5A27] text-sm">R$ {data.price_kg.toFixed(2)}/kg</span>
            </div>
            <div>
              <span className="text-[10px] text-[#999] block uppercase font-bold">Tamanho Lote</span>
              <span className="font-semibold text-[#333]">{data.batch_size} cabeças</span>
            </div>
            <div>
              <span className="text-[10px] text-[#999] block uppercase font-bold">Preço Estimado</span>
              <span className="font-semibold text-[#333]">
                {data.price ? `R$ ${data.price.toLocaleString('pt-BR')}` : `R$ ${(data.avg_weight * data.price_kg).toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F8F9FA] text-[11px] text-[#888] space-y-0.5">
            <div className="truncate"><strong>Leilão:</strong> {plazaName}</div>
            <div><strong>Data:</strong> {auctionDateStr}</div>
            {data.seller_name && <div className="truncate"><strong>Vendedor:</strong> {data.seller_name}</div>}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-[#666]">Carregando ofertas dos leilões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filters Bar */}
      <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-xl font-bold text-[#333]">Gráfico de Dispersão (Preço x Peso)</h3>
            </div>
            <p className="text-xs text-[#666] mt-1 ml-10">
              Análise visual de correlação entre peso médio (kg) e valor por quilo (R$/kg) nas ofertas dos leilões.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#E9ECEF]">
              <button
                onClick={() => setDateRange('7d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === '7d' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#333]'
                }`}
              >
                Última Semana
              </button>
              <button
                onClick={() => setDateRange('14d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === '14d' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#333]'
                }`}
              >
                14 Dias
              </button>
              <button
                onClick={() => setDateRange('30d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === '30d' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#333]'
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === 'all' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#333]'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Plaza Selector */}
            {availablePlazas.length > 0 && (
              <select
                value={selectedPlaza}
                onChange={e => setSelectedPlaza(e.target.value)}
                className="bg-[#F8F9FA] border border-[#E9ECEF] text-xs font-bold text-[#333] px-3 py-2 rounded-xl outline-none focus:border-[#2D5A27] cursor-pointer"
              >
                <option value="all">Todas as Praças</option>
                {availablePlazas.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <button
              onClick={fetchOffers}
              className="p-2 text-[#666] hover:text-[#2D5A27] hover:bg-[#F8F9FA] rounded-xl transition-all border border-[#E9ECEF]"
              title="Atualizar dados"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        {availableCategories.length > 0 && (
          <div className="pt-4 border-t border-[#F8F9FA]">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={14} className="text-[#999]" />
              <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">
                Categorias Animais (Cliquem para filtrar)
              </span>
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-[10px] text-[#2D5A27] font-bold underline ml-2 cursor-pointer"
                >
                  Limpar Filtro ({selectedCategories.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat, idx) => {
                const color = getCategoryColor(cat, idx);
                const isSelected = selectedCategories.length === 0 || selectedCategories.includes(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#E9ECEF] text-[#333] shadow-sm hover:border-[#2D5A27]'
                        : 'bg-gray-50 border-gray-100 text-gray-400 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isSelected ? color : '#ccc' }}
                    />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-2 text-[#999] mb-1">
            <Layers size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Ofertas</span>
          </div>
          <p className="text-xl font-bold text-[#333]">{stats.totalOffers} <span className="text-xs font-normal text-[#666]">lotes</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-2 text-[#999] mb-1">
            <DollarSign size={16} className="text-[#2D5A27]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Preço Médio / kg</span>
          </div>
          <p className="text-xl font-bold text-[#2D5A27]">
            {Number(stats.avgPriceKg) > 0 ? `R$ ${stats.avgPriceKg}` : '---'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-2 text-[#999] mb-1">
            <Scale size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Peso Médio Geral</span>
          </div>
          <p className="text-xl font-bold text-[#333]">
            {Number(stats.avgWeight) > 0 ? `${stats.avgWeight} kg` : '---'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-2 text-[#999] mb-1">
            <Calendar size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Cabeças</span>
          </div>
          <p className="text-xl font-bold text-[#333]">{stats.totalAnimals} <span className="text-xs font-normal text-[#666]">animais</span></p>
        </div>
      </div>

      {/* Main Scatter Chart Container */}
      <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm">
        {filteredOffers.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <Info size={48} className="mx-auto text-[#999] opacity-30" />
            <div className="max-w-md mx-auto">
              <h4 className="text-lg font-bold text-[#333]">Nenhuma oferta encontrada para este período</h4>
              <p className="text-xs text-[#666] mt-1">
                {dateRange === '7d'
                  ? 'Não há cadastros de ofertas nos leilões dos últimos 7 dias. Experimente selecionar um período maior abaixo para visualizar as ofertas recentes.'
                  : 'Nenhuma oferta atende aos filtros de categoria ou praça selecionados.'}
              </p>
            </div>
            {dateRange === '7d' && (
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setDateRange('14d')}
                  className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#1E3D1A] transition-all cursor-pointer"
                >
                  Ver últimos 14 dias
                </button>
                <button
                  onClick={() => setDateRange('all')}
                  className="px-4 py-2 bg-[#F8F9FA] text-[#666] text-xs font-bold rounded-xl hover:bg-[#E9ECEF] transition-all cursor-pointer border border-[#E9ECEF]"
                >
                  Ver todas as ofertas
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical stroke="#F1F5F9" horizontal />
                  
                  <XAxis
                    type="number"
                    dataKey="avg_weight"
                    name="Peso"
                    unit=" kg"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: 'Peso Médio (kg)',
                      position: 'insideBottom',
                      offset: -25,
                      fill: '#475569',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  
                  <YAxis
                    type="number"
                    dataKey="price_kg"
                    name="Preço"
                    unit=" R$/kg"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `R$ ${val.toFixed(2)}`}
                    label={{
                      value: 'Preço por kg (R$/kg)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      fill: '#475569',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '15px', fontSize: '12px', fontWeight: 'bold' }}
                  />

                  {Object.keys(groupedData).map((catName, idx) => {
                    const color = getCategoryColor(catName, idx);
                    return (
                      <Scatter
                        key={catName}
                        name={catName}
                        data={groupedData[catName]}
                        fill={color}
                        shape="circle"
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-[#F8F9FA] flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#999]">
              <span>💡 Dica: Passe o mouse ou toque nos pontos do gráfico para ver detalhes completos de cada lote.</span>
              <span>Visualizando {filteredOffers.length} ofertas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
