'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  DollarSign, 
  FileText, 
  Wallet, 
  Boxes, 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Plus, 
  Upload,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Lock,
  ShieldAlert,
  LogIn,
  Landmark
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

import { DashboardTab } from './DashboardTab';
import { LancamentosTab } from './LancamentosTab';
import { FazendasTab } from './FazendasTab';
import { ContasParticipantesTab } from './ContasParticipantesTab';
import { LcdprTab } from './LcdprTab';
import { AlmoxarifadoTab } from './AlmoxarifadoTab';
import { RelatoriosTab } from './RelatoriosTab';
import { FinanciamentosTab } from './FinanciamentosTab';
import { FinanciamentoInput } from '@/lib/financiamento-calculator';

export const GestaoModule: React.FC = () => {
  const { user, isAuthReady, setAuthMode, setShowAuthModal } = useUser();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos' | 'fazendas' | 'contas' | 'lcdpr' | 'almoxarifado' | 'relatorios' | 'financiamentos'>('dashboard');

  const [fazendas, setFazendas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [financiamentos, setFinanciamentos] = useState<FinanciamentoInput[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch real data from server (Supabase)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resFazendas, resContas, resPart, resLanc, resProdutos, resFinanc] = await Promise.all([
        authenticatedFetch('/api/financeiro/fazendas'),
        authenticatedFetch('/api/financeiro/contas'),
        authenticatedFetch('/api/financeiro/participantes'),
        authenticatedFetch('/api/financeiro/lancamentos'),
        authenticatedFetch('/api/financeiro/almoxarifado'),
        authenticatedFetch('/api/financeiro/financiamentos')
      ]);

      if (resFazendas.ok) {
        const data = await resFazendas.json();
        setFazendas(Array.isArray(data) ? data : []);
      }
      if (resContas.ok) {
        const data = await resContas.json();
        setContas(Array.isArray(data) ? data : []);
      }
      if (resPart.ok) {
        const data = await resPart.json();
        setParticipantes(Array.isArray(data) ? data : []);
      }
      if (resLanc.ok) {
        const data = await resLanc.json();
        setLancamentos(Array.isArray(data) ? data : []);
      }
      if (resProdutos.ok) {
        const data = await resProdutos.json();
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria || 'Geral',
            quantidade: parseFloat(p.quantidade_atual || 0),
            unidade: p.unidade_medida || 'UN',
            custo_medio: parseFloat(p.custo_medio || 0),
            movimentacoes: p.almoxarifado_movimentacoes || []
          }));
          setProdutos(mapped);
        } else {
          setProdutos([]);
        }
      }
      if (resFinanc && resFinanc.ok) {
        const data = await resFinanc.json();
        setFinanciamentos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddFinanciamento = async (fin: FinanciamentoInput) => {
    try {
      const res = await authenticatedFetch('/api/financeiro/financiamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fin),
      });

      if (res.ok) {
        const newFin = await res.json();
        setFinanciamentos(prev => [newFin, ...prev]);
      } else {
        const fallbackFin = { id: 'fin-' + Date.now(), ...fin };
        setFinanciamentos(prev => [fallbackFin, ...prev]);
      }
    } catch (err) {
      const fallbackFin = { id: 'fin-' + Date.now(), ...fin };
      setFinanciamentos(prev => [fallbackFin, ...prev]);
    }
  };

  const handleDeleteFinanciamento = async (id: string) => {
    try {
      await authenticatedFetch(`/api/financeiro/financiamentos?id=${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Erro ao deletar financiamento:', err);
    } finally {
      setFinanciamentos(prev => prev.filter(f => f.id !== id));
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Add/Delete
  const syncItensToAlmoxarifado = (payload: any) => {
    if (!payload.itens || !Array.isArray(payload.itens) || payload.itens.length === 0) return;

    setProdutos(prevProdutos => {
      const updated = [...prevProdutos];
      payload.itens.forEach((item: any) => {
        const itemQtd = parseFloat(item.quantidade || 1);
        const itemVal = parseFloat(item.valor_unitario || item.valor_total || 0);
        const itemCat = item.classificacao_item || payload.classificacao || 'Geral';
        const existingIdx = updated.findIndex(p => p.nome.toLowerCase().trim() === item.descricao.toLowerCase().trim());

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantidade: (updated[existingIdx].quantidade || 0) + itemQtd,
            custo_medio: itemVal > 0 ? itemVal : updated[existingIdx].custo_medio
          };
        } else {
          updated.unshift({
            id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            nome: item.descricao,
            categoria: itemCat,
            quantidade: itemQtd,
            unidade: item.unidade || 'UN',
            custo_medio: itemVal
          });
        }
      });
      return updated;
    });
  };

  const handleAddLancamento = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        // Sync items to local almoxarifado state for immediate UI feedback
        syncItensToAlmoxarifado(payload);
        return true;
      }
    } catch (e) {
      console.warn('API fallback for lancamentos:', e);
    }

    // Fallback local addition for instant UI response
    const selectedFazenda = fazendas.find(f => f.id === payload.fazenda_id);
    const selectedConta = contas.find(c => c.id === payload.conta_id);
    const selectedPart = participantes.find(p => p.id === payload.participante_id);

    const newLancamento = {
      id: 'lanc-' + Date.now(),
      ...payload,
      fazendas: selectedFazenda ? { nome: selectedFazenda.nome, nirf_cafir: selectedFazenda.nirf_cafir } : undefined,
      contas_bancarias: selectedConta ? { banco_nome: selectedConta.banco_nome, conta_numero: selectedConta.conta_numero } : undefined,
      participantes: selectedPart ? { nome: selectedPart.nome, cpf_cnpj: selectedPart.cpf_cnpj } : undefined,
    };

    setLancamentos([newLancamento, ...lancamentos]);

    // Automatically sync NF-e / itemized insumos with Almoxarifado (Stock)
    syncItensToAlmoxarifado(payload);

    return true;
  };

  const handleEditLancamento = async (id: string, data: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/lancamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });

      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (err) {
      console.warn('Falha na API ao editar lançamento, aplicando atualização local:', err);
    }

    const fazendaObj = fazendas.find(f => f.id === data.fazenda_id);
    const contaObj = contas.find(c => c.id === data.conta_id);
    const partObj = participantes.find(p => p.id === data.participante_id);

    setLancamentos(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          ...data,
          fazendas: fazendaObj || l.fazendas,
          contas_bancarias: contaObj || l.contas_bancarias,
          participantes: partObj || l.participantes,
          lancamento_itens: data.itens || l.lancamento_itens
        };
      }
      return l;
    }));
    return true;
  };

  const handleDeleteLancamento = async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`/api/financeiro/lancamentos?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback for delete lancamento:', e);
    }
    setLancamentos(lancamentos.filter(l => l.id !== id));
    return true;
  };

  const handleAddFazenda = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/fazendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback for fazendas:', e);
    }
    const newFazenda = { id: 'faz-' + Date.now(), ...payload };
    setFazendas([newFazenda, ...fazendas]);
    return true;
  };

  const handleEditFazenda = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/fazendas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback for edit fazenda:', e);
    }
    setFazendas(fazendas.map(f => f.id === payload.id ? { ...f, ...payload } : f));
    return true;
  };

  const handleDeleteFazenda = async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`/api/financeiro/fazendas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback delete fazenda:', e);
    }
    setFazendas(fazendas.filter(f => f.id !== id));
    return true;
  };

  const handleAddConta = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback conta:', e);
    }
    const newConta = { id: 'cta-' + Date.now(), ...payload };
    setContas([newConta, ...contas]);
    return true;
  };

  const handleEditConta = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/contas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback edit conta:', e);
    }
    setContas(contas.map(c => c.id === payload.id ? { ...c, ...payload } : c));
    return true;
  };

  const handleDeleteConta = async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`/api/financeiro/contas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback delete conta:', e);
    }
    setContas(contas.filter(c => c.id !== id));
    return true;
  };

  const handleAddParticipante = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/participantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback participante:', e);
    }
    const newPart = { id: 'part-' + Date.now(), ...payload };
    setParticipantes([newPart, ...participantes]);
    return true;
  };

  const handleEditParticipante = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/participantes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback edit participante:', e);
    }
    setParticipantes(participantes.map(p => p.id === payload.id ? { ...p, ...payload } : p));
    return true;
  };


  const handleDeleteParticipante = async (id: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`/api/financeiro/participantes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback delete part:', e);
    }
    setParticipantes(participantes.filter(p => p.id !== id));
    return true;
  };

  const handleAddProduto = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/almoxarifado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback add produto:', e);
    }
    const newProd = { id: 'prod-' + Date.now(), ...payload };
    setProdutos([newProd, ...produtos]);
    return true;
  };

  const handleMovimentoEstoque = async (payload: any): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/financeiro/almoxarifado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'movement', ...payload })
      });
      if (res.ok) {
        await loadData();
        return true;
      }
    } catch (e) {
      console.warn('API fallback movimento estoque:', e);
    }
    setProdutos(prev => prev.map(p => {
      if (p.id === payload.produto_id) {
        const qtd = parseFloat(payload.quantidade) || 0;
        const newQtd = payload.tipo_movimentacao === 'SAIDA' ? Math.max(0, (p.quantidade || 0) - qtd) : (p.quantidade || 0) + qtd;
        return { ...p, quantidade: newQtd };
      }
      return p;
    }));
    return true;
  };


  const handleImportXml = async (fileOrKey: File | string): Promise<any> => {
    let res;
    if (typeof fileOrKey === 'string') {
      res = await authenticatedFetch('/api/financeiro/xml-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: fileOrKey }),
      });
    } else {
      const formData = new FormData();
      formData.append('file', fileOrKey);
      res = await authenticatedFetch('/api/financeiro/xml-import', {
        method: 'POST',
        body: formData,
      });
    }

    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao processar a Nota Fiscal');
  };

  // Calculations for Dashboard
  const totalReceita = lancamentos
    .filter(l => l.tipo_movimento === 'RECEITA')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const totalDespesa = lancamentos
    .filter(l => l.tipo_movimento === 'DESPESA')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const saldo = totalReceita - totalDespesa;

  // Monthly chart data calculation based exclusively on real lancamentos
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyMap: Record<string, { label: string; yearMonth: string; receitas: number; despesas: number }> = {};

  lancamentos.forEach(l => {
    if (!l.data_pagamento) return;

    let year = '';
    let monthIdx = -1;
    let yearMonth = '';

    const parts = l.data_pagamento.split('T')[0].split('-');
    if (parts.length === 3) {
      year = parts[0];
      monthIdx = parseInt(parts[1], 10) - 1;
      yearMonth = `${year}-${parts[1].padStart(2, '0')}`;
    } else {
      const d = new Date(l.data_pagamento);
      if (!isNaN(d.getTime())) {
        year = String(d.getFullYear());
        monthIdx = d.getMonth();
        yearMonth = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      }
    }

    if (monthIdx >= 0 && monthIdx < 12 && year) {
      const label = `${monthNames[monthIdx]}/${year.substring(2)}`;
      if (!monthlyMap[yearMonth]) {
        monthlyMap[yearMonth] = { label, yearMonth, receitas: 0, despesas: 0 };
      }
      const val = parseFloat(l.valor || 0);
      if (l.tipo_movimento === 'RECEITA') {
        monthlyMap[yearMonth].receitas += val;
      } else if (l.tipo_movimento === 'DESPESA') {
        monthlyMap[yearMonth].despesas += val;
      }
    }
  });

  const monthlyData = Object.values(monthlyMap)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .map(item => ({
      mes: item.label,
      receitas: item.receitas,
      despesas: item.despesas,
    }));

  // Category breakdown
  const catMap: Record<string, { valor: number; tipo: 'RECEITA' | 'DESPESA' }> = {};
  lancamentos.forEach(l => {
    const cat = l.classificacao || 'Geral';
    if (!catMap[cat]) {
      catMap[cat] = { valor: 0, tipo: l.tipo_movimento };
    }
    catMap[cat].valor += l.valor;
  });

  const categoryBreakdown = Object.keys(catMap).map(c => ({
    categoria: c,
    valor: catMap[c].valor,
    tipo: catMap[c].tipo,
  }));

  if (!isAuthReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#F8F9FA]">
        <div className="flex items-center gap-3 text-[#2D5A27] text-xs font-extrabold animate-pulse">
          <RefreshCw className="animate-spin text-[#2D5A27]" size={20} />
          Verificando permissões de acesso ao Módulo de Gestão...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8F9FA]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-100 text-[#2D5A27] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Módulo de Gestão Restrito</h2>
            <p className="text-xs text-[#666] leading-relaxed">
              O acesso ao módulo de <strong>Gestão Financeira, Almoxarifado, LCDPR e Fazendas</strong> é exclusivo para produtores rurais autenticados.
            </p>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl p-4 text-xs text-[#555] space-y-2 text-left">
            <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
              <ShieldAlert size={16} className="text-[#2D5A27]" /> Recursos disponíveis para usuários logados:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#666] font-medium">
              <li>Livro Caixa & Escrituração Contábil</li>
              <li>Gestão de Estoque do Almoxarifado</li>
              <li>Exportação fiscal LCDPR da Receita Federal</li>
              <li>Relatórios de Rentabilidade e ROI</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="flex-1 py-3 bg-[#2D5A27] text-white font-bold text-xs rounded-xl hover:bg-[#1E3D1A] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Entrar na minha Conta
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="flex-1 py-3 bg-emerald-50 text-[#2D5A27] font-bold text-xs rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer flex items-center justify-center"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Container */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl p-2 border border-[#E9ECEF] shadow-sm mb-6 flex items-center overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <LayoutDashboard size={16} /> Visão Geral & DRE
          </button>

          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'lancamentos' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <DollarSign size={16} /> Livro Caixa & XML
          </button>

          <button
            onClick={() => setActiveTab('lcdpr')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'lcdpr' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <FileText size={16} /> Exportador LCDPR
          </button>

          <button
            onClick={() => setActiveTab('fazendas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'fazendas' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <Building2 size={16} /> Fazendas & Parcerias
          </button>

          <button
            onClick={() => setActiveTab('contas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'contas' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <Wallet size={16} /> Contas & Participantes
          </button>

          <button
            onClick={() => setActiveTab('almoxarifado')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'almoxarifado' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <Boxes size={16} /> Almoxarifado
          </button>

          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'relatorios' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <BarChart3 size={16} /> Relatórios & Rentabilidade
          </button>

          <button
            onClick={() => setActiveTab('financiamentos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'financiamentos' ? 'bg-[#2D5A27] text-white shadow-md' : 'text-[#666] hover:bg-[#F8F9FA] hover:text-[#333]'
            }`}
          >
            <Landmark size={16} /> Financiamentos & Custo de Capital
          </button>
        </div>

        {/* Tab Content Render */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            summary={{
              totalReceita,
              totalDespesa,
              saldo,
              totalFazendas: fazendas.length,
              totalLancamentos: lancamentos.length,
            }}
            monthlyData={monthlyData}
            categoryBreakdown={categoryBreakdown}
            onOpenNewLancamento={() => setActiveTab('lancamentos')}
            onOpenXmlImport={() => setActiveTab('lancamentos')}
            onSelectTab={(tab: any) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'lancamentos' && (
          <LancamentosTab
            lancamentos={lancamentos}
            fazendas={fazendas}
            contas={contas}
            participantes={participantes}
            onAddLancamento={handleAddLancamento}
            onEditLancamento={handleEditLancamento}
            onDeleteLancamento={handleDeleteLancamento}
            onImportXml={handleImportXml}
          />
        )}

        {activeTab === 'fazendas' && (
          <FazendasTab
            fazendas={fazendas}
            onAddFazenda={handleAddFazenda}
            onEditFazenda={handleEditFazenda}
            onDeleteFazenda={handleDeleteFazenda}
          />
        )}

        {activeTab === 'contas' && (
          <ContasParticipantesTab
            contas={contas}
            participantes={participantes}
            onAddConta={handleAddConta}
            onEditConta={handleEditConta}
            onDeleteConta={handleDeleteConta}
            onAddParticipante={handleAddParticipante}
            onEditParticipante={handleEditParticipante}
            onDeleteParticipante={handleDeleteParticipante}
          />
        )}

        {activeTab === 'lcdpr' && (
          <LcdprTab
            lancamentos={lancamentos}
            fazendas={fazendas}
            userCpf={user?.cpf || '012.345.678-90'}
          />
        )}

        {activeTab === 'almoxarifado' && (
          <AlmoxarifadoTab
            produtos={produtos}
            onAddProduto={handleAddProduto}
            onMovimentoEstoque={handleMovimentoEstoque}
          />
        )}

        {activeTab === 'relatorios' && (
          <RelatoriosTab
            lancamentos={lancamentos}
            fazendas={fazendas}
            produtos={produtos}
          />
        )}

        {activeTab === 'financiamentos' && (
          <FinanciamentosTab
            financiamentos={financiamentos}
            fazendas={fazendas}
            contas={contas}
            onAddFinanciamento={handleAddFinanciamento}
            onDeleteFinanciamento={handleDeleteFinanciamento}
          />
        )}

      </div>
    </div>
  );
};
