'use client';

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  PlusCircle,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  Building2,
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Calculator,
  Wallet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

import {
  FinanciamentoInput,
  FinanciamentoResultado,
  calcularFinanciamento
} from '@/lib/financiamento-calculator';
import { FinanciamentoFormModal } from './FinanciamentoFormModal';
import { CronogramaAmortizacaoModal } from './CronogramaAmortizacaoModal';

interface FinanciamentosTabProps {
  financiamentos: FinanciamentoInput[];
  fazendas: any[];
  contas: any[];
  onAddFinanciamento: (financiamento: FinanciamentoInput) => Promise<void>;
  onDeleteFinanciamento: (id: string) => Promise<void>;
}

export const FinanciamentosTab: React.FC<FinanciamentosTabProps> = ({
  financiamentos = [],
  fazendas = [],
  contas = [],
  onAddFinanciamento,
  onDeleteFinanciamento,
}) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedResultado, setSelectedResultado] = useState<FinanciamentoResultado | null>(null);
  const [isCronogramaOpen, setIsCronogramaOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Calculate results for all contracts
  const resultados = useMemo(() => {
    return financiamentos.map(f => calcularFinanciamento(f));
  }, [financiamentos]);

  // Aggregate totals
  const totalSaldoDevedor = useMemo(() => {
    return financiamentos.reduce((acc, f) => acc + (f.valor_principal || 0), 0);
  }, [financiamentos]);

  const totalCustoCapitalMensal = useMemo(() => {
    return resultados.reduce((acc, r) => acc + r.custo_capital_mensal_medio, 0);
  }, [resultados]);

  const totalDesembolsoMensalMedio = useMemo(() => {
    return resultados.reduce((acc, r) => acc + r.prestacao_media_mensal, 0);
  }, [resultados]);

  const taxaMediaPonderadaAnual = useMemo(() => {
    if (totalSaldoDevedor <= 0) return 0;
    const somaPonderada = financiamentos.reduce((acc, f) => acc + (f.valor_principal * f.taxa_juros_anual), 0);
    return somaPonderada / totalSaldoDevedor;
  }, [financiamentos, totalSaldoDevedor]);

  const areaTotalFazendas = useMemo(() => {
    return fazendas.reduce((acc, f) => acc + (parseFloat(f.area_total || 0)), 0);
  }, [fazendas]);

  const custoPorHectare = areaTotalFazendas > 0 ? (totalCustoCapitalMensal / areaTotalFazendas) : 0;

  // Chart data: monthly interest breakdown
  const chartData = useMemo(() => {
    if (resultados.length === 0) return [];
    
    // Group monthly capital cost by month
    const monthMap: Record<string, number> = {};
    resultados.forEach(r => {
      r.cronograma.forEach(p => {
        const key = p.data_vencimento.substring(0, 7); // YYYY-MM
        if (!monthMap[key]) monthMap[key] = 0;
        monthMap[key] += p.juros;
      });
    });

    const sortedKeys = Object.keys(monthMap).sort();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return sortedKeys.slice(0, 18).map(key => {
      const [y, m] = key.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return {
        mes: `${monthNames[mIdx]}/${y.substring(2)}`,
        juros: Math.round(monthMap[key] * 100) / 100,
      };
    });
  }, [resultados]);

  const handleOpenCronograma = (res: FinanciamentoResultado) => {
    setSelectedResultado(res);
    setIsCronogramaOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este contrato de financiamento?')) {
      setDeletingId(id);
      try {
        await onDeleteFinanciamento(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#1E3D1A] via-[#2D5A27] to-[#1E3D1A] text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <Landmark size={240} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-amber-300 animate-spin" />
              Gestão de Passivos & Custo Financeiro
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Financiamentos & Custo de Capital
            </h1>
            <p className="text-sm text-emerald-100 max-w-2xl mt-1">
              Controle de empréstimos rurais, linhas de crédito, amortizações e cálculo mensalizado do custo de capital da propriedade.
            </p>
          </div>

          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-5 py-3 bg-white text-[#2D5A27] font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
          >
            <PlusCircle size={18} /> Novo Financiamento
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Custo de Capital Mensal Consolidado */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Custo Capital Mensal</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {formatCurrency(totalCustoCapitalMensal)}
            <span className="text-xs font-semibold text-[#888]">/mês</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-[#666]">
            <span>Juros médios + encargos</span>
          </div>
        </div>

        {/* Saldo Devedor Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Principal Tomado</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-[#2D5A27]">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
            {formatCurrency(totalSaldoDevedor)}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-700">
            {financiamentos.length} {financiamentos.length === 1 ? 'contrato ativo' : 'contratos ativos'}
          </div>
        </div>

        {/* Taxa Média Ponderada */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Taxa Média Ponderada</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Percent size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {taxaMediaPonderadaAnual.toFixed(2)}% <span className="text-xs font-normal text-[#666]">a.a.</span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-600">
            ~{((Math.pow(1 + taxaMediaPonderadaAnual / 100, 1 / 12) - 1) * 100).toFixed(2)}% ao mês equivalente
          </div>
        </div>

        {/* Custo por Hectare / Indicador Agro */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Custo Capital / ha</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Building2 size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
            {areaTotalFazendas > 0 ? `${formatCurrency(custoPorHectare)}/ha` : 'N/D'}
          </div>
          <div className="text-xs font-medium text-[#777] mt-2">
            {areaTotalFazendas > 0 ? `Considerando ${areaTotalFazendas} ha cadastrados` : 'Cadastre a área da fazenda'}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {resultados.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">Projeção de Juros Mensais (Custo de Capital)</h2>
              <p className="text-xs text-[#888]">Evolução do desembolso mensal com juros de financiamento ao longo do tempo</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#666' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#666' }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Juros no Mês']}
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Bar dataKey="juros" name="Custo de Juros (R$)" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Contratos de Financiamento Cadastrados</h2>
            <p className="text-xs text-[#888]">Gerencie as linhas de crédito e visualize a tabela de amortização</p>
          </div>
          <span className="px-3 py-1 bg-[#F8F9FA] border border-[#E9ECEF] text-[#555] rounded-full text-xs font-bold">
            {financiamentos.length} {financiamentos.length === 1 ? 'Contrato' : 'Contratos'}
          </span>
        </div>

        {resultados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#555] uppercase font-bold border-b border-[#E9ECEF]">
                <tr>
                  <th className="py-3.5 px-6">Contrato</th>
                  <th className="py-3.5 px-6">Propriedade</th>
                  <th className="py-3.5 px-6">Valor Principal</th>
                  <th className="py-3.5 px-6">Taxa (% a.a.)</th>
                  <th className="py-3.5 px-6">Periodicidade</th>
                  <th className="py-3.5 px-6">Custo Mensal (Juros)</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF] font-medium text-[#333]">
                {resultados.map((res) => {
                  const f = res.financiamento;
                  const fazenda = fazendas.find(fz => fz.id === f.fazenda_id);
                  const isDeleting = deletingId === f.id;

                  return (
                    <tr key={f.id || f.identificacao} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#1A1A1A] text-sm">{f.identificacao}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-bold">
                            {f.sistema_amortizacao}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-semibold">
                            {f.indexador || 'Pré-fixado'}
                          </span>
                          {f.carencia_meses > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[10px] font-medium">
                              Carência: {f.carencia_meses}m
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {fazenda ? (
                          <span className="font-semibold text-[#2D5A27] flex items-center gap-1">
                            <Building2 size={14} /> {fazenda.nome}
                          </span>
                        ) : (
                          <span className="text-[#888] font-normal">Todas / Geral</span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-extrabold text-[#1A1A1A] text-sm">
                        {formatCurrency(f.valor_principal)}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-bold text-blue-600">{f.taxa_juros_anual}% a.a.</span>
                        <div className="text-[10px] text-[#888]">{res.taxa_mensal_equivalente}% a.m. eq.</div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-[#555]">
                        {f.periodicidade}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-extrabold text-amber-600 text-sm">
                          {formatCurrency(res.custo_capital_mensal_medio)}
                        </span>
                        <span className="text-[10px] text-[#888] block">/mês de juros</span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenCronograma(res)}
                            className="px-3 py-1.5 bg-emerald-50 text-[#2D5A27] font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Ver Tabela de Amortização"
                          >
                            <Eye size={14} /> Cronograma
                          </button>
                          {f.id && (
                            <button
                              onClick={() => handleDelete(f.id!)}
                              disabled={isDeleting}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Remover Contrato"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-[#2D5A27] rounded-3xl flex items-center justify-center shadow-inner">
              <Landmark size={32} />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Nenhum financiamento cadastrado</h3>
              <p className="text-xs text-[#666] leading-relaxed">
                Cadastre seus financiamentos rurais, custeios ou empréstimos bancários para que o sistema calcule automaticamente o Custo de Capital Mensalizado da fazenda.
              </p>
            </div>
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer mt-2"
            >
              <PlusCircle size={16} /> Cadastrar Primeiro Financiamento
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <FinanciamentoFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={onAddFinanciamento}
        fazendas={fazendas}
        contas={contas}
      />

      {/* Schedule Modal */}
      <CronogramaAmortizacaoModal
        isOpen={isCronogramaOpen}
        onClose={() => setIsCronogramaOpen(false)}
        resultado={selectedResultado}
      />
    </div>
  );
};
