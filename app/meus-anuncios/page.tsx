'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { Megaphone, LayoutGrid, Menu as MenuIcon, Plus, X, Camera, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify } from '@/lib/utils';
import { RS_CITIES } from '@/lib/data';
import Image from 'next/image';

export default function MeusAnunciosPage() {
  const router = useRouter();
  const { user, setUser, logout } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isProcessingSold, setIsProcessingSold] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isVerifyingListing, setIsVerifyingListing] = useState(false);

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const [adForm, setAdForm] = useState({
    title: '',
    category: '',
    price: 0,
    priceKg: 0,
    avgWeight: 0,
    quantity: 0,
    location: '',
    description: '',
    images: [] as string[],
    videos: [] as string[]
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [citySearchAd, setCitySearchAd] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);

  const citySuggestionsAd = React.useMemo(() => {
    if (!showAdSuggestions) return [];
    if (citySearchAd.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
  }, [citySearchAd, showAdSuggestions]);


  const fetchData = async () => {
    try {
      const listingsRes = await fetch('/api/listings');
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('gado_gaucho_user');
      if (!storedUser) {
        router.push('/?auth=login');
        return;
      }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      await fetchData();
    };
    init();
  }, [router]);

  const totalPrice = React.useMemo(() => {
    return adForm.avgWeight * adForm.priceKg;
  }, [adForm.avgWeight, adForm.priceKg]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (type === 'images' && file.size > 5 * 1024 * 1024) {
        showToast('A imagem é muito grande. Máximo 5MB.', 'error');
        continue;
      }
      if (type === 'videos' && file.size > 20 * 1024 * 1024) {
        showToast('O vídeo é muito grande. Máximo 20MB.', 'error');
        continue;
      }

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push(base64);
    }

    setAdForm(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
    e.target.value = '';
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingListing(true);
    try {
      if (!user) {
        showToast('Você precisa estar logado.', 'error');
        return;
      }
      const cityData = RS_CITIES.find(c => c.name.toLowerCase() === citySearchAd.toLowerCase());
      const isNew = !editingListingId;
      const url = isNew ? '/api/listings' : `/api/listings/${editingListingId}`;
      const method = isNew ? 'POST' : 'PUT';

      const baseImage = adForm.images.length > 0 ? adForm.images[0] : 'https://picsum.photos/seed/newcattle/800/600';
      const baseImages = adForm.images.length > 0 ? adForm.images : [baseImage];

      const payload = isNew ? {
        category: adForm.category || 'TOURO',
        title: adForm.title || `${adForm.category || 'Touro'} em ${citySearchAd}`,
        price: totalPrice,
        priceKg: adForm.priceKg,
        avgWeight: adForm.avgWeight,
        quantity: adForm.quantity,
        location: adForm.location,
        description: adForm.description,
        lat: cityData?.lat || null,
        lng: cityData?.lng || null,
        user_id: user.id,
        image: baseImage,
        images: baseImages,
        videos: adForm.videos,
        verified: false,
        sold: false
      } : {
        ...adForm,
        price: totalPrice,
        image: adForm.images.length > 0 ? adForm.images[0] : null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload)
      });
      if (res.ok) {
        setShowAdModal(false);
        setEditingListingId(null);
        await fetchData();
        showToast(isNew ? 'Anúncio criado com sucesso!' : 'Anúncio atualizado com sucesso!', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Erro ao ${isNew ? 'criar' : 'atualizar'} anúncio. ${err.error || ''}`, 'error');
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsUpdatingListing(false);
    }
  };

  const handleDeleteListing = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anúncio',
      message: 'Tem certeza que deseja apagar este anúncio permanentemente?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData();
            showToast('Anúncio excluído com sucesso!', 'success');
          } else {
            showToast('Erro ao excluir anúncio.', 'error');
          }
        } catch (error) {
          console.error('Error deleting listing:', error);
          showToast('Erro de conexão.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleToggleSold = async (id: number, currentStatus: boolean) => {
    setIsProcessingSold(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ sold: !currentStatus })
      });
      if (res.ok) {
        await fetchData();
        showToast(currentStatus ? 'Anúncio reativado com sucesso!' : 'Anúncio marcado como VENDIDO!', 'success');
      } else {
        showToast('Erro ao atualizar status do anúncio.', 'error');
      }
    } catch (error) {
      console.error('Error toggling sold status:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsProcessingSold(false);
    }
  };

  const handleVerifyListing = async (id: number) => {
    setIsVerifyingListing(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ verification_requested: true })
      });
      if (res.ok) {
        await fetchData();
        showToast('Solicitação de verificação enviada!', 'success');
      } else {
        showToast('Erro ao solicitar verificação.', 'error');
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsVerifyingListing(false);
    }
  };

  const myAds = listings.filter(l => Number(l.user_id) === Number(user?.id));

  const openNewAdModal = () => {
    setEditingListingId(null);
    setCitySearchAd('');
    setAdForm({
      title: '',
      category: 'Touro',
      price: 0,
      priceKg: 0,
      avgWeight: 0,
      quantity: 1,
      location: '',
      description: '',
      images: [],
      videos: []
    });
    setShowAdModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => router.push(`/?auth=${mode}`)}
          onAdClick={openNewAdModal}
          onAdminClick={() => router.push('/')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('gado_gaucho_user');
            router.push('/');
          }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => {}}
          onMessagesClick={() => router.push('/mensagens')}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingScreen fullScreen={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => router.push(`/?auth=${mode}`)}
        onAdClick={openNewAdModal}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => {}}
        onMessagesClick={() => router.push('/mensagens')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={null}
          onSelectCategory={(cat) => {
            if (cat) router.push(`/?category=${encodeURIComponent(cat)}`);
            else router.push('/');
          }}
          searchQuery=""
          onSearchChange={() => {}}
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => {}}
          maxDistance={100}
          onMaxDistanceChange={() => {}}
          onUseMyLocation={() => {}}
          citySuggestions={[]}
          onSelectCity={() => {}}
          showSuggestions={false}
          setShowSuggestions={() => {}}
        />

        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#333]">Meus Anúncios</h1>
                <p className="text-sm text-[#999]">Gerencie suas ofertas no Gado Gaúcho</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={openNewAdModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-all"
              >
                <Plus size={18} /> Novo Anúncio
              </button>
            </div>
          </div>

          {myAds.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E9ECEF] shadow-sm">
              <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#999]">
                <Megaphone size={40} />
              </div>
              <h2 className="text-xl font-bold text-[#333] mb-2">Nenhum anúncio ainda</h2>
              <p className="text-[#666] mb-8">Comece a vender seu gado agora mesmo!</p>
              <button 
                onClick={openNewAdModal}
                className="px-8 py-3 bg-[#2D5A27] text-white font-bold rounded-xl hover:bg-[#1E3D1A] transition-all"
              >
                Criar Primeiro Anúncio
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {myAds.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ListingListItem 
                      listing={item} 
                      isOwner={true}
                      onView={(id) => router.push(`/anuncio/${id}`)}
                      onEdit={(l) => {
                        setEditingListingId(l.id);
                        setAdForm({
                          title: l.title || '',
                          category: l.category || '',
                          price: l.price || 0,
                          priceKg: l.priceKg || 0,
                          avgWeight: l.avgWeight || 0,
                          quantity: l.quantity || 0,
                          location: l.location || '',
                          description: l.description || '',
                          images: Array.isArray(l.images) ? l.images : (l.image ? [l.image] : []),
                          videos: Array.isArray(l.videos) ? l.videos : []
                        });
                        setCitySearchAd(l.location ? l.location.split(' - ')[0] : '');
                        setShowAdModal(true);
                      }}
                      onDelete={(id) => handleDeleteListing(id)}
                      onToggleSold={(id, status) => handleToggleSold(id, status)}
                      onVerify={(id) => handleVerifyListing(id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {user && (
        <BottomNav 
          user={user} 
          onAdClick={openNewAdModal} 
          onAuthClick={() => router.push('/?auth=login')} 
        />
      )}

      {(isProcessingSold || isVerifyingListing) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoadingScreen fullScreen={false} message={isVerifyingListing ? "Enviando solicitação..." : "Atualizando status..."} />
        </div>
      )}

      <AnimatePresence>
        {showAdModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdModal(false); setEditingListingId(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              {isUpdatingListing && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">Salvando alterações...</h3>
                  <p className="text-sm text-[#666] mt-2">Atualizando dados e imagens, por favor aguarde.</p>
                </div>
              )}
              <div className="p-8 border-b border-[#E9ECEF] flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333]">
                  {editingListingId ? 'Editar Meu Anúncio' : 'Novo Anúncio'}
                </h2>
                <button onClick={() => { setShowAdModal(false); setEditingListingId(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <form onSubmit={handleUpdateListing} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Título do Anúncio</label>
                    <input 
                      type="text" 
                      required
                      value={adForm.title}
                      onChange={(e) => setAdForm({...adForm, title: e.target.value})}
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                      <select 
                        required
                        value={adForm.category}
                        onChange={(e) => setAdForm({...adForm, category: e.target.value})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none" 
                      >
                        <option value="Touro">Touro</option>
                        <option value="Vaca">Vaca</option>
                        <option value="Bezerro">Bezerro(a)</option>
                        <option value="Novilha">Novilha(o)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Quantidade (Animais)</label>
                      <input 
                        type="number" 
                        required min="1"
                        value={adForm.quantity}
                        onChange={(e) => setAdForm({...adForm, quantity: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Preço por Kg (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" required
                        value={adForm.priceKg}
                        onChange={(e) => setAdForm({...adForm, priceKg: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio (Kg)</label>
                      <input 
                        type="number" 
                        step="0.1" required
                        value={adForm.avgWeight}
                        onChange={(e) => setAdForm({...adForm, avgWeight: Number(e.target.value)})}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Preço Total (R$)</label>
                      <input 
                        type="text" 
                        readOnly
                        value={totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        className="w-full bg-[#E9F0E8] text-[#2D5A27] font-bold border border-transparent rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Localização (Município RS)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={citySearchAd}
                        onChange={(e) => {
                          setCitySearchAd(e.target.value);
                          setAdForm({...adForm, location: e.target.value});
                          setShowAdSuggestions(true);
                        }}
                        onFocus={() => setShowAdSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAdSuggestions(false), 200)}
                        placeholder="Nome da cidade..."
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                      />
                      {citySuggestionsAd.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                          {citySuggestionsAd.map((city: any) => (
                            <button 
                              key={city.name}
                              type="button"
                              onClick={() => {
                                const newLocation = `${city.name.toUpperCase()} - RS`;
                                setAdForm({...adForm, location: newLocation});
                                setCitySearchAd(city.name.toUpperCase());
                                setShowAdSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{city.name}</span>
                              <span className="text-[10px] text-[#999]">RS</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição</label>
                    <textarea 
                      required rows={4}
                      value={adForm.description}
                      onChange={(e) => setAdForm({...adForm, description: e.target.value})}
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none" 
                    />
                  </div>
                  
                  <div className="space-y-4 border-t border-[#E9ECEF] pt-4 mt-4">
                    <label className="block text-sm font-bold text-[#333] mb-2">Fotos e Vídeos</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        onChange={(e) => handleFileChange(e, 'images')} 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl hover:border-[#2D5A27] hover:bg-[#F8F9FA] transition-all text-[#999] hover:text-[#2D5A27] cursor-pointer"
                      >
                        <Camera size={24} />
                        <span className="text-[10px] font-bold uppercase">Adicionar Fotos</span>
                      </button>

                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        onChange={(e) => handleFileChange(e, 'videos')} 
                        multiple 
                        accept="video/*" 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => videoInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl hover:border-[#2D5A27] hover:bg-[#F8F9FA] transition-all text-[#999] hover:text-[#2D5A27] cursor-pointer"
                      >
                        <Video size={24} />
                        <span className="text-[10px] font-bold uppercase">Adicionar Vídeos</span>
                      </button>
                    </div>

                    {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                        {adForm.images.map((img, idx) => (
                          <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group border border-[#E9ECEF]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeFile(idx, 'images')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {adForm.videos.map((vid, idx) => (
                          <div key={`vid-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group bg-black flex items-center justify-center border border-[#E9ECEF]">
                            <Video size={20} className="text-white" />
                            <button 
                              type="button"
                              onClick={() => removeFile(idx, 'videos')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#1E3D1A] transition-all shadow-lg shadow-[#2D5A27]/20 cursor-pointer mt-4"
                  >
                    {editingListingId ? 'Salvar Alterações' : 'Criar Anúncio'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
