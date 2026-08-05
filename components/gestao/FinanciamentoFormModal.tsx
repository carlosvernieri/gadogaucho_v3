'use client';

import React, { useState } from 'react';
import { X, DollarSign, Calendar, Building2, Wallet, Landmark, Calculator, Info } from 'lucide-react';
import { FinanciamentoInput } from '@/lib/financiamento-calculator';

interface FinanciamentoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FinanciamentoInput) => Promise<void>;
  fazendas: any[];
  contas: any[];
}

export const FinanciamentoFormModal: React.FC<FinanciamentoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  fazendas,
  contas,
}) => {
  const [identificacao, setIdentificacao] = useState('');
  const [fazendaId, setFazendaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [valorPrincipal, setValorPrincipal] = useState('');
  const [taxaJurosAnual, setTaxaJurosAnual] = useState('');
  const [indexador, setIndexador] = useState('Pré-fixado');
  const [periodicidade, setPeriodicidade] = useState<'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'BULLET'>('ANUAL');
  const [sistemaAmortizacao, setSistemaAmortizacao] = useState<'SAC' | 'PRICE' | 'SAFRA_BULLET'>('SAC');
  const [carenciaMeses, setCarenciaMeses] = useState('0');
  const [jurosNaCarencia, setJurosNaCarencia] = useState(true);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().substring(0, 10));
  
  // Default end date 1 year from now
  const defaultEndDate = new Date();
  defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);
  const [dataFim, setDataFim] = useState(defaultEndDate.toISOString().substring(0, 10));
  
  const [tarifasIniciais, setTarifasIniciais] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identificacao.trim()) {
      setErrorMsg('Informe a identificação do contrato.');
      return;
    }
    const valPrincipal = parseFloat(valorPrincipal.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valPrincipal) || valPrincipal <= 0) {
      setErrorMsg('Informe um valor principal válido maior que zero.');
      return;
    }
    const valTaxa = parseFloat(taxaJurosAnual.replace(',', '.'));
    if (isNaN(valTaxa) || valTaxa < 0) {
      setErrorMsg('Informe uma taxa de juros válida.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        identificacao: identificacao.trim(),
        fazenda_id: fazendaId || undefined,
        conta_id: contaId || undefined,
        valor_principal: valPrincipal,
        taxa_juros_anual: valTaxa,
        indexador,
        periodicidade,
        sistema_amortizacao: sistemaAmortizacao,
        carencia_meses: parseInt(carenciaMeses || '0', 10),
        juros_na_carencia: jurosNaCarencia,
        data_inicio: dataInicio,
        data_fim: dataFim,
        tarifas_iniciais: parseFloat((tarifasIniciais || '0').replace(/\./g, '').replace(',', '.')),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar financiamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E9ECEF] shadow-2xl space-y-6 my-8 relative">
        <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-[#2D5A27] rounded-xl flex items-center justify-center shadow-inner">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Novo Financiamento / Crédito Rural</h2>
              <p className="text-xs text-[#666]">Cadastre o contrato para calcular o Custo de Capital Mensalizado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#666] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identificação do Contrato */}
          <div>
            <label className="block text-xs font-bold text-[#333] mb-1">Identificação / Nome do Contrato *</label>
            <input
              type="text"
              placeholder="Ex: Custeio Pecuário BB, Finame Trator, Pronaf Investimento"
              value={identificacao}
              onChange={(e) => setIdentificacao(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fazenda */}
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Fazenda Vinculada</label>
              <div className="relative">
                <select
                  value={fazendaId}
                  onChange={(e) => setFazendaId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all font-medium appearance-none"
                >
                  <option value="">Todas as propriedades / Consolidado</option>
                  {fazendas.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
                <Building2 size={16} className="absolute right-3 top-3 text-[#888] pointer-events-none" />
              </div>
            </div>

            {/* Conta Bancária */}
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Conta Bancária de Crédito</label>
              <div className="relative">
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all font-medium appearance-none"
                >
                  <option value="">Nenhuma / Não especificada</option>
                  {contas.map((c) => {
                    const banco = c.banco_nome || c.nome_banco || c.banco || 'Conta Bancária';
                    const ag = c.agencia ? `Ag: ${c.agencia}` : '';
                    const cc = c.conta_numero ? `CC: ${c.conta_numero}` : '';
                    const desc = c.descricao ? `(${c.descricao})` : '';
                    const extra = [ag, cc, desc].filter(Boolean).join(' ');
                    return (
                      <option key={c.id} value={c.id}>
                        {banco} {extra ? `- ${extra}` : ''}
                      </option>
                    );
                  })}
                </select>
                <Wallet size={16} className="absolute right-3 top-3 text-[#888] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Valor Principal & Taxa de Juros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Valor Principal Tomado (R$) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#666]">R$</span>
                <input
                  type="text"
                  placeholder="100.000,00"
                  value={valorPrincipal}
                  onChange={(e) => setValorPrincipal(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-bold text-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Taxa de Juros Anual (% a.a.) *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="12.5"
                  value={taxaJurosAnual}
                  onChange={(e) => setTaxaJurosAnual(e.target.value)}
                  className="w-full pr-8 pl-4 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-[#666]">% a.a.</span>
              </div>
            </div>
          </div>

          {/* Indexador, Periodicidade & Sistema de Amortização */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Indexador / Linha</label>
              <select
                value={indexador}
                onChange={(e) => setIndexador(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
              >
                <option value="Pré-fixado">Pré-fixado (Taxa Fixa)</option>
                <option value="IPCA +">IPCA + Taxa</option>
                <option value="CDI +">CDI + Taxa</option>
                <option value="PRONAF">PRONAF (Subsidiaso)</option>
                <option value="PRONAMP">PRONAMP</option>
                <option value="Moderfrota / Inovagro">Moderfrota / Inovagro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Periodicidade de Cobrança</label>
              <select
                value={periodicidade}
                onChange={(e) => setPeriodicidade(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
              >
                <option value="MENSAL">Mensal (12x/ano)</option>
                <option value="TRIMESTRAL">Trimestral (4x/ano)</option>
                <option value="SEMESTRAL">Semestral (2x/ano)</option>
                <option value="ANUAL">Anual / Pós-Safra (1x/ano)</option>
                <option value="BULLET">Parcela Única no Vencimento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Sistema Amortização</label>
              <select
                value={sistemaAmortizacao}
                onChange={(e) => setSistemaAmortizacao(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
              >
                <option value="SAC">SAC (Amortização Constante)</option>
                <option value="PRICE">PRICE (Parcelas Fixas)</option>
                <option value="SAFRA_BULLET">Safra / Bullet (Final)</option>
              </select>
            </div>
          </div>

          {/* Carência & Juros na Carência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8F9FA] p-4 rounded-2xl border border-[#E9ECEF]">
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Carência (Meses)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={carenciaMeses}
                onChange={(e) => setCarenciaMeses(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-[#E9ECEF] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#2D5A27]"
              />
              <span className="text-[10px] text-[#777] mt-1 block">Meses sem amortizar o principal</span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="block text-xs font-bold text-[#333] mb-2">Tratamento dos Juros na Carência</label>
              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="jurosCarencia"
                    checked={jurosNaCarencia}
                    onChange={() => setJurosNaCarencia(true)}
                    className="accent-[#2D5A27]"
                  />
                  Pagar juros mensalmente
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="jurosCarencia"
                    checked={!jurosNaCarencia}
                    onChange={() => setJurosNaCarencia(false)}
                    className="accent-[#2D5A27]"
                  />
                  Capitalizar no saldo
                </label>
              </div>
            </div>
          </div>

          {/* Data Início, Data Fim & Tarifas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Data Liberação / Início *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Data Vencimento Final *</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#333] mb-1">Tarifas / IOF / Seguro (R$)</label>
              <input
                type="text"
                placeholder="0,00"
                value={tarifasIniciais}
                onChange={(e) => setTarifasIniciais(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#2D5A27]"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E9ECEF]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-[#666] hover:bg-[#F8F9FA] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Calculator size={16} /> {loading ? 'Calculando...' : 'Salvar Financiamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
