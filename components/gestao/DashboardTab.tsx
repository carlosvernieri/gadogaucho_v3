'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  FileText, 
  PlusCircle, 
  Upload, 
  ArrowUpRight, 
  ArrowDownRight,
  Boxes,
  PieChart as PieChartIcon
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface DashboardTabProps {
  summary: {
    totalReceita: number;
    totalDespesa: number;
    saldo: number;
    totalFazendas: number;
    totalLancamentos: number;
  };
  monthlyData: Array<{
    mes: string;
    receitas: number;
    despesas: number;
  }>;
  categoryBreakdown: Array<{
    categoria: string;
    valor: number;
    tipo: 'RECEITA' | 'DESPESA';
  }>;
  onOpenNewLancamento: () => void;
  onOpenXmlImport: () => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  summary,
  monthlyData,
  categoryBreakdown,
  onOpenNewLancamento,
  onOpenXmlImport,
  onSelectTab,
}) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-[#1A1A1A] space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-[#1E3D1A] to-[#2D5A27] text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <Building2 size={240} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Hub Financeiro & Contábil Rural
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gestão de Fazendas Gado Gaúcho
            </h1>
            <p className="text-sm text-emerald-100 max-w-2xl mt-1">
              Controle financeiro no regime de caixa, escrituração contábil simplificada e exportação pronta para o LCDPR da Receita Federal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewLancamento}
              className="px-4 py-2.5 bg-white text-[#2D5A27] font-bold text-xs sm:text-sm rounded-xl shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={18} /> Novo Lançamento
            </button>
            <button
              onClick={onOpenXmlImport}
              className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-emerald-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload size={18} /> Importar XML NF-e
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Cashflow */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Saldo Líquido</span>
            <div className={`p-2.5 rounded-xl ${summary.saldo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${summary.saldo >= 0 ? 'text-[#2D5A27]' : 'text-rose-600'}`}>
            {formatCurrency(summary.saldo)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-[#888]">
            <span>Regime de caixa consolidado</span>
          </div>
        </div>

        {/* Receita Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Receitas</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {formatCurrency(summary.totalReceita)}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2">
            <ArrowUpRight size={14} /> Entradas escrituradas
          </div>
        </div>

        {/* Despesa Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Despesas / Custos</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">
            {formatCurrency(summary.totalDespesa)}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-rose-500 mt-2">
            <ArrowDownRight size={14} /> Saídas computadas
          </div>
        </div>

        {/* Fazendas & LCDPR */}
        <div className="bg-[#FFF] p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Propriedades Rurais</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
            {summary.totalFazendas} {summary.totalFazendas === 1 ? 'Fazenda' : 'Fazendas'}
          </div>
          <button 
            onClick={() => onSelectTab('lcdpr')}
            className="flex items-center gap-1 text-xs font-semibold text-[#2D5A27] hover:underline mt-2 cursor-pointer"
          >
            <FileText size={14} /> Preparado para o LCDPR →
          </button>
        </div>
      </div>

      {/* Main Charts & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">Fluxo de Caixa Mensal</h2>
              <p className="text-xs text-[#888]">Evolução de Entradas e Saídas na Atividade Rural</p>
            </div>
            <button 
              onClick={() => onSelectTab('lancamentos')}
              className="text-xs font-bold text-[#2D5A27] hover:underline cursor-pointer"
            >
              Ver Lançamentos →
            </button>
          </div>

          <div className="h-72 w-full">
            {isMounted ? (
              monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#666' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#666' }} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                    <Bar dataKey="receitas" name="Receitas (Entradas)" fill="#2D5A27" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas (Saídas)" fill="#E63946" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[#F8F9FA] rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#E9ECEF]">
                  <p className="text-xs font-bold text-[#555]">Nenhum lançamento registrado</p>
                  <p className="text-[11px] text-[#888] mt-1 max-w-xs">Adicione lançamentos ou importe arquivos XML de NF-e para visualizar o fluxo de caixa mensal real.</p>
                </div>
              )
            ) : (
              <div className="w-full h-full bg-[#F8F9FA] rounded-xl animate-pulse flex items-center justify-center text-xs text-[#999]">
                Carregando gráfico de fluxo de caixa...
              </div>
            )}
          </div>
        </div>

        {/* Categorias / Detalhamento */}
        <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={20} className="text-[#2D5A27]" />
              <h2 className="text-lg font-bold text-[#1A1A1A]">Distribuição Fiscal</h2>
            </div>
            <p className="text-xs text-[#888] mb-4">Classificação por grupos de despesas/receitas</p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.tipo === 'RECEITA' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-xs font-semibold text-[#333] truncate">{cat.categoria}</span>
                  </div>
                  <span className={`text-xs font-bold ${cat.tipo === 'RECEITA' ? 'text-emerald-700' : 'text-[#333]'}`}>
                    {formatCurrency(cat.valor)}
                  </span>
                </div>
              ))}

              {categoryBreakdown.length === 0 && (
                <p className="text-xs text-[#999] text-center py-6">
                  Nenhum lançamento categorizado até o momento.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E9ECEF] flex items-center justify-between text-xs">
            <span className="text-[#666]">Almoxarifado Integrado:</span>
            <button 
              onClick={() => onSelectTab('almoxarifado')} 
              className="font-bold text-[#2D5A27] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Boxes size={14} /> Ver Insumos →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
