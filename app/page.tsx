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
import { slugify, safeJsonStringify } from '@/lib/utils';
import { Badge } from '@/components/Badge';
import { ListingCard } from '@/components/ListingCard';
import { ListingListItem } from '@/components/ListingListItem';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ShareModal } from '@/components/ShareModal';
import { BottomNav } from '@/components/BottomNav';
import { ConfirmModal } from '@/components/ConfirmModal';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';

// --- Main App ---

function GadoGauchoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, logout } = useUser();
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
  const [selectedCityCoords, setSelectedCityCoords] = useState<{lat: number, lng: number} | null>(null);
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

  const [allRSCities, setAllRSCities] = useState<any[]>(RS_CITIES);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/43/municipios');
        if (response.ok) {
          const data = await response.json();
          const formattedCities = data.map((city: any) => ({
            name: city.nome,
            // Keep existing lat/lng if we have them in RS_CITIES
            ...RS_CITIES.find(c => c.name.toLowerCase() === city.nome.toLowerCase())
          }));
          setAllRSCities(formattedCities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, []);

  const citySuggestions = useMemo(() => {
    if (citySearch.length > 1 && showCitySuggestions) {
      return allRSCities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
    }
    return [];
  }, [citySearch, showCitySuggestions, allRSCities]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setSelectedCityCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCitySearch('Minha Localização');
        setShowCitySuggestions(false);
      }, (error) => {
        console.error('Error getting location:', error);
        showToast('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      });
    } else {
      showToast('Geolocalização não é suportada pelo seu navegador.');
    }
  };
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMyAds, setShowMyAds] = useState(false);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [isUpdatingListing, setIsUpdatingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedListingForShare, setSelectedListingForShare] = useState<any>(null);
  const [favoriteToastMessage, setFavoriteToastMessage] = useState('');

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
    onConfirm: () => {},
  });

  const showToast = (message: string) => {
    setFavoriteToastMessage(message);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  // Handle URL parameters for modals
  useEffect(() => {
    const authParam = searchParams.get('auth');
    const adParam = searchParams.get('ad');

    if (authParam === 'login') {
      setAuthMode('login');
      setShowAuthModal(true);
    } else if (authParam === 'register') {
      setAuthMode('register');
      setShowAuthModal(true);
    }

    if (adParam === 'new') {
      setShowAdModal(true);
    }
  }, [searchParams]);

  // File Upload Refs
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Basic size check (e.g., 5MB for images, 20MB for videos)
      if (type === 'images' && file.size > 5 * 1024 * 1024) {
        showToast(`A imagem ${file.name} é muito grande. Máximo 5MB.`);
        continue;
      }
      if (type === 'videos' && file.size > 20 * 1024 * 1024) {
        showToast(`O vídeo ${file.name} é muito grande. Máximo 20MB.`);
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
    
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsRes, usersRes] = await Promise.all([
          fetch('/api/listings').catch(err => {
            console.error('Listings fetch failed:', err);
            return { ok: false, json: async () => ({ error: 'Network error' }) } as Response;
          }),
          fetch('/api/users').catch(err => {
            console.error('Users fetch failed:', err);
            return { ok: false, json: async () => ({ error: 'Network error' }) } as Response;
          })
        ]);

        if (!listingsRes.ok || !usersRes.ok) {
          const lErr = listingsRes.ok ? {} : await listingsRes.json().catch(() => ({ error: 'Failed to parse listings error' }));
          const uErr = usersRes.ok ? {} : await usersRes.json().catch(() => ({ error: 'Failed to parse users error' }));
          console.error('API Error Details:', { listings: lErr, users: uErr });
          
          // Fallback to empty array if API fails
          setListings([]);
        } else {
          const listingsData = await listingsRes.json();
          const usersData = await usersRes.json();
          
          if (Array.isArray(listingsData)) {
            setListings(listingsData);
          }
          if (Array.isArray(usersData)) {
            setAllUsers(usersData);
          }
          
          // Check local storage for session
          const storedUser = localStorage.getItem('gado_gaucho_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const found = Array.isArray(usersData) ? usersData.find((u: any) => u.email === parsedUser.email) : null;
            if (found) {
              setUser(found);
              fetch(`/api/favorites?userId=${found.id}`)
                .then(res => res.json())
                .then(data => {
                  if (Array.isArray(data)) setFavorites(data);
                })
                .catch(err => console.error('Error fetching favorites:', err));
            }
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
    setSelectedCategory(catParam);
    if (favParam === 'true') {
      setShowFavorites(true);
    }
  }, [searchParams]);

  // Auth Form State
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    password: '',
    confirmPassword: ''
  });

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
  const [citySearchAuth, setCitySearchAuth] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);
  const [showAuthSuggestions, setShowAuthSuggestions] = useState(false);

  const citySuggestionsAd = useMemo(() => {
    if (citySearchAd.length > 1 && showAdSuggestions) {
      return allRSCities.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
    }
    return [];
  }, [citySearchAd, showAdSuggestions, allRSCities]);

  const citySuggestionsAuth = useMemo(() => {
    if (citySearchAuth.length > 1 && showAuthSuggestions) {
      return allRSCities.filter(c => c.name.toLowerCase().includes(citySearchAuth.toLowerCase()));
    }
    return [];
  }, [citySearchAuth, showAuthSuggestions, allRSCities]);

  const totalPrice = useMemo(() => {
    return adForm.weight * adForm.priceKg;
  }, [adForm.weight, adForm.priceKg]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authForm.email)) {
      setAuthError('E-mail inválido');
      return;
    }

    if (authMode === 'register') {
      // Phone validation (xx) xxxx xxxxx
      const phoneRegex = /^\(\d{2}\) \d{4} \d{5}$/;
      if (!phoneRegex.test(authForm.phone)) {
        setAuthError('Telefone inválido. Use o formato (xx) xxxx xxxxx');
        return;
      }

      // Password confirmation
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('As senhas não coincidem');
        return;
      }

      const newUser = { 
        ...authForm, 
        is_admin: authForm.email === 'adriano.prog@gmail.com' 
      };
      
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify(newUser)
        });
        if (res.ok) {
          const savedUser = await res.json();
          setUser(savedUser);
          setAllUsers([...allUsers, savedUser]);
          localStorage.setItem('gado_gaucho_user', safeJsonStringify(savedUser));
          // Fetch favorites
          fetch(`/api/favorites?userId=${savedUser.id}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));
          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao cadastrar');
          return;
        }
      } catch (error) {
        console.error('Error registering:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({
            email: authForm.email,
            password: authForm.password
          })
        });

        if (res.ok) {
          const foundUser = await res.json();
          setUser(foundUser);
          localStorage.setItem('gado_gaucho_user', safeJsonStringify(foundUser));
          // Fetch favorites
          fetch(`/api/favorites?userId=${foundUser.id}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) setFavorites(data);
            })
            .catch(err => console.error('Error fetching favorites:', err));
          setShowAuthModal(false);
        } else {
          const error = await res.json();
          setAuthError(error.error || 'Erro ao fazer login');
          return;
        }
      } catch (error) {
        console.error('Error logging in:', error);
        setAuthError('Erro ao conectar ao servidor');
        return;
      }
    }
  };

  const handleDeleteListing = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anúncio',
      message: 'Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        try {
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

    try {
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({ userId: user.id, listingId: listingIdNum })
      });

      if (res.ok) {
        if (isFavorite) {
          setFavorites(favorites.filter(id => Number(id) !== listingIdNum));
          setFavoriteToastMessage('Removido dos favoritos');
        } else {
          setFavorites([...favorites, listingIdNum]);
          setFavoriteToastMessage('Adicionado aos favoritos!');
        }
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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
    const cityData = allRSCities.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());
    
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
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); setAuthError(null); }}
        onAdClick={() => setShowAdModal(true)}
        onAdminClick={() => {}}
        onLogout={() => { logout(); setFavorites([]); setShowFavorites(false); setShowMyAds(false); }}
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
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
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
      
      {/* Admin Buttons */}
      {user?.is_admin && (
        <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-3 items-end">
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Limpar Banco de Dados',
                message: 'Deseja deletar TODOS os anúncios do banco de dados? Esta ação não pode ser desfeita.',
                confirmText: 'Deletar Tudo',
                type: 'danger',
                onConfirm: async () => {
                  setConfirmModal(prev => ({ ...prev, loading: true }));
                  try {
                    const res = await fetch('/api/listings', { method: 'DELETE' });
                    const data = await res.json();
                    if (res.ok) {
                      showToast(data.message || 'Todos os anúncios foram deletados.');
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      showToast('Erro ao deletar dados: ' + data.error);
                    }
                  } catch (error) {
                    showToast('Erro ao conectar ao servidor');
                  } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
                  }
                }
              });
            }}
            className="bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-all flex items-center gap-2 font-bold text-sm"
            title="Deletar todos os anúncios"
          >
            <Trash2 size={20} />
            <span className="hidden sm:inline">Limpar Banco</span>
          </button>

          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Gerar Dados Exemplo',
                message: 'Deseja inserir 20 anúncios de exemplo no banco de dados para teste?',
                confirmText: 'Gerar Agora',
                onConfirm: async () => {
                  setConfirmModal(prev => ({ ...prev, loading: true }));
                  try {
                    const res = await fetch('/api/seed');
                    const data = await res.json();
                    if (data.success) {
                      showToast(data.message);
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      showToast('Erro ao inserir dados: ' + data.error);
                    }
                  } catch (error) {
                    showToast('Erro ao conectar ao servidor');
                  } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
                  }
                }
              });
            }}
            className="bg-amber-500 text-white p-4 rounded-full shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 font-bold text-sm"
            title="Gerar 20 anúncios de exemplo"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Gerar Dados Exemplo</span>
          </button>
        </div>
      )}

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

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                  </h2>
                  <button onClick={() => setShowAuthModal(false)} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                      {authError}
                    </motion.div>
                  )}
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Nome Completo <span className="text-[#DC3545]">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={authForm.name}
                          onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                          placeholder="Como quer ser chamado?" 
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Telefone <span className="text-[#DC3545]">*</span>
                        </label>
                        <input 
                          type="tel" 
                          required
                          value={authForm.phone}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 11) val = val.slice(0, 11);
                            
                            let formatted = val;
                            if (val.length > 0) {
                              formatted = `(${val.slice(0, 2)}`;
                              if (val.length > 2) {
                                formatted += `) ${val.slice(2, 6)}`;
                                if (val.length > 6) {
                                  formatted += ` ${val.slice(6, 11)}`;
                                }
                              }
                            }
                            setAuthForm({...authForm, phone: formatted});
                          }}
                          placeholder="(00) 0000 00000" 
                          className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                          Município <span className="text-[#DC3545]">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={citySearchAuth}
                            onChange={(e) => {
                              setCitySearchAuth(e.target.value);
                              setAuthForm({...authForm, city: e.target.value});
                              setShowAuthSuggestions(true);
                            }}
                            onFocus={() => setShowAuthSuggestions(true)}
                            placeholder="Sua cidade no RS" 
                            className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                          />
                          {citySuggestionsAuth.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-10 overflow-hidden">
                              {citySuggestionsAuth.map((city: any) => (
                                <button 
                                  key={city.name}
                                  type="button"
                                  onClick={() => {
                                    setAuthForm({...authForm, city: city.name});
                                    setCitySearchAuth(city.name);
                                    setShowAuthSuggestions(false);
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
                    </>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      E-mail <span className="text-[#DC3545]">*</span>
                    </label>
                    <input 
                      type="email" 
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      placeholder="seu@email.com" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                      Senha <span className="text-[#DC3545]">*</span>
                    </label>
                    <input 
                      type="password" 
                      required
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                    />
                  </div>
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">
                        Confirmar Senha <span className="text-[#DC3545]">*</span>
                      </label>
                      <input 
                        type="password" 
                        required
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all required:border-[#DC3545]/20" 
                      />
                    </div>
                  )}
                  
                  <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all mt-4 cursor-pointer">
                    {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
                  </button>
                </form>
                
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                    }}
                    className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors cursor-pointer"
                  >
                    {authMode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {isSubmittingAd && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">Processando anúncio...</h3>
                  <p className="text-sm text-[#666] mt-2">Carregando dados e imagens, por favor aguarde.</p>
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-[#333]">
                    {editingListingId ? 'Editar Anúncio' : 'Novo Anúncio'}
                  </h2>
                  <button onClick={() => { setShowAdModal(false); setEditingListingId(null); }} className="text-[#999] hover:text-[#333] cursor-pointer">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateAd} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                      <select 
                        value={adForm.category}
                        onChange={(e) => setAdForm({...adForm, category: e.target.value})}
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
                            setAdForm({...adForm, city: e.target.value});
                            setShowAdSuggestions(true);
                          }}
                          onFocus={() => setShowAdSuggestions(true)}
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
                                  setAdForm({...adForm, city: city.name});
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
                        onChange={(e) => setAdForm({...adForm, weight: Number(e.target.value)})}
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
                        onChange={(e) => setAdForm({...adForm, priceKg: Number(e.target.value)})}
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
                      onChange={(e) => setAdForm({...adForm, batchSize: Number(e.target.value)})}
                      placeholder="1" 
                      className="w-full bg-[#F8F9FA] border border-transparent focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição</label>
                    <textarea 
                      rows={3}
                      value={adForm.description}
                      onChange={(e) => setAdForm({...adForm, description: e.target.value})}
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

                    {/* Previews */}
                    {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                        {adForm.images.map((img, idx) => (
                          <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group">
                            <Image src={img} alt="" fill className="object-cover" unoptimized />
                            <button 
                              type="button"
                              onClick={() => removeFile(idx, 'images')}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={12} />
                            </button>
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
