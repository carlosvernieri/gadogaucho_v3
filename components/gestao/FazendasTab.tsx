'use client';

import React, { useState } from 'react';
import { Building2, Plus, Trash2, Edit2, X, AlertCircle, Users, CheckCircle, ShieldCheck } from 'lucide-react';

interface Parceria {
  nome_socio: string;
  cpf_socio: string;
  percentual_participacao: number;
}

interface Fazenda {
  id: string;
  nome: string;
  nirf_cafir: string;
  incra?: string;
  area_total: number;
  parcerias_imoveis?: Parceria[];
}

interface FazendasTabProps {
  fazendas: Fazenda[];
  onAddFazenda: (data: any) => Promise<boolean>;
  onEditFazenda: (data: any) => Promise<boolean>;
  onDeleteFazenda: (id: string) => Promise<boolean>;
}

export const FazendasTab: React.FC<FazendasTabProps> = ({
  fazendas,
  onAddFazenda,
  onEditFazenda,
  onDeleteFazenda,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [nome, setNome] = useState('');
  const [nirfCafir, setNirfCafir] = useState('');
  const [incra, setIncra] = useState('');
  const [areaTotal, setAreaTotal] = useState('');
  const [parcerias, setParcerias] = useState<Parceria[]>([]);

  // Parceria draft
  const [socioNome, setSocioNome] = useState('');
  const [socioCpf, setSocioCpf] = useState('');
  const [socioPerc, setSocioPerc] = useState('');

  const handleOpenEdit = (f: Fazenda) => {
    setEditingId(f.id);
    setNome(f.nome || '');
    setNirfCafir(f.nirf_cafir || '');
    setIncra(f.incra || '');
    setAreaTotal(f.area_total ? f.area_total.toString() : '');
    setParcerias(f.parcerias_imoveis || []);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleAddSocio = () => {
    if (!socioNome || !socioCpf || !socioPerc) return;
    setParcerias([
      ...parcerias,
      {
        nome_socio: socioNome,
        cpf_socio: socioCpf,
        percentual_participacao: parseFloat(socioPerc) || 0,
      }
    ]);
    setSocioNome('');
    setSocioCpf('');
    setSocioPerc('');
  };

  const handleRemoveSocio = (idx: number) => {
    setParcerias(parcerias.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !nirfCafir) {
      setErrorMessage('Nome e NIRF/CAFIR são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      id: editingId,
      nome,
      nirf_cafir: nirfCafir,
      incra,
      area_total: parseFloat(areaTotal || '0'),
      parcerias,
    };

    const ok = editingId 
      ? await onEditFazenda(payload) 
      : await onAddFazenda(payload);
    setIsSubmitting(false);

    if (ok) {
      setShowModal(false);
      resetForm();
    } else {
      setErrorMessage(editingId ? 'Erro ao atualizar fazenda.' : 'Erro ao cadastrar fazenda.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setNirfCafir('');
    setIncra('');
    setAreaTotal('');
    setParcerias([]);
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Minhas Fazendas & Imóveis Rurais</h2>
          <p className="text-xs text-[#888]">Cadastro de propriedades (NIRF/CAFIR) e sociedades/condomínios para escrituração contábil</p>
        </div>

        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2.5 bg-[#2D5A27] text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Plus size={18} /> Nova Fazenda
        </button>
      </div>

      {/* Grid of Fazendas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fazendas.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl border border-[#E9ECEF] p-6 shadow-sm hover:shadow-md transition-shadow relative space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-[#2D5A27] rounded-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1A1A1A]">{f.nome}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                    <ShieldCheck size={12} /> NIRF: {f.nirf_cafir}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(f)}
                  className="p-1.5 text-slate-400 hover:text-[#2D5A27] rounded-lg hover:bg-emerald-50 transition-all cursor-pointer"
                  title="Editar Fazenda"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteFazenda(f.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                  title="Excluir Fazenda"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E9ECEF]">
              <div>
                <span className="text-[#888] block text-[10px] font-bold uppercase">Área Total</span>
                <span className="font-extrabold text-[#333]">{f.area_total ? `${f.area_total} ha` : 'Não informada'}</span>
              </div>
              <div>
                <span className="text-[#888] block text-[10px] font-bold uppercase">Cód. INCRA</span>
                <span className="font-semibold text-[#333]">{f.incra || 'S/N'}</span>
              </div>
            </div>

            {/* Parcerias / Sociedades */}
            {f.parcerias_imoveis && f.parcerias_imoveis.length > 0 && (
              <div className="pt-2 border-t border-[#E9ECEF]">
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#666] mb-2">
                  <Users size={14} className="text-[#2D5A27]" /> Sociedade / Condomínio Rural:
                </div>
                <div className="space-y-1">
                  {f.parcerias_imoveis.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2 rounded-lg">
                      <span className="font-medium text-[#333]">{p.nome_socio}</span>
                      <span className="font-bold text-[#2D5A27]">{p.percentual_participacao}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {fazendas.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-[#E9ECEF] text-center text-[#999]">
            <Building2 size={40} className="mx-auto mb-2 opacity-40 text-[#2D5A27]" />
            <p className="font-semibold text-sm">Nenhuma fazenda cadastrada</p>
            <p className="text-xs text-[#aaa] mt-1">Cadastre sua fazenda com NIRF/CAFIR para habilitar a escrituração contábil.</p>
          </div>
        )}
      </div>

      {/* Modal Nova Fazenda */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-4">
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <Building2 size={24} />
                <h3 className="text-lg font-extrabold text-[#1A1A1A]">
                  {editingId ? 'Editar Imóvel Rural' : 'Cadastrar Imóvel Rural'}
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
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Nome da Fazenda / Propriedade *</label>
                <input
                  type="text"
                  placeholder="Ex: Fazenda Coxilha Vermelha"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">NIRF / CAFIR *</label>
                  <input
                    type="text"
                    placeholder="Ex: 1.234.567-8"
                    value={nirfCafir}
                    onChange={(e) => setNirfCafir(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#444] mb-1">Área Total (Hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 250"
                    value={areaTotal}
                    onChange={(e) => setAreaTotal(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#444] mb-1">Código INCRA (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 950.081.012.345"
                  value={incra}
                  onChange={(e) => setIncra(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-2.5 text-xs outline-none focus:border-[#2D5A27]"
                />
              </div>

              {/* Condomínio / Sociedades (Opcional) */}
              <div className="pt-3 border-t border-[#E9ECEF]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#333] flex items-center gap-1">
                    <Users size={14} className="text-[#2D5A27]" /> Sócios / Condôminos (Rateio LCDPR)
                  </span>
                  <span className="text-[10px] text-[#888]">{parcerias.length} cadastrados</span>
                </div>

                {parcerias.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[#F8F9FA] rounded-lg text-xs mb-1.5">
                    <span>{p.nome_socio} ({p.cpf_socio})</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#2D5A27]">{p.percentual_participacao}%</span>
                      <button type="button" onClick={() => handleRemoveSocio(idx)} className="text-rose-500 hover:text-rose-700">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-12 gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Nome sócio"
                    value={socioNome}
                    onChange={(e) => setSocioNome(e.target.value)}
                    className="col-span-5 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="CPF"
                    value={socioCpf}
                    onChange={(e) => setSocioCpf(e.target.value)}
                    className="col-span-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="%"
                    value={socioPerc}
                    onChange={(e) => setSocioPerc(e.target.value)}
                    className="col-span-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg p-2 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSocio}
                    className="col-span-1 bg-emerald-100 text-[#2D5A27] font-bold text-xs rounded-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
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
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Fazenda')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
