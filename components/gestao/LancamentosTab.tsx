'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Building2,
  Wallet,
  Users,
  Pencil
} from 'lucide-react';

interface Fazenda {
  id: string;
  nome: string;
  nirf_cafir: string;
}

interface Conta {
  id: string;
  banco_nome: string;
  agencia: string;
  conta_numero: string;
}

interface Participante {
  id: string;
  nome: string;
  cpf_cnpj: string;
}

interface LancamentoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  classificacao_item?: string;
}

interface Lancamento {
  id: string;
  fazenda_id: string;
  conta_id: string;
  participante_id?: string;
  data_pagamento: string;
  tipo_movimento: 'RECEITA' | 'DESPESA';
  classificacao: string;
  valor: number;
  numero_documento: string;
  observacoes?: string;
  fazendas?: { nome: string; nirf_cafir: string };
  contas_bancarias?: { banco_nome: string; conta_numero: string };
  participantes?: { nome: string; cpf_cnpj: string };
  lancamento_itens?: LancamentoItem[];
}

interface LancamentosTabProps {
  lancamentos: Lancamento[];
  fazendas: Fazenda[];
  contas: Conta[];
  participantes: Participante[];
  onAddLancamento: (data: any) => Promise<boolean>;
  onEditLancamento?: (id: string, data: any) => Promise<boolean>;
  onDeleteLancamento: (id: string) => Promise<boolean>;
  onImportXml: (fileOrKey: File | string) => Promise<any>;
}

