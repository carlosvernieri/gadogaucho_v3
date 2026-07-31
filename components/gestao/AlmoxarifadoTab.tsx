'use client';

import React, { useState } from 'react';
import { 
  Boxes, Plus, ArrowUpRight, ArrowDownRight, Package, Search, 
  AlertCircle, X, CheckCircle2, History, MinusCircle, PlusCircle 
} from 'lucide-react';

interface Movimentacao {
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
  movimentacoes?: Movimentacao[];
}

interface AlmoxarifadoTabProps {
  produtos: ProdutoInsumo[];
  onAddProduto?: (data: any) => void;
  onMovimentoEstoque?: (data: any) => void;
}

export const AlmoxarifadoTab: React.FC<AlmoxarifadoTabProps> = ({
  produtos: initialProdutos,
  onAddProduto,
  onMovimentoEstoque,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<ProdutoInsumo[]>(initialProdutos);
  
  // Modal Novo Produto
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Suplemento / Sal');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('KG');
  const [custoMedio, setCustoMedio] = useState('');

  // Modal Movimento / Baixa de Estoque
  const [showMovimentoModal, setShowMovimentoModal] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'SAIDA' | 'ENTRADA'>('SAIDA');
  const [qtdMovimento, setQtdMovimento] = useState('');
  const [motivo, setMotivo] = useState('Consumo no Piquete / Manejo');
  const [observacaoMovimento, setObservacaoMovimento] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Historico local recente de movimentacoes
  const [historicoMovimentos, setHistoricoMovimentos] = useState<any[]>([]);

  // Update internal produtos state if props change
  React.useEffect(() => {
    setProdutos(initialProdutos);
  }, [initialProdutos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCreateProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !quantidade) return;

    const newProd: ProdutoInsumo = {
      id: Date.now().toString(),
      nome,
      categoria,
      quantidade: parseFloat(quantidade) || 0,
      unidade,
      custo_medio: parseFloat(custoMedio) || 0,
    };

    setProdutos([newProd, ...produtos]);
    if (onAddProduto) onAddProduto(newProd);

    setShowModal(false);
    setNome('');
    setQuantidade('');
    setCustoMedio('');
  };

  const handleOpenMovimento = (prodId: string = '', tipo: 'SAIDA' | 'ENTRADA' = 'SAIDA') => {
    setSelectedProdutoId(prodId || (produtos.length > 0 ? produtos[0].id : ''));
    setTipoMovimentacao(tipo);
    setQtdMovimento('');
    setMotivo(tipo === 'SAIDA' ? 'Consumo no Piquete / Manejo' : 'Compra de Insumo / Entrada');
    setObservacaoMovimento('');
    setErrorMessage('');
    setShowMovimentoModal(true);
  };

  const handleSubmitMovimento = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedProdutoId) {
      setErrorMessage('Selecione um insumo.');
      return;
    }

    const qtdNum = parseFloat(qtdMovimento);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setErrorMessage('A quantidade deve ser maior que zero.');
      return;
    }

    const targetProd = produtos.find(p => p.id === selectedProdutoId);
    if (!targetProd) return;

    if (tipoMovimentacao === 'SAIDA' && targetProd.quantidade < qtdNum) {
      setErrorMessage(`Estoque insuficiente! Saldo atual: ${targetProd.quantidade} ${targetProd.unidade}`);
      return;
    }

    const newQtd = tipoMovimentacao === 'SAIDA' 
      ? Math.max(0, targetProd.quantidade - qtdNum)
      : targetProd.quantidade + qtdNum;

    // Local state update
    setProdutos(prev => prev.map(p => p.id === selectedProdutoId ? { ...p, quantidade: newQtd } : p));

    const obsFinal = `${motivo}${observacaoMovimento ? ` (${observacaoMovimento})` : ''}`;

    // Add to local history timeline
    const movLog = {
      id: 'mov-' + Date.now(),
      produtoNome: targetProd.nome,
      unidade: targetProd.unidade,
      tipo_movimentacao: tipoMovimentacao,
      quantidade: qtdNum,
      observacoes: obsFinal,
      data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    setHistoricoMovimentos([movLog, ...historicoMovimentos]);

    // Parent callback / API
    if (onMovimentoEstoque) {
      onMovimentoEstoque({
        produto_id: selectedProdutoId,
        tipo_movimentacao: tipoMovimentacao,
        quantidade: qtdNum,
        observacoes: obsFinal
      });
    }

    setShowMovimentoModal(false);
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Almoxarifado & Estoque de Insumos</h2>
          <p className="text-xs text-[#888]">Controle físico, movimentações de entrada e baixa de insumos (nutrição, medicamentos, combustíveis)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenMovimento('', 'SAIDA')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <ArrowDownRight size={18} /> Dar Baixa no Estoque
          </button>
          
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[#2D5A27] text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus size={18} /> Novo Insumo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-[#999]" />
          <input
            type="text"
            placeholder="Buscar por nome do produto ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#2D5A27] transition-all"
          />
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProdutos.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-[#2D5A27] rounded-xl">
                  <Boxes size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1A1A1A]">{p.nome}</h4>
                  <span className="text-[10px] font-bold text-[#666] bg-[#F8F9FA] px-2 py-0.5 rounded-md">
                    {p.categoria}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E9ECEF] text-xs">
              <div>
                <span className="text-[#888] block text-[10px] font-bold uppercase">Saldo Atual</span>
                <span className={`font-black text-lg ${p.quantidade <= 5 ? 'text-amber-600' : 'text-[#2D5A27]'}`}>
                  {p.quantidade} <span className="text-xs font-bold text-[#666]">{p.unidade}</span>
                </span>
              </div>
              <div>
                <span className="text-[#888] block text-[10px] font-bold uppercase">Custo Médio</span>
                <span className="font-bold text-sm text-[#333]">
                  {formatCurrency(p.custo_medio)}
                </span>
              </div>
            </div>

            {/* Actions: Quick Baixa / Entrada */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E9ECEF]">
              <button
                onClick={() => handleOpenMovimento(p.id, 'SAIDA')}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Dar baixa / Registrar consumo deste insumo"
              >
                <ArrowDownRight size={14} /> Dar Baixa
              </button>
              <button
                onClick={() => handleOpenMovimento(p.id, 'ENTRADA')}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Registrar entrada de insumo"
              >
                <ArrowUpRight size={14} /> Entrada
              </button>
            </div>
          </div>
        ))}

        {filteredProdutos.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-[#E9ECEF] text-center text-[#999]">
            <Boxes size={36} className="mx-auto mb-2 opacity-40 text-[#2D5A27]" />
            <p className="font-semibold text-sm">Nenhum produto em estoque</p>
            <p className="text-xs text-[#aaa] mt-1">Os insumos comprados via NF-e são sincronizados automaticamente aqui.</p>
          </div>
        )}
      </div>

      {/* Timeline de Últimas Movimentações */}
      {historicoMovimentos.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E9ECEF] pb-3 text-[#1A1A1A]">
            <History size={18} className="text-[#2D5A27]" />
            <h3 className="text-sm font-extrabold">Histórico Recente de Baixas e Entradas</h3>
          </div>

          <div className="space-y-2">
            {historicoMovimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${m.tipo_movimentacao === 'SAIDA' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {m.tipo_movimentacao === 'SAIDA' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <span className="font-bold text-[#1A1A1A] block">{m.produtoNome}</span>
                    <span className="text-[#666] text-[11px]">{m.observacoes}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-extrabold block text-xs ${m.tipo_movimentacao === 'SAIDA' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {m.tipo_movimentacao === 'SAIDA' ? `- ${m.quantidade}` : `+ ${m.quantidade}`} {m.unidade}
                  </span>
                  <span className="text-[10px] text-[#999]">{m.data}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Baixa / Movimentação de Estoque */}
      {showMovimentoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div className="flex items-center gap-2">
                {tipoMovimentacao === 'SAIDA' ? (
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <ArrowDownRight size={20} />
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <ArrowUpRight size={20} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1A1A]">
                    {tipoMovimentacao === 'SAIDA' ? 'Dar Baixa no Estoque (Saída)' : 'Registrar Entrada no Estoque'}
                  </h3>
                  <p className="text-[11px] text-[#888]">Baixa por consumo, aplicação sanitária ou ajuste</p>
                </div>
              </div>

              <button onClick={() => setShowMovimentoModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitMovimento} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Insumo / Produto *</label>
                <select
                  value={selectedProdutoId}
                  onChange={(e) => setSelectedProdutoId(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  required
                >
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Saldo: {p.quantidade} {p.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Tipo de Movimento *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTipoMovimentacao('SAIDA'); setMotivo('Consumo no Piquete / Manejo'); }}
                    className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      tipoMovimentacao === 'SAIDA'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-[#F8F9FA] text-[#666] border-[#E9ECEF]'
                    }`}
                  >
                    <ArrowDownRight size={14} /> Saída (Dar Baixa)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTipoMovimentacao('ENTRADA'); setMotivo('Compra de Insumo / Entrada'); }}
                    className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      tipoMovimentacao === 'ENTRADA'
                        ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                        : 'bg-[#F8F9FA] text-[#666] border-[#E9ECEF]'
                    }`}
                  >
                    <ArrowUpRight size={14} /> Entrada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5"
                  value={qtdMovimento}
                  onChange={(e) => setQtdMovimento(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Motivo / Destino *</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                >
                  {tipoMovimentacao === 'SAIDA' ? (
                    <>
                      <option value="Consumo no Piquete / Cocho">Consumo no Piquete / Cocho</option>
                      <option value="Aplicação Sanitária / Vacinação">Aplicação Sanitária / Vacinação</option>
                      <option value="Manutenção de Cercas / Infraestrutura">Manutenção de Cercas / Infraestrutura</option>
                      <option value="Perda / Avaria / Validade">Perda / Avaria / Validade</option>
                      <option value="Ajuste de Inventário">Ajuste de Inventário</option>
                    </>
                  ) : (
                    <>
                      <option value="Compra de Insumo / Entrada">Compra de Insumo / Entrada</option>
                      <option value="Ajuste de Inventário">Ajuste de Inventário (Positivo)</option>
                      <option value="Devolução">Devolução</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Observações Adicionais (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Piquete 04 - Lote Matrizes"
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E9ECEF]">
                <button
                  type="button"
                  onClick={() => setShowMovimentoModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#666] hover:bg-[#F8F9FA] rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer ${
                    tipoMovimentacao === 'SAIDA' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2D5A27] hover:bg-[#1E3D1A]'
                  }`}
                >
                  {tipoMovimentacao === 'SAIDA' ? 'Confirmar Baixa' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Product */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">Novo Insumo no Almoxarifado</h3>
              <button onClick={() => setShowModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Nome do Insumo *</label>
                <input
                  type="text"
                  placeholder="Ex: Sal Mineral 30kg, Vacina Aftosa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Categoria *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                >
                  <option value="Suplemento / Sal">Suplemento / Sal Mineral</option>
                  <option value="Ração / Concentrado">Ração / Concentrado</option>
                  <option value="Medicamento / Vacina">Medicamento / Vacina</option>
                  <option value="Combustível">Combustível / Óleo</option>
                  <option value="Manutenção e Cercas">Manutenção & Cercas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Unidade *</label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  >
                    <option value="KG">Quilos (KG)</option>
                    <option value="SC">Sacos (SC)</option>
                    <option value="UN">Unidades (UN)</option>
                    <option value="LITRO">Litros (L)</option>
                    <option value="DOSE">Doses</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Custo Médio Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={custoMedio}
                  onChange={(e) => setCustoMedio(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E9ECEF]">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-[#666] hover:bg-[#F8F9FA] rounded-xl cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl hover:bg-[#1E3D1A] transition-all shadow-md cursor-pointer">
                  Salvar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
