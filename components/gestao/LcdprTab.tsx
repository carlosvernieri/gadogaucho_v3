'use client';

import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2, Building2, Calendar, UserCheck, AlertCircle } from 'lucide-react';

interface Fazenda {
  id: string;
  nome: string;
  nirf_cafir: string;
}

interface Lancamento {
  id: string;
  fazenda_id: string;
  data_pagamento: string;
  tipo_movimento: 'RECEITA' | 'DESPESA';
  classificacao: string;
  valor: number;
  numero_documento: string;
  observacoes?: string;
  fazendas?: { nome: string; nirf_cafir: string };
  contas_bancarias?: { banco_nome: string; conta_numero: string };
  participantes?: { nome: string; cpf_cnpj: string };
}

interface LcdprTabProps {
  lancamentos: Lancamento[];
  fazendas: Fazenda[];
  userCpf?: string;
}

export const LcdprTab: React.FC<LcdprTabProps> = ({
  lancamentos,
  fazendas,
  userCpf = '000.000.000-00',
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedFazenda, setSelectedFazenda] = useState('');
  const [cpfProdutor, setCpfProdutor] = useState(userCpf);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filter lancamentos by year and fazenda
  const lcdprLancamentos = lancamentos.filter(item => {
    const yearMatch = item.data_pagamento.startsWith(selectedYear);
    const fazendaMatch = !selectedFazenda || item.fazenda_id === selectedFazenda;
    return yearMatch && fazendaMatch;
  });

  // Calculate totals
  const totalReceitas = lcdprLancamentos
    .filter(i => i.tipo_movimento === 'RECEITA')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const totalDespesas = lcdprLancamentos
    .filter(i => i.tipo_movimento === 'DESPESA')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const resultadoLiquido = totalReceitas - totalDespesas;

  // Running balance calculation
  let runningSaldo = 0;
  const tableDataWithRunningBalance = [...lcdprLancamentos]
    .sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime())
    .map((item) => {
      if (item.tipo_movimento === 'RECEITA') {
        runningSaldo += item.valor;
      } else {
        runningSaldo -= item.valor;
      }
      return {
        ...item,
        saldoAcumulado: runningSaldo,
      };
    });

  const handleExportLcdprFile = () => {
    if (lcdprLancamentos.length === 0) {
      alert('Nenhum lançamento encontrado para o período selecionado.');
      return;
    }

    // Generate RFB LCDPR Standard Layout string (.txt/.csv format)
    let fileContent = `0000|LCDPR|1.3|${cpfProdutor}|LIVRO CAIXA DIGITAL PRODUTOR RURAL GADO GAUCHO|${selectedYear}0101|${selectedYear}1231|\n`;
    
    // Header Fazendas
    fazendas.forEach(f => {
      fileContent += `0040|001|${f.nirf_cafir}||${f.nome}|100.00|\n`;
    });

    // Entries (Q100)
    tableDataWithRunningBalance.forEach((l, index) => {
      const dataFmt = l.data_pagamento.replace(/-/g, '');
      const tipoCod = l.tipo_movimento === 'RECEITA' ? '1' : '2';
      const valorFmt = l.valor.toFixed(2);
      const saldoFmt = l.saldoAcumulado.toFixed(2);
      const descr = `${l.classificacao} - Doc: ${l.numero_documento} ${l.observacoes ? '- ' + l.observacoes : ''}`;
      
      fileContent += `Q100|${dataFmt}|001|001|${l.participantes?.cpf_cnpj || '00000000000'}|${tipoCod}|${descr}|${valorFmt}|${saldoFmt}|\n`;
    });

    fileContent += `9999|${tableDataWithRunningBalance.length + 2}|\n`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LCDPR_${cpfProdutor.replace(/\D/g, '')}_${selectedYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={18} /> Receita Federal do Brasil (RFB)
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A]">Livro Caixa Digital do Produtor Rural (LCDPR)</h2>
          <p className="text-xs text-[#888] max-w-xl mt-1">
            Gere o arquivo magnético de escrituração no padrão oficial da Receita Federal (Instrução Normativa RFB nº 1.848).
          </p>
        </div>

        <button
          onClick={handleExportLcdprFile}
          className="px-5 py-3 bg-[#2D5A27] text-white font-extrabold text-xs sm:text-sm rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 shadow-md cursor-pointer shrink-0"
        >
          <Download size={18} /> Baixar Arquivo LCDPR (.txt)
        </button>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
        <div>
          <label className="block text-xs font-bold text-[#444] mb-1 flex items-center gap-1">
            <Calendar size={14} className="text-[#2D5A27]" /> Ano-Calendário *
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs font-bold text-[#1A1A1A] outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#444] mb-1 flex items-center gap-1">
            <UserCheck size={14} className="text-[#2D5A27]" /> CPF Titular da Atividade *
          </label>
          <input
            type="text"
            value={cpfProdutor}
            onChange={(e) => setCpfProdutor(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs font-bold text-[#1A1A1A] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#444] mb-1 flex items-center gap-1">
            <Building2 size={14} className="text-[#2D5A27]" /> Filtrar Propriedade
          </label>
          <select
            value={selectedFazenda}
            onChange={(e) => setSelectedFazenda(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
          >
            <option value="">Consolidado (Todas as Fazendas)</option>
            {fazendas.map(f => (
              <option key={f.id} value={f.id}>{f.nome} (NIRF: {f.nirf_cafir})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Summary for Fiscal Year */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <span className="text-xs font-bold text-[#666] uppercase">Total Entradas (Receitas)</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <span className="text-xs font-bold text-[#666] uppercase">Total Saídas (Despesas)</span>
          <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <span className="text-xs font-bold text-[#666] uppercase">Resultado Agrícola / Pecuário</span>
          <p className={`text-xl font-black mt-1 ${resultadoLiquido >= 0 ? 'text-[#2D5A27]' : 'text-rose-600'}`}>
            {formatCurrency(resultadoLiquido)}
          </p>
        </div>
      </div>

      {/* Escrituração Preview Table */}
      <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={16} className="text-[#2D5A27]" /> Prévia da Escrituração no Leiaute Q100 (RFB)
          </span>
          <span className="text-xs text-[#888] font-bold">{tableDataWithRunningBalance.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-[#666] uppercase">
                <th className="py-3 px-4">Data Pagto</th>
                <th className="py-3 px-4">NIRF / Imóvel</th>
                <th className="py-3 px-4">Conta Bancária</th>
                <th className="py-3 px-4">CPF/CNPJ Participante</th>
                <th className="py-3 px-4">Histórico / Documento</th>
                <th className="py-3 px-4 text-right">Entrada (R$)</th>
                <th className="py-3 px-4 text-right">Saída (R$)</th>
                <th className="py-3 px-4 text-right">Saldo (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF] text-xs">
              {tableDataWithRunningBalance.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-[#333]">
                    {new Date(item.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-[#666]">
                    {item.fazendas?.nirf_cafir || '0.000.000-0'}
                  </td>
                  <td className="py-3 px-4 text-[#666]">
                    {item.contas_bancarias ? `${item.contas_bancarias.banco_nome} CC ${item.contas_bancarias.conta_numero}` : 'Conta Geral'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#444]">
                    {item.participantes?.cpf_cnpj || 'Consumidor Final'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1A1A1A]">
                    {item.classificacao} (Doc: {item.numero_documento})
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {item.tipo_movimento === 'RECEITA' ? formatCurrency(item.valor) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600">
                    {item.tipo_movimento === 'DESPESA' ? formatCurrency(item.valor) : '-'}
                  </td>
                  <td className={`py-3 px-4 text-right font-black ${item.saldoAcumulado >= 0 ? 'text-[#2D5A27]' : 'text-rose-600'}`}>
                    {formatCurrency(item.saldoAcumulado)}
                  </td>
                </tr>
              ))}

              {tableDataWithRunningBalance.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#999]">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-40 text-[#2D5A27]" />
                    Nenhum lançamento no período para a escrituração do LCDPR.
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
