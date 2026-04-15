'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { Spinner } from '@/components/Spinner';
import { Megaphone, LayoutGrid, Menu as MenuIcon, Plus, X, Camera, Video, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify, generateVideoThumbnail, deleteMediaFromStorage } from '@/lib/utils';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

export default function MeusAnunciosPage() {
  const router = useRouter();
  const { user, setUser, logout, setAuthMode, setShowAuthModal } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isProcessingSold, setIsProcessingSold] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [isVerifyingListing, setIsVerifyingListing] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const [adForm, setAdForm] = useState({
    category: 'Touro',
    breed: '',
    weight: 0,
    priceKg: 0,
    batchSize: 1,
    city: '',
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
    onConfirm: () => { }
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
      const storedUser = localStorage.getItem('gado_gaucho_user');
      const userId = storedUser ? JSON.parse(storedUser).id : null;
      if (!userId) return;

      const listingsRes = await fetch(`/api/listings?userId=${userId}&limit=1000`);
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
        setAuthMode('login');
        setShowAuthModal(true);
        router.push('/');
        return;
      }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      await fetchData();
    };
    init();
  }, [router]);

  const totalPrice = React.useMemo(() => {
    return adForm.weight * adForm.priceKg;
  }, [adForm.weight, adForm.priceKg]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const newFiles: string[] = [];
    const newImages: string[] = [];

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

      try {
        let fileToUpload: File | Blob = file;

        let fileExt = file.name.split('.').pop();

        if (type === 'images') {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8,
              fileType: 'image/webp',
            };
            fileToUpload = await imageCompression(file, options);
            fileExt = 'webp';
          } catch (error) {
            console.error('Erro na compressão:', error);
          }
        }

        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gado_gaucho_media')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('gado_gaucho_media')
          .getPublicUrl(filePath);

        newFiles.push(data.publicUrl);

        if (type === 'videos' && adForm.images.length === 0 && newImages.length === 0) {
          try {
            const thumbBlob = await generateVideoThumbnail(file);
            const thumbName = `thumb_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
            const { error: thumbErr } = await supabase.storage
              .from('gado_gaucho_media')
              .upload(`images/${thumbName}`, thumbBlob);

            if (!thumbErr) {
              const { data: thumbData } = supabase.storage
                .from('gado_gaucho_media')
                .getPublicUrl(`images/${thumbName}`);
              newImages.push(thumbData.publicUrl);
            }
          } catch (err) {
            console.error('Failed to generate video thumbnail:', err);
          }
        }

      } catch (err) {
        console.error('Upload Error:', err);
        showToast(`Erro ao enviar ${file.name}.`, 'error');
      }
    }

    setAdForm((prev) => {
      if (type === 'videos') {
        return {
          ...prev,
          videos: [...prev.videos, ...newFiles],
          images: newImages.length > 0 ? [...prev.images, ...newImages] : prev.images
        };
      } else {
        return {
          ...prev,
          images: [...prev.images, ...newFiles]
        };
      }
    });
    e.target.value = '';

    if (newFiles.length > 0) {
      showToast('Upload concluído com sucesso!', 'success');
    }
    setIsUploadingMedia(false);
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    const fileUrl = adForm[type][index];
    if (fileUrl) {
      if (editingListingId) {
        setMediaToDelete(prev => [...prev, fileUrl]);
      } else {
        deleteMediaFromStorage([fileUrl]);
      }
    }
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setAdForm(prev => {
      const newImages = [...prev.images];
      if (direction === 'left' && index > 0) {
        const temp = newImages[index - 1];
        newImages[index - 1] = newImages[index];
        newImages[index] = temp;
      } else if (direction === 'right' && index < newImages.length - 1) {
        const temp = newImages[index + 1];
        newImages[index + 1] = newImages[index];
        newImages[index] = temp;
      }
      return { ...prev, images: newImages };
    });
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingListing(true);
    try {
      if (!user) {
        showToast('Você precisa estar logado.', 'error');
        return;
      }
      const cityData = RS_CITIES.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());
      const isNew = !editingListingId;
      const url = isNew ? '/api/listings' : `/api/listings/${editingListingId}`;
      const method = isNew ? 'POST' : 'PUT';

      const newAd = {
        category: adForm.category.toUpperCase(),
        breed: adForm.breed || null,
        title: `${adForm.category} em ${adForm.city}`,
        price: totalPrice,
        priceKg: adForm.priceKg,
        avgWeight: adForm.weight,
        quantity: adForm.batchSize,
        location: `${adForm.city.toUpperCase()} - RS`,
        lat: cityData?.lat || null,
        lng: cityData?.lng || null,
        user_id: user?.id,
        image: (Array.isArray(adForm.images) && adForm.images.length > 0 ? adForm.images[0] : null) || 'https://picsum.photos/seed/newcattle/800/600',
        description: adForm.description,
        images: Array.isArray(adForm.images) && adForm.images.length > 0 ? adForm.images : ['https://picsum.photos/seed/newcattle/800/600'],
        videos: Array.isArray(adForm.videos) ? adForm.videos : [],
        verified: false
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(newAd)
      });
      if (res.ok) {
        if (editingListingId && mediaToDelete.length > 0) {
          await deleteMediaFromStorage(mediaToDelete);
          setMediaToDelete([]);
        }
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
          const listing = listings.find(l => l.id === id);
          if (listing) {
            const allMedia = [...(listing.images || []), ...(listing.videos || [])];
            if (allMedia.length > 0) {
              await deleteMediaFromStorage(allMedia);
            }
          }
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
      category: 'Touro',
      breed: '',
      weight: 0,
      priceKg: 0,
      batchSize: 1,
      city: '',
      description: '',
      images: [],
      videos: []
    });
    setMediaToDelete([]);
    setShowAdModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          user={user}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
          onAdClick={openNewAdModal}
          onAdminClick={() => router.push('/')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('gado_gaucho_user');
            router.push('/');
          }}
          onHomeClick={() => router.push('/')}
          onFavoritesClick={() => router.push('/favoritos')}
          onMyAdsClick={() => { }}
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
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
        onAdClick={openNewAdModal}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          logout();
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => { }}
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
          onSearchChange={() => { }}
          listingsCount={listings.filter(l => !l.sold).length}
          getCategoryCount={(catName) => listings.filter(l => !l.sold && l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => { }}
          maxDistance={100}
          onMaxDistanceChange={() => { }}
          onUseMyLocation={() => { }}
          citySuggestions={[]}
          onSelectCity={() => { }}
          showSuggestions={false}
          setShowSuggestions={() => { }}
        />

        <main className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                <Megaphone size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#333]">Meus Anúncios</h1>
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
                          category: l.category || 'Touro',
                          breed: l.breed || '',
                          weight: l.avgWeight || 0,
                          priceKg: l.priceKg || 0,
                          batchSize: l.quantity || 1,
                          city: l.location ? l.location.split(' - ')[0] : '',
                          description: l.description || '',
                          images: Array.isArray(l.images) ? l.images : (l.image ? [l.image] : []),
                          videos: Array.isArray(l.videos) ? l.videos : []
                        });
                        setCitySearchAd(l.location ? l.location.split(' - ')[0] : '');
                        setMediaToDelete([]);
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
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
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
              onClick={() => { setShowAdModal(false); setEditingListingId(null); setMediaToDelete([]); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
            >
              {(isUpdatingListing || isUploadingMedia) && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Spinner size="xl" className="mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">
                    {isUploadingMedia ? 'Enviando mídias...' : 'Processando anúncio...'}
                  </h3>
                  <p className="text-sm text-[#666] mt-2 text-center px-4">
                    {isUploadingMedia ? 'Aguarde o carregamento das suas fotos e vídeos.' : 'Carregando dados e imagens, por favor aguarde.'}
                  </p>
                </div>
              )}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {editingListingId ? 'Editar Anúncio' : 'Novo Anúncio'}
                  </h2>
                  <button type="button" onClick={() => { setShowAdModal(false); setEditingListingId(null); setMediaToDelete([]); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdateListing} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                      <select
                        value={adForm.category}
                        onChange={(e) => setAdForm({ ...adForm, category: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                      >
                        {CATEGORIES_LIST.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Município (RS)</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={citySearchAd}
                          onChange={(e) => {
                            setCitySearchAd(e.target.value);
                            setAdForm({ ...adForm, city: e.target.value });
                            setShowAdSuggestions(true);
                          }}
                          onFocus={() => setShowAdSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowAdSuggestions(false), 200)}
                          placeholder="Busque o município..."
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        />
                        {citySuggestionsAd.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-10 overflow-hidden">
                            {citySuggestionsAd.map((city: any) => (
                              <button
                                key={city.name}
                                type="button"
                                onClick={() => {
                                  setAdForm({ ...adForm, city: city.name });
                                  setCitySearchAd(city.name);
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Raça</label>
                      <select
                        value={adForm.breed}
                        onChange={(e) => setAdForm({ ...adForm, breed: e.target.value })}
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                      >
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio (kg)</label>
                      <input
                        type="number"
                        required
                        value={adForm.weight || ''}
                        onChange={(e) => setAdForm({ ...adForm, weight: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor por kg (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={adForm.priceKg || ''}
                        onChange={(e) => setAdForm({ ...adForm, priceKg: Number(e.target.value) })}
                        placeholder="0,00"
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor Total (Calculado)</label>
                      <div className="w-full bg-[#E9F0E8] text-[#2D5A27] font-bold rounded-xl px-4 py-3 text-sm border border-transparent">
                        R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Tamanho do Lote (Animais)</label>
                    <input
                      type="number"
                      required
                      value={adForm.batchSize}
                      onChange={(e) => setAdForm({ ...adForm, batchSize: Number(e.target.value) })}
                      placeholder="1"
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição</label>
                    <textarea
                      rows={3}
                      value={adForm.description}
                      onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                      placeholder="Detalhes sobre o gado, genética, vacinação..."
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={(e) => handleFileChange(e, 'images')}
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingMedia}
                      />
                      <button
                        type="button"
                        disabled={isUploadingMedia}
                        onClick={() => imageInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27]'}`}
                      >
                        {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Camera size={24} />}
                        <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Fotos'}</span>
                      </button>

                      <input
                        type="file"
                        ref={videoInputRef}
                        onChange={(e) => handleFileChange(e, 'videos')}
                        multiple
                        accept="video/*"
                        className="hidden"
                        disabled={isUploadingMedia}
                      />
                      <button
                        type="button"
                        disabled={isUploadingMedia}
                        onClick={() => videoInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27]'}`}
                      >
                        {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Video size={24} />}
                        <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Vídeos'}</span>
                      </button>
                    </div>

                    {/* Previews */}
                    {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                        {adForm.images.map((img, idx) => (
                          <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group border border-[#E9ECEF]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />

                            {/* Reorder Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {idx > 0 && (
                                <button type="button" onClick={() => moveImage(idx, 'left')} className="p-1.5 bg-white text-[#333] rounded-full hover:bg-[#F8F9FA] transition-colors shadow">
                                  <ChevronLeft size={16} />
                                </button>
                              )}
                              {idx < adForm.images.length - 1 && (
                                <button type="button" onClick={() => moveImage(idx, 'right')} className="p-1.5 bg-white text-[#333] rounded-full hover:bg-[#F8F9FA] transition-colors shadow">
                                  <ChevronRight size={16} />
                                </button>
                              )}
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => removeFile(idx, 'images')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 shadow-md"
                            >
                              <X size={12} />
                            </button>

                            {/* Capa Badge */}
                            {idx === 0 && (
                              <div className="absolute top-1 left-1 bg-[#2D5A27] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full z-10 shadow-md">
                                Capa
                              </div>
                            )}
                          </div>
                        ))}
                        {adForm.videos.map((vid, idx) => (
                          <div key={`vid-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group bg-black flex items-center justify-center">
                            <Video size={20} className="text-white" />
                            <button
                              type="button"
                              onClick={() => removeFile(idx, 'videos')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-4 cursor-pointer">
                    {editingListingId ? 'Salvar Alterações' : 'Publicar Anúncio'}
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
