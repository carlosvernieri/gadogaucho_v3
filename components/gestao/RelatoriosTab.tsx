'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Boxes, 
  Printer, 
  Download, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  Building2, 
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { 
  FinanciamentoInput, 
  calcularFinanciamento 
} from '@/lib/financiamento-calculator';

interface Lancamento {
  id: string;
  data_pagamento: string;
  tipo_movimentacao?: 'RECEITA' | 'DESPESA';
  tipo_movimento?: 'RECEITA' | 'DESPESA';
  classificacao: string;
  valor: number;
  observacoes?: string;
  fazenda_id?: string;
}

interface Fazenda {
  id: string;
  nome: string;
  area_total: number;
}

interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo_movimentacao: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  data_movimentacao?: string;
  observacoes?: string;
}

interface ProdutoInsumo {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  custo_medio: number;
  movimentacoes?: MovimentacaoEstoque[];
}

interface RelatoriosTabProps {
  lancamentos: Lancamento[];
  fazendas: Fazenda[];
  produtos: ProdutoInsumo[];
  financiamentos?: FinanciamentoInput[];
}

const COLORS = ['#2D5A27', '#E63946', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#64748B'];

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({
  lancamentos,
  fazendas,
  produtos,
  financiamentos = [],
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
  };

  // Extract available months from lancamentos and stock movements
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    lancamentos.forEach(l => {
      if (l.data_pagamento) {
        monthsSet.add(l.data_pagamento.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [lancamentos]);

  // Filtered Lancamentos
  const filteredLancamentos = useMemo(() => {
    if (selectedMonth === 'TODOS') return lancamentos;
    return lancamentos.filter(l => l.data_pagamento && l.data_pagamento.startsWith(selectedMonth));
  }, [lancamentos, selectedMonth]);

  // Total Area (Hectares)
  const totalAreaHectares = useMemo(() => {
    return fazendas.reduce((acc, f) => acc + (parseFloat(f.area_total as any) || 0), 0);
  }, [fazendas]);

  // Financial totals
  const totalReceitas = useMemo(() => {
    return filteredLancamentos
      .filter(l => (l.tipo_movimentacao || l.tipo_movimento) === 'RECEITA')
      .reduce((acc, l) => acc + (parseFloat(l.valor as any) || 0), 0);
  }, [filteredLancamentos]);

  const despesasOperacionais = useMemo(() => {
    return filteredLancamentos
      .filter(l => (l.tipo_movimentacao || l.tipo_movimento) === 'DESPESA')
      .reduce((acc, l) => acc + (parseFloat(l.valor as any) || 0), 0);
  }, [filteredLancamentos]);

  // Custo de Capital (Juros de Financiamentos) do período
  const custoCapitalPeriodo = useMemo(() => {
    if (!financiamentos || financiamentos.length === 0) return 0;

    return financiamentos.reduce((acc, f) => {
      const res = calcularFinanciamento(f);
      if (selectedMonth === 'TODOS') {
        // Custo mensal médio acumulado
        return acc + res.custo_capital_mensal_medio;
      } else {
        // Busca juros específicos do mês selecionado (YYYY-MM)
        const parcelaMes = res.cronograma.find(p => p.data_vencimento.startsWith(selectedMonth));
        if (parcelaMes) {
          return acc + parcelaMes.juros;
        } else {
          return acc + res.custo_capital_mensal_medio;
        }
      }
    }, 0);
  }, [financiamentos, selectedMonth]);

  const totalDespesas = despesasOperacionais + custoCapitalPeriodo;
  const resultadoLiquido = totalReceitas - totalDespesas;

  // Return Rates & Profitability Indicators
  const margemBruta = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
  const roi = totalDespesas > 0 ? (resultadoLiquido / totalDespesas) * 100 : 0;
  const resultadoPorHectare = totalAreaHectares > 0 ? resultadoLiquido / totalAreaHectares : 0;
  const custoPorHectare = totalAreaHectares > 0 ? totalDespesas / totalAreaHectares : 0;
  const receitaPorHectare = totalAreaHectares > 0 ? totalReceitas / totalAreaHectares : 0;

  // Costs by Category (Purchases / Expenses + Custo de Capital)
  const despesasPorCategoria = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredLancamentos
      .filter(l => (l.tipo_movimentacao || l.tipo_movimento) === 'DESPESA')
      .forEach(l => {
        const cat = l.classificacao || 'Outras Despesas';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(l.valor as any) || 0);
      });

    if (custoCapitalPeriodo > 0) {
      catMap['Custo de Capital (Financiamentos)'] = (catMap['Custo de Capital (Financiamentos)'] || 0) + custoCapitalPeriodo;
    }

    return Object.keys(catMap).map(cat => ({
      categoria: cat,
      valor: catMap[cat],
      percentual: totalDespesas > 0 ? (catMap[cat] / totalDespesas) * 100 : 0,
    })).sort((a, b) => b.valor - a.valor);
  }, [filteredLancamentos, custoCapitalPeriodo, totalDespesas]);

  // Stock Outflows / Baixas
  const baixasEstoque = useMemo(() => {
    const baixas: Array<{
      produtoNome: string;
      categoria: string;
      quantidade: number;
      unidade: string;
      custoMedio: number;
      valorTotal: number;
      data: string;
      motivo: string;
    }> = [];

    produtos.forEach(p => {
      if (p.movimentacoes && Array.isArray(p.movimentacoes)) {
        p.movimentacoes.forEach(m => {
          if (m.tipo_movimentacao === 'SAIDA') {
            const mData = m.data_movimentacao ? m.data_movimentacao.substring(0, 10) : '';
            if (selectedMonth === 'TODOS' || (mData && mData.startsWith(selectedMonth))) {
              const valorEstimado = (m.quantidade || 0) * (p.custo_medio || 0);
              baixas.push({
                produtoNome: p.nome,
                categoria: p.categoria || 'Geral',
                quantidade: m.quantidade,
                unidade: p.unidade || 'UN',
                custoMedio: p.custo_medio || 0,
                valorTotal: valorEstimado,
                data: mData || 'Recente',
                motivo: m.observacoes || 'Consumo/Baixa',
              });
            }
          }
        });
      }
    });

    return baixas;
  }, [produtos, selectedMonth]);

  const totalValorBaixas = baixasEstoque.reduce((acc, b) => acc + b.valorTotal, 0);

  // Baixas por Categoria de Insumo
  const baixasPorCategoria = useMemo(() => {
    const catMap: Record<string, { quantidade: number; valorTotal: number }> = {};
    baixasEstoque.forEach(b => {
      const cat = b.categoria;
      if (!catMap[cat]) {
        catMap[cat] = { quantidade: 0, valorTotal: 0 };
      }
      catMap[cat].quantidade += b.quantidade;
      catMap[cat].valorTotal += b.valorTotal;
    });

    return Object.keys(catMap).map(cat => ({
      categoria: cat,
      quantidade: catMap[cat].quantidade,
      valorTotal: catMap[cat].valorTotal,
    })).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [baixasEstoque]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Relatorio Mensal de Gestao Rural - Gado Gaucho\n";
    csvContent += `Periodo: ${selectedMonth}\n\n`;
    
    csvContent += "--- RESULTADOS FINANCEIROS & RENTABILIDADE ---\n";
    csvContent += `Receita Total,R$ ${totalReceitas.toFixed(2)}\n`;
    csvContent += `Despesa Total,R$ ${totalDespesas.toFixed(2)}\n`;
    csvContent += `Resultado Liquido,R$ ${resultadoLiquido.toFixed(2)}\n`;
    csvContent += `Margem Bruta (%),${margemBruta.toFixed(2)}%\n`;
    csvContent += `Taxa de Retorno (ROI %),${roi.toFixed(2)}%\n`;
    csvContent += `Area Total (ha),${totalAreaHectares.toFixed(2)} ha\n`;
    csvContent += `Lucro por Hectare (R$/ha),R$ ${resultadoPorHectare.toFixed(2)}\n`;
    csvContent += `Custo por Hectare (R$/ha),R$ ${custoPorHectare.toFixed(2)}\n\n`;

    csvContent += "--- CUSTOS COM COMPRAS POR CATEGORIA ---\n";
    csvContent += "Categoria,Valor (R$),Percentual (%)\n";
    despesasPorCategoria.forEach(c => {
      csvContent += `"${c.categoria}",${c.valor.toFixed(2)},${c.percentual.toFixed(2)}%\n`;
    });

    csvContent += "\n--- BAIXAS DE ESTOQUE (ALMOXARIFADO) ---\n";
    csvContent += "Insumo,Categoria,Quantidade,Unidade,Custo Medio (R$),Valor Total (R$),Motivo/Data\n";
    baixasEstoque.forEach(b => {
      csvContent += `"${b.produtoNome}","${b.categoria}",${b.quantidade},"${b.unidade}",${b.custoMedio.toFixed(2)},${b.valorTotal.toFixed(2)},"${b.motivo} - ${b.data}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_gerencial_gado_gaucho_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1A1A1A]">Relatórios & Análise de Rentabilidade Operacional</h2>
            <span className="bg-emerald-100 text-[#2D5A27] text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> DRE & ROI
            </span>
          </div>
          <p className="text-xs text-[#888]">Detalhamento de baixas de insumos, custos de compras categorizados e indicadores de retorno financeiro</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <div className="flex items-center gap-2 bg-[#F8F9FA] px-3 py-1.5 rounded-xl border border-[#E9ECEF]">
            <Calendar size={16} className="text-[#2D5A27]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#333] outline-none cursor-pointer"
            >
              <option value="TODOS">Consolidado Total (Todos os Meses)</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 text-[#2D5A27] hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Exportar CSV"
          >
            <Download size={15} /> CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#2D5A27] text-white hover:bg-[#1E3D1A] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Imprimir / Salvar PDF"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* SECTION 1: INDICADORES DE RENTABILIDADE E TAXAS DE RETORNO (ROI) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-4">
          <div className="flex items-center gap-2 text-[#2D5A27]">
            <BarChart3 size={22} />
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">Resultados Financeiros & Indicadores de Rentabilidade</h3>
          </div>
          <span className="text-xs font-semibold text-[#888]">Área Total: <strong className="text-[#1A1A1A]">{totalAreaHectares} ha</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Margem Bruta */}
          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] space-y-1">
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Margem Bruta Operacional</span>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${margemBruta >= 15 ? 'text-emerald-700' : margemBruta >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatPercent(margemBruta)}
              </span>
              <Percent size={20} className="text-emerald-600 opacity-60" />
            </div>
            <p className="text-[10px] text-[#666]">
              {margemBruta >= 15 ? 'Desempenho excelente' : margemBruta >= 0 ? 'Desempenho positivo' : 'Operação no vermelho'}
            </p>
          </div>

          {/* Taxa de Retorno (ROI) */}
          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] space-y-1">
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Taxa de Retorno (ROI)</span>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${roi >= 10 ? 'text-emerald-700' : roi >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatPercent(roi)}
              </span>
              <TrendingUp size={20} className="text-[#2D5A27] opacity-60" />
            </div>
            <p className="text-[10px] text-[#666]">Retorno sobre capital investido</p>
          </div>

          {/* Resultado por Hectare */}
          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] space-y-1">
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Lucro por Hectare (R$/ha)</span>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-black ${resultadoPorHectare >= 0 ? 'text-[#2D5A27]' : 'text-rose-600'}`}>
                {formatCurrency(resultadoPorHectare)}/ha
              </span>
              <Building2 size={20} className="text-blue-600 opacity-60" />
            </div>
            <p className="text-[10px] text-[#666]">Rentabilidade por área física</p>
          </div>

          {/* Custo Operacional por Hectare */}
          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] space-y-1">
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider block">Custo Operacional (R$/ha)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-rose-600">
                {formatCurrency(custoPorHectare)}/ha
              </span>
              <ArrowDownRight size={20} className="text-rose-500 opacity-60" />
            </div>
            <p className="text-[10px] text-[#666]">Gasto médio por hectare</p>
          </div>
        </div>

        {/* Financial Summary Card (DRE Breakdown) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Receita Operacional</span>
              <span className="text-base font-black text-emerald-700">{formatCurrency(totalReceitas)}</span>
            </div>
            <ArrowUpRight size={22} className="text-emerald-600" />
          </div>

          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Despesas Operacionais</span>
              <span className="text-base font-black text-rose-700">{formatCurrency(despesasOperacionais)}</span>
            </div>
            <ArrowDownRight size={22} className="text-rose-600" />
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-900 uppercase block">Custo de Capital (Juros)</span>
              <span className="text-base font-black text-amber-700">{formatCurrency(custoCapitalPeriodo)}</span>
            </div>
            <Percent size={20} className="text-amber-600" />
          </div>

          <div className={`p-4 rounded-xl border flex items-center justify-between ${resultadoLiquido >= 0 ? 'bg-emerald-100/50 border-emerald-200' : 'bg-rose-100/50 border-rose-200'}`}>
            <div>
              <span className="text-[10px] font-bold text-[#1A1A1A] uppercase block">Resultado Líquido DRE</span>
              <span className={`text-base font-black ${resultadoLiquido >= 0 ? 'text-[#2D5A27]' : 'text-rose-700'}`}>
                {formatCurrency(resultadoLiquido)}
              </span>
            </div>
            <DollarSign size={22} className={resultadoLiquido >= 0 ? 'text-[#2D5A27]' : 'text-rose-700'} />
          </div>
        </div>
      </div>

      {/* SECTION 2: CUSTOS COM COMPRAS SEPARADOS POR CATEGORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E9ECEF] pb-3 text-[#1A1A1A]">
            <PieChartIcon size={20} className="text-[#2D5A27]" />
            <h3 className="text-base font-extrabold">Custos de Compras & Despesas por Categoria</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#666] font-bold border-b border-[#E9ECEF]">
                <tr>
                  <th className="p-2.5">Categoria / Grupo</th>
                  <th className="p-2.5 text-right">Valor Total (R$)</th>
                  <th className="p-2.5 text-right">% do Custo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {despesasPorCategoria.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="p-2.5 font-bold text-[#333] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {c.categoria}
                    </td>
                    <td className="p-2.5 text-right font-black text-[#1A1A1A]">{formatCurrency(c.valor)}</td>
                    <td className="p-2.5 text-right font-bold text-[#666]">{formatPercent(c.percentual)}</td>
                  </tr>
                ))}

                {despesasPorCategoria.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-[#999]">Nenhum custo ou compra registrado neste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart pie/bar */}
        <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#E9ECEF] pb-3 text-[#1A1A1A]">
            <PieChartIcon size={20} className="text-[#2D5A27]" />
            <h3 className="text-base font-extrabold">Distribuição Visual dos Custos</h3>
          </div>

          <div className="h-64 w-full my-auto">
            {isMounted && despesasPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    dataKey="valor"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {despesasPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Custo']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-[#F8F9FA] rounded-xl flex items-center justify-center text-xs text-[#999]">
                Sem dados de gráfico para exibição
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: RELATÓRIO MENSAL DE BAIXAS DE ESTOQUE (ALMOXARIFADO) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E9ECEF] pb-3 gap-2">
          <div className="flex items-center gap-2 text-[#2D5A27]">
            <Boxes size={22} />
            <div>
              <h3 className="text-lg font-extrabold text-[#1A1A1A]">Relatório Mensal de Baixas do Estoque</h3>
              <p className="text-xs text-[#888]">Consumo de insumos, nutrição, vacinas e produtos no período</p>
            </div>
          </div>

          <div className="text-right bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">Custo Estimado das Baixas</span>
            <span className="text-base font-black text-rose-700">{formatCurrency(totalValorBaixas)}</span>
          </div>
        </div>

        {/* Baixas por Categoria em Destaque */}
        {baixasPorCategoria.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            {baixasPorCategoria.map((bc, idx) => (
              <div key={idx} className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] text-xs space-y-1">
                <span className="text-[10px] font-bold text-[#888] block truncate">{bc.categoria}</span>
                <span className="text-sm font-extrabold text-[#1A1A1A] block">{formatCurrency(bc.valorTotal)}</span>
                <span className="text-[10px] text-[#666] block">Qtd: {bc.quantidade}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabela de Lançamentos de Baixas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#666] font-bold border-b border-[#E9ECEF]">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Insumo / Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Qtd. Baixada</th>
                <th className="p-3 text-right">Custo Médio</th>
                <th className="p-3 text-right">Custo Total (R$)</th>
                <th className="p-3">Motivo / Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF]">
              {baixasEstoque.map((b, idx) => (
                <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3 font-semibold text-[#666]">{b.data}</td>
                  <td className="p-3 font-bold text-[#1A1A1A]">{b.produtoNome}</td>
                  <td className="p-3 text-[#666]">{b.categoria}</td>
                  <td className="p-3 text-right font-black text-rose-600">{b.quantidade} {b.unidade}</td>
                  <td className="p-3 text-right text-[#666]">{formatCurrency(b.custoMedio)}</td>
                  <td className="p-3 text-right font-black text-[#1A1A1A]">{formatCurrency(b.valorTotal)}</td>
                  <td className="p-3 text-[#666] truncate max-w-xs">{b.motivo}</td>
                </tr>
              ))}

              {baixasEstoque.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#999]">
                    <Boxes size={32} className="mx-auto mb-2 opacity-40 text-rose-500" />
                    Nenhuma baixa de estoque registrada neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
