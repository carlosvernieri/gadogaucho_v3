'use client';

import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Search,
  Heart,
  ChevronLeft,
  Check,
  Megaphone,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import { safeJsonStringify, deleteMediaFromStorage, getListingUrl } from '@/lib/utils';
import { Spinner } from '@/components/Spinner';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useUser } from '@/context/UserContext';

// --- Main App ---

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
};

export function HomePageClient({ initialListings }: { initialListings: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, logout, showAuthModal, setShowAuthModal, authMode, setAuthMode, favorites, toggleFavorite, setShowAdModal, setEditingListing } = useUser();
  const [listings, setListings] = useState<any[]>(initialListings);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialListings.length === 20);
  const { ref: observerRef, inView } = useInView();
  const isInitialFilterState = useRef(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    return searchParams ? searchParams.get('category') || null : null;
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams ? searchParams.get('search') || '' : '';
  });
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(() => {
    return searchParams ? searchParams.get('featured') === 'true' : false;
  });
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(() => {
    return searchParams ? searchParams.get('verified') === 'true' : false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Proximity Search State
  const [citySearch, setCitySearch] = useState(() => {
    return searchParams ? searchParams.get('citySearch') || '' : '';
  });
  const [maxDistance, setMaxDistance] = useState(100);
  const [selectedCityCoords, setSelectedCityCoords] = useState<{ lat: number, lng: number } | null>(() => {
    if (!searchParams) return null;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    return lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  });
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Haversine formula to calculate distance between two points in km
  const calculateDistance = React.useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }, []);

  const citySuggestions = useMemo(() => {
    if (!showCitySuggestions) return [];
    if (citySearch === 'Minha Localização') return [];
    if (citySearch.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch, showCitySuggestions]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setCitySearch('Obtendo localização...');
      setShowCitySuggestions(false);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setSelectedCityCoords({ lat, lng });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            // Tenta pegar os campos comumente retornados no Brasil
            const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Sua Localização';
            setCitySearch(cityName);
          } else {
            setCitySearch('Sua Localização');
          }
        } catch (err) {
          console.error('Error fetching city name:', err);
          setCitySearch('Sua Localização');
        }
      }, (error) => {
        console.error('Error getting location:', error);
        setCitySearch('');
        showToast('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      });
    } else {
      showToast('Geolocalização não é suportada pelo seu navegador.');
    }
  };
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedListingForShare, setSelectedListingForShare] = useState<any>(null);
  const [favoriteToastMessage, setFavoriteToastMessage] = useState('');
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    type?: 'danger' | 'info' | 'warning' | 'success';
    loading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthModal]);

  useEffect(() => {
    const handleAdCreated = (e: Event) => {
      const savedAd = (e as CustomEvent).detail;
      setListings(prev => [savedAd, ...prev]);
    };
    
    const handleAdUpdated = (e: Event) => {
      const savedAd = (e as CustomEvent).detail;
      setListings(prev => prev.map(l => l.id === savedAd.id ? savedAd : l));
    };

    window.addEventListener('ad_created', handleAdCreated);
    window.addEventListener('ad_updated', handleAdUpdated);
    
    return () => {
      window.removeEventListener('ad_created', handleAdCreated);
      window.removeEventListener('ad_updated', handleAdUpdated);
    };
  }, []);

  const showToast = (message: string) => {
    setFavoriteToastMessage(message);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  // Banner modal state
  const [bannerSettings, setBannerSettings] = useState<{ enabled: boolean; title: string; description: string; buttonText: string } | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);

  useEffect(() => {
    const checkBanner = async () => {
      try {
        const res = await fetch('/api/admin/alert-banner');
        if (res.ok) {
          const data = await res.json();
          setBannerSettings(data);
          
          const hasSeen = localStorage.getItem('gado_gaucho_alert_banner_seen');
          if (data.enabled && !hasSeen) {
            setShowBannerModal(true);
          }
        }
      } catch (error) {
        console.error('Error loading banner settings:', error);
      }
    };
    checkBanner();
  }, []);

  const handleCloseBanner = () => {
    localStorage.setItem('gado_gaucho_alert_banner_seen', 'true');
    setShowBannerModal(false);
  };

  // Handle URL parameters for modals
  useEffect(() => {
    const authParam = searchParams.get('auth');
    const adParam = searchParams.get('ad');
    let shouldCleanUrl = false;

    if (authParam === 'login') {
      setAuthMode('login');
      setShowAuthModal(true);
      window.scrollTo(0, 0);
      shouldCleanUrl = true;
    } else if (authParam === 'register') {
      setAuthMode('register');
      setShowAuthModal(true);
      window.scrollTo(0, 0);
      shouldCleanUrl = true;
    }

    if (adParam === 'new') {
      setShowAdModal(true);
      window.scrollTo(0, 0);
      shouldCleanUrl = true;
    }

    // Clean URL params after processing to prevent re-triggering on navigation
    if (shouldCleanUrl) {
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  // Handle category from query params

  const handleDeleteListing = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anúncio',
      message: 'Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita e todas as mídias anexadas serão apagadas.',
      confirmText: 'Excluir',
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
          await fetch(`/api/listings/${id}`, { method: 'DELETE' });
          setListings(listings.filter(l => l.id !== id));
          showToast('Anúncio excluído com sucesso');
        } catch (error) {
          console.error('Error deleting listing:', error);
          showToast('Erro ao excluir anúncio');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUpdateListing = async (id: number, data: any) => {
    setIsUpdatingListing(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setListings(listings.map(l => l.id === id ? updated : l));
        return updated;
      } else {
        const error = await res.json();
        let message = `Erro ao atualizar anúncio: ${error.error || 'Erro desconhecido'}`;
        if (error.code === 'PGRST204') {
          message += `\n\nErro de Banco de Dados: Coluna ausente no Supabase. Por favor, execute o seguinte SQL no seu Editor SQL do Supabase:\n\nALTER TABLE listings ADD COLUMN IF NOT EXISTS feature_requested BOOLEAN DEFAULT FALSE;`;
        } else {
          message += `\n\nDetalhes: ${error.details || (error.message ? error.message : String(error))}`;
        }
        showToast(message);
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      showToast(`Erro de rede ao atualizar anúncio: ${error.message || error}`);
    } finally {
      setIsUpdatingListing(false);
    }
    return null;
  };

  const handleToggleSold = async (id: number, currentStatus: boolean) => {
    const updated = await handleUpdateListing(id, { sold: !currentStatus });
    if (updated) {
      showToast(`Anúncio marcado como ${!currentStatus ? 'vendido' : 'disponível'}!`);
    }
  };

  const handleRequestVerification = async (id: number) => {
    const updated = await handleUpdateListing(id, { feature_requested: true });
    if (updated) {
      showToast('Solicitação de destaque enviada com sucesso!');
    }
  };

  const handleShare = (id: number) => {
    const listing = listings.find(l => l.id === id);
    if (listing) {
      setSelectedListingForShare(listing);
      setShowShareModal(true);
    }
  };

  const handleToggleFavorite = async (listingId: number) => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    const listingIdNum = Number(listingId);
    const isFavorite = favorites.map(Number).includes(listingIdNum);

    setIsTogglingFavorite(true);

    try {
      const success = await toggleFavorite(listingIdNum);
      if (success) {
        if (isFavorite) {
          setFavoriteToastMessage('Removido dos favoritos');
        } else {
          setFavoriteToastMessage('Adicionado aos favoritos!');
        }
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListing(listing);
    setShowAdModal(true);
  };

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      try {
        let url = `/api/listings?page=1&limit=20`;
        if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (showFeaturedOnly) url += `&featured=true`;
        if (showVerifiedOnly) url += `&verified=true`;
        if (selectedCityCoords && maxDistance) {
          url += `&lat=${selectedCityCoords.lat}&lng=${selectedCityCoords.lng}&radius=${maxDistance}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setListings(data);
          setPage(1);
          setHasMore(data.length === 20);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    if (isInitialFilterState.current) {
      isInitialFilterState.current = false;
      if (!selectedCategory && !searchQuery && !showFeaturedOnly && !showVerifiedOnly && !selectedCityCoords) return;
    }
    
    fetchFiltered();
  }, [selectedCategory, searchQuery, showFeaturedOnly, showVerifiedOnly, selectedCityCoords, maxDistance]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      const fetchNextPage = async () => {
         const nextPage = page + 1;
         let url = `/api/listings?page=${nextPage}&limit=20`;
         if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
         if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
         if (showFeaturedOnly) url += `&featured=true`;
         if (showVerifiedOnly) url += `&verified=true`;
         if (selectedCityCoords && maxDistance) {
            url += `&lat=${selectedCityCoords.lat}&lng=${selectedCityCoords.lng}&radius=${maxDistance}`;
         }
         
         try {
           const res = await fetch(url);
           if (res.ok) {
             const data = await res.json();
             setListings(prev => [...prev, ...data]);
             setPage(nextPage);
             setHasMore(data.length === 20);
           }
         } catch(e) {}
      };
      fetchNextPage();
    }
  }, [inView, hasMore, loading, page, selectedCategory, searchQuery, showFeaturedOnly, showVerifiedOnly, selectedCityCoords, maxDistance]);

  return (
    <div className="min-h-screen flex flex-col pb-10 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); }}
        onAdClick={() => setShowAdModal(true)}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => { logout(); setShowFavorites(false); setShowMyAds(false); }}
        onHomeClick={() => { setSelectedCategory(null); setShowFavorites(false); setShowMyAds(false); }}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setShowFavorites(false);
            setShowMyAds(false);
            setIsSidebarOpen(false);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {
            const id = parseInt(searchQuery);
            if (!isNaN(id)) {
              const exists = listings.find(l => l.id === id);
              if (exists) {
                router.push(getListingUrl(exists));
                return;
              }
            }
          }}
          showFeaturedOnly={showFeaturedOnly}
          onShowFeaturedOnlyChange={setShowFeaturedOnly}
          showVerifiedOnly={showVerifiedOnly}
          onShowVerifiedOnlyChange={setShowVerifiedOnly}
          listingsCount={listings.filter(l => !l.sold).length}
          getCategoryCount={(catName) => listings.filter(l => !l.sold && l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch={citySearch}
          onCitySearchChange={(val) => {
            setCitySearch(val);
            setShowCitySuggestions(true);
            if (!val) setSelectedCityCoords(null);
          }}
          maxDistance={maxDistance}
          onMaxDistanceChange={setMaxDistance}
          onUseMyLocation={handleUseMyLocation}
          citySuggestions={citySuggestions}
          onSelectCity={(city) => {
            setCitySearch(city.name);
            setSelectedCityCoords({ lat: city.lat, lng: city.lng });
            setShowCitySuggestions(false);
          }}
          showSuggestions={showCitySuggestions}
          setShowSuggestions={setShowCitySuggestions}
        />

        {/* --- Main Content --- */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={showMyAds || showFavorites ? "list" : "grid"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={showMyAds || showFavorites ? "flex flex-col gap-4 w-full" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"}
            >
              {loading ? (
                <div className="col-span-full py-32 flex flex-col items-center justify-center">
                  <div className="relative">
                    <Spinner size="xl" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-[#333] animate-pulse">Carregando anúncios...</h3>
                  <p className="text-sm text-[#999] mt-2">Buscando as melhores ofertas do RS</p>
                </div>
              ) : (
                <>
                  {showFavorites && (
                    <div className="col-span-full mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-[#333]">Meus Favoritos</h2>
                        <p className="text-sm text-[#666]">Anúncios que você marcou como interesse</p>
                      </div>
                      <button
                        onClick={() => setShowFavorites(false)}
                        className="px-4 py-2 bg-[#F8F9FA] text-[#666] rounded-xl text-sm font-bold hover:bg-[#E9ECEF] transition-all cursor-pointer flex items-center gap-2"
                      >
                        <ChevronLeft size={16} /> Voltar para o início
                      </button>
                    </div>
                  )}
                  {showMyAds && (
                    <div className="col-span-full mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-[#333]">Meus Anúncios</h2>
                        <p className="text-sm text-[#666]">Gerencie seus anúncios publicados</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowAdModal(true)}
                          className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Plus size={16} /> Novo Anúncio
                        </button>
                        <button
                          onClick={() => setShowMyAds(false)}
                          className="px-4 py-2 bg-[#F8F9FA] text-[#666] rounded-xl text-sm font-bold hover:bg-[#E9ECEF] transition-all cursor-pointer flex items-center gap-2"
                        >
                          <ChevronLeft size={16} /> Voltar para o início
                        </button>
                      </div>
                    </div>
                  )}
                  {listings.length > 0 ? (
                    listings.map(listing => (
                      (showMyAds || showFavorites) ? (
                        <ListingListItem
                          key={listing.id}
                          listing={listing}
                          onEdit={handleEditListing}
                          onDelete={handleDeleteListing}
                          onToggleSold={handleToggleSold}
                          onVerify={handleRequestVerification}
                          onView={(id) => router.push(`/anuncio/${id}`)}
                          onRemoveFavorite={handleToggleFavorite}
                          isOwner={Number(user?.id) === Number(listing.user_id)}
                        />
                      ) : (
                        <div key={listing.id} className="flex flex-col gap-2">
                          <ListingCard
                            listing={listing}
                            onShare={handleShare}
                            isFavorite={favorites.map(Number).includes(Number(listing.id))}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        </div>
                      )
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4 text-[#999]">
                        {showFavorites ? <Heart size={32} /> : showMyAds ? <Megaphone size={32} /> : <Search size={32} />}
                      </div>
                      <h3 className="text-lg font-bold text-[#333]">
                        {showFavorites ? 'Você ainda não tem favoritos' : showMyAds ? 'Você ainda não tem anúncios' : 'Nenhum anúncio encontrado'}
                      </h3>
                      <p className="text-sm text-[#666]">
                        {showFavorites ? 'Explore os anúncios e clique no coração para salvar.' : showMyAds ? 'Anuncie agora mesmo para começar a vender!' : 'Tente ajustar seus filtros de busca.'}
                      </p>
                    </div>
                  )}
                </>
              )}
              {hasMore && listings.length > 0 && !loading && (
                <div ref={observerRef} className="col-span-full py-8 text-center flex justify-center">
                  <Spinner size="md" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>



      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        loading={confirmModal.loading}
      />

      {/* Custom Full-Screen Loading States */}
      {isTogglingFavorite && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Spinner size="xl" className="mb-4" />
          <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">Atualizando favoritos...</h3>
        </div>
      )}

      {/* Auth modal is now global, no longer rendered here */}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={selectedListingForShare ? `${window.location.origin}/anuncio/${selectedListingForShare.id}` : ''}
        title={selectedListingForShare?.title || ''}
        onCopySuccess={() => {
          setFavoriteToastMessage('Link copiado!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#333] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2"
          >
            <Check size={18} className="text-[#28A745]" /> {favoriteToastMessage || 'Link copiado para a área de transferência!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Loading Overlay for Updates */}
      {isUpdatingListing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-[#333] font-bold">Atualizando anúncio...</p>
          </div>
        </div>
      )}

      {/* Banner Modal de Abertura */}
      <AnimatePresence>
        {showBannerModal && bannerSettings && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseBanner}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white max-w-[500px] w-full rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-[#E9ECEF]"
            >
              {/* Header decorativo premium */}
              <div className="bg-[#2D5A27] p-8 text-white relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-6 translate-y-6" />
                
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Megaphone size={28} className="text-white animate-bounce" />
                </div>
                <h3 className="text-xl font-bold leading-tight">{bannerSettings.title}</h3>
              </div>

              {/* Corpo */}
              <div className="p-8 text-center">
                <p className="text-sm text-[#555] leading-relaxed mb-8">
                  {bannerSettings.description}
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/alertas"
                    onClick={handleCloseBanner}
                    className="w-full py-3.5 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all hover:scale-[1.01] text-center text-sm"
                  >
                    {bannerSettings.buttonText}
                  </Link>
                  <button
                    onClick={handleCloseBanner}
                    className="w-full py-3 text-[#999] hover:text-[#666] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Não tenho interesse agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => setShowAdModal(true)}
          onAuthClick={() => setShowAuthModal(true)}
        />
      )}
    </div>
  );
}

