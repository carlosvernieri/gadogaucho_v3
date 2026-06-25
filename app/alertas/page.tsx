'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { Bell, Trash2, Mail, Phone, User, Check, Loader2, Sparkles, MapPin } from 'lucide-react';
import { showToast } from '@/components/ConfirmModal';
import { RS_CITIES } from '@/lib/data';

interface Category {
  id: number;
  name: string;
}

interface Alert {
  id: string;
  name: string;
  email: string;
  phone: string;
  categoryId: number;
  categoryName: string;
  minPrice: number | null;
  maxPrice: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  location: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export default function AlertasPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  
  // Location states
  const [citySearch, setCitySearch] = useState('');
  const [city, setCity] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Suggestions computation
  const citySuggestions = React.useMemo(() => {
    if (citySearch.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch]);

  // Pre-fill user data when user logs in
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
    }
  }, [user]);

  // Load animal categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('animal_categories')
          .select('id, name')
          .order('name');
        
        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setCategories(data);
          setSelectedCategoryId(data[0].id);
        } else {
          // Fallback estático caso a tabela esteja vazia
          const fallbackCats = [
            { id: 1, name: 'Boi' },
            { id: 2, name: 'Gado de Leite' },
            { id: 3, name: 'Novilha' },
            { id: 4, name: 'Novilho' },
            { id: 5, name: 'Terneira' },
            { id: 6, name: 'Terneiro' },
            { id: 7, name: 'Touro' },
            { id: 8, name: 'Vaca' },
            { id: 9, name: 'Vaca com Cria' },
            { id: 10, name: 'Vaca Prenha' }
          ];
          setCategories(fallbackCats);
          setSelectedCategoryId(fallbackCats[0].id);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Pre-fill from URL parameters (e.g. categoryId, minPrice, maxPrice, minWeight, maxWeight, location)
  useEffect(() => {
    if (typeof window !== 'undefined' && categories.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const catId = params.get('categoryId');
      const minP = params.get('minPrice');
      const maxP = params.get('maxPrice');
      const minW = params.get('minWeight');
      const maxW = params.get('maxWeight');
      const locParam = params.get('location');

      if (catId) {
        const idNum = Number(catId);
        if (categories.some(c => c.id === idNum)) {
          setSelectedCategoryId(idNum);
        }
      }
      if (minP) setMinPrice(minP);
      if (maxP) setMaxPrice(maxP);
      if (minW) setMinWeight(minW);
      if (maxW) setMaxWeight(maxW);
      if (locParam) {
        const cleanedCityName = locParam.split('-')[0].trim();
        setCity(cleanedCityName);
        setCitySearch(cleanedCityName);
      }
    }
  }, [categories]);

  // Fetch user's registered alerts
  const fetchAlerts = async () => {
    if (!user) return;
    setLoadingAlerts(true);
    try {
      const res = await fetch('/api/opportunity-alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAlerts();
    } else {
      setAlerts([]);
    }
  }, [user]);

  // Handle phone format
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Formatar (XX) XXXXX-XXXX
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  // Submit new alert
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !selectedCategoryId || !city.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
    if (!cityData) {
      showToast('Por favor, selecione um município válido do Rio Grande do Sul.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/opportunity-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone,
          categoryId: Number(selectedCategoryId),
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          minWeight: minWeight ? Number(minWeight) : null,
          maxWeight: maxWeight ? Number(maxWeight) : null,
          location: `${cityData.name} - RS`,
          lat: cityData.lat,
          lng: cityData.lng
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Alerta de oportunidade criado com sucesso!', 'success');
        
        // Se estiver logado, atualiza a lista de alertas
        if (user) {
          fetchAlerts();
        } else {
          // Se não estiver logado, reseta o form
          setSelectedCategoryId(categories[0]?.id || '');
        }
        setMinPrice('');
        setMaxPrice('');
        setMinWeight('');
        setMaxWeight('');
        setCity('');
        setCitySearch('');
      } else {
        showToast(data.error || 'Erro ao cadastrar alerta', 'error');
      }
    } catch (err) {
      console.error('Error submitting alert:', err);
      showToast('Erro de rede ao cadastrar alerta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete alert
  const handleDeleteAlert = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/opportunity-alerts?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Alerta removido com sucesso!', 'success');
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao remover alerta', 'error');
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      showToast('Erro de rede ao remover alerta', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0 min-h-screen bg-slate-50/50">
      <Header
        user={user}
        onMenuClick={() => {}}
        onAuthClick={(mode) => { setAuthMode(mode as 'login'|'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Lado Esquerdo: Info e Formulário */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E9ECEF] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#E9F0E8] text-[#2D5A27] rounded-2xl">
                <Bell size={24} className="animate-swing" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#333] tracking-tight">Alertas de Oportunidades</h1>
                <p className="text-xs text-[#666] font-medium uppercase tracking-wider mt-0.5">Seja notificado por e-mail instantaneamente</p>
              </div>
            </div>
            
            <p className="text-sm text-[#555] leading-relaxed mb-6">
              Procurando um lote específico de animais e não quer perder tempo buscando no site todos os dias? 
              Cadastre seu interesse abaixo. Assim que um produtor inserir uma nova oferta compatível com a categoria selecionada, 
              nosso sistema enviará um e-mail com todos os detalhes e o contato direto do vendedor!
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Categoria */}
              <div>
                <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 ml-2">Qual categoria de animal você busca?</label>
                {loadingCategories ? (
                  <div className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-4 py-3 text-sm text-[#666] flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[#2D5A27]" />
                    <span>Carregando categorias...</span>
                  </div>
                ) : (
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3.5 text-sm font-semibold text-[#333] outline-none transition-all appearance-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Informações de contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 ml-2">Seu Nome</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 ml-2">Seu WhatsApp / Telefone</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Phone size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: (53) 99999-9999"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 ml-2">Seu E-mail para Avisos</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="Ex: joao@seuemail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-[#333] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Município (RS) */}
              <div>
                <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5 ml-2">Município do Alerta (RS)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <MapPin size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setCity(e.target.value);
                      setShowCitySuggestions(true);
                    }}
                    onFocus={() => setShowCitySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                    placeholder="Ex: Pelotas"
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium text-[#333] outline-none transition-all cursor-text"
                  />
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-2xl z-20 max-h-48 overflow-y-auto">
                      {citySuggestions.map((cityObj: any) => (
                        <button
                          key={cityObj.name}
                          type="button"
                          onClick={() => {
                            setCity(cityObj.name);
                            setCitySearch(cityObj.name);
                            setShowCitySuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer border-b border-[#F8F9FA] last:border-0"
                        >
                          <span className="font-semibold text-[#333]">{cityObj.name}</span>
                          <span className="text-[10px] uppercase font-bold text-[#999]">RS</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filtros de Preço */}
              <div>
                <span className="block text-[10px] font-bold text-[#666] uppercase mb-2 ml-2">Filtros de Preço por Kg (Opcional)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[#999] uppercase mb-1 ml-2">Preço Mínimo (R$/kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 11.50"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#999] uppercase mb-1 ml-2">Preço Máximo (R$/kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 13.00"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Filtros de Peso */}
              <div>
                <span className="block text-[10px] font-bold text-[#666] uppercase mb-2 ml-2">Filtros de Peso Médio (Opcional)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio Mínimo (kg)</label>
                    <input
                      type="number"
                      placeholder="Sem mínimo"
                      value={minWeight}
                      onChange={(e) => setMinWeight(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio Máximo (kg)</label>
                    <input
                      type="number"
                      placeholder="Sem máximo"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {user && (
                <div className="bg-[#E9F0E8]/50 border border-[#2D5A27]/10 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-[#2D5A27] font-semibold">
                  <Check size={16} className="bg-[#2D5A27] text-white rounded-full p-0.5" />
                  <span>Você está logado. Os dados acima foram carregados do seu perfil automaticamente.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#2D5A27] hover:bg-[#1D3E19] disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-md shadow-[#2D5A27]/15 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Cadastrando Alerta...</span>
                  </>
                ) : (
                  <>
                    <Bell size={20} />
                    <span>Ativar Alerta de Oportunidade</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Lado Direito: Alertas Ativos ou Login Callout */}
        <div className="lg:col-span-5 space-y-6">
          {user ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E9ECEF] shadow-sm">
              <h2 className="text-xl font-bold text-[#333] mb-2 flex items-center gap-2">
                <span>Seus Alertas Ativos</span>
                <span className="bg-[#E9F0E8] text-[#2D5A27] text-xs font-bold px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              </h2>
              <p className="text-xs text-[#888] mb-6">Você será avisado no e-mail cadastrado quando novas ofertas destas categorias forem postadas.</p>

              {loadingAlerts ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#999]">
                  <Loader2 size={32} className="animate-spin text-[#2D5A27] mb-2" />
                  <span className="text-sm">Buscando seus alertas...</span>
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-[#E9ECEF] rounded-2xl p-6 bg-slate-50/50">
                  <Bell size={36} className="mx-auto text-slate-300 mb-2.5" />
                  <h3 className="font-semibold text-sm text-[#666] mb-1">Nenhum alerta ativo</h3>
                  <p className="text-xs text-[#999] leading-normal">Cadastre seu primeiro alerta ao lado para começar a receber avisos do mercado.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] flex items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-sm"
                    >
                      <div className="space-y-1">
                        <span className="inline-block bg-[#E9F0E8] text-[#2D5A27] text-xs font-extrabold px-2.5 py-1 rounded-lg">
                          {alert.categoryName}
                        </span>
                        <div className="text-xs font-semibold text-[#333] mt-1 truncate max-w-[220px]">
                          {alert.name}
                        </div>
                        <div className="text-[11px] text-[#666] flex items-center gap-1">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate max-w-[220px]">{alert.email}</span>
                        </div>
                        <div className="text-[11px] text-[#666] flex items-center gap-1">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate max-w-[220px]">{alert.location || 'Qualquer Município'}</span>
                        </div>

                        {(alert.minPrice !== null || alert.maxPrice !== null || alert.minWeight !== null || alert.maxWeight !== null) && (
                          <div className="text-[10px] text-[#555] bg-slate-100/80 p-2 rounded-xl mt-2 space-y-0.5 max-w-[220px]">
                            {(alert.minPrice !== null || alert.maxPrice !== null) && (
                              <div>
                                <strong>Preço:</strong> {alert.minPrice !== null ? `R$ ${alert.minPrice.toLocaleString('pt-BR')}/kg` : 'R$ 0/kg'} até {alert.maxPrice !== null ? `R$ ${alert.maxPrice.toLocaleString('pt-BR')}/kg` : 'Sem limite'}
                              </div>
                            )}
                            {(alert.minWeight !== null || alert.maxWeight !== null) && (
                              <div>
                                <strong>Peso:</strong> {alert.minWeight !== null ? `${alert.minWeight} kg` : '0 kg'} até {alert.maxWeight !== null ? `${alert.maxWeight} kg` : 'Sem limite'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        disabled={deletingId === alert.id}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        title="Remover alerta"
                      >
                        {deletingId === alert.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#E9F0E8]/40 border border-[#2D5A27]/10 p-6 md:p-8 rounded-3xl space-y-5 text-center">
              <div className="w-12 h-12 bg-white text-[#2D5A27] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Sparkles size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#1b4332]">Tem uma conta no Gado Gaúcho?</h3>
                <p className="text-xs text-[#555] leading-relaxed">
                  Entre ou cadastre-se para poder gerenciar seus alertas ativos, visualizar suas demandas e carregar seus dados cadastrais instantaneamente em todas as telas.
                </p>
              </div>
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="w-full py-3 bg-white hover:bg-[#F8F9FA] text-[#2D5A27] font-bold rounded-xl border border-[#2D5A27]/20 shadow-sm text-sm cursor-pointer transition-colors"
              >
                Entrar / Criar Conta
              </button>
            </div>
          )}
        </div>

      </main>

      {user && (
        <BottomNav 
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}
    </div>
  );
}