export const LancamentosTab: React.FC<LancamentosTabProps> = ({
  lancamentos,
  fazendas,
  contas,
  participantes,
  onAddLancamento,
  onEditLancamento,
  onDeleteLancamento,
  onImportXml,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFazenda, setFilterFazenda] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  
  // Modal Novo Lançamento
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [fazendaId, setFazendaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [participanteId, setParticipanteId] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().substring(0, 10));
  const [tipoMovimento, setTipoMovimento] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [classificacao, setClassificacao] = useState('Insumos');
  const [valor, setValor] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<LancamentoItem[]>([]);

  // Modal Import XML / Chave
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [importTab, setImportTab] = useState<'chave' | 'xml'>('chave');
  const [chaveInput, setChaveInput] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [xmlParsedData, setXmlParsedData] = useState<any>(null);
  const [isXmlLoading, setIsXmlLoading] = useState(false);

  const handleChaveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format 44-digit string cleanly with spaces every 4 characters
    const raw = e.target.value.replace(/\D/g, '').slice(0, 44);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setChaveInput(formatted);
  };

  const handleFetchByChave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = chaveInput.replace(/\D/g, '');
    if (cleanKey.length !== 44) {
      alert('A Chave de Acesso da NF-e deve possuir exatamente 44 dígitos numéricos.');
      return;
    }

    setIsXmlLoading(true);
    setXmlParsedData(null);

    try {
      const parsed = await onImportXml(cleanKey);
      if (parsed) {
        setXmlParsedData(parsed);
      }
    } catch (err: any) {
      alert('Erro ao consultar Chave de Acesso: ' + (err.message || 'Formato inválido'));
    } finally {
      setIsXmlLoading(false);
    }
  };

  // New item draft
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQtd, setNewItemQtd] = useState('1');
  const [newItemValor, setNewItemValor] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAddItem = () => {
    if (!newItemDesc || !newItemValor) return;
    const qtd = parseFloat(newItemQtd) || 1;
    const vUnit = parseFloat(newItemValor) || 0;
    const itemTotal = qtd * vUnit;

    const updatedItens = [
      ...itens,
      {
        descricao: newItemDesc,
        quantidade: qtd,
        valor_unitario: vUnit,
        valor_total: itemTotal,
        classificacao_item: classificacao,
      }
    ];
    setItens(updatedItens);

    // Recalcular valor total do lançamento se zerado ou somado
    const newTotal = updatedItens.reduce((acc, curr) => acc + curr.valor_total, 0);
    setValor(newTotal.toFixed(2));

    setNewItemDesc('');
    setNewItemQtd('1');
    setNewItemValor('');
  };

  const handleRemoveItem = (idx: number) => {
    const updated = itens.filter((_, i) => i !== idx);
    setItens(updated);
    if (updated.length > 0) {
      const newTotal = updated.reduce((acc, curr) => acc + curr.valor_total, 0);
      setValor(newTotal.toFixed(2));
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStartEdit = (lanc: Lancamento) => {
    setEditingId(lanc.id);
    setFazendaId(lanc.fazenda_id);
    setContaId(lanc.conta_id);
    setParticipanteId(lanc.participante_id || '');
    setDataPagamento(lanc.data_pagamento ? lanc.data_pagamento.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setTipoMovimento(lanc.tipo_movimento === 'RECEITA' ? 'RECEITA' : 'DESPESA');
    setClassificacao(lanc.classificacao || 'Insumos');
    setValor(lanc.valor ? lanc.valor.toString() : '');
    setNumeroDocumento(lanc.numero_documento || '');
    setObservacoes(lanc.observacoes || '');
    setItens(lanc.lancamento_itens || []);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSubmitNewLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fazendaId || !contaId || !valor || !numeroDocumento) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (Fazenda, Conta, Documento e Valor).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      fazenda_id: fazendaId,
      conta_id: contaId,
      participante_id: participanteId || null,
      data_pagamento: dataPagamento,
      tipo_movimento: tipoMovimento,
      classificacao,
      valor: parseFloat(valor),
      numero_documento: numeroDocumento,
      observacoes,
      itens,
    };

    const ok = editingId && onEditLancamento 
      ? await onEditLancamento(editingId, payload)
      : await onAddLancamento(payload);

    setIsSubmitting(false);

    if (ok) {
      setShowModal(false);
      resetForm();
    } else {
      setErrorMessage(`Erro ao ${editingId ? 'atualizar' : 'cadastrar'} lançamento.`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFazendaId('');
    setContaId('');
    setParticipanteId('');
    setDataPagamento(new Date().toISOString().substring(0, 10));
    setTipoMovimento('DESPESA');
    setClassificacao('Insumos');
    setValor('');
    setNumeroDocumento('');
    setObservacoes('');
    setItens([]);
    setErrorMessage('');
  };

  const handleXmlSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXmlFile(file);
    setIsXmlLoading(true);

    try {
      const parsed = await onImportXml(file);
      if (parsed) {
        setXmlParsedData(parsed);
      }
    } catch (err: any) {
      alert('Erro ao ler XML: ' + (err.message || 'Formato inválido'));
    } finally {
      setIsXmlLoading(false);
    }
  };

  const handleApplyXmlToLancamento = () => {
    if (!xmlParsedData) return;

    setNumeroDocumento(xmlParsedData.numero_documento || '');
    setDataPagamento(xmlParsedData.data_pagamento || new Date().toISOString().substring(0, 10));
    setValor(xmlParsedData.valor_total ? xmlParsedData.valor_total.toString() : '');
    setObservacoes(`Importado via NFe. Chave: ${xmlParsedData.chave_nfe || 'S/N'}`);
    
    if (xmlParsedData.itens && xmlParsedData.itens.length > 0) {
      setItens(xmlParsedData.itens);
    }

    setShowXmlModal(false);
    setShowModal(true);
  };

  const filteredLancamentos = lancamentos.filter(item => {
    const matchesSearch = 
      item.numero_documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.classificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.observacoes && item.observacoes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.participantes?.nome && item.participantes.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFazenda = !filterFazenda || item.fazenda_id === filterFazenda;
    const matchesTipo = !filterTipo || item.tipo_movimento === filterTipo;

    return matchesSearch && matchesFazenda && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Livro Caixa & Escrituração</h2>
          <p className="text-xs text-[#888]">Lançamentos financeiros no regime de caixa para escrituração contábil</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowXmlModal(true); setXmlParsedData(null); setXmlFile(null); }}
            className="px-4 py-2.5 bg-emerald-50 text-[#2D5A27] font-bold text-xs sm:text-sm rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload size={16} /> Importar XML NF-e
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-4 py-2.5 bg-[#2D5A27] text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-[#999]" />
          <input
            type="text"
            placeholder="Buscar por Nº Doc, Fornecedor, Obs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#2D5A27] transition-all"
          />
        </div>

        {/* Filter Fazenda */}
        <select
          value={filterFazenda}
          onChange={(e) => setFilterFazenda(e.target.value)}
          className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-2 text-xs outline-none focus:border-[#2D5A27] transition-all cursor-pointer"
        >
          <option value="">Todas as Fazendas</option>
          {fazendas.map(f => (
            <option key={f.id} value={f.id}>{f.nome} ({f.nirf_cafir})</option>
          ))}
        </select>

        {/* Filter Tipo */}
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-2 text-xs outline-none focus:border-[#2D5A27] transition-all cursor-pointer"
        >
          <option value="">Todas as Operações</option>
          <option value="RECEITA">Entradas (Receitas)</option>
          <option value="DESPESA">Saídas (Despesas)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[11px] font-bold text-[#666] uppercase tracking-wider">
                <th className="py-3.5 px-4">Data Pagto</th>
                <th className="py-3.5 px-4">Nº Doc</th>
                <th className="py-3.5 px-4">Fazenda</th>
                <th className="py-3.5 px-4">Tipo & Categoria</th>
                <th className="py-3.5 px-4">Participante</th>
                <th className="py-3.5 px-4 text-right">Valor (R$)</th>
                <th className="py-3.5 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF] text-xs">
              {filteredLancamentos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[#333]">
                    {new Date(item.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                    {item.numero_documento}
                  </td>
                  <td className="py-3.5 px-4 text-[#666]">
                    {item.fazendas?.nome || 'Fazenda Standard'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.tipo_movimento === 'RECEITA' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.tipo_movimento === 'RECEITA' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {item.tipo_movimento}
                      </span>
                      <span className="text-xs text-[#666] font-semibold">{item.classificacao}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#444]">
                    {item.participantes?.nome || 'Não especificado'}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-extrabold ${
                    item.tipo_movimento === 'RECEITA' ? 'text-emerald-700' : 'text-[#1A1A1A]'
                  }`}>
                    {formatCurrency(item.valor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-[#2D5A27] rounded-lg hover:bg-emerald-50 transition-all cursor-pointer"
                        title="Editar Lançamento"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteLancamento(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="Excluir Lançamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLancamentos.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#999]">
                    <FileText size={36} className="mx-auto mb-2 opacity-40 text-[#2D5A27]" />
                    <p className="font-semibold text-sm">Nenhum lançamento encontrado</p>
                    <p className="text-xs text-[#aaa] mt-1">Clique em &quot;Novo Lançamento&quot; ou import o XML da Nota Fiscal.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar Lançamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-4">
              <div className="flex items-center gap-2 text-[#2D5A27]">
                {editingId ? <Pencil size={22} /> : <Plus size={24} />}
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">
                  {editingId ? `Editar Lançamento (Doc: ${numeroDocumento})` : 'Novo Lançamento Contábil'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#999] hover:text-[#333] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitNewLancamento} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                <button
                  type="button"
                  onClick={() => setTipoMovimento('DESPESA')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tipoMovimento === 'DESPESA' ? 'bg-rose-600 text-white shadow-sm' : 'text-[#666]'
                  }`}
                >
                  <ArrowDownRight size={14} /> Saída (Despesa / Custo)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimento('RECEITA')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tipoMovimento === 'RECEITA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#666]'
                  }`}
                >
                  <ArrowUpRight size={14} /> Entrada (Receita Venda)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fazenda */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Fazenda *</label>
                  <select
                    value={fazendaId}
                    onChange={(e) => setFazendaId(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  >
                    <option value="">Selecione a Propriedade...</option>
                    {fazendas.map(f => (
                      <option key={f.id} value={f.id}>{f.nome} (NIRF: {f.nirf_cafir})</option>
                    ))}
                  </select>
                </div>

                {/* Conta Bancária */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Conta Bancária *</label>
                  <select
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  >
                    <option value="">Selecione a Conta...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.banco_nome} - Ag {c.agencia} CC {c.conta_numero}</option>
                    ))}
                  </select>
                </div>

                {/* Data Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Data Pagamento (Regime de Caixa) *</label>
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>

                {/* Nº Documento */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Nº Documento / Nota Fiscal *</label>
                  <input
                    type="text"
                    placeholder="Ex: NF 12345"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Categoria Contábil *</label>
                  <select
                    value={classificacao}
                    onChange={(e) => setClassificacao(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  >
                    <option value="Venda de Rebanho">Venda de Rebanho (Bovinos)</option>
                    <option value="Insumos">Insumos (Sal, Ração, Proteínado)</option>
                    <option value="Sanidade e Vacinas">Sanidade & Vacinas</option>
                    <option value="Combustíveis e Máquinas">Combustíveis & Frotas</option>
                    <option value="Manutenção e Pastagem">Manutenção de Piquetes / Cercas</option>
                    <option value="Mão de Obra">Mão de Obra / Pessoal</option>
                    <option value="Outras Receitas">Outras Receitas</option>
                    <option value="Outras Despesas">Outras Despesas</option>
                  </select>
                </div>

                {/* Participante */}
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Fornecedor / Cliente (Opcional)</label>
                  <select
                    value={participanteId}
                    onChange={(e) => setParticipanteId(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  >
                    <option value="">Selecione o Participante...</option>
                    {participantes.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.cpf_cnpj})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor Total */}
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Valor Total do Lançamento (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-3 text-sm font-extrabold text-[#2D5A27] outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              {/* Items Detail Section (Opcional) */}
              <div className="pt-3 border-t border-[#E9ECEF]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#333] flex items-center gap-1.5">
                    <Package size={14} className="text-[#2D5A27]" /> Detalhamento de Itens da NF (Opcional)
                  </span>
                  <span className="text-[10px] text-[#888]">{itens.length} itens adicionados</span>
                </div>

                {/* Items List */}
                {itens.length > 0 && (
                  <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                    {itens.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-[#F8F9FA] rounded-lg text-xs">
                        <span className="font-semibold text-[#333]">{it.descricao} (x{it.quantidade})</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#2D5A27]">{formatCurrency(it.valor_total)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item Row */}
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Descrição item (ex: Sal 40kg)"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="col-span-5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={newItemQtd}
                    onChange={(e) => setNewItemQtd(e.target.value)}
                    className="col-span-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="V. Unit (R$)"
                    value={newItemValor}
                    onChange={(e) => setNewItemValor(e.target.value)}
                    className="col-span-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="col-span-2 bg-emerald-100 text-[#2D5A27] font-bold text-xs rounded-lg hover:bg-emerald-200 transition-all cursor-pointer flex items-center justify-center"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Stock auto sync badge if items exist */}
              {itens.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-[#2D5A27] flex items-center gap-2">
                  <Package size={16} className="shrink-0 text-[#2D5A27]" />
                  <span>Sincronização Automática: <strong>{itens.length} insumos</strong> desta nota serão adicionados/atualizados diretamente no Estoque do Almoxarifado.</span>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Anotações adicionais da operação..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E9ECEF]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-[#666] hover:bg-[#F8F9FA] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import XML / Chave */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <FileText size={22} />
                <h3 className="text-lg font-extrabold text-[#1A1A1A]">Importar Nota Fiscal Eletrônica</h3>
              </div>
              <button 
                onClick={() => { setShowXmlModal(false); setXmlParsedData(null); }}
                className="text-[#999] hover:text-[#333] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
              <button
                type="button"
                onClick={() => { setImportTab('chave'); setXmlParsedData(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  importTab === 'chave' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                <FileText size={14} /> Chave de Acesso (44 Dígitos)
              </button>
              <button
                type="button"
                onClick={() => { setImportTab('xml'); setXmlParsedData(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  importTab === 'xml' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                <Upload size={14} /> Arquivo XML (.xml)
              </button>
            </div>

            {/* TAB 1: Chave de Acesso */}
            {importTab === 'chave' && (
              <form onSubmit={handleFetchByChave} className="space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-extrabold text-[#2D5A27]">
                    Informe a Chave de Acesso da NF-e (DANFE):
                  </label>
                  <input
                    type="text"
                    placeholder="4323 0712 3456 7800 0195 5500 1000 0123 4510 9876 5432"
                    value={chaveInput}
                    onChange={handleChaveInputChange}
                    className="w-full bg-white border border-[#E9ECEF] rounded-xl p-3 text-xs font-mono font-bold tracking-wider text-[#1A1A1A] outline-none focus:border-[#2D5A27] shadow-inner"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#777]">
                    <span>Localizado na parte superior direita da DANFE</span>
                    <span className="font-bold text-[#2D5A27]">
                      {chaveInput.replace(/\D/g, '').length}/44 dígitos
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isXmlLoading || chaveInput.replace(/\D/g, '').length !== 44}
                  className="w-full py-3 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isXmlLoading ? 'Buscando Dados na SEFAZ...' : 'Buscar e Extrair NF-e →'}
                </button>
              </form>
            )}

            {/* TAB 2: Upload de Arquivo XML */}
            {importTab === 'xml' && (
              <div className="border-2 border-dashed border-[#2D5A27]/30 bg-emerald-50/50 rounded-2xl p-6 text-center">
                <Upload size={32} className="mx-auto text-[#2D5A27] mb-2" />
                <p className="text-xs font-bold text-[#333]">Selecione ou arraste o arquivo XML da Nota Fiscal</p>
                <p className="text-[11px] text-[#888] mt-1">Suporta arquivos .xml oficiais de NF-e e NFP-e</p>
                
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleXmlSelect}
                  className="hidden"
                  id="xml-input"
                />
                <label
                  htmlFor="xml-input"
                  className="mt-4 inline-block px-4 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all cursor-pointer"
                >
                  Escolher Arquivo XML
                </label>

                {isXmlLoading && (
                  <p className="text-xs text-[#2D5A27] font-semibold mt-3 animate-pulse">Lendo e extraindo campos da nota...</p>
                )}
              </div>
            )}

            {/* Parsed Result Box */}
            {xmlParsedData && (
              <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 size={16} /> Nota Fiscal Localizada com Sucesso!
                </div>
                <div className="text-xs text-[#333] space-y-1 bg-white p-3 rounded-xl border border-[#E9ECEF]">
                  <p><strong>Nº Nota:</strong> {xmlParsedData.numero_documento}</p>
                  <p><strong>Participante:</strong> {xmlParsedData.participante?.nome}</p>
                  <p><strong>Valor Total:</strong> <span className="font-extrabold text-[#2D5A27]">{formatCurrency(xmlParsedData.valor_total)}</span></p>
                  <p><strong>Insumos Extraídos:</strong> {xmlParsedData.itens?.length || 0} produtos</p>
                </div>

                {xmlParsedData.itens && xmlParsedData.itens.length > 0 && (
                  <div className="p-2.5 bg-emerald-100/60 text-[#2D5A27] text-[11px] font-semibold rounded-xl flex items-center gap-2">
                    <Package size={14} className="shrink-0 text-[#2D5A27]" />
                    <span>Estes insumos serão adicionados/atualizados no estoque do Almoxarifado.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApplyXmlToLancamento}
                  className="w-full py-2.5 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all shadow-sm cursor-pointer mt-2"
                >
                  Confirmar e Abrir Formulário de Lançamento →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
