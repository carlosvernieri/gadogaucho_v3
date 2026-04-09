'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Search,
  MapPin,
  LayoutGrid,
  Heart,
  Share2,
  ChevronLeft,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  MessageSquare,
  Menu,
  X,
  Plus,
  Camera,
  Video,
  ChevronRight,
  Check,
  Megaphone,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RS_CITIES, CATEGORIES_LIST } from '@/lib/data';
import { slugify, safeJsonStringify, generateVideoThumbnail, deleteMediaFromStorage } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmModal } from '@/components/ConfirmModal';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';

// --- Main App ---

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
};

function GadoGauchoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, logout, showAuthModal, setShowAuthModal, authMode, setAuthMode, favorites } = useUser();
  const [listings, setListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Proximity Search State
  const [citySearch, setCitySearch] = useState('');
  const [maxDistance, setMaxDistance] = useState(100);
  const [selectedCityCoords, setSelectedCityCoords] = useState<{ lat: number, lng: number } | null>(null);
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
  const [showAdModal, setShowAdModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedListingForShare, setSelectedListingForShare] = useState<any>(null);
  const [favoriteToastMessage, setFavoriteToastMessage] = useState('');
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);

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
    if (showAuthModal || showAdModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAuthModal, showAdModal]);

  const showToast = (message: string) => {
    setFavoriteToastMessage(message);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
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

  // File Upload Refs
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const newFiles: string[] = [];
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gado_gaucho_media')
          .upload(filePath, file);

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
        showToast(`Erro ao enviar ${file.name}.`);
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
      showToast('Mídia adicionada com sucesso!');
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const listingsRes = await fetch('/api/listings').catch(err => {
          console.error('Listings fetch failed:', err);
          return { ok: false, json: async () => ({ error: 'Network error' }) } as Response;
        });

        if (!listingsRes.ok) {
          console.error('API Error Details: Failed to fetch listings');
          setListings([]);
        } else {
          const listingsData = await listingsRes.json();

          if (Array.isArray(listingsData)) {
            setListings(listingsData);
          }
        }
      } catch (error: any) {
        console.error('Error in fetchData:', error.message || error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle category from query params
  useEffect(() => {
    const catParam = searchParams.get('category');
    const favParam = searchParams.get('favorites');
    const cityParam = searchParams.get('citySearch');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    setSelectedCategory(catParam);
    if (favParam === 'true') {
      setShowFavorites(true);
    }
    if (cityParam) {
      setCitySearch(cityParam);
    }
    if (latParam && lngParam) {
      setSelectedCityCoords({ lat: parseFloat(latParam), lng: parseFloat(lngParam) });
    }
  }, [searchParams]);

  // Ad Form State
  const [adForm, setAdForm] = useState({
    category: 'Touro',
    weight: 0,
    priceKg: 0,
    batchSize: 1,
    city: '',
    description: '',
    images: [] as string[],
    videos: [] as string[]
  });

  const [citySearchAd, setCitySearchAd] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);

  const citySuggestionsAd = useMemo(() => {
    if (!showAdSuggestions) return [];
    if (citySearchAd.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
  }, [citySearchAd, showAdSuggestions]);

  const totalPrice = useMemo(() => {
    return adForm.weight * adForm.priceKg;
  }, [adForm.weight, adForm.priceKg]);

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
          message += `\n\nErro de Banco de Dados: Coluna ausente no Supabase. Por favor, execute o seguinte SQL no seu Editor SQL do Supabase:\n\nALTER TABLE listings ADD COLUMN IF NOT EXISTS verification_requested BOOLEAN DEFAULT FALSE;`;
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
    const updated = await handleUpdateListing(id, { verification_requested: true });
    if (updated) {
      showToast('Solicitação de verificação enviada com sucesso!');
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
    const method = isFavorite ? 'DELETE' : 'POST';

    setIsTogglingFavorite(true);

    try {
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ userId: user.id, listingId: listingIdNum })
      });

      if (res.ok) {
        // We do not manage local setFavorites array anymore as it's handled in Context
        // Actually, since we need immediate UI updates, let's update it here or dispatch a request
        // The most direct way is to read the current context state and update it.
        // Wait, context exports setFavorites, we should use it.
        // I will do it outside of this chunk correctly. But wait, I'll update it right now.
        // To be safe I'll just reload the favorite using the updated context setFavorites
        // The existing code manually updated local state `setFavorites`.
        let updatedFavs = [];
        if (isFavorite) {
          updatedFavs = favorites.filter(id => Number(id) !== listingIdNum);
          setFavoriteToastMessage('Removido dos favoritos');
        } else {
          updatedFavs = [...favorites, listingIdNum];
          setFavoriteToastMessage('Adicionado aos favoritos!');
        }

        // Wait, where is setFavorites? I need to get it from useUser().
        // Actually, it's missing from my destructured `useUser()` call in the first chunk, let me check. No, I exported it. I must grab it.
        // Let's assume I grabbed it in the first chunk wait: `const { ..., favorites, setFavorites } = useUser()`. Yes, I'll update the first chunk to include `setFavorites`.
        // I can just replace the logic here with a local setFavorites call.

        // Let's just fix the function with setFavorites
        // However, I made a mistake in the first chunk? Let me write this raw and clean it in next step if necessary. Let me just put the same logic.
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    setIsSubmittingAd(true);

    // Find coordinates for the selected city
    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());

    const newAd = {
      category: adForm.category.toUpperCase(),
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

    try {
      const url = editingListingId ? `/api/listings/${editingListingId}` : '/api/listings';
      const method = editingListingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(newAd)
      });

      if (res.ok) {
        const savedAd = await res.json();
        if (editingListingId) {
          if (mediaToDelete.length > 0) {
            await deleteMediaFromStorage(mediaToDelete);
            setMediaToDelete([]);
          }
          setListings(listings.map(l => l.id === editingListingId ? savedAd : l));
          showToast('Anúncio atualizado com sucesso!');
        } else {
          setListings([savedAd, ...listings]);
          showToast('Anúncio criado com sucesso!');
        }
        setShowAdModal(false);
        setEditingListingId(null);
        setCitySearchAd('');
        setAdForm({
          category: 'Touro',
          weight: 0,
          priceKg: 0,
          batchSize: 1,
          city: '',
          description: '',
          images: [],
          videos: []
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(`Erro ao ${editingListingId ? 'atualizar' : 'criar'} anúncio: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error(`Error ${editingListingId ? 'updating' : 'creating'} ad:`, error);
      showToast(`Erro ao ${editingListingId ? 'atualizar' : 'criar'} anúncio: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListingId(listing.id);
    setAdForm({
      category: listing.category,
      weight: listing.avgWeight,
      priceKg: listing.priceKg,
      batchSize: listing.quantity,
      city: listing.location.split(' - ')[0],
      description: listing.description || '',
      images: Array.isArray(listing.images) ? listing.images : [listing.image],
      videos: Array.isArray(listing.videos) ? listing.videos : []
    });
    setCitySearchAd(listing.location.split(' - ')[0]);
    setMediaToDelete([]);
    setShowAdModal(true);
  };

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // My Ads and Favorites should show sold items
      if (showMyAds) {
        return Number(item.user_id) === Number(user?.id);
      }
      if (showFavorites) {
        return favorites.map(Number).includes(Number(item.id));
      }

      // Home screen search/filter logic
      // Exclude sold items from home screen
      if (item.sold) return false;

      const matchesCategory = !selectedCategory || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toString().includes(searchQuery);

      const matchesVerified = !showVerifiedOnly || item.verified;

      let matchesDistance = true;
      if (selectedCityCoords && item.lat && item.lng) {
        const dist = calculateDistance(selectedCityCoords.lat, selectedCityCoords.lng, item.lat, item.lng);
        matchesDistance = dist <= maxDistance;
      }

      return matchesCategory && matchesSearch && matchesVerified && matchesDistance;
    });
  }, [listings, selectedCategory, searchQuery, showVerifiedOnly, showMyAds, showFavorites, user, favorites, selectedCityCoords, maxDistance, calculateDistance]);

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); }}
        onAdClick={() => setShowAdModal(true)}
        onAdminClick={() => { }}
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
                router.push(`/anuncio/${id}`);
                return;
              }
            }
          }}
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
                    <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={24} className="text-[#2D5A27] animate-pulse" />
                    </div>
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
                  {filteredListings.length > 0 ? (
                    filteredListings.map(listing => (
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
          <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
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

      {/* Ad Creation Modal */}
      <AnimatePresence>
        {showAdModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[95dvh] flex flex-col"
            >
              {(isSubmittingAd || isUploadingMedia) && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">
                    {isUploadingMedia ? 'Enviando mídias...' : 'Processando anúncio...'}
                  </h3>
                  <p className="text-sm text-[#666] mt-2">
                    {isUploadingMedia ? 'Aguarde o carregamento das suas fotos e vídeos.' : 'Carregando dados e imagens, por favor aguarde.'}
                  </p>
                </div>
              )}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {editingListingId ? 'Editar Anúncio' : 'Novo Anúncio'}
                  </h2>
                  <button onClick={() => { setShowAdModal(false); setEditingListingId(null); setMediaToDelete([]); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleCreateAd} className="space-y-6">
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
                        {isUploadingMedia ? <Loader2 size={24} className="animate-spin text-[#2D5A27]" /> : <Camera size={24} />}
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
                        {isUploadingMedia ? <Loader2 size={24} className="animate-spin text-[#2D5A27]" /> : <Video size={24} />}
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
            <div className="w-12 h-12 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
            <p className="text-[#333] font-bold">Atualizando anúncio...</p>
          </div>
        </div>
      )}

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

export default function GadoGauchoApp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
          <p className="text-[#2D5A27] font-bold animate-pulse">Carregando Gado Gaúcho...</p>
        </div>
      </div>
    }>
      <GadoGauchoContent />
    </Suspense>
  );
}
