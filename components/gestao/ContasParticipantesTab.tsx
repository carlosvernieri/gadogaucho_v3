'use client';

import React, { useState } from 'react';
import { Wallet, Users, Plus, Trash2, Edit2, X, AlertCircle, CreditCard, UserCheck, ShieldCheck, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Conta {
  id: string;
  banco_nome: string;
  agencia: string;
  conta_numero: string;
  tipo_conta?: string;
}

interface Participante {
  id: string;
  nome: string;
  cpf_cnpj: string;
  inscricao_estadual?: string;
}

interface CategoriaContabil {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA' | 'AMBOS';
  ordem?: number;
}

interface ContasParticipantesTabProps {
  contas: Conta[];
  participantes: Participante[];
  categorias: CategoriaContabil[];
  onAddConta: (data: any) => Promise<boolean>;
  onEditConta: (data: any) => Promise<boolean>;
  onDeleteConta: (id: string) => Promise<boolean>;
  onAddParticipante: (data: any) => Promise<boolean>;
  onEditParticipante: (data: any) => Promise<boolean>;
  onDeleteParticipante: (id: string) => Promise<boolean>;
  onAddCategoria: (data: any) => Promise<boolean>;
  onEditCategoria: (data: any) => Promise<boolean>;
  onDeleteCategoria: (id: string) => Promise<boolean>;
}

export const ContasParticipantesTab: React.FC<ContasParticipantesTabProps> = ({
  contas,
  participantes,
  categorias,
  onAddConta,
  onEditConta,
  onDeleteConta,
  onAddParticipante,
  onEditParticipante,
  onDeleteParticipante,
  onAddCategoria,
  onEditCategoria,
  onDeleteCategoria,
}) => {
  // Modal Conta
  const [showContaModal, setShowContaModal] = useState(false);
  const [editingContaId, setEditingContaId] = useState<string | null>(null);
  const [bancoNome, setBancoNome] = useState('');
  const [agencia, setAgencia] = useState('');
  const [contaNumero, setContaNumero] = useState('');
  const [tipoConta, setTipoConta] = useState('Corrente');

  // Modal Participante
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partNome, setPartNome] = useState('');
  const [partCpfCnpj, setPartCpfCnpj] = useState('');
  const [partIE, setPartIE] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal Categoria
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNome, setCatNome] = useState('');
  const [catTipo, setCatTipo] = useState<'RECEITA' | 'DESPESA' | 'AMBOS'>('DESPESA');

  const handleOpenNewConta = () => {
    setEditingContaId(null);
    setBancoNome('');
    setAgencia('');
    setContaNumero('');
    setTipoConta('Corrente');
    setErrorMessage('');
    setShowContaModal(true);
  };

  const handleOpenEditConta = (c: Conta) => {
    setEditingContaId(c.id);
    setBancoNome(c.banco_nome || '');
    setAgencia(c.agencia || '');
    setContaNumero(c.conta_numero || '');
    setTipoConta(c.tipo_conta || 'Corrente');
    setErrorMessage('');
    setShowContaModal(true);
  };

  const handleOpenNewPart = () => {
    setEditingPartId(null);
    setPartNome('');
    setPartCpfCnpj('');
    setPartIE('');
    setErrorMessage('');
    setShowPartModal(true);
  };

  const handleOpenEditPart = (p: Participante) => {
    setEditingPartId(p.id);
    setPartNome(p.nome || '');
    setPartCpfCnpj(p.cpf_cnpj || '');
    setPartIE(p.inscricao_estadual || '');
    setErrorMessage('');
    setShowPartModal(true);
  };

  const handleSubmitConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bancoNome || !agencia || !contaNumero) {
      setErrorMessage('Preencha Banco, Agência e Conta.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    const payload = { id: editingContaId, banco_nome: bancoNome, agencia, conta_numero: contaNumero, tipo_conta: tipoConta };
    const ok = editingContaId ? await onEditConta(payload) : await onAddConta(payload);
    setIsSubmitting(false);

    if (ok) {
      setShowContaModal(false);
      setEditingContaId(null);
      setBancoNome('');
      setAgencia('');
      setContaNumero('');
    } else {
      setErrorMessage(editingContaId ? 'Erro ao atualizar conta bancária.' : 'Erro ao cadastrar conta bancária.');
    }
  };

  const handleSubmitParticipante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNome || !partCpfCnpj) {
      setErrorMessage('Preencha Nome e CPF/CNPJ.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    const payload = { id: editingPartId, nome: partNome, cpf_cnpj: partCpfCnpj, inscricao_estadual: partIE };
    const ok = editingPartId ? await onEditParticipante(payload) : await onAddParticipante(payload);
    setIsSubmitting(false);

    if (ok) {
      setShowPartModal(false);
      setEditingPartId(null);
      setPartNome('');
      setPartCpfCnpj('');
      setPartIE('');
    } else {
      setErrorMessage(editingPartId ? 'Erro ao atualizar participante.' : 'Erro ao cadastrar participante.');
    }
  };

  const handleOpenNewCat = () => {
    setEditingCatId(null);
    setCatNome('');
    setCatTipo('DESPESA');
    setErrorMessage('');
    setShowCatModal(true);
  };

  const handleOpenEditCat = (c: CategoriaContabil) => {
    setEditingCatId(c.id);
    setCatNome(c.nome);
    setCatTipo(c.tipo);
    setErrorMessage('');
    setShowCatModal(true);
  };

  const handleSubmitCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNome.trim()) {
      setErrorMessage('Preencha o nome da categoria.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    const payload = { id: editingCatId, nome: catNome.trim(), tipo: catTipo, ordem: 50 };
    const ok = editingCatId ? await onEditCategoria(payload) : await onAddCategoria(payload);
    setIsSubmitting(false);

    if (ok) {
      setShowCatModal(false);
      setEditingCatId(null);
      setCatNome('');
    } else {
      setErrorMessage('Erro ao salvar categoria. Verifique se o nome já existe.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* SECTION 1: CONTAS BANCÁRIAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Wallet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Contas Bancárias</h2>
              <p className="text-xs text-[#888]">Obrigatório para identificação no LCDPR</p>
            </div>
          </div>
          <button
            onClick={handleOpenNewConta}
            className="px-3.5 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Nova Conta
          </button>
        </div>

        <div className="space-y-3">
          {contas.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8F9FA] text-[#2D5A27] rounded-xl font-black text-xs">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1A1A1A]">{c.banco_nome}</h4>
                  <p className="text-xs text-[#666]">
                    Agência: <span className="font-bold">{c.agencia}</span> | Conta: <span className="font-bold">{c.conta_numero}</span> ({c.tipo_conta || 'Corrente'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditConta(c)}
                  className="p-1.5 text-slate-400 hover:text-[#2D5A27] rounded-lg hover:bg-emerald-50 cursor-pointer transition-all"
                  title="Editar Conta"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteConta(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-all"
                  title="Excluir Conta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {contas.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-[#E9ECEF] text-center text-[#999] text-xs">
              <Wallet size={32} className="mx-auto mb-2 opacity-40 text-blue-600" />
              Nenhuma conta bancária cadastrada.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PARTICIPANTES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-[#2D5A27] rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Participantes (CPF/CNPJ)</h2>
              <p className="text-xs text-[#888]">Fornecedores, Clientes e Parceiros Rurais</p>
            </div>
          </div>
          <button
            onClick={handleOpenNewPart}
            className="px-3.5 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Novo Participante
          </button>
        </div>

        <div className="space-y-3">
          {participantes.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8F9FA] text-[#2D5A27] rounded-xl">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1A1A1A]">{p.nome}</h4>
                  <p className="text-xs text-[#666]">
                    CPF/CNPJ: <span className="font-bold text-[#2D5A27]">{p.cpf_cnpj}</span> {p.inscricao_estadual ? `| IE: ${p.inscricao_estadual}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditPart(p)}
                  className="p-1.5 text-slate-400 hover:text-[#2D5A27] rounded-lg hover:bg-emerald-50 cursor-pointer transition-all"
                  title="Editar Participante"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteParticipante(p.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-all"
                  title="Excluir Participante"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {participantes.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-[#E9ECEF] text-center text-[#999] text-xs">
              <Users size={32} className="mx-auto mb-2 opacity-40 text-[#2D5A27]" />
              Nenhum participante cadastrado.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: CATEGORIAS CONTÁBEIS */}
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Tag size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">Categorias Contábeis</h2>
              <p className="text-xs text-[#888]">Personalize as classificações de receitas e despesas</p>
            </div>
          </div>
          <button
            onClick={handleOpenNewCat}
            className="px-3.5 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Nova Categoria
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categorias.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  c.tipo === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' :
                  c.tipo === 'DESPESA' ? 'bg-rose-50 text-rose-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {c.tipo === 'RECEITA' ? <ArrowUpRight size={18} /> :
                   c.tipo === 'DESPESA' ? <ArrowDownRight size={18} /> :
                   <Tag size={18} />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#1A1A1A]">{c.nome}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-700' :
                    c.tipo === 'DESPESA' ? 'bg-rose-100 text-rose-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{c.tipo}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditCat(c)}
                  className="p-1.5 text-slate-400 hover:text-[#2D5A27] rounded-lg hover:bg-emerald-50 cursor-pointer transition-all"
                  title="Editar Categoria"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteCategoria(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-all"
                  title="Excluir Categoria"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {categorias.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-[#E9ECEF] text-center text-[#999] text-xs sm:col-span-2 lg:col-span-3">
              <Tag size={32} className="mx-auto mb-2 opacity-40 text-amber-500" />
              Nenhuma categoria cadastrada. As categorias padrão serão criadas automaticamente.
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Conta */}
      {showContaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">
                {editingContaId ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </h3>
              <button onClick={() => setShowContaModal(false)} className="text-[#999] hover:text-[#333]">
                <X size={18} />
              </button>
            </div>

            {errorMessage && <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>}

            <form onSubmit={handleSubmitConta} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Nome do Banco *</label>
                <input
                  type="text"
                  placeholder="Ex: Banco do Brasil, Sicredi, Itaú"
                  value={bancoNome}
                  onChange={(e) => setBancoNome(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Agência *</label>
                  <input
                    type="text"
                    placeholder="Ex: 1234-5"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Nº Conta *</label>
                  <input
                    type="text"
                    placeholder="Ex: 98765-0"
                    value={contaNumero}
                    onChange={(e) => setContaNumero(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowContaModal(false)} className="px-4 py-2 text-xs font-bold text-[#666]">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl cursor-pointer">
                  {isSubmitting ? 'Salvando...' : (editingContaId ? 'Salvar Alterações' : 'Salvar Conta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Participante */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">
                {editingPartId ? 'Editar Participante' : 'Novo Participante'}
              </h3>
              <button onClick={() => setShowPartModal(false)} className="text-[#999] hover:text-[#333]">
                <X size={18} />
              </button>
            </div>

            {errorMessage && <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>}

            <form onSubmit={handleSubmitParticipante} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  placeholder="Ex: Agropecuária Silva ou João da Silva"
                  value={partNome}
                  onChange={(e) => setPartNome(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">CPF ou CNPJ *</label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                  value={partCpfCnpj}
                  onChange={(e) => setPartCpfCnpj(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Inscrição Estadual (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 123/456789"
                  value={partIE}
                  onChange={(e) => setPartIE(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowPartModal(false)} className="px-4 py-2 text-xs font-bold text-[#666]">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl cursor-pointer">
                  {isSubmitting ? 'Salvando...' : (editingPartId ? 'Salvar Alterações' : 'Salvar Participante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Categoria */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">
                {editingCatId ? 'Editar Categoria' : 'Nova Categoria Contábil'}
              </h3>
              <button onClick={() => setShowCatModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {errorMessage && <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>}

            <form onSubmit={handleSubmitCategoria} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  placeholder="Ex: Frete de Gado, Arrendamento, Sementes"
                  value={catNome}
                  onChange={(e) => setCatNome(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Tipo *</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                  <button
                    type="button"
                    onClick={() => setCatTipo('DESPESA')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      catTipo === 'DESPESA' ? 'bg-rose-600 text-white shadow-sm' : 'text-[#666]'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatTipo('RECEITA')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      catTipo === 'RECEITA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#666]'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatTipo('AMBOS')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      catTipo === 'AMBOS' ? 'bg-blue-600 text-white shadow-sm' : 'text-[#666]'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-xs font-bold text-[#666] cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl cursor-pointer">
                  {isSubmitting ? 'Salvando...' : (editingCatId ? 'Salvar Alterações' : 'Criar Categoria')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
