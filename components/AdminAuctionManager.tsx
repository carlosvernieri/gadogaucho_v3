'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, MapPin, Calendar, 
  DollarSign, TrendingUp, Users, ChevronRight, 
  ChevronDown, Info, X, Link, Play, Activity
} from 'lucide-react';
import { AuctionPlaza, Auction, AuctionOffer } from '@/types/auction';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import { showToast } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';

import { AuctionScatterChart } from './AuctionScatterChart';

const RSMap = dynamic(() => import('./RSMap').then(mod => mod.RSMap), { ssr: false });

export function AdminAuctionManager() {
  const [plazas, setPlazas] = useState<AuctionPlaza[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [innerTab, setInnerTab] = useState<'plazas' | 'auctions' | 'analytics'>('plazas');

  // Modal States
  const [showPlazaModal, setShowPlazaModal] = useState(false);
  const [editingPlaza, setEditingPlaza] = useState<AuctionPlaza | null>(null);
  const [plazaForm, setPlazaForm] = useState({ name: '', city: '', lat: 0, lng: 0 });
  const [citySearchPlaza, setCitySearchPlaza] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [auctionForm, setAuctionForm] = useState({ plaza_id: '', auction_date: '', commission: 0, video_url: '' });
  const [isProcessingOcr, setIsProcessingOcr] = useState<number | null>(null);

  const [expandedAuctionId, setExpandedAuctionId] = useState<number | null>(null);
  const [auctionOffers, setAuctionOffers] = useState<{ [key: number]: AuctionOffer[] }>({});
  const [loadingOffers, setLoadingOffers] = useState<number | null>(null);
  const [offerCategoryFilter, setOfferCategoryFilter] = useState('');

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AuctionOffer | null>(null);
  const [offerForm, setOfferForm] = useState({
    auction_id: 0,
    category: '',
    breed: '',
    price_kg: 0,
    price: 0,
    avg_weight: 0,
    batch_size: 1,
    seller_name: '',
    seller_city: '',
    seller_lat: 0,
    seller_lng: 0
  });
  const [citySearchOffer, setCitySearchOffer] = useState('');
  const [showOfferCitySuggestions, setShowOfferCitySuggestions] = useState(false);

  const citySuggestionsPlaza = React.useMemo(() => {
    if (!showCitySuggestions) return [];
    if (citySearchPlaza.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchPlaza.toLowerCase()));
  }, [citySearchPlaza, showCitySuggestions]);

  const citySuggestionsOffer = React.useMemo(() => {
    if (!showOfferCitySuggestions) return [];
    if (citySearchOffer.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchOffer.toLowerCase()));
  }, [citySearchOffer, showOfferCitySuggestions]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plazasRes, auctionsRes] = await Promise.all([
        fetch('/api/admin/auction-plazas'),
        fetch('/api/admin/auctions')
      ]);
      if (plazasRes.ok) setPlazas(await plazasRes.json());
      if (auctionsRes.ok) setAuctions(await auctionsRes.json());
    } catch (error) {
      showToast('Erro ao carregar dados de leilão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (auctionId: number) => {
    setLoadingOffers(auctionId);
    try {
      const res = await fetch(`/api/admin/auction-offers?auctionId=${auctionId}`);
      if (res.ok) {
        const data = await res.json();
        setAuctionOffers(prev => ({ ...prev, [auctionId]: data }));
      }
    } catch (error) {
      showToast('Erro ao carregar ofertas', 'error');
    } finally {
      setLoadingOffers(null);
    }
  };

  const handleOpenEditPlaza = (p: AuctionPlaza) => {
    setEditingPlaza(p);
    setPlazaForm({ name: p.name, city: p.city, lat: p.lat, lng: p.lng });
    setCitySearchPlaza(p.city);
    setShowPlazaModal(true);
  };

  // Plaza CRUD
  const handleSavePlaza = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === citySearchPlaza.toLowerCase());
    const payload = { 
      ...plazaForm, 
      city: citySearchPlaza,
      lat: cityData?.lat || 0,
      lng: cityData?.lng || 0
    };

    try {
      const url = editingPlaza ? `/api/admin/auction-plazas/${editingPlaza.id}` : '/api/admin/auction-plazas';
      const res = await fetch(url, {
        method: editingPlaza ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingPlaza ? 'Praça atualizada' : 'Praça criada', 'success');
        setShowPlazaModal(false);
        fetchData();
      }
    } catch (err) {
      showToast('Erro ao salvar praça', 'error');
    }
  };

  const handleDeletePlaza = async (id: number) => {
    if (!confirm('Tem certeza? Isso excluirá todos os leilões associados.')) return;
    try {
      const res = await fetch(`/api/admin/auction-plazas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Praça removida', 'success');
        fetchData();
      }
    } catch (err) {
      showToast('Erro ao remover praça', 'error');
    }
  };

  // Auction CRUD
  const handleSaveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAuction ? `/api/admin/auctions/${editingAuction.id}` : '/api/admin/auctions';
      const res = await fetch(url, {
        method: editingAuction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionForm)
      });
      if (res.ok) {
        showToast(editingAuction ? 'Leilão atualizado' : 'Leilão criado', 'success');
        setShowAuctionModal(false);
        fetchData();
      }
    } catch (err) {
      showToast('Erro ao salvar leilão', 'error');
    }
  };

  const handleDeleteAuction = async (id: number) => {
    if (!confirm('Tem certeza? Isso excluirá todas as ofertas associadas.')) return;
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Leilão removido', 'success');
        fetchData();
      }
    } catch (err) {
      showToast('Erro ao remover leilão', 'error');
    }
  };

  const handleProcessOcr = async (auction: Auction) => {
    if (!auction.video_url) return showToast('Adicione um link do YouTube primeiro!', 'error');
    
    setIsProcessingOcr(auction.id);
    try {
      const res = await fetch('/api/admin/auctions/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id, videoUrl: auction.video_url, plazaName: auction.plaza?.name })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchOffers(auction.id);
        if (expandedAuctionId !== auction.id) setExpandedAuctionId(auction.id);
      } else {
        showToast(data.error || 'Erro no processamento', 'error');
      }
    } catch (err) {
      showToast('Erro ao conectar com o serviço de OCR', 'error');
    } finally {
      setIsProcessingOcr(null);
    }
  };

  // Offer CRUD
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === citySearchOffer.toLowerCase());
    const payload = {
      ...offerForm,
      seller_city: citySearchOffer,
      seller_lat: cityData?.lat || 0,
      seller_lng: cityData?.lng || 0
    };

    try {
      const url = editingOffer ? `/api/admin/auction-offers/${editingOffer.id}` : '/api/admin/auction-offers';
      const res = await fetch(url, {
        method: editingOffer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingOffer ? 'Oferta atualizada' : 'Oferta adicionada', 'success');
        setShowOfferModal(false);
        fetchOffers(offerForm.auction_id);
      }
    } catch (err) {
      showToast('Erro ao salvar oferta', 'error');
    }
  };

  const handleDeleteOffer = async (id: number, auctionId: number) => {
    if (!confirm('Excluir oferta?')) return;
    try {
      const res = await fetch(`/api/admin/auction-offers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Oferta removida', 'success');
        fetchOffers(auctionId);
      }
    } catch (err) {
      showToast('Erro ao remover oferta', 'error');
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 border-b border-[#E9ECEF] pb-4">
        <button
          onClick={() => setInnerTab('plazas')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${innerTab === 'plazas' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
        >
          Praças de Leilão
        </button>
        <button
          onClick={() => setInnerTab('auctions')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${innerTab === 'auctions' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
        >
          Calendário de Leilões
        </button>
        <button
          onClick={() => setInnerTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${innerTab === 'analytics' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
        >
          <TrendingUp size={16} /> Gráfico de Ofertas (Preço x Peso)
        </button>
      </div>

      {innerTab === 'plazas' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#333]">Gestão de Praças</h3>
            <button
              onClick={() => {
                setEditingPlaza(null);
                setPlazaForm({ name: '', city: '', lat: 0, lng: 0 });
                setCitySearchPlaza('');
                setShowPlazaModal(true);
              }}
              className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Nova Praça
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plazas.map(p => (
              <div key={p.id} className="bg-[#F8F9FA] p-4 rounded-2xl border border-[#E9ECEF] group hover:border-[#2D5A27] transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#2D5A27] shadow-sm">
                    <MapPin size={20} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleOpenEditPlaza(p)}
                      className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePlaza(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-[#333]">{p.name}</h4>
                <p className="text-sm text-[#666] flex items-center gap-1 mt-1">
                  <Info size={14} className="opacity-40" /> {p.city}
                </p>
                <div className="mt-4 pt-4 border-t border-white/60 flex justify-between text-[10px] text-[#999] font-medium uppercase tracking-wider">
                   <span>ID: #{p.id}</span>
                   <span>LAT: {p.lat.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mapa de Distribuição Geográfica */}
          <RSMap plazas={plazas} onEditPlaza={handleOpenEditPlaza} />
        </div>
      ) : innerTab === 'auctions' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#333]">Gestão de Leilões</h3>
            <button
              onClick={() => {
                if (plazas.length === 0) return showToast('Cadastre uma praça primeiro!', 'error');
                setEditingAuction(null);
                setAuctionForm({ plaza_id: plazas[0].id.toString(), auction_date: '', commission: 0, video_url: '' });
                setShowAuctionModal(true);
              }}
              className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Novo Leilão
            </button>
          </div>

          <div className="space-y-3">
            {auctions.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-[#E9ECEF] overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-[#F8F9FA]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#E9F0E8] rounded-xl flex items-center justify-center text-[#2D5A27]">
                       <Calendar size={22} />
                    </div>
                    <div>
                      <div className="font-bold text-[#333] flex items-center gap-2">
                        {new Date(a.auction_date).toLocaleDateString('pt-BR')} 
                        <span className="text-xs font-normal text-[#999]">em {a.plaza?.name}</span>
                      </div>
                      <div className="text-xs text-[#666] flex items-center gap-3 mt-1">
                         <span className="flex items-center gap-1"><DollarSign size={12} /> Comissão: {a.commission}%</span>
                         <span className="flex items-center gap-1"><Users size={12} /> {auctionOffers[a.id]?.length || 0} Ofertas</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (expandedAuctionId === a.id) setExpandedAuctionId(null);
                        else {
                          setExpandedAuctionId(a.id);
                          setOfferCategoryFilter('');
                          if (!auctionOffers[a.id]) fetchOffers(a.id);
                        }
                      }}
                      className={`p-2 rounded-lg transition-all ${expandedAuctionId === a.id ? 'bg-[#2D5A27] text-white' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
                    >
                      {expandedAuctionId === a.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <button 
                      onClick={() => handleProcessOcr(a)}
                      disabled={isProcessingOcr === a.id}
                      className={`p-2 rounded-lg transition-all ${isProcessingOcr === a.id ? 'bg-[#F8F9FA] text-[#2D5A27]' : 'text-[#2D5A27] hover:bg-[#E9F0E8]'}`}
                      title="Processar Vídeo via IA"
                    >
                      {isProcessingOcr === a.id ? <Activity size={18} className="animate-pulse" /> : <Play size={18} />}
                    </button>
                    <button 
                      onClick={() => {
                        setEditingAuction(a);
                        setAuctionForm({ 
                          plaza_id: a.plaza_id.toString(), 
                          auction_date: new Date(a.auction_date).toISOString().slice(0, 16), 
                          commission: a.commission,
                          video_url: a.video_url || ''
                        });
                        setShowAuctionModal(true);
                      }}
                      className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAuction(a.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {expandedAuctionId === a.id && (
                  <div className="px-4 pb-4 border-t border-[#F8F9FA] bg-[#FDFDFD]">
                    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                        <h5 className="text-sm font-bold text-[#2D5A27] shrink-0">Ofertas do Lote</h5>
                        <input
                          type="text"
                          placeholder="Buscar categoria (ex: Terneiros)..."
                          value={offerCategoryFilter}
                          onChange={(e) => setOfferCategoryFilter(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-[#E9ECEF] rounded-xl outline-none focus:border-[#2D5A27] bg-[#F8F9FA] transition-all w-full sm:w-60 placeholder:text-[#999]"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          setEditingOffer(null);
                          setOfferForm({
                            auction_id: a.id,
                            category: 'Touro',
                            breed: '',
                            price_kg: 0,
                            price: 0,
                            avg_weight: 0,
                            batch_size: 1,
                            seller_name: '',
                            seller_city: '',
                            seller_lat: 0,
                            seller_lng: 0
                          });
                          setCitySearchOffer('');
                          setShowOfferModal(true);
                        }}
                        className="text-xs font-bold text-[#2D5A27] hover:underline flex items-center gap-1 sm:self-center"
                      >
                        <Plus size={14} /> Adicionar Oferta
                      </button>
                    </div>

                    {loadingOffers === a.id ? (
                      <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] uppercase text-[#999] font-bold border-b border-[#E9ECEF]">
                              <th className="py-3 px-2">Cat/Raça</th>
                              <th className="py-3 px-2 text-center">Lote</th>
                              <th className="py-3 px-2 text-center">Peso Méd.</th>
                              <th className="py-3 px-2 text-center">Preço/kg</th>
                              <th className="py-3 px-2">Vendedor</th>
                              <th className="py-3 px-2 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F8F9FA]">
                            {(auctionOffers[a.id] || [])
                              .filter(o => o.category.toLowerCase().includes(offerCategoryFilter.toLowerCase()))
                              .map(o => (
                              <tr key={o.id} className="text-xs text-[#333] hover:bg-white transition-colors">
                                <td className="py-3 px-2">
                                  <div className="font-bold">{o.category}</div>
                                  <div className="text-[10px] text-[#999]">{o.breed || 'N/A'}</div>
                                </td>
                                <td className="py-3 px-2 text-center font-medium">{o.batch_size} un</td>
                                <td className="py-3 px-2 text-center font-medium">{o.avg_weight}kg</td>
                                <td className="py-3 px-2 text-center">
                                  <div className="font-bold text-[#2D5A27]">R$ {o.price_kg.toFixed(2)}/kg</div>
                                  {o.price !== undefined && o.price !== null && o.price > 0 && (
                                    <div className="text-[10px] text-[#999]">Total: R$ {o.price.toFixed(2)}</div>
                                  )}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="font-medium text-[11px]">{o.seller_name || 'Desconhecido'}</div>
                                  <div className="text-[9px] text-[#999] uppercase">{o.seller_city}</div>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button 
                                      onClick={() => {
                                        setEditingOffer(o);
                                        setOfferForm({
                                          auction_id: o.auction_id,
                                          category: o.category,
                                          breed: o.breed || '',
                                          price_kg: o.price_kg,
                                          price: o.price || 0,
                                          avg_weight: o.avg_weight,
                                          batch_size: o.batch_size,
                                          seller_name: o.seller_name || '',
                                          seller_city: o.seller_city || '',
                                          seller_lat: o.seller_lat || 0,
                                          seller_lng: o.seller_lng || 0
                                        });
                                        setCitySearchOffer(o.seller_city || '');
                                        setShowOfferModal(true);
                                      }}
                                      className="p-1.5 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-md"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteOffer(o.id, a.id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(!auctionOffers[a.id] || auctionOffers[a.id].length === 0) ? (
                          <div className="py-6 text-center text-sm text-[#999] italic">Nenhuma oferta cadastrada neste leilão.</div>
                        ) : (
                          (auctionOffers[a.id] || []).filter(o => o.category.toLowerCase().includes(offerCategoryFilter.toLowerCase())).length === 0 && (
                            <div className="py-6 text-center text-sm text-[#999] italic">Nenhuma oferta encontrada para a categoria pesquisada.</div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <AuctionScatterChart />
      )}

      {/* --- MODALS --- */}
      
      {/* Plaza Modal */}
      {showPlazaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-[#333]">{editingPlaza ? 'Editar Praça' : 'Nova Praça'}</h3>
              <button onClick={() => setShowPlazaModal(false)} className="p-2 bg-[#F8F9FA] rounded-full text-[#999] hover:text-[#333] hover:bg-[#E9ECEF] transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePlaza} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Nome da Praça</label>
                <input 
                  type="text" required value={plazaForm.name}
                  onChange={e => setPlazaForm({...plazaForm, name: e.target.value})}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-[#333] mb-2">Município (Sede)</label>
                <input 
                  type="text" required value={citySearchPlaza}
                  onChange={e => {setCitySearchPlaza(e.target.value); setShowCitySuggestions(true)}}
                  onFocus={() => setShowCitySuggestions(true)}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                />
                {showCitySuggestions && citySuggestionsPlaza.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl max-h-40 overflow-y-auto">
                    {citySuggestionsPlaza.map(city => (
                      <button key={city.name} type="button" onClick={() => {setCitySearchPlaza(city.name); setShowCitySuggestions(false)}} className="w-full text-left px-4 py-2 hover:bg-[#F8F9FA] text-sm">{city.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg hover:bg-[#1E3D1A] transition-all">
                Salvar Praça
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Auction Modal */}
      {showAuctionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-[#333]">{editingAuction ? 'Editar Leilão' : 'Novo Leilão'}</h3>
              <button onClick={() => setShowAuctionModal(false)} className="p-2 bg-[#F8F9FA] rounded-full text-[#999] hover:text-[#333] hover:bg-[#E9ECEF] transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAuction} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Praça</label>
                <select 
                  required value={auctionForm.plaza_id}
                  onChange={e => setAuctionForm({...auctionForm, plaza_id: e.target.value})}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                >
                  {plazas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Data/Hora do Leilão</label>
                <input 
                  type="datetime-local" required value={auctionForm.auction_date}
                  onChange={e => setAuctionForm({...auctionForm, auction_date: e.target.value})}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Comissão (%)</label>
                <input 
                  type="number" step="0.1" required value={auctionForm.commission}
                  onChange={e => setAuctionForm({...auctionForm, commission: parseFloat(e.target.value)})}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Link do Vídeo (YouTube)</label>
                <div className="relative">
                  <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input 
                    type="url" placeholder="https://www.youtube.com/watch?v=..." 
                    value={auctionForm.video_url}
                    onChange={e => setAuctionForm({...auctionForm, video_url: e.target.value})}
                    className="w-full bg-[#F8F9FA] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-[#2D5A27] border border-transparent transition-all"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg hover:bg-[#1E3D1A] transition-all">
                Salvar Leilão
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-bold text-[#333]">{editingOffer ? 'Editar Oferta' : 'Cadastrar Oferta do Lote'}</h3>
               <button onClick={() => setShowOfferModal(false)} className="p-2 bg-[#F8F9FA] rounded-full text-[#999] hover:text-[#333] hover:bg-[#E9ECEF] transition-all cursor-pointer">
                 <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveOffer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Categoria</label>
                <select required value={offerForm.category} onChange={e => setOfferForm({...offerForm, category: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 border-transparent border focus:border-[#2D5A27] appearance-none">
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIES_LIST.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Raça</label>
                <select value={offerForm.breed} onChange={e => setOfferForm({...offerForm, breed: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 border-transparent border focus:border-[#2D5A27] appearance-none">
                  <option value="">Selecione a raça...</option>
                  <option value="Angus">Angus</option>
                  <option value="Brangus">Brangus</option>
                  <option value="Braford">Braford</option>
                  <option value="Hereford">Hereford</option>
                  <option value="Cruza Angus">Cruza Angus</option>
                  <option value="Cruza Braford">Cruza Braford</option>
                  <option value="Jersey">Jersey</option>
                  <option value="Holandesa">Holandesa</option>
                  <option value="Nelore">Nelore</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-2">Preço (R$/kg)</label>
                  <input type="number" step="0.01" required value={offerForm.price_kg} onChange={e => setOfferForm({...offerForm, price_kg: parseFloat(e.target.value)})} className="w-full bg-[#F8F9FA] rounded-xl px-3 py-2 border-transparent border focus:border-[#2D5A27]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-2">Preço Total (R$)</label>
                  <input type="number" step="0.01" required value={offerForm.price} onChange={e => setOfferForm({...offerForm, price: parseFloat(e.target.value)})} className="w-full bg-[#F8F9FA] rounded-xl px-3 py-2 border-transparent border focus:border-[#2D5A27]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-2">Peso Méd. (kg)</label>
                  <input type="number" step="1" required value={offerForm.avg_weight} onChange={e => setOfferForm({...offerForm, avg_weight: parseFloat(e.target.value)})} className="w-full bg-[#F8F9FA] rounded-xl px-3 py-2 border-transparent border focus:border-[#2D5A27]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Tamanho do Lote (unidades)</label>
                <input type="number" required value={offerForm.batch_size} onChange={e => setOfferForm({...offerForm, batch_size: parseInt(e.target.value)})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 border-transparent border focus:border-[#2D5A27]" />
              </div>
              <div className="md:col-span-2 pt-4 border-t border-[#F8F9FA]">
                <h4 className="font-bold text-[#2D5A27] text-sm mb-4">Informações do Vendedor</h4>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#333] mb-2">Nome/Fazenda</label>
                <input type="text" value={offerForm.seller_name} onChange={e => setOfferForm({...offerForm, seller_name: e.target.value})} className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 border-transparent border focus:border-[#2D5A27]" />
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-[#333] mb-2">Município Vendedor</label>
                <input 
                  type="text" required value={citySearchOffer} 
                  onChange={e => {setCitySearchOffer(e.target.value); setShowOfferCitySuggestions(true)}}
                  onFocus={() => setShowOfferCitySuggestions(true)}
                  className="w-full bg-[#F8F9FA] rounded-xl px-4 py-3 border-transparent border focus:border-[#2D5A27]" 
                />
                {showOfferCitySuggestions && citySuggestionsOffer.length > 0 && (
                  <div className="absolute z-[80] w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl max-h-40 overflow-y-auto">
                    {citySuggestionsOffer.map(city => (
                      <button key={city.name} type="button" onClick={() => {setCitySearchOffer(city.name); setShowOfferCitySuggestions(false)}} className="w-full text-left px-4 py-2 hover:bg-[#F8F9FA] text-sm">{city.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2 pt-4">
                 <button type="submit" className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg hover:bg-[#1E3D1A] transition-colors">
                   Confirmar Oferta
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
