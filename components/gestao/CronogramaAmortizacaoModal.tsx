'use client';

import React from 'react';
import { X, Calendar, DollarSign, FileText, Download, Landmark, CheckCircle2 } from 'lucide-react';
import { FinanciamentoResultado } from '@/lib/financiamento-calculator';

interface CronogramaAmortizacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultado: FinanciamentoResultado | null;
}

export const CronogramaAmortizacaoModal: React.FC<CronogramaAmortizacaoModalProps> = ({
  isOpen,
  onClose,
  resultado,
}) => {
  if (!isOpen || !resultado) return null;

  const { financiamento, cronograma, total_meses, total_juros, total_pago, custo_capital_mensal_medio, taxa_mensal_equivalente } = resultado;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-[#E9ECEF] shadow-2xl space-y-6 my-8 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-[#2D5A27] rounded-xl flex items-center justify-center shadow-inner">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">{financiamento.identificacao}</h2>
              <p className="text-xs text-[#666]">
                Cronograma de Amortização ({financiamento.sistema_amortizacao}) • {financiamento.periodicidade}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#666] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 rounded-2xl border border-[#E9ECEF] flex-shrink-0">
          <div>
            <span className="text-[10px] font-bold text-[#777] uppercase tracking-wider">Custo Mensal de Capital</span>
            <div className="text-sm sm:text-base font-extrabold text-[#2D5A27]">
              {formatCurrency(custo_capital_mensal_medio)}/mês
            </div>
            <span className="text-[10px] font-medium text-[#666]">{taxa_mensal_equivalente}% a.m. eq.</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#777] uppercase tracking-wider">Valor Principal</span>
            <div className="text-sm sm:text-base font-extrabold text-[#1A1A1A]">
              {formatCurrency(financiamento.valor_principal)}
            </div>
            <span className="text-[10px] font-medium text-[#666]">{total_meses} meses vigentes</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#777] uppercase tracking-wider">Juros Totais</span>
            <div className="text-sm sm:text-base font-extrabold text-rose-600">
              {formatCurrency(total_juros)}
            </div>
            <span className="text-[10px] font-medium text-[#666]">{financiamento.taxa_juros_anual}% a.a.</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#777] uppercase tracking-wider">Desembolso Total</span>
            <div className="text-sm sm:text-base font-extrabold text-[#333]">
              {formatCurrency(total_pago)}
            </div>
            <span className="text-[10px] font-medium text-[#666]">Principal + Juros + Tarifas</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 border border-[#E9ECEF] rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#555] uppercase font-bold sticky top-0 border-b border-[#E9ECEF]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Saldo Inicial</th>
                <th className="py-3 px-4 text-emerald-700">Amortização</th>
                <th className="py-3 px-4 text-rose-600">Juros</th>
                <th className="py-3 px-4 font-black text-[#1A1A1A]">Parcela Total</th>
                <th className="py-3 px-4">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF] font-medium text-[#333]">
              {cronograma.map((item) => (
                <tr key={item.numero} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#888]">#{item.numero}</td>
                  <td className="py-2.5 px-4 font-semibold text-[#1A1A1A]">{formatDate(item.data_vencimento)}</td>
                  <td className="py-2.5 px-4">{formatCurrency(item.saldo_devedor_inicial)}</td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-700">{formatCurrency(item.amortizacao)}</td>
                  <td className="py-2.5 px-4 font-semibold text-rose-600">{formatCurrency(item.juros)}</td>
                  <td className="py-2.5 px-4 font-extrabold text-[#1A1A1A]">{formatCurrency(item.parcela_total)}</td>
                  <td className="py-2.5 px-4 text-[#666]">{formatCurrency(item.saldo_devedor_final)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E9ECEF] pt-4 flex-shrink-0 text-xs">
          <span className="text-[#888] font-medium">
            {cronograma.length} parcelas registradas • Tarifa inicial: R$ {(financiamento.tarifas_iniciais || 0).toFixed(2)}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2D5A27] text-white font-bold rounded-xl shadow-md hover:bg-[#1E3D1A] transition-colors cursor-pointer"
          >
            Fechar Cronograma
          </button>
        </div>
      </div>
    </div>
  );
};
